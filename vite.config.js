
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Rutas relativas para compatibilidad total con GitHub Pages (/Adminsuper/)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});

