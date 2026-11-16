// One fixed-step simulation; rendering only projects the single shared state.
import * as T from 'three';
import { state as s } from './state.js';
import { seeded } from './rng.js';
import { P } from './palette.js';
import { world } from './world.js';
import { initInput } from './input.js';
import { playerMove } from './mover.js';
import { Weapon,current,spread,initView,viewRender } from './weapons.js';
import { initBots,botsStep,botsRender } from './bots.js';
import { initEffects,effectsStep,throwFrag,tracer } from './effects.js';
import { firePlayer,damage } from './combat.js';
import { initBomb,newRound,roundsStep,win,plant } from './rounds.js';
import { initHud,hudRender } from './hud.js';
const params=new URLSearchParams(location.search),shot=params.get('shot');
s.shot=!!shot;
s.seed=Number(params.get('seed'))||1;
s.random=seeded(s.seed);
s.renderer=new T.WebGLRenderer( {
  antialias:true,powerPreference:'high-performance'
});
const r=s.renderer;
r.setPixelRatio(Math.min(devicePixelRatio,1.5));
r.setSize(innerWidth,innerHeight);
r.shadowMap.enabled=true;
r.shadowMap.type=T.PCFSoftShadowMap;
r.outputColorSpace=T.SRGBColorSpace;
r.toneMapping=T.ACESFilmicToneMapping;
r.toneMappingExposure=1.15;
document.getElementById('game').appendChild(r.domElement);
s.scene=new T.Scene();
s.scene.background=new T.Color(P.sky);
s.scene.fog=new T.Fog(P.sky,28,85);
s.camera=new T.PerspectiveCamera(73,innerWidth/innerHeight,.045,130);
s.camera.rotation.order='YXZ';
s.scene.add(s.camera);
world();
initBots();
s.actors.push(s.player,...s.bots);
initBomb();
initEffects();
s.weapons.pistol=new Weapon('pistol');
initView();
initInput(r.domElement);
initHud();
newRound();
const focus=new T.Vector3();
export function syncCamera() {
  const p=s.player,c=s.camera;
  c.position.set(p.pos.x,p.pos.y+p.eye,p.pos.z);
  c.rotation.set(p.pitch+p.kick,p.yaw+p.drift,0,'YXZ');
  if(!p.alive) {
    const alive=s.bots.find(b=>b.alive&&b.team===0);
    if(alive) {
      c.position.set(alive.pos.x,alive.pos.y+1.8,alive.pos.z+1);
      c.rotation.set(-.08,alive.yaw,0,'YXZ');
    }
    else c.position.y=1.05;
  }
  if(s.shake>0&&!s.shot) {
    c.position.x+=Math.sin(s.time*91)*s.shake*.1;
    c.position.y+=Math.cos(s.time*77)*s.shake*.07;
  }
  const fov=s.input.scope&&current().id==='marks'?35:73;
  if(c.fov!==fov) {
    c.fov=fov;
    c.updateProjectionMatrix();
  }
}
export function step(dt) {
  s.time+=dt;
  const p=s.player;
  if(p.alive&&s.phase==='live'&&!s.buy)playerMove(dt);
  else {
    p.vel.x*=.7;
    p.vel.z*=.7;
  }
  p.kick*=Math.exp(-dt*9);
  p.drift*=Math.exp(-dt*6);
  p.flash=Math.max(0,p.flash-dt);
  s.heat=Math.max(0,s.heat-dt*1.3);
  for(const id in s.weapons)s.weapons[id].tick(dt);
  s.hit=Math.max(0,s.hit-dt);
  s.hurt=Math.max(0,s.hurt-dt);
  s.shake=Math.max(0,s.shake-dt*1.6);
  s.white=Math.max(0,s.white-dt*1.8);
  syncCamera();
  if((s.input.fire||s.input.pressed)&&!s.buy&&s.phase==='live') {
    if(s.slot==='grenade') {
      if(s.input.pressed)throwFrag();
    }
    else firePlayer();
  }
  s.input.pressed=false;
  botsStep(dt);
  effectsStep(dt,damage);
  roundsStep(dt);
  s.spread=spread();
}
function render() {
  botsRender();
  syncCamera();
  viewRender();
  hudRender();
  r.render(s.scene,s.camera);
}
function aim(x,y,z) {
  const p=s.player;
  focus.set(x-p.pos.x,y-(p.pos.y+p.eye),z-p.pos.z);
  p.yaw=Math.atan2(-focus.x,-focus.z);
  p.pitch=Math.atan2(focus.y,Math.hypot(focus.x,focus.z));
  syncCamera();
}
function shotSetup(name) {
  s.paused=false;
  s.time=22;
  s.started=name!=='start';
  s.player.pos.set(-1,0,13);
  aim(-14,2,-5);
  if(name==='play') {
    s.phase='live';
    s.phaseLeft=74;
    s.money=1900;
    s.primary='rifle';
    s.weapons.rifle=new Weapon('rifle');
    s.slot='primary';
    s.player.pos.set(-9,0,-2.5);
    const b=s.bots[2];
    b.pos.set(-17,0,-3);
    b.yaw=Math.atan2(-(s.player.pos.x-b.pos.x),-(s.player.pos.z-b.pos.z));
    b.mode='ENGAGE';
    b.target=s.player;
    b.seen=.6;
    s.bots[3].pos.set(-20,0,-10);
    s.bots[4].pos.set(16,0,-6);
    s.bots[0].pos.set(-21,0,3);
    s.bots[1].pos.set(10,0,10);
    s.player.armor=76;
    s.player.hp=87;
    s.bots[2].hp=100;
    botsRender();
    aim(b.pos.x,1.2,b.pos.z);
    firePlayer(true);
    s.player.kick=.025;
    s.hit=.15;
    s.spread=.0035;
    s.bomb.carrier=b;
  }
  else if(name==='buy') {
    s.buy=true;
    s.money=3100;
    s.phaseLeft=12;
    s.player.pos.set(0,0,15);
    aim(-9,2,-3);
  }
  else if(name==='end') {
    s.phase='live';
    s.score=[2,1];
    s.round=4;
    s.player.pos.set(10,0,-4.5);
    aim(15,1,-6);
    plant(1);
    s.bomb.defuse=5;
    win(0,'CHARGE DEFUSED');
    s.phaseLeft=2.8;
  }
  else {
    s.player.pos.set(1,0,12);
    s.bots[0].pos.set(-10,0,5);
    s.bots[1].pos.set(8,0,7);
    s.bots[2].pos.set(-16,0,-5);
    s.bots[3].pos.set(0,0,-5);
    s.bots[4].pos.set(17,0,-6);
    aim(-12,2,0);
    s.phaseLeft=15;
  }
  s.scene.updateMatrixWorld(true);
  render();
  requestAnimationFrame(()=> {
    render();window.__shotReady=true;
  });
}
window.__game= {
  state:s,step,firePlayer,damage,plant,win,newRound
};
window.addEventListener('resize',()=> {
  s.camera.aspect=innerWidth/innerHeight;s.camera.updateProjectionMatrix();r.setSize(innerWidth,innerHeight);
});
if(shot)shotSetup(shot);
else {
  aim(-12,2,-3);
  let previous=performance.now();
  function frame(now) {
    const dt=Math.min(.1,(now-previous)/1000);
    previous=now;
    if(s.started&&!s.paused&&s.phase!=='match') {
      s.accumulator+=dt;
      while(s.accumulator>=1/60) {
        step(1/60);
        s.accumulator-=1/60;
      }
    }
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
