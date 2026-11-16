import * as T from 'three';
import { state as s } from './state.js';
import { DEFS,current,spread } from './weapons.js';
import { sound } from './audio.js';
import { tracer,sparks } from './effects.js';
const ray=new T.Raycaster(),origin=new T.Vector3(),dir=new T.Vector3(),end=new T.Vector3(),target=new T.Vector3(),hits=[];
export function sight(a,b) {
  origin.copy(a.pos);
  origin.y+=a.eye;
  target.copy(b.pos);
  target.y+=b.eye*.85;
  dir.subVectors(target,origin);
  const d=dir.length();
  ray.set(origin,dir.normalize());
  ray.far=d;
  hits.length=0;
  ray.intersectObjects(s.world.solids,false,hits);
  return hits.length===0;
}
export function damage(a,n,by,head) {
  if(!a.alive||s.phase!=='live')return;
  const absorb=Math.min(a.armor,n*.5);
  a.armor-=absorb;
  a.hp=Math.max(0,a.hp-(n-absorb));
  a.flash=.12;
  if(a===s.player) {
    s.hurt=.65;
    s.hitAngle=Math.atan2(by.pos.x-a.pos.x,by.pos.z-a.pos.z)-a.yaw;
    s.shake=.18;
  }
  if(a.hp>0)return;
  a.alive=false;
  a.death=0;
  if(by===s.player&&a.team!==by.team) {
    s.money+=300;
    s.headKill=head;
  }
  s.feed.push( {
    text:`${by.name}  ${head?'◆':'›'}  ${a.name}`,team:by.team,time:s.time
  });
  if(s.feed.length>5)s.feed.shift();
  if(a===s.bomb.carrier&&!s.bomb.planted) {
    s.bomb.pos.copy(a.pos);
    s.bomb.carrier=null;
    s.bomb.mesh.visible=true;
  }
  sound(by===s.player&&head?'head':'hit');
}
export function firePlayer(force=false) {
  const p=s.player,w=current(),d=DEFS[w.id];
  if(!p.alive||s.phase!=='live'||s.slot==='grenade'||w.reload||w.cooldown)return;
  if(!w.mag) {
    w.cooldown=.22;
    sound('dry');
    return;
  }
  if(!force&&!d.auto&&!s.input.pressed)return;
  w.mag--;
  w.cooldown=d.gap;
  p.flash=.055;
  p.kick=Math.min(.13,p.kick+.025);
  p.drift+=(s.random()-.5)*.008;
  s.heat=Math.min(2,s.heat+.3);
  s.noise.pos.copy(p.pos);
  s.noise.time=s.time;
  s.noise.team=p.team;
  sound('shot',w.id);
  origin.copy(s.camera.position);
  s.camera.getWorldDirection(dir);
  const sp=force?0:spread();
  dir.x+=(s.random()-.5)*sp*2;
  dir.y+=(s.random()-.5)*sp*2;
  dir.z+=(s.random()-.5)*sp*2;
  dir.normalize();
  ray.set(origin,dir);
  ray.far=100;
  s.scene.updateMatrixWorld(true);
  hits.length=0;
  ray.intersectObjects(s.world.solids,false,hits);
  let nearest=hits[0]?.distance??100,best=null,head=false;
  for(const b of s.bots) {
    if(!b.alive)continue;
    hits.length=0;
    ray.intersectObjects(b.hitMeshes,false,hits);
    if(hits.length&&hits[0].distance<nearest) {
      nearest=hits[0].distance;
      best=b;
      head=hits[0].object.userData.head===true;
    }
  }
  end.copy(origin).addScaledVector(dir,nearest);
  if(best) {
    s.headKill=false;
    damage(best,d.damage*(head?(w.id==='marks'?2:3):1),p,head);
    s.hit=.16;
    sound(head?'head':'hit');
  }
  sparks(end,!!best);
  origin.addScaledVector(dir,.7);
  origin.x+=.13;
  origin.y-=.1;
  tracer(origin,end);
}
export function botFire(b,a,error) {
  origin.copy(b.pos);
  origin.y+=1.4;
  end.copy(a.pos);
  end.y+=1.15+(s.random()-.5)*error*2;
  end.x+=(s.random()-.5)*error*3;
  end.z+=(s.random()-.5)*error*3;
  tracer(origin,end);
  b.muzzle=.08;
  if(a===s.player)sound('shot','smg');
  if(s.random()>error*.55)damage(a,21,b,false);
  s.noise.pos.copy(b.pos);
  s.noise.time=s.time;
  s.noise.team=b.team;
}
