import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createFlexibleNeck, updateFlexibleNeck } from '../src/neck.ts'
import { HoldEffects } from '../src/hold-effects.ts'
import { EggFocus } from '../src/egg-focus.ts'

const head = new THREE.Group(), neck = createFlexibleNeck(new THREE.MeshStandardMaterial())
updateFlexibleNeck(neck, head)
const positions = neck.geometry.attributes.position
const rest = positions.array.slice(), version = positions.version
for (let i = 0; i < 100; i++) updateFlexibleNeck(neck, head)
assert.equal(positions.version, version, 'An unchanged pose must not upload the same geometry again')
head.position.y = -0.7; head.rotation.x = 0.5
updateFlexibleNeck(neck, head)
assert.notDeepEqual(positions.array, rest, 'A moving head invalidates the geometry cache')
head.position.y = 0; head.rotation.x = 0
updateFlexibleNeck(neck, head)
assert.deepEqual(positions.array, rest, 'Returning to the original pose reproduces the original vertices')
neck.userData.radiusScale = 0.85
updateFlexibleNeck(neck, head)
assert.notDeepEqual(positions.array, rest, 'Changes to neck thickness invalidate the cache')

const scene = new THREE.Scene(), effects = new HoldEffects(scene), body = new THREE.Group()
body.position.y = 2.8
effects.update({ style: 'gyaru', body }, 4.2)
effects.release()
for (let i = 0; i < 600; i++) effects.update(null, 0.02)
const egg = effects.eggs[0]
const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100)
camera.position.set(0, 6, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true)
const focus = new EggFocus()
focus.resize(1440, 1000); focus.open(egg, camera); focus.update(1)
let sharedShellDisposals = 0, crackDisposals = 0
egg.mesh.geometry.addEventListener('dispose', () => sharedShellDisposals++)
const tracked = new Set()
for (let i = 0; i < 4; i++) {
  focus.crack(); focus.update(0.3)
  egg.mesh.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !object.parent?.name.startsWith('egg-impact-')) return
    for (const resource of [object.geometry, object.material]) if (!tracked.has(resource)) {
      tracked.add(resource); resource.addEventListener('dispose', () => crackDisposals++)
    }
  })
}
assert.ok(focus.broken && tracked.size > 0)
focus.close()
assert.equal(crackDisposals, tracked.size, 'Every removed crack resource is disposed exactly once')
assert.equal(sharedShellDisposals, 0, 'Shared ground-egg geometry remains usable')
assert.ok(scene.getObjectByName('ground-egg-fragments'), 'Visible ground fragments are preserved')
console.log('PASS: unchanged-neck uploads skipped; pose/thickness invalidation; removed cracks released once; shared egg and ground fragments preserved.')
