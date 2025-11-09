// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // 💡 Import 'path' is necessary for path.resolve

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ✅ FIX: Resolve the "Multiple Copies of React" error
  resolve: {
    alias: {
      // Force all packages to use the single installed instance
      react: path.resolve("./node_modules/react"),
      "react-dom": path.resolve("./node_modules/react-dom"),
    },
  },
});
