import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {phoneLayout,canvasSize,resizeCanvas,phoneCamera} from '../dist/src/phone-layout.js';
import {FramePacer} from '../dist/src/frame-pacer.js';
import {loadOptionalArtwork} from '../dist/src/optional-artwork.js';
import {Match,emptyInput,STEP} from '../dist/src/engine.js';

const overlap=(a,b)=>a.x<b.x+b.width-.01&&b.x<a.x+a.width-.01&&a.y<b.y+b.height-.01&&b.y<a.y+a.height-.01;
const cases=[
  {width:320,height:480},{width:320,height:568},{width:390,height:660,safe:{top:47,bottom:34}},
  {width:390,height:844,safe:{top:47,bottom:34}},{width:430,height:932,safe:{top:59,bottom:34}},
  {width:568,height:320},{width:667,height:275},{width:844,height:390,safe:{left:47,right:47,bottom:21}},
  {width:932,height:430,safe:{left:59,right:59,bottom:21}},{width:740,height:260},
  {width:568,height:232},{width:667,height:232,safe:{left:47,right:47,bottom:21}},{width:568,height:200},
  {width:390,height:844,safe:{left:12,right:4,top:47,bottom:34}}
];
test('phone ring and thumb controls fit small screens, browser bars, and safe areas in both orientations',()=>{
  for(const config of cases)for(const online of [false,true]){
    const l=phoneLayout({...config,online}),safe=config.safe||{},context=JSON.stringify({...config,online});
    for(const key of ['header','stage','dpad','actions','weapon','taunt','hint']){
      const r=l[key];assert.ok(r.width>0&&r.height>0,`${key}: ${context}`);
      assert.ok(r.x>=(safe.left||0)&&r.y>=(safe.top||0),`${key} starts in a cutout: ${context}`);
      assert.ok(r.x+r.width<=config.width-(safe.right||0)+.01&&r.y+r.height<=config.height-(safe.bottom||0)+.01,`${key} outside viewport: ${context}`);
    }
    assert.ok(l.dpad.width/3>=44&&l.dpad.height/3>=44,context);
    assert.ok((l.actions.width-8)/2>=44&&(l.actions.height-8)/2>=44,context);
    for(const control of ['dpad','actions','weapon','taunt','hint'])assert.equal(overlap(l.stage,l[control]),false,`ring overlaps ${control}: ${context}`);
    for(const [a,b] of [['dpad','actions'],['dpad','weapon'],['actions','taunt'],['hint','weapon'],['hint','taunt']])assert.equal(overlap(l[a],l[b]),false,`${a} overlaps ${b}: ${context}`);
    if(online)assert.equal(overlap(l.stage,l.network),false,context);
  }
});
test('phone backing resolution reduces pixels while preserving the logical aspect and a desktop ceiling',()=>{
  for(const c of cases)for(const quality of ['auto','battery']){
    const l=phoneLayout(c),portrait=l.mode==='portrait',s=canvasSize({cssWidth:l.stage.width,portrait,touch:true,dpr:3,quality});
    assert.ok(s.width>=640&&s.width<=1280);assert.equal(s.width/s.height,portrait?4/3:16/9);
  }
  const normal=canvasSize({cssWidth:374,portrait:true,touch:true,dpr:3});
  assert.ok(normal.width*normal.height<1280*960*.5);
  assert.deepEqual(canvasSize({cssWidth:2400,dpr:3}),{width:1280,height:720});
});
test('repeated viewport notifications do not clear the canvas or reset the context',()=>{
  const values={width:1280,height:720};let resets=0;
  const canvas=new Proxy(values,{set:(t,k,v)=>(resets++,t[k]=v,true)});
  assert.equal(resizeCanvas(canvas,{width:1280,height:720}),false);assert.equal(resets,0);
  assert.equal(resizeCanvas(canvas,{width:768,height:576}),true);assert.equal(resets,2);
  for(let n=0;n<60;n++)resizeCanvas(canvas,{width:768,height:576});assert.equal(resets,2);
});
test('phone camera brings close combat nearer and keeps airborne bodies below the HUD',()=>{
  for(const portrait of [false,true])for(const positions of [[200,280],[200,1080],[980,1080],[500,580]])for(const z of [0,120,280,400]){
    const fighters=positions.map((x,i)=>({x,z:i?z:0})),c=phoneCamera(fighters,{portrait});
    for(const f of fighters){const x=c.x+f.x*c.zoom,head=c.y+(593-f.z-260)*c.zoom;assert.ok(x>=0&&x<=1280);assert.ok(head>=224-.001);}
  }
  assert.equal(phoneCamera([{x:500,z:0},{x:580,z:0}],{portrait:true}).zoom,2);
});
test('presentation stays near its target on 60, 90 and 120 Hz displays',()=>{
  for(const refresh of [60,90,120])for(const fps of [30,60]){
    const pacer=new FramePacer();let count=0,elapsed=0;
    for(let n=0;n<=refresh*4;n++){const dt=pacer.frame(n*1000/refresh,{fps});if(dt!==null){count++;elapsed+=dt;}}
    assert.ok(Math.abs(count-(fps*4+1))<=1,`${fps} fps on ${refresh} Hz: ${count}`);
    assert.ok(Math.abs(elapsed-4)<1/fps+.001);
  }
});
test('menus draw once, invalidation refreshes them, and hidden tabs do not draw or catch up a long visual delta',()=>{
  const pacer=new FramePacer();assert.equal(pacer.frame(0,{animated:false}),0);
  for(let t=16;t<1000;t+=16)assert.equal(pacer.frame(t,{animated:false}),null);
  pacer.invalidate();assert.equal(pacer.frame(1000,{animated:false}),0);
  assert.equal(pacer.frame(1010,{hidden:true}),null);
  assert.ok(pacer.frame(100000,{animated:true})<=.1);
});
test('30 fps battery presentation leaves the same 60 Hz match result and inputs',async()=>{
  const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
  function play(fps){
    const m=new Match(roster,23,22,{mode:'local'}),pacer=new FramePacer();m.phase='fight';m.fighters[0].x=500;m.fighters[1].x=580;
    let accumulator=0,steps=0,renders=0;
    for(let frame=0;frame<1200;frame++){
      accumulator+=1/120;
      while(accumulator>=STEP){
        m.step([{...emptyInput(),light:steps%40===0},{...emptyInput(),block:true}],STEP);steps++;accumulator-=STEP;
      }
      if(pacer.frame(frame*1000/120,{fps})!==null)renders++;
    }
    return {steps,renders,remaining:m.remaining,states:m.fighters.map(f=>[f.hp,f.guard,f.meter,f.x,f.state,f.t])};
  }
  const a=play(60),b=play(30);assert.equal(a.steps,600);assert.equal(b.steps,600);
  assert.deepEqual(a.states,b.states);assert.equal(a.remaining,b.remaining);assert.ok(a.renders>b.renders*1.9);
});
test('failed optional banner and effects downloads keep successful artwork and do not reject startup',async()=>{
  const banners={},combatFx={};let updates=0;
  const result=await loadOptionalArtwork({banners,combatFx,
    loadImage:async url=>{if(url.includes('kickout')||url.includes('guard'))throw new Error('Offline');return {url};},
    loadManifest:async()=>({impact:{frames:8},guard:{frames:8}}),onChange:()=>updates++});
  assert.ok(banners.lunacy);assert.equal(banners.kickout,undefined);assert.ok(combatFx.impact.image);assert.equal(combatFx.guard,undefined);
  assert.equal(updates,6);assert.equal(result.filter(r=>r.status==='rejected').length,1);
  await assert.doesNotReject(loadOptionalArtwork({banners:{},combatFx:{},loadImage:async()=>{throw new Error('Offline');},loadManifest:async()=>{throw new Error('Offline');}}));
});
