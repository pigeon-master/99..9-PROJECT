import assert from 'node:assert/strict'
import { Group, Scene } from 'three'
import { Feeding } from '../src/feeding.ts'
import { walkFlock } from '../src/movement.ts'

let seed = 71839
Math.random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 }
const feeding = new Feeding(new Scene())
const birds = Array.from({ length: 100 }, (_, id) => {
  const root = new Group()
  root.scale.setScalar(0.9)
  root.position.set(-9 + (id % 5) * 0.65, 0, (Math.floor(id / 5) - 9.5) * 0.65)
  return { id, style: 'classic', root, speed: 1.2, phase: 0, heading: 0 }
})
const stations = Array.from({ length: 12 }, (_, i) => ({
  x: Math.cos(i * Math.PI / 6) * 6.5, z: Math.sin(i * Math.PI / 6) * 6.5,
}))
for (const station of stations) feeding.scatter(station.x, station.z, 12, 12)
feeding.update([], null, 12, 12, 1)
feeding.update(birds, null, 12, 12, 0.01)
const allocations = new Array(stations.length).fill(0)
const nearestStation = (x, z) => {
  let best = 0
  stations.forEach((station, i) => {
    if (Math.hypot(station.x - x, station.z - z) < Math.hypot(stations[best].x - x, stations[best].z - z)) best = i
  })
  return best
}
for (const meal of feeding.meals.values()) allocations[nearestStation(meal.grain.x, meal.grain.z)]++
assert.ok(allocations.every(count => count >= 2), `All stretches attract multiple birds, even beyond eight units: ${allocations}`)
assert.ok(Math.max(...allocations) <= 15, `One stretch cannot claim most of the flock: ${allocations}`)
const visited = new Set()
for (let frame = 0; frame < 12 * 60; frame++) {
  feeding.update(birds, null, 12, 12, 1 / 60)
  walkFlock(birds, null, 12, 12, 1 / 60, feeding.controlled)
  for (const bird of birds) {
    const meal = feeding.meals.get(bird)
    if (meal?.mode === 'eat') visited.add(nearestStation(meal.grain.x, meal.grain.z))
    assert.ok(Math.abs(bird.root.position.x) <= 12 && Math.abs(bird.root.position.z) <= 12)
  }
}
assert.equal(visited.size, stations.length, 'Birds actually arrive and eat along the entire drawn shape')
console.log(`PASS: all 12 parts of a drawn circle receive birds and are visited; initial allocations ${allocations}.`)
