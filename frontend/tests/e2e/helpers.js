import { expect } from '@playwright/test'

export const ADMIN = { email: 'admin@edas.test', password: 'Admin@123' }
export const ALI = { email: 'ali@edas.test', password: 'Faculty@123' }

export async function login(page, { email, password }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
}

// Fills a form modal by field label (selects by option value or label) and clicks Save.
export async function fill(page, values) {
  for (const [label, value] of Object.entries(values)) {
    const field = page.getByRole('dialog').getByLabel(label, { exact: true })
    if (await field.evaluate((el) => el.tagName) === 'SELECT') await field.selectOption(value)
    else await field.fill(value)
  }
  await page.getByRole('button', { name: 'Save' }).click()
}

export const row = (page, text) => page.getByRole('row').filter({ hasText: text })

export async function remove(page, text) {
  page.once('dialog', (dialog) => dialog.accept())
  await row(page, text).getByRole('button', { name: 'Delete' }).click()
}
