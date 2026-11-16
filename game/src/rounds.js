// Round and match authority. A planted charge survives attacker elimination.
// Equipment persists for survivors; cash and score persist for everyone.
import * as T from 'three';
import { state as s } from './state.js';
import { resetBots } from './bots.js';
import { Weapon } from './weapons.js';
import { sound } from './audio.js';
export function initBomb() {
  const g=new T.Group(),caseMat=new T.MeshStandardMaterial( {
    color:0x303e40,metalness:.6,roughness:.4
  });
  const m=new T.Mesh(new T.BoxGeometry(.65,.23,.42),caseMat);
  m.position.y=.17;
  g.add(m);
  for(let i=-1;i<=1;i++) {
    const v=new T.Mesh(new T.CylinderGeometry(.06,.06,.48,10),new T.MeshStandardMaterial( {
      color:0xd0a26c
    }));
    v.rotation.z=Math.PI/2;
    v.position.set(0,.32,i*.12);
    g.add(v);
  }
  const led=new T.Mesh(new T.BoxGeometry(.17,.04,.12),new T.MeshBasicMaterial( {
    color:0xff614f
  }));
  led.position.set(0,.37,0);
  g.add(led);
  s.scene.add(g);
  s.bomb.mesh=g;
}
export function newRound() {
  s.phase='buy';
  s.phaseLeft=15;
  s.buy=false;
  s.reason='';
  const p=s.player,wasDead=!p.alive;
  p.pos.set(0,0,16);
  p.vel.set(0,0,0);
  p.hp=100;
  p.alive=true;
  p.yaw=0;
  p.pitch=0;
  p.kick=0;
  p.drift=0;
  p.eye=1.64;
  p.height=1.78;
  p.ground=true;
  if(wasDead) {
    s.primary=null;
    s.player.armor=0;
    s.grenades=0;
    s.slot='pistol';
  }
  s.weapons.pistol=new Weapon('pistol');
  if(s.primary)s.weapons[s.primary]=new Weapon(s.primary);
  s.slot=s.primary?'primary':'pistol';
  resetBots();
  Object.assign(s.bomb, {
    planted:false,site:0,fuse:30,progress:0,defuse:0,carrier:s.bots[2],beep:0
  });
  s.bomb.pos.set(0,0,-18);
  s.bomb.mesh.visible=false;
  s.heat=0;
  s.input.scope=false;
  s.hit=s.hurt=s.shake=s.white=0;
  for(const f of s.fx.grenades) {
    f.left=0;
    f.mesh.visible=false;
  }
}
export function restart() {
  s.score=[0,0];
  s.loss=[0,0];
  s.money=800;
  s.round=1;
  s.primary=null;
  s.grenades=0;
  s.player.alive=false;
  s.feed.length=0;
  newRound();
}
export function win(team,reason) {
  if(s.phase!=='live')return;
  s.phase='end';
  s.phaseLeft=3.5;
  s.winner=team;
  s.reason=reason;
  s.score[team]++;
  s.loss[team]=0;
  s.loss[1-team]++;
  const objective=reason==='CHARGE DEFUSED'||reason==='CHARGE DETONATED';
  s.money=Math.min(16000,s.money+(team===0?(objective?1600:1400):900+Math.min(500,s.loss[0]*100)));
  s.buy=false;
  sound(team===0?'win':'lose');
}
export function plant(site) {
  const b=s.bomb;
  b.planted=true;
  b.site=site;
  b.pos.set(s.world.sites[site].x,0,s.world.sites[site].z);
  b.mesh.position.copy(b.pos);
  b.mesh.visible=true;
  b.fuse=30;
  b.progress=0;
  b.carrier=null;
  sound('beep');
  s.feed.push( {
    text:`CHARGE PLANTED AT ${s.world.sites[site].name}`,team:1,time:s.time
  });
}
export function roundsStep(dt) {
  if(s.phase==='match')return;
  s.phaseLeft-=dt;
  if(s.phase==='buy') {
    if(s.phaseLeft<=0) {
      s.phase='live';
      s.phaseLeft=100;
      s.buy=false;
      if(!s.input.locked&&!s.shot)s.paused=true;
      for(const b of s.bots)b.path=[];
      sound('beep');
    }
    return;
  }
  if(s.phase==='end') {
    if(s.phaseLeft<=0) {
      if(Math.max(...s.score)>=5) {
        s.phase='match';
        if(document.pointerLockElement)document.exitPointerLock();
      }
      else {
        s.round++;
        newRound();
      }
    }
    return;
  }
  const b=s.bomb;
  let plantBot=null,defuser=null;
  for(const bot of s.bots) {
    if(!bot.alive)continue;
    if(bot.mode==='PLANT'&&bot===b.carrier)plantBot=bot;
    if(bot.mode==='DEFUSE'&&bot.pos.distanceTo(b.pos)<2)defuser=bot;
  }
  if(!b.planted) {
    if(plantBot) {
      b.progress+=dt;
      if(b.progress>=3.5)plant(plantBot.site);
    }
    else b.progress=Math.max(0,b.progress-dt*2);
    if(b.carrier)b.pos.copy(b.carrier.pos);
    else {
      b.mesh.position.copy(b.pos);
      b.mesh.visible=true;
    }
    if(s.phaseLeft<=0) {
      win(0,'TIME');
      return;
    }
  }
  else {
    b.fuse-=dt;
    b.beep-=dt;
    if(b.beep<=0) {
      sound('beep');
      b.beep=Math.max(.12,b.fuse/24);
    }
    const playerDefuse=s.player.alive&&s.input.keys.has('KeyE')&&s.player.pos.distanceTo(b.pos)<2.4;
    if(playerDefuse||defuser) {
      b.defuse+=dt;
      if(b.defuse>=5) {
        win(0,'CHARGE DEFUSED');
        return;
      }
    }
    else b.defuse=0;
    if(b.fuse<=0) {
      s.white=1;
      s.shake=1;
      sound('explode');
      win(1,'CHARGE DETONATED');
      return;
    }
  }
  let wardens=s.player.alive?1:0,strikers=0;
  for(const bot of s.bots)if(bot.alive) {
    if(bot.team===0)wardens++;
    else strikers++;
  }
  if(wardens===0)win(1,'ELIMINATION');
  else if(strikers===0&&!b.planted)win(0,'ELIMINATION');
}
