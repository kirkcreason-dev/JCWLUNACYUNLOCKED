import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,STEP,LEFT,RIGHT,MOVES,emptyInput} from '../dist/src/engine.js';
import {fighterProfile,finisherMove} from '../dist/src/fighter-profile.js';
import {Coach} from '../dist/src/coach.js';
import {loadGameImage} from '../dist/src/image-loader.js';
import {RenderBudget} from '../dist/src/render-budget.js';
import {retainMatchArtwork} from '../dist/src/artwork-cache.js';
import {loadOptionalArtwork} from '../dist/src/optional-artwork.js';
import {packSnapshot,SnapshotBuffer} from '../dist/src/online-protocol.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const make=(a=0,b=1)=>{const m=new Match(roster,a,b,{mode:'local'});m.phase='fight';m.drainEvents();return m;};
const tick=(m,a={},b={})=>m.step([{...emptyInput(),...a},{...emptyInput(),...b}]);
test('rope rebounds work from both sides, stay bounded, cancel into guard and transmit to guests',()=>{
  for(const side of [-1,1]){
    const m=make(),a=m.fighters[0];a.x=side<0?LEFT:RIGHT;a.state='run';a.runTime=.4;a.runDirection=side;
    tick(m,side<0?{left:true}:{right:true});assert.ok(a.reboundTime>0);assert.equal(a.reboundDirection,-side);assert.ok(a.x>LEFT&&a.x<RIGHT);
    const events=m.drainEvents();assert.equal(events.filter(e=>e.type==='ropeRebound').length,1);
    const remote=make(),buffer=new SnapshotBuffer(m.ids);assert.ok(buffer.receive(packSnapshot(m,1,events.map((e,i)=>({...e,serial:i+1}))),0));buffer.apply(remote,50);assert.equal(remote.fighters[0].reboundDirection,-side);assert.equal(buffer.drainEvents()[0].type,'ropeRebound');
    tick(m,{block:true});assert.equal(a.reboundTime,0);assert.equal(a.state,'block');
  }
});
test('a running rebound links to a running attack and damage cancels forced movement',()=>{
  const m=make(),a=m.fighters[0],b=m.fighters[1];a.x=LEFT;a.state='run';a.runTime=.4;a.runDirection=-1;b.x=400;
  tick(m,{left:true});tick(m,{heavy:true});assert.equal(a.runningAttack,true);assert.equal(a.reboundTime,0);
  a.reboundTime=.3;m.resolveAttack({index:1,move:'light',facing:-1});assert.equal(a.reboundTime,0);
});
test('grapple lift has no abrupt vertical jump and produces one landing',()=>{
  const m=make();m.fighters[0].x=500;m.fighters[1].x=575;m.startGrapple(0);let old=0,maxStep=0,landing=0;
  for(let i=0;i<180&&m.grapple;i++){tick(m);const z=m.fighters[1].z;if(z>old)maxStep=Math.max(maxStep,z-old);old=z;landing+=m.drainEvents().filter(e=>e.type==='slam').length;}
  assert.ok(maxStep<15,maxStep);assert.equal(landing,1);assert.equal(m.fighters[1].z,0);
});
test('approved ratings determine distinct styles, finisher tradeoffs and guard recovery',()=>{
  const id=name=>roster.findIndex(f=>f.id===name),power=roster[id('krule')],flyer=roster[id('matt-cross')],tech=roster[id('kerry-morton')];
  assert.equal(fighterProfile(power).id,'powerhouse');assert.equal(fighterProfile(flyer).id,'flyer');assert.equal(fighterProfile(tech).id,'technician');
  assert.ok(finisherMove(power,MOVES.special).damage>finisherMove(flyer,MOVES.special).damage);assert.ok(finisherMove(flyer,MOVES.special).reach>finisherMove(power,MOVES.special).reach);
  const m=make(id('kerry-morton'),id('mr-happy'));m.fighters.forEach(f=>f.guard=50);for(let i=0;i<30;i++)tick(m);assert.ok(m.fighters[0].guard>m.fighters[1].guard);
});
test('CPU technicians choose a throw where flyers choose a jab; aerial preferences also differ',()=>{
  const choices=[];for(const id of ['kerry-morton','matt-cross']){const m=new Match(roster,0,roster.findIndex(f=>f.id===id),{random:()=>.30});m.fighters[1].x=m.fighters[0].x+80;choices.push(m.cpu(STEP));}
  assert.equal(choices[0].grapple,true);assert.equal(choices[1].light,true);
});
test('first-match guidance respects input device, completion, disabled setting and urgent escapes',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};const c=new Coach(storage),m=make();m.options.mode='cpu';
  assert.match(c.text(m,'touch'),/Slide/);assert.equal(c.text(m,'touch',false),'');c.receive([{type:'hit',attacker:0,combo:2}]);assert.ok(new Coach(storage).learned.has('combo'));
  m.pin={attacker:1};assert.match(c.text(m,'gamepad'),/X and Y/);m.options.mode='online';assert.equal(c.text(m),'');c.reset();assert.equal(c.learned.size,0);
});
test('render budget ignores short spikes and reduces sustained expensive drawing only once',()=>{
  const budget=new RenderBudget();for(let i=0;i<89;i++)assert.equal(budget.observe(i===10?70:2),false);assert.equal(budget.observe(2),false);
  for(let i=0;i<89;i++)budget.observe(14);assert.equal(budget.observe(14),true);assert.equal(budget.limited,true);for(let i=0;i<200;i++)assert.equal(budget.observe(1),false);
});
test('timed out and broken images release handlers while successful loads stay usable',async()=>{
  const images=[];class Image{constructor(){images.push(this);}}
  await assert.rejects(loadGameImage('slow',{ImageClass:Image,timeout:5}),/timed out/);assert.equal(images[0].src,'');assert.equal(images[0].onload,null);
  const loaded=loadGameImage('good',{ImageClass:Image});images[1].onload();assert.equal((await loaded).src,'good');assert.equal(images[1].onerror,null);
  const bad=loadGameImage('bad',{ImageClass:Image});images[2].onerror();await assert.rejects(bad,/Could not load/);
});
test('cache eviction clears obsolete in-flight decodes as well as resolved images',()=>{
  const promises=new Map([[1,{}],[2,{}],['arena-0',{}],['arena-4',{}]]);retainMatchArtwork({},[],promises,[2],4);assert.deepEqual([...promises.keys()],[2,'arena-4']);
});
test('broken optional artwork backs off instead of making a new request on every hit',async()=>{
  let attempts=0,time=0;const state={},options={banners:{},combatFx:{},state,bannerKeys:['pinfall'],effectKeys:[],now:()=>time,loadImage:async()=>{attempts++;throw new Error('Offline');}};
  await loadOptionalArtwork(options);for(let i=0;i<90;i++)await loadOptionalArtwork(options);assert.equal(attempts,1);time=30001;await loadOptionalArtwork(options);assert.equal(attempts,2);
});
