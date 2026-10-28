/**
 * Pincel sobre textura Canvas: proyecta el hit UV y pinta un círculo suave.
 */
export class Painting {
  constructor({ canvas, texture, getColor }) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.texture = texture
    this.getColor = getColor
    this.radius = 18
    this.lastUv = null
    this.active = false
  }

  begin() {
    this.active = true
    this.lastUv = null
  }

  end() {
    this.active = false
    this.lastUv = null
  }

  paintAtIntersection(intersection) {
    if (!this.active || !intersection?.uv) return

    const uv = intersection.uv
    const x = uv.x * this.canvas.width
    const y = (1 - uv.y) * this.canvas.height

    if (this.lastUv) {
      this.stroke(this.lastUv.x, this.lastUv.y, x, y)
    } else {
      this.dot(x, y)
    }

    this.lastUv = { x, y }
    this.texture.needsUpdate = true
  }

  stroke(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.max(1, Math.ceil(dist / (this.radius * 0.35)))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      this.dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
    }
  }

  dot(x, y) {
    const color = this.getColor()
    const g = this.ctx.createRadialGradient(x, y, 0, x, y, this.radius)
    g.addColorStop(0, color)
    g.addColorStop(0.55, color)
    g.addColorStop(1, hexToRgba(color, 0))
    this.ctx.fillStyle = g
    this.ctx.beginPath()
    this.ctx.arc(x, y, this.radius, 0, Math.PI * 2)
    this.ctx.fill()
  }
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function pickPaintable(intersects) {
  return intersects.find((hit) => hit.object?.userData?.paintable)
}
