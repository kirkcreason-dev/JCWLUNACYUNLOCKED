import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,MOVES,FLOOR} from '../dist/src/engine.js';
import {Renderer} from '../dist/src/render.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const gradient={addColorStop(){}};
function renderer(){
 let count=0;
 const ctx=new Proxy({createLinearGradient(){return gradient;},drawImage(img,sx,sy,sw,sh,...args){assert.ok(img);assert.ok([sx,sy,sw,sh,...args].every(Number.isFinite));if(args.length){assert.ok(sx>=0&&sy>=0);assert.ok(sx+sw<=img.width&&sy+sh<=img.height,'Sprite crop is outside its atlas');}count++;}}, {get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>(t[k]=v,true)});
 const atlases=Object.fromEntries(roster.map((r,i)=>[i,{width:r.atlasSize[0],height:r.atlasSize[1]}]));
 return {r:new Renderer({getContext:()=>ctx},roster,atlases,[0,1,2,3].map(()=>({width:1672,height:941}))),ctx,count:()=>count};
}
test('every roster animation and fighter facing uses a valid transparent atlas crop',()=>{
 const {r,count}=renderer();
 for(let i=0;i<roster.length;i++){
   const m=new Match(roster,i,(i+1)%roster.length,{mode:'local'});m.phase='fight';
   for(const state of ['idle','walk','jump','block','light','heavy','special','hurt','down','pinned','rise','grapple','grabbed','lifted','thrown','throw','pin','victory','defeat','run','equip','taunt','ropeTaunt','climb','perch','dive']){
     for(const facing of [-1,1])for(const t of [0,.11,.3,.7,1.1]){m.fighters[0].state=state;m.fighters[0].facing=facing;m.fighters[0].t=t;r.draw(m,i%4);}
   }
 }
 assert.ok(count()>4000);
});
test('Bronson uses the supplied opposite-facing back fall on the correct side',()=>{
 const {r,ctx}=renderer(),id=roster.findIndex(f=>f.id==='father-bronson'),m=new Match(roster,id,9,{mode:'local'});m.phase='fight';
 const f=m.fighters[0];f.state='down';f.fallFace='back';f.fallDuration=1;f.t=.21;
 const crops=[];ctx.drawImage=(_image,x,y)=>crops.push([x,y]);
 for(const facing of [-1,1]){f.facing=facing;crops.length=0;r.fighter(f,0,m);const e=f.definition.animations[facing===-1?'fallBackReverse':'fallBack'][1];assert.deepEqual(crops[0],[e.x,e.y]);}
});
test('HUD and banners handle pin, intro, timeout draw and match result states',()=>{
 const {r}=renderer();const m=new Match(roster,0,1,{mode:'local'});
 r.draw(m);m.phaseTime=2;r.draw(m);m.phase='fight';m.startPin(0);m.pin.count=2;m.pin.escape=4;r.draw(m);m.pin=null;m.phase='roundEnd';m.roundWinner=null;r.draw(m);m.roundWinner=1;r.draw(m);r.receive([{type:'hit',x:550,z:0,combo:2},{type:'special'},{type:'guardBreak'}]);r.draw(m);
});

test('combo numbers replace the earlier count instead of overlapping it',()=>{
 const {r}=renderer();
 r.receive([{type:'hit',attacker:0,x:550,combo:2},{type:'hit',attacker:0,x:570,combo:3}]);
 assert.deepEqual(r.popups.filter(p=>p.kind==='combo').map(p=>p.text),['3 HIT']);
 r.receive([{type:'hit',attacker:1,x:500,combo:2}]);
 assert.equal(r.popups.filter(p=>p.kind==='combo').length,2);
});

test('portrait camera and six arena crops handle corners, airborne fighters, and pins',()=>{
 const {r}=renderer();r.portrait=true;r.arenas=Array.from({length:6},()=>({width:1672,height:941}));
 const m=new Match(roster,0,1,{mode:'practice'});m.phase='fight';
 for(const positions of [[200,280],[200,1080],[980,1080],[560,640]]){
  m.fighters.forEach((f,i)=>{f.x=positions[i];f.z=i?245:150;f.state=i?'lifted':'jump';});
  for(let arena=0;arena<6;arena++)r.draw(m,arena);
 }
 m.fighters.forEach(f=>f.z=0);m.startPin(1);r.draw(m,5);m.phase='roundEnd';m.roundWinner=0;r.draw(m,4);
});

test('either attacker is drawn above the defender without reversing pin and lift layers',()=>{
 const {r}=renderer(),m=new Match(roster,9,10,{mode:'local'});m.phase='fight';let order=[];r.fighter=(_f,i)=>order.push(i);
 for(const attacker of [0,1]){
  m.fighters.forEach((f,i)=>f.move=i===attacker?'light':null);order=[];r.draw(m);assert.deepEqual(order,[1-attacker,attacker]);
  m.pin={attacker,count:1,escape:0};order=[];r.draw(m);assert.deepEqual(order,[1-attacker,attacker]);m.pin=null;
  m.grapple={attacker,time:.5};order=[];r.draw(m);assert.deepEqual(order,[attacker,1-attacker]);m.grapple=null;
 }
});

test('guitar contact overlays stay attached to intact bodies in both directions',()=>{
 const {r,ctx}=renderer();const original=ctx.drawImage;let props=0,expected;
 ctx.drawImage=(img,x,y,...args)=>{original(img,x,y,...args);if(x===expected.x&&y===expected.y)props++;};
 for(const id of roster.map((f,i)=>f.animations.propGuitar?i:-1).filter(i=>i>=0))for(const facing of [-1,1]){
  const m=new Match(roster,id,9,{mode:'local'});m.phase='fight';const f=m.fighters[0];
  f.state='heavy';f.move='guitar';f.attackStyle='guitar';f.facing=facing;expected=f.definition.animations.propGuitar[0];
  for(const t of [0,MOVES.guitar.startup,MOVES.guitar.startup+MOVES.guitar.active]){f.t=t;r.fighter(f,0,m);}
 }
 assert.equal(props,roster.filter(f=>f.animations.propGuitar).length*2,'Only the active contact window needs the extra guitar');
});

test('supplied combat effects follow event positions, expire, and honor reduced motion',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../dist/assets/fx/manifest.json',import.meta.url),'utf8'));
 const {r}=renderer(),m=new Match(roster,16,20,{mode:'local'});m.phase='fight';
 r.combatFx=Object.fromEntries(Object.entries(manifest).map(([k,v])=>[k,{...v,image:{width:1024,height:Math.ceil(v.frames/4)*256}}]));
 r.receive([{type:'hit',index:1,attacker:0,move:'light',x:590,z:30},{type:'hit',index:1,move:'heavy',x:610},{type:'block',index:0,x:530},{type:'slam',index:1,x:600},{type:'land',index:0}],m);
 assert.deepEqual(r.spriteFx.map(f=>f.key),['chips','impact','guard','ground','ground']);assert.equal(r.spriteFx[0].y,FLOOR-135-30);assert.equal(r.spriteFx[4].x,m.fighters[0].x);
 for(let n=0;n<90;n++)r.draw(m,0,1/60);assert.equal(r.spriteFx.length,0);
 r.reduced=true;r.receive([{type:'hit',x:500,index:1}],m);assert.equal(r.spriteFx.length,0);
});
test('announcement artwork renders for the correct pinfall, tap-out and special events',()=>{
 const {r}=renderer(),m=new Match(roster,16,20,{mode:'local'});r.bannerArt=Object.fromEntries(['pinfall','tapout','kickout','lunacy'].map(k=>[k,{width:1600,height:400}]));
 m.phase='roundEnd';m.roundWinner=0;for(const method of ['PINFALL','TAP OUT']){m.method=method;r.draw(m);}
 m.phase='fight';r.receive([{type:'kickout'}]);assert.equal(r.graphic.key,'kickout');r.draw(m);r.receive([{type:'special'}]);assert.equal(r.graphic.key,'lunacy');r.draw(m);
});
test('Ruffo uses the supplied back recovery and KO poses in their actual states',()=>{
 const {r,ctx}=renderer(),m=new Match(roster,20,16,{mode:'local'});m.phase='fight';const f=m.fighters[0];let last;ctx.drawImage=(_img,x,y)=>{last={x,y};};
 for(const [state,hp,anim] of [['rise',40,'riseBack'],['down',0,'ko']]){Object.assign(f,{state,hp,fallFace:'back',fallDuration:0,t:.3});r.fighter(f,0,m);assert.ok(f.definition.animations[anim].some(e=>e.x===last.x&&e.y===last.y));}
});

test('Hokane renders the alternate fall and KO artwork in the matching states',()=>{
 const {r,ctx}=renderer(),id=roster.findIndex(f=>f.id==='hokane'),m=new Match(roster,id,9,{mode:'local'});m.phase='fight';const f=m.fighters[0];let last;
 ctx.drawImage=(_img,x,y)=>{last={x,y};};
 for(const [facing,hp,duration,anim] of [[1,30,.4,'fallFront'],[-1,30,.4,'fallFrontReverse'],[1,0,0,'ko']]){
  Object.assign(f,{state:'down',facing,hp,fallFace:'front',fallDuration:duration,t:.2});r.fighter(f,0,m);
  assert.ok(f.definition.animations[anim].some(e=>e.x===last.x&&e.y===last.y),anim);
 }
});

test('adaptive phone canvas scaling covers world and HUD and restores its transform each frame',()=>{
 const {r,ctx}=renderer(),m=new Match(roster,23,22,{mode:'local'});m.phase='fight';
 let scale=[1,1],stack=[],hudScale;
 ctx.save=()=>stack.push([...scale]);ctx.restore=()=>{assert.ok(stack.length);scale=stack.pop();};ctx.scale=(x,y)=>{scale=[scale[0]*x,scale[1]*y];};
 const hud=r.hud.bind(r);r.hud=(...args)=>{hudScale=[...scale];hud(...args);};
 for(const portrait of [true,false]){
  r.portrait=portrait;r.compact=!portrait;r.canvas.width=768;r.canvas.height=portrait?576:432;
  for(let i=0;i<3;i++){r.draw(m);assert.deepEqual(hudScale,[.6,.6]);assert.deepEqual(scale,[1,1]);assert.equal(stack.length,0);}
 }
});

test('phone effects remain bounded while combo and escape cues are retained',()=>{
 const {r}=renderer(),m=new Match(roster,23,22,{mode:'local'});r.lowPower=true;
 for(let i=0;i<20;i++)r.receive([{type:'hit',index:1,attacker:0,x:550,combo:3}],m);
 assert.equal(r.particles.length,48);assert.equal(r.popups.filter(p=>p.kind==='combo').length,1);
 r.receive([{type:'throwBreak'},{type:'kickout'}],m);
 assert.ok(r.popups.some(p=>p.text==='THROW BREAK'));assert.equal(r.graphic.key,'kickout');
  r.compact=true;r.draw(m);r.reduced=true;const count=r.particles.length;r.receive([{type:'hit',x:550}],m);assert.equal(r.particles.length,count);
});
test('desktop effect bursts stay bounded during a dropped-frame event spike',()=>{
 const {r}=renderer(),m=new Match(roster,0,1,{mode:'local'});r.lowPower=false;
 for(let i=0;i<30;i++)r.receive([{type:'hit',index:1,attacker:0,x:550,combo:2}],m);
 assert.ok(r.particles.length<=128);assert.ok(r.popups.length<=48);
});

test('renderer requests synchronized presentation and never clears a visible frame',()=>{
 const {r,ctx}=renderer(),requests=[];
 const canvas={getContext:(kind,options)=>{requests.push([kind,options]);return ctx;}};
 const stable=new Renderer(canvas,roster,r.atlases,r.arenas);
 assert.equal(requests[0][1].desynchronized,false);assert.equal(requests[0][1].alpha,false);
 ctx.clearRect=()=>assert.fail('Clearing the visible buffer can show an empty frame');
 const m=new Match(roster,33,34,{mode:'local'});m.phase='fight';
 for(const mode of ['desktop','portrait','compact']){stable.portrait=mode==='portrait';stable.compact=mode==='compact';stable.draw(m);}
});

test('finishers retain their feedback without a screen-sized flash',()=>{
 const {r,ctx}=renderer(),m=new Match(roster,33,34,{mode:'local'});r.reduced=false;
 r.receive([{type:'special',index:0,name:'BASS BLAST'}],m);
 assert.equal(r.graphic.key,'lunacy');assert.ok(r.popups.some(p=>p.text==='BASS BLAST'));
 ctx.fillRect=(_x,_y,w,h)=>assert.ok(w<1280||h<720,'Effects cannot repaint the whole scene');
 for(let frame=0;frame<15;frame++)r.effects(1/60);
});

test('hit shake is bounded for phones and desktops and disabled for reduced motion',()=>{
 const {r}=renderer(),m=new Match(roster,33,34,{mode:'local'});m.phase='fight';m.shake=100;
 for(const lowPower of [false,true]){
  r.lowPower=lowPower;r.reduced=false;const limit=lowPower?2:4;
  for(let i=0;i<20;i++){r.draw(m);assert.ok(Math.abs(r.shakeOffset[0])<=limit);assert.ok(Math.abs(r.shakeOffset[1])<=limit*.55);}
 }
 r.reduced=true;r.draw(m);assert.deepEqual(r.shakeOffset,[0,0]);
});

test('portrait gameplay draws one proportionate arena even with fighters in opposite corners',()=>{
 const {r,ctx}=renderer(),m=new Match(roster,0,1,{mode:'local'});m.phase='fight';r.portrait=true;r.logicalHeight=960;
 // Branding restores a thin foreground rope from the arena image; count only
 // scene-sized draws, so that legitimate patch is not mistaken for a backdrop.
 const calls=[];const original=ctx.drawImage;ctx.drawImage=(img,...args)=>{if(img===r.arenas[0]&&args.at(-2)>=1280)calls.push(args);original(img,...args);};
 for(const positions of [[500,580],[200,1080],[200,280],[980,1080]]){m.fighters.forEach((f,i)=>f.x=positions[i]);calls.length=0;r.draw(m);assert.equal(calls.length,1);const args=calls[0];assert.deepEqual(args.slice(-4),[0,0,1280,720]);}
});
