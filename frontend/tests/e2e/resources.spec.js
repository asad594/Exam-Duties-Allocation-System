import { expect, test } from '@playwright/test'
import { ADMIN, fill, login, remove, row } from './helpers'

const run = Date.now()

test.beforeEach(async ({ page }) => login(page, ADMIN))

test('rooms: add, edit, delete', async ({ page }) => {
  await page.getByRole('link', { name: 'Rooms' }).click()
  await page.getByRole('button', { name: 'Add Room' }).click()
  await fill(page, { 'Room name': `Room ${run}` })
  await expect(row(page, `Room ${run}`)).toBeVisible()
  await row(page, `Room ${run}`).getByRole('button', { name: 'Edit' }).click()
  await fill(page, { 'Room name': `Room ${run}B` })
  await expect(row(page, `Room ${run}B`)).toBeVisible()
  await remove(page, `Room ${run}B`)
  await expect(row(page, `Room ${run}B`)).toHaveCount(0)
})

test('rooms: duplicate name and in-use delete show errors', async ({ page }) => {
  await page.getByRole('link', { name: 'Rooms' }).click()
  await page.getByRole('button', { name: 'Add Room' }).click()
  await fill(page, { 'Room name': 'Room 1' })
  await expect(page.getByRole('dialog').getByText(/conflicts with existing data/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await remove(page, 'Room 1')
  await expect(page.getByText(/conflicts with existing data/)).toBeVisible()
})

test('courses: add, edit, delete', async ({ page }) => {
  await page.getByRole('link', { name: 'Courses' }).click()
  await page.getByRole('button', { name: 'Add Course' }).click()
  await fill(page, { 'Course code': `T${run}`.slice(0, 12), Title: 'Test course' })
  await expect(row(page, 'Test course')).toBeVisible()
  await row(page, 'Test course').getByRole('button', { name: 'Edit' }).click()
  await fill(page, { Title: 'Test course 2' })
  await expect(row(page, 'Test course 2')).toBeVisible()
  await remove(page, 'Test course 2')
  await expect(row(page, 'Test course 2')).toHaveCount(0)
})

test('faculty: add with password, edit without password, delete', async ({ page }) => {
  const email = `new${run}@edas.test`
  await page.getByRole('link', { name: 'Faculty' }).click()
  await page.getByRole('button', { name: 'Add User' }).click()
  await fill(page, { 'Full name': 'New Teacher', Email: email, Password: 'Faculty@123', Role: 'Faculty', 'Maximum duties': '3' })
  await expect(row(page, email)).toContainText('Faculty')
  await row(page, email).getByRole('button', { name: 'Edit' }).click()
  await fill(page, { 'Maximum duties': '5' })
  await expect(row(page, email)).toContainText('5')
  await remove(page, email)
  await expect(row(page, email)).toHaveCount(0)
})

test('faculty table never shows passwords', async ({ page }) => {
  await page.getByRole('link', { name: 'Faculty' }).click()
  await expect(row(page, 'ali@edas.test')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: /password/i })).toHaveCount(0)
})
