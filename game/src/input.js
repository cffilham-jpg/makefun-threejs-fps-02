import { state as s } from './state.js';
import { buy,switchTo,current } from './weapons.js';
import { unlockAudio } from './audio.js';
export function initInput(canvas) {
  const i=s.input;
  document.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('keydown',e=> {
    if(['Space','Tab','ControlLeft','KeyB'].includes(e.code))e.preventDefault();i.keys.add(e.code);if(e.repeat)return;if(e.code==='KeyB'&&s.phase==='buy'&&s.started) {
      s.buy=!s.buy;if(s.buy&&document.pointerLockElement)document.exitPointerLock();else if(!s.buy&&!s.shot)canvas.requestPointerLock();
    }
    if(e.code==='KeyR'&&s.started&&!s.buy)current().startReload();if(e.code.startsWith('Digit')) {
      const n=+e.code.slice(5);if(s.buy)buy(n);else if(n<=3)switchTo(['primary','pistol','grenade'][n-1]);
    }
  });
  document.addEventListener('keyup',e=>i.keys.delete(e.code));
  document.addEventListener('mousemove',e=> {
    if(!i.locked||s.buy)return;s.player.yaw-=e.movementX*.002;s.player.pitch=Math.max(-1.48,Math.min(1.48,s.player.pitch-e.movementY*.002));
  });
  document.addEventListener('mousedown',e=> {
    if(!i.locked||s.buy)return;if(e.button===0) {
      i.fire=true;i.pressed=true;
    }
    if(e.button===2)i.scope=true;
  });
  document.addEventListener('mouseup',e=> {
    if(e.button===0)i.fire=false;if(e.button===2)i.scope=false;
  });
  document.addEventListener('pointerlockchange',()=> {
    i.locked=document.pointerLockElement===canvas;if(!i.locked) {
      i.keys.clear();i.fire=i.pressed=i.scope=false;
    }
    s.paused=!i.locked&&!s.buy;
  });
  window.addEventListener('blur',()=> {
    i.keys.clear();i.fire=false;
  });
  s.ui.lock=()=> {
    unlockAudio();
    s.started=true;
    s.buy=false;
    canvas.requestPointerLock();
  };
}
