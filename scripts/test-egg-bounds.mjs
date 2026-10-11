import assert from 'node:assert/strict'
import * as THREE from 'three'
import { HoldEffects } from '../src/hold-effects.ts'

const sin = Math.sin(Math.atan2(16, 22)), cos = Math.cos(Math.atan2(16, 22))
const halfWidth = 3.4, halfHeight = 7.36
const bounds = {
  minX: -halfWidth + 0.66, maxX: halfWidth - 0.66,
  minZ: (-halfHeight + 1.3 * cos) / sin + 0.66,
  maxZ: halfHeight / sin - 0.66,
}
const camera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, 0.1, 100)
camera.position.set(0, 32, 44); camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
for (const [index, [sx, sz]] of [[-1, -1], [1, -1], [-1, 1], [1, 1]].entries()) {
  const effects = new HoldEffects(new THREE.Scene())
  effects.setEggBounds(bounds)
  const body = new THREE.Group(); body.position.y = 2.8
  effects.update({ body, style: ['royal', 'maid', 'walker'][index % 3] }, 4.11)
  effects.release()
  const egg = effects.eggs[0]
  assert.ok(egg)
  egg.landed = true
  egg.mesh.position.set(sx < 0 ? bounds.minX + 0.01 : bounds.maxX - 0.01, 0.42,
    sz < 0 ? bounds.minZ + 0.01 : bounds.maxZ - 0.01)
  egg.heading = Math.atan2(sz, sx)
  egg.direction.set(sx, 0, sz).normalize()
  for (let frame = 0; frame < 700; frame++) {
    effects.update(null, 0.02)
    assert.ok(egg.mesh.position.x >= bounds.minX && egg.mesh.position.x <= bounds.maxX)
    assert.ok(egg.mesh.position.z >= bounds.minZ && egg.mesh.position.z <= bounds.maxZ)
  }
  assert.equal(egg.rollSpeed, 0, 'The inward rebound still comes to rest')
  egg.hovered = true
  for (let frame = 0; frame < 100; frame++) effects.update(null, 0.02)
  egg.mesh.updateMatrixWorld(true)
  const vertices = egg.mesh.geometry.getAttribute('position')
  for (let i = 0; i < vertices.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(vertices, i).multiplyScalar(1.012).applyMatrix4(egg.mesh.matrixWorld).project(camera)
    assert.ok(Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1, 'The whole resting shell and hover outline stay inside the zoomed view')
  }
  const rest = egg.mesh.position.clone()
  effects.setEggBounds({ minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5 })
  effects.update(null, 0.02)
  assert.ok(egg.mesh.position.distanceTo(rest) < 1e-10, 'Later zooming does not move an already resting egg')
}
console.log('PASS: eggs rebound inward and settle within all four zoomed edges, remain fully visible at 1.5x hover, and stay fixed after later zooming.')
