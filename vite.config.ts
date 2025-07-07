 
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  appType: 'spa',
  server: {
    host: "::",
    port: 8080,
    // Add headers to allow 'unsafe-eval' for development ONLY
    // WARNING: Do not use 'unsafe-eval' in production!
    // Force development headers for testing CSP application
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://via.placeholder.com https://*.supabase.co https://fal.media; connect-src 'self' http://localhost:3000 ws://localhost:8080 https://*.supabase.co wss://*.supabase.co https://queue.fal.run; media-src 'self' https://*.supabase.co production-cdn.whalesync.com https://production-cdn.whalesyncusercontent.com;" // Added media-src for whalesync and supabase
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
}));
