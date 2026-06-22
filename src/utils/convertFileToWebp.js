import { convertToWebp } from "./convertWebp";

/**
 * Convert an image File to a WebP File (smaller upload for payment receipts).
 * @param {File | null | undefined} file
 * @param {{ quality?: number, maxWidth?: number }} options
 * @returns {Promise<File | null>}
 */
export async function convertFileToWebp(file, options = {}) {
  if (!file) return null;

  const { quality = 0.65, maxWidth = 960 } = options;

  if (file.size <= 512 * 1024) {
    return file;
  }

  const blob = await convertToWebp(file, { quality, maxWidth });
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
