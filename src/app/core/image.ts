export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // the file as picked; the upload is far smaller
export const MAX_EDGE = 1600;
export const TARGET_BYTES = 500 * 1024;
const QUALITIES = [0.8, 0.6, 0.4]; // tried in turn until the result fits the target

/** Why this file cannot be used, or null if it can. Checked before any processing starts. */
export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Choose a JPEG, PNG or WebP image.';
  if (file.size > MAX_PHOTO_BYTES) return 'That photo is larger than 10 MB. Choose a smaller one.';
  return null;
}

/** The size that fits the long edge into `max`, keeping the proportions; never enlarges. */
export function fitWithin(width: number, height: number, max = MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('The image could not be processed.'));
      },
      'image/jpeg',
      quality,
    );
  });

/**
 * A resized JPEG (long edge at most 1600px, aiming for 500 KB). Redrawing on a canvas drops all
 * metadata, including the GPS location in phone photos, so only the pixels are uploaded.
 */
export async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file); // also applies the photo's rotation
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The image could not be processed.');
  context.fillStyle = 'white'; // transparent PNGs would otherwise turn black in a JPEG
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await toJpeg(canvas, QUALITIES[0]);
  for (const quality of QUALITIES.slice(1)) {
    if (blob.size <= TARGET_BYTES) break;
    blob = await toJpeg(canvas, quality);
  }
  return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
}
