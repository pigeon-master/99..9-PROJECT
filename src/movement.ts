import type { Pigeon } from './pigeon'

type Walker = Pick<Pigeon, 'id' | 'root' | 'speed' | 'phase' | 'heading'>
interface Route { x: number; z: number; age: number }
const routes = new WeakMap<Walker, Route>()
export interface MovementBounds { minX: number; maxX: number; minZ: number; maxZ: number }
const movementBounds = new WeakMap<Walker, MovementBounds>()
export function setMovementBounds(bird: Walker, bounds: MovementBounds) { movementBounds.set(bird, bounds); routes.delete(bird) }
export function getMovementBounds(bird: Walker, x: number, z: number): MovementBounds {
  return movementBounds.get(bird) ?? { minX: -x, maxX: x, minZ: -z, maxZ: z }
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function scatterFlock(birds: Walker[], boundsX: number, boundsZ: number) {
  const placed: Walker[] = []
  for (const bird of birds) {
    const limits = getMovementBounds(bird, boundsX, boundsZ)
    let bestX = 0, bestZ = 0, bestSpacing = -1
    for (let attempt = 0; attempt < 60; attempt++) {
      const x = limits.minX + 0.3 + Math.random() * (limits.maxX - limits.minX - 0.6)
      const z = limits.minZ + 0.3 + Math.random() * (limits.maxZ - limits.minZ - 0.6)
      const spacing = placed.reduce((nearest, other) => Math.min(nearest,
        Math.hypot(x - other.root.position.x, z - other.root.position.z)), Infinity)
      if (spacing > bestSpacing) { bestX = x; bestZ = z; bestSpacing = spacing }
    }
    bird.root.position.set(bestX, 0, bestZ)
    placed.push(bird)
  }
  birds.forEach(bird => resetRoute(bird, boundsX, boundsZ, birds))
}

export function resetRoute(bird: Walker, boundsX: number, boundsZ: number, birds: Walker[] = []) {
  const pos = bird.root.position
  const limits = getMovementBounds(bird, boundsX, boundsZ)
  const centerX = (limits.minX + limits.maxX) / 2, centerZ = (limits.minZ + limits.maxZ) / 2
  let x = pos.x, z = pos.z, bestScore = Infinity
  const radius = 3 + Math.random() * Math.min(boundsX, boundsZ) * 1.4
  const reflect = (value: number, bound: number) => {
    const period = 4 * bound
    const wrapped = ((value + bound) % period + period) % period
    return wrapped <= 2 * bound ? wrapped - bound : 3 * bound - wrapped
  }
  for (let attempt = 0; attempt < 24; attempt++) {
    const angle = Math.random() * Math.PI * 2
    const distance = radius * (0.65 + Math.random() * 0.7)
    const candidateX = centerX + reflect(pos.x - centerX + Math.sin(angle) * distance, Math.max(0.1, (limits.maxX - limits.minX) / 2 - 0.4))
    const candidateZ = centerZ + reflect(pos.z - centerZ + Math.cos(angle) * distance, Math.max(0.1, (limits.maxZ - limits.minZ) / 2 - 0.4))
    if (Math.hypot(candidateX - pos.x, candidateZ - pos.z) < 2.5) continue
    let score = Math.random() * 0.6
    for (const other of birds) {
      if (other === bird || other.root.position.y > 0.3) continue
      const d = Math.hypot(candidateX - other.root.position.x, candidateZ - other.root.position.z)
      score += Math.max(0, 1 - d / 3) ** 2
      const reserved = routes.get(other)
      if (reserved) score += Math.max(0, 1 - Math.hypot(candidateX - reserved.x, candidateZ - reserved.z) / 2.5) ** 2 * 0.8
    }
    if (score < bestScore) { x = candidateX; z = candidateZ; bestScore = score }
  }
  routes.set(bird, { x, z, age: 0 })
}

export function walkFlock(birds: Walker[], held: Walker | null, boundsX: number, boundsZ: number, dt: number, controlled?: ReadonlySet<Walker>) {
  // Read the same frame for every bird, so array order cannot bias avoidance.
  const positions = birds.map(bird => ({ x: bird.root.position.x, z: bird.root.position.z, y: bird.root.position.y }))
  birds.forEach((bird, index) => {
    if (bird === held || controlled?.has(bird) || positions[index].y > 0 || bird.speed <= 0) return
    const pos = positions[index]
    const limits = getMovementBounds(bird, boundsX, boundsZ)
    let route = routes.get(bird)
    if (!route || Math.hypot(route.x - pos.x, route.z - pos.z) < 0.8 || route.age > 24) {
      resetRoute(bird, boundsX, boundsZ, birds)
      route = routes.get(bird)!
    }
    route.age += dt
    const distance = Math.hypot(route.x - pos.x, route.z - pos.z)
    const goalX = (route.x - pos.x) / Math.max(distance, 0.001)
    const goalZ = (route.z - pos.z) / Math.max(distance, 0.001)
    let avoidX = 0, avoidZ = 0
    positions.forEach((other, otherIndex) => {
      if (index === otherIndex || other.y > 0.3) return
      const dx = pos.x - other.x, dz = pos.z - other.z
      const separation = Math.hypot(dx, dz)
      if (separation >= 1.25) return
      const strength = (1.25 - separation) / 1.25
      if (separation > 0.001) {
        avoidX += dx / separation * strength
        avoidZ += dz / separation * strength
      } else {
        const angle = (bird.id + otherIndex) * 2.39996
        const side = index < otherIndex ? 1 : -1
        avoidX += Math.sin(angle) * side
        avoidZ += Math.cos(angle) * side
      }
    })
    // Avoidance is temporary and bounded: it can never replace the destination.
    const avoidance = Math.hypot(avoidX, avoidZ)
    const weight = avoidance > 0 ? Math.min(0.5, avoidance) / avoidance : 0
    const bend = Math.sin(route.age * 0.7 + bird.id * 2.4) * 0.12
    const desiredX = goalX + avoidX * weight + goalZ * bend
    const desiredZ = goalZ + avoidZ * weight - goalX * bend
    bird.heading = Math.atan2(desiredX, desiredZ)
    const delta = Math.atan2(Math.sin(bird.heading - bird.root.rotation.y), Math.cos(bird.heading - bird.root.rotation.y))
    bird.root.rotation.y += clamp(delta, -4.5 * dt, 4.5 * dt)
    // Turn toward the stable destination before accelerating away from an edge.
    const nearEdge = movementBounds.has(bird) && Math.min(pos.x - limits.minX, limits.maxX - pos.x, pos.z - limits.minZ, limits.maxZ - pos.z) < 0.6
    const step = bird.speed * dt * (nearEdge ? Math.max(0, Math.cos(delta)) : 1)
    bird.root.position.x = clamp(pos.x + Math.sin(bird.root.rotation.y) * step, limits.minX, limits.maxX)
    bird.root.position.z = clamp(pos.z + Math.cos(bird.root.rotation.y) * step, limits.minZ, limits.maxZ)
    bird.phase += step * 10
  })
}
