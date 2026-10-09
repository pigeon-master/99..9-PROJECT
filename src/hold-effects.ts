import * as THREE from 'three'
import type { Pigeon } from './pigeon'

type EffectBird = Pick<Pigeon, 'style' | 'body'>
interface Drop { mesh: THREE.Mesh; velocity: THREE.Vector3; radius: number; jet: Jet }
interface Jet { mesh: THREE.Mesh; emitting: boolean; landed: THREE.Vector3 | null }
interface Puddle { mesh: THREE.Mesh; age: number; volume: number }
export interface Egg { mesh: THREE.Mesh; velocity: THREE.Vector3; landed: boolean; rollAge: number; rollSpeed: number; direction: THREE.Vector3; axis: THREE.Vector3; rollAngle: number; targetAngle: number; heading: number; curve: number; phase: number; deceleration: number; restRotation: THREE.Quaternion | null; settleAge: number; hovered: boolean; selected: boolean; cracked: boolean }

const burstStarts = [1, 2.15]
const burstDuration = 0.45
const eggTime = burstStarts[1] + burstDuration + 2
const gravity = 13
const up = new THREE.Vector3(0, 1, 0)
const rollRadius = 0.46 * 0.7
const jetRings = 48
const jetSides = 8

export class HoldEffects {
  readonly drops: Drop[] = []
  readonly puddles: Puddle[] = []
  readonly eggs: Egg[] = []
  readonly jets: Jet[] = []
  private activeJets: Array<Jet | undefined> = []
  private held: EffectBird | null = null
  private holdTime = 0
  // In-memory, per individual: survives releases but resets with a page reload.
  private laidBirds = new WeakSet<THREE.Group>()
  private holdBurstStarts = burstStarts
  private dropRemainder = 0
  private freeDrops: THREE.Mesh[] = []
  private outlet = new THREE.Vector3()
  private dropGeometry = new THREE.SphereGeometry(1, 10, 8)
  private liquid = new THREE.MeshPhysicalMaterial({ color: '#eee2bd', roughness: 0.19, clearcoat: 1, clearcoatRoughness: 0.12 })
  private eggMaterial = new THREE.MeshStandardMaterial({ color: '#ece1ca', roughness: 0.65 })
  private eggOutlineMaterial = new THREE.MeshBasicMaterial({ color: '#d0c2a8', side: THREE.BackSide, depthWrite: false })
  private puddleGeometry: THREE.BufferGeometry
  private eggGeometry: THREE.BufferGeometry
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
    // Low irregular domes catch highlights along the wet edge of each stain.
    this.puddleGeometry = new THREE.SphereGeometry(1, 40, 8)
    const surface = this.puddleGeometry.getAttribute('position')
    for (let i = 0; i < surface.count; i++) {
      const x = surface.getX(i), z = surface.getZ(i), a = Math.atan2(z, x)
      const ripple = 1 + Math.sin(a * 5 + 0.6) * 0.085 + Math.cos(a * 7) * 0.04
      surface.setXYZ(i, x * ripple, surface.getY(i), z * ripple)
    }
    this.puddleGeometry.computeVertexNormals()
    this.eggGeometry = new THREE.SphereGeometry(1, 24, 18)
    const shell = this.eggGeometry.getAttribute('position')
    for (let i = 0; i < shell.count; i++) {
      const y = shell.getY(i), taper = 1 - y * 0.17
      shell.setXYZ(i, shell.getX(i) * 0.273 * taper, y * 0.42, shell.getZ(i) * 0.273 * taper)
    }
    this.eggGeometry.computeVertexNormals()
  }

  // Called on release as well: even a re-grab between frames resets the timer.
  // Already falling objects and ground marks remain independent of the bird.
  release() {
    this.activeJets.forEach(jet => { if (jet) jet.emitting = false })
    this.activeJets = []
    this.held = null
    this.holdTime = 0
    this.holdBurstStarts = burstStarts
    this.dropRemainder = 0
  }

  update(bird: EffectBird | null, dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return
    const eligible = bird?.style === 'gyaru' || bird?.style === 'magic' || bird?.style === 'maid' || bird?.style === 'baby' || bird?.style === 'walker' || bird?.style === 'royal' ? bird : null
    if (eligible !== this.held) {
      this.release()
      this.held = eligible
      if (eligible && this.laidBirds.has(eligible.body)) {
        // Choose once per hold, never reroll the count on animation frames.
        this.holdBurstStarts = Math.random() < 0.5 ? burstStarts : [...burstStarts, burstStarts[1] + 1.15]
      }
    }
    if (eligible) {
      const previous = this.holdTime
      this.holdTime += dt
      // Underside of the tail, including facing, scale and animated body pose.
      eligible.body.updateWorldMatrix(true, false)
      this.outlet.set(0, 0.59, -0.76).applyMatrix4(eligible.body.matrixWorld)
      for (const [index, start] of this.holdBurstStarts.entries()) {
        const overlap = Math.max(0, Math.min(this.holdTime, start + burstDuration) - Math.max(previous, start))
        if (overlap > 0 && !this.activeJets[index]) this.activeJets[index] = this.createJet()
        const jet = this.activeJets[index]
        this.dropRemainder += overlap
        while (jet && this.dropRemainder >= 0.018 - 1e-9) {
          this.emitDrop(jet)
          this.dropRemainder -= 0.018
        }
        if (jet) jet.emitting = this.holdTime < start + burstDuration
      }
      if (!this.laidBirds.has(eligible.body) && this.holdTime >= eggTime) {
        this.emitEgg()
        this.laidBirds.add(eligible.body)
      }
    }
    // Wall time controls the hold; substeps prevent missed floor collisions.
    let remaining = Math.min(dt, 0.25)
    while (remaining > 1e-8) {
      const step = Math.min(remaining, 1 / 120)
      this.stepPhysics(step)
      remaining -= step
    }
    this.renderJets()
  }

  private createJet(): Jet {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((jetRings + 1) * (jetSides + 1) * 3), 3).setUsage(THREE.DynamicDrawUsage))
    const indices: number[] = []
    for (let ring = 0; ring < jetRings; ring++) for (let side = 0; side < jetSides; side++) {
      const a = ring * (jetSides + 1) + side, b = a + jetSides + 1
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
    geometry.setIndex(indices)
    const mesh = new THREE.Mesh(geometry, this.liquid)
    mesh.name = 'liquid-stream'
    mesh.castShadow = true
    mesh.frustumCulled = false
    this.scene.add(mesh)
    const jet = { mesh, emitting: true, landed: null }
    this.jets.push(jet)
    return jet
  }

  private emitDrop(jet: Jet) {
    if (this.drops.length >= 80) return
    const mesh = this.freeDrops.pop() ?? new THREE.Mesh(this.dropGeometry, this.liquid)
    const radius = 0.018
    // Invisible fluid samples drive a single continuous tube, never beads.
    mesh.visible = false
    mesh.position.copy(this.outlet)
    mesh.scale.set(radius, radius * 1.6, radius)
    this.drops.push({ mesh, radius, jet, velocity: new THREE.Vector3(0, -2.5, 0) })
  }

  private renderJets() {
    const point = new THREE.Vector3(), tangent = new THREE.Vector3(), normal = new THREE.Vector3(), binormal = new THREE.Vector3()
    for (let i = this.jets.length - 1; i >= 0; i--) {
      const jet = this.jets[i]
      const points = this.drops.filter(drop => drop.jet === jet).map(drop => drop.mesh.position.clone()).reverse()
      if (jet.emitting) points.unshift(this.outlet.clone())
      if (!points.length) {
        this.scene.remove(jet.mesh)
        jet.mesh.geometry.dispose()
        this.jets.splice(i, 1)
        continue
      }
      if (jet.landed) points.push(jet.landed.clone().setY(0.018))
      if (points.length === 1) points.push(points[0].clone().add(new THREE.Vector3(0, -0.015, 0)))
      const curve = new THREE.CatmullRomCurve3(points)
      const positions = jet.mesh.geometry.getAttribute('position')
      for (let ring = 0; ring <= jetRings; ring++) {
        const t = ring / jetRings
        curve.getPoint(t, point)
        curve.getTangent(t, tangent)
        normal.set(1, 0, 0)
        if (Math.abs(tangent.x) > 0.95) normal.set(0, 0, 1)
        normal.cross(tangent).normalize()
        binormal.crossVectors(tangent, normal).normalize()
        const radius = 0.018 * (1 - 0.25 * t)
        for (let side = 0; side <= jetSides; side++) {
          const angle = side / jetSides * Math.PI * 2
          const a = Math.cos(angle) * radius, b = Math.sin(angle) * radius
          positions.setXYZ(ring * (jetSides + 1) + side, point.x + normal.x * a + binormal.x * b,
            Math.max(0.012, point.y + normal.y * a + binormal.y * b), point.z + normal.z * a + binormal.z * b)
        }
      }
      positions.needsUpdate = true
      jet.mesh.geometry.computeVertexNormals()
    }
  }

  private splat(position: THREE.Vector3) {
    let puddle = this.puddles.find(p => Math.hypot(p.mesh.position.x - position.x, p.mesh.position.z - position.z) < 0.22)
    if (!puddle) {
      // Recycle old marks after many holds, bounding memory and draw calls.
      if (this.puddles.length >= 80) puddle = this.puddles.shift()!
      else {
        const mesh = new THREE.Mesh(this.puddleGeometry, this.liquid)
        mesh.receiveShadow = true
        this.scene.add(mesh)
        puddle = { mesh, age: 0, volume: 0 }
      }
      puddle.age = 0
      puddle.volume = 0
      puddle.mesh.scale.set(0.025, 0.014, 0.025)
      puddle.mesh.position.set(position.x, 0.014, position.z)
      puddle.mesh.rotation.y = Math.random() * Math.PI * 2
      this.puddles.push(puddle)
    }
    puddle.volume = Math.min(50, puddle.volume + 1)
  }

  private emitEgg() {
    let mesh: THREE.Mesh
    if (this.eggs.length >= 24) {
      const index = this.eggs.findIndex(egg => !egg.selected)
      mesh = this.eggs.splice(index, 1)[0].mesh
      mesh.children.filter(child => child.name === 'egg-cracks').forEach(child => {
        child.traverse(part => { if (part instanceof THREE.Mesh) { part.geometry.dispose(); (part.material as THREE.Material).dispose() } })
        mesh.remove(child)
      })
    }
    else {
      mesh = new THREE.Mesh(this.eggGeometry, this.eggMaterial)
      mesh.castShadow = mesh.receiveShadow = true
      // A very slightly expanded back-face shell adds a fine warm silhouette,
      // including where the pale egg overlaps the similarly colored puddle.
      const outline = new THREE.Mesh(this.eggGeometry, this.eggOutlineMaterial)
      outline.name = 'egg-soft-outline'
      outline.scale.setScalar(1.012)
      mesh.add(outline)
      this.scene.add(mesh)
    }
    mesh.position.copy(this.outlet)
    mesh.quaternion.identity()
    mesh.scale.setScalar(1)
    mesh.visible = true
    const angle = Math.random() * Math.PI * 2
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
    const targetAngle = (2 + Math.random()) * Math.PI * 2
    const initialSpeed = 2.3 + Math.random() * 0.35
    const deceleration = initialSpeed ** 2 / (2 * targetAngle * rollRadius)
    mesh.userData.parentStyle = this.held?.style
    this.eggs.push({ mesh, velocity: direction.clone().multiplyScalar(0.12), landed: false, rollAge: 0,
      rollSpeed: initialSpeed, deceleration, rollAngle: 0, targetAngle, restRotation: null, settleAge: 0, hovered: false, selected: false, cracked: false,
      heading: angle, curve: (Math.random() < 0.5 ? -1 : 1) * (0.18 + Math.random() * 0.15), phase: Math.random() * Math.PI * 2,
      direction, axis: new THREE.Vector3().crossVectors(up, direction).normalize() })
  }

  private stepPhysics(dt: number) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i]
      drop.velocity.y -= gravity * dt
      drop.mesh.position.addScaledVector(drop.velocity, dt)
      drop.mesh.scale.y = drop.radius * (1.6 + Math.min(2.5, Math.abs(drop.velocity.y) * 0.3))
      if (drop.mesh.position.y <= drop.radius) {
        this.splat(drop.mesh.position)
        drop.jet.landed = drop.mesh.position.clone()
        drop.mesh.visible = false
        this.freeDrops.push(drop.mesh)
        this.drops.splice(i, 1)
      }
    }
    for (const puddle of this.puddles) {
      puddle.age += dt
      const radius = 0.07 + Math.sqrt(puddle.volume / 50) * 0.23
      const spread = 1 - Math.exp(-puddle.age * 9)
      puddle.mesh.scale.x = THREE.MathUtils.damp(puddle.mesh.scale.x, radius * (0.25 + spread * 0.75), 15, dt)
      puddle.mesh.scale.z = puddle.mesh.scale.x * 0.84
    }
    for (const egg of this.eggs) {
      if (egg.selected) continue
      egg.mesh.scale.setScalar(THREE.MathUtils.damp(egg.mesh.scale.x, egg.hovered ? 1.5 : 1, 15, dt))
      if (egg.landed && egg.hovered) { egg.mesh.position.y = this.eggSupport(egg.mesh); continue }
      if (!egg.landed) {
        egg.velocity.y -= gravity * dt
        egg.mesh.position.addScaledVector(egg.velocity, dt)
        egg.mesh.rotateOnWorldAxis(egg.axis, dt * 1.7)
        const support = this.eggSupport(egg.mesh)
        if (egg.mesh.position.y <= support) {
          egg.mesh.position.y = support
          egg.landed = true
        }
      } else if (egg.rollSpeed > 0) {
        egg.rollAge += dt
        const nextSpeed = Math.max(0, egg.rollSpeed - egg.deceleration * dt)
        const distance = Math.min((egg.rollSpeed + nextSpeed) * 0.5 * dt, (egg.targetAngle - egg.rollAngle) * rollRadius)
        // Smooth randomized curvature and wobble, without abrupt direction jumps.
        egg.heading += distance * (egg.curve + Math.sin(egg.rollAge * 2 + egg.phase) * 0.18)
        egg.direction.set(Math.cos(egg.heading), 0, Math.sin(egg.heading))
        egg.axis.crossVectors(up, egg.direction).normalize()
        egg.mesh.position.addScaledVector(egg.direction, distance)
        egg.mesh.rotateOnWorldAxis(egg.axis, distance / rollRadius)
        egg.rollAngle += distance / rollRadius
        egg.mesh.position.y = this.eggSupport(egg.mesh)
        egg.rollSpeed = egg.rollAngle >= egg.targetAngle - 1e-6 ? 0 : nextSpeed
        if (egg.rollSpeed === 0) {
          const longAxis = up.clone().applyQuaternion(egg.mesh.quaternion)
          const restingAxis = longAxis.clone().setY(0)
          if (restingAxis.lengthSq() < 0.001) restingAxis.copy(egg.direction)
          restingAxis.normalize()
          egg.restRotation = new THREE.Quaternion().setFromUnitVectors(longAxis, restingAxis).multiply(egg.mesh.quaternion)
        }
      } else if (egg.restRotation && egg.settleAge < 1) {
        egg.settleAge += dt
        egg.mesh.quaternion.slerp(egg.restRotation, 1 - Math.exp(-dt * 7))
        if (egg.settleAge >= 1) egg.mesh.quaternion.copy(egg.restRotation)
        egg.mesh.position.y = this.eggSupport(egg.mesh)
      }
      if (egg.landed) egg.mesh.position.y = this.eggSupport(egg.mesh)
    }
  }

  private eggSupport(mesh: THREE.Mesh) {
    // Use actual vertices to keep the asymmetric shell on the floor as it rolls.
    const positions = this.eggGeometry.getAttribute('position')
    const point = new THREE.Vector3()
    let minY = Infinity
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyQuaternion(mesh.quaternion)
      minY = Math.min(minY, point.y)
    }
    return -minY * mesh.scale.y + 0.003
  }
}
