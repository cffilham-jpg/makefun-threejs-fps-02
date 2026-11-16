// Perception runs at 5–8 Hz; motion and burst timing use the fixed 60 Hz step.
// Routes are graph paths. Sight overrides travel; charge events override quiet holds.
import * as T from 'three';
import { state as s,actor } from './state.js';
import { P } from './palette.js';
import { route } from './world.js';
import { move } from './mover.js';
import { sight,botFire } from './combat.js';
const goal=new T.Vector3();
export function initBots() {
  for(let i=0;i<5;i++) {
    const team=i<2?0:1,b=actor(['MICA','ROOK','CINDER','FLINT','ASH'][i],team,0,0);
    Object.assign(b, {
      index:i,group:new T.Group(),hitMeshes:[],mode:'ADVANCE',path:[],pathAt:0,target:null,seen:0,reaction:.35+s.random()*.25,cooldown:0,burst:0,decision:0,site:i===4?1:0,muzzle:0,walk:0
    });
    const suit=new T.MeshStandardMaterial( {
      color:team?0x5d5141:0x294750,roughness:.85
    }),trim=new T.MeshStandardMaterial( {
      color:team?P.amber:P.teal,roughness:.5
    }),dark=new T.MeshStandardMaterial( {
      color:0x18262d,roughness:.75
    }),visor=new T.MeshStandardMaterial( {
      color:team?0xf7d590:0xa3ece4,metalness:.8,roughness:.2
    });
    b.mat=suit;
    b.materials=[suit,trim,dark,visor];
    const part=(w,h,d,x,y,z,m,hit=false,head=false)=> {
      const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);
      mesh.position.set(x,y,z);
      mesh.castShadow=true;
      b.group.add(mesh);
      if(hit) {
        mesh.userData.head=head;
        b.hitMeshes.push(mesh);
      }
      return mesh;
    };
    part(.53,.67,.32,0,1.15,0,suit,true);
    part(.47,.25,.37,0,1.35,0,trim);
    part(.22,.28,.07,0,1.12,-.2,dark);
    part(.34,.34,.34,0,1.68,0,suit,true,true);
    part(.29,.12,.045,0,1.7,-.184,visor);
    part(.38,.08,.37,0,1.87,0,dark);
    b.legs=[part(.19,.65,.22,-.16,.45,0,dark,true),part(.19,.65,.22,.16,.45,0,dark,true)];
    part(.24,.12,.34,-.16,.09,-.05,dark);
    part(.24,.12,.34,.16,.09,-.05,dark);
    part(.17,.5,.2,-.36,1.12,-.08,suit,true).rotation.x=-.65;
    part(.17,.5,.2,.36,1.12,-.08,suit,true).rotation.x=-.65;
    part(.12,.14,.66,.19,1.16,-.45,dark);
    part(.05,.05,.26,.19,1.2,-.87,dark);
    const flash=new T.Mesh(new T.ConeGeometry(.09,.25,5),new T.MeshBasicMaterial( {
      color:0xffcf8c
    }));
    flash.rotation.x=-Math.PI/2;
    flash.position.set(.19,1.2,-1.02);
    b.group.add(flash);
    b.flashMesh=flash;
    s.scene.add(b.group);
    s.bots.push(b);
  }
}
export function resetBots() {
  for(const b of s.bots) {
    b.pos.set(b.team?(b.index-3)*2: (b.index===0?-9:11),0,b.team?-18:15);
    b.vel.set(0,0,0);
    b.alive=true;
    b.hp=100;
    b.armor=0;
    b.death=0;
    b.group.visible=true;
    b.group.rotation.set(0,0,0);
    for(const m of b.materials){m.transparent=false;m.opacity=1;}
    b.mode='ADVANCE';
    b.path=[];
    b.pathAt=0;
    b.target=null;
    b.seen=0;
    b.decision=0;
    b.cooldown=0;
    b.site=b.team?(s.round%2?(b.index===4?1:0):(b.index===2?0:1)):b.index;
    b.reaction=.35+s.random()*.25;
  }
}
function navigate(b,x,z,mode) {
  goal.set(x,0,z);
  b.path=route(b.pos,goal);
  b.pathAt=0;
  b.goalX=x;
  b.goalZ=z;
  b.mode=mode;
}
function travel(b,dt) {
  let x=b.goalX,z=b.goalZ;
  if(b.pathAt<b.path.length) {
    const n=s.world.nodes[b.path[b.pathAt]];
    x=n[0];
    z=n[1];
    if(Math.hypot(x-b.pos.x,z-b.pos.z)<.65)b.pathAt++;
  }
  const dx=x-b.pos.x,dz=z-b.pos.z,dist=Math.hypot(dx,dz);
  if(dist>.4) {
    move(b,dx/dist*.72,dz/dist*.72,dt);
    b.yaw=Math.atan2(-dx,-dz);
  }
  else {
    move(b,0,0,dt);
    if(b.pathAt>=b.path.length)b.mode='HOLD';
  }
}
export function botsStep(dt) {
  for(const b of s.bots) {
    b.flash=Math.max(0,b.flash-dt);
    b.muzzle=Math.max(0,b.muzzle-dt);
    if(!b.alive) {
      b.death+=dt;
      continue;
    }
    b.cooldown-=dt;
    b.decision-=dt;
    if(s.phase!=='live') {
      move(b,0,0,dt);
      continue;
    }
    if(b.decision<=0) {
      b.decision=.12+s.random()*.09;
      let nearest=null,dist=Infinity;
      for(const a of s.actors) {
        if(!a.alive||a.team===b.team)continue;
        const d=b.pos.distanceToSquared(a.pos);
        if(d<dist&&d<34*34&&sight(b,a)) {
          nearest=a;
          dist=d;
        }
      }
      if(nearest!==b.target) {
        b.target=nearest;
        b.seen=0;
      }
      if(nearest)b.mode='ENGAGE';
      else if(b.mode==='ENGAGE') {
        b.mode='INVESTIGATE';
        navigate(b,s.noise.pos.x,s.noise.pos.z,'INVESTIGATE');
      }
      const bomb=s.bomb,site=s.world.sites[b.site];
      if(!nearest) {
        if(bomb.planted) {
          const p=bomb.pos;
          if(b.team===0) {
            if(b.mode!=='ROTATE'&&b.mode!=='DEFUSE')navigate(b,p.x,p.z,'ROTATE');
            if(b.pos.distanceTo(p)<2)b.mode='DEFUSE';
          }
          else if(b.pos.distanceTo(p)>7&&b.mode!=='ADVANCE')navigate(b,p.x+(b.index-3)*.5,p.z+1.5,'ADVANCE');
        }
        else if(b.team===1) {
          if(!bomb.carrier) {
            if(b.pos.distanceTo(bomb.pos)<1.8) {
              bomb.carrier=b;
              bomb.mesh.visible=false;
            }
            else if(b.mode!=='ADVANCE'||Math.hypot(b.goalX-bomb.pos.x,b.goalZ-bomb.pos.z)>1)navigate(b,bomb.pos.x,bomb.pos.z,'ADVANCE');
          }
          if(b===bomb.carrier&&Math.hypot(b.pos.x-site.x,b.pos.z-site.z)<2.5)b.mode='PLANT';
          else if(bomb.carrier&&(!b.path.length||b.mode==='HOLD'&&Math.hypot(b.pos.x-site.x,b.pos.z-site.z)>3))navigate(b,site.x+(b.index-3)*.5,site.z+1,'ADVANCE');
        }
        else if(!b.path.length)navigate(b,site.x,site.z+4,'ADVANCE');
        else if(s.noise.time>s.time-1.1&&s.noise.team!==b.team&&b.mode==='HOLD')navigate(b,s.noise.pos.x,s.noise.pos.z,'INVESTIGATE');
      }
    }
    if(b.target&&b.target.alive) {
      b.seen+=dt;
      const a=b.target,dx=a.pos.x-b.pos.x,dz=a.pos.z-b.pos.z;
      b.yaw=Math.atan2(-dx,-dz);
      move(b,Math.cos(b.yaw)*Math.sin(s.time*1.8+b.index)*.2,-Math.sin(b.yaw)*Math.sin(s.time*1.8+b.index)*.2,dt);
      if(b.seen>b.reaction&&b.cooldown<=0&&sight(b,a)) {
        botFire(b,a,Math.max(.2,1.25-b.seen*.35)+Math.sqrt(dx*dx+dz*dz)*.025);
        b.burst++;
        b.cooldown=b.burst%3===0?.65:.15;
      }
    }
    else if(b.mode==='PLANT'||b.mode==='DEFUSE') {
      move(b,0,0,dt);
    }
    else if(b.mode==='HOLD') {
      const strafe=Math.sin(s.time*.8+b.index)*.07;
      move(b,Math.cos(b.yaw)*strafe,-Math.sin(b.yaw)*strafe,dt);
      b.yaw+=Math.sin(s.time*.7+b.index)*dt*.18;
      }
    else {
      travel(b,dt);
      }
  }
}
export function botsRender() {
  for(const b of s.bots) {
    b.group.position.copy(b.pos);
    b.group.rotation.y=b.yaw;
    if(!b.alive) {
      b.group.rotation.z=Math.min(1,b.death*3)*1.5;
      b.group.position.y-=Math.min(1,b.death*2)*.22;
      for(const m of b.materials){m.transparent=true;m.opacity=Math.max(0,1-(b.death-2)/2);}
      b.group.visible=b.death<4;
    }
    else {
      b.group.rotation.z=0;
      b.walk=Math.hypot(b.vel.x,b.vel.z);
      b.legs[0].rotation.x=Math.sin(s.time*9+b.index)*b.walk*.17;
      b.legs[1].rotation.x=-b.legs[0].rotation.x;
      b.mat.emissive.setHex(b.flash>0?0x974b31:0);
    }
    b.flashMesh.visible=b.muzzle>0;
  }
}
