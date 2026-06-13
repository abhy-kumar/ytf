import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            sourcemap: true,
            minify: process.env.NODE_ENV === 'production',
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            sourcemap: !!process.env.VSCODE_DEBUG ? 'inline' : undefined,
            minify: process.env.NODE_ENV === 'production',
          },
        },
      }
    ]),
    renderer(),
  ],
});
