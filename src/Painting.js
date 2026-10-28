/**
 * Pincel: pinta la textura canvas de la pieza bajo el cursor.
 * `brush` es un objeto mutable `{ color: '#RRGGBB' }` compartido con la paleta.
 */
export class Painting {
  constructor(brush) {
    this.brush = brush
    this.radius = 40
    this.lastUv = null
    this.active = false
    this.currentMesh = null
  }

  begin() {
    this.active = true
    this.lastUv = null
    this.currentMesh = null
  }

  end() {
    this.active = false
    this.lastUv = null
    this.currentMesh = null
  }

  paintAtIntersection(intersection) {
    if (!this.active || !intersection?.uv) return

    const mesh = intersection.object
    const canvas = mesh.userData?.paintCanvas
    const texture = mesh.userData?.paintTexture
    if (!canvas || !texture) return

    if (this.currentMesh !== mesh) {
      this.currentMesh = mesh
      this.lastUv = null
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const uv = intersection.uv
    const x = uv.x * canvas.width
    const y = (1 - uv.y) * canvas.height
    const color = this.brush.color || '#2C2C2C'

    if (this.lastUv) {
      this._stroke(ctx, color, this.lastUv.x, this.lastUv.y, x, y)
    } else {
      this._stamp(ctx, color, x, y)
    }

    this.lastUv = { x, y }
    texture.needsUpdate = true
  }

  _stroke(ctx, color, x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.max(1, Math.ceil(dist / 6))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      this._stamp(ctx, color, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
    }
  }

  _stamp(ctx, color, x, y) {
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, this.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function pickPaintable(intersects) {
  for (const hit of intersects) {
    if (hit.object?.userData?.paintable && hit.uv) return hit
  }
  return undefined
}
