import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Match,STEP,LEFT,RIGHT,TOP_ROPE_HEIGHT,MOVEMENT_PACE,MOVES,emptyInput} from '../dist/src/engine.js';
import {packSnapshot,SnapshotBuffer,validSnapshot} from '../dist/src/online-protocol.js';

const roster=JSON.parse(readFileSync(new URL('../dist/assets/roster.json',import.meta.url)));
const create=(id=9,index=0)=>{
  const ids=index?[(id+1)%roster.length,id]:[id,(id+1)%roster.length];
  const m=new Match(roster,...ids,{mode:'local'});m.phase='fight';return m;
};
const step=(m,index=0,action=null,other={})=>{
  const inputs=[emptyInput(),emptyInput()];if(action)inputs[index][action]=true;
  Object.assign(inputs[1-index],other);m.step(inputs,STEP);
};
const advance=(m,n,index=0,other={})=>{for(let i=0;i<n;i++)step(m,index,null,other);};
function launch(m,index=0,side='left',delay=.4,powered=false){
  const a=m.fighters[index],b=m.fighters[1-index],dir=side==='left'?1:-1;
  Object.assign(a,{x:dir===1?LEFT+18:RIGHT-18,z:TOP_ROPE_HEIGHT,state:'perch',meter:powered?100:0});
  // Put the target on this fighter's natural descent path, without changing speed.
  b.x=a.x+dir*490*MOVEMENT_PACE*a.definition.speed*.70;
  m.knockDown(b,'back',0,delay);step(m,index,powered?'special':'jump');
}

test('a real corner dive hits an opponent beginning to get up, without self-damage',()=>{
  for(const index of [0,1])for(const side of ['left','right'])for(const delay of [.3,.4,.5,.6]){
    const m=create(9,index);launch(m,index,side,delay);advance(m,90,index);
    const a=m.fighters[index],b=m.fighters[1-index];
    assert.ok(b.hp<100,`${index} ${side} ${delay}: passed through recovery`);
    assert.equal(a.hp,100);assert.equal(a.z,0);
    assert.equal(b.invincible,0);assert.equal(b.wakeUpProtected,false);
    assert.equal(m.drainEvents().filter(e=>e.type==='slam'&&e.index===1-index).length,1);
  }
});

test('every fighter connects from either corner and either player slot through the get-up boundary',()=>{
  for(let id=0;id<roster.length;id++)for(const index of [0,1])for(const side of ['left','right']){
    const m=create(id,index);launch(m,index,side);advance(m,90,index);
    assert.ok(m.fighters[1-index].hp<100,`${roster[id].name}, player ${index+1}, ${side}`);
    assert.equal(m.fighters[index].hp,100);
  }
});

test('dive contact remains continuous from lying down through rising and the last standing recovery frames',()=>{
  for(const index of [0,1])for(let age=0;age<=39;age++){
    const m=create(9,index),a=m.fighters[index],b=m.fighters[1-index];
    b.x=590;m.knockDown(b,'back',0,STEP);advance(m,age,index);
    Object.assign(a,{x:500,z:60,vz:-100,state:'dive',facing:1});step(m,index);
    assert.ok(b.hp<100,`player ${index+1}, recovery frame ${age}`);
    assert.equal(a.hp,100);
  }
});

test('a powered dive consumes one meter and scores one hit against a rising target',()=>{
  for(const index of [0,1]){
    const m=create(9,index);launch(m,index,'left',.4,true);advance(m,90,index);
    const a=m.fighters[index],b=m.fighters[1-index];
    assert.ok(Math.abs(b.hp-(100-23*1.55*a.definition.power/b.definition.toughness))<1e-8);
    assert.equal(a.hp,100);assert.equal(a.meter,16);
    const events=m.drainEvents();assert.equal(events.filter(e=>e.type==='special').length,1);
    assert.equal(events.filter(e=>e.type==='slam'&&e.index===1-index).length,1);
  }
});

test('ground strikes and grabs still respect get-up protection',()=>{
  for(const age of [1,15,30,32,34]){
    const m=create(),[a,b]=m.fighters;a.x=500;b.x=590;
    m.knockDown(b,'back',0,STEP);advance(m,age);
    assert.ok(b.invincible>0);m.startAttack(a,'light',0);a.t=MOVES.light.startup+.01;
    assert.equal(m.contact(0),undefined);a.move=null;a.state='idle';step(m,0,'grapple');
    assert.equal(m.grapple,null);assert.equal(b.hp,100);
  }
});

test('holding block after getting up still stops a dive; guard breaks still connect',()=>{
  for(const index of [0,1])for(const guard of [100,20]){
    const m=create(9,index),a=m.fighters[index],b=m.fighters[1-index];b.x=590;
    m.knockDown(b,'back',0,STEP);advance(m,33,index,{block:true});
    assert.equal(b.state,'block');assert.ok(b.invincible>0);b.guard=guard;
    Object.assign(a,{x:500,z:60,vz:-100,state:'dive',facing:1});step(m,index,null,{block:true});
    if(guard===100){assert.equal(b.hp,100);assert.equal(a.state,'down');assert.ok(m.drainEvents().some(e=>e.type==='block'));}
    else{assert.ok(b.hp<100);assert.ok(m.drainEvents().some(e=>e.type==='guardBreak'));}
  }
});

test('other invulnerability and a real out-of-range dive retain their defenses and miss penalty',()=>{
  for(const state of ['rise','hurt','idle','pinned']){
    const m=create(),[a,b]=m.fighters;
    Object.assign(b,{x:590,state,invincible:.8,stun:state==='hurt'?.5:0});
    Object.assign(a,{x:500,z:60,vz:-100,state:'dive',facing:1});step(m);
    assert.equal(b.hp,100,`${state} protection`);assert.equal(a.diveHit,false);
  }
  const m=create();launch(m);m.fighters[1].x=RIGHT;advance(m,54);
  assert.equal(m.fighters[0].hp,96);assert.equal(m.fighters[0].state,'down');
  assert.equal(m.fighters[1].hp,100);
});

test('a low-health diver keeps their health and receives the correct knockout win on recovery contact',()=>{
  for(const index of [0,1]){
    const m=create(9,index);launch(m,index);m.fighters[index].hp=4;m.fighters[1-index].hp=1;
    advance(m,90,index);assert.equal(m.fighters[index].hp,4);
    assert.equal(m.roundWinner,index);assert.equal(m.method,'KNOCKOUT');
  }
});

test('online host resolves either player diving and guest snapshots show the same single impact',()=>{
  for(const index of [0,1]){
    const host=create(9,index),guest=create(9,index),buffer=new SnapshotBuffer(host.ids);
    host.options.mode='online';launch(host,index);let serial=0;
    for(let frame=1;frame<=90;frame++){
      step(host,index);
      const events=host.drainEvents().map(e=>({...e,serial:++serial}));
      const packet=JSON.parse(JSON.stringify(packSnapshot(host,frame,events)));
      assert.ok(validSnapshot(packet,host.ids));assert.ok(buffer.receive(packet,frame*17));
      buffer.apply(guest,frame*17+50);
    }
    assert.ok(host.fighters[1-index].hp<100);
    assert.deepEqual(guest.fighters.map(f=>f.hp),host.fighters.map(f=>f.hp));
    assert.equal(buffer.drainEvents().filter(e=>e.type==='slam'&&e.index===1-index).length,1);
  }
});

test('expired get-up protection never carries into throw breaks, kickouts or new rounds',()=>{
  for(const recovery of ['expire','throwBreak','kickout','round']){
    const m=create(),[a,b]=m.fighters;b.x=590;m.knockDown(b,'back',0,STEP);advance(m,1);
    assert.equal(b.wakeUpProtected,true);
    if(recovery==='expire')advance(m,40);
    else if(recovery==='throwBreak'){m.startGrapple(1);m.breakGrapple();}
    else if(recovery==='kickout'){m.knockDown(b,'back',0,10);m.startPin(0);m.releasePin('kickout');}
    else m.newRound();
    assert.equal(m.fighters[1].wakeUpProtected,false);
    if(['throwBreak','kickout'].includes(recovery)){
      Object.assign(a,{x:500,z:60,vz:-100,vx:0,state:'dive',facing:1});b.x=590;b.vx=0;
      step(m);assert.equal(b.hp,100);assert.equal(a.diveHit,false);
    }
  }
});
