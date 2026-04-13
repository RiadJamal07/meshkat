import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://riadjamal07.github.io',
  base: '/meshkat',
  trailingSlash: 'ignore',
  image: {
    responsiveStyles: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
