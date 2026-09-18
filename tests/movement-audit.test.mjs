import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,MOVEMENT_PACE,MOVES} from '../dist/src/engine.js';
import {Renderer} from '../dist/src/render.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url)));
function review(id){
 const draws=[];let scale=1,rotation=0,stack=[];
 const ctx=new Proxy({save(){stack.push([scale,rotation]);},restore(){[scale,rotation]=stack.pop();},scale(x){scale*=x;},rotate(a){rotation+=a;},drawImage(img,x,y,w,h,...dest){assert.ok([x,y,w,h,...dest].every(Number.isFinite));assert.ok(x>=0&&y>=0&&x+w<=img.width&&y+h<=img.height);draws.push({x,y,w,h,scale,screenW:Math.abs(w*Math.cos(rotation))+Math.abs(h*Math.sin(rotation)),screenH:Math.abs(h*Math.cos(rotation))+Math.abs(w*Math.sin(rotation))});}},{get:(t,k)=>k in t?t[k]:()=>{}});
 const atlas={width:roster[id].atlasSize[0],height:roster[id].atlasSize[1]};
 const m=new Match(roster,id,(id+1)%roster.length,{mode:'local'});m.phase='fight';m.fighters[0].weapon='none';
 const r=new Renderer({getContext:()=>ctx},roster,{[id]:atlas},[]);r.reduced=true;
 return {m,f:m.fighters[0],render(){draws.length=0;r.fighter(m.fighters[0],0,m);assert.ok(draws.length);return draws[0];}};
}
test('all locomotion frames render in both facings and backpedal reverses the sequence without turning the body',()=>{
 for(let id=0;id<roster.length;id++){
  const {f,render}=review(id);
  for(const anim of ['walk','run',...Object.keys(f.definition.animations).filter(k=>k.startsWith('carry'))]){
   const frames=f.definition.animations[anim];f.state=anim.startsWith('carry')?'walk':anim;f.weapon=anim.startsWith('carry')?anim.slice(5).toLowerCase():'none';
   for(const facing of [-1,1])for(const direction of [-1,1])for(let i=0;i<frames.length;i++){
    f.facing=facing;f.walkDirection=facing*direction;f.t=(i+.25)/((anim==='run'?13:10)*f.definition.speed*MOVEMENT_PACE);
    const expected=frames[direction===1?i:frames.length-1-i],draw=render();
    assert.deepEqual([draw.x,draw.y,draw.w,draw.h],[expected.x,expected.y,expected.w,expected.h],`${f.definition.id} ${anim}`);
    assert.equal(Math.sign(draw.scale),facing*(expected.flipX?-1:1));
   }
  }
 }
});
test('every fighter settles into a horizontal resting or KO pose after either fall',()=>{
 for(let id=0;id<roster.length;id++){
  const {f,render}=review(id);f.state='down';f.fallDuration=.4;f.t=1;
  for(const face of ['front','back'])for(const hp of [0,10])for(const facing of [-1,1]){f.fallFace=face;f.hp=hp;f.facing=facing;const pose=render();assert.ok(pose.screenW>pose.screenH,`${f.definition.id} ${face} must not hold a standing/tumbling frame`);}
 }
});
test('Matt Cross unarmed heavy uses an intact strike when the source kick art is clipped',()=>{
 const id=roster.findIndex(f=>f.id==='matt-cross'),{m,f,render}=review(id);
 m.startAttack(f,'heavy',0);assert.equal(f.attackStyle,'light');f.t=MOVES.heavy.startup;const pose=render();assert.equal(pose.x,f.definition.animations.light[1].x);
});
test('Big Vito jump excludes the rope-panel crops and front falls finish at roster body scale',()=>{
 const vito=roster.find(f=>f.id==='big-vito');assert.ok(vito.animations.jump.every(e=>e.frame===50||e.frame===51));
 for(const id of ['atiba','tommy','jacksyn']){const a=roster.find(f=>f.id===id).animations;assert.deepEqual(a.fallFront.at(-1),a.down[0]);}
});
