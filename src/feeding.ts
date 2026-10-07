import * as THREE from 'three'
import type { Pigeon } from './pigeon'
import { getMovementBounds } from './movement.ts'

interface Grain {
  x: number; z: number; bites: number; size: number; angle: number; owner: number | null
  startX: number; startZ: number; height: number; velocityY: number; age: number; flightTime: number
}
interface Meal {
  grain: Grain
  x: number
  z: number
  mode: 'wait' | 'turn' | 'run' | 'eat'
  timer: number
  biteTimer: number
  age: number
}

export class Feeding {
  readonly grains: Grain[] = []
  readonly meals = new Map<Pigeon, Meal>()
  readonly controlled = new Set<Pigeon>()
  readonly mesh: THREE.InstancedMesh
  private searches = new WeakMap<Pigeon, number>()
  private dirty = true
  private dummy = new THREE.Object3D()
  private capacity = 3000

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }), this.capacity)
    this.mesh.count = 0
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.receiveShadow = true
    this.mesh.frustumCulled = false
    scene.add(this.mesh)
  }

  scatter(x: number, z: number, boundsX: number, boundsZ: number, minZ = -boundsZ) {
    // Reuse consumed slots; a long drag cannot allocate an unbounded grain mesh.
    for (let i = this.grains.length - 1; i >= 0; i--) if (this.grains[i].bites <= 0) this.grains.splice(i, 1)
    for (let i = 0; i < 26 && this.grains.length < this.capacity; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.sqrt(Math.random()) * 0.85
      const height = 1.4 + Math.random() * 0.6
      const velocityY = 1.4 + Math.random() * 1.2
      this.grains.push({
        x: THREE.MathUtils.clamp(x + Math.cos(angle) * radius * 0.7, -boundsX, boundsX),
        z: THREE.MathUtils.clamp(z + Math.sin(angle) * radius, minZ, boundsZ),
        bites: 4, size: 0.8 + Math.random() * 0.6, angle: Math.random() * Math.PI, owner: null,
        startX: x, startZ: z, height, velocityY, age: 0,
        flightTime: (velocityY + Math.sqrt(velocityY ** 2 + 24 * height)) / 12,
      })
    }
    this.dirty = true
  }

  cancel(bird: Pigeon) {
    const meal = this.meals.get(bird)
    if (meal) meal.grain.owner = null
    this.meals.delete(bird)
    this.controlled.delete(bird)
  }

  containGrains(boundsX: number, boundsZ: number, minZ: number) {
    for (const grain of this.grains) {
      grain.x = THREE.MathUtils.clamp(grain.x, -boundsX, boundsX)
      grain.startX = THREE.MathUtils.clamp(grain.startX, -boundsX, boundsX)
      grain.z = THREE.MathUtils.clamp(grain.z, minZ, boundsZ)
      grain.startZ = THREE.MathUtils.clamp(grain.startZ, minZ, boundsZ)
    }
    this.dirty = true
  }

  private findMeal(bird: Pigeon, boundsX: number, boundsZ: number) {
    const limits = getMovementBounds(bird, boundsX, boundsZ)
    const pos = bird.root.position
    let best: Meal | null = null, nearest = 8 * 8
    for (const grain of this.grains) {
      if (grain.bites <= 0 || grain.owner !== null || grain.age < grain.flightTime) continue
      const dx = pos.x - grain.x, dz = pos.z - grain.z
      const distance = dx * dx + dz * dz
      if (distance >= nearest) continue
      const angle = Math.atan2(dx, dz)
      const reach = bird.root.scale.y * (bird.style === 'walker' ? 1.36 : 0.88)
      const x = grain.x + Math.sin(angle) * reach, z = grain.z + Math.cos(angle) * reach
      if (x < limits.minX || x > limits.maxX || z < limits.minZ || z > limits.maxZ) continue
      if ([...this.meals.values()].some(meal => Math.hypot(meal.x - x, meal.z - z) < 0.85)) continue
      nearest = distance
      best = { grain, x, z, mode: 'wait', timer: Math.random() * 2, biteTimer: 0.3, age: 0 }
    }
    if (best) { best.grain.owner = bird.id; this.meals.set(bird, best) }
  }

  update(birds: Pigeon[], held: Pigeon | null, boundsX: number, boundsZ: number, dt: number) {
    for (const grain of this.grains) {
      if (grain.age >= grain.flightTime) continue
      grain.age = Math.min(grain.flightTime, grain.age + dt)
      this.dirty = true
    }
    this.controlled.clear()
    for (const bird of birds) {
      const limits = getMovementBounds(bird, boundsX, boundsZ)
      if (bird === held || bird.root.position.y > 0) { this.cancel(bird); continue }
      let meal = this.meals.get(bird)
      if (meal && (meal.grain.bites <= 0 || meal.age > 16 || meal.x < limits.minX || meal.x > limits.maxX || meal.z < limits.minZ || meal.z > limits.maxZ)) {
        this.cancel(bird); meal = undefined
      }
      if (!meal) {
        const delay = (this.searches.get(bird) ?? 0) - dt
        this.searches.set(bird, delay)
        if (delay <= 0) { this.findMeal(bird, boundsX, boundsZ); this.searches.set(bird, 0.2 + Math.random() * 0.2) }
        meal = this.meals.get(bird)
      }
      if (!meal) continue
      meal.age += dt
      if (meal.mode === 'wait') {
        meal.timer -= dt
        if (meal.timer <= 0) meal.mode = 'turn'
        else continue
      }
      this.controlled.add(bird)
      const pos = bird.root.position
      const dx = meal.x - pos.x, dz = meal.z - pos.z
      const distance = Math.hypot(dx, dz)
      const heading = meal.mode === 'eat' ? Math.atan2(meal.grain.x - pos.x, meal.grain.z - pos.z) : Math.atan2(dx, dz)
      const delta = Math.atan2(Math.sin(heading - bird.root.rotation.y), Math.cos(heading - bird.root.rotation.y))
      bird.root.rotation.y += THREE.MathUtils.clamp(delta, -7 * dt, 7 * dt)
      if (meal.mode === 'turn') {
        if (Math.abs(delta) < 0.15) meal.mode = 'run'
      } else if (meal.mode === 'run') {
        if (distance < 0.13) { meal.mode = 'eat'; meal.biteTimer = 0.3; continue }
        let vx = dx / distance, vz = dz / distance
        let ax = 0, az = 0
        for (const other of birds) {
          if (bird === other || other.root.position.y > 0.3) continue
          const ox = pos.x - other.root.position.x, oz = pos.z - other.root.position.z
          const d = Math.hypot(ox, oz)
          if (d > 0.001 && d < 0.85) { ax += ox / d * (0.85 - d); az += oz / d * (0.85 - d) }
        }
        const strength = Math.max(1, Math.hypot(ax, az) / 0.65)
        vx += ax / strength; vz += az / strength
        const length = Math.hypot(vx, vz)
        const step = Math.min(distance, bird.speed * 2.15 * dt)
        pos.x = THREE.MathUtils.clamp(pos.x + vx / length * step, limits.minX, limits.maxX)
        pos.z = THREE.MathUtils.clamp(pos.z + vz / length * step, limits.minZ, limits.maxZ)
        bird.phase += step * 12
      } else {
        if (distance > 0.3) { meal.mode = 'run'; continue }
        meal.biteTimer -= dt
        if (meal.biteTimer <= 0) {
          meal.grain.bites--
          meal.biteTimer += 0.3
          this.dirty = true
          if (meal.grain.bites === 0) this.cancel(bird)
        }
      }
    }
    // Resolve close body contacts, including wandering birds next to feeding birds.
    if (this.meals.size > 0) for (let i = 0; i < birds.length; i++) for (let j = i + 1; j < birds.length; j++) {
      const a = birds[i], b = birds[j]
      if (a === held || b === held || a.root.position.y > 0 || b.root.position.y > 0) continue
      const dx = a.root.position.x - b.root.position.x, dz = a.root.position.z - b.root.position.z
      const d = Math.hypot(dx, dz), spacing = 0.62
      if (d >= spacing) continue
      const nx = d > 0.001 ? dx / d : Math.sin(i * 2.4), nz = d > 0.001 ? dz / d : Math.cos(i * 2.4)
      const push = (spacing - d) * Math.min(0.5, dt * 10)
      const aBounds = getMovementBounds(a, boundsX, boundsZ), bBounds = getMovementBounds(b, boundsX, boundsZ)
      a.root.position.x = THREE.MathUtils.clamp(a.root.position.x + nx * push, aBounds.minX, aBounds.maxX)
      a.root.position.z = THREE.MathUtils.clamp(a.root.position.z + nz * push, aBounds.minZ, aBounds.maxZ)
      b.root.position.x = THREE.MathUtils.clamp(b.root.position.x - nx * push, bBounds.minX, bBounds.maxX)
      b.root.position.z = THREE.MathUtils.clamp(b.root.position.z - nz * push, bBounds.minZ, bBounds.maxZ)
    }
    this.renderGrains()
  }

  private renderGrains() {
    if (!this.dirty) return
    let index = 0
    for (const grain of this.grains) {
      if (grain.bites <= 0) continue
      const size = grain.size * (0.45 + grain.bites / 4 * 0.55)
      const t = grain.age, progress = t / grain.flightTime
      const height = progress >= 1 ? 0 : Math.max(0, grain.height + grain.velocityY * t - 6 * t * t)
      this.dummy.position.set(THREE.MathUtils.lerp(grain.startX, grain.x, progress), 0.035 + height,
        THREE.MathUtils.lerp(grain.startZ, grain.z, progress))
      this.dummy.rotation.set(progress < 1 ? t * 9 : 0, grain.angle + t * 5, progress < 1 ? t * 7 : 0.12)
      this.dummy.scale.set(0.042 * size, 0.028 * size, 0.09 * size)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(index, this.dummy.matrix)
      this.mesh.setColorAt(index, new THREE.Color().setHSL(0.105 + grain.size * 0.02, 0.48, 0.43 + grain.size * 0.12))
      index++
    }
    this.mesh.count = index
    this.mesh.instanceMatrix.needsUpdate = true
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
    this.dirty = false
  }
}
