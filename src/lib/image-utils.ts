/**
 * Load an image from a URL, falling back to a non-CORS request on error.
 */
export const loadImageWithFallback = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = (err) => reject(err);
      fallback.src = url;
    };
    img.src = url;
  });
};

/**
 * Rotate an image (base64 or URL) by 90° clockwise from `currentRotation`
 * and return the result as a JPEG data-URL.
 */
export const rotateImage = (
  src: string,
  currentRotation: number,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const draw = (img: HTMLImageElement) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(src);

      const newRotation = (currentRotation + 90) % 360;

      if (newRotation === 90 || newRotation === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((newRotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };

    const img = new Image();
    if (src.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => draw(img);
    img.onerror = () => {
      const fallback = new Image();
      fallback.onload = () => draw(fallback);
      fallback.onerror = (err) => reject(err);
      fallback.src = src;
    };
    img.src = src;
  });
};
