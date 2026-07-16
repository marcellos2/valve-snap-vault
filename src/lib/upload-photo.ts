import { supabase } from "@/integrations/supabase/client";
import { getGoogleDriveSessionStatus, hasGoogleDriveSession, uploadBlobToDrive } from "./upload-to-drive";

/**
 * Compress a base64 image to reduce upload size on slow networks (4G/cellular).
 * Resizes to max 1600px on longest side and re-encodes as JPEG with given quality.
 */
export const compressImage = (
  dataUrl: string,
  maxDim = 1600,
  quality = 0.75
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context unavailable"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Failed to encode image"));
          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface NetworkProfile {
  attempts: number;
  maxDim: number;
  quality: number;
  targetMaxBytes: number;
  timeoutMs: number;
}

const getNetworkProfile = (requestedAttempts?: number): NetworkProfile => {
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  }).connection;

  const effectiveType = connection?.effectiveType ?? "";
  const saveData = Boolean(connection?.saveData);
  const isCellularLike = saveData || /2g|3g|4g|5g/i.test(effectiveType);

  if (isCellularLike) {
    return {
      attempts: requestedAttempts ?? 5,
      maxDim: 1280,
      quality: 0.68,
      targetMaxBytes: 700 * 1024,
      timeoutMs: 90_000,
    };
  }

  return {
    attempts: requestedAttempts ?? 4,
    maxDim: 1600,
    quality: 0.75,
    targetMaxBytes: 1400 * 1024,
    timeoutMs: 60_000,
  };
};

const compressForNetwork = async (dataUrl: string, profile: NetworkProfile): Promise<Blob> => {
  const steps = [
    { maxDim: profile.maxDim, quality: profile.quality },
    { maxDim: Math.min(profile.maxDim, 1280), quality: Math.min(profile.quality, 0.62) },
    { maxDim: 1024, quality: 0.55 },
    { maxDim: 800, quality: 0.5 },
  ];

  let lastBlob: Blob | null = null;

  for (const step of steps) {
    lastBlob = await compressImage(dataUrl, step.maxDim, step.quality);
    if (lastBlob.size <= profile.targetMaxBytes) {
      return lastBlob;
    }
  }

  if (!lastBlob) {
    throw new Error("Failed to prepare image for upload");
  }

  return lastBlob;
};

const createUploadPath = (fileName: string) => {
  const uniqueId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 10);

  return `${Date.now()}-${uniqueId}-${fileName}.jpg`;
};

interface UploadOptions {
  maxAttempts?: number;
  onProgress?: (info: { attempt: number; maxAttempts: number; phase: "compressing" | "uploading" | "retrying" }) => void;
}

/**
 * Upload a base64 photo to Supabase Storage with automatic compression and retry.
 * Designed for unstable mobile networks (4G/cellular) where requests often time out.
 */
export const uploadPhotoWithRetry = async (
  photoData: string,
  fileName: string,
  options: UploadOptions = {}
): Promise<string | null> => {
  const { maxAttempts, onProgress } = options;
  const profile = getNetworkProfile(maxAttempts);

  if (!photoData || !photoData.startsWith("data:")) {
    console.error("Invalid photo data");
    return null;
  }

  let blob: Blob;
  try {
    onProgress?.({ attempt: 0, maxAttempts: profile.attempts, phase: "compressing" });
    blob = await compressForNetwork(photoData, profile);
  } catch (err) {
    console.error("Compression failed, falling back to raw blob:", err);
    const base64 = photoData.split(",")[1];
    if (!base64) return null;
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    blob = new Blob([arr], { type: "image/jpeg" });
  }

  // If user is logged into Google (same session as Google Photos), upload
  // directly to their Google Drive "Inspeções Válvulas" folder instead of backend storage.
  if (hasGoogleDriveSession()) {
    try {
      onProgress?.({ attempt: 1, maxAttempts: profile.attempts, phase: "uploading" });
      const driveName = `${Date.now()}-${fileName}.jpg`;
      const driveUrl = await uploadBlobToDrive(blob, driveName);
      if (driveUrl) return driveUrl;
    } catch (err) {
      console.error("Google Drive upload failed:", err);
      throw err instanceof Error ? err : new Error("Falha ao enviar foto para o Google Drive.");
    }
  } else {
    const driveStatus = getGoogleDriveSessionStatus();
    if (driveStatus.connected) {
      throw new Error(
        driveStatus.reason === "expired"
          ? "Sua sessão do Google expirou. Entre novamente no Google Photos Sync antes de salvar."
          : "Entre novamente no Google Photos Sync para autorizar o envio ao Google Drive."
      );
    }
  }

  let lastError: unknown = null;
  const filePath = createUploadPath(fileName);

  for (let attempt = 1; attempt <= profile.attempts; attempt++) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      onProgress?.({
        attempt,
        maxAttempts: profile.attempts,
        phase: attempt === 1 ? "uploading" : "retrying",
      });

      const uploadPromise = supabase.storage.from("valve-photos").upload(filePath, blob, {
        cacheControl: "3600",
        upsert: attempt > 1,
        contentType: "image/jpeg",
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        timeoutId = setTimeout(
          () => reject(new Error(`Upload timeout (${Math.round(profile.timeoutMs / 1000)}s)`)),
          profile.timeoutMs
        )
      );

      const { error } = (await Promise.race([uploadPromise, timeoutPromise])) as Awaited<typeof uploadPromise>;
      if (timeoutId) clearTimeout(timeoutId);

      if (error) throw error;

      const { data } = supabase.storage.from("valve-photos").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = err;

      try {
        const smallerBlob = await compressImage(
          photoData,
          Math.max(720, profile.maxDim - attempt * 160),
          Math.max(0.45, profile.quality - attempt * 0.08)
        );

        if (smallerBlob.size < blob.size) {
          blob = smallerBlob;
        }
      } catch {
      }

      console.warn(`Upload attempt ${attempt}/${profile.attempts} failed for ${fileName}:`, err);
      if (attempt < profile.attempts) {
        await sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  console.error(`All ${profile.attempts} upload attempts failed for ${fileName}:`, lastError);
  return null;
};
