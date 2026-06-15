import { expect, test } from '@playwright/test'
import { E2E_EMBED_PROJECT_NAME } from '../src/e2e/seed-embedded-project'

const HARNESS_PATH = '/e2e/embed-harness.html'

test.describe('Talemail embed /project route', () => {
  test('shows project UI instead of indefinite Loading', async ({ page }) => {
    await page.goto(HARNESS_PATH)

    const loading = page.getByText('Loading…', { exact: true })
    await expect(loading).toBeHidden({ timeout: 15_000 })

    await expect(page.getByRole('button', { name: E2E_EMBED_PROJECT_NAME })).toBeVisible()
    await expect(page.getByRole('button', { name: 'List' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Board' })).toBeVisible()
    await expect(page.getByText('To Do')).toBeVisible()
  })
})
