import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,MOVES,STEP,emptyInput,LEFT,RIGHT} from '../dist/src/engine.js';
import {InputState} from '../dist/src/input.js';
import {touchContext} from '../dist/src/touch-ui.js';
import {attackPose} from '../dist/src/attack-animation.js';
import {InputPackets,RemoteInput,packSnapshot,SnapshotBuffer,validSnapshot,PROTOCOL} from '../dist/src/online-protocol.js';
import {validRoom} from '../dist/src/online.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const create=(a=9,b=10)=>{const m=new Match(roster,a,b,{mode:'local'});m.phase='fight';return m;};
const advance=(m,n=1,p1={},p2={})=>{for(let i=0;i<n;i++)m.step([{...emptyInput(),...p1},{...emptyInput(),...p2}],STEP);};
const tap=(m,action,index=0)=>{const inputs=[emptyInput(),emptyInput()];inputs[index][action]=true;m.step(inputs,STEP);};

test('all fifteen supplied wrestlers are selectable and the new network version accepts them',()=>{
 assert.equal(roster.length,36);assert.deepEqual(roster.slice(9).map(f=>f.name),['Able','Dani Mo','Facade','J-Rod','Matt Cross','Vincenzo','Caleb Konley','Sally Boy','Big Vito','Bruce Wayans','Alice Crowley','Ruffo','Kongo Kong','Father Bronson','Hokane','Steven Flowe','EC3','Krule','Jeeves','Atiba','JP Grayson','Tommy','Shaggy 2 Dope','Jacksyn','DJ Clay','Jeff Lane','Shane Mercer']);
 for(let i=9;i<roster.length;i++)assert.ok(validRoom({protocol:PROTOCOL,host:{id:'host',fighter:i,online:true},guest:{id:'guest',fighter:14,online:true},arena:0,state:'lobby',created:Date.now()}));
 assert.ok(!validRoom({protocol:'lunacy-2d-v1',host:{id:'host',fighter:0},arena:0,state:'lobby',created:Date.now()}));
});
test('sustained directional movement runs and release stops it; blocking prevents attacks',()=>{
 const m=create();advance(m,15,{right:true});assert.equal(m.fighters[0].state,'walk');advance(m,15,{right:true});assert.equal(m.fighters[0].state,'run');advance(m);assert.equal(m.fighters[0].state,'idle');assert.equal(m.fighters[0].runTime,0);
 tap(m,'weapon');advance(m,20);advance(m,20,{block:true,heavy:true});assert.equal(m.fighters[0].state,'block');assert.equal(m.fighters[1].hp,100);
});
test('weapon cycling selects real attacks with distinct timing and one contact per swing',()=>{
 for(let id=9;id<roster.length;id++)for(const [weapon,move] of [['chair','heavy'],['bat','bat'],['guitar','guitar'],['trashcan','trashcan']]){
  const m=create(id,(id+1-9)%(roster.length-9)+9),a=m.fighters[0],b=m.fighters[1];
  for(let n=0;n<roster[id].weapons.indexOf(weapon)+1;n++){tap(m,'weapon');advance(m,20);}
  assert.equal(a.weapon,weapon);a.x=500;b.x=590;tap(m,'heavy');assert.equal(a.move,move);assert.equal(a.attackStyle,weapon);
  advance(m,90);assert.ok(b.hp<100);assert.equal(m.drainEvents().filter(e=>e.type==='hit').length,1);
 }
});
test('guitar breaks after two landed attacks, but a whiff does not spend it',()=>{
 const m=create(),a=m.fighters[0],b=m.fighters[1];a.weapon='guitar';tap(m,'heavy');advance(m,80);assert.equal(a.weaponUses,0);
 for(let i=0;i<2;i++){a.x=500;b.x=590;b.state='idle';b.stun=0;b.invincible=0;tap(m,'heavy');advance(m,90);}
 assert.equal(a.weapon,'none');assert.equal(m.drainEvents().filter(e=>e.type==='weaponBreak').length,1);
});
test('unarmed heavy uses authored kicks when present and strike poses when absent',()=>{
 for(let id=9;id<roster.length;id++){const m=create(id);tap(m,'heavy');const a=m.fighters[0];assert.equal(a.attackStyle,roster[id].animations.kick?'kick':'light');const p=attackPose(a.definition,a.move,.35,a.attackStyle);assert.ok(p.frame);}
});
test('a completed taunt earns meter once; an interrupted taunt earns none',()=>{
 const m=create();tap(m,'taunt');advance(m,65);assert.equal(m.fighters[0].meter,12);tap(m,'taunt');advance(m,65);assert.equal(m.fighters[0].meter,12);
 const n=create();n.fighters[0].x=500;n.fighters[1].x=590;tap(n,'taunt');tap(n,'light',1);advance(n,20);assert.equal(n.fighters[0].state,'hurt');assert.ok(!n.drainEvents().some(e=>e.type==='taunt'));
});
function perch(m,index=0){const a=m.fighters[index],b=m.fighters[1-index];a.x=index?RIGHT:LEFT;b.x=640;tap(m,'grapple',index);assert.equal(a.state,'climb');advance(m,52);assert.equal(a.state,'perch');assert.equal(a.z,140);}
test('both corners offer a climb, hold a perch, and down safely dismounts',()=>{
 for(const i of [0,1]){const m=create();perch(m,i);const context=touchContext(m,i);assert.equal(context.grabLabel,'DIVE');advance(m,1,i===0?{block:true}:{},i===1?{block:true}:{});assert.equal(m.fighters[i].state,'jump');advance(m,60);assert.equal(m.fighters[i].z,0);assert.equal(m.fighters[i].hp,100);}
});
test('a close opponent gets grappled rather than allowing a corner climb',()=>{const m=create();m.fighters[0].x=LEFT;m.fighters[1].x=LEFT+90;tap(m,'grapple');assert.ok(m.grapple);assert.equal(m.fighters[0].state,'grapple');});
test('a dive lands exactly once on standing or downed opponents and can be pinned afterwards',()=>{
 for(const down of [false,true]){const m=create();perch(m);const b=m.fighters[1];b.x=590;if(down)m.knockDown(b,'front',0,10);tap(m,'jump');advance(m,90);assert.ok(b.hp<100);assert.equal(m.drainEvents().filter(e=>e.type==='slam'&&e.index===1).length,1);assert.equal(b.state,'down');assert.equal(m.fighters[0].z,0);m.fighters[0].x=b.x-70;tap(m,'grapple');assert.ok(m.pin);}
});
test('a missed dive falls forward, costs health and can be blocked',()=>{
 const m=create();perch(m);m.fighters[1].x=RIGHT;tap(m,'heavy');advance(m,54);assert.equal(m.fighters[0].state,'down');assert.equal(m.fighters[0].fallFace,'front');assert.equal(m.fighters[0].hp,96);
 const n=create();perch(n);n.fighters[1].x=590;tap(n,'jump');advance(n,90,{}, {block:true});assert.equal(n.fighters[1].hp,100);assert.ok(n.drainEvents().some(e=>e.type==='block'));assert.equal(n.fighters[0].z,0);
});
test('a full meter powers a stronger dive and is spent once',()=>{const m=create();perch(m);m.fighters[0].meter=100;m.fighters[1].x=590;tap(m,'special');advance(m,90);assert.ok(m.fighters[1].hp<68);assert.equal(m.fighters[0].meter,16);});
test('phone labels expose the real equipped weapon and corner actions for either online player',()=>{const m=create();m.fighters[1].x=RIGHT;m.fighters[0].x=600;m.fighters[1].weapon='bat';const c=touchContext(m,1);assert.equal(c.grabLabel,'CLIMB');assert.equal(c.heavy,'BAT');assert.equal(c.weapon,'BAT');});
test('new keyboard, touch and gamepad commands survive a short press and network coalescing',()=>{
 const input=new InputState();input.pressKey('KeyQ');input.releaseKey('KeyQ');input.pressTouch(4,'taunt');input.releaseTouch(4);const one=input.read()[0];assert.equal(one.pressed.weapon,true);assert.equal(one.pressed.taunt,true);
 const packets=new InputPackets();packets.capture(one);const remote=new RemoteInput();assert.ok(remote.receive(packets.packet('guest'),'guest',0));const received=remote.read(20);assert.equal(received.pressed.weapon,true);assert.equal(received.pressed.taunt,true);
 const pad={index:0,connected:true,axes:[0,0],buttons:Array.from({length:16},(_,i)=>({pressed:[6,7,10].includes(i)}))};const val=input.read([pad])[0];assert.ok(val.weapon&&val.taunt&&val.run);
});
test('snapshots retain new poses, weapon styles, falls and dives without stale moves',()=>{
 const host=create(13,14),guest=create(13,14),buffer=new SnapshotBuffer(host.ids);
 for(const [i,state] of ['run','equip','taunt','climb','perch','dive','heavy','down'].entries()){
  Object.assign(host.fighters[1],{state,weapon:'trashcan',attackStyle:'trashcan',move:state==='heavy'?'trashcan':null,fallFace:'front',fallDuration:.38,divePower:1.55,z:state==='perch'?140:0});
  const packet=JSON.parse(JSON.stringify(packSnapshot(host,i+1)));if(packet.fighters[1].move===null)delete packet.fighters[1].move;assert.ok(validSnapshot(packet,host.ids));buffer.receive(packet,i*50);buffer.apply(guest,i*50+50);assert.equal(guest.fighters[1].state,state);assert.equal(guest.fighters[1].weapon,'trashcan');assert.equal(guest.fighters[1].move,state==='heavy'?'trashcan':null);
 }
});
test('all real roster pairings remain finite with new moves and every simulated CPU match ends',()=>{
 let seed=27;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 for(let id=0;id<roster.length;id++){
  const m=new Match(roster,id,(id+1)%roster.length,{mode:'cpu',random});let seenDamage=false;
  for(let t=0;t<20000&&m.phase!=='done';t++){const inp=emptyInput();if(t%17===0){for(const k of ['jump','light','heavy','grapple','special','weapon','taunt'])inp[k]=random()<.12;}inp.left=random()<.25;inp.right=random()<.25;m.step([inp,emptyInput()],STEP);seenDamage||=m.fighters.some(f=>f.hp<100);for(const f of m.fighters)assert.ok(Number.isFinite(f.x)&&Number.isFinite(f.z)&&f.x>=LEFT&&f.x<=RIGHT&&f.z>=0);}
  assert.ok(seenDamage);assert.equal(m.phase,'done',roster[id].name);
 }
});
