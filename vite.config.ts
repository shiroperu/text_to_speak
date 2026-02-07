// vite.config.ts
// Vite build configuration for VoiceCast Studio.
// Uses React plugin and path alias for clean imports.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
