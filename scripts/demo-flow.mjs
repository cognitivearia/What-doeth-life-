/**
 * Demo automatizada del flujo completo (para grabación / verificación).
 * Uso: node scripts/demo-flow.mjs
 */
import { chromium } from 'playwright'

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message))

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)

const box = page.locator('#scene')
const bb = await box.boundingBox()
const cx = bb.x + bb.width / 2
const cy = bb.y + bb.height / 2

await page.screenshot({ path: '/opt/cursor/artifacts/demo_01_initial.png' })

// Lift coin
await page.mouse.move(cx, cy)
await page.mouse.down()
await page.mouse.move(cx, cy - 240, { steps: 25 })
await page.waitForTimeout(900)
await page.screenshot({ path: '/opt/cursor/artifacts/demo_02_slot.png' })

// Drop into slot
await page.mouse.move(cx, cy + 310, { steps: 30 })
await page.mouse.up()
await page.waitForTimeout(1600)
await page.screenshot({ path: '/opt/cursor/artifacts/demo_03_character.png' })

// Rotate
await page.mouse.move(cx + 280, cy)
await page.mouse.down()
await page.mouse.move(cx + 380, cy + 20, { steps: 15 })
await page.mouse.up()
await page.waitForTimeout(300)

// Red paint on torso
await page.locator('.swatch[data-color="#D94A3D"]').click()
await page.waitForTimeout(150)
await page.mouse.move(cx - 10, cy + 10)
await page.mouse.down()
await page.mouse.move(cx + 45, cy + 55, { steps: 18 })
await page.mouse.move(cx - 20, cy + 70, { steps: 14 })
await page.mouse.up()
await page.waitForTimeout(200)

// Blue paint on head
await page.locator('.swatch[data-color="#3D6EA8"]').click()
await page.waitForTimeout(150)
await page.mouse.move(cx - 5, cy - 110)
await page.mouse.down()
await page.mouse.move(cx + 35, cy - 70, { steps: 14 })
await page.mouse.up()
await page.waitForTimeout(400)

await page.screenshot({ path: '/opt/cursor/artifacts/demo_04_painted.png' })

const verify = await page.evaluate(() => {
  const exp = window.__experience
  // experience may not expose; check canvases via DOM? re-expose briefly
  return {
    active: document.querySelector('.swatch.active')?.getAttribute('data-color'),
  }
})
console.log('verify', verify)
console.log('artifacts written to /opt/cursor/artifacts/demo_0*.png')
await browser.close()
