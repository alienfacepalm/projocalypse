import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@projocalypse/plan': path.resolve(__dirname, './packages/plan/src/index.ts'),
      '@projocalypse/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@projocalypse/gap': path.resolve(__dirname, './packages/gap/src/index.ts'),
    },
  },
})
