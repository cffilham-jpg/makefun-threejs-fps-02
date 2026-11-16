// Shared simulation, equipment, squad plans and pooled effects.
import * as T from 'three';
export function actor(name,team,x,z) {
  return {
    name,team,helmet:false,kit:false,blind:0,kills:0,deaths:0,plants:0,defuses:0,roundKills:0,roundObjective:0,money:800,weapon:'pistol',pos:new T.Vector3(x,0,z),vel:new T.Vector3(),hp:100,armor:0,alive:true,height:1.78,eye:1.64,ground:true,crouch:false,yaw:0,pitch:0,kick:0,drift:0,flash:0,death:0
  };
}
export const state= {
  time:0,seed:1,random:null,started:false,paused:true,shot:false,phase:'buy',phaseLeft:15,round:1,score:[0,0],loss:[0,0],money:800,buy:false,reason:'',winner:0,player:actor('YOU',0,0,16),bots:[],actors:[],world:null,scene:null,camera:null,renderer:null,input: {
    keys:new Set(),locked:false,fire:false,pressed:false,scope:false
  },weapons: {
  },slot:'pistol',primary:null,grenades:0,smokes:0,flashes:0,smokeView:0,radio:[],plan:{site:0,executeAt:0,retakeAt:0,retakeCalled:false},mvp:'',settings:{sensitivity:1,volume:.7,invert:false},help:false,heat:0,spread:0,hit:0,headKill:false,hurt:0,hitAngle:0,shake:0,white:0,feed:[],noise: {
    pos:new T.Vector3(),time:-100,team:0
  },bomb: {
    planted:false,site:0,fuse:30,progress:0,defuse:0,carrier:null,pos:new T.Vector3(),mesh:null,beep:0
  },fx: {
    tracers:[],particles:[],grenades:[],rings:[],smokes:[]
  },view:null,ui: {
  },accumulator:0
};
