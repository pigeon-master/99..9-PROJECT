import assert from 'node:assert/strict'
import { Group, MeshStandardMaterial, Vector3 } from 'three'
import { createFlexibleNeck, updateFlexibleNeck } from '../src/neck.ts'

const head = new Group()
const neck = createFlexibleNeck(new MeshStandardMaterial())
for (let step = 0; step <= 100; step++) {
  const blend = step / 100
  head.position.set(0, -0.84 * blend, -0.8 * blend)
  head.rotation.set(0.64 * blend, Math.sin(step) * 0.3, 0)
  updateFlexibleNeck(neck, head)
  const positions = neck.geometry.getAttribute('position')
  const center = ring => {
    const sum = new Vector3()
    for (let side = 0; side < 12; side++) sum.add(new Vector3().fromBufferAttribute(positions, ring * 13 + side))
    return sum.divideScalar(12)
  }
  assert.ok(center(0).distanceTo(new Vector3(0, 1.14, 0.34)) < 0.00001, 'Neck stays anchored in chest')
  assert.ok(center(16).distanceTo(new Vector3(0, 1.65, 0.49).applyMatrix4(head.matrix)) < 0.00001, 'Neck follows head without a gap')
  for (let ring = 1; ring <= 16; ring++) assert.ok(center(ring).distanceTo(center(ring - 1)) < 0.12, 'Continuous neck through the entire peck')
  assert.ok(Array.from(positions.array).every(Number.isFinite))
}
console.log('PASS: continuous chest-to-head attachment through 101 bending and stretching poses.')
