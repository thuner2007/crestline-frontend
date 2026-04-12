/**
 * Crestline Customs — Logo & Asset Generator
 *
 * Generates all required image assets for favicon, PWA, SEO, and OG.
 * Uses the Oswald font already cached by Next.js build.
 *
 * Run: node generate-logos.js
 */

const path = require("path");
const fs = require("fs");
const sharp = require("./node_modules/sharp");

// ─── Config ──────────────────────────────────────────────────────────────────
const AMBER = "#FBBF24";
const WHITE = "#FFFFFF";
const BLACK = "#000000";

// Oswald Bold (Latin subset) cached by Next.js build
const OSWALD_WOFF2 = path.join(
  __dirname,
  ".next/static/media/bd9b9909c3a641ff-s.p.woff2"
);

const PUBLIC = path.join(__dirname, "public");

// ─── Font loading ─────────────────────────────────────────────────────────────
if (!fs.existsSync(OSWALD_WOFF2)) {
  console.error("Oswald woff2 not found – run `npm run build` first.");
  process.exit(1);
}
const OSWALD_B64 = fs.readFileSync(OSWALD_WOFF2).toString("base64");

// ─── SVG builders ─────────────────────────────────────────────────────────────

/** Shared @font-face block */
const FONT_FACE = `
  <defs>
    <style>
      @font-face {
        font-family: 'Oswald';
        src: url('data:font/woff2;base64,${OSWALD_B64}') format('woff2');
        font-weight: 700;
        font-style: normal;
      }
    </style>
  </defs>`;

/**
 * Full stacked text logo: CRESTLINE / CUSTOMS
 *   w × h canvas, text centred.
 *   Uses textLength + lengthAdjust="spacing" so text ALWAYS fills the canvas
 *   width regardless of size — no clipping, no squishing.
 */
function logoSVG(w, h) {
  // Oswald Bold is condensed: ~0.63 × fontSize per char width.
  // With letter-spacing 0.14em: total per char ≈ 0.77 × fontSize.
  // 9 chars → natural width ≈ 6.93 × fontSize.
  // We want to fill 88% of canvas width (4% margin each side).
  const target = Math.round(w * 0.88);

  // Font size driven by width: F = target / 6.93
  const fsByWidth = Math.round(target / 6.93);
  // Also constrained by height (leave room for two lines)
  const fsByHeight = Math.round(h * 0.42);
  const fs1 = Math.min(fsByWidth, fsByHeight); // CRESTLINE
  const fs2 = Math.round(fs1 * 0.56);          // CUSTOMS ≈ 56% of CRESTLINE

  // Vertical positioning: centre the 2-line block in the canvas
  const blockH = fs1 + Math.round(fs1 * 0.15) + fs2; // line1 + gap + line2
  const startY = Math.round((h - blockH) / 2);
  const y1 = startY + fs1;                            // first baseline
  const y2 = y1 + Math.round(fs1 * 0.15) + fs2;      // second baseline

  const cx = Math.round(w / 2);
  const x0 = Math.round(w * 0.06);                   // left edge of text block

  // textLength forces precise width — spacing only, no glyph distortion
  const tl1 = target;                                  // CRESTLINE fills 88% width
  const tl2 = Math.round(target * 0.70);               // CUSTOMS fills 62% width

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${FONT_FACE}
  <rect width="${w}" height="${h}" fill="${BLACK}"/>
  <text
    x="${cx}" y="${y1}"
    font-family="Oswald, 'Ubuntu Condensed', Impact, sans-serif"
    font-weight="700"
    font-size="${fs1}"
    fill="${WHITE}"
    text-anchor="middle"
    textLength="${tl1}"
    lengthAdjust="spacing"
    dominant-baseline="alphabetic"
  >CRESTLINE</text>
  <text
    x="${cx}" y="${y2}"
    font-family="Oswald, 'Ubuntu Condensed', Impact, sans-serif"
    font-weight="700"
    font-size="${fs2}"
    fill="${AMBER}"
    text-anchor="middle"
    textLength="${tl2}"
    lengthAdjust="spacing"
    dominant-baseline="alphabetic"
  >CUSTOMS</text>
</svg>`;
}

/**
 * Compact square icon — large "C" lettermark on black, amber.
 * Used for 16 × 16 and 32 × 32 favicons.
 */
function iconSVG(size) {
  const fontSize = Math.round(size * 0.72);
  const y = Math.round(size * 0.74);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${FONT_FACE}
  <rect width="${size}" height="${size}" fill="${BLACK}"/>
  <text
    x="${Math.round(size / 2)}" y="${y}"
    font-family="Oswald, 'Ubuntu Condensed', Impact, sans-serif"
    font-weight="700"
    font-size="${fontSize}"
    fill="${AMBER}"
    text-anchor="middle"
    dominant-baseline="alphabetic"
  >C</text>
</svg>`;
}

/**
 * Open Graph banner: 1200 × 630
 * Centred logo + subtle amber accent bar below the text block.
 */
function ogSVG(w, h) {
  const fs1 = Math.round(h * 0.22); // CRESTLINE
  const fs2 = Math.round(fs1 * 0.56); // CUSTOMS
  const cx = Math.round(w / 2);
  const blockH = fs1 + Math.round(fs1 * 0.15) + fs2;
  const startY = Math.round((h - blockH) / 2 - h * 0.03);
  const y1 = startY + fs1;
  const y2 = y1 + Math.round(fs1 * 0.15) + fs2;

  const tl1 = Math.round(w * 0.60);   // CRESTLINE fills 60% of OG width
  const tl2 = Math.round(tl1 * 0.70); // CUSTOMS fills 70% of that

  // Amber accent line under the text block
  const lineY = y2 + Math.round(h * 0.07);
  const lineW = tl1;
  const lineH = Math.round(h * 0.008);
  const lineX = Math.round((w - lineW) / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${FONT_FACE}
  <rect width="${w}" height="${h}" fill="${BLACK}"/>
  <text
    x="${cx}" y="${y1}"
    font-family="Oswald, 'Ubuntu Condensed', Impact, sans-serif"
    font-weight="700"
    font-size="${fs1}"
    fill="${WHITE}"
    text-anchor="middle"
    textLength="${tl1}"
    lengthAdjust="spacing"
    dominant-baseline="alphabetic"
  >CRESTLINE</text>
  <text
    x="${cx}" y="${y2}"
    font-family="Oswald, 'Ubuntu Condensed', Impact, sans-serif"
    font-weight="700"
    font-size="${fs2}"
    fill="${AMBER}"
    text-anchor="middle"
    textLength="${tl2}"
    lengthAdjust="spacing"
    dominant-baseline="alphabetic"
  >CUSTOMS</text>
  <rect x="${lineX}" y="${lineY}" width="${lineW}" height="${lineH}" fill="${AMBER}" rx="${Math.round(lineH / 2)}"/>
</svg>`;
}

// ─── Minimal ICO encoder ──────────────────────────────────────────────────────
/**
 * Encodes an array of { width, height, pngBuffer } into an ICO file buffer.
 * Uses the PNG-in-ICO format (supported by all modern browsers).
 */
function createIco(images) {
  const headerSize = 6;
  const entrySize = 16;
  const dirSize = headerSize + images.length * entrySize;

  // Compute offsets
  let offset = dirSize;
  const offsets = images.map((img) => {
    const cur = offset;
    offset += img.pngBuffer.length;
    return cur;
  });

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = ICO
  header.writeUInt16LE(images.length, 4);

  const entries = images.map((img, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(img.width === 256 ? 0 : img.width, 0);
    e.writeUInt8(img.height === 256 ? 0 : img.height, 1);
    e.writeUInt8(0, 2); // color count
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bit count
    e.writeUInt32LE(img.pngBuffer.length, 8);
    e.writeUInt32LE(offsets[i], 12);
    return e;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.pngBuffer)]);
}

// ─── Render helper ────────────────────────────────────────────────────────────
async function render(svgStr, outPath, width, height) {
  await sharp(Buffer.from(svgStr)).resize(width, height).png().toFile(outPath);
  console.log(`  ✓  ${path.relative(__dirname, outPath)}  (${width}×${height})`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\nCrestline Customs — Logo Generator\n");

  // ── 1. Master SVG (vector, no raster) ──────────────────────────────────────
  const svgOut = path.join(PUBLIC, "logo.svg");
  // Write a clean SVG without embedded base64 font for the SVG file itself
  // (uses Google Fonts import for the web version)
  const masterSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700&amp;display=swap');
    </style>
  </defs>
  <rect width="600" height="200" fill="#000000"/>
  <text x="300" y="110" font-family="Oswald, Impact, sans-serif" font-weight="700" font-size="88" fill="#FFFFFF" text-anchor="middle" letter-spacing="12">CRESTLINE</text>
  <text x="300" y="170" font-family="Oswald, Impact, sans-serif" font-weight="700" font-size="50" fill="#FBBF24" text-anchor="middle" letter-spacing="18">CUSTOMS</text>
</svg>`;
  fs.writeFileSync(svgOut, masterSVG, "utf8");
  console.log(`  ✓  ${path.relative(__dirname, svgOut)}  (SVG vector)`);

  // ── 2. Favicon square PNG sizes ────────────────────────────────────────────
  // 16×16 and 32×32 use the "C" lettermark; larger use the full text logo

  const icon16Buf = await sharp(Buffer.from(iconSVG(256)))
    .resize(16, 16)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC, "favicon-16x16.png"), icon16Buf);
  console.log("  ✓  public/favicon-16x16.png  (16×16)");

  const icon32Buf = await sharp(Buffer.from(iconSVG(256)))
    .resize(32, 32)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC, "favicon-32x32.png"), icon32Buf);
  console.log("  ✓  public/favicon-32x32.png  (32×32)");

  const icon48Buf = await sharp(Buffer.from(iconSVG(256)))
    .resize(48, 48)
    .png()
    .toBuffer();

  // ── 3. favicon.ico (16 + 32 + 48) ─────────────────────────────────────────
  const ico = createIco([
    { width: 16, height: 16, pngBuffer: icon16Buf },
    { width: 32, height: 32, pngBuffer: icon32Buf },
    { width: 48, height: 48, pngBuffer: icon48Buf },
  ]);
  fs.writeFileSync(path.join(PUBLIC, "favicon.ico"), ico);
  console.log("  ✓  public/favicon.ico  (16+32+48)");

  // ── 4. Apple touch icon (180×180) ─────────────────────────────────────────
  await render(logoSVG(180, 180), path.join(PUBLIC, "apple-icon.png"), 180, 180);

  // ── 5. PWA / manifest icons ────────────────────────────────────────────────
  await render(logoSVG(192, 192), path.join(PUBLIC, "192x192.png"), 192, 192);
  await render(logoSVG(512, 512), path.join(PUBLIC, "512x512.png"), 512, 512);

  // ── 6. Additional useful sizes ─────────────────────────────────────────────
  await render(logoSVG(256, 256), path.join(PUBLIC, "logo-256.png"), 256, 256);

  // ── 7. Open Graph image (1200×630) ────────────────────────────────────────
  await render(
    ogSVG(1200, 630),
    path.join(PUBLIC, "og-image.png"),
    1200,
    630
  );

  // ── 8. Twitter card (1200×600) ────────────────────────────────────────────
  await render(
    ogSVG(1200, 600),
    path.join(PUBLIC, "twitter-image.png"),
    1200,
    600
  );

  // ── 9. Wide banner (1200×400) — for email / social headers ────────────────
  await render(
    ogSVG(1200, 400),
    path.join(PUBLIC, "logo-banner.png"),
    1200,
    400
  );

  console.log("\nDone! All assets written to public/\n");
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
