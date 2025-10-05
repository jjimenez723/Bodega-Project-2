import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        story: resolve(__dirname, 'story.html'),
        gallery: resolve(__dirname, 'gallery.html'),
        kpi: resolve(__dirname, 'kpi-builder.html'),
        test: resolve(__dirname, 'Test.html'),
        map: resolve(__dirname, 'Map/map.html')
      }
    }
  }
});
