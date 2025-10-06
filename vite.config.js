import { defineConfig } from 'vite';
import { resolve } from 'path';

const repoName = 'Bodega-Project-2';
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: isGithubActions ? `/${repoName}/` : '/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        story: resolve(__dirname, 'story/index.html'),
        gallery: resolve(__dirname, 'gallery/index.html'),
        kpi: resolve(__dirname, 'kpi-builder/index.html'),
        test: resolve(__dirname, 'Test.html'),
        map: resolve(__dirname, 'Map/index.html')
      }
    }
  }
});

