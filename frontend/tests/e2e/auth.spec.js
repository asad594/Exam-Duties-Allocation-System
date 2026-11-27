import { expect, test } from '@playwright/test'
import { ADMIN, ALI, login } from './helpers'

test('a visitor is sent to the login page', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login$/)
})

test('a wrong password shows the API error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Password').fill('wrong')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Invalid email or password.')).toBeVisible()
})

test('admin lands on the dashboard with live counts', async ({ page }) => {
  await login(page, ADMIN)
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Signed in as Admin')).toBeVisible()
  await expect(page.locator('.card', { hasText: 'Faculty' }).locator('.display-6')).not.toHaveText('0')
})

test('the session survives a page reload', async ({ page }) => {
  await login(page, ADMIN)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('logout returns to the login page', async ({ page }) => {
  await login(page, ADMIN)
  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login$/)
})

test('faculty land on My Duties and cannot open admin pages', async ({ page }) => {
  await login(page, ALI)
  await expect(page).toHaveURL(/\/my-duties$/)
  await expect(page.getByRole('heading', { name: 'My Duties' })).toBeVisible()
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/my-duties$/)
})
