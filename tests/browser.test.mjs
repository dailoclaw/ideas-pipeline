import test, { before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { knownDefect } from './helpers/known-defect.mjs'

let server, browser, context, page, url, unexpectedRequests, runtimeErrors
before(async () => {
  server = await createServer({ configFile: fileURLToPath(new URL('./vite.config.mjs', import.meta.url)) })
  await server.listen()
  url = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true })
})
after(async () => { await browser?.close(); await server?.close() })
beforeEach(async () => {
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Australia/Adelaide' })
  unexpectedRequests = []; runtimeErrors = []
  await context.route('**/*', route => {
    const target = new URL(route.request().url())
    if (target.origin === url) return route.continue()
    unexpectedRequests.push(target.origin + target.pathname)
    return route.abort()
  })
  page = await context.newPage()
  page.on('pageerror', error => runtimeErrors.push(error.message))
})
afterEach(async () => {
  try { assert.deepEqual(unexpectedRequests, [], 'Test attempted a non-local request') }
  finally { await context?.close() }
})
const openApp = async () => {
  await page.goto(url)
  await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).waitFor()
}
const navigate = name => page.getByRole('navigation', { name: 'Primary navigation', exact: true }).getByRole('button', { name, exact: true }).click()

test('isolated fixture app renders every primary page without runtime errors', async () => {
  await openApp()
  for (const name of ['Strategy', 'Sprint', 'Groups', 'Summary', 'Layout']) {
    await navigate(name)
    assert.ok((await page.locator('main').innerText()).length > 0)
  }
  assert.deepEqual(runtimeErrors, [])
  assert.equal(await page.evaluate(() => window.__baseline.backend.tables.ideas.length), 5)
})

test('create form persists a new fictional record', async () => {
  await openApp()
  await page.getByRole('button', { name: 'New idea', exact: true }).click()
  await page.locator('.input').first().fill('Created baseline fixture')
  await page.locator('textarea').first().fill('A fictional baseline pitch')
  await page.getByRole('button', { name: 'Add idea', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(() => window.__baseline.backend.tables.ideas.filter(i => i.name === 'Created baseline fixture').length), 1)
  assert.deepEqual(runtimeErrors, [])
})

test('closing details immediately must persist pending notes', t => knownDefect(t, 'C3: modal cleanup cancels pending save', async () => {
  await openApp()
  await page.getByRole('button', { name: 'Open #101 Fixture intake', exact: true }).click()
  await page.getByPlaceholder('Add notes…').fill('Draft saved before close')
  await page.getByRole('button', { name: 'Close idea details' }).click()
  await page.waitForTimeout(1100)
  assert.equal(await page.evaluate(() => window.__baseline.backend.tables.ideas.find(i => i.id === 101).notes), 'Draft saved before close')
}))

test('workspace assignment must immediately refresh scoped summary', t => knownDefect(t, 'C7: memo ignores groupAssignments changes', async () => {
  await openApp(); await navigate('Summary')
  await page.getByRole('combobox', { name: 'Filter ideas by workspace' }).selectOption('__none__')
  await page.evaluate(() => window.__baseline.store.getState().setGroupAssignment(101, 'intel'))
  await page.waitForTimeout(100)
  assert.equal(await page.locator('.pulse-hero__metrics > div').first().locator('strong').innerText(), '4')
}))

test('workspace comparison must immediately reflect new membership', t => knownDefect(t, 'C7: workspace metrics memo ignores groupAssignments changes', async () => {
  await openApp(); await navigate('Summary')
  await page.getByRole('tab', { name: 'Workspaces', exact: true }).click()
  await page.evaluate(() => window.__baseline.store.getState().setGroupAssignment(101, 'intel'))
  await page.waitForTimeout(100)
  const card = page.locator('.workspace-pulse-card').filter({ hasText: 'HR Intelligence' })
  assert.equal(await card.getByRole('button').count(), 1)
}))

test('storage denial must retain a usable application shell', t => knownDefect(t, 'C6: preferences throw during startup', async () => {
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Fixture denied storage', 'SecurityError') }
  })
  await page.goto(url); await page.waitForTimeout(500)
  assert.ok((await page.locator('body').innerText()).trim().length > 0, 'Storage denial left a blank page')
}))

test('action button must finish and become reusable under StrictMode', async () => {
  await openApp(); await navigate('Strategy')
  const button = page.locator('.strategy-banner .au-ledge')
  await button.click(); await page.waitForTimeout(1700)
  assert.equal(await button.getAttribute('data-ledge'), 'idle')
})

const openLogin = async () => {
  await page.goto(`${url}/?signedOut`)
  await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor()
}
const login = async (password = 'fixture-password') => {
  await page.getByLabel('Email', { exact: true }).fill('owner@example.test')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Password', { exact: true }).press('Enter')
}
test('anonymous login screen makes no protected table requests and fits mobile', async () => {
  await page.setViewportSize({ width: 320, height: 740 }); await openLogin()
  assert.equal(await page.evaluate(() => window.__baseline.backend.requests.length), 0)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  assert.deepEqual(runtimeErrors, [])
})
test('wrong password shows a recoverable error without reading protected data', async () => {
  await openLogin(); await login('incorrect-password')
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), '')
  assert.equal(await page.evaluate(() => window.__baseline.backend.requests.length), 0)
  await login(); await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).waitFor()
  assert.deepEqual(runtimeErrors, [])
})
test('unlisted account stays gated and can sign out for another account', async () => {
  await openLogin(); await page.evaluate(() => { window.__baseline.backend.authAllowed = false }); await login()
  await page.getByRole('heading', { name: 'Access unavailable' }).waitFor()
  assert.equal(await page.evaluate(() => window.__baseline.backend.requests.length), 0)
  await page.getByRole('button', { name: 'Use another account' }).click()
  await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor()
})
test('missing membership RPC fails closed then recovers via Retry', async () => {
  await openLogin(); await page.evaluate(() => { window.__baseline.backend.authError = true }); await login()
  await page.getByRole('heading', { name: 'Access unavailable' }).waitFor()
  assert.equal(await page.evaluate(() => window.__baseline.backend.requests.length), 0)
  await page.evaluate(() => { window.__baseline.backend.authError = false })
  await page.getByRole('button', { name: 'Retry access check' }).click()
  await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).waitFor()
  assert.deepEqual(runtimeErrors, [])
})
test('session loss clears loaded data through a new signed-out realm', async () => {
  await openLogin(); await login(); await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).waitFor()
  await page.evaluate(() => window.__baseline.backend.emitAuth('SIGNED_OUT', null))
  await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.__baseline.store.getState().ideas.length), 0)
  assert.equal(await page.evaluate(() => window.__baseline.backend.requests.length), 0)
})
test('settings Sign out returns to login and clears the loaded store', async () => {
  await openLogin(); await login(); await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Customise appearance' }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.__baseline.store.getState().ideas.length), 0)
  assert.deepEqual(runtimeErrors, [])
})

const openIntake = async () => { await openApp(); await page.getByRole('button', { name: 'Open #101 Fixture intake', exact: true }).click() }
test('denied priority stays unchanged and offers a working retry inside the dialog', async () => {
  await openIntake(); await page.evaluate(() => window.__baseline.backend.deny('ideas', 'update'))
  await page.getByRole('button', { name: 'Set as priority', exact: true }).click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Set as priority', exact: true }).count(), 1)
  assert.equal(await page.evaluate(() => window.__baseline.backend.tables.idea_activity.length), 0)
  await page.evaluate(() => { window.__baseline.backend.denied = [] })
  await page.getByRole('button', { name: 'Retry save', exact: true }).click()
  await page.getByRole('button', { name: 'Priority — floats to top', exact: true }).waitFor()
  assert.deepEqual(runtimeErrors, [])
})
test('zero-row notes save retains the draft, never says Saved, and retries current text', async () => {
  await openIntake(); await page.evaluate(() => window.__baseline.backend.fault('ideas', 'update', 'zero'))
  await page.getByPlaceholder('Add notes…').fill('Recover this draft')
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByText('Saved', { exact: true }).count(), 0)
  assert.equal(await page.getByPlaceholder('Add notes…').inputValue(), 'Recover this draft')
  await page.evaluate(() => { window.__baseline.backend.faults = [] })
  await page.getByRole('button', { name: 'Retry save', exact: true }).click()
  await page.getByText('Saved', { exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.__baseline.backend.tables.ideas[0].notes), 'Recover this draft')
  assert.deepEqual(runtimeErrors, [])
})
test('denied status and group selection revert to persisted values without runtime errors', async () => {
  await openIntake(); await page.evaluate(() => { window.__baseline.backend.deny('status_overrides', 'upsert'); window.__baseline.backend.deny('idea_group_assignments', 'upsert') })
  await page.getByRole('combobox', { name: 'Idea status', exact: true }).selectOption('building')
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByRole('combobox', { name: 'Idea status', exact: true }).inputValue(), 'idea')
  await page.getByRole('combobox', { name: 'Idea group', exact: true }).selectOption('intel')
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByRole('combobox', { name: 'Idea group', exact: true }).inputValue(), '')
  assert.deepEqual(runtimeErrors, [])
})
test('failed delete preserves the dialog, idea, and existing history', async () => {
  await openApp(); await page.evaluate(() => { window.__baseline.backend.deny('ideas', 'delete'); window.__baseline.backend.tables.status_history.push({ id: 1, idea_id: 103, status: 'ready' }) })
  await page.getByRole('button', { name: 'Open #103 Fixture user idea', exact: true }).click()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Delete idea', exact: true }).click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByRole('dialog').count(), 1)
  assert.equal(await page.evaluate(() => window.__baseline.backend.tables.status_history.length), 1)
  await page.evaluate(() => { window.__baseline.backend.denied = []; window.__baseline.backend.deny('ideas', 'select') })
  await page.getByRole('button', { name: 'Retry save', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.locator('.save-feedback--warning').waitFor()
  assert.deepEqual(runtimeErrors, [])
})
test('failed strategy action shows an error and never displays Done', async () => {
  await openApp(); await navigate('Strategy')
  await page.evaluate(() => { window.__baseline.backend.deny('ideas', 'update'); window.__baseline.backend.deny('status_overrides', 'upsert') })
  await page.locator('.strategy-banner .au-ledge').click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.locator('.strategy-banner .au-ledge').getAttribute('data-ledge'), 'idle')
  assert.equal(await page.evaluate(() => window.__baseline.backend.tables.status_history.length), 0)
  assert.deepEqual(runtimeErrors, [])
})
test('failed triage releases busy state so the same idea can be retried', async () => {
  await openApp(); await page.evaluate(() => window.__baseline.backend.deny('status_overrides', 'upsert'))
  await page.getByRole('button', { name: /Triage/ }).first().click()
  await page.getByRole('button', { name: 'Start Building', exact: true }).click()
  await page.getByRole('alert').waitFor()
  await page.evaluate(() => { window.__baseline.backend.denied = [] })
  await page.getByRole('button', { name: 'Start Building', exact: true }).click()
  await page.getByText('All triaged!', { exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.__baseline.backend.tables.status_overrides[0].status), 'building')
  assert.deepEqual(runtimeErrors, [])
})
test('create with failed refresh closes the form, keeps the shell, and warns without creating twice', async () => {
  await openApp(); await page.evaluate(() => window.__baseline.backend.deny('ideas', 'select'))
  await page.getByRole('button', { name: 'New idea', exact: true }).click()
  await page.locator('.input').first().fill('Confirmed create')
  await page.locator('textarea').first().fill('Fixture pitch')
  await page.getByRole('button', { name: 'Add idea', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.locator('.save-feedback--warning').waitFor()
  assert.equal(await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).count(), 1)
  await page.evaluate(() => { window.__baseline.backend.denied = [] })
  await page.getByRole('button', { name: 'Refresh dataset', exact: true }).click()
  assert.equal(await page.evaluate(() => window.__baseline.backend.tables.ideas.filter(i => i.name === 'Confirmed create').length), 1)
  assert.deepEqual(runtimeErrors, [])
})

test('retrying a denied create uses the visible form and closes after confirmation', async () => {
  await openApp(); await page.evaluate(() => window.__baseline.backend.deny('ideas', 'insert'))
  await page.getByRole('button', { name: 'New idea', exact: true }).click()
  await page.locator('.input').first().fill('Retry this create')
  await page.locator('textarea').first().fill('Fixture pitch')
  await page.getByRole('button', { name: 'Add idea', exact: true }).click()
  await page.getByRole('alert').waitFor()
  await page.locator('.input').first().fill('Latest create draft')
  await page.evaluate(() => { window.__baseline.backend.denied = [] })
  await page.getByRole('button', { name: 'Retry save', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(() => window.__baseline.backend.tables.ideas.filter(i => i.name === 'Latest create draft').length), 1)
  assert.deepEqual(runtimeErrors, [])
})
