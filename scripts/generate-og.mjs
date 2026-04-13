#!/usr/bin/env node
/**
 * Renders the single OpenGraph link-preview card at public/og.jpg.
 *
 * Canvas is 1200×630 (the standard OG landscape). All critical content —
 * wordmark, tagline, URL, centered glow — is authored inside the central
 * 630×630 square so scrapers that crop the image to square (WhatsApp,
 * iMessage, some Slack layouts) still show a legible, complete card.
 * The left and right "wings" outside the safe zone carry decorative
 * motifs that are fine to be cropped off.
 *
 * Regenerate after wordmark or tagline changes:
 *
 *   node scripts/generate-og.mjs
 */

import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const SAFE_LEFT = (WIDTH - HEIGHT) / 2;   // 285
const SAFE_RIGHT = SAFE_LEFT + HEIGHT;    // 915
const SAFE_CENTER_X = WIDTH / 2;          // 600

const BRICK = '#f16939';
const INK = '#0f0d0a';
const CREAM = '#f5f1ea';
const INDIGO = '#5c63ad';
const GREEN = '#8ccb8a';

// Background glow is centered on the canvas and the safe zone share the
// same center, so the square crop sees the glow symmetrically too.
const backgroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="55%" r="62%">
      <stop offset="0%" stop-color="${BRICK}" stop-opacity="0.60"/>
      <stop offset="32%" stop-color="${BRICK}" stop-opacity="0.24"/>
      <stop offset="68%" stop-color="${BRICK}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${BRICK}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${INK}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
</svg>`;

// Decorative ornaments live OUTSIDE the safe zone (the left and right
// "wings" of the landscape). They're intentionally cropped off on any
// center-square crop.
const ornamentSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <g opacity="0.48" transform="translate(110, 180)">
    <rect x="-24" y="-24" width="48" height="48" fill="${INDIGO}"/>
    <rect x="-24" y="-24" width="48" height="48" fill="${INDIGO}" transform="rotate(45)"/>
  </g>
  <g opacity="0.55" transform="translate(1095, 470)">
    <rect x="-22" y="-22" width="44" height="44" fill="${BRICK}"/>
  </g>
  <g opacity="0.45" transform="translate(160, 490)">
    <polygon points="0,-20 18,0 0,20 -18,0" fill="${GREEN}"/>
  </g>
</svg>`;

// All text is anchored to SAFE_CENTER_X so it survives the square crop.
const textSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <text x="${SAFE_CENTER_X}" y="472" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-style="italic" fill="${CREAM}" fill-opacity="0.88" text-anchor="middle">A design studio in Tripoli.</text>
  <text x="${SAFE_CENTER_X}" y="540" font-family="Helvetica, Arial, sans-serif" font-size="15" font-weight="500" fill="${CREAM}" fill-opacity="0.55" text-anchor="middle" letter-spacing="5">MESHKATSTUDIO.COM</text>
</svg>`;

// Wordmark sized so it fits within the safe column with comfortable
// margin. 460px wide leaves ~85px breathing room on each side of the
// 630-wide safe zone.
const WORDMARK_WIDTH = 460;

const wordmark = await sharp('src/assets/brand/ARB-ENG-Logo-light.svg')
  .resize({ width: WORDMARK_WIDTH })
  .png()
  .toBuffer();

const wordmarkMeta = await sharp(wordmark).metadata();
const wordmarkRenderWidth = wordmarkMeta.width ?? WORDMARK_WIDTH;
const wordmarkRenderHeight = wordmarkMeta.height ?? 0;
const wordmarkLeft = Math.round((WIDTH - wordmarkRenderWidth) / 2);
const wordmarkTop = Math.round(150 - wordmarkRenderHeight * 0.08);

// Assertion: catch regressions where the wordmark would overflow the
// center safe zone and get clipped on square-crop scrapers.
const wordmarkRight = wordmarkLeft + wordmarkRenderWidth;
if (wordmarkLeft < SAFE_LEFT || wordmarkRight > SAFE_RIGHT) {
  throw new Error(
    `Wordmark (${wordmarkLeft}–${wordmarkRight}) leaks outside safe zone (${SAFE_LEFT}–${SAFE_RIGHT}).`,
  );
}

await sharp(Buffer.from(backgroundSvg))
  .composite([
    { input: Buffer.from(ornamentSvg), top: 0, left: 0 },
    { input: wordmark, top: wordmarkTop, left: wordmarkLeft },
    { input: Buffer.from(textSvg), top: 0, left: 0 },
  ])
  .jpeg({ quality: 90, progressive: true, chromaSubsampling: '4:2:0' })
  .toFile('public/og.jpg');

console.log(`✓ public/og.jpg (${WIDTH}×${HEIGHT}), safe zone ${SAFE_LEFT}–${SAFE_RIGHT}`);
