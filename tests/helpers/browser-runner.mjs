import { chromium } from 'playwright'

// An explicit channel must never silently fall back to bundled Chromium.
export async function launchTestBrowser() {
  const channel = process.env.TEST_BROWSER_CHANNEL
  if (channel && !['chrome', 'msedge'].includes(channel)) throw new Error('TEST_BROWSER_CHANNEL must be chrome or msedge, or unset for bundled Chromium.')
  const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) })
  console.log(`Browser under test: ${channel || 'bundled-chromium'} ${browser.version()}`)
  return browser
}
