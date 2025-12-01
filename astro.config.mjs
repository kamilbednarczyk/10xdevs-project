// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

const WATCH_IGNORE = [
  "**/coverage/**",
  "**/.nyc_output/**",
  "**/e2e-coverage.txt",
  "**/unit-coverage.txt",
  "**/playwright-report/**",
];

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: WATCH_IGNORE,
      },
    },
  },
  adapter: cloudflare(),
});
