import { expect, test } from '@playwright/test'
import { ADMIN, fill, login, remove, row } from './helpers'

test.beforeEach(async ({ page }) => login(page, ADMIN))

test('seeded exam shows its rooms', async ({ page }) => {
  await page.getByRole('link', { name: 'Exam Sessions' }).click()
  await row(page, '2030-03-04').filter({ hasText: '09:00 - 12:00' }).getByRole('button', { name: 'Rooms' }).click()
  const panel = page.locator('.card', { hasText: 'Rooms for session' })
  await expect(panel.getByRole('row', { name: /Room 1/ })).toBeVisible()
  await expect(panel.getByRole('row', { name: /Room 2/ })).toBeVisible()
})

test('end time before start time is rejected', async ({ page }) => {
  await page.getByRole('link', { name: 'Exam Sessions' }).click()
  await page.getByRole('button', { name: 'Add Session' }).click()
  await fill(page, { Course: 'CS101 - CS101 Examination', Date: '2030-04-01', 'Start time': '12:00', 'End time': '09:00' })
  await expect(page.getByRole('dialog').getByText('EndTime must be after StartTime.')).toBeVisible()
})

test('session with rooms: add, add slot, duplicate slot, delete', async ({ page }) => {
  await page.getByRole('link', { name: 'Exam Sessions' }).click()
  await page.getByRole('button', { name: 'Add Session' }).click()
  await fill(page, { Course: 'CS101 - CS101 Examination', Date: '2030-04-01', 'Start time': '09:00', 'End time': '12:00' })
  const session = row(page, '2030-04-01')
  await expect(session).toContainText('09:00 - 12:00')

  await session.getByRole('button', { name: 'Rooms' }).click()
  await page.getByRole('button', { name: 'Add Room slot' }).click()
  await fill(page, { Room: 'Room 3', 'Invigilators required': '2' })
  const panel = page.locator('.card', { hasText: 'Rooms for session' })
  await expect(panel.getByRole('row', { name: /Room 3/ })).toBeVisible()

  await page.getByRole('button', { name: 'Add Room slot' }).click()
  await fill(page, { Room: 'Room 3', 'Invigilators required': '1' })
  await expect(page.getByRole('dialog').getByText(/conflicts with existing data/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()

  await remove(page, 'Room 3')
  await expect(panel.getByRole('row', { name: /Room 3/ })).toHaveCount(0)
  await remove(page, '2030-04-01')
  await expect(row(page, '2030-04-01')).toHaveCount(0)
})

test('unavailability: filter, add, edit, delete', async ({ page }) => {
  await page.getByRole('link', { name: 'Unavailability' }).click()
  await page.getByLabel('Show unavailability for').selectOption({ label: 'Usman Tariq' })
  await expect(row(page, '2030-03-05')).toContainText('Usman Tariq')
  await expect(page.getByRole('row')).toHaveCount(2)

  await page.getByLabel('Show unavailability for').selectOption({ label: 'All faculty' })
  await page.getByRole('button', { name: 'Add Unavailability' }).click()
  await fill(page, { 'Faculty member': 'Ali Raza', Date: '2030-04-01', From: '00:00', To: '23:59' })
  await expect(row(page, '2030-04-01')).toContainText('Ali Raza')
  await row(page, '2030-04-01').getByRole('button', { name: 'Edit' }).click()
  await fill(page, { From: '09:00', To: '12:00' })
  await expect(row(page, '2030-04-01')).toContainText('09:00')
  await remove(page, '2030-04-01')
  await expect(row(page, '2030-04-01')).toHaveCount(0)
})
