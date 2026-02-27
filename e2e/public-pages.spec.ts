import { test, expect } from '@playwright/test'

test.describe('Public pages', () => {
  test('homepage loads and shows support portal', async ({ page }) => {
    await page.goto('/suporte')
    await expect(page).toHaveTitle(/Bethel Suporte/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('help page loads ticket form', async ({ page }) => {
    await page.goto('/suporte/ajuda')
    await expect(page.locator('body')).toBeVisible()
  })

  test('404 page shows for invalid routes', async ({ page }) => {
    await page.goto('/pagina-inexistente')
    await expect(page.locator('body')).toContainText('encontrada')
  })

  test('skip link is present and points to main-content', async ({ page }) => {
    await page.goto('/suporte')
    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toBeAttached()
    const mainContent = page.locator('#main-content')
    await expect(mainContent).toBeAttached()
  })
})

test.describe('Admin login', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('body')).toContainText('Bethel Suporte')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('unauthenticated users are redirected from admin to login', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForURL(/\/admin\/login/)
    await expect(page.url()).toContain('/admin/login')
  })

  test('login form validates empty submission', async ({ page }) => {
    await page.goto('/admin/login')
    await page.click('button[type="submit"]')
    // Form validation should prevent submission with empty fields
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})

test.describe('Security headers', () => {
  test('response includes security headers', async ({ page }) => {
    const response = await page.goto('/suporte')
    const headers = response?.headers()

    expect(headers?.['x-frame-options']).toBe('DENY')
    expect(headers?.['x-content-type-options']).toBe('nosniff')
    expect(headers?.['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers?.['strict-transport-security']).toContain('max-age=')
  })
})

test.describe('Ticket creation flow', () => {
  test('support page has product and category selectors', async ({ page }) => {
    await page.goto('/suporte/ajuda')
    await expect(page.locator('body')).toBeVisible()
    // Form should be present
    const form = page.locator('form')
    await expect(form).toBeVisible()
  })
})
