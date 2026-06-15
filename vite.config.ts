import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { devMirrorPlugin } from './vite-plugin-dev-mirror'

export default defineConfig({
  plugins: [react(), tailwindcss(), devMirrorPlugin(__dirname)],
  server: {
    port: 5173,
    strictPort: true,
    open: true,
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
