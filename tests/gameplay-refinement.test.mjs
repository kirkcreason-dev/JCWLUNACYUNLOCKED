import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,STEP,emptyInput,LEFT,RIGHT,MOVES} from '../dist/src/engine.js';
import {touchContext} from '../dist/src/touch-ui.js';
import {InputPackets,RemoteInput,packSnapshot,SnapshotBuffer,validSnapshot} from '../dist/src/online-protocol.js';

const roster=[0,1].map(i=>({id:`fighter-${i}`,name:`Fighter ${i}`,power:1,speed:1,toughness:1,weapons:['chair','bat','guitar','trashcan'],animations:{climb:[{}],kick:[{}]}}));
const make=()=>{const m=new Match(roster,0,1,{mode:'local'});m.phase='fight';m.fighters[0].x=500;m.fighters[1].x=580;return m;};
const tick=(m,a={},b={})=>m.step([{...emptyInput(),...a},{...emptyInput(),...b}]);
const run=(m,n,a={},b={})=>{for(let i=0;i<n;i++)tick(m,a,b);};
function until(m,predicate,limit=120){for(let i=0;i<limit&&!predicate();i++)tick(m);assert.ok(predicate(),'Expected combat transition');}
function hitChain(m,actions=['light','light','heavy'],index=0){
 const me=m.fighters[index],other=m.fighters[1-index];
 for(const action of actions){
  const hp=other.hp;tick(m,index===0?{pressed:{[action]:true}}:{},index===1?{pressed:{[action]:true}}:{});
  until(m,()=>other.hp<hp);
 }
 return me;
}

test('confirmed jab-jab-heavy links in both directions, scales damage and stops at three hits',()=>{
 for(const index of [0,1]){
  const m=make(),me=hitChain(m,undefined,index),other=m.fighters[1-index];
  assert.ok(Math.abs(other.hp-(100-6-6*.85-13*.7))<.00001);
  assert.equal(me.chain,2);assert.equal(me.combo,3);
  tick(m,index===0?{pressed:{light:true}}:{},index===1?{pressed:{light:true}}:{});run(m,100);
  assert.equal(m.drainEvents().filter(e=>e.type==='hit').length,3);
 }
});
test('third repeated jab has no recovery cancel and cannot create an infinite chain',()=>{
 const m=make();hitChain(m,['light','light']);tick(m,{pressed:{light:true}});run(m,80);
 assert.equal(m.drainEvents().filter(e=>e.type==='hit').length,2);
});
test('whiffed and blocked strikes keep recovery instead of granting combo cancels',()=>{
 for(const blocked of [false,true]){
  const m=make();if(!blocked)m.fighters[1].x=850;
  tick(m,{light:true},blocked?{block:true}:{});run(m,8,{},blocked?{block:true}:{});
  tick(m,{pressed:{heavy:true}},blocked?{block:true}:{});run(m,80,{},blocked?{block:true}:{});
  assert.equal(m.drainEvents().filter(e=>e.type==='swing').length,1);assert.equal(m.fighters[1].hp,100);
 }
});
test('a same-frame grapple is a damage-free break in either ring orientation',()=>{
 for(const swapped of [false,true]){
  const m=make();if(swapped)[m.fighters[0].x,m.fighters[1].x]=[580,500];
  tick(m,{grapple:true},{grapple:true});assert.equal(m.grapple,null);
  assert.ok(m.fighters.every(f=>f.hp===100&&f.state==='hurt'));
  assert.equal(m.drainEvents().filter(e=>e.type==='throwBreak').length,1);
  run(m,20);assert.ok(Math.abs(m.fighters[0].x-m.fighters[1].x)>80);
 }
});
test('hitstun cannot be converted into an unbreakable instant grab',()=>{
 const m=make();m.fighters[1].state='hurt';m.fighters[1].stun=.4;
 tick(m,{grapple:true});assert.equal(m.grapple,null);assert.equal(m.fighters[1].hp,100);
});
test('holding block becomes effective on the exact tick stun ends',()=>{
 const m=make(),a=m.fighters[0],b=m.fighters[1];a.state='hurt';a.stun=STEP*2;tick(m,{block:true});
 b.move='light';b.state='light';b.t=MOVES.light.startup-STEP;
 tick(m,{block:true});assert.equal(a.state,'block');assert.equal(a.hp,100);assert.ok(a.guard<100);
});
test('a buffered wakeup strike executes on the recovery boundary and gives up invulnerability',()=>{
 const m=make(),a=m.fighters[0];a.state='rise';a.t=.5-STEP;a.invincible=.8;
 tick(m,{pressed:{light:true}});assert.equal(a.move,'light');assert.equal(a.invincible,0);
});
test('attacking and blocking reset run buildup without weakening explicit run input',()=>{
 const m=make(),a=m.fighters[0];m.fighters[1].x=1000;run(m,30,{right:true});assert.equal(a.state,'run');
 tick(m,{light:true});run(m,35);tick(m,{right:true});assert.equal(a.state,'walk');
 run(m,30,{left:true});tick(m,{block:true});tick(m,{left:true});assert.equal(a.state,'walk');
 tick(m,{left:true,run:true});assert.equal(a.state,'run');
});
test('airborne attack recovery keeps the jump pose until landing',()=>{
 const m=make(),a=m.fighters[0];a.move='light';a.state='light';a.t=.43;a.z=220;a.vz=200;
 tick(m);assert.equal(a.move,null);assert.equal(a.state,'jump');assert.ok(a.z>0);
});
test('guard recovery waits after contact, then recovers faster with guard released',()=>{
 const m=make(),b=m.fighters[1];run(m,12,{}, {block:true});tick(m,{light:true},{block:true});for(let i=0;i<20&&b.guard===100;i++)tick(m,{}, {block:true});assert.ok(b.guard<100);
 const guard=b.guard;run(m,20,{}, {block:true});assert.equal(b.guard,guard);
 run(m,60);assert.ok(b.guard>guard);
});
test('a dive breaks depleted guard while a healthy block still punishes the diver',()=>{
 for(const guard of [15,100]){
  const m=make(),[a,b]=m.fighters;a.state='dive';a.z=80;a.vz=-100;b.guard=guard;b.state='block';
  tick(m,{}, {block:true});
  if(guard===15){assert.ok(b.hp<100);assert.equal(b.state,'down');assert.ok(m.drainEvents().some(e=>e.type==='guardBreak'));}
  else{assert.equal(b.hp,100);assert.equal(a.state,'down');assert.equal(b.guard,65);}
 }
});
test('a pin waits for the fall to finish and preserves a tapped submission modifier',()=>{
 const m=make(),b=m.fighters[1];m.knockDown(b,'back',.2,4);b.t=.1;b.hp=20;
 tick(m,{grapple:true,block:true});assert.equal(m.pin,null);
 run(m,6);assert.equal(m.pin?.kind,'submission');
});
test('both ropes break a pin or submission before the first count',()=>{
 for(const x of [LEFT+20,RIGHT-20])for(const kind of ['pin','submission']){
  const m=make();m.fighters[1].x=x;m.fighters[0].x=x===LEFT+20?x+75:x-75;m.fighters[1].hp=10;
  m.startPin(0,kind);run(m,25);assert.equal(m.pin,null);assert.equal(m.phase,'fight');assert.deepEqual(m.wins,[0,0]);
  assert.ok(m.drainEvents().some(e=>e.type==='ropeBreak'));
 }
});
test('the attacker can release a hold with a new grapple tap, but holding it keeps the pin',()=>{
 const m=make();m.fighters[1].hp=20;m.knockDown(m.fighters[1],'back',0,4);
 tick(m,{grapple:true});run(m,30,{grapple:true});assert.ok(m.pin);assert.equal(touchContext(m).grabLabel,'RELEASE');
 tick(m);tick(m,{grapple:true});assert.equal(m.pin,null);assert.ok(m.drainEvents().some(e=>e.type==='pinRelease'));
});
test('CPU does not choose jabs from outside their reach and repeats intentional attack decisions',()=>{
 const m=make();m.options.mode='cpu';m.random=()=>.3;m.fighters[1].x=625;
 const first=m.cpu(STEP);assert.equal(first.light,false);assert.equal(first.heavy,true);assert.equal(first.pressed.heavy,true);
 const held=m.cpu(STEP);assert.equal(held.pressed,undefined);
 m.aiTimer=0;assert.equal(m.cpu(STEP).pressed.heavy,true);
});
test('new combo feedback and rope-break events reach the online guest and reject older packets',()=>{
 const m=make();hitChain(m,['light','light']);const packet=packSnapshot(m,1,[{type:'ropeBreak',serial:1}]),guest=make(),buffer=new SnapshotBuffer(m.ids);
 assert.equal(buffer.receive(packet,100),true);buffer.apply(guest,200);
 assert.equal(guest.fighters[0].chain,1);assert.equal(guest.fighters[0].confirmed,true);
 assert.match(touchContext(guest).hint,/HEAVY/);assert.equal(buffer.drainEvents()[0].type,'ropeBreak');
 assert.equal(validSnapshot({...packet,protocol:'lunacy-2d-v7'},m.ids),false);
});
test('coalesced guest input can break a fresh grab and preserves equal simultaneous presses',()=>{
 const m=make(),packets=new InputPackets(),remote=new RemoteInput();
 packets.capture({...emptyInput(),grapple:true,pressed:{grapple:true}});packets.capture(emptyInput());
 remote.receive(packets.packet('guest'),'guest',0);
 tick(m,{grapple:true},remote.read(50));assert.equal(m.grapple,null);assert.ok(m.fighters.every(f=>f.hp===100));
});

const fullRoster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
test('all 39 fighters can land the reduced-damage second jab from either side',()=>{
 for(let id=0;id<fullRoster.length;id++)for(const side of [0,1]){
  const m=new Match(fullRoster,id,(id+1)%fullRoster.length,{mode:'local'});m.phase='fight';m.fighters[0].x=500;m.fighters[1].x=580;
  hitChain(m,['light','light'],side);
  assert.equal(m.fighters[side].combo,2,fullRoster[id].name);
 }
});
for(const difficulty of ['easy','normal','hard'])test(`${difficulty} CPU completes matches using every roster fighter`,()=>{
 for(let id=0;id<fullRoster.length;id++){
  let seed=673+id;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const m=new Match(fullRoster,(id+1)%fullRoster.length,id,{mode:'cpu',difficulty,random});
  for(let i=0;i<60*240&&m.phase!=='done';i++){
   m.step();assert.ok(m.fighters.every(f=>Number.isFinite(f.x+f.z+f.hp)&&f.x>=LEFT&&f.x<=RIGHT&&f.z>=0&&f.hp>=0));
  }
  assert.equal(m.phase,'done',fullRoster[id].name);assert.equal(m.winner,1,fullRoster[id].name);
 }
});
