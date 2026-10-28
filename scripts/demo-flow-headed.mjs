/**
 * Misma demo, pero en Chromium con ventana (DISPLAY) para screen recording.
 */
import { chromium } from 'playwright'

const browser = await chromium.launch({
  headless: false,
  args: ['--start-maximized', '--window-position=0,0'],
  viewport: null,
})
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)

const box = page.locator('#scene')
const bb = await box.boundingBox()
const cx = bb.x + bb.width / 2
const cy = bb.y + bb.height / 2

await page.waitForTimeout(800)

await page.mouse.move(cx, cy)
await page.mouse.down()
await page.mouse.move(cx, cy - 240, { steps: 30 })
await page.waitForTimeout(1400)

await page.mouse.move(cx, cy + 310, { steps: 35 })
await page.mouse.up()
await page.waitForTimeout(1800)

await page.mouse.move(cx + 280, cy)
await page.mouse.down()
await page.mouse.move(cx + 400, cy + 10, { steps: 18 })
await page.mouse.up()
await page.waitForTimeout(500)

await page.locator('.swatch[data-color="#D94A3D"]').click()
await page.waitForTimeout(250)
await page.mouse.move(cx - 10, cy + 10)
await page.mouse.down()
await page.mouse.move(cx + 50, cy + 60, { steps: 22 })
await page.mouse.move(cx - 25, cy + 75, { steps: 16 })
await page.mouse.up()
await page.waitForTimeout(400)

await page.locator('.swatch[data-color="#3D6EA8"]').click()
await page.waitForTimeout(250)
await page.mouse.move(cx - 5, cy - 110)
await page.mouse.down()
await page.mouse.move(cx + 40, cy - 65, { steps: 16 })
await page.mouse.up()
await page.waitForTimeout(2000)

await browser.close()
console.log('headed demo done')
