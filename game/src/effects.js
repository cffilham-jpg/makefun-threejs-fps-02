// Pooled ballistic grenades, tracers, debris and explosion rings.
import * as T from 'three';
import { state as s } from './state.js';
import { smokeAt,flashAt } from './utility.js';
import { sound } from './audio.js';
export function initEffects() {
  const f=s.fx;
  for(let i=0;i<32;i++) {
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(new Float32Array(6),3));
    const mesh=new T.Line(g,new T.LineBasicMaterial( {
      color:0xffd39a,transparent:true,depthWrite:false
    }));
    mesh.visible=false;
    s.scene.add(mesh);
    f.tracers.push( {
      mesh,left:0
    });
  }
  const geo=new T.IcosahedronGeometry(.045,0);
  for(let i=0;i<80;i++) {
    const mesh=new T.Mesh(geo,new T.MeshBasicMaterial( {
      color:0xffc275,transparent:true
    }));
    mesh.visible=false;
    s.scene.add(mesh);
    f.particles.push( {
      mesh,v:new T.Vector3(),left:0
    });
  }
  for(let i=0;i<6;i++) {
    const mesh=new T.Mesh(new T.SphereGeometry(.12,8,6),new T.MeshStandardMaterial( {
      color:0x515d4b,metalness:.5,roughness:.5
    }));
    mesh.visible=false;
    s.scene.add(mesh);
    f.grenades.push( {
      mesh,v:new T.Vector3(),left:0,owner:null
    });
    const ring=new T.Mesh(new T.SphereGeometry(1,16,8),new T.MeshBasicMaterial( {
      color:0xffb965,wireframe:true,transparent:true,depthWrite:false
    }));
    ring.visible=false;
    s.scene.add(ring);
    f.rings.push( {
      mesh:ring,left:0
    });
  }
}
export function tracer(a,b) {
  const f=s.fx.tracers.find(t=>t.left<=0)||s.fx.tracers[0],v=f.mesh.geometry.attributes.position;
  v.setXYZ(0,a.x,a.y,a.z);
  v.setXYZ(1,b.x,b.y,b.z);
  v.needsUpdate=true;
  f.left=.085;
  f.mesh.visible=true;
  f.mesh.material.opacity=1;
}
export function sparks(pos,red=false) {
  let count=0;
  for(const f of s.fx.particles) {
    if(f.left>0)continue;
    f.left=.24+s.random()*.25;
    f.mesh.visible=true;
    f.mesh.position.copy(pos);
    f.mesh.material.color.setHex(red?0xf17d63:0xffd59b);
    f.v.set((s.random()-.5)*4,s.random()*3,(s.random()-.5)*4);
    if(++count===7)break;
  }
}
export function launchGrenade(owner,type,target=null) {
  const f=s.fx.grenades.find(f=>f.left<=0);if(!f)return false;
  f.left=type==='flash'?1.1:1.5;f.owner=owner;f.type=type;f.mesh.visible=true;
  f.mesh.material.color.setHex(type==='smoke'?0x84b9a2:type==='flash'?0xf3db9b:0x515d4b);
  f.mesh.position.copy(owner.pos);f.mesh.position.y+=owner.eye;
  if(target){f.v.subVectors(target,f.mesh.position);f.v.multiplyScalar(1/1.2);f.v.y+=6;}
  else {s.camera.getWorldDirection(f.v);f.v.multiplyScalar(13);f.v.y+=4;}
  return true;
}
export function throwFrag() {
  const type=s.slot==='smoke'?'smoke':s.slot==='flash'?'flash':'frag';
  const key=type==='frag'?'grenades':type==='smoke'?'smokes':'flashes';
  if(s[key]<=0||s.phase!=='live'||!s.player.alive)return;
  if(!launchGrenade(s.player,type))return;
  s[key]--;s.slot=s.primary?'primary':'pistol';sound('reload');
}
export function effectsStep(dt,damage) {
  for(const f of s.fx.tracers)if(f.left>0) {
    f.left-=dt;
    f.mesh.visible=f.left>0;
    f.mesh.material.opacity=Math.max(0,f.left/.085);
  }
  for(const f of s.fx.particles)if(f.left>0) {
    f.left-=dt;
    f.mesh.visible=f.left>0;
    f.v.y-=8*dt;
    f.mesh.position.addScaledVector(f.v,dt);
    f.mesh.material.opacity=Math.max(0,f.left*3);
  }
  for(const f of s.fx.rings)if(f.left>0) {
    f.left-=dt;
    f.mesh.visible=f.left>0;
    f.mesh.scale.setScalar((1-f.left/.5)*7);
    f.mesh.material.opacity=f.left;
  }
  for(const f of s.fx.grenades)if(f.left>0) {
    f.left-=dt;
    f.v.y-=12*dt;
    const p=f.mesh.position;
    for(const axis of ['x','y','z']) {
      p[axis]+=f.v[axis]*dt;
      for(const b of s.world.colliders)if(p.x>b.min.x-.12&&p.x<b.max.x+.12&&p.y>b.min.y-.12&&p.y<b.max.y+.12&&p.z>b.min.z-.12&&p.z<b.max.z+.12) {
        p[axis]-=f.v[axis]*dt;
        f.v[axis]*=-.5;
        break;
      }
    }
    if(p.y<.12) {
      p.y=.12;
      f.v.y=Math.abs(f.v.y)*.45;
      f.v.x*=.95;
      f.v.z*=.95;
    }
    f.mesh.rotation.x+=dt*5;
    if(f.left<=0) {
      f.mesh.visible=false;
      if(f.type==='smoke'){smokeAt(p);sound('reload');continue;}
      if(f.type==='flash'){flashAt(p);continue;}
      sound('explode');
      sparks(p);
      const ring=s.fx.rings.find(r=>r.left<=0);
      if(ring) {
        ring.left=.5;
        ring.mesh.position.copy(p);
        ring.mesh.visible=true;
      }
      const dist=s.player.pos.distanceTo(p);
      s.shake=Math.max(s.shake,Math.max(0,1-dist/18));
      s.white=Math.max(s.white,Math.max(0,.65-dist/25));
      for(const a of s.actors)if(a.alive) {
        const d=a.pos.distanceTo(p);
        if(d<7)damage(a,100-80*d/7,f.owner,false);
      }
    }
  }
}
