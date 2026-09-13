import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,STEP,emptyInput} from '../dist/src/engine.js';
import {touchContext} from '../dist/src/touch-ui.js';
import {packSnapshot,validSnapshot,SnapshotBuffer,PROTOCOL} from '../dist/src/online-protocol.js';
import {validRoom} from '../dist/src/online.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const create=(a=16,b=20)=>{const m=new Match(roster,a,b,{mode:'local'});m.phase='fight';m.fighters[0].x=500;m.fighters[1].x=580;return m;};
const step=(m,n,p1={},p2={})=>{for(let i=0;i<n;i++)m.step([{...emptyInput(),...p1},{...emptyInput(),...p2}],STEP);};
test('Down and GRAB starts a submission for either player and a resisted hold can be escaped',()=>{
 for(const attacker of [0,1]){
  const m=create(),b=m.fighters[1-attacker];b.hp=20;m.knockDown(b,'back',0,10);
  step(m,1,attacker===0?{block:true,grapple:true}:{},attacker===1?{block:true,grapple:true}:{});
  assert.equal(m.pin.kind,'submission');assert.equal(touchContext(m,1-attacker).escapeLabel,'ESCAPE');
  for(let i=0;i<30&&m.pin;i++){const command=i%2?{heavy:true}:{light:true};step(m,1,attacker===1?command:{},attacker===0?command:{});step(m,1);}
  assert.equal(m.pin,null);assert.equal(m.phase,'fight');assert.ok(m.drainEvents().some(e=>e.type==='holdBreak'));assert.equal(b.state,'rise');
 }
});
test('unresisted submission ends by tap-out; normal GRAB still produces a three-count',()=>{
 for(const kind of ['pin','submission']){const m=create();m.fighters[1].hp=10;m.knockDown(m.fighters[1],'back',0,10);step(m,1,{grapple:true,block:kind==='submission'});step(m,220);assert.equal(m.phase,'roundEnd');assert.equal(m.roundWinner,0);assert.equal(m.method,kind==='submission'?'TAP OUT':'PINFALL');const events=m.drainEvents();assert.equal(events.filter(e=>e.type==='count').length,kind==='submission'?0:3);}
});
test('healthy opponents resist submissions and holding both escape keys cannot auto-escape',()=>{
 const m=create();m.knockDown(m.fighters[1],'front',0,10);step(m,1,{grapple:true,block:true});step(m,100);assert.equal(m.pin,null);assert.equal(m.phase,'fight');
 const n=create();n.fighters[1].hp=10;n.knockDown(n.fighters[1],'front',0,10);step(n,1,{grapple:true,block:true});step(n,100,{}, {light:true,heavy:true});assert.equal(n.pin.escape,0);
});
test('all five additional roster IDs are valid online and submission state/events round-trip',()=>{
 for(let id=16;id<21;id++)assert.ok(validRoom({protocol:PROTOCOL,host:{id:'host',fighter:id},guest:{id:'guest',fighter:20},arena:0,state:'lobby',created:Date.now()}));
 const host=create(),guest=create();host.fighters[1].hp=10;host.knockDown(host.fighters[1],'back',0,10);step(host,1,{grapple:true,block:true});step(host,60);const packet=JSON.parse(JSON.stringify(packSnapshot(host,1,[{type:'holdBreak',serial:1}])));assert.ok(validSnapshot(packet,host.ids));const buffer=new SnapshotBuffer(host.ids);buffer.receive(packet,0);buffer.apply(guest,50);assert.equal(guest.pin.kind,'submission');assert.equal(touchContext(guest,1).escapeLabel,'ESCAPE');assert.ok(buffer.drainEvents().some(e=>e.type==='holdBreak'));packet.pin.kind='invalid';assert.ok(!validSnapshot(packet,host.ids));
});
