import * as THREE from 'three'
import type { Pigeon } from './pigeon'
import { updateFlexibleNeck } from './neck'
import { Feeding } from './feeding'

// Render the actual scene meshes once; the tutorial uses static, transparent images.
export function createTutorialPreviews(bird: Pigeon) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setSize(240, 180)
  renderer.setClearColor(0xffffff, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb5b0ab, 2.5))
  const sun = new THREE.DirectionalLight(0xfff8ee, 3)
  sun.position.set(-4, 8, 6); scene.add(sun)
  const fill = new THREE.DirectionalLight(0xdce5ff, 1.1)
  fill.position.set(6, 5, -8); scene.add(fill)
  const camera = new THREE.OrthographicCamera(-1.6, 1.6, 1.2, -1.2, 0.1, 30)
  camera.position.set(3, 2.8, 6); camera.lookAt(0, 1, 0)
  const model = bird.root.clone(true)
  model.position.set(0, 0, 0); model.rotation.set(0, -0.5, 0); model.scale.setScalar(0.95)
  function joint(original: THREE.Object3D) {
    const path: number[] = []
    while (original !== bird.root) { const parent = original.parent!; path.unshift(parent.children.indexOf(original)); original = parent }
    let result: THREE.Object3D = model
    for (const index of path) result = result.children[index]
    return result
  }
  const body = joint(bird.body)
  body.position.set(0, 0, 0); body.rotation.set(-0.12, 0, 0)
  const head = joint(bird.neck)
  head.position.set(0, 0, 0); head.rotation.set(0, 0, 0)
  const neck = joint(bird.neckBridge) as THREE.Mesh
  neck.geometry = neck.geometry.clone()
  updateFlexibleNeck(neck, head as THREE.Group)
  bird.wings.forEach((wing, i) => {
    const side = i === 0 ? -1 : 1, copy = joint(wing)
    copy.rotation.order = 'ZXY'
    copy.rotation.set(0.15, -side * 1.25, side * 1.15)
    copy.scale.z = 1.48
  })
  bird.legs.forEach(leg => { joint(leg).rotation.set(0.7, 0, 0); joint(leg).position.y = 0.52 })
  scene.add(model)
  renderer.render(scene, camera)
  const pigeon = renderer.domElement.toDataURL('image/png')
  neck.geometry.dispose()
  scene.remove(model)
  // Use the actual scattering/rendering code, including grain proportions,
  // colors, size variation and landing angles, rather than an approximation.
  const feeding = new Feeding(scene)
  feeding.scatter(0, 0, 10, 10)
  feeding.update([], null, 10, 10, 1)
  camera.position.set(0, 4, 5); camera.lookAt(0, 0, 0)
  camera.zoom = 1.4; camera.updateProjectionMatrix()
  renderer.render(scene, camera)
  const feed = renderer.domElement.toDataURL('image/png')
  feeding.mesh.dispose()
  feeding.mesh.geometry.dispose()
  const materials = Array.isArray(feeding.mesh.material) ? feeding.mesh.material : [feeding.mesh.material]
  materials.forEach(material => material.dispose())
  renderer.dispose(); renderer.forceContextLoss()
  return { pigeon, feed }
}
