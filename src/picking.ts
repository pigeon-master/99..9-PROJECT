import * as THREE from 'three'
import type { Pigeon } from './pigeon'
import type { Egg } from './hold-effects'

export type SceneTarget = { kind: 'bird'; bird: Pigeon } | { kind: 'egg'; egg: Egg }
const roots = new Map<THREE.Object3D, SceneTarget>()
const meshes: THREE.Object3D[] = []
const hits: THREE.Intersection[] = []
const birdTargets = new WeakMap<Pigeon, SceneTarget>()
const eggTargets = new WeakMap<Egg, SceneTarget>()

export function pickSceneTarget(ray: THREE.Raycaster, birds: Pigeon[], eggs: Egg[]): SceneTarget | null {
  roots.clear(); meshes.length = 0; hits.length = 0
  // Reuse scratch collections and target records without changing which
  // surfaces participate, their traversal order, or nearest-hit selection.
  for (const bird of birds) {
    let target = birdTargets.get(bird)
    if (!target) { target = { kind: 'bird', bird }; birdTargets.set(bird, target) }
    roots.set(bird.root, target)
  }
  for (const egg of eggs) if (egg.landed && !egg.selected) {
    let target = eggTargets.get(egg)
    if (!target) { target = { kind: 'egg', egg }; eggTargets.set(egg, target) }
    roots.set(egg.mesh, target)
  }
  roots.forEach((_target, root) => root.traverseVisible(object => {
    // Only actual shell/body surfaces are interactive, not decorative outlines.
    if (object instanceof THREE.Mesh && object.name !== 'egg-soft-outline') meshes.push(object)
  }))
  const hit = ray.intersectObjects(meshes, false, hits)[0]
  if (!hit) return null
  let object: THREE.Object3D | null = hit.object
  while (object) {
    const target = roots.get(object)
    if (target) return target
    object = object.parent
  }
  return null
}
