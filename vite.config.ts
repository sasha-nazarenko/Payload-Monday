import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // @payloadcms/ui bundles Next.js internals that reference process.env
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  server: {
    // Fixes “can’t connect” when only one of localhost / 127.0.0.1 works, and allows LAN URLs.
    host: true,
    // If 5173 is taken (another Vite/Node process), Vite picks the next free port instead of failing.
    port: 5173,
    strictPort: false,
    open: true,
  },
});
