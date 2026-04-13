#!/usr/bin/env node
/**
 * Renders two OpenGraph link-preview cards for scrapers:
 *
 *   public/og.jpg         1200×630  landscape — Twitter, Facebook, LinkedIn
 *   public/og-square.jpg  1200×1200 square    — WhatsApp, iMessage, Slack
 *
 * Run after any wordmark or tagline change:
 *
 *   node scripts/generate-og.mjs
 */

import sharp from 'sharp';

const BRICK = '#f16939';
const INK = '#0f0d0a';
const CREAM = '#f5f1ea';
const INDIGO = '#5c63ad';

const backgroundSvg = ({ width, height, glowCy }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="${glowCy}%" r="72%">
      <stop offset="0%" stop-color="${BRICK}" stop-opacity="0.55"/>
      <stop offset="34%" stop-color="${BRICK}" stop-opacity="0.22"/>
      <stop offset="72%" stop-color="${BRICK}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="${BRICK}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="${INK}"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
</svg>`;

const ornamentSvg = ({ width, height }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g opacity="0.55" transform="translate(${width - 110}, 80)">
    <rect x="-20" y="-20" width="40" height="40" fill="${BRICK}"/>
    <rect x="-20" y="-20" width="40" height="40" fill="${BRICK}" transform="rotate(45)"/>
  </g>
  <g opacity="0.42" transform="translate(94, ${height - 94})">
    <rect x="-14" y="-14" width="28" height="28" fill="${INDIGO}"/>
  </g>
</svg>`;

const textSvg = ({ width, height, taglineY, urlY, taglineSize = 34, urlSize = 18 }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <text x="${width / 2}" y="${taglineY}" font-family="Georgia, 'Times New Roman', serif" font-size="${taglineSize}" font-style="italic" fill="${CREAM}" fill-opacity="0.88" text-anchor="middle">A design studio in Tripoli.</text>
  <text x="${width / 2}" y="${urlY}" font-family="Helvetica, Arial, sans-serif" font-size="${urlSize}" font-weight="500" fill="${CREAM}" fill-opacity="0.55" text-anchor="middle" letter-spacing="5">MESHKATSTUDIO.COM</text>
</svg>`;

const render = async ({ width, height, output, wordmarkWidth, wordmarkTop, glowCy, taglineY, urlY, taglineSize, urlSize }) => {
  const background = backgroundSvg({ width, height, glowCy });
  const ornaments = ornamentSvg({ width, height });
  const text = textSvg({ width, height, taglineY, urlY, taglineSize, urlSize });

  const wordmark = await sharp('src/assets/brand/ARB-ENG-Logo-light.svg')
    .resize({ width: wordmarkWidth })
    .png()
    .toBuffer();
  const wordmarkMeta = await sharp(wordmark).metadata();
  const wordmarkLeft = Math.round((width - (wordmarkMeta.width ?? wordmarkWidth)) / 2);

  await sharp(Buffer.from(background))
    .composite([
      { input: Buffer.from(ornaments), top: 0, left: 0 },
      { input: wordmark, top: wordmarkTop, left: wordmarkLeft },
      { input: Buffer.from(text), top: 0, left: 0 },
    ])
    .jpeg({ quality: 90, progressive: true, chromaSubsampling: '4:2:0' })
    .toFile(output);

  console.log(`✓ ${output} (${width}×${height})`);
};

// Landscape — Twitter / Facebook / LinkedIn / Slack.
await render({
  width: 1200,
  height: 630,
  output: 'public/og.jpg',
  wordmarkWidth: 760,
  wordmarkTop: 150,
  glowCy: 72,
  taglineY: 500,
  urlY: 573,
  taglineSize: 34,
  urlSize: 18,
});

// Square — WhatsApp / iMessage / generic scrapers that prefer 1:1.
await render({
  width: 1200,
  height: 1200,
  output: 'public/og-square.jpg',
  wordmarkWidth: 820,
  wordmarkTop: 380,
  glowCy: 60,
  taglineY: 870,
  urlY: 955,
  taglineSize: 42,
  urlSize: 22,
});
