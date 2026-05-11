/**
 * PNG za PWA — gradient + duara + maandishi KMK(T).
 * Inatumia supersample ×2 kisha kupunguza ili makali ya maandishi yawe laini zaidi.
 *
 *   npm run icons:pwa
 */
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { deflateSync } from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const LABEL = "KMK(T)";
const GAP_COL = 2;
const SUPER_SAMPLE = 2;

const GLYPHS = {
  K: ["#...#", "#..#.", "#.#..", "##...", "##...", "#.#..", "#..#.", "#...#"],
  M: ["#.....#", "##...##", "#.#.#.#", "#..#..#", "#..#..#", "#..#..#", "#..#..#", "#..#..#"],
  "(": [".#.", "#..", "#..", "#..", "#..", "#..", "#..", ".#."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  ")": ["#..", "..#", "..#", "..#", "..#", "..#", "..#", ".#."],
};

function lerpColor(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function gradientRgb(x, y, w, h) {
  const u = Math.min(1, Math.max(0, (x + y) / (w + h)));
  const c0 = { r: 8, g: 20, b: 40 };
  const mid = { r: 15, g: 40, b: 80 };
  const c1 = { r: 20, g: 58, b: 114 };
  if (u < 0.55) return lerpColor(c0, mid, u / 0.55);
  return lerpColor(mid, c1, (u - 0.55) / 0.45);
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function ringRgb(x, y, cx, cy, inner, outer, bg) {
  const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
  const ring = smoothstep(inner - 0.85, inner + 0.85, dist) * (1 - smoothstep(outer - 0.85, outer + 0.85, dist));
  if (ring <= 0.001) return bg;
  const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
  const v = 0.88 + 0.12 * Math.sin(ang * 2);
  const gold = {
    r: Math.round(232 * v),
    g: Math.round(197 * v),
    b: Math.round(71 * v + 20),
  };
  return {
    r: Math.round(bg.r * (1 - ring) + gold.r * ring),
    g: Math.round(bg.g * (1 - ring) + gold.g * ring),
    b: Math.round(bg.b * (1 - ring) + gold.b * ring),
  };
}

function padGlyph(rows, targetH) {
  const w = rows[0].length;
  const pad = targetH - rows.length;
  const top = Math.floor(pad / 2);
  const bottom = pad - top;
  const empty = ".".repeat(w);
  return [...Array(top).fill(empty), ...rows, ...Array(bottom).fill(empty)];
}

function buildTextMask(size) {
  const chars = [...LABEL];
  const padded = chars.map((ch) => {
    const g = GLYPHS[ch];
    if (!g) throw new Error(`Missing glyph: ${ch}`);
    return g;
  });
  const maxH = Math.max(...padded.map((g) => g.length));
  const rowsPerChar = padded.map((g) => padGlyph(g, maxH));

  let totalCols = 0;
  const widths = rowsPerChar.map((g) => g[0].length);
  for (let i = 0; i < widths.length; i++) {
    totalCols += widths[i];
    if (i < widths.length - 1) totalCols += GAP_COL;
  }

  const cell = Math.min(Math.floor((size * 0.58) / totalCols), Math.floor((size * 0.34) / maxH));
  const blockW = totalCols * cell;
  const blockH = maxH * cell;
  const startX = Math.floor((size - blockW) / 2);
  const startY = Math.floor((size - blockH) / 2 + size * 0.015);

  const mask = new Uint8Array(size * size);

  let col0 = 0;
  for (let gi = 0; gi < rowsPerChar.length; gi++) {
    const g = rowsPerChar[gi];
    const gw = g[0].length;
    const gh = g.length;
    for (let row = 0; row < gh; row++) {
      for (let c = 0; c < gw; c++) {
        const ch = g[row][c];
        if (ch !== "#") continue;
        for (let dy = 0; dy < cell; dy++) {
          for (let dx = 0; dx < cell; dx++) {
            const px = startX + (col0 + c) * cell + dx;
            const py = startY + row * cell + dy;
            if (px >= 0 && px < size && py >= 0 && py < size) mask[py * size + px] = 1;
          }
        }
      }
    }
    col0 += gw + (gi < rowsPerChar.length - 1 ? GAP_COL : 0);
  }

  return mask;
}

function makeRgbaFn(size, mask) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (64 / 192) * size;
  const sw = (8 / 192) * size;
  const inner = r - sw / 2;
  const outer = r + sw / 2;

  const text = { r: 250, g: 250, b: 252 };

  return (x, y) => {
    if (mask[y * size + x]) {
      return { ...text, a: 255 };
    }
    const bg = gradientRgb(x, y, size, size);
    const afterRing = ringRgb(x, y, cx, cy, inner, outer, bg);
    return { ...afterRing, a: 255 };
  };
}

function renderRgba(dim, mask) {
  const fn = makeRgbaFn(dim, mask);
  const buf = new Uint8ClampedArray(dim * dim * 4);
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const p = fn(x, y);
      const i = (y * dim + x) * 4;
      buf[i] = p.r;
      buf[i + 1] = p.g;
      buf[i + 2] = p.b;
      buf[i + 3] = p.a;
    }
  }
  return buf;
}

function downsampleRgba(src, fromDim, toDim) {
  const out = new Uint8ClampedArray(toDim * toDim * 4);
  const ratio = fromDim / toDim;
  for (let y = 0; y < toDim; y++) {
    for (let x = 0; x < toDim; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      const x0 = Math.floor(x * ratio);
      const x1 = Math.min(fromDim, Math.ceil((x + 1) * ratio));
      const y0 = Math.floor(y * ratio);
      const y1 = Math.min(fromDim, Math.ceil((y + 1) * ratio));
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * fromDim + xx) * 4;
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          a += src[i + 3];
          n++;
        }
      }
      const j = (y * toDim + x) * 4;
      out[j] = Math.round(r / n);
      out[j + 1] = Math.round(g / n);
      out[j + 2] = Math.round(b / n);
      out[j + 3] = Math.round(a / n);
    }
  }
  return out;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      const bit = c & 1;
      c = (c >>> 1) ^ (bit ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, "ascii");
  data.copy(buf, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function encodePngFromRgba(rgba, width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw[o++] = rgba[i];
      raw[o++] = rgba[i + 1];
      raw[o++] = rgba[i + 2];
      raw[o++] = rgba[i + 3];
    }
  }
  const idat = deflateSync(raw, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function writeIcon(size, filename) {
  const big = size * SUPER_SAMPLE;
  const mask = buildTextMask(big);
  const bigRgba = renderRgba(big, mask);
  const rgba = downsampleRgba(bigRgba, big, size);
  const png = encodePngFromRgba(rgba, size, size);
  writeFileSync(join(publicDir, filename), png);
}

writeIcon(192, "pwa-192.png");
writeIcon(512, "pwa-512.png");
writeIcon(180, "apple-touch-icon.png");

console.log("OK: public/pwa-192.png, public/pwa-512.png, public/apple-touch-icon.png");
