import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.API_URL ?? "http://localhost:3000";

export default defineConfig({
  root: "web",
  plugins: [react()],
  server: {
    port: 5173,
    // Фронт ходит на относительный /reprice — в dev-режиме Vite проксирует запрос на API
    proxy: { "/reprice": apiTarget },
  },
  build: { outDir: "../dist/web", emptyOutDir: true },
});
