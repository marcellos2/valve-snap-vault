import { createDriveUploadKey, DriveFunctionError, uploadBlobToDrive } from "./upload-to-drive";
import { isNetworkFailure, markBackendDown, markBackendUp } from "./backend-status";

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

interface UploadOptions {
  maxAttempts?: number;
  idempotencyKey?: string;
  onProgress?: (info: { attempt: number; maxAttempts: number; phase: "compressing" | "uploading" | "retrying" }) => void;
}

/**
 * Upload a base64 photo to the company's Drive through the Edge Function.
 * Designed for unstable mobile networks (4G/cellular) where requests often time out.
 */
export const uploadPhotoWithRetry = async (
  photoData: string,
  fileName: string,
  options: UploadOptions = {}
): Promise<string | null> => {
  const { maxAttempts, idempotencyKey, onProgress } = options;
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

  const driveName = `${Date.now()}-${fileName}.jpg`;
  const uploadKey = await createDriveUploadKey(blob, idempotencyKey || fileName);
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= profile.attempts; attempt++) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      onProgress?.({
        attempt,
        maxAttempts: profile.attempts,
        phase: attempt === 1 ? "uploading" : "retrying",
      });

      const uploadPromise = uploadBlobToDrive(blob, driveName, uploadKey);

      const timeoutPromise = new Promise<never>((_, reject) =>
        timeoutId = setTimeout(
          () => reject(new Error(`Upload timeout (${Math.round(profile.timeoutMs / 1000)}s)`)),
          profile.timeoutMs
        )
      );

      const driveUrl = await Promise.race([uploadPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      markBackendUp();
      return driveUrl;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = err;

      if (
        err instanceof DriveFunctionError &&
        ["drive_not_configured", "drive_reauthorization_required", "drive_folder_unavailable", "drive_folder_invalid"].includes(err.code)
      ) {
        throw err;
      }

      // Network-level failure means the backend is unreachable: stop retrying.
      if (isNetworkFailure(err)) {
        markBackendDown();
        console.warn(`Backend inacessível ao enviar ${fileName}, foto mantida localmente.`);
        return null;
      }

      try {
        const smallerBlob = await compressImage(
          photoData,
          Math.max(720, profile.maxDim - attempt * 160),
          Math.max(0.45, profile.quality - attempt * 0.08)
        );

        if (smallerBlob.size < blob.size) {
          blob = smallerBlob;
        }
      } catch (compressionError) {
        console.warn("Não foi possível comprimir a imagem para a nova tentativa:", compressionError);
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
