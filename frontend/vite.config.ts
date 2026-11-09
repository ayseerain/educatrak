import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// EducatraK is a desktop, offline-first application for a local school
// intranet. No CDN or remote asset dependencies are configured here.
export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/sanctum": {
        target: process.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          router: ["react-router-dom"],
          vendor: ["@tanstack/react-query", "@tanstack/react-table", "lucide-react", "react", "react-dom"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
}));
