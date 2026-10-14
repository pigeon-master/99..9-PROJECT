import './style.css'
import * as THREE from 'three'
import { createPigeon, type Pigeon } from './pigeon'
import { resetRoute, scatterFlock, walkFlock, setMovementBounds } from './movement'
import { Feeding, feedBiteInterval } from './feeding'
import { updateFlexibleNeck } from './neck'
import { updateBabyWalker } from './walker'
import { updateRoyalSwing } from './royal-motion'
import { HoldEffects } from './hold-effects'
import { EggFocus } from './egg-focus'
import { RoyalReward, palmCursor } from './royal-reward'
import { pickSceneTarget } from './picking'
import { setupTutorial } from './tutorial'
import { createTutorialPreviews } from './tutorial-previews'
import { flockLayout } from './responsive'
import { setupTouchGestures } from './touch-gestures'
import { startInteraction, type TrackedInteraction } from './analytics.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main aria-label="보행기, 메이드, 자르반 비둘기를 포함한 비둘기 100마리가 걸어 다니는 3D 공간">
    <div id="scene"></div>
    <button class="help-indicator" type="button" aria-label="조작 안내 열기" aria-haspopup="dialog" aria-controls="tutorial" aria-expanded="false"><span>?</span></button>
    <dialog id="tutorial" class="tutorial" aria-label="비둘기 조작 안내" tabindex="-1">
      <div class="tutorial-copy">
        <section class="tutorial-action">
          <div class="tutorial-pictures"><div class="tutorial-mouse" data-mouse="left" aria-hidden="true"></div><img data-preview="pigeon" alt="날개를 펼친 비둘기"></div>
          <p data-tutorial-move lang="en"></p>
        </section>
        <section class="tutorial-action">
          <div class="tutorial-pictures"><div class="tutorial-mouse" data-mouse="right" aria-hidden="true"></div><img data-preview="feed" alt="모이를 쪼아먹는 비둘기와 흩뿌려진 모이"></div>
          <p data-tutorial-feed lang="en"></p>
        </section>
        <p class="tutorial-hint" lang="ko">뭔가 이상한 비둘기는 인내심을 갖고 붙잡고 있으면<br>좋은 일이 생길지도...</p>
        <p class="tutorial-hint-en" lang="en">Something's weird about<br>some of these pigeons.<br>Hold on to them long enough,<br>and something good might happen...</p>
      </div>
    </dialog>
  </main>`

const container = document.querySelector<HTMLDivElement>('#scene')!
const helpIndicator = document.querySelector<HTMLButtonElement>('.help-indicator')!
const scene = new THREE.Scene()
scene.background = new THREE.Color('#ffffff')
const camera = new THREE.OrthographicCamera()
camera.position.set(0, 16, 22)
camera.lookAt(0, 0, 0)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.setClearColor(0xffffff)
container.appendChild(renderer.domElement)
renderer.domElement.setAttribute('aria-label', '비둘기를 누른 채 드래그하면 들어 올릴 수 있습니다.')
scene.add(new THREE.HemisphereLight(0xffffff, 0xb5b0ab, 2.5))
const sun = new THREE.DirectionalLight(0xfff8ee, 3)
sun.position.set(-4, 18, 6)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 50 })
sun.shadow.bias = -0.0003
sun.shadow.normalBias = 0.035
scene.add(sun)
const fill = new THREE.DirectionalLight(0xdce5ff, 1.1)
fill.position.set(6, 5, -8)
scene.add(fill)
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.12 }))
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)
const feeding = new Feeding(scene)
const holdEffects = new HoldEffects(scene)
const eggFocus = new EggFocus()
const royalReward = new RoyalReward(eggFocus)

let boundsX = 10
let boundsZ = 6
let viewportHalfHeight = 6
const viewSin = Math.sin(Math.atan2(16, 22))
const viewCos = Math.cos(Math.atan2(16, 22))
const silhouettes = new WeakMap<Pigeon, { radius: number; height: number }>()
const birds: Pigeon[] = []
const allBirds: Pigeon[] = []
// New appearances occupy slots in this fixed population, never add extra birds.
const population = 100
const specialStyles: Array<Pigeon['style']> = ['walker', 'maid', 'royal']
for (let i = 0; i < population; i++) {
  const style = specialStyles[i - (population - specialStyles.length)] ?? 'classic'
  const bird = createPigeon(i, style)
  scene.add(bird.root)
  allBirds.push(bird)
  // Start common shader compilation while the remaining models are built.
  // Unsupported browsers keep the normal rendering path; no frame or input
  // is deferred, and the same lights/materials are used for the first draw.
  if (i === 0 && renderer.extensions.has('KHR_parallel_shader_compile')) {
    void renderer.compileAsync(bird.root, camera, scene).catch(() => { /* First render remains the fallback. */ })
  }
  // Measure once, not once per frame; allow for animated heads and wings.
  bird.root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(bird.root)
  const radius = Math.hypot(Math.max(Math.abs(box.min.x), Math.abs(box.max.x)), Math.max(Math.abs(box.min.z), Math.abs(box.max.z)))
  silhouettes.set(bird, { radius: radius + 0.12, height: box.max.y + 0.18 + (bird.style === 'royal' || bird.style === 'magic' || bird.style === 'maid' ? 0.336 : 0) })
}
function containBird(bird: Pigeon) {
  const shape = silhouettes.get(bird)!
  const radius = shape.radius
  const xLimit = Math.max(0.1, boundsX - radius)
  const minZ = (-viewportHalfHeight + (bird.root.position.y + shape.height) * viewCos) / viewSin + radius
  const maxZ = (viewportHalfHeight + bird.root.position.y * viewCos) / viewSin - radius
  const pos = bird.root.position
  const x = THREE.MathUtils.clamp(pos.x, -xLimit, xLimit)
  const z = THREE.MathUtils.clamp(pos.z, minZ, maxZ)
  const changed = Math.abs(pos.x - x) + Math.abs(pos.z - z) > 0.001
  pos.x = x; pos.z = z
  return changed
}
let scattered = false
let viewZoom = 1
let pendingZoom: number | null = null
let baseHalfWidth = 10, baseHalfHeight = 6
function updateCameraView() {
  viewZoom = THREE.MathUtils.clamp(viewZoom, 0.65, Math.min(2, baseHalfWidth / 3.4, baseHalfHeight / 3.4))
  Object.assign(camera, { left: -baseHalfWidth / viewZoom, right: baseHalfWidth / viewZoom,
    top: baseHalfHeight / viewZoom, bottom: -baseHalfHeight / viewZoom })
  camera.updateProjectionMatrix()
  // Leave room for the full shell, including its 1.5x hover enlargement.
  holdEffects.setEggBounds({
    minX: camera.left + 0.66, maxX: camera.right - 0.66,
    minZ: (-camera.top + 1.3 * viewCos) / viewSin + 0.66,
    maxZ: camera.top / viewSin - 0.66,
  })
}
function resize() {
  const width = container.clientWidth, height = container.clientHeight
  const layout = flockLayout(width, height, matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0)
  {
    const nextBirds = [...allBirds.filter(b => b.style === 'classic').slice(0, layout.count - specialStyles.length), ...allBirds.filter(b => b.style !== 'classic')]
    if (nextBirds.length !== birds.length) { release('layout_change'); scattered = false }
    for (const bird of allBirds) {
      bird.root.visible = nextBirds.includes(bird)
      if (!bird.root.visible) feeding.cancel(bird)
    }
    birds.splice(0, birds.length, ...nextBirds)
    document.querySelector('main')!.setAttribute('aria-label', `희귀 비둘기 3마리를 포함한 비둘기 ${birds.length}마리가 걸어 다니는 3D 공간`)
    baseHalfWidth = layout.halfWidth; baseHalfHeight = layout.halfHeight
    if (!layout.compact) viewZoom = 1
  }
  pendingZoom = null
  const halfWidth = baseHalfWidth
  const halfHeight = baseHalfHeight
  viewportHalfHeight = halfHeight
  // Tall viewports need the orthographic camera farther back so even bottom-edge
  // pointer rays start above the floor and can intersect it in front of the camera.
  const cameraDistance = Math.max(1, (halfHeight / 0.65 * viewCos + 4) / 16)
  camera.position.set(0, 16 * cameraDistance, 22 * cameraDistance)
  camera.lookAt(0, 0, 0)
  Object.assign(camera, { near: 0.1, far: Math.max(100, camera.position.length() * 2 + halfHeight * 2 / 0.65) })
  updateCameraView()
  const pixelRatio = Math.min(devicePixelRatio, 2)
  if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio)
  renderer.setSize(width, height)
  eggFocus.resize(width, height)
  const oldX = boundsX, oldZ = boundsZ
  // Use the floor projection of the full viewport, including the former footer.
  boundsX = halfWidth
  boundsZ = halfHeight / Math.sin(Math.atan2(16, 22))
  // Existing grain belongs to the floor, not the camera viewport. Keep its
  // landing and launch coordinates intact when zooming or resizing; only newly
  // scattered feed is constrained to the currently visible area in dropFood().
  sun.shadow.camera.left = -Math.max(boundsX, boundsZ) - 5
  sun.shadow.camera.right = Math.max(boundsX, boundsZ) + 5
  sun.shadow.camera.top = Math.max(boundsX, boundsZ) + 5
  sun.shadow.camera.bottom = -Math.max(boundsX, boundsZ) - 5
  sun.shadow.camera.updateProjectionMatrix()
  for (const bird of birds) {
    const shape = silhouettes.get(bird)!
    setMovementBounds(bird, {
      minX: -boundsX + shape.radius, maxX: boundsX - shape.radius,
      minZ: (-viewportHalfHeight + shape.height * viewCos) / viewSin + shape.radius,
      maxZ: viewportHalfHeight / viewSin - shape.radius,
    })
    bird.root.position.x = THREE.MathUtils.clamp(bird.root.position.x / oldX * boundsX, -boundsX, boundsX)
    bird.root.position.z = THREE.MathUtils.clamp(bird.root.position.z / oldZ * boundsZ, -boundsZ, boundsZ)
    resetRoute(bird, boundsX, boundsZ, birds)
  }
  if (!scattered) { scatterFlock(birds, boundsX, boundsZ); scattered = true }
  birds.forEach(containBird)
}
window.addEventListener('resize', () => resize())

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const dragPoint = new THREE.Vector3()
const dragOffset = new THREE.Vector3()
let held: Pigeon | null = null
let activePointer: number | null = null
let scattering = false
let grabTracking: TrackedInteraction | null = null
let feedTracking: TrackedInteraction | null = null
let zoomTracking: TrackedInteraction | null = null
let scatteredGrains = 0, scatterBatches = 0
let pointerInside = false
const foodPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const foodPoint = new THREE.Vector3()
const lastFoodPoint = new THREE.Vector3()
function finishFeed(reason: string) {
  feedTracking?.end({ end_reason: reason, grains_count: scatteredGrains, scatter_batches: scatterBatches })
  feedTracking = null
}
function dropFood(start = false, inputMethod = 'mouse') {
  if (!raycaster.ray.intersectPlane(foodPlane, foodPoint)) return
  const foodX = camera.right - 0.1
  const foodZ = camera.top / viewSin - 0.1
  // Bound the landing point, rather than reserving a large empty strip for
  // the airborne arc. Use the whole current view at every zoom level.
  const minFoodZ = -camera.top / viewSin + 0.1
  foodPoint.x = THREE.MathUtils.clamp(foodPoint.x, -foodX, foodX)
  foodPoint.z = THREE.MathUtils.clamp(foodPoint.z, minFoodZ, foodZ)
  if (start) {
    finishFeed('restarted')
    scatteredGrains = 0; scatterBatches = 0
    feedTracking = startInteraction('feed_scatter', { input_method: inputMethod })
    const added = feeding.scatter(foodPoint.x, foodPoint.z, foodX, foodZ, minFoodZ)
    scatteredGrains += added
    if (added > 0) scatterBatches++
    lastFoodPoint.copy(foodPoint)
    return
  }
  let distance = lastFoodPoint.distanceTo(foodPoint)
  while (distance >= 0.58) {
    lastFoodPoint.lerp(foodPoint, 0.58 / distance)
    const added = feeding.scatter(lastFoodPoint.x, lastFoodPoint.z, foodX, foodZ, minFoodZ)
    scatteredGrains += added
    if (added > 0) scatterBatches++
    distance = lastFoodPoint.distanceTo(foodPoint)
  }
}
function updatePointer(event: { clientX: number; clientY: number }) {
  pointerInside = true
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
  raycaster.setFromCamera(pointer, camera)
}
function pick() {
  scene.updateMatrixWorld(true)
  raycaster.setFromCamera(pointer, camera)
  return pickSceneTarget(raycaster, birds, holdEffects.eggs)
}
function updateHover() {
  holdEffects.eggs.forEach(egg => { egg.hovered = false })
  if (!pointerInside || held || scattering) return
  if (eggFocus.egg) {
    renderer.domElement.style.cursor = eggFocus.awaitingJuniorClick
      ? eggFocus.hitHatchling(pointer) ? palmCursor : 'default'
      : !eggFocus.ready ? 'wait' : eggFocus.hit(pointer) ? 'pointer' : 'default'
    return
  }
  const target = pick()
  if (target?.kind === 'egg') target.egg.hovered = true
  renderer.domElement.style.cursor = target?.kind === 'egg' ? 'pointer' : target?.kind === 'bird' ? 'grab' : 'default'
}
renderer.domElement.addEventListener('pointerdown', event => {
  if (royalReward.active) return
  if (activePointer !== null || (event.button !== 0 && event.button !== 2)) return
  updatePointer(event)
  if (eggFocus.egg) {
    if (event.button === 0 && eggFocus.ready) {
      if (eggFocus.awaitingJuniorClick) {
        if (eggFocus.hitHatchling(pointer)) royalReward.start(event.pointerType || 'mouse')
      } else if (eggFocus.hit(pointer)) eggFocus.crack(pointer)
      else eggFocus.close('outside_click')
    }
    return
  }
  if (event.button === 2) {
    event.preventDefault()
    scattering = true
    activePointer = event.pointerId
    renderer.domElement.setPointerCapture(event.pointerId)
    renderer.domElement.style.cursor = 'crosshair'
    dropFood(true, event.pointerType || 'mouse')
    return
  }
  const target = pick()
  if (target?.kind === 'egg') {
    eggFocus.open(target.egg, camera, event.pointerType || 'mouse')
    updateHover()
    return
  }
  held = target?.kind === 'bird' ? target.bird : null
  if (!held) return
  feeding.cancel(held)
  activePointer = event.pointerId
  renderer.domElement.setPointerCapture(event.pointerId)
  dragPlane.constant = -held.root.position.y
  raycaster.ray.intersectPlane(dragPlane, dragPoint)
  dragOffset.copy(held.root.position).sub(dragPoint)
  held.target.copy(held.root.position)
  grabTracking = startInteraction('pigeon_grab', { character_type: held.style, input_method: event.pointerType || 'mouse' })
  renderer.domElement.style.cursor = 'grabbing'
})
renderer.domElement.addEventListener('pointermove', event => {
  if (activePointer !== null && event.pointerId !== activePointer) return
  updatePointer(event)
  if (scattering) {
    if (!(event.buttons & 2)) { release('button_released'); return }
    dropFood()
    return
  }
  if (held) {
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
      held.target.copy(dragPoint).add(dragOffset)
      held.target.x = THREE.MathUtils.clamp(held.target.x, -boundsX, boundsX)
      held.target.z = THREE.MathUtils.clamp(held.target.z, -boundsZ, boundsZ)
    }
  } else updateHover()
})
function release(reason = 'released') {
  grabTracking?.end({ end_reason: reason })
  grabTracking = null
  finishFeed(reason)
  holdEffects.release()
  scattering = false
  if (held) resetRoute(held, boundsX, boundsZ, birds)
  held = null
  renderer.domElement.style.cursor = 'default'
  const id = activePointer
  activePointer = null
  if (id !== null && renderer.domElement.hasPointerCapture(id)) renderer.domElement.releasePointerCapture(id)
}
renderer.domElement.addEventListener('pointerup', () => release('released'))
renderer.domElement.addEventListener('contextmenu', event => event.preventDefault())
renderer.domElement.addEventListener('pointercancel', () => release('cancelled'))
renderer.domElement.addEventListener('lostpointercapture', event => { if (event.pointerType !== 'touch') release('capture_lost') })
window.addEventListener('blur', () => release('blur'))
renderer.domElement.addEventListener('pointerleave', () => {
  pointerInside = false
  holdEffects.eggs.forEach(egg => { egg.hovered = false })
})
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !eggFocus.awaitingJuniorClick && !royalReward.active) eggFocus.close('escape')
})
setupTutorial(() => { release('tutorial_open'); if (!eggFocus.awaitingJuniorClick && !royalReward.active) eggFocus.close('tutorial_open') }, () => createTutorialPreviews(birds.find(b => b.style === 'classic')!))
setupTouchGestures(renderer.domElement, {
  blocked: () => !!eggFocus.egg || royalReward.active,
  release: () => release('touch_gesture'),
  zoom: () => pendingZoom ?? viewZoom,
  setZoom: value => { pendingZoom = value },
  feed: (x, y, start) => { updatePointer({ clientX: x, clientY: y }); dropFood(start, 'touch') },
  gestureStart: mode => {
    if (mode === 'pinch') zoomTracking = startInteraction('pinch_zoom', { input_method: 'touch', zoom_start: pendingZoom ?? viewZoom })
  },
  gestureEnd: (mode, reason) => {
    if (mode === 'feed') finishFeed(reason)
    else {
      zoomTracking?.end({ end_reason: reason, zoom_end: THREE.MathUtils.clamp(pendingZoom ?? viewZoom, 0.65, Math.min(2, baseHalfWidth / 3.4, baseHalfHeight / 3.4)) })
      zoomTracking = null
    }
  },
})
resize()

let previous = performance.now()
let animationFrame = 0
let contextLost = false
let elapsed = 0
const struggleAmounts = new WeakMap<Pigeon, number>()
const peckAmounts = new WeakMap<Pigeon, number>()
function animate(now: number) {
  if (document.hidden || contextLost) { animationFrame = 0; return }
  // Coalesce pointer events into one cheap camera update per rendered frame.
  // Zoom never rebuilds the canvas or changes flock routes, bounds or positions.
  if (pendingZoom !== null) {
    viewZoom = pendingZoom; pendingZoom = null
    updateCameraView()
  }
  const realDt = Math.max(0, (now - previous) / 1000)
  const dt = Math.min(realDt, 0.04)
  previous = now
  elapsed += dt
  feeding.update(birds, held, boundsX, boundsZ, dt)
  walkFlock(birds, held, boundsX, boundsZ, dt, feeding.controlled)
  for (const bird of birds) {
    const pos = bird.root.position
    const lifting = held === bird
    const upright = bird.style === 'royal' || bird.style === 'magic' || bird.style === 'maid'
    if (lifting) {
      pos.x = THREE.MathUtils.damp(pos.x, bird.target.x, 13, dt)
      pos.z = THREE.MathUtils.damp(pos.z, bird.target.z, 13, dt)
      pos.y = THREE.MathUtils.damp(pos.y, 2.8, 9, dt)
      bird.velocityY = 0
    } else if (pos.y > 0) {
      bird.velocityY -= 13 * dt
      pos.y = Math.max(0, pos.y + bird.velocityY * dt)
    }
    const meal = feeding.meals.get(bird)
    const walking = !lifting && pos.y === 0 && (!meal || !feeding.controlled.has(bird) || meal.mode === 'run')
    const peck = THREE.MathUtils.damp(peckAmounts.get(bird) ?? 0, meal?.mode === 'eat' ? 1 : 0, 16, dt)
    peckAmounts.set(bird, peck)
    const phase = bird.phase
    const struggle = THREE.MathUtils.damp(struggleAmounts.get(bird) ?? 0, lifting ? 1 : 0, lifting ? 14 : 10, dt)
    struggleAmounts.set(bird, struggle)
    const flutter = elapsed * (35 + bird.id % 5) + bird.id * 1.7 + Math.sin(elapsed * 9 + bird.id) * 0.35
    const squirm = Math.sin(elapsed * 13 + bird.id) + Math.sin(elapsed * 21 + bird.id * 2) * 0.35
    bird.body.position.y = (upright ? 0.336 * (1 - peck) : 0) + (walking ? Math.sin(phase * 2) * 0.024 : 0) + Math.sin(flutter * 2) * 0.055 * struggle
    bird.body.rotation.x = struggle * (0.13 + Math.sin(elapsed * 17 + bird.id) * 0.11)
    bird.body.rotation.y = struggle * squirm * 0.16
    bird.body.rotation.z = (walking ? Math.sin(phase) * 0.028 : 0) + struggle * squirm * 0.12
    // A slow hold followed by a fast forward thrust, synchronized with the feet.
    const stride = (phase / Math.PI) % 1
    const bob = stride < 0.72 ? 0.12 - stride * 0.31 : -0.103 + (stride - 0.72) / 0.28 * 0.223
    const peckPulse = meal?.mode === 'eat' ? (1 + Math.cos(meal.biteTimer / feedBiteInterval * Math.PI * 2)) / 2 : 0
    bird.neck.position.y = -peck * (0.74 + peckPulse * 0.1)
    bird.neck.position.z = THREE.MathUtils.damp(bird.neck.position.z, peck > 0.01 ? -peck * (0.72 + peckPulse * 0.08 - (bird.walker ? 0.48 : 0)) : walking ? bob : 0, 28, dt)
    bird.neck.rotation.x = (1 - struggle) * 0.02 * Math.sin(phase) + struggle * (-0.15 + Math.sin(flutter * 0.65) * 0.09)
    bird.neck.rotation.y = struggle * Math.sin(elapsed * 16 + bird.id) * 0.13
    bird.neck.rotation.x = THREE.MathUtils.lerp(bird.neck.rotation.x, 0.53 + peckPulse * 0.11, peck)
    if (meal?.mode === 'turn' || meal?.mode === 'run') {
      const look = Math.atan2(meal.grain.x - pos.x, meal.grain.z - pos.z) - bird.root.rotation.y
      bird.neck.rotation.y = THREE.MathUtils.clamp(Math.atan2(Math.sin(look), Math.cos(look)), -0.45, 0.45)
    }
    bird.legs.forEach((leg, index) => {
      const step = phase + index * Math.PI
      const kick = elapsed * (17 + index * 2) + bird.id + index * Math.PI
      leg.rotation.x = (walking ? Math.sin(step) * 0.58 : 0) * (1 - struggle) + struggle * (0.3 + Math.sin(kick) * 0.85)
      leg.rotation.z = struggle * (index === 0 ? -1 : 1) * (0.16 + Math.sin(kick * 1.3) * 0.12)
      leg.position.y = (upright ? 0.816 : 0.48) + (walking ? Math.max(0, Math.cos(step)) * 0.07 : 0) + struggle * Math.max(0, Math.sin(kick)) * 0.13
    })
    updateFlexibleNeck(bird.neckBridge, bird.neck)
    bird.wings.forEach((wing, index) => {
      const side = index === 0 ? -1 : 1
      // Unfold backward-pointing feathers outward before the vertical wing stroke.
      wing.rotation.order = 'ZXY'
      wing.rotation.y = -side * 1.25 * struggle
      wing.rotation.x = Math.cos(flutter + index * 0.18) * 0.18 * struggle
      wing.rotation.z = side * (0.2 + Math.sin(flutter + index * 0.18) * 1.05) * struggle
      wing.scale.z = 1 + struggle * 0.48
      if (upright) {
        wing.rotation.y = 0
        wing.rotation.x = (walking ? Math.sin(phase + index * Math.PI) * 0.26 : 0) + Math.sin(flutter) * 0.4 * struggle
        wing.rotation.z = side * (0.05 + struggle * (0.3 + Math.sin(flutter) * 0.35))
        wing.scale.z = 1
      }
    })
    if (bird.style === 'royal') updateRoyalSwing(bird, walking && !meal && struggle < 0.01, dt)
    if (!feeding.controlled.has(bird) || lifting || pos.y > 0) containBird(bird)
    if (bird.walker) updateBabyWalker(bird.walker, bird.root, !lifting && pos.y === 0, dt)
  }
  holdEffects.update(held, realDt)
  eggFocus.update(realDt)
  royalReward.update()
  const helpDisabled = eggFocus.awaitingJuniorClick || royalReward.active
  if (helpIndicator.disabled !== helpDisabled) helpIndicator.disabled = helpDisabled
  updateHover()
  eggFocus.background.render(renderer, scene, camera)
  eggFocus.render(renderer)
  animationFrame = requestAnimationFrame(animate)
}
function pauseAnimation() {
  cancelAnimationFrame(animationFrame)
  animationFrame = 0
}
function resumeAnimation() {
  if (document.hidden || contextLost || animationFrame) return
  // Preserve the simulation state while suspended; do not feed the hidden
  // interval into hold timers, rolling physics or the egg focus on return.
  previous = performance.now()
  animationFrame = requestAnimationFrame(animate)
}
document.addEventListener('visibilitychange', () => document.hidden ? pauseAnimation() : resumeAnimation())
window.addEventListener('pagehide', pauseAnimation)
window.addEventListener('pageshow', resumeAnimation)
renderer.domElement.addEventListener('webglcontextlost', () => { contextLost = true; pauseAnimation() })
renderer.domElement.addEventListener('webglcontextrestored', () => { contextLost = false; resumeAnimation() })
animationFrame = requestAnimationFrame(animate)
