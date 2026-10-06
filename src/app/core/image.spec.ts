import {
  compressImage,
  fitWithin,
  MAX_EDGE,
  MAX_PHOTO_BYTES,
  TARGET_BYTES,
  validateImage,
} from './image';

const file = (type: string, size = 1000) => new File([new Uint8Array(size)], 'x', { type });

/** A real picture of the given size, so resizing can be tested on genuine pixels. */
async function picture(width: number, height: number, type = 'image/png'): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No canvas');
  context.fillStyle = 'tomato';
  context.fillRect(0, 0, width, height);
  context.fillStyle = 'navy';
  context.fillRect(0, 0, width / 2, height / 2);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type);
  });
  if (!blob) throw new Error('No blob');
  return new File([blob], 'original.png', { type });
}

describe('validateImage', () => {
  ['image/jpeg', 'image/png', 'image/webp'].forEach((type) => {
    it(`accepts ${type}`, () => {
      expect(validateImage(file(type))).toBeNull();
    });
  });

  ['application/pdf', 'image/gif', 'image/svg+xml', 'text/plain', ''].forEach((type) => {
    it(`rejects "${type}" before any processing`, () => {
      expect(validateImage(file(type))).toBe('Choose a JPEG, PNG or WebP image.');
    });
  });

  it('rejects a file over 10 MB, but accepts exactly 10 MB', () => {
    expect(validateImage(file('image/jpeg', MAX_PHOTO_BYTES + 1))).toContain('10 MB');
    expect(validateImage(file('image/jpeg', MAX_PHOTO_BYTES))).toBeNull();
  });
});

describe('fitWithin', () => {
  it('shrinks the long edge to the limit and keeps the proportions', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it('never enlarges a small picture', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe('compressImage', () => {
  const decode = (f: File) => createImageBitmap(f);

  it('BB11 — makes a JPEG whose long edge is at most 1600px, proportions kept', async () => {
    const result = await compressImage(await picture(3200, 2400));
    expect(result.type).toBe('image/jpeg');
    const bitmap = await decode(result);
    expect(Math.max(bitmap.width, bitmap.height)).toBeLessThanOrEqual(MAX_EDGE);
    expect([bitmap.width, bitmap.height]).toEqual([1600, 1200]);
  });

  it('keeps a small picture at its own size', async () => {
    const bitmap = await decode(await compressImage(await picture(400, 300)));
    expect([bitmap.width, bitmap.height]).toEqual([400, 300]);
  });

  it('ends up well under the 500 KB target for an ordinary picture', async () => {
    expect((await compressImage(await picture(3200, 2400))).size).toBeLessThanOrEqual(TARGET_BYTES);
  });

  it('turns transparent areas white, not black', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 20; // fully transparent
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
    const result = await compressImage(
      new File([blob ?? new Blob()], 't.png', { type: 'image/png' }),
    );
    const bitmap = await decode(result);
    const check = document.createElement('canvas');
    check.width = check.height = 1;
    const context = check.getContext('2d');
    context?.drawImage(bitmap, 0, 0);
    expect(
      Array.from(context?.getImageData(0, 0, 1, 1).data ?? [])
        .slice(0, 3)
        .every((v) => v > 240),
    ).toBeTrue();
  });

  it('rejects a file that is not really an image', async () => {
    await expectAsync(compressImage(file('image/jpeg', 50))).toBeRejected();
  });
});
