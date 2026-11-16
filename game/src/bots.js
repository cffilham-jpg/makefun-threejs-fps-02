// Perception runs at 5–8 Hz; motion and burst timing use the fixed 60 Hz step.
// Routes are graph paths. Sight overrides travel; charge events override quiet holds.
import * as T from 'three';
import { state as s,actor } from './state.js';
import { P } from './palette.js';
import { route } from './world.js';
import { launchGrenade } from './effects.js';
import { radio,zone } from './radio.js';
import { DEFS } from './weapons.js';
import { move } from './mover.js';
import { sight,botFire } from './combat.js';
const goal=new T.Vector3();
export function initBots() {
  for(let i=0;i<9;i++) {
    const team=i<4?0:1,b=actor(['MICA','ROOK','VALE','SLATE','CINDER','FLINT','ASH','WISP','EMBER'][i],team,0,0);
    Object.assign(b, {
      index:i,role:['anchor A','anchor B','support','support','carrier','entry','support','entry','lurk'][i],group:new T.Group(),hitMeshes:[],mode:'ADVANCE',path:[],pathAt:0,target:null,seen:0,reaction:.35+s.random()*.25,cooldown:0,burst:0,decision:0,site:i===4?1:0,muzzle:0,walk:0
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
    const dead=!b.alive;
    b.pos.set(b.team?(b.index-6)*1.3: [-11,11,-3,4][b.index],0,b.team?-18.3:15.5);
    if(dead){b.weapon='pistol';b.helmet=false;b.kit=false;b.armor=0;}
    b.smokes=0;b.flashes=0;
    if(b.team&&b.role==='support'&&b.money>=300){b.smokes=1;b.money-=300;}
    if(b.money>=2100&&(b.weapon==='pistol'||b.weapon==='smg')){b.weapon=b.role==='lurk'?'marks':'rifle';const price=DEFS[b.weapon].price;if(b.money>=price)b.money-=price;else b.weapon='rifle',b.money-=2100;}
    else if(b.money>=900&&b.weapon==='pistol'){b.weapon='smg';b.money-=900;}
    if(b.money>=650&&b.armor<60){b.armor=100;b.money-=650;}
    if(b.money>=350&&!b.helmet){b.helmet=true;b.money-=350;}
    if(!b.team&&b.money>=400&&!b.kit){b.kit=true;b.money-=400;}
    if(!b.team&&b.money>=250){b.flashes=1;b.money-=250;}
    b.roundKills=b.roundObjective=0;b.blind=0;b.supportUntil=0;b.callAt=0;b.lurkStage=0;b.retakeAnnounced=false;
    b.vel.set(0,0,0);
    b.alive=true;
    b.hp=100;

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
    b.site=b.team?s.plan.site:b.index%2;
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
function order(b,x,z,mode) {
  if(b.mode!==mode||Math.hypot(b.goalX-x,b.goalZ-z)>.8||!b.path.length)navigate(b,x,z,mode);
}
function chooseTactic(b) {
  const bomb=s.bomb,site=s.world.sites[b.site];
  if(bomb.planted){
    if(b.team===0){
      if(!s.plan.retakeCalled){radio(b,`Retaking ${s.world.sites[bomb.site].name} together. Kit forward.`);s.plan.retakeCalled=true;}
      let defuser=null,best=Infinity;
      for(const a of s.bots)if(a.alive&&!a.team){const cost=a.pos.distanceToSquared(bomb.pos)+(a.kit?0:100);if(cost<best){best=cost;defuser=a;}}
      if(s.time<s.plan.retakeAt&&b.pos.distanceTo(bomb.pos)>5){
        order(b,bomb.pos.x+(bomb.site? -5:5),bomb.pos.z+6,'REGROUP');return;
      }
      if(b===defuser){if(b.pos.distanceTo(bomb.pos)<1.9)b.mode='DEFUSE';else order(b,bomb.pos.x,bomb.pos.z,'ROTATE');}
      else {
        // Cover a distinct angle rather than stacking on the defuser.
        const x=bomb.pos.x+(b.index%2?2.7:-2.7),z=bomb.pos.z+3;
        if(Math.hypot(b.pos.x-x,b.pos.z-z)<.8){b.mode='HOLD';b.yaw=bomb.site?Math.PI/2:-Math.PI/2;}
        else order(b,x,z,'COVER');
      }
    }
    else {
      const x=bomb.pos.x+(b.index%2?3:-3),z=bomb.pos.z+(b.index%3===0?-3:3);
      if(Math.hypot(b.pos.x-x,b.pos.z-z)<.8){b.mode='HOLD';b.yaw=b.index%2?0:Math.PI;}
      else order(b,x,z,'POSTPLANT');
    }
    return;
  }
  if(b.supportUntil>s.time&&b!==bomb.carrier){order(b,b.supportX,b.supportZ,'SUPPORT');return;}
  if(b.team){
    if(!bomb.carrier){
      if(b.pos.distanceTo(bomb.pos)<1.8){bomb.carrier=b;bomb.mesh.visible=false;b.site=s.plan.site;}
      else {order(b,bomb.pos.x,bomb.pos.z,'RECOVER');return;}
    }
    if(b.role==='lurk'&&b.lurkStage===0){
      const far=s.world.sites[1-s.plan.site];
      if(Math.hypot(b.pos.x-far.x,b.pos.z-10)<2)b.lurkStage=1;
      else {order(b,far.x,10,'FLANK');return;}
    }
    // Stage the carrier and escorts; the support throws smoke before entry.
    if(s.time<s.plan.executeAt){
      const x=site.x+(b.index-6)*.65,z=site.z-7;
      order(b,x,z,'STAGE');
      return;
    }
    if(b===bomb.carrier&&Math.hypot(b.pos.x-site.x,b.pos.z-site.z)<2.4)b.mode='PLANT';
    else order(b,site.x+(b===bomb.carrier?0:(b.index%2?2.5:-2.5)),site.z+(b===bomb.carrier?0:2),'EXECUTE');
  }
  else {
    const x=site.x+(b.index<2?-2.5:2.5),z=site.z+4;
    if(b.mode==='INVESTIGATE'&&s.time-s.noise.time<4)return;
    if(s.noise.time>s.time-1.1&&s.noise.team!==b.team&&b.mode==='HOLD')order(b,s.noise.pos.x,s.noise.pos.z,'INVESTIGATE');
    else if(Math.hypot(b.pos.x-x,b.pos.z-z)>.9)order(b,x,z,'ANCHOR');
    else {b.mode='HOLD';b.yaw=b.index<2?Math.PI:0;}
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
    if(b.smokes&&!s.bomb.planted&&s.time>s.plan.executeAt-2){
      const site=s.world.sites[b.site];goal.set(site.x+(b.site?-4:4),.2,site.z+2);
      if(launchGrenade(b,'smoke',goal)){b.smokes--;radio(b,`Smoke out. Execute ${site.name}.`);}
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
      if(nearest){
        b.mode='ENGAGE';
        if(s.time>b.callAt){
          let count=0;for(const a of s.actors)if(a.alive&&a.team!==b.team&&a.pos.distanceToSquared(nearest.pos)<64)count++;
          radio(b,`Contact at ${zone(nearest.pos)} — ${count>1?'two hostiles':'one hostile'}`,nearest.pos);b.callAt=s.time+9;
          if(!b.team&&b.flashes&&dist<16*16){launchGrenade(b,'flash',nearest.pos);b.flashes--;}
        }
      }
      else if(b.mode==='ENGAGE')navigate(b,s.noise.pos.x,s.noise.pos.z,'INVESTIGATE');
      if(!nearest)chooseTactic(b);

    }
    if(b.target&&b.target.alive) {
      b.seen+=dt;
      const a=b.target,dx=a.pos.x-b.pos.x,dz=a.pos.z-b.pos.z;
      b.yaw=Math.atan2(-dx,-dz);
      move(b,Math.cos(b.yaw)*Math.sin(s.time*1.8+b.index)*.2,-Math.sin(b.yaw)*Math.sin(s.time*1.8+b.index)*.2,dt);
      if(b.seen>b.reaction+(b.blind>0?1.4:0)&&b.cooldown<=0&&sight(b,a)) {
        botFire(b,a,Math.max(.2,1.25-b.seen*.35)+Math.sqrt(dx*dx+dz*dz)*.025+(b.blind>0?2:0));
        b.burst++;
        b.cooldown=b.burst%3===0?.65:DEFS[b.weapon].gap;
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
