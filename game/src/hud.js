import { state as s } from './state.js';
import { DEFS,current,buy } from './weapons.js';
import { restart } from './rounds.js';
const $=id=>document.getElementById(id);
const products=[['Sparrow-9','12 RDS · 34 DMG · SEMI-AUTO',0],['Hornet SMG','30 RDS · 24 DMG · FULL AUTO',900],['Falcon rifle','30 RDS · 36 DMG · FULL AUTO',2100],['Longbow','5 RDS · 95 DMG · SCOPED BOLT',3200],['Frag grenade','1.5s FUSE · AREA DAMAGE · MAX 2',300],['Kevlar armor','ABSORBS 50% INCOMING DAMAGE',650]];
export function initHud() {
  for(let i=0;i<6;i++) {
    const b=document.createElement('button');
    b.className='item';
    b.innerHTML=`<span class="num">0${i+1}</span><span class="name">${products[i][0]}</span><span class="price">${products[i][2]?'$'+products[i][2]:'ISSUED'}</span><span class="desc">${products[i][1]}</span><span class="owned"></span>`;
    b.onclick=()=>buy(i+1);
    $('items').appendChild(b);
  }
  s.ui.items=Array.from($('items').children);
  $('play').onclick=()=>s.ui.lock();
  $('resume').onclick=()=>s.ui.lock();
  $('pausebuy').onclick=()=> {
    if(s.phase==='buy') {
      s.buy=true;
      s.paused=false;
    }
  };
  $('closebuy').onclick=()=> {
    s.buy=false;
    if(!s.shot)s.ui.lock();
  };
  $('again').onclick=()=> {
    restart();
    s.ui.lock();
  };
  s.ui.map=$('minimap').getContext('2d');
}
function timer(n) {
  n=Math.max(0,Math.ceil(n));
  return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
}
export function hudRender() {
  const now=performance.now();
  if(now<(s.ui.nextHud||0))return;
  s.ui.nextHud=now+60;
  const p=s.player,w=current(),d=DEFS[w.id],b=s.bomb;
  const start=!s.started;
  const text=(id,v)=> {
    const el=$(id);
    if(el.textContent!==String(v))el.textContent=v;
  };
  $('overlay').hidden=!start;
  $('pause').hidden=start||!s.paused||s.buy||s.phase==='match'||s.shot;
  $('buy').hidden=!s.buy;
  $('match').hidden=s.phase!=='match';
  $('hud').style.opacity=start?'.6':'1';
  text('scoreW',s.score[0]);
  text('scoreS',s.score[1]);
  text('phase',s.phase==='buy'?'REQUISITION':s.phase==='live'?'LIVE OPERATION':s.phase==='end'?'ROUND COMPLETE':'MATCH COMPLETE');
  text('timer',timer(s.phaseLeft));
  text('round',`ROUND ${String(s.round).padStart(2,'0')} / FIRST TO 5`);
  text('money',`$${s.money.toLocaleString()}`);
  text('mag',s.slot==='grenade'?s.grenades:w.mag);
  text('reserve',s.slot==='grenade'?'FRAG':w.reserve);
  text('weaponname',s.slot==='grenade'?'FRAGMENTATION':d.name.toUpperCase());
  text('weaponstatus',w.reload>0?`RELOADING ${w.reload.toFixed(1)}s`:s.slot==='grenade'?'CLICK TO THROW':d.auto?'AUTOMATIC · CONTROL YOUR BURST':w.id==='marks'?'BOLT ACTION · RMB TO SCOPE':'SEMI-AUTO · MAKE IT COUNT');
  document.querySelector('#health strong').textContent=Math.ceil(p.hp);
  document.querySelector('#health i').style.width=`${p.hp}%`;
  text('armor',p.armor>0?`◇ KEVLAR ${Math.ceil(p.armor)}`:'◇ NO ARMOR');
  const wa=[p,...s.bots.filter(a=>a.team===0)],st=s.bots.filter(a=>a.team===1);
  $('pips').innerHTML=`<span class="teal">${wa.map(a=>a.alive?'◆':'◇').join('')}</span><span class="amber">${st.map(a=>a.alive?'◆':'◇').join('')}</span>`;
  text('bombstatus',s.phase==='end'?s.reason:b.planted?`CHARGE AT ${s.world.sites[b.site].name} · ${timer(b.fuse)}${b.defuse>0?' · DEFUSING':''}`:b.progress>0?'STRIKERS ARMING CHARGE':s.phase==='buy'?'GEAR UP. HOLD BOTH SITES.':'CHARGE / CARRIER ACTIVE');
  $('progress').style.display=s.phase==='live'&&(b.defuse>0||b.progress>0)?'block':'none';
  document.querySelector('#progress i').style.width=`${b.planted?b.defuse/5*100:b.progress/3.5*100}%`;
  text('hint',!p.alive?'SQUAD CAMERA':s.phase==='buy'?'B · OPEN REQUISITION':b.planted&&p.pos.distanceTo(b.pos)<2.4?'HOLD E · DEFUSE CHARGE':w.mag===0?'R · RELOAD':s.slot==='grenade'?'CLICK · THROW FRAG':'HOLD YOUR ANGLE');
  $('crosshair').style.setProperty('--gap',`${5+s.spread*310}px`);
  $('crosshair').hidden=start||!p.alive||s.buy||s.input.scope&&w.id==='marks';
  $('hitmarker').style.opacity=s.hit>0?1:0;
  $('hitmarker').style.color=s.headKill?'#ff6e58':'#f6ffe7';
  $('hurt').style.opacity=s.hurt*.85;
  $('direction').style.opacity=s.hurt;
  $('direction').style.transform=`rotate(${s.hitAngle}rad)`;
  $('flash').style.opacity=s.white;
  $('scope').style.display=s.input.scope&&w.id==='marks'&&p.alive?'block':'none';
  $('banner').hidden=s.phase!=='end';
  text('result',`${s.winner===0?'WARDENS':'STRIKERS'} WIN THE ROUND`);
  text('resultlabel',s.winner===0?'ROUND SECURED':'PERIMETER BREACHED');
  text('reason',`${s.reason}  /  ${s.winner===0?'+$'+(s.reason==='CHARGE DEFUSED'?1600:1400):'LOSS BONUS'}  /  NEXT ROUND IN ${Math.max(0,Math.ceil(s.phaseLeft))}`);
  $('dead').hidden=p.alive||start||s.phase!=='live';
  $('feed').innerHTML=s.feed.filter(f=>s.time-f.time<5).map(f=>`<div style="border-color:${f.team?'#ffc47a':'#7de4d3'};opacity:${Math.min(1,5-(s.time-f.time))}">${f.text}</div>`).join('');
  if(s.buy) {
    text('funds',`$${s.money.toLocaleString()}`);
    text('buyround',String(s.round).padStart(2,'0'));
    text('buytime',`DEPLOYMENT IN ${Math.max(0,Math.ceil(s.phaseLeft))}s`);
    for(let i=0;i<6;i++) {
      const id=['pistol','smg','rifle','marks'][i];
      const owned=i===0||i<4&&s.primary===id||i===4&&s.grenades===2||i===5&&p.armor>=100;
      s.ui.items[i].disabled=owned||products[i][2]>s.money;
      s.ui.items[i].querySelector('.owned').textContent=i===4?`${s.grenades} / 2 OWNED`:owned?'OWNED':'';
    }
  }
  if(s.phase==='match') {
    text('matchtitle',s.score[0]>=5?'DEPOT SECURED':'DEPOT LOST');
    text('finalscore',`${s.score[0]} — ${s.score[1]}`);
    text('matchcopy',s.score[0]>=5?'The Wardens held Meridian Yard.':'The Strikers breached Meridian Yard. Regroup and try again.');
  }
  drawMap();
}
function drawMap() {
  const c=s.ui.map,w=224,h=178,scale=3.85,px=x=>w/2+x*scale,pz=z=>h/2+z*scale;
  c.clearRect(0,0,w,h);
  c.fillStyle='#152b34';
  c.fillRect(0,0,w,h);
  c.strokeStyle='#52757825';
  c.lineWidth=1;
  for(let x=0;x<w;x+=20) {
    c.beginPath();
    c.moveTo(x,0);
    c.lineTo(x,h);
    c.stroke();
  }
  for(const r of s.world.map) {
    c.fillStyle='#61757c';
    c.fillRect(px(r.x-r.w/2),pz(r.z-r.d/2),Math.max(1,r.w*scale),Math.max(1,r.d*scale));
  }
  for(const site of s.world.sites) {
    c.fillStyle='#ffc47a22';
    c.beginPath();
    c.arc(px(site.x),pz(site.z),12,0,Math.PI*2);
    c.fill();
    c.fillStyle='#ffc47a';
    c.font='bold 12px monospace';
    c.textAlign='center';
    c.fillText(site.name,px(site.x),pz(site.z)+4);
  }
  for(const a of s.bots)if(a.alive&&a.team===0) {
    c.fillStyle='#7de4d3';
    c.beginPath();
    c.arc(px(a.pos.x),pz(a.pos.z),3,0,Math.PI*2);
    c.fill();
  }
  if(s.bomb.planted) {
    c.fillStyle=s.time%1<.5?'#ff7257':'#ffdc98';
    c.fillRect(px(s.bomb.pos.x)-3,pz(s.bomb.pos.z)-3,6,6);
  }
  const p=s.player;
  c.save();
  c.translate(px(p.pos.x),pz(p.pos.z));
  c.rotate(-p.yaw);
  c.fillStyle='#f0fff0';
  c.beginPath();
  c.moveTo(0,-6);
  c.lineTo(4,4);
  c.lineTo(0,2);
  c.lineTo(-4,4);
  c.closePath();
  c.fill();
  c.restore();
  const loc=p.pos.x<-6?'A / WAREHOUSE':p.pos.x>6?'B / CONTAINER YARD':p.pos.z>7?'WARDEN APPROACH':'MID / DOUBLE DOORS';
  $('location').textContent=loc;
}
