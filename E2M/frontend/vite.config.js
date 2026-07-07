import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api requests to the FastAPI backend during development.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
