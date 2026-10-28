import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { COLORS, CSS } from './colors.js'
import { createCharacter } from './createCharacter.js'
import { Painting, pickPaintable } from './Painting.js'

const PHASE = {
  COIN: 'coin',
  INSERTING: 'inserting',
  PAINT: 'paint',
}

export class Experience {
  constructor(canvas) {
    this.canvas = canvas
    this.hintEl = document.getElementById('hint')
    this.paletteEl = document.getElementById('palette')
    this.phase = PHASE.COIN
    this.paintColor = CSS.charcoal
    this.pointer = new THREE.Vector2()
    this.raycaster = new THREE.Raycaster()
    this.clock = new THREE.Clock()
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    this.dragPoint = new THREE.Vector3()
    this.isDraggingCoin = false
    this.isRotating = false
    this.slotRevealed = false
    this.lastPointer = { x: 0, y: 0 }

    this._initThree()
    this._initPhysics()
    this._createCoin()
    this._createSlot()
    this._createCharacter()
    this._bindEvents()
    this._setHint('Arrastra la línea para levantarla')
    this._animate()
  }

  _initThree() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(COLORS.offWhite, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(COLORS.offWhite)

    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    )
    this.camera.position.set(0, 0.1, 4.4)
    this.camera.lookAt(0, 0.05, 0)
  }

  _initPhysics() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -6.5, 0),
    })
    this.world.broadphase = new CANNON.NaiveBroadphase()
    this.world.allowSleep = true

    const ground = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    })
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    ground.position.set(0, -0.95, 0)
    this.world.addBody(ground)
  }

  _createCoin() {
    const radius = 0.62
    const thickness = 0.034
    const segments = 48

    const geo = new THREE.CylinderGeometry(radius, radius, thickness, segments)
    geo.rotateZ(Math.PI / 2)

    const mat = new THREE.MeshBasicMaterial({ color: COLORS.charcoal })
    this.coinMesh = new THREE.Mesh(geo, mat)
    this.coinMesh.name = 'coin'
    this.scene.add(this.coinMesh)

    const edgeGeo = new THREE.EdgesGeometry(geo, 30)
    this.coinMesh.add(
      new THREE.LineSegments(
        edgeGeo,
        new THREE.LineBasicMaterial({ color: COLORS.charcoal }),
      ),
    )

    const shape = new CANNON.Cylinder(radius, radius, thickness, segments)
    const quat = new CANNON.Quaternion()
    quat.setFromEuler(0, 0, Math.PI / 2)

    this.coinBody = new CANNON.Body({
      mass: 0.8,
      shape,
      linearDamping: 0.45,
      angularDamping: 0.6,
      material: new CANNON.Material({ friction: 0.55, restitution: 0.05 }),
    })
    this.coinBody.quaternion.copy(quat)
    this.coinBody.position.set(0, 0.15, 0)
    this.coinBody.type = CANNON.Body.KINEMATIC
    this.world.addBody(this.coinBody)
    this.coinTouched = false
  }

  _createSlot() {
    this.slotGroup = new THREE.Group()
    this.slotGroup.visible = false
    this.slotGroup.position.set(0, -0.92, 0)

    const block = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.32, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xe6e0d4 }),
    )
    const blockEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 0.32, 0.6)),
      new THREE.LineBasicMaterial({ color: COLORS.charcoal }),
    )
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.24, 0.64),
      new THREE.MeshBasicMaterial({ color: COLORS.slot }),
    )
    const mouthRim = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.18, 0.26, 0.66)),
      new THREE.LineBasicMaterial({ color: COLORS.charcoal }),
    )

    this.slotGroup.add(block, blockEdge, mouth, mouthRim)
    this.scene.add(this.slotGroup)
    this.slotTarget = new THREE.Vector3(0, -0.75, 0)
  }

  _createCharacter() {
    const character = createCharacter()
    this.character = character
    this.characterRoot = new THREE.Group()
    this.characterRoot.add(character.group)
    this.characterRoot.visible = false
    this.scene.add(this.characterRoot)

    // Objeto mutable: la paleta escribe aquí y el pincel lee el mismo ref
    this.brush = { color: CSS.charcoal }
    this.painting = new Painting(this.brush)
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._onResize())

    this.canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e))
    this.canvas.addEventListener('pointermove', (e) => this._onPointerMove(e))
    this.canvas.addEventListener('pointerup', (e) => this._onPointerUp(e))
    this.canvas.addEventListener('pointerleave', (e) => this._onPointerUp(e))
    this.canvas.addEventListener('pointercancel', (e) => this._onPointerUp(e))

    this.paletteEl?.querySelectorAll('.swatch').forEach((btn) => {
      const select = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const color = btn.getAttribute('data-color') || CSS.charcoal
        this.brush.color = color
        this.paintColor = color
        this.paletteEl.querySelectorAll('.swatch').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      }
      btn.addEventListener('pointerdown', select)
      btn.addEventListener('click', select)
    })
  }

  _setPointer(event) {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  _onPointerDown(event) {
    this._setPointer(event)
    this.lastPointer.x = event.clientX
    this.lastPointer.y = event.clientY
    this.canvas.setPointerCapture?.(event.pointerId)

    if (this.phase === PHASE.COIN) {
      this.raycaster.setFromCamera(this.pointer, this.camera)
      const hits = this.raycaster.intersectObject(this.coinMesh, true)
      const nearCenter =
        Math.abs(this.pointer.x) < 0.18 && Math.abs(this.pointer.y) < 0.5
      if (hits.length || nearCenter) {
        this.isDraggingCoin = true
        this.coinTouched = true
        this.canvas.classList.add('is-dragging')
        this.coinBody.wakeUp()
        this.coinBody.velocity.set(0, 0, 0)
        this.coinBody.angularVelocity.set(0, 0, 0)
        this.coinBody.type = CANNON.Body.KINEMATIC
        this._setHint(
          this.slotRevealed
            ? 'Llévala a la ranura y suéltala'
            : 'Levántala para revelar la ranura',
        )
      }
      return
    }

    if (this.phase === PHASE.PAINT) {
      this.raycaster.setFromCamera(this.pointer, this.camera)
      const hits = this.raycaster.intersectObjects(this.character.parts, false)
      const paintHit = pickPaintable(hits)

      if (paintHit) {
        this.painting.begin()
        this.painting.paintAtIntersection(paintHit)
        this.canvas.classList.add('is-painting')
      } else {
        this.isRotating = true
        this.canvas.classList.add('is-dragging')
      }
    }
  }

  _onPointerMove(event) {
    this._setPointer(event)

    if (this.phase === PHASE.COIN && this.isDraggingCoin) {
      this.raycaster.setFromCamera(this.pointer, this.camera)
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragPoint)) {
        const x = THREE.MathUtils.clamp(this.dragPoint.x, -1.6, 1.6)
        const y = THREE.MathUtils.clamp(this.dragPoint.y, -0.85, 1.7)
        this.coinBody.position.set(x, y, 0)

        const spin = (x - (this._lastDragX ?? x)) * 8
        this._lastDragX = x
        const lift = THREE.MathUtils.clamp((y + 0.2) / 1.4, 0, 1)
        const q = new CANNON.Quaternion()
        q.setFromEuler(lift * 1.15, spin, Math.PI / 2 + x * 0.25)
        this.coinBody.quaternion.copy(q)

        if (y > 0.35) this._revealSlot()

        // Feedback al pasar sobre la ranura
        if (this.slotRevealed && this._isOverSlot()) {
          this._setHint('Suéltala para insertar')
        }
      }
      return
    }

    if (this.phase === PHASE.PAINT) {
      if (this.painting.active) {
        this.raycaster.setFromCamera(this.pointer, this.camera)
        const hits = this.raycaster.intersectObjects(this.character.parts, false)
        const paintHit = pickPaintable(hits)
        if (paintHit) this.painting.paintAtIntersection(paintHit)
        return
      }

      if (this.isRotating) {
        const dx = event.clientX - this.lastPointer.x
        const dy = event.clientY - this.lastPointer.y
        this.characterRoot.rotation.y += dx * 0.01
        this.characterRoot.rotation.x += dy * 0.008
        this.characterRoot.rotation.x = THREE.MathUtils.clamp(
          this.characterRoot.rotation.x,
          -0.55,
          0.55,
        )
      }
    }

    this.lastPointer.x = event.clientX
    this.lastPointer.y = event.clientY
  }

  _onPointerUp(event) {
    this.canvas.releasePointerCapture?.(event.pointerId)

    if (this.phase === PHASE.COIN && this.isDraggingCoin) {
      this.isDraggingCoin = false
      this.canvas.classList.remove('is-dragging')

      // Inserción solo si se suelta deliberadamente sobre la ranura
      if (this.slotRevealed && this._isOverSlot()) {
        this._startInsert()
        return
      }

      // Si no: queda en el aire un momento y cae con física suave
      this.coinBody.type = CANNON.Body.DYNAMIC
      this.coinBody.wakeUp()
      this.coinBody.velocity.set(
        (Math.random() - 0.5) * 0.25,
        0.05,
        (Math.random() - 0.5) * 0.08,
      )
      this.coinBody.angularVelocity.set(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 1.2,
      )
      if (this.slotRevealed) {
        this._setHint('Vuelve a agarrarla y suéltala en la ranura')
      }
      return
    }

    if (this.phase === PHASE.PAINT) {
      this.painting.end()
      this.isRotating = false
      this.canvas.classList.remove('is-painting', 'is-dragging')
    }
  }

  _isOverSlot() {
    const pos = this.coinBody.position
    return (
      Math.abs(pos.x - this.slotTarget.x) < 0.45 &&
      pos.y < -0.35 &&
      pos.y > -1.15 &&
      Math.abs(pos.z) < 0.5
    )
  }

  _revealSlot() {
    if (this.slotRevealed) return
    this.slotRevealed = true
    this.slotGroup.visible = true
    this.slotGroup.scale.setScalar(1)
    this._setHint('Llévala a la ranura de abajo y suéltala')
  }

  _startInsert() {
    this.phase = PHASE.INSERTING
    this.coinBody.type = CANNON.Body.KINEMATIC
    this.coinBody.velocity.set(0, 0, 0)
    this.coinBody.angularVelocity.set(0, 0, 0)
    this._insertT = 0
    this._insertFrom = this.coinBody.position.clone()
    this._setHint('')
  }

  _updateInsert(dt) {
    this._insertT += dt
    const t = Math.min(1, this._insertT / 0.9)
    const ease = 1 - Math.pow(1 - t, 3)

    const from = this._insertFrom
    this.coinBody.position.set(
      THREE.MathUtils.lerp(from.x, 0, ease),
      THREE.MathUtils.lerp(from.y, -0.92, ease),
      THREE.MathUtils.lerp(from.z, 0, ease),
    )

    const q = new CANNON.Quaternion()
    q.setFromEuler(0, 0, Math.PI / 2)
    this.coinBody.quaternion.copy(q)
    this.coinMesh.scale.setScalar(1 - ease * 0.92)

    if (t >= 1) this._enterPaintPhase()
  }

  _enterPaintPhase() {
    this.phase = PHASE.PAINT
    this.coinMesh.visible = false
    this.world.removeBody(this.coinBody)
    this.slotGroup.visible = false

    this.characterRoot.visible = true
    this.character.group.visible = true
    this.characterRoot.scale.setScalar(0.01)
    this._charAppearT = 0

    this.paletteEl?.classList.remove('hidden')
    this.hintEl?.classList.add('has-palette')
    this._setHint('Arrastra fuera para rotar · sobre la figura para pintar')
  }

  _setHint(text) {
    if (!this.hintEl) return
    if (!text) {
      this.hintEl.classList.add('is-fading')
      return
    }
    this.hintEl.textContent = text
    this.hintEl.classList.remove('is-fading')
  }

  _onResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  _syncCoin() {
    this.coinMesh.position.copy(this.coinBody.position)
    this.coinMesh.quaternion.copy(this.coinBody.quaternion)
  }

  _animate() {
    requestAnimationFrame(() => this._animate())
    const dt = Math.min(this.clock.getDelta(), 0.05)

    if (this.phase === PHASE.COIN || this.phase === PHASE.INSERTING) {
      if (this.phase === PHASE.COIN && !this.isDraggingCoin) {
        this.world.step(1 / 60, dt, 3)
        this.coinBody.position.z *= 0.85
        this.coinBody.velocity.z *= 0.85
      }

      if (this.phase === PHASE.INSERTING) this._updateInsert(dt)
      this._syncCoin()
    }

    if (this.phase === PHASE.PAINT && this._charAppearT !== undefined) {
      this._charAppearT += dt
      const t = Math.min(1, this._charAppearT / 0.7)
      this.characterRoot.scale.setScalar(1 - Math.pow(1 - t, 3))
      if (t >= 1) this._charAppearT = undefined
    }

    if (this.phase === PHASE.PAINT && !this.isRotating && !this.painting.active) {
      this.characterRoot.rotation.y += dt * 0.08
    }

    this.renderer.render(this.scene, this.camera)
  }
}
