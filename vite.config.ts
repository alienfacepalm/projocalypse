import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { devMirrorPlugin } from './vite-plugin-dev-mirror'

/** Must match DEV_PORT in scripts/dev-port.mjs */
const DEV_PORT = 5173
const host = '127.0.0.1'

export default defineConfig({
  plugins: [react(), tailwindcss(), devMirrorPlugin({ viteRoot: __dirname })],
  // Expose GEMINI_* to import.meta.env for the board chat assistant (local dev).
  envPrefix: ['VITE_', 'GEMINI_'],
  server: {
    host,
    port: DEV_PORT,
    strictPort: true,
    open: true,
  },
  preview: {
    host,
    port: DEV_PORT,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@projocalypse/plan': path.resolve(__dirname, './packages/plan/src/index.ts'),
      '@projocalypse/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@projocalypse/gap': path.resolve(__dirname, './packages/gap/src/index.ts'),
    },
  },
})
