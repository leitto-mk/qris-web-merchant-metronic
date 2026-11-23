const toHex = (rgb) =>
  '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// The two most common colours in RGBA pixel data, as hex, or null if every pixel was skipped.
// Near-white, near-black and grey pixels are skipped so an illustration's plain backdrop doesn't win.
// ponytail: 512-bucket histogram, not k-means; good enough for flat illustrations, revisit for photos.
export function dominantTones(data) {
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    if (data[i + 3] < 128) continue;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    if (max - min < 40 || max < 40 || min > 220) continue;
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const sum = buckets.get(key) ?? [0, 0, 0, 0];
    sum[0] += r;
    sum[1] += g;
    sum[2] += b;
    sum[3]++;
    buckets.set(key, sum);
  }

  const ranked = [...buckets.values()]
    .sort((x, y) => y[3] - x[3])
    .map(([r, g, b, n]) => [r / n, g / n, b / n]);
  if (!ranked.length) return null;

  // Neighbouring buckets are often the same tone split in two, so the second tone must be visibly different
  const second = ranked.find((c) => distance(c, ranked[0]) > 80) ?? ranked[0];
  return [toHex(ranked[0]), toHex(second)];
}

// Reads a loaded <img> through a small canvas. Returns null if the canvas is tainted (cross-origin image without CORS).
export function imageTones(img) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, 64, 64);
  try {
    return dominantTones(ctx.getImageData(0, 0, 64, 64).data);
  } catch {
    return null;
  }
}
