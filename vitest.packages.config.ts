import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Turbo runs package tests with cwd = packages/<name>; anchor includes to repo root.
  root: __dirname,
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts'],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@projocalypse/plan': path.resolve(__dirname, './packages/plan/src/index.ts'),
      '@projocalypse/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@projocalypse/gap': path.resolve(__dirname, './packages/gap/src/index.ts'),
    },
  },
})
