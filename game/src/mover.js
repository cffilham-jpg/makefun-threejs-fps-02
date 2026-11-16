// A shared upright AABB motor: horizontal axes resolve independently, then gravity.
import { state as s } from './state.js';
export function blocked(x,y,z,h) {
  for(const b of s.world.colliders)if(x+.3>b.min.x&&x-.3<b.max.x&&z+.3>b.min.z&&z-.3<b.max.z&&y+.035<b.max.y&&y+h-.035>b.min.y)return b;
  return null;
}
export function move(a,dx,dz,dt,jump=false) {
  const speed=a.crouch?2.15:4.2;
  const blend=Math.min(1,dt*(a.ground?13:3));
  a.vel.x+=(dx*speed-a.vel.x)*blend;
  a.vel.z+=(dz*speed-a.vel.z)*blend;
  if(jump&&a.ground)a.vel.y=6.2;
  a.vel.y-=19*dt;
  const p=a.pos;
  let n=p.x+a.vel.x*dt;
  if(!blocked(n,p.y,p.z,a.height))p.x=n;
  else a.vel.x=0;
  n=p.z+a.vel.z*dt;
  if(!blocked(p.x,p.y,n,a.height))p.z=n;
  else a.vel.z=0;
  const old=p.y;
  p.y+=a.vel.y*dt;
  a.ground=false;
  const b=blocked(p.x,p.y,p.z,a.height);
  if(b) {
    if(a.vel.y<=0&&old>=b.max.y-.05) {
      p.y=b.max.y;
      a.ground=true;
    }
    else p.y=old;
    a.vel.y=0;
  }
  if(p.y<=0) {
    p.y=0;
    a.vel.y=0;
    a.ground=true;
  }
}
export function playerMove(dt) {
  const p=s.player,k=s.input.keys;
  p.crouch=k.has('ControlLeft')||k.has('KeyC');
  if(!p.crouch&&blocked(p.pos.x,p.pos.y,p.pos.z,1.78))p.crouch=true;
  p.height=p.crouch?1.12:1.78;
  p.eye+=((p.crouch?1.02:1.64)-p.eye)*Math.min(1,dt*15);
  let f=+k.has('KeyW')-k.has('KeyS'),r=+k.has('KeyD')-k.has('KeyA'),l=Math.hypot(f,r)||1;
  f/=l;
  r/=l;
  move(p,-Math.sin(p.yaw)*f+Math.cos(p.yaw)*r,-Math.cos(p.yaw)*f-Math.sin(p.yaw)*r,dt,k.has('Space'));
}
