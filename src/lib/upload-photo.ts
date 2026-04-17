import { supabase } from "@/integrations/supabase/client";

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
  const { maxAttempts = 4, onProgress } = options;

  if (!photoData || !photoData.startsWith("data:")) {
    console.error("Invalid photo data");
    return null;
  }

  let blob: Blob;
  try {
    onProgress?.({ attempt: 0, maxAttempts, phase: "compressing" });
    blob = await compressImage(photoData);
  } catch (err) {
    console.error("Compression failed, falling back to raw blob:", err);
    // Fallback: decode base64 manually
    const base64 = photoData.split(",")[1];
    if (!base64) return null;
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    blob = new Blob([arr], { type: "image/jpeg" });
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      onProgress?.({ attempt, maxAttempts, phase: attempt === 1 ? "uploading" : "retrying" });

      const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}-${fileName}.jpg`;

      // Race the upload against a timeout (60s per attempt — generous for 4G)
      const uploadPromise = supabase.storage.from("valve-photos").upload(filePath, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Upload timeout (60s)")), 60_000)
      );

      const { error } = (await Promise.race([uploadPromise, timeoutPromise])) as Awaited<typeof uploadPromise>;

      if (error) throw error;

      const { data } = supabase.storage.from("valve-photos").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      lastError = err;
      console.warn(`Upload attempt ${attempt}/${maxAttempts} failed for ${fileName}:`, err);
      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s
        await sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  console.error(`All ${maxAttempts} upload attempts failed for ${fileName}:`, lastError);
  return null;
};
