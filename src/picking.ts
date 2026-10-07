import * as THREE from 'three'
import type { Pigeon } from './pigeon'
import type { Egg } from './hold-effects'

export type SceneTarget = { kind: 'bird'; bird: Pigeon } | { kind: 'egg'; egg: Egg }

export function pickSceneTarget(ray: THREE.Raycaster, birds: Pigeon[], eggs: Egg[]): SceneTarget | null {
  const roots = new Map<THREE.Object3D, SceneTarget>()
  birds.forEach(bird => roots.set(bird.root, { kind: 'bird', bird }))
  eggs.filter(egg => egg.landed && !egg.selected).forEach(egg => roots.set(egg.mesh, { kind: 'egg', egg }))
  const meshes: THREE.Object3D[] = []
  roots.forEach((_target, root) => root.traverseVisible(object => {
    // Only actual shell/body surfaces are interactive, not decorative outlines.
    if (object instanceof THREE.Mesh && object.name !== 'egg-soft-outline') meshes.push(object)
  }))
  const hit = ray.intersectObjects(meshes, false)[0]
  if (!hit) return null
  let object: THREE.Object3D | null = hit.object
  while (object) {
    const target = roots.get(object)
    if (target) return target
    object = object.parent
  }
  return null
}
