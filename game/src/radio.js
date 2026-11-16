// Short squad messages also carry support orders; no omniscient enemy positions.
import { state as s } from './state.js';
export function zone(pos) {return pos.x<-6?'A / Kiln Hall':pos.x>6?'B / Freight Yard':'Mid';}
export function radio(who,text,position=null) {
  s.radio.push({name:who.name,team:who.team,text,time:s.time});
  if(s.radio.length>4)s.radio.shift();
  if(!position)return;
  let nearest=null,distance=Infinity;
  for(const b of s.bots){
    if(!b.alive||b.team!==who.team||b===who||b===s.bomb.carrier||b.mode==='DEFUSE')continue;
    const d=b.pos.distanceToSquared(position);
    if(d<distance){nearest=b;distance=d;}
  }
  if(nearest){nearest.supportX=position.x;nearest.supportZ=position.z;nearest.supportUntil=s.time+6;nearest.decision=0;}
}
export function quickRadio(code) {
  if(!s.player.alive||s.phase!=='live'||s.time<(s.player.radioAt||0))return;
  s.player.radioAt=s.time+2;
  const text=code==='KeyZ'?'Need backup':code==='KeyX'?'Rotating':'Planting denied — cover the charge';
  radio(s.player,`${text} at ${zone(s.player.pos)}`,s.player.pos);
}
