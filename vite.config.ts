import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3004,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  assetsInclude: ["**/*.pdf"],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Isolamento dos motores pesados de geração e manipulação de PDF
            if (
              id.includes('@react-pdf') ||
              id.includes('pdf-lib') ||
              id.includes('jspdf') ||
              id.includes('html2canvas') ||
              id.includes('dompurify')
            ) {
              return 'vendor-pdf';
            }
            // Isolamento do pacote de ícones lucide
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Núcleo do React e roteamento
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom') ||
              id.includes('@tanstack/react-query')
            ) {
              return 'vendor-core';
            }
          }
        },
      },
    },
  },
}));
