#!/usr/bin/env node
/**
 * Renders the 1200x630 OpenGraph card for link-preview scrapers
 * (WhatsApp, Slack, Twitter, Facebook, LinkedIn, iMessage). Run this
 * whenever the wordmark or tagline changes:
 *
 *   node scripts/generate-og.mjs
 *
 * Output: public/og.jpg (committed to the repo, served at /og.jpg).
 */

import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const WIDTH = 1200;
const HEIGHT = 630;

const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="72%" r="70%">
      <stop offset="0%" stop-color="#f16939" stop-opacity="0.55"/>
      <stop offset="35%" stop-color="#f16939" stop-opacity="0.22"/>
      <stop offset="75%" stop-color="#f16939" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#f16939" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0f0d0a"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <g opacity="0.55">
    <rect x="1090" y="60" width="40" height="40" fill="#f16939" transform="rotate(45 1110 80)"/>
    <rect x="1090" y="60" width="40" height="40" fill="#f16939"/>
  </g>
  <g opacity="0.42">
    <rect x="80" y="530" width="28" height="28" fill="#5c63ad"/>
  </g>
  <text x="600" y="500" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-style="italic" fill="#f5f1ea" fill-opacity="0.88" text-anchor="middle">A design studio in Tripoli.</text>
  <text x="600" y="573" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="500" fill="#f5f1ea" fill-opacity="0.55" text-anchor="middle" letter-spacing="5">MESHKATSTUDIO.COM</text>
</svg>`;

const wordmark = await sharp('src/assets/brand/ARB-ENG-Logo-light.svg')
  .resize({ width: 760 })
  .png()
  .toBuffer();

const wordmarkMeta = await sharp(wordmark).metadata();
const wordmarkLeft = Math.round((WIDTH - (wordmarkMeta.width ?? 760)) / 2);
const wordmarkTop = 150;

await sharp(Buffer.from(background))
  .composite([{ input: wordmark, top: wordmarkTop, left: wordmarkLeft }])
  .jpeg({ quality: 90, progressive: true, chromaSubsampling: '4:2:0' })
  .toFile('public/og.jpg');

console.log(`✓ public/og.jpg (${WIDTH}×${HEIGHT}) written`);
