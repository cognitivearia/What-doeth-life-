import * as THREE from 'three'
import { COLORS } from './colors.js'

/**
 * Humanoide low-poly geométrico: cuerpo off-white + aristas charcoal bold.
 * Cada pieza tiene su propia textura canvas para pintar de forma local.
 */
export function createCharacter() {
  const group = new THREE.Group()
  group.name = 'character'

  const edgeMat = new THREE.LineBasicMaterial({
    color: COLORS.charcoal,
  })

  const parts = []

  function makePaintSurface() {
    const paintCanvas = document.createElement('canvas')
    paintCanvas.width = 512
    paintCanvas.height = 512
    const ctx = paintCanvas.getContext('2d')
    ctx.fillStyle = '#F5F2EB'
    ctx.fillRect(0, 0, paintCanvas.width, paintCanvas.height)

    const paintTexture = new THREE.CanvasTexture(paintCanvas)
    paintTexture.colorSpace = THREE.SRGBColorSpace
    paintTexture.anisotropy = 8

    const bodyMat = new THREE.MeshBasicMaterial({
      map: paintTexture,
      side: THREE.DoubleSide,
    })

    return { paintCanvas, paintTexture, bodyMat }
  }

  function addBox(w, h, d, y, name) {
    const { paintCanvas, paintTexture, bodyMat } = makePaintSurface()
    const geo = new THREE.BoxGeometry(w, h, d)
    const mesh = new THREE.Mesh(geo, bodyMat)
    mesh.position.y = y
    mesh.name = name
    mesh.userData.paintable = true
    mesh.userData.paintCanvas = paintCanvas
    mesh.userData.paintTexture = paintTexture

    const edges = new THREE.EdgesGeometry(geo, 15)
    const lines = new THREE.LineSegments(edges, edgeMat)
    lines.raycast = () => {}
    mesh.add(lines)

    const bold = new THREE.LineSegments(edges, edgeMat.clone())
    bold.scale.setScalar(1.014)
    bold.raycast = () => {}
    mesh.add(bold)

    group.add(mesh)
    parts.push(mesh)
    return mesh
  }

  addBox(0.42, 0.42, 0.42, 1.55, 'head')
  addBox(0.55, 0.72, 0.32, 0.95, 'torso')
  addBox(0.18, 0.55, 0.18, 0.88, 'armL').position.x = -0.4
  addBox(0.18, 0.55, 0.18, 0.88, 'armR').position.x = 0.4
  addBox(0.22, 0.62, 0.22, 0.28, 'legL').position.x = -0.16
  addBox(0.22, 0.62, 0.22, 0.28, 'legR').position.x = 0.16

  group.position.set(0, -0.95, 0)
  group.visible = false

  return {
    group,
    parts,
  }
}
