import * as THREE from 'three'
import { COLORS } from './colors.js'

/**
 * Humanoide low-poly geométrico: cuerpo blanco off-white + aristas charcoal.
 */
export function createCharacter() {
  const group = new THREE.Group()
  group.name = 'character'

  const paintCanvas = document.createElement('canvas')
  paintCanvas.width = 1024
  paintCanvas.height = 1024
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
  const edgeMat = new THREE.LineBasicMaterial({
    color: COLORS.charcoal,
  })

  const parts = []

  function addBox(w, h, d, y, name) {
    const geo = new THREE.BoxGeometry(w, h, d)
    const mesh = new THREE.Mesh(geo, bodyMat)
    mesh.position.y = y
    mesh.name = name
    mesh.userData.paintable = true

    // Aristas “bold”: dos pasadas de edges ligeramente escaladas
    const edges = new THREE.EdgesGeometry(geo, 15)
    const lines = new THREE.LineSegments(edges, edgeMat)
    lines.raycast = () => {}
    mesh.add(lines)

    const bold = new THREE.LineSegments(edges, edgeMat.clone())
    bold.scale.setScalar(1.012)
    bold.raycast = () => {}
    mesh.add(bold)

    group.add(mesh)
    parts.push(mesh)
    return mesh
  }

  // Proporciones tipo figura de juguete
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
    paintCanvas,
    paintTexture,
    bodyMat,
  }
}
