// Local preferences and controls help; capture mode always uses fixed defaults.
import { state as s } from './state.js';
export function initSettings(){
  if(!s.shot){
    try{
      const saved=JSON.parse(localStorage.getItem('meridian-settings')||'null');
      if(saved){
        s.settings.sensitivity=Math.max(.25,Math.min(2.5,Number(saved.sensitivity)||1));
        s.settings.volume=Math.max(0,Math.min(1,Number(saved.volume)||0));
        s.settings.invert=saved.invert===true;
      }
    }catch{/* Unavailable storage leaves the defaults intact. */}
  }
  for(const key of ['sensitivity','volume','invert']){
    const el=document.getElementById('setting-'+key);
    if(key==='invert')el.checked=s.settings[key];else el.value=s.settings[key];
    el.oninput=()=>{
      s.settings[key]=key==='invert'?el.checked:Number(el.value);
      if(!s.shot)try{localStorage.setItem('meridian-settings',JSON.stringify(s.settings));}catch{}
    };
  }
  document.getElementById('closehelp').onclick=()=>toggleHelp();
}
export function toggleHelp(){
  s.help=!s.help;
  document.getElementById('help').hidden=!s.help;
  if(s.help){
    s.input.keys.clear();s.input.fire=s.input.pressed=false;
    if(document.pointerLockElement)document.exitPointerLock();
    s.paused=true;
  }else if(s.started&&!s.buy&&!s.shot)s.ui.lock();
}
