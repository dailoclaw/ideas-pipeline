import assert from 'node:assert/strict'
import { build, preview } from 'vite'
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchTestBrowser } from '../tests/helpers/browser-runner.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
// Check the real production build without executing its connection module.
for (const file of await readdir(join(root, 'dist/assets'))) {
  if (!file.endsWith('.js')) continue
  const source = await readFile(join(root, 'dist/assets', file), 'utf8')
  assert.ok(!source.includes('__baseline'), `Fixture hook leaked into production: ${file}`)
}
const outDir = await mkdtemp(join(tmpdir(), 'ideas-release-fixture-'))
let server, browser, context
try {
  // Compile an isolated copy with the same Vite/React production pipeline.
  // Fixture config ignores .env.local and replaces every database connection.
  const configFile = join(root, 'tests/vite.config.mjs')
  await build({ configFile, build: { outDir, emptyOutDir: true, target: ['chrome120', 'edge120'] } })
  server = await preview({ configFile, build: { outDir }, preview: { host: '127.0.0.1', port: 0 } })
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await launchTestBrowser()
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Australia/Adelaide' })
  const external = [], errors = []
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue()
    external.push(route.request().url()); return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(origin)
  await page.locator('.layout-page').waitFor()
  for (const name of ['Strategy', 'Sprint', 'Groups', 'Summary', 'Layout']) {
    await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).getByRole('button', { name, exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Loading view…' }).waitFor({ state: 'detached' })
    assert.ok((await page.locator('main').innerText()).length > 0)
  }
  await page.getByRole('button', { name: 'New idea', exact: true }).click()
  await page.getByLabel('Name *', { exact: true }).fill('Release fixture capture')
  await page.getByLabel('Pitch *', { exact: true }).fill('Fictional release smoke data')
  await page.getByLabel('Name *', { exact: true }).press('Enter')
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.getByRole('button', { name: 'Open #101 Fixture intake', exact: true }).click()
  await page.getByPlaceholder('Add notes…').fill('Compiled draft survives immediate close')
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(() => window.__baseline.backend.tables.ideas.find(idea => idea.id === 101).notes), 'Compiled draft survives immediate close')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const stream = await (await download).createReadStream()
  const parts = []; for await (const part of stream) parts.push(part)
  const csv = Buffer.concat(parts).toString('utf8')
  assert.match(csv, /Release fixture capture/)
  assert.match(csv, /Compiled draft survives immediate close/)
  await page.setViewportSize({ width: 320, height: 1000 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.goto(origin + '/?signedOut')
  await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor()
  assert.equal(await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).count(), 0)
  assert.equal(await page.evaluate(() => window.__baseline.backend.requests.length), 0)
  assert.deepEqual(external, [])
  assert.deepEqual(errors, [])
  console.log('Compiled fixture smoke passed: five pages, lazy dialogs, keyboard capture/close, persisted notes/CSV, narrow doubled text and anonymous gating. Production fixture hook absent; no external requests.')
} finally {
  await context?.close(); await browser?.close()
  if (server) await new Promise(resolve => server.httpServer.close(resolve))
  await rm(outDir, { recursive: true, force: true })
}
