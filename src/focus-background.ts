import * as THREE from 'three'

export class FocusBackground {
  amount = 0
  private target: THREE.WebGLRenderTarget | null = null
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private size = new THREE.Vector2()
  private material = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { picture: { value: null }, texel: { value: new THREE.Vector2() }, amount: { value: 0 } },
    vertexShader: 'varying vec2 uvScreen; void main(){ uvScreen=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader: `
      uniform sampler2D picture;
      uniform vec2 texel;
      uniform float amount;
      varying vec2 uvScreen;
      void main(){
        // Circular wave in screen space, reaching the farthest corner on arrival.
        vec2 aspect=vec2(texel.y/texel.x,1.0);
        float distanceFromCenter=length((uvScreen-0.5)*aspect)/length(0.5*aspect);
        float radius=amount*1.25;
        float wave=(1.0-smoothstep(radius-0.25,radius,distanceFromCenter))*smoothstep(0.0,0.18,amount);
        vec2 d=texel*6.0*wave;
        vec3 color=texture2D(picture,uvScreen).rgb*0.25;
        color+=(texture2D(picture,uvScreen+vec2(d.x,0.0)).rgb+texture2D(picture,uvScreen-vec2(d.x,0.0)).rgb)*0.125;
        color+=(texture2D(picture,uvScreen+vec2(0.0,d.y)).rgb+texture2D(picture,uvScreen-vec2(0.0,d.y)).rgb)*0.125;
        color+=(texture2D(picture,uvScreen+d).rgb+texture2D(picture,uvScreen-d).rgb+texture2D(picture,uvScreen+vec2(d.x,-d.y)).rgb+texture2D(picture,uvScreen+vec2(-d.x,d.y)).rgb)*0.0625;
        gl_FragColor=vec4(mix(color,vec3(1.0),wave*0.95),1.0);
        #include <colorspace_fragment>
      }`,
  })
  constructor() { this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material)) }
  update(active: boolean, dt: number) {
    this.amount = active ? Math.min(1, this.amount + dt / 0.9) : THREE.MathUtils.damp(this.amount, 0, 12, dt)
  }
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    if (this.amount < 0.001) { renderer.render(scene, camera); return }
    renderer.getDrawingBufferSize(this.size)
    const width = Math.max(1, Math.round(this.size.x / 2)), height = Math.max(1, Math.round(this.size.y / 2))
    if (!this.target) this.target = new THREE.WebGLRenderTarget(width, height)
    if (this.target.width !== width || this.target.height !== height) this.target.setSize(width, height)
    const previous = renderer.getRenderTarget()
    renderer.setRenderTarget(this.target)
    renderer.render(scene, camera)
    renderer.setRenderTarget(previous)
    this.material.uniforms.picture.value = this.target.texture
    this.material.uniforms.texel.value.set(1 / width, 1 / height)
    this.material.uniforms.amount.value = this.amount
    renderer.render(this.scene, this.camera)
  }
}
