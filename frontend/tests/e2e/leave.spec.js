import { expect, test } from '@playwright/test'
import { ADMIN, login } from './helpers'

const API = 'http://localhost:5080/api'
const ALI = { email: 'ali@edas.test', password: 'Faculty@123' }

// A different far-future day on every run, so leftovers from earlier runs never overlap.
const runDay = (offset) => new Date(Date.UTC(2032, 0, 1) + ((Date.now() / 1000 | 0) % 3000 + offset) * 86_400_000).toISOString().slice(0, 10)

// Picks, through the API, a seeded faculty member with a published duty and no leave on that day.
async function pickLeaver(request) {
  const auth = { Authorization: `Bearer ${(await (await request.post(`${API}/auth/login`, { data: ADMIN })).json()).accessToken}` }
  const get = async (path) => (await request.get(`${API}${path}`, { headers: auth })).json()
  const { draftId } = await (await request.post(`${API}/rosters/generate`, { headers: auth })).json()
  await request.post(`${API}/rosters/${draftId}/publish`, { headers: auth })
  const [rows, staff, leave] = await Promise.all([get(`/rosters/${draftId}`), get('/staff'), get('/leave-requests')])
  const onLeave = (staffId, date) => leave.some((l) => l.staffId === staffId && l.status !== 'Rejected' && l.startDate <= date && date <= l.endDate)
  const row = rows.find((r) => !staff.find((s) => s.id === r.staffId).email.includes('-') && !onLeave(r.staffId, r.date))
  return { date: row.date, name: row.staffName, staffId: row.staffId, email: staff.find((s) => s.id === row.staffId).email, password: 'Faculty@123', auth }
}

let cleanup = null
test.afterEach(async () => {
  await cleanup?.()
  cleanup = null
})

async function requestLeave(page, start, end, reason) {
  await page.getByRole('link', { name: 'Leave' }).click()
  await page.getByLabel('Start date').fill(start)
  await page.getByLabel('End date').fill(end)
  await page.getByLabel('Reason (optional)').fill(reason)
  await page.getByRole('button', { name: 'Send request' }).click()
  return page.getByRole('row').filter({ hasText: reason })
}

test('inline validation guides the request form', async ({ page }) => {
  await login(page, ALI)
  await page.getByRole('link', { name: 'Leave' }).click()
  await page.getByLabel('Start date').fill('2020-01-01')
  await expect(page.getByText('Start date cannot be in the past.')).toBeVisible()
  await page.getByLabel('Start date').fill('2031-05-10')
  await page.getByLabel('End date').fill('2031-05-09')
  await expect(page.getByText('End date cannot be before the start date.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send request' })).toBeDisabled()
})

test('faculty can cancel a pending request', async ({ page }) => {
  await login(page, ALI)
  const reason = `Cancel me ${Date.now()}`
  const row = await requestLeave(page, runDay(0), runDay(1), reason)
  await expect(row).toContainText('Pending')
  page.once('dialog', (dialog) => dialog.accept())
  await row.getByRole('button', { name: 'Cancel' }).click()
  await expect(row).toHaveCount(0)
})

test('admin rejects with a note and faculty see it live', async ({ page, browser }) => {
  const reason = `Reject me ${Date.now()}`
  await login(page, ALI)
  const row = await requestLeave(page, runDay(5), runDay(5), reason)
  const admin = await (await browser.newContext()).newPage()
  await login(admin, ADMIN)
  await admin.getByRole('link', { name: /Leave requests/ }).click()
  await admin.getByTestId('leave-card').filter({ hasText: reason }).getByRole('button', { name: 'Reject' }).click()
  await admin.getByLabel('Note for the faculty member (optional)').fill('Exam week')
  await admin.getByRole('dialog').getByRole('button', { name: 'Reject' }).click()
  await expect(admin.getByText(/Leave rejected for/)).toBeVisible()
  await expect(page.locator('.toast')).toContainText('was rejected. Note: Exam week')
  await expect(row).toContainText('Rejected')
  await expect(row).toContainText('Exam week')
})

test('demo: request, live toast, approve, affected duties, replace, live duty change', async ({ page, browser, request }) => {
  test.setTimeout(90_000)
  const leaver = await pickLeaver(request)
  const reason = `Medical ${Date.now()}`
  // The approval marks the day unavailable; remove it afterwards so other tests keep the seeded data.
  cleanup = async () => {
    const days = await (await request.get(`${API}/unavailabilities?staffId=${leaver.staffId}`, { headers: leaver.auth })).json()
    for (const day of days.filter((d) => d.date === leaver.date && d.startTime === '00:00:00'))
      await request.delete(`${API}/unavailabilities/${day.id}`, { headers: leaver.auth })
  }
  const admin = await (await browser.newContext()).newPage()
  await login(admin, ADMIN)

  await test.step('faculty requests leave', async () => {
    await login(page, leaver)
    await expect(await requestLeave(page, leaver.date, leaver.date, reason)).toContainText('Pending')
  })

  await test.step('admin gets a live toast and the pending badge', async () => {
    await expect(admin.locator('.toast')).toContainText(`${leaver.name} requested leave for ${leaver.date}.`)
    await expect(admin.getByTestId('pending-badge')).toBeVisible()
  })

  await test.step('admin approves and sees the affected duties', async () => {
    await admin.getByRole('link', { name: /Leave requests/ }).click()
    await admin.getByTestId('leave-card').filter({ hasText: reason }).getByRole('button', { name: 'Approve' }).click()
    const dialog = admin.getByRole('dialog')
    await expect(dialog).toContainText('Duties affected by this leave')
    await expect(dialog).toContainText(leaver.date)
    await expect(page.locator('.toast')).toContainText('was approved')
    await dialog.getByRole('button', { name: 'Go to roster' }).click()
  })

  await test.step('roster opens filtered to the faculty member and the duty is replaced', async () => {
    await expect(admin).toHaveURL(/\/admin\/roster\?version=\d+&staffId=\d+/)
    const duty = admin.locator('.tab-pane.active tbody tr').filter({ hasText: leaver.date })
    await expect(duty.first()).toContainText(leaver.name)
    await duty.first().getByRole('button', { name: 'Replace' }).click()
    const options = await admin.getByLabel('New faculty member').locator('option').allTextContents()
    // Try faculty in order until the API accepts one; a rejected choice shows its 422 reason in the dialog.
    const created = admin.getByText(/version \d+ created/)
    const refused = admin.getByRole('dialog').locator('.alert-danger')
    for (const option of options.slice(1)) {
      await admin.getByLabel('New faculty member').selectOption({ label: option })
      await admin.getByRole('dialog').getByRole('button', { name: 'Replace' }).click()
      await expect(created.or(refused)).toBeVisible()
      if (await created.isVisible()) break
    }
    await expect(created).toBeVisible()
  })

  await test.step('faculty get the live duty change', async () => {
    await expect(page.locator('.toast').filter({ hasText: 'changed your duties' })).toBeVisible()
  })
})
