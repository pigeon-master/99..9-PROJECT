import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

export function dressMagic(body: THREE.Group, head: THREE.Group, legs: THREE.Group[], wings: THREE.Group[]) {
  const red = new THREE.MeshStandardMaterial({ color: '#ff1838', roughness: 0.3, side: THREE.DoubleSide })
  const redShade = new THREE.MeshStandardMaterial({ color: '#ed1230', roughness: 0.36, side: THREE.DoubleSide })
  const white = new THREE.MeshStandardMaterial({ color: '#fff6ee', roughness: 0.42, side: THREE.DoubleSide })
  const cream = new THREE.MeshStandardMaterial({ color: '#f5d9b0', roughness: 0.35, side: THREE.DoubleSide })
  const gold = new THREE.MeshStandardMaterial({ color: '#efbf62', metalness: 0.55, roughness: 0.24 })
  const ruby = new THREE.MeshPhysicalMaterial({ color: '#d41445', metalness: 0.23, roughness: 0.16, clearcoat: 1 })
  const hair = new THREE.MeshStandardMaterial({ color: '#ff70b5', roughness: 0.42, side: THREE.DoubleSide })
  const hairShade = new THREE.MeshStandardMaterial({ color: '#f75ca6', roughness: 0.45, side: THREE.DoubleSide })
  const feather = new THREE.MeshStandardMaterial({ color: '#86858b', roughness: 0.83 })
  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) {
    if (!geometry.index) { const indexed = mergeVertices(geometry); geometry.dispose(); geometry = indexed }
    const object = new THREE.Mesh(geometry, material)
    object.castShadow = object.receiveShadow = true; parent.add(object); return object
  }
  function oval(parent: THREE.Object3D, material: THREE.Material, p: number[], s: number[]) {
    const object = mesh(parent, new THREE.SphereGeometry(1, 16, 12), material)
    object.position.set(...p as [number, number, number]); object.scale.set(...s as [number, number, number]); return object
  }
  function tube(parent: THREE.Object3D, material: THREE.Material, p: number[][], radius: number) {
    return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p.map(v => new THREE.Vector3(...v))), 20, radius, 6, false), material)
  }
  function panel(parent: THREE.Object3D, material: THREE.Material, p: number[][], z: number) {
    const shape = new THREE.Shape(); shape.moveTo(p[0][0], p[0][1])
    p.slice(1).forEach(v => shape.lineTo(v[0], v[1])); shape.closePath()
    const object = mesh(parent, new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.008, bevelSegments: 2 }), material)
    object.position.z = z; return object
  }
  function jewel(parent: THREE.Object3D, material: THREE.Material, p: number[], size: number) {
    const rim = mesh(parent, new THREE.TorusGeometry(size, 0.008, 6, 20), gold)
    rim.position.set(...p as [number, number, number]); rim.scale.y = 1.23
    oval(parent, material, [p[0], p[1], p[2] + 0.006], [size * 0.85, size * 1.06, size * 0.45])
  }
  function heart(parent: THREE.Object3D, p: number[], size: number) {
    const group=new THREE.Group();group.position.set(...p as [number,number,number]);group.scale.setScalar(size);parent.add(group)
    const shape=new THREE.Shape();shape.moveTo(0,-0.55)
    shape.bezierCurveTo(-0.18,-0.35,-0.62,0.05,-0.45,0.34)
    shape.bezierCurveTo(-0.28,0.58,-0.05,0.43,0,0.29)
    shape.bezierCurveTo(0.05,0.43,0.28,0.58,0.45,0.34)
    shape.bezierCurveTo(0.62,0.05,0.18,-0.35,0,-0.55)
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:0.08,bevelEnabled:true,bevelSize:0.025,bevelThickness:0.025,bevelSegments:2,curveSegments:12})
    mesh(group,geometry,gold)
    const gem=mesh(group,geometry.clone(),ruby);gem.scale.set(0.8,0.8,1);gem.position.z=0.065
    return group
  }
  function bow(parent: THREE.Object3D,p:number[],size:number,material=cream) {
    const group=new THREE.Group();group.position.set(...p as [number,number,number]);group.scale.setScalar(size);parent.add(group)
    for(const side of [-1,1]) {
      const loop=oval(group,material,[side*0.32,0.055,0],[0.36,0.23,0.09]);loop.rotation.z=side*0.4
      panel(group,material,[[side*0.06,-0.02],[side*0.39,-0.65],[side*0.2,-0.55],[side*0.12,-0.66]],0)
    }
    heart(group,[0,0,0.08],0.32);return group
  }
  const dress = new THREE.Group(); dress.name = 'magic-dress'; body.add(dress)
  // A satin red corset wraps the torso and ends in a gilded V at the waist.
  const corsetProfile = [[0.27,0.77],[0.29,0.95],[0.285,1.17],[0.30,1.29]]
  const corset = mesh(dress, new THREE.LatheGeometry(corsetProfile.map(v => new THREE.Vector2(...v as [number, number])), 32), redShade)
  corset.position.z = 0.1; corset.scale.z = 1.15
  const frontBodice = panel(dress, red, [[-0.18,1.23],[0.18,1.23],[0.16,0.83],[0,0.71],[-0.16,0.83]], 0)
  const bodicePoints = frontBodice.geometry.getAttribute('position')
  for(let i=0;i<bodicePoints.count;i++) {
    const x=bodicePoints.getX(i)
    bodicePoints.setZ(i,bodicePoints.getZ(i)+0.1+0.36*Math.sqrt(Math.max(0,1-(x/0.31)**2)))
  }
  frontBodice.geometry.computeVertexNormals()
  for (const side of [-1, 1]) {
    oval(dress, red, [side * 0.135, 1.25, 0.4], [0.145, 0.125, 0.17])
    tube(dress, gold, [[side * 0.24,1.37,0.43],[side * 0.14,1.39,0.51],[side * 0.035,1.33,0.56]], 0.009)
    for(let i=0;i<3;i++) {
      const plume=oval(dress,white,[side*(0.105+i*0.043),1.25+i*0.036,0.571],[0.095-i*0.012,0.03,0.022])
      plume.rotation.z=side*(0.35+i*0.1)
    }
    tube(dress, gold, [[side * 0.18,0.84,0.414],[side * 0.19,1.01,0.422],[side * 0.23,1.17,0.445]], 0.005)
    oval(dress, gold, [side*0.34,1.41,0.25], [0.13,0.085,0.07])
    const beak=mesh(dress,new THREE.ConeGeometry(0.034,0.11,8),gold)
    beak.position.set(side*0.47,1.4,0.29);beak.rotation.z=-side*Math.PI/2
    jewel(dress, ruby, [side*0.36,1.445,0.321], 0.022)
    tube(dress, gold, [[side*0.26,1.36,0.3],[side*0.33,1.34,0.31],[side*0.36,1.39,0.31],[side*0.32,1.4,0.32]], 0.008)
  }
  heart(dress,[0,1.255,0.597],0.17).name='magic-winged-heart'
  tube(dress,gold,[[-0.19,0.84,0.416],[0,0.71,0.47],[0.19,0.84,0.416]],0.009)
  tube(dress,gold,[[0,0.735,0.47],[0,0.95,0.47],[0,1.19,0.58]],0.006)
  for(let i=0;i<16;i++) {
    const a=i/16*Math.PI*2
    oval(dress,white,[Math.sin(a)*0.18,1.48,0.27+Math.cos(a)*0.16],[0.018,0.025,0.014])
  }
  heart(dress,[0,1.47,0.435],0.052)
  // Red flared skirt, layered white ruffles and a fine lace hem.
  function skirt(y: number, height: number, rx: number, rz: number, lace: boolean, material: THREE.Material=white) {
    const vertices: number[] = [], uvs: number[] = [], indices: number[] = []
    const rings = 6, count = 80
    const point = (a: number, t: number) => {
      const pleat = Math.cos(a*16)*0.027*t
      return [Math.cos(a)*(rx+t*0.21+pleat), y-t*height+Math.cos(a*16)*0.012*t,
        0.1+Math.sin(a)*(rz+t*0.18+pleat)]
    }
    for (let row=0;row<=rings;row++) for (let i=0;i<=count;i++) {
      vertices.push(...point(i/count*Math.PI*2,row/rings)); uvs.push(i/count,row/rings)
      if (row<rings && i<count) { const a=row*(count+1)+i,b=a+count+1;indices.push(a,b,a+1,a+1,b,b+1) }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3))
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals()
    mesh(dress,geometry,material)
    if(material===red) tube(dress,gold,Array.from({length:49},(_,i)=>point(i/48*Math.PI*2,0.985)),0.006)
    if (lace) for(let i=0;i<40;i++) {
      const a=i/40*Math.PI*2,p=point(a,1)
      const loop=mesh(dress,new THREE.TorusGeometry(0.017,0.003,4,8),white)
      loop.position.set(p[0],p[1]-0.01,p[2]);loop.rotation.y=Math.PI/2-a
    }
  }
  skirt(0.73,0.31,0.31,0.25,false,red)
  skirt(0.64,0.32,0.27,0.21,true);skirt(0.53,0.27,0.32,0.26,true)
  for(const side of [-1,1]) for(let i=0;i<3;i++) {
    const frill=oval(dress,white,[side*(0.33+i*0.047),0.72-i*0.105,0.25],[0.14,0.035,0.17])
    frill.rotation.z=-side*0.28
  }
  // Loose pink waves grow from the whole scalp, not two tied ponytails.
  const hairstyle = new THREE.Group();hairstyle.name='magic-pink-waves';head.add(hairstyle)
  const cap=mesh(hairstyle,new THREE.SphereGeometry(1,24,16,0,Math.PI*2,0,Math.PI*0.57),hair)
  cap.position.set(0,1.94,0.43);cap.scale.set(0.25,0.14,0.245)
  const backHair=mesh(hairstyle,new THREE.SphereGeometry(1,24,16,Math.PI,Math.PI,0.2,2.4),hairShade)
  backHair.position.set(0,1.8,0.45);backHair.scale.set(0.255,0.24,0.28)
  function lock(points: number[][], width: number, depth: number, material = hair) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)))
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[]
    const rings=64,sides=8
    const frames=curve.computeFrenetFrames(rings,false)
    for(let row=0;row<=rings;row++) {
      const t=row/rings,center=curve.getPointAt(t),taper=0.06+Math.sin(Math.PI*t)**0.65
      for(let i=0;i<=sides;i++) {
        const a=i/sides*Math.PI*2
        const p=center.clone().addScaledVector(frames.normals[row],Math.cos(a)*width*taper).addScaledVector(frames.binormals[row],Math.sin(a)*depth*taper)
        positions.push(p.x,p.y,p.z);uvs.push(i/sides,t)
        if(row<rings&&i<sides){const k=row*(sides+1)+i,n=k+sides+1;indices.push(k,k+1,n,k+1,n+1,n)}
      }
    }
    const geometry=new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
    geometry.setIndex(indices);geometry.computeVertexNormals();mesh(hairstyle,geometry,material)
  }
  // Fine waves fall entirely behind the shoulders, leaving both arms exposed.
  // Separate curved locks replace the solid, straight-looking hair curtain.
  for(let i=0;i<41;i++){
    const a=1.95+i/40*(Math.PI*2-3.9)
    const phase=i*0.61
    const points=Array.from({length:25},(_,row)=>{
      const t=row/24,spread=Math.sin(Math.min(1,t*3)*Math.PI/2)
      const curl=Math.sin(Math.PI*t)**0.5
      const rx=0.18+0.18*spread,rz=0.12+0.54*spread
      return [Math.sin(a)*rx+Math.sin(t*Math.PI*10+phase)*0.039*curl,
        2.015-t*(1.52+0.055*Math.sin(i*0.8)),
        0.43-t*0.17+Math.cos(a)*rz+Math.cos(t*Math.PI*10+phase)*0.025*curl]
    })
    lock(points,0.026,0.022,i%5===0?hairShade:hair)
  }
  for(const side of [-1,1]) for(let i=0;i<2;i++){
    lock([[side*0.02,2.045,0.48],[side*(0.07+i*0.035),1.98,0.63],
      [side*(0.12+i*0.035),1.9,0.705],[side*(0.17+i*0.035),1.79,0.72]],0.032,0.022)
  }
  lock([[0,2.045,0.57],[0,1.96,0.685],[0.04,1.86,0.72],[0.095,1.77,0.74]],0.026,0.019)
  bow(hairstyle,[0.18,2.04,0.43],0.2).rotation.z=-0.2
  wings.forEach((wing,index)=>{
    const side=index===0?-1:1
    wing.clear();wing.position.set(side*0.33,1.29,0.13)
    // Muscular human arms, with distinct deltoids, biceps, triceps and forearms.
    oval(wing,feather,[side*0.015,-0.035,0.01],[0.105,0.115,0.105])
    tube(wing,feather,[[0,0,0],[side*0.045,-0.15,0.035],[side*0.09,-0.29,0.07]],0.069)
    const biceps=oval(wing,feather,[side*0.05,-0.16,0.075],[0.085,0.135,0.075]);biceps.rotation.z=side*0.25
    const triceps=oval(wing,feather,[side*0.055,-0.16,-0.02],[0.079,0.14,0.067]);triceps.rotation.z=side*0.25
    oval(wing,feather,[side*0.09,-0.29,0.07],[0.066,0.062,0.068])
    tube(wing,feather,[[side*0.09,-0.29,0.07],[side*0.145,-0.41,0.15],[side*0.19,-0.53,0.21]],0.045)
    const forearm=oval(wing,feather,[side*0.135,-0.375,0.125],[0.069,0.115,0.062]);forearm.rotation.z=side*0.38;forearm.rotation.x=-0.42
    const palm=oval(wing,feather,[side*0.20,-0.605,0.22],[0.055,0.075,0.028]);palm.rotation.z=side*0.18
    for(let i=0;i<4;i++){
      const x=side*(0.16+i*0.025),length=[0.09,0.125,0.115,0.085][i]
      tube(wing,feather,[[x,-0.65,0.22],[x+side*0.01,-0.65-length*0.55,0.235],[x+side*0.012,-0.65-length,0.26]],0.012)
    }
    tube(wing,feather,[[side*0.16,-0.585,0.22],[side*0.11,-0.62,0.245],[side*0.095,-0.665,0.27]],0.016)
    const cuff=mesh(wing,new THREE.CylinderGeometry(0.063,0.068,0.065,16),gold);cuff.position.set(side*0.185,-0.505,0.20)
    heart(wing,[side*0.185,-0.505,0.267],0.044)
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;oval(wing,white,[side*0.19+Math.cos(a)*0.064,-0.555,0.21+Math.sin(a)*0.065],[0.024,0.04,0.018])}
  })
  legs.forEach((hip,index)=>{
    hip.scale.y=1.7;hip.position.x=(index===0?-1:1)*0.18
    const foot=hip.children[0] as THREE.Group
    for(const child of foot.children) if(child instanceof THREE.Mesh && child.geometry.type!=='SphereGeometry') child.geometry.dispose()
    foot.clear()
    tube(foot,white,[[0,0.52,0],[0,0.29,-0.055],[0,0.065,0.055]],0.04)
    oval(foot,white,[0,0.31,0],[0.05,0.2,0.068])
    oval(foot,redShade,[0,0.025,0.14],[0.095,0.018,0.18])
    oval(foot,red,[0,0.065,0.135],[0.082,0.05,0.175])
    const toe=mesh(foot,new THREE.ConeGeometry(0.035,0.18,10),ruby);toe.position.set(0,0.055,0.31);toe.rotation.x=Math.PI/2+0.22
    const band=mesh(foot,new THREE.TorusGeometry(0.055,0.01,6,16),gold);band.rotation.x=Math.PI/2;band.position.y=0.48
    heart(foot,[0,0.48,0.069],0.045)
    heart(foot,[0,0.1,0.22],0.04)
    for(const side of [-1,1]) tube(foot,red,[[side*0.05,0.2,0.035],[-side*0.045,0.085,0.12],[side*0.055,0.05,0.2]],0.012)
    bow(foot,[index===0?-0.05:0.05,0.47,0.035],0.08,red)
  })
}
