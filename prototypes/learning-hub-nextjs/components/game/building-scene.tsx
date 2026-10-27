'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Design } from '@/lib/game/design'

type Props = { design: Design; floor: number; overlay: string; selected: string; onSelect: (name:string) => void; scenario: string; running: boolean }
export default function BuildingScene({design:d, floor, overlay, selected, onSelect, scenario, running}: Props) {
 const mount = useRef<HTMLDivElement>(null)
 const camState = useRef<{p: THREE.Vector3; t: THREE.Vector3} | null>(null)
 useEffect(() => {
  const el=mount.current; if(!el) return
  const scene=new THREE.Scene(); scene.background=new THREE.Color('#eaf2ed')
  const camera=new THREE.PerspectiveCamera(38, 1, 0.1, 2000)
  const max=Math.max(d.width,d.depth,d.floors*d.story)
  camera.position.copy(camState.current?.p ?? new THREE.Vector3(max*1.25,max*1.08,max*1.42))
  const renderer=new THREE.WebGLRenderer({antialias:true, alpha:false}); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.outputColorSpace=THREE.SRGBColorSpace; el.appendChild(renderer.domElement)
  const controls=new OrbitControls(camera,renderer.domElement); controls.target.copy(camState.current?.t ?? new THREE.Vector3(0,d.floors*d.story*0.35,0)); controls.enableDamping=true; controls.minDistance=20; controls.maxDistance=500; controls.maxPolarAngle=Math.PI/2.02
  scene.add(new THREE.HemisphereLight('#ffffff','#8ba59a',2.1))
  const sun=new THREE.DirectionalLight('#fff8e9',2.4); sun.position.set(90,150,70); scene.add(sun)
  const materials: THREE.Material[]=[]; const geometries: THREE.BufferGeometry[]=[]
  const mat=(color:string, opacity=1) => {const m=new THREE.MeshStandardMaterial({color,roughness:0.8,transparent:opacity<1,opacity}); materials.push(m); return m}
  const addBox=(parent:THREE.Object3D, x:number,y:number,z:number,w:number,h:number,dep:number,color:string, part:string, opacity=1) => { const geo=new THREE.BoxGeometry(w,h,dep); geometries.push(geo); const mesh=new THREE.Mesh(geo,mat(color,opacity)); mesh.position.set(x,y,z); mesh.userData.part=part; parent.add(mesh); return mesh }
  const ground=mat('#b9d4b8'); const groundGeo=new THREE.BoxGeometry(240,2,220); geometries.push(groundGeo); const base=new THREE.Mesh(groundGeo,ground); base.position.y=-4; scene.add(base)
  addBox(scene,0,-2.6,0, d.width+22,0.5,d.depth+22,'#d9ded0','site')
  // Simple landscaping gives spatial context without external assets.
  for(const [x,z] of [[-90,-70],[85,-70],[-85,70],[90,65]]) { addBox(scene,x,-0.5,z,3,8,3,'#a88664','site'); const g=new THREE.ConeGeometry(10,19,5); geometries.push(g); const tree=new THREE.Mesh(g,mat('#78a786')); tree.position.set(x,12,z); scene.add(tree) }
  const group=new THREE.Group(); scene.add(group)
  addBox(group,0,-0.6,0,d.width+3,2,d.depth+3,selected==='foundation'?'#f1b557':'#c7bca8','foundation')
  const colsX=Math.ceil(d.width/d.grid),colsZ=Math.ceil(d.depth/d.grid)
  const csize={small:1.2,medium:1.8,large:2.4}[d.member]
  const maxFloor=floor===0?d.floors:Math.min(floor,d.floors)
  for(let f=0;f<maxFloor;f++){
   const y=f*d.story
   addBox(group,0,y+0.15,0,d.width,1,d.depth,selected==='floor'?'#f5c45e':overlay==='temperature'?'#f2be99':'#f8eee0','floor')
   for(let ix=0;ix<=colsX;ix++) for(let iz=0;iz<=colsZ;iz++) {
    const x=-d.width/2+ix*d.width/colsX,z=-d.depth/2+iz*d.depth/colsZ
    addBox(group,x,y+d.story/2,z,csize,d.story,csize,selected==='frame'||overlay==='structural'?'#e98b62':'#3b6371','frame')
   }
   for(let iz=0;iz<=colsZ;iz++) addBox(group,0,y+d.story-0.4,-d.depth/2+iz*d.depth/colsZ,d.width,1.3,1.2,selected==='frame'||overlay==='structural'?'#e98b62':'#496e78','frame')
   for(let ix=0;ix<=colsX;ix++) addBox(group,-d.width/2+ix*d.width/colsX,y+d.story-0.4,0,1.2,1.3,d.depth,selected==='frame'||overlay==='structural'?'#e98b62':'#496e78','frame')
   // Low translucent wall panels leave the interior legible in cutaway view.
   addBox(group,0,y+d.story*0.38,-d.depth/2,d.width, d.story*0.72,0.3,'#faf4e9','wall',0.65)
   addBox(group,-d.width/2,y+d.story*0.38,0,0.3,d.story*0.72,d.depth,'#faf4e9','wall',0.65)
   for(let ix=0;ix<colsX;ix++) addBox(group,-d.width/2+(ix+0.5)*d.width/colsX,y+d.story*0.48,-d.depth/2-0.18,Math.max(3,d.width/colsX*0.45),d.story*0.38,0.3,'#90c9cf','window',0.72)
   // A simplified door marker is not a verified exit.
   const doorColor=selected==='door'||overlay==='safety'?'#ef9e4f':'#2c9d91'
   if(d.door==='front') addBox(group,0,y+3,d.depth/2,5,6,0.7,doorColor,'door')
   if(d.door==='left') addBox(group,-d.width/2,y+3,0,0.7,6,5,doorColor,'door')
   if(d.door==='right') addBox(group,d.width/2,y+3,0,0.7,6,5,doorColor,'door')
   for(const side of d.braces){
    const front=side==='front'||side==='back'; const width=front?d.width/colsX:d.depth/colsZ; const length=Math.sqrt(width*width+d.story*d.story); const geom=new THREE.CylinderGeometry(0.45,0.45,length,6); geometries.push(geom); const brace=new THREE.Mesh(geom,mat(selected==='frame'||overlay==='structural'?'#f39058':'#d9a56d')); brace.userData.part='frame';
    if(front){brace.position.set(-d.width/2+width/2,y+d.story/2,side==='front'?d.depth/2:-d.depth/2); brace.rotation.z=-Math.atan2(width,d.story)} else {brace.position.set(side==='left'?-d.width/2:d.width/2,y+d.story/2,-d.depth/2+width/2); brace.rotation.x=Math.atan2(width,d.story)} group.add(brace)
   }
  }
  if(floor===0){
   const roof=d.floors*d.story; addBox(group,0,roof+0.5,0,d.width+1,1.2,d.depth+1,'#e8e6d8','floor')
   for(let i=0;i<d.ac;i++){const perRow=Math.max(1,Math.ceil(Math.sqrt(d.ac))); const x=(i%perRow-(perRow-1)/2)*4.3,z=(Math.floor(i/perRow)-(Math.ceil(d.ac/perRow)-1)/2)*4.3; addBox(group,x,roof+2,z,3.3,2.5,3.1,selected==='ac'?'#f6b84d':'#e5e9e5','ac'); addBox(group,x,roof+3.35,z,1.8,0.2,1.8,'#738b8a','ac')}
  }
  const ray=new THREE.Raycaster(), pointer=new THREE.Vector2(); let down={x:0,y:0}; let hovered:THREE.Mesh | null=null
  const clearHover=()=>{if(hovered){const m=hovered.material as THREE.MeshStandardMaterial; m.emissive.set('#000000'); hovered=null}}
  const hit=(event:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height)*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(group.children,false)[0]?.object as THREE.Mesh | undefined}
  const move=(e:PointerEvent)=>{const obj=hit(e); if(obj!==hovered){clearHover();if(obj){hovered=obj;(obj.material as THREE.MeshStandardMaterial).emissive.set('#31504a')} renderer.domElement.style.cursor=obj?'pointer':'grab'}}
  const pointerDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY}}
  const pointerUp=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)<4){const obj=hit(e);if(obj?.userData.part)onSelect(obj.userData.part)}}
  renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp)
  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix()}; const observer=new ResizeObserver(resize);observer.observe(el);resize()
  let frame=0; const clock=new THREE.Clock(); const animate=()=>{frame=requestAnimationFrame(animate);const t=clock.getElapsedTime(); if(running&&scenario==='wind'){group.rotation.z=Math.sin(t*3)*0.015}else group.rotation.z=0; if(running&&scenario==='settlement'){group.position.y=-Math.abs(Math.sin(t*0.7))*1.2}else group.position.y=0; controls.update();renderer.render(scene,camera)}; animate()
  return ()=>{camState.current={p:camera.position.clone(),t:controls.target.clone()};cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);controls.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove()}
 },[d,floor,overlay,selected,onSelect,scenario,running])
 return <div ref={mount} className="scene-canvas" aria-label="Interactive 3D building. Drag to orbit, scroll to zoom, right-drag to pan." />
}
