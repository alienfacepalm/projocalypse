import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
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
