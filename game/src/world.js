// Original depot geometry, lighting, signs and walkable route graph.
import * as T from 'three';
import { state as s } from './state.js';
import { P } from './palette.js';
export function world() {
  const scene=s.scene,colliders=[],solids=[],map=[];
  const skyCanvas=document.createElement('canvas');skyCanvas.width=16;skyCanvas.height=128;
  const skyContext=skyCanvas.getContext('2d'),gradient=skyContext.createLinearGradient(0,0,0,128);
  gradient.addColorStop(0,'#344956');gradient.addColorStop(.5,'#ad8173');gradient.addColorStop(1,'#e4b984');
  skyContext.fillStyle=gradient;skyContext.fillRect(0,0,16,128);
  const sky=new T.Mesh(new T.SphereGeometry(110,24,16),new T.MeshBasicMaterial({map:new T.CanvasTexture(skyCanvas),side:T.BackSide,depthWrite:false,fog:false}));
  scene.add(sky);
  const sunDisc=new T.Mesh(new T.SphereGeometry(3,16,12),new T.MeshBasicMaterial({color:0xffd29a,fog:false}));
  sunDisc.position.set(-65,28,43);scene.add(sunDisc);

  const mats= {
  };
  for(const [n,c]of Object.entries(P))mats[n]=new T.MeshStandardMaterial( {
    color:c,roughness:.76,metalness:n==='steel'?.45:.08
  });
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#879493';
  ctx.fillRect(0,0,128,128);
  for(let i=0;i<2400;i++) {
    ctx.fillStyle=`rgba(0,0,0,${s.random()*.10})`;
    ctx.fillRect(s.random()*128,s.random()*128,1,1);
  }
  ctx.strokeStyle='#74827f';
  ctx.strokeRect(1,1,126,126);
  const tex=new T.CanvasTexture(canvas);
  tex.wrapS=tex.wrapT=T.RepeatWrapping;
  tex.repeat.set(2,2);
  mats.steel.map=tex;
  function box(x,y,z,w,h,d,mat='steel',solid=true) {
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),mats[mat]);
    m.position.set(x,y,z);
    m.castShadow=m.receiveShadow=true;
    scene.add(m);
    if(solid) {
      colliders.push(new T.Box3(new T.Vector3(x-w/2,y-h/2,z-d/2),new T.Vector3(x+w/2,y+h/2,z+d/2)));
      solids.push(m);
      if(y-h/2<2)map.push( {
        x,z,w,d
      });
    }
    return m;
  }
  function label(text,x,y,z,size=2.4,color='#ffe0a0',ry=0) {
    const c=document.createElement('canvas');
    c.width=512;
    c.height=256;
    const a=c.getContext('2d');
    a.fillStyle='#152934';
    a.fillRect(0,0,512,256);
    a.strokeStyle=color;
    a.lineWidth=10;
    a.strokeRect(10,10,492,236);
    a.fillStyle=color;
    a.textAlign='center';
    a.font=`bold ${text.length>14?30:text.length>5?43:135}px sans-serif`;
    a.fillText(text,256,173);
    const m=new T.Mesh(new T.PlaneGeometry(size*2,size),new T.MeshBasicMaterial( {
      map:new T.CanvasTexture(c),side:T.DoubleSide
    }));
    m.position.set(x,y,z);
    m.rotation.y=ry;
    scene.add(m);
    return m;
  }
  function strip(x,y,z,w,ry=0) {
    const m=new T.Mesh(new T.BoxGeometry(w,.065,.09),new T.MeshBasicMaterial( {
      color:P.amber
    }));
    m.position.set(x,y,z);
    m.rotation.y=ry;
    scene.add(m);
  }
  box(0,-.22,0,53,.44,41,'ground',false);
  box(-26,2,0,.5,4,40);
  box(26,2,0,.5,4,40);
  box(0,2,-20,52,4,.5);
  box(0,2,20,52,4,.5);
  // Warehouse enclosure: two entrances off A-long and a broad central loading bay.
  box(-24,3,-4,.4,6,22);
  box(-19.5,3,-15,9,6,.5);
  box(-8.5,3,-15,5,6,.5);
  box(-6,3,-10,.5,6,10);
  box(-6,3,3,.5,6,4);
  box(-23,3,7,2,6,.5);
  box(-12,3,7,12,6,.5);
  box(-15,6.05,-4,18,.22,22,'dark',false);
  for(let z=-13;z<=5;z+=6) {
    box(-23.5,3,z,.5,6,.5,'dark');
    box(-6.5,3,z,.5,6,.5,'dark');
    strip(-15,5.65,z,12);
  }
  box(-19,2.9,-10,8,.24,3,'dark');
  for(const x of [-22,-16])box(x,1.4,-10,.15,2.8,.15,'dark');
  for(let i=0;i<6;i++)box(-12+i*.36,.14+i*.24,-10, .4,.28+i*.48,2.8,'steel');
  // Mid divider, double-door choke with two traversable openings.
  box(-3.5,2,0,3,4,.65);
  box(3.5,2,0,3,4,.65);
  box(0,3.7,0,4, .6,.65);
  box(-1.95,1.65,-.65,.16,3.3,1.5,'crate');
  box(1.95,1.65,.65,.16,3.3,1.5,'crate');
  box(-5,1.5,10,.6,3,6);
  box(5,1.5,10,.6,3,6);
  box(0,1,-8,6,2,2);
  box(0,1.5,-15,3,3,3);
  function crate(x,z,w=2,h=1.8) {
    box(x,h/2,z,w,h,w,'crate');
    for(const a of [-1,1]) {
      box(x+a*(w/2-.1),h/2,z,.13,h+.05,w+.05,'dark',false);
      box(x,h/2,z+a*(w/2-.1),w,.13,.1,'amber',false);
    }
    box(x,h-.12,z,w,.12,w,'dark',false);
  }
  crate(-13,-5,2.6,1.4);
  crate(-20,-2,2.4,2.6);
  crate(-10,2,2,1.7);
  crate(-19,11,2.5,1.2);
  crate(-10,-17,2,1.4);
  crate(11,9,2.2,1.15);
  crate(23,-12,2,1.4);
  crate(7,-16,2,1.3);
  function container(x,z,ry,color) {
    const w=ry?3:7,d=ry?7:3;
    box(x,1.5,z,w,3,d,color);
    for(let i=-3;i<=3;i++) {
      if(!ry)box(x+i,1.5,z+1.52,.065,2.8,.06,'dark',false);
      else box(x+1.52,1.5,z+i,.06,2.8,.065,'dark',false);
    }
    strip(x,3.05,z,w);
  }
  container(13,2,false,'teal');
  container(20,-3,true,'steel');
  container(12,-12,false,'crate');
  container(22,12,true,'steel');
  box(15,.55,-8,5,1.1,.65,'steel');
  box(8,.55,14,4,1.1,.6,'steel');
  box(-13,.6,14,5,1.2,.65,'steel');
  for(const [x,z]of [[-23,10],[-22,12],[8,-4],[9,-3],[23,-14]]) {
    const m=new T.Mesh(new T.CylinderGeometry(.43,.43,1.15,12),mats.amber);
    m.position.set(x,.575,z);
    scene.add(m);
    colliders.push(new T.Box3(new T.Vector3(x-.43,0,z-.43),new T.Vector3(x+.43,1.15,z+.43)));
    solids.push(m);
  }
  const sites=[ {
    name:'A',x:-16,z:-4
  }, {
    name:'B',x:15,z:-5
  }];
  for(const site of sites) {
    const ring=new T.Mesh(new T.RingGeometry(2.5,2.58,64),new T.MeshBasicMaterial( {
      color:P.amber,side:T.DoubleSide
    }));
    ring.rotation.x=-Math.PI/2;
    ring.position.set(site.x,.018,site.z);
    scene.add(ring);
    label(site.name==='A'?'SITE A / KILN HALL':'SITE B / FREIGHT YARD',site.x,3.2,site.z-3.4,2);
    for(let i=0;i<4;i++)box(site.x-2.6+i*1.7,.025,site.z+2.7,.8,.04,.18,'amber',false);
  }
  // Utility pipes and striped loading curbs remain outside walking lanes.
  for(const x of [-23.3,24.5]){
    for(let i=0;i<3;i++){
      const pipe=new T.Mesh(new T.CylinderGeometry(.12,.12,16,8),mats.dark);
      pipe.rotation.x=Math.PI/2;pipe.position.set(x,2.8+i*.3,-2);scene.add(pipe);
    }
  }
  for(let i=0;i<10;i++){
    const stripe=box(-22+i*.38,.08,6.3,.23,.08,.8,i%2?'dark':'amber',false);
    stripe.rotation.y=-.45;
  }
  label('MERIDIAN',0,5,-19.65,2.3);
  label('A  /  01',-15,3.7,6.7,1.25);
  label('B  /  02',18,4,-19.6,1.25);
  label('MID',0,3.8, .38,.65);
  label('WARDENS',0,2.4,19.65,1.1,'#8cf2df',Math.PI);
  for(const [x,z] of [[-4,17],[7,-18],[24,4],[-24,-16]]) {
    box(x,4,z,.15,8,.15,'dark',false);
    box(x+1,7.8,z,2,.15,.25,'dark',false);
    strip(x+1,7.65,z,1.8);
    const l=new T.PointLight(P.amber,65,15,2);
    l.position.set(x+1,6,z);
    scene.add(l);
  }
  // Painted traffic lines and storm drains make the ground legible without assets.
  for(let z=-18;z<19;z+=3)box(4,.012,z,.1,.02,1.5,'amber',false);
  for(let x=-23;x<25;x+=4)box(x,.013,18,2,.02,.1,'white',false);
  for(let i=0;i<8;i++)box(-3+i*.8,.012,12,.4,.02,1.5,'dark',false);
  scene.add(new T.AmbientLight(0xb6c9d4,.65));
  for(const [x,z]of [[-18,-9],[-12,1]]) {
    const l=new T.PointLight(0xffd6a1,95,18,2);
    l.position.set(x,4.7,z);
    scene.add(l);
  }
  const sun=new T.DirectionalLight(0xffc58c,2.6);
  sun.position.set(-30,14,22);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera, {
    left:-32,right:32,top:27,bottom:-27,near:1,far:90
  });
  sun.shadow.bias=-.0004;
  scene.add(sun,new T.HemisphereLight(0xa7c9e0,0x34333e,2.0));
  const fill=new T.DirectionalLight(0x79b6dc,.7);
  fill.position.set(15,12,-18);
  scene.add(fill);
  // Hand-placed graph. Edges cross only open walking lanes; routing uses BFS.
  const nodes=[[-2,16],[-11,12],[-21.5,8.8],[-20,3],[-16,0],[-16,-5],[-19,-12],[-13,-12],[-13,-18.8],[0,-18.8],[4.8,-18.5],[7,-8],[11,-5],[16,-6],[23,-9],[23,4],[18,7],[11,12],[1,7],[0,3],[0,-3],[-9,-3],[7,6],[5,-12],[4.4,-5],[5,16],[11,16],[-16,9],[8,12]];
  const edges=[[0,1],[0,18],[0,25],[25,26],[26,17],[1,27],[27,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,17],[17,28],[28,22],[22,18],[18,19],[19,20],[20,24],[24,23],[23,10],[20,21],[21,4],[11,23],[13,16]];
  const adj=nodes.map(()=>[]);
  for(const[a,b]of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  s.world= {
    box,label,colliders,solids,map,sites,nodes,adj
  };
  return s.world;
}
export function route(from,to) {
  const w=s.world;
  let a=0,b=0,da=Infinity,db=Infinity;
  for(let i=0;i<w.nodes.length;i++) {
    const n=w.nodes[i],d=(n[0]-from.x)**2+(n[1]-from.z)**2,e=(n[0]-to.x)**2+(n[1]-to.z)**2;
    if(d<da) {
      da=d;
      a=i;
    }
    if(e<db) {
      db=e;
      b=i;
    }
  }
  const prev=new Int16Array(w.nodes.length).fill(-1),q=[a];
  prev[a]=a;
  for(let i=0;i<q.length&&prev[b]<0;i++)for(const n of w.adj[q[i]])if(prev[n]<0) {
    prev[n]=q[i];
    q.push(n);
  }
  const path=[];
  if(prev[b]>=0) {
    for(let n=b;n!==a;n=prev[n])path.push(n);
    path.push(a);
    path.reverse();
  }
  return path;
}
