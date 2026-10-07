import * as THREE from 'three'
import type { Egg } from './hold-effects'
import { createEggFragments, beginFragmentFall, updateFragmentFall, type ShellFragment } from './egg-fragments.ts'
import { FocusBackground } from './focus-background.ts'
import { createRoyalHatchling } from './hatchling.ts'

// Camera-space presentation keeps the egg centered on resize and prevents the
// enlarged shell from intersecting the floor or the flock behind it.
export class EggFocus {
  readonly scene = new THREE.Scene()
  readonly background = new FocusBackground()
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  egg: Egg | null = null
  shell: THREE.Mesh | null = null
  private elapsed = 0
  private start = new THREE.Vector3()
  private startScale = 1
  private startRotation = new THREE.Quaternion()
  private targetRotation = new THREE.Quaternion()
  private targetScale = 1
  private aspect = 1
  private centerOffset = new THREE.Vector3()
  private fragments: ShellFragment[] = []
  private fragmentRoot: THREE.Group | null = null
  private floorHeight = 0
  private hatchling: THREE.Group | null = null
  private hatchAge = 0
  private hatchScale = 0.35
  private floorRoot: THREE.Group | null = null
  private floorMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial> | null = null
  private focusedMaterial: THREE.MeshStandardMaterial | null = null
  private growingCracks: Array<{ group: THREE.Group; age: number }> = []
  get broken() { return this.fragmentRoot !== null }
  get hitCount() { return Number(this.egg?.mesh.userData.hits ?? 0) }

  constructor() {
    this.camera.position.z = 10
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#b5b0ab', 2.5))
    const light = new THREE.DirectionalLight('#fff8ee', 3)
    light.position.set(-3, 5, 6)
    light.castShadow = true
    light.shadow.mapSize.set(1024, 1024)
    Object.assign(light.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.1, far: 20 })
    light.shadow.normalBias = 0.015
    this.scene.add(light)
    const fill = new THREE.DirectionalLight('#dce5ff', 1.1)
    fill.position.set(6, 5, -8)
    this.scene.add(fill)
  }

  get ready() { return this.egg !== null && this.elapsed >= 0.9 }

  open(egg: Egg, worldCamera: THREE.OrthographicCamera) {
    if (this.egg || !egg.landed) return
    this.egg = egg
    this.background.amount = 0
    egg.hovered = false
    egg.selected = true
    egg.mesh.updateWorldMatrix(true, true)
    this.shell = egg.mesh.clone(true)
    const outline = this.shell.getObjectByName('egg-soft-outline')
    if (outline) outline.removeFromParent()
    this.focusedMaterial = (egg.mesh.material as THREE.MeshStandardMaterial).clone()
    this.shell.material = this.focusedMaterial
    this.shell.visible = true
    this.shell.castShadow = false
    this.scene.add(this.shell)
    const projected = egg.mesh.position.clone().project(worldCamera)
    this.start.set(projected.x * this.aspect, projected.y, 0)
    this.startScale = egg.mesh.scale.x * 2 * worldCamera.zoom / (worldCamera.top - worldCamera.bottom)
    this.startRotation.copy(worldCamera.quaternion).invert().multiply(egg.mesh.quaternion)
    this.shell.position.copy(this.start)
    this.shell.quaternion.copy(this.startRotation)
    this.shell.scale.setScalar(this.startScale)
    egg.mesh.visible = false
    this.elapsed = 0
    this.fit()
  }

  resize(width: number, height: number) {
    const oldAspect = this.aspect
    this.aspect = width / height
    this.start.x *= this.aspect / oldAspect
    this.camera.left = -this.aspect
    this.camera.right = this.aspect
    this.camera.updateProjectionMatrix()
    this.fit()
  }

  private fit() {
    if (!this.shell) return
    // Use roughly 60% of viewport bounding area, with a margin on narrow screens.
    this.targetRotation.setFromEuler(new THREE.Euler(0, -0.12, this.aspect >= 1 ? 1.35 : 0.08))
    const sample = new THREE.Mesh(this.shell.geometry)
    sample.quaternion.copy(this.targetRotation)
    const bounds = new THREE.Box3().setFromObject(sample, true)
    const size = bounds.getSize(new THREE.Vector3())
    this.targetScale = 0.7 * Math.min(Math.sqrt(0.6 * 4 * this.aspect / (size.x * size.y)),
      1.84 * this.aspect / size.x, 1.84 / size.y)
    this.centerOffset.copy(bounds.getCenter(new THREE.Vector3())).multiplyScalar(-this.targetScale)
    ;(sample.material as THREE.Material).dispose()
  }

  update(dt: number) {
    this.background.update(this.egg !== null, dt)
    if (!this.shell) return
    this.elapsed += dt
    const t = Math.min(1, this.elapsed / 0.9)
    const travel = 1 - (1 - t) ** 3
    // Growth accelerates late in the flight, as the egg reaches the center.
    const growth = t ** 3
    this.shell.position.lerpVectors(this.start, this.centerOffset, travel)
    this.shell.position.y += Math.sin(t * Math.PI) * 0.15
    this.shell.scale.setScalar(THREE.MathUtils.lerp(this.startScale, this.targetScale, growth))
    this.shell.quaternion.slerpQuaternions(this.startRotation, this.targetRotation, travel)
    this.shell.updateMatrixWorld(true)
    for (const crack of this.growingCracks) {
      crack.age += dt
      crack.group.traverse(object => {
        if (object instanceof THREE.Mesh) object.geometry.setDrawRange(0, Math.floor(Math.min(1, crack.age / 0.28) * object.geometry.index!.count / 3) * 3)
      })
    }
    if (this.fragmentRoot) {
      if (this.hatchling) {
        this.hatchAge += dt
        // The chick is already full-sized inside the egg; only the shell moves
        // away to reveal it. Keep a small idle sway without changing its size.
        this.hatchling.rotation.z = Math.sin(this.hatchAge * 3) * 0.025
      }
      this.fragmentRoot.position.copy(this.shell.position)
      this.fragmentRoot.scale.copy(this.shell.scale)
      updateFragmentFall(this.fragments, this.floorHeight, dt)
      this.floorRoot!.position.copy(this.fragmentRoot.position)
      this.floorRoot!.quaternion.copy(this.fragmentRoot.quaternion)
      this.floorRoot!.scale.copy(this.fragmentRoot.scale)
    }
  }

  hit(pointer: THREE.Vector2) {
    if (!this.shell || this.broken) return false
    this.camera.updateMatrixWorld(true)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(pointer, this.camera)
    return ray.intersectObject(this.shell, false).length > 0
  }

  crack(pointer = new THREE.Vector2(0, 0)) {
    if (!this.ready || !this.shell || !this.egg || this.broken) return
    this.camera.updateMatrixWorld(true)
    this.shell.updateMatrixWorld(true)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(pointer, this.camera)
    const hit = ray.intersectObject(this.shell, false)[0]
    if (!hit) return
    const impact = this.shell.worldToLocal(hit.point.clone())
    this.egg.mesh.userData.hits = this.hitCount + 1
    this.egg.cracked = true
    const cracks = new THREE.Group()
    cracks.name = `egg-impact-${this.hitCount}`
    cracks.userData.impact = impact.toArray()
    const material = new THREE.MeshStandardMaterial({ color: '#8f8168', roughness: 0.85 })
    const y = impact.y / 0.42, taper = 1 - y * 0.17
    const normal = new THREE.Vector3(impact.x / (0.273 * taper), y, impact.z / (0.273 * taper)).normalize()
    const tangent = new THREE.Vector3().crossVectors(normal, Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize()
    const second = normal.clone().cross(tangent).normalize()
    for (let branch = 0; branch < 5 + this.hitCount; branch++) {
      const angle = branch * 2.39996 + this.hitCount * 0.7
      const direction = tangent.clone().multiplyScalar(Math.cos(angle)).addScaledVector(second, Math.sin(angle))
      const path = [impact.clone().multiplyScalar(1.003)]
      for (let step = 1; step <= 9; step++) {
        const distance = step / 9 * (0.23 + this.hitCount * 0.18)
        const n = normal.clone().addScaledVector(direction, distance).addScaledVector(second, Math.sin(step * 2.1 + branch) * distance * 0.16).normalize()
        path.push(new THREE.Vector3(n.x * 0.273 * (1 - n.y * 0.17), n.y * 0.42, n.z * 0.273 * (1 - n.y * 0.17)).multiplyScalar(1.004))
      }
      const curve = new THREE.CurvePath<THREE.Vector3>()
      for (let i = 1; i < path.length; i++) curve.add(new THREE.LineCurve3(path[i - 1], path[i]))
      const geometry = new THREE.TubeGeometry(curve, 36, 0.0012 + this.hitCount * 0.00015, 4, false)
      geometry.setDrawRange(0, 0)
      cracks.add(new THREE.Mesh(geometry, material))
    }
    this.egg.mesh.add(cracks)
    const visibleCracks = cracks.clone(true)
    this.shell.add(visibleCracks)
    this.growingCracks.push({ group: visibleCracks, age: 0 })
    if (this.hitCount === 4) {
      const patches = createEggFragments(this.shell.geometry, this.focusedMaterial!, impact)
      this.fragments = patches.filter((fragment, index) => {
        if ([0, 2, 4, 7, 9, 11].includes(index)) return true
        fragment.mesh.geometry.dispose()
        return false
      })
      this.fragmentRoot = new THREE.Group()
      this.fragmentRoot.name = 'egg-fragments'
      this.fragments.forEach(fragment => { fragment.mesh.castShadow = true; fragment.mesh.receiveShadow = true; this.fragmentRoot!.add(fragment.mesh) })
      this.fragmentRoot.position.copy(this.shell.position)
      // A shallow view of a horizontal stage, independent of the egg's rotation.
      this.fragmentRoot.rotation.x = 0.3
      this.fragmentRoot.scale.copy(this.shell.scale)
      const localRotation = this.fragmentRoot.quaternion.clone().invert().multiply(this.shell.quaternion)
      this.floorHeight = beginFragmentFall(this.fragments, localRotation)
      // Raise the transparent stage to just below the screen center. Move the
      // fall together with it so no lower fragments begin beneath the floor.
      const raisedFloor = (-0.2 - this.shell.position.y) / this.shell.scale.y / Math.cos(0.3)
      const lift = raisedFloor - this.floorHeight
      this.fragments.forEach(fragment => { fragment.mesh.position.y += lift })
      this.floorHeight = raisedFloor
      this.floorRoot = new THREE.Group()
      this.floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.13, depthWrite: false }))
      this.floorMesh.rotation.x = -Math.PI / 2
      this.floorMesh.position.y = this.floorHeight - 0.001
      this.floorMesh.receiveShadow = true
      this.floorRoot.add(this.floorMesh)
      if (this.egg.mesh.userData.parentStyle === 'royal') {
        this.hatchling = createRoyalHatchling()
        this.hatchAge = 0
        this.hatchScale = Math.min(0.35, 0.95 / (1.2 * this.shell.scale.y))
        this.hatchling.position.set(0, this.floorHeight, 0.14)
        this.hatchling.scale.setScalar(this.hatchScale)
        this.floorRoot.add(this.hatchling)
        // The newborn occupies the center; the shell halves fall around it.
        this.fragments.forEach((fragment, i) => {
          const a = i * 2.39996
          fragment.mesh.geometry.scale(0.65, 0.65, 0.65)
          fragment.velocity.x += Math.cos(a) * 0.08
          fragment.velocity.z += Math.sin(a) * 0.08
        })
      }
      this.floorRoot.position.copy(this.fragmentRoot.position)
      this.floorRoot.quaternion.copy(this.fragmentRoot.quaternion)
      this.floorRoot.scale.copy(this.fragmentRoot.scale)
      this.scene.add(this.floorRoot)
      this.scene.add(this.fragmentRoot)
      this.shell.visible = false
    }
  }

  close() {
    if (this.egg) {
      this.egg.selected = false
      this.egg.mesh.visible = !this.broken
      if (this.broken) {
        // Keep a normal-sized, settled copy on the actual world floor, even
        // when the enlarged view is dismissed before its pieces finish falling.
        for (let i = 0; i < 20; i++) updateFragmentFall(this.fragments, this.floorHeight, 0.25)
        const remains = new THREE.Group()
        remains.name = 'ground-egg-fragments'
        remains.position.set(this.egg.mesh.position.x, 0.003, this.egg.mesh.position.z)
        this.fragments.forEach(fragment => {
          const piece = fragment.mesh.clone()
          piece.geometry = fragment.mesh.geometry.clone()
          piece.material = this.egg!.mesh.material
          piece.position.y -= this.floorHeight
          remains.add(piece)
        })
        if (this.hatchling) {
          this.hatchling.position.set(0, 0, 0.14)
          this.hatchling.scale.setScalar(this.hatchScale)
          remains.add(this.hatchling)
          this.hatchling = null
        }
        this.egg.mesh.parent?.add(remains)
        this.egg.mesh.removeFromParent()
      }
    }
    this.growingCracks.forEach(({ group }) => group.traverse(object => {
      if (object instanceof THREE.Mesh) object.geometry.setDrawRange(0, Infinity)
    }))
    this.growingCracks = []
    if (this.fragmentRoot) this.scene.remove(this.fragmentRoot)
    if (this.floorRoot) this.scene.remove(this.floorRoot)
    this.floorMesh?.geometry.dispose(); this.floorMesh?.material.dispose()
    this.floorRoot = null; this.floorMesh = null
    this.fragments.forEach(fragment => fragment.mesh.geometry.dispose())
    this.fragments = []; this.fragmentRoot = null
    this.focusedMaterial?.dispose(); this.focusedMaterial = null
    if (this.shell) this.scene.remove(this.shell)
    this.shell = null
    this.egg = null
  }

  render(renderer: THREE.WebGLRenderer) {
    if (!this.shell) return
    const autoClear = renderer.autoClear
    renderer.autoClear = false
    renderer.clearDepth()
    renderer.render(this.scene, this.camera)
    renderer.autoClear = autoClear
  }
}
