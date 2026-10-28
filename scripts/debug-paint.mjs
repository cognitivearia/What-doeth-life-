import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('console', (msg) => console.log('BROWSER:', msg.type(), msg.text()))
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message))

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)

// Forzar fase paint y color rojo vía API interna
const result = await page.evaluate(async () => {
  // Acceder a la instancia: la colgamos en window desde main si hace falta
  const canvas = document.getElementById('scene')
  // Buscar experience en el módulo no es fácil; inyectamos paint directo en un mesh
  // Crear canvas de prueba local
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#F5F2EB'
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = '#A4161A'
  ctx.beginPath()
  ctx.arc(32, 32, 20, 0, Math.PI * 2)
  ctx.fill()
  const img = ctx.getImageData(32, 32, 1, 1).data
  return { r: img[0], g: img[1], b: img[2] }
})
console.log('direct canvas stamp:', result)

// Exponer experience
await page.addScriptTag({
  content: `
    // noop
  `,
})

// Simular flujo: lift coin
const box = page.locator('#scene')
const bb = await box.boundingBox()
const cx = bb.x + bb.width / 2
const cy = bb.y + bb.height / 2

await page.mouse.move(cx, cy)
await page.mouse.down()
await page.mouse.move(cx, cy - 220, { steps: 20 })
await page.waitForTimeout(800)
await page.screenshot({ path: '/tmp/pw-slot.png' })
// drag to slot
await page.mouse.move(cx, cy + 280, { steps: 25 })
await page.mouse.up()
await page.waitForTimeout(1500)
await page.screenshot({ path: '/tmp/pw-char.png' })

// click red swatch
const red = page.locator('.swatch[data-color="#A4161A"]')
await red.click()
await page.waitForTimeout(200)

const colorState = await page.evaluate(() => {
  const active = document.querySelector('.swatch.active')
  return {
    activeColor: active?.getAttribute('data-color'),
    brush: window.__brush || null,
  }
})
console.log('palette state:', colorState)

// paint on center (character torso)
await page.mouse.move(cx, cy - 20)
await page.mouse.down()
await page.mouse.move(cx + 40, cy + 40, { steps: 15 })
await page.mouse.up()
await page.waitForTimeout(300)
await page.screenshot({ path: '/tmp/pw-painted.png' })

const paintSample = await page.evaluate(() => {
  // sample all part canvases for non-offwhite pixels
  const parts = []
  // traverse three scene via renderer? not exposed
  return document.querySelector('.swatch.active')?.getAttribute('data-color')
})
console.log('active after paint:', paintSample)

await browser.close()
console.log('done')
