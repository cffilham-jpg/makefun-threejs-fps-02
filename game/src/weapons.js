import * as T from 'three';
import { state as s } from './state.js';
import { sound } from './audio.js';
export const DEFS= {
  pistol: {
    name:'Sparrow-9',mag:12,reserve:48,damage:34,gap:.23,reload:1.35,auto:false,price:0
  },smg: {
    name:'Hornet',mag:30,reserve:90,damage:24,gap:.09,reload:1.85,auto:true,price:900
  },rifle: {
    name:'Falcon',mag:30,reserve:60,damage:36,gap:.12,reload:2.15,auto:true,price:2100
  },marks: {
    name:'Longbow',mag:5,reserve:20,damage:95,gap:1.2,reload:2.6,auto:false,price:3200
  }
};
export class Weapon {
  constructor(id) {
    this.id=id;
    this.mag=DEFS[id].mag;
    this.reserve=DEFS[id].reserve;
    this.cooldown=0;
    this.reload=0;
  }
  tick(dt) {
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(this.reload>0) {
      this.reload=Math.max(0,this.reload-dt);
      if(!this.reload) {
        const n=Math.min(DEFS[this.id].mag-this.mag,this.reserve);
        this.mag+=n;
        this.reserve-=n;
        sound('reload');
      }
    }
  }
  startReload() {
    if(this.reload||this.mag===DEFS[this.id].mag||!this.reserve)return;
    this.reload=DEFS[this.id].reload;
    sound('reload');
  }
}
export function current() {
  return s.weapons[s.slot==='primary'?s.primary:'pistol'];
}
export function switchTo(slot) {
  if(slot==='primary'&&!s.primary)return;
  if(slot==='grenade'&&!s.grenades)return;
  const w=current();
  if(w)w.reload=0;
  s.slot=slot;
  s.input.scope=false;
}
export function buy(n) {
  if(s.phase!=='buy')return;
  const id=['pistol','smg','rifle','marks','frag','armor'][n-1];
  const price=id==='frag'?300:id==='armor'?650:DEFS[id]?.price;
  if(price===undefined||s.money<price)return;
  if(id==='frag') {
    if(s.grenades>=2)return;
    s.grenades++;
  }
  else if(id==='armor') {
    if(s.player.armor>=100)return;
    s.player.armor=100;
  }
  else if(id==='pistol')switchTo('pistol');
  else {
    if(s.primary===id)return;
    s.primary=id;
    s.weapons[id]=new Weapon(id);
    switchTo('primary');
  }
  s.money-=price;
  sound('reload');
}
export function spread() {
  const p=s.player;
  return (.0018+Math.hypot(p.vel.x,p.vel.z)*.005+s.heat*.013+(!p.ground?.035:0))*(p.crouch?.55:1)*(s.input.scope?.3:1);
}
export function initView() {
  const g=new T.Group();
  s.camera.add(g);
  const dark=new T.MeshStandardMaterial( {
    color:0x1a2930,metalness:.65,roughness:.35
  }),metal=new T.MeshStandardMaterial( {
    color:0x697f82,metalness:.7,roughness:.4
  }),teal=new T.MeshStandardMaterial( {
    color:0x69cbbd,roughness:.6
  }),glove=new T.MeshStandardMaterial( {
    color:0x283d43,roughness:1
  });
  const piece=(w,h,d,x,y,z,m)=> {
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);
    mesh.position.set(x,y,z);
    g.add(mesh);
    return mesh;
  };
  const receiver=piece(.13,.16,.5,0,0,0,dark);
  const barrel=piece(.07,.07,.48,0,.02,-.43,metal);
  const stock=piece(.13,.12,.25,0,-.02,.3,dark);
  const scope=piece(.085,.10,.3,0,.22,-.05,dark);
  const lens=piece(.06,.06,.015,0,.22,.11,teal);
  piece(.095,.23,.11,0,-.16,.12,glove).rotation.x=-.2;
  piece(.09,.2,.17,0,-.18,-.03,dark).rotation.x=.15;
  piece(.1,.06,.35,0,.105,-.05,metal);
  piece(.08,.06,.06,0,.14,-.21,dark);
  piece(.06,.07,.06,0,.14,.12,dark);
  piece(.135,.025,.21,0,.045,-.08,teal);
  piece(.16,.12,.2,-.06,-.14,-.27,glove);
  piece(.13,.13,.4,-.09,-.22,-.05,teal).rotation.x=.5;
  piece(.14,.14,.38,.01,-.26,.35,teal).rotation.x=-.5;
  const flash=new T.Mesh(new T.ConeGeometry(.1,.35,6),new T.MeshBasicMaterial( {
    color:0xffd09a,transparent:true,opacity:.95
  }));
  flash.rotation.x=-Math.PI/2;
  flash.position.set(0,.02,-.83);
  g.add(flash);
  const light=new T.PointLight(0xffb56a,0,3);
  light.position.set(0,0,-.7);
  g.add(light);
  s.view= {
    group:g,flash,light,receiver,barrel,stock,scope,lens
  };
}
export function viewRender() {
  const v=s.view,p=s.player,w=current();
  v.group.visible=p.alive&&s.started&&s.slot!=='grenade'&&!(s.input.scope&&w.id==='marks');
  const pistol=w.id==='pistol';
  v.group.scale.setScalar(pistol?.65:w.id==='smg'?.72:.8);
  v.receiver.scale.z=pistol?.7:1;
  v.barrel.scale.z=pistol?.35:w.id==='marks'?1.5:1;
  v.barrel.position.z=pistol?-.2:w.id==='marks'?-.52:-.43;
  v.stock.visible=!pistol;
  v.scope.visible=w.id==='marks';
  v.lens.visible=w.id==='marks';
  v.flash.position.z=pistol?-.44:w.id==='marks'?-1:-.83;
  v.group.position.set(.28,-.27,-.51+p.kick*.9);
  v.group.rotation.set(p.kick*.7-(w.reload>0?.5:0),-.05,Math.sin(s.time*8)*Math.hypot(p.vel.x,p.vel.z)*.002);
  v.flash.visible=p.flash>0;
  v.light.intensity=p.flash>0?6:0;
}
