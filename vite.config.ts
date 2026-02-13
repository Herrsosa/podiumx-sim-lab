import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      leaflet: path.resolve(__dirname, "./node_modules/leaflet/dist/leaflet-src.esm.js"),
    },
  },

  // ⬇️ Add this block
  build: {
    sourcemap: true, // <-- enables source maps in production build

    // (optional) split heavy libs out of the entry bundle
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts")) return "recharts";
            if (id.includes("@supabase") || id.includes("cross-fetch")) return "supabase";
            return "vendor";
          }
        },
      },
    },
  },
}));
