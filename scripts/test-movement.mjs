import assert from 'node:assert/strict'
import { Group } from 'three'
import { scatterFlock, walkFlock, setMovementBounds } from '../src/movement.ts'

let seed = 9841
Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
for (const [label, boundsX, boundsZ] of [['desktop', 10.66, 11.28], ['mobile', 8.8, 34]]) {
  const birds = Array.from({ length: 100 }, (_, id) => {
    const root = new Group()
    root.position.set((id % 10 / 9 * 2 - 1) * boundsX * 0.9, 0, (Math.floor(id / 10) / 9 * 2 - 1) * boundsZ * 0.9)
    root.rotation.y = Math.random() * Math.PI * 2
    return { id, root, speed: 1 + Math.random() * 0.75, heading: root.rotation.y, phase: 0 }
  })
  scatterFlock(birds, boundsX, boundsZ)
  const occupiedCells = () => new Set(birds.map(b => {
    const column = Math.min(3, Math.floor((b.root.position.x / boundsX + 1) * 2))
    const row = Math.min(3, Math.floor((b.root.position.z / boundsZ + 1) * 2))
    return `${column},${row}`
  })).size
  assert.equal(occupiedCells(), 16, 'Initial placement fills all 16 screen regions')
  const extents = birds.map(() => ({ minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }))
  let windowStart = birds.map(b => b.root.position.clone())
  let windowDistance = birds.map(() => 0)
  for (let frame = 0; frame < 60 * 90; frame++) {
    walkFlock(birds, null, boundsX, boundsZ, 1 / 60)
    birds.forEach((bird, index) => {
      const { x, z } = bird.root.position
      assert.ok(Number.isFinite(x) && Number.isFinite(z))
      assert.ok(Math.abs(x) <= boundsX && Math.abs(z) <= boundsZ, 'Stay within the scene')
      const e = extents[index]
      e.minX = Math.min(e.minX, x); e.maxX = Math.max(e.maxX, x)
      e.minZ = Math.min(e.minZ, z); e.maxZ = Math.max(e.maxZ, z)
      windowDistance[index] = Math.max(windowDistance[index], bird.root.position.distanceTo(windowStart[index]))
    })
    if ((frame + 1) % 600 === 0) {
      assert.ok(occupiedCells() >= 13, `${label}: flock stays spread throughout the screen`)
      assert.ok(windowDistance.every(distance => distance > 2.5), `${label}: all birds must leave a small local area every 10 seconds: ${Math.min(...windowDistance)}`)
      windowStart = birds.map(b => b.root.position.clone())
      windowDistance = birds.map(() => 0)
    }
  }
  extents.forEach(e => {
    // Random travel radii need not cross half of the enlarged mobile world.
    assert.ok(e.maxX - e.minX > 6, `${label}: each bird explores a broad horizontal range`)
    assert.ok(e.maxZ - e.minZ > 6, `${label}: each bird explores a broad vertical range`)
  })
  const held = birds[0]
  const position = held.root.position.clone()
  walkFlock(birds, held, boundsX, boundsZ, 1)
  assert.deepEqual(held.root.position, position, 'Held birds do not walk')
  console.log(`PASS ${label}: all 100 birds roam widely for 90 simulated seconds without local circling or leaving bounds.`)
}

// Reproduce the top-edge case with different body heights and outward headings.
for (const top of [-7.5, -6.3, -5.1]) {
  const root = new Group()
  root.position.set(0, 0, top)
  root.rotation.y = Math.PI
  const bird = { id: 99, root, speed: 1.5, phase: 0, heading: Math.PI }
  setMovementBounds(bird, { minX: -8, maxX: 8, minZ: top, maxZ: 10 })
  let longestStall = 0, stall = 0
  for (let frame = 0; frame < 60 * 30; frame++) {
    const before = root.position.clone(), angle = root.rotation.y
    walkFlock([bird], null, 10, 14, 1 / 60)
    const distance = root.position.distanceTo(before)
    stall = distance < 0.0001 ? stall + 1 : 0
    longestStall = Math.max(longestStall, stall)
    assert.ok(root.position.z >= top && root.position.z <= 10 && Math.abs(root.position.x) <= 8)
    assert.ok(distance <= bird.speed / 60 + 1e-8, 'No boundary correction teleports')
    assert.ok(Math.abs(root.rotation.y - angle) <= 4.5 / 60 + 1e-8, 'Turns remain smooth')
    if (frame === 240) assert.ok(root.position.z > top + 1, 'Leaves the upper boundary rather than repeatedly re-planning')
  }
  assert.ok(longestStall < 60, 'No repeated freezing at the boundary')
}
console.log('PASS: individual top boundaries, smooth turns, no teleportation or repeated edge stalls.')
