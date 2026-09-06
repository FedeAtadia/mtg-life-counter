/**
 * Draws the home screen icons into `public/icons/`.
 *
 * Committed alongside the PNGs it writes so the icons can be regenerated when
 * the palette moves, rather than being three binaries nobody can edit. It draws
 * the card the whole app is built around: a gold-trimmed frame, a parchment
 * type line, and a single pip where the life total sits.
 *
 *     node scripts/make-icons.mjs
 *
 * No image library: PNG is a container around deflated scanlines, and Node
 * brings zlib. Everything is drawn four times oversized and averaged back down,
 * which is where the smooth edges come from.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
const SUPERSAMPLE = 4;

// The board's own colours — see app/globals.css.
const TABLE = [0x0a, 0x08, 0x09];
const TRIM = [0xc9, 0xa2, 0x27];
const CARD = [0x14, 0x11, 0x1b];
const PARCHMENT = [0xcd, 0xbf, 0xa2];

// ---------------------------------------------------------------- drawing ---

function canvas(size) {
  return { size, px: new Uint8ClampedArray(size * size * 4) };
}

function fill(target, [r, g, b]) {
  for (let i = 0; i < target.px.length; i += 4) {
    target.px[i] = r;
    target.px[i + 1] = g;
    target.px[i + 2] = b;
    target.px[i + 3] = 255;
  }
}

function put(target, x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= target.size || y >= target.size) return;
  const i = (y * target.size + x) * 4;
  target.px[i] = r;
  target.px[i + 1] = g;
  target.px[i + 2] = b;
  target.px[i + 3] = 255;
}

/** A rounded rectangle, filled. Corners are a quarter circle of `radius`. */
function roundedRect(target, x, y, w, h, radius, colour) {
  const r = Math.min(radius, w / 2, h / 2);
  for (let py = Math.floor(y); py < y + h; py++) {
    for (let px = Math.floor(x); px < x + w; px++) {
      // How far outside the inner rectangle this pixel is, per axis. Zero on
      // both means it is in the straight part and always painted.
      const dx = Math.max(x + r - px, 0, px - (x + w - r - 1));
      const dy = Math.max(y + r - py, 0, py - (y + h - r - 1));
      if (dx * dx + dy * dy <= r * r) put(target, px, py, colour);
    }
  }
}

function circle(target, cx, cy, radius, colour) {
  for (let py = Math.floor(cy - radius); py <= cy + radius; py++) {
    for (let px = Math.floor(cx - radius); px <= cx + radius; px++) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= radius * radius) put(target, px, py, colour);
    }
  }
}

/** Averages the oversampled canvas back down to the size actually wanted. */
function downsample(source, size) {
  const out = canvas(size);
  const n = SUPERSAMPLE * SUPERSAMPLE;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const i =
            ((y * SUPERSAMPLE + sy) * source.size + x * SUPERSAMPLE + sx) * 4;
          r += source.px[i];
          g += source.px[i + 1];
          b += source.px[i + 2];
        }
      }
      put(out, x, y, [r / n, g / n, b / n]);
    }
  }
  return out;
}

/**
 * The icon itself, drawn in fractions of its own size.
 *
 * A maskable icon is cut to whatever shape the launcher likes, so its artwork
 * has to sit inside the middle 80% and the background has to reach the corners.
 * `inset` is what buys that safe margin.
 */
function drawIcon(size, { inset }) {
  const big = canvas(size * SUPERSAMPLE);
  const S = big.size;
  fill(big, TABLE);

  const cardX = S * inset;
  const cardSize = S * (1 - inset * 2);
  const radius = cardSize * 0.14;

  // The trim, then the card face inset inside it: two rounded rectangles, the
  // gap between them being the border.
  roundedRect(big, cardX, cardX, cardSize, cardSize, radius, TRIM);
  const border = cardSize * 0.055;
  roundedRect(
    big,
    cardX + border,
    cardX + border,
    cardSize - border * 2,
    cardSize - border * 2,
    radius - border,
    CARD,
  );

  // The type line, a parchment strip across the top of the face.
  const faceX = cardX + border * 2;
  const faceWidth = cardSize - border * 4;
  roundedRect(
    big,
    faceX,
    cardX + border * 2,
    faceWidth,
    cardSize * 0.15,
    cardSize * 0.03,
    PARCHMENT,
  );

  // And a pip where the life total sits.
  circle(big, S / 2, cardX + cardSize * 0.62, cardSize * 0.2, TRIM);
  circle(big, S / 2, cardX + cardSize * 0.62, cardSize * 0.12, CARD);

  return downsample(big, size);
}

// ------------------------------------------------------------------- png ----

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng({ size, px }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour with alpha
  // compression, filter and interlace methods: the only ones PNG defines.

  // Each scanline carries a filter byte; 0 means the bytes are as they are.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const at = y * (size * 4 + 1);
    raw[at] = 0;
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, at + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ write ---

mkdirSync(OUT, { recursive: true });

const icons = [
  { file: "icon-192.png", size: 192, inset: 0.06 },
  { file: "icon-512.png", size: 512, inset: 0.06 },
  // Cut to the launcher's shape, so the card sits well inside the safe circle.
  { file: "icon-maskable-512.png", size: 512, inset: 0.19 },
];

for (const { file, size, inset } of icons) {
  const png = encodePng(drawIcon(size, { inset }));
  writeFileSync(join(OUT, file), png);
  console.log(`${file}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}
