import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  publicDir: false, // Don't copy public directory
  build: {
    lib: {
      entry: resolve(__dirname, 'src/components/index.jsx'),
      name: 'HeroUIComponents',
      fileName: 'hero-ui-components',
      formats: ['iife'], // Immediately Invoked Function Expression for browser
    },
    outDir: 'public/js/lib',
    emptyOutDir: false,
    copyPublicDir: false,
    rollupOptions: {
      output: {
        // Ensure CSS is extracted
        assetFileNames: 'hero-ui-components.[ext]',
      },
    },
    // Minify with esbuild (default, faster than terser)
    minify: 'esbuild',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
