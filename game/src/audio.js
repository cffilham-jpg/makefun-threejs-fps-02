import { state as s } from './state.js';
export function unlockAudio() {
  if(!s.audio) {
    const C=window.AudioContext||window.webkitAudioContext;
    s.audio=new C();
  }
  s.audio.resume();
}
export function tone(f=440,t=.08,volume=.08,type='sine',end=f) {
  if(!s.audio)return;
  const c=s.audio,o=c.createOscillator(),g=c.createGain();
  o.type=type;
  o.frequency.setValueAtTime(f,c.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(20,end),c.currentTime+t);
  g.gain.setValueAtTime(volume,c.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,c.currentTime+t);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime+t);
}
export function sound(kind,weapon='pistol') {
  if(kind==='shot') {
    const f= {
      pistol:210,smg:160,rifle:100,marks:65
    }
    [weapon];
    tone(f,.14,.11,'sawtooth',30);
    tone(1100,.025,.04,'square',130);
  }
  else if(kind==='explode') {
    tone(65,.7,.3,'sawtooth',20);
    tone(170,.22,.16,'triangle',24);
  }
  else if(kind==='hit')tone(1250,.05,.07,'sine',800);
  else if(kind==='head')tone(1900,.12,.1,'triangle',1100);
  else if(kind==='reload') {
    tone(700,.05,.04,'square',180);
  }
  else if(kind==='win') {
    tone(440,.3,.08,'triangle',660);
    tone(660,.5,.06,'sine',880);
  }
  else if(kind==='lose')tone(330,.5,.1,'triangle',110);
  else if(kind==='beep')tone(1200,.09,.035,'sine');
  else tone(120,.035,.035,'square',60);
}
