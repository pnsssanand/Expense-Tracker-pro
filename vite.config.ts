import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Prevent Rollup native loader error on Vercel
      "@rollup/rollup-linux-x64-gnu": path.resolve(__dirname, "./stub-native.js"),
    },
  },
  build: {
    rollupOptions: {
      // Ensure Rollup doesn't try to use native extensions
      context: "globalThis",
    },
  },
});
