// Pooled smoke volumes, occlusion and facing-sensitive flash detonation.
import * as T from 'three';
import { state as s } from './state.js';
import { sound } from './audio.js';
const eye=new T.Vector3(),delta=new T.Vector3();
export function initUtility() {
  const geo=new T.IcosahedronGeometry(1,2);
  for(let i=0;i<6;i++){
    const group=new T.Group(),lobes=[];
    for(let j=0;j<24;j++){
      const mat=new T.MeshStandardMaterial({color:0xa4aea9,transparent:true,opacity:.32,depthWrite:false,roughness:1});
      const mesh=new T.Mesh(geo,mat),angle=j*2.39996,r=1.2+(j%4)*.55;
      mesh.position.set(Math.cos(angle)*r,.45+(j%5)*.55,Math.sin(angle)*r);
      mesh.scale.set(1.5,1.2,1.5);group.add(mesh);lobes.push(mesh);
    }
    group.visible=false;s.scene.add(group);s.fx.smokes.push({group,lobes,left:0,pos:new T.Vector3(),radius:4.4});
  }
}
export function smokeAt(pos) {
  const c=s.fx.smokes.find(c=>c.left<=0);if(!c)return false;
  c.pos.copy(pos);c.pos.y=0;c.group.position.copy(c.pos);c.left=15;c.group.visible=true;c.group.scale.setScalar(.25);return true;
}
export function smokeBlocks(a,b) {
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=dx*dx+dy*dy+dz*dz;
  for(const c of s.fx.smokes){
    if(c.left<=0)continue;
    const t=Math.max(0,Math.min(1,((c.pos.x-a.x)*dx+(1.5-a.y)*dy+(c.pos.z-a.z)*dz)/Math.max(.001,len)));
    const x=a.x+dx*t-c.pos.x,y=a.y+dy*t-1.5,z=a.z+dz*t-c.pos.z;
    if(x*x+z*z+y*y<c.radius*c.radius)return true;
  }
  return false;
}
export function flashAt(pos) {
  sound('beep');
  for(const a of s.actors){
    if(!a.alive)continue;
    eye.copy(a.pos);eye.y+=a.eye;delta.subVectors(pos,eye);const distance=delta.length();
    if(distance>19)continue;
    delta.multiplyScalar(1/Math.max(.01,distance));
    const facing=-Math.sin(a.yaw)*delta.x-Math.cos(a.yaw)*delta.z;
    const strength=Math.max(.08,(facing+.2)/1.2)*(1-distance/19);
    // Walls shield flashes. Smoke diffuses them but never makes them harmless.
    s.utilityRay.set(eye,delta);s.utilityRay.far=distance;s.utilityHits.length=0;
    s.utilityRay.intersectObjects(s.world.solids,false,s.utilityHits);
    if(s.utilityHits.length)continue;
    a.blind=Math.max(a.blind,strength*4.2);
    if(a===s.player)s.white=Math.max(s.white,Math.min(1,strength*2));
  }
}
export function utilityStep(dt) {
  s.smokeView=0;
  for(const a of s.actors)a.blind=Math.max(0,a.blind-dt);
  for(const c of s.fx.smokes){
    if(c.left<=0)continue;c.left=Math.max(0,c.left-dt);c.group.visible=c.left>0;
    const fade=Math.min(1,(15-c.left)*1.6,c.left/2);c.group.scale.setScalar(.7+fade*.3);
    c.group.rotation.y+=dt*.035;
    for(let j=0;j<c.lobes.length;j++)c.lobes[j].material.opacity=fade*(.29+.045*Math.sin(s.time*.6+j));
    const d=Math.hypot(s.camera.position.x-c.pos.x,s.camera.position.z-c.pos.z);
    s.smokeView=Math.max(s.smokeView,Math.max(0,1-d/c.radius)*fade);
  }
}
export function initUtilityRay(){s.utilityRay=new T.Raycaster();s.utilityHits=[];}
