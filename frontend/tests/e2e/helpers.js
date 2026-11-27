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
