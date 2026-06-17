import { uploadPhotoWithRetry } from "@/lib/upload-photo";

/**
 * Upload a single photo if it is a base64 data-URI; otherwise return it as-is.
 * Returns `null` when the input is `null`.
 */
export const uploadPhotoIfNeeded = async (
  photo: string | null,
  fileName: string,
): Promise<string | null> => {
  if (!photo) return null;
  if (photo.startsWith("data:")) {
    return uploadPhotoWithRetry(photo, fileName);
  }
  return photo;
};

/**
 * Derive the inspection status from the three photo URLs.
 */
export const determineInspectionStatus = (
  photoInitialUrl: string | null,
  photoDuringUrl: string | null,
  photoFinalUrl: string | null,
): "concluido" | "em_andamento" => {
  return photoInitialUrl && photoDuringUrl && photoFinalUrl
    ? "concluido"
    : "em_andamento";
};
