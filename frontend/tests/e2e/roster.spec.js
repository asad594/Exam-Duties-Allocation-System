import { expect, test } from '@playwright/test'
import { ADMIN, login } from './helpers'

const FATIMA = { email: 'fatima@edas.test', password: 'Faculty@123' }

test('full roster workflow with live notification', async ({ page, browser }) => {
  test.setTimeout(90_000)
  const rows = page.locator('.tab-pane.active tbody tr')
  const dutyRow = (...texts) => texts.reduce((loc, t) => loc.filter({ hasText: t }), rows)
  const alert = page.locator('.alert')

  await test.step('generate a draft', async () => {
    await login(page, ADMIN)
    await page.getByRole('link', { name: 'Roster' }).click()
    await page.getByRole('button', { name: 'Generate draft' }).click()
    await expect(alert).toContainText(/27 duties assigned, 1 vacancy /)
    await expect(rows).toHaveCount(27)
  })

  await test.step('filter by faculty, date and room', async () => {
    await page.getByLabel('Faculty member').selectOption({ label: 'Ali Raza' })
    await expect(rows).toHaveCount(3)
    await page.getByLabel('Faculty member').selectOption({ label: 'All faculty' })
    await page.getByLabel('Date').fill('2030-03-04')
    await expect(rows).toHaveCount(8)
    await page.getByLabel('Date').fill('')
    await page.getByLabel('Room').selectOption({ label: 'Main Hall' })
    await expect(rows).toHaveCount(8)
    await page.getByLabel('Room').selectOption({ label: 'All rooms' })
    await expect(rows).toHaveCount(27)
  })

  await test.step('workload and vacancies', async () => {
    await page.getByRole('tab', { name: 'Workload' }).click()
    await expect(dutyRow('Hina Malik')).toContainText(/1\s*3/)
    await page.getByRole('tab', { name: 'Vacancies' }).click()
    await expect(dutyRow('PH101', 'Main Hall')).toContainText('4')
  })

  await test.step('a clashing replacement shows the rule', async () => {
    await page.getByRole('tab', { name: 'Roster' }).click()
    await dutyRow('CS102', 'Ali Raza').getByRole('button', { name: 'Replace' }).click()
    await page.getByLabel('New faculty member').selectOption({ label: 'Fatima Noor' })
    await page.getByRole('dialog').getByRole('button', { name: 'Replace' }).click()
    await expect(page.getByRole('dialog')).toContainText('already has an overlapping duty')
    await page.getByRole('button', { name: 'Cancel' }).click()
  })

  await test.step('a valid replacement changes the draft and is audited', async () => {
    await dutyRow('EN102', 'Fatima Noor').getByRole('button', { name: 'Replace' }).click()
    await page.getByLabel('New faculty member').selectOption({ label: 'Hamza Iqbal' })
    await page.getByRole('dialog').getByRole('button', { name: 'Replace' }).click()
    await expect(alert).toContainText('Invigilator replaced in the draft.')
    await expect(dutyRow('EN102', 'Hamza Iqbal')).toBeVisible()
    await page.getByRole('tab', { name: 'Audit trail' }).click()
    await expect(dutyRow('Replace', 'Fatima Noor', 'Hamza Iqbal')).toBeVisible()
  })

  await test.step('export CSV', async () => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()])
    expect(download.suggestedFilename()).toMatch(/^roster-v\d+\.csv$/)
  })

  await test.step('publish with a vacancy warning', async () => {
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(alert).toContainText(/Published as version \d+\. Warning: 1 slot/)
    await expect(page.getByRole('button', { name: 'Publish' })).toHaveCount(0)
  })

  const faculty = await (await browser.newContext()).newPage()
  await test.step('faculty see only their published duties', async () => {
    await login(faculty, FATIMA)
    await expect(faculty.locator('tbody tr')).toHaveCount(2)
  })

  await test.step('changing the published roster creates a new version and notifies faculty live', async () => {
    await page.getByRole('tab', { name: 'Roster' }).click()
    await dutyRow('EN102', 'Hamza Iqbal').getByRole('button', { name: 'Replace' }).click()
    await page.getByLabel('New faculty member').selectOption({ label: 'Fatima Noor' })
    await page.getByRole('dialog').getByRole('button', { name: 'Replace' }).click()
    await expect(alert).toContainText(/version \d+ created/)
    await expect(faculty.locator('.alert-info')).toContainText('changed your duties')
    await expect(faculty.locator('tbody tr')).toHaveCount(3)
  })

  await test.step('older published versions are read only', async () => {
    const versions = page.getByLabel('Version')
    await versions.selectOption({ index: (await versions.locator('option').count()) - 2 })
    await expect(page.getByText('older published version - read only')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Replace' })).toHaveCount(0)
  })
})
