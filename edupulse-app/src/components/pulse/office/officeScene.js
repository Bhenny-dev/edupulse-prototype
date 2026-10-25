import * as T from 'three'
import { BUDDIES } from '../../../agents/buddies'

export function createOffice(host, state, lost) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setClearColor(0xeef5f7, 1)
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.prepend(renderer.domElement)
  const scene = new T.Scene(), camera = new T.OrthographicCamera(-9, 9, 6, -6, .1, 80)
  camera.position.set(13, 15, 18); camera.lookAt(0, 0, 0)
  scene.add(new T.HemisphereLight(0xffffff, 0xb4c7cf, 2.6))
  const sun = new T.DirectionalLight(0xfff4df, 3.5); sun.position.set(-5, 12, 8); sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); sun.shadow.normalBias = .035
  scene.add(sun)
  const materials = new Map(), geometries = new Set()
  function mat(color, roughness = .7) { const key = `${color}:${roughness}`; if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness })); return materials.get(key) }
  function mesh(geometry, color, parent, x = 0, y = 0, z = 0) { geometries.add(geometry); const item = new T.Mesh(geometry, mat(color)); item.position.set(x, y, z); item.castShadow = true; item.receiveShadow = true; parent.add(item); return item }
  const box = (parent, x, y, z, w, h, d, color) => mesh(new T.BoxGeometry(w, h, d), color, parent, x, y, z)
  const sphere = (parent, x, y, z, radius, color, sx = 1, sy = 1, sz = 1) => { const item = mesh(new T.SphereGeometry(radius, 16, 12), color, parent, x, y, z); item.scale.set(sx, sy, sz); return item }
  const cylinder = (parent, x, y, z, r, h, color) => mesh(new T.CylinderGeometry(r, r, h, 16), color, parent, x, y, z)
  box(scene, 0, -.18, 0, 13.5, .35, 10, '#d3e1df')
  box(scene, 0, .02, 0, 13.2, .08, 9.7, '#efebe2')
  // Open dollhouse walls keep the whole floor visible without camera collisions.
  box(scene, 0, 1.35, -4.9, 13.5, 2.7, .15, '#d5e7e7')
  box(scene, -6.7, 1.35, 0, .15, 2.7, 9.8, '#dbe8e4')
  for (const x of [-4, 0, 4]) { box(scene, x, 1.65, -4.79, 2.4, 1.4, .08, '#9dcfdb'); box(scene, x, 1.65, -4.71, .05, 1.4, .05, '#ffffff'); box(scene, x, 1.65, -4.7, 2.4, .05, .05, '#ffffff') }
  // Review board, bookshelves, plants and a common-room rug.
  box(scene, -6.55, 1.65, -.7, .1, 1.3, 2.3, '#ffffff')
  for (let i = 0; i < 5; i++) box(scene, -6.47, 1.35 + (i % 2) * .5, -1.45 + i * .35, .03, .28, .25, ['#efc982', '#9ad4cd', '#d1b4e3'][i % 3])
  box(scene, 3.9, .08, 3.1, 4.5, .03, 2.5, '#b9d9dc')
  const lounge = new T.Group(); lounge.position.set(4, 0, 3.4); scene.add(lounge)
  box(lounge, 0, .32, .1, 2.2, .35, .9, '#89b8bd'); box(lounge, 0, .8, -.38, 2.2, .75, .2, '#89b8bd')
  for (const x of [-1.05, 1.05]) box(lounge, x, .65, .1, .22, .65, 1.05, '#89b8bd')
  cylinder(scene, 2.8, .4, 2.3, .5, .08, '#bd9470'); cylinder(scene, 2.8, .2, 2.3, .09, .4, '#566b75')
  box(scene, -4.9, .55, 3.6, 1.9, 1, .6, '#c6a17c'); box(scene, -5.4, 1.25, 3.6, .5, .5, .45, '#3b5262')
  cylinder(scene, -5.4, 1.02, 3.9, .16, .06, '#ffffff')
  for (const [x,z] of [[-6,-4],[6,-4],[-6,4],[6,4]]) { cylinder(scene,x,.3,z,.25,.5,'#bd9270'); for(let i=0;i<5;i++) { const leaf=sphere(scene,x+Math.sin(i*2)*.15,.75+i*.08,z+Math.cos(i*2)*.15,.25,'#6aa791',.45,1.7,.8); leaf.rotation.z=Math.sin(i)*.5 } }
  const desks = [[-4,-2], [0,-2], [4,-2], [-4,1], [0,1], [4,1]]
  const breaks = [[-5,2.7],[-2.1,3.4],[3.6,3.55],[-3.8,3.3],[4.4,3.55],[.1,3.4]]
  for(const x of [-2.1,.1]) {sphere(scene,x,.22,3.4,.42,'#d8c3aa',1,.5,.9);cylinder(scene,x,.09,3.4,.23,.18,'#a58d72')}
  const rigs = [], clickable = [], steam = []
  function mug(parent, x, y, z, color) {
    cylinder(parent, x,y,z,.12,.22,color); cylinder(parent,x,y+.115,z,.095,.008,'#6a4533')
    const handle = mesh(new T.TorusGeometry(.08,.025,6,12),color,parent,x+.13,y,z); handle.rotation.y=Math.PI/2
    for(let i=0;i<3;i++) { const puff=sphere(parent,x,y+.3+i*.12,z,.04,'#e6e9e5',.8,1.8,.8); puff.material=new T.MeshStandardMaterial({color:'#ffffff',transparent:true,opacity:.35,depthWrite:false}); materials.set(`steam-${steam.length}`,puff.material); steam.push({puff,y:y+.3,phase:i*1.1}) }
  }
  BUDDIES.forEach((buddy, index) => {
    const [x,z] = desks[index], desk = new T.Group(); desk.position.set(x,0,z); scene.add(desk)
    box(desk,0,.85,0,2.45,.12,1.05,'#cfae8b')
    for(const dx of [-1,1]) for(const dz of [-.35,.35]) box(desk,dx,.4,dz,.09,.8,.09,'#62747a')
    const screen=box(desk,0,1.23,-.27,.78,.47,.08,'#344e60'); screen.material=screen.material.clone(); materials.set(`monitor-${index}`,screen.material); box(desk,0,1.24,-.22,.67,.35,.02,buddy.color)
    box(desk,0,.99,-.26,.08,.3,.08,'#516874'); box(desk,0,.94,.15,.65,.035,.23,'#f0f4ed')
    const papers=[]; for(let j=0;j<4;j++) { const paper=box(desk,.8,.94+j*.045,.12,.4,.035,.42,'#fffff9'); paper.rotation.y=(j%2)*.08; papers.push(paper) }
    mug(desk,-.84,1.05,.15,'#ffffff')
    // Rounded, articulated toy anatomy: separate hips, knees, shoulders, elbows and hands.
    const person = new T.Group(); person.position.set(x,.02,z+1); person.rotation.y=Math.PI; scene.add(person)
    const torso=sphere(person,0,1.02,0,.32,buddy.color,1,1.3,.76)
    const head = new T.Group(); head.position.y=1.55; person.add(head)
    sphere(head,0,0,0,.26,'#edc6a5',1,1.06,.95)
    sphere(head,0,.16,-.02,.245,['#514a46','#53445d','#a7774b','#4b3f42','#526165','#685447'][index],1,.63,1)
    for(const ex of [-.09,.09]) { sphere(head,ex,.01,.229,.025,'#263d50'); sphere(head,ex-.007,.018,.25,.008,'#ffffff') }
    const nose=sphere(head,0,-.045,.255,.035,'#dcaa8c'); nose.scale.y=.8
    const smile=mesh(new T.TorusGeometry(.055,.009,5,16,Math.PI),'#9d6f60',head,0,-.09,.239); smile.rotation.z=Math.PI
    const arms=[], legs=[]
    for(const side of [-1,1]) {
      const shoulder=new T.Group(); shoulder.position.set(side*.29,1.21,0); person.add(shoulder)
      const upper=sphere(shoulder,0,-.16,0,.105,buddy.color,.9,1.8,.9)
      const elbow=new T.Group(); elbow.position.y=-.31; shoulder.add(elbow)
      sphere(elbow,0,-.13,0,.08,'#edc6a5',1,1.8,1); sphere(elbow,0,-.28,0,.09,'#edc6a5')
      arms.push({shoulder,elbow,upper})
      const hip=new T.Group(); hip.position.set(side*.13,.8,0); person.add(hip)
      sphere(hip,0,-.17,0,.105,'#456174',1,1.9,1)
      const knee=new T.Group(); knee.position.y=-.34; hip.add(knee)
      sphere(knee,0,-.17,0,.085,'#456174',1,1.9,1); sphere(knee,0,-.35,.07,.11,'#f6f2e9',1,.6,1.5)
      legs.push({hip,knee})
    }
    const badge=box(person,0,1.1,.255,.13,.16,.025,'#ffffff')
    const handCup=new T.Group();arms[0].elbow.add(handCup);mug(handCup,0,-.26,.08,'#faf5e8')
    box(desk,0,.44,1.05,.65,.1,.6,'#809ca3'); box(desk,0,.75,1.35,.65,.55,.1,'#809ca3')
    const ring=mesh(new T.TorusGeometry(.48,.035,6,32),buddy.color,scene,x,.09,z+1); ring.rotation.x=-Math.PI/2
    person.traverse(object => { object.userData.buddy=buddy.id; if(object.isMesh) clickable.push(object) })
    rigs.push({ buddy,person,head,torso,arms,legs,handCup,ring,papers,screen,badge,home:new T.Vector3(x,.02,z+1),rest:new T.Vector3(breaks[index][0],.02,breaks[index][1]),seated:[1,2,4,5].includes(index),sit:0,phase:index*.8 })
  })
  const raycaster=new T.Raycaster(), pointer=new T.Vector2()
  const select=event=>{ const bounds=renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1); raycaster.setFromCamera(pointer,camera); const hit=raycaster.intersectObjects(clickable,false)[0]; if(hit) state().onSelect(hit.object.userData.buddy) }
  renderer.domElement.addEventListener('pointerup',select)
  const contextLost=event=>{ event.preventDefault(); renderer.setAnimationLoop(null); lost() }; renderer.domElement.addEventListener('webglcontextlost',contextLost)
  camera.updateMatrixWorld()
  const bounds=new T.Box3().setFromObject(scene).applyMatrix4(camera.matrixWorldInverse)
  const centerX=(bounds.min.x+bounds.max.x)/2, centerY=(bounds.min.y+bounds.max.y)/2+.25
  const resize=()=>{
    const {width,height}=host.getBoundingClientRect(), aspect=width/Math.max(1,height)
    renderer.setSize(Math.max(1,width),Math.max(1,height),false)
    const halfHeight=Math.max((bounds.max.y-bounds.min.y)/2+.9,((bounds.max.x-bounds.min.x)/2+.5)/aspect)
    camera.left=centerX-halfHeight*aspect;camera.right=centerX+halfHeight*aspect
    camera.top=centerY+halfHeight;camera.bottom=centerY-halfHeight;camera.updateProjectionMatrix()
  }
  const observer=new ResizeObserver(resize);observer.observe(host);resize()
  let last=0, clock=0, frame=0
  renderer.setAnimationLoop(time=>{
    if(document.hidden) { last=time; return }
    const data=state(), frozen=data.paused||data.reducedMotion
    if(time-frame<1000/(frozen?4:30)) return
    frame=time; const delta=Math.min(.05,(time-last)/1000||0);last=time;if(!frozen)clock+=delta
    for(const rig of rigs) {
      const tasks=data.tasks.filter(task=>task.buddy===rig.buddy.id), working=tasks.some(task=>task.status==='working'), pending=tasks.filter(task=>task.status==='review').length, chosen=data.selected===rig.buddy.id
      const target=working||pending||chosen?rig.home:rig.rest
      if(frozen) rig.person.position.copy(target);else rig.person.position.lerp(target,1-Math.exp(-delta*3))
      const moving=Math.hypot(rig.person.position.x-target.x,rig.person.position.z-target.z)>.08
      const orientation=working||pending?Math.PI:chosen?.25:.0
      rig.person.rotation.y=frozen?orientation:T.MathUtils.lerp(rig.person.rotation.y,orientation,1-Math.exp(-delta*4))
      const seat=rig.seated&&!working&&!pending&&!chosen&&!moving?1:0
      rig.sit=frozen?seat:T.MathUtils.lerp(rig.sit,seat,1-Math.exp(-delta*5))
      rig.person.position.y=.02-rig.sit*.3+(frozen?0:moving?Math.abs(Math.sin(clock*7+rig.phase))*.035:Math.sin(clock*1.5+rig.phase)*.012)
      rig.head.rotation.y=frozen?0:chosen?Math.sin(clock*.7)*.13:Math.sin(clock*.5+rig.phase)*.08
      rig.arms.forEach((arm,i)=>{
        arm.shoulder.rotation.x=working?-.9+(frozen?0:Math.sin(clock*8+i)*.08):chosen&&i===1?-.8+(frozen?0:Math.sin(clock*3)*.12):moving?Math.sin(clock*7+i*Math.PI)*.25:.08
        arm.shoulder.rotation.z=chosen&&i===1?-.7:0;arm.elbow.rotation.x=working?-.6:chosen&&i===1?-1.2:-.15
        if(!working&&!moving&&i===0) { arm.shoulder.rotation.x=-.3;arm.elbow.rotation.x=-1.1+(frozen?0:Math.sin(clock*.8+rig.phase)*.1) }
      })
      rig.legs.forEach((leg,i)=>{leg.hip.rotation.x=rig.sit*-Math.PI/2+(moving&&!frozen?Math.sin(clock*7+i*Math.PI)*.35:0);leg.knee.rotation.x=rig.sit*Math.PI/2+(moving&&!frozen?Math.max(0,-Math.sin(clock*7+i*Math.PI))*.3:0)})
      rig.handCup.visible=!working&&!pending
      rig.ring.position.set(rig.person.position.x,.09,rig.person.position.z);rig.ring.visible=chosen||working
      rig.papers.forEach((paper,i)=>paper.visible=i<Math.min(4,Math.max(1,pending)))
      rig.screen.material.emissive.set(working?rig.buddy.color:'#000000');rig.screen.material.emissiveIntensity=working?.12:0
    }
    for(const {puff,y,phase} of steam) { const rise=(clock*.4+phase)%1; puff.position.y=y+rise*.45; puff.position.x+=frozen?0:Math.sin(clock+phase)*.0008;puff.material.opacity=frozen?.2:(1-rise)*.3 }
    renderer.render(scene,camera)
  })
  return ()=>{ renderer.setAnimationLoop(null);observer.disconnect();renderer.domElement.removeEventListener('pointerup',select);renderer.domElement.removeEventListener('webglcontextlost',contextLost);geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove() }
}
