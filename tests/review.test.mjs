import test, { before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { accessibleReview } from '../ui-review/accessible-review.mjs'
let browser, page, context, errors
before(async()=>{browser=await chromium.launch({headless:true})})
after(async()=>{await browser?.close()})
beforeEach(async()=>{
 context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})
 page=await context.newPage();errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.setContent(accessibleReview(`<!doctype html><html data-theme="dark"><head><style>.slide{min-height:1800px}.lightbox{display:none}.lightbox.open{display:block;position:fixed;inset:0}.lightbox img{width:20px}</style></head><body><nav class="rail"></nav><span id="counter"></span><button id="prev">Previous</button><button id="next">Next</button><button id="theme">Theme</button><section class="slide" id="cover" data-title="Cover"><button class="zoom"><img alt="Fixture image" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></button></section><section class="slide" id="next" data-title="Next slide">Tall second slide</section><div class="lightbox" role="dialog" aria-label="Expanded fixture"><button>Close</button><img alt=""></div><script>const slides=[...document.querySelectorAll('.slide')];throw new Error('obsolete controller');</script></body></html>`))
})
afterEach(async()=>{assert.deepEqual(errors,[]);await context?.close()})
test('duplicate review IDs and malformed hashes remain safe',async()=>{
 assert.equal(await page.locator('#next').count(),1)
 assert.equal(await page.locator('section#next-2').count(),1)
 await page.evaluate(()=>{location.hash='%ZZ[bad';dispatchEvent(new HashChangeEvent('hashchange'))})
 assert.deepEqual(errors,[])
 await page.locator('.rail a').nth(1).click()
 await page.waitForFunction(()=>document.querySelector('#counter').textContent==='02 / 02')
})
test('tall slide remains current until the next heading crosses the tracking boundary',async()=>{
 await page.evaluate(()=>scrollTo(0,900));await page.waitForTimeout(50)
 assert.equal(await page.locator('#counter').innerText(),'01 / 02')
 await page.getByRole('button',{name:'Next',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('#counter').textContent==='02 / 02')
})
test('lightbox traps focus, blocks slide keys and restores the opener',async()=>{
 const open=page.locator('.zoom');await open.click()
 const popup=page.getByRole('dialog');await popup.waitFor()
 const before=await page.locator('#counter').innerText()
 await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#counter').innerText(),before)
 await page.keyboard.press('Tab');assert.equal(await popup.getByRole('button').evaluate(el=>el===document.activeElement),true)
 await page.keyboard.press('Escape');assert.equal(await popup.isVisible(),false)
 assert.equal(await open.evaluate(el=>el===document.activeElement),true)
})
test('reduced motion and blocked review storage preserve usable controls',async()=>{
 await page.evaluate(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}}))
 await page.getByRole('button',{name:'Theme',exact:true}).click()
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light')
 assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).scrollBehavior),'auto')
})
