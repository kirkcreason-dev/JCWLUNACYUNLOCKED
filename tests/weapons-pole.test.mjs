import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,emptyInput,LEFT,RIGHT,WEAPON_USES,attackTiming,canCornerThrow,POLE_RETRIEVE_TIME} from '../dist/src/engine.js';
import {touchContext} from '../dist/src/touch-ui.js';
import {InputState} from '../dist/src/input.js';
import {packSnapshot,validSnapshot,SnapshotBuffer} from '../dist/src/online-protocol.js';
import {weaponGrip} from '../dist/src/weapon-grips.js';
import {attackPose} from '../dist/src/attack-animation.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url)));
const tick=(m,a={},b={})=>m.step([{...emptyInput(),...a},{...emptyInput(),...b}]);
const run=(m,n,a={},b={})=>{for(let i=0;i<n;i++)tick(m,a,b);};
const make=(id=0,mode='local')=>{const m=new Match(roster,id,(id+1)%roster.length,{mode,random:()=>.41});m.phase='fight';m.fighters[0].x=500;m.fighters[1].x=580;return m;};
const press=(m,key,index=0)=>tick(m,index===0?{pressed:{[key]:true}}:{},index===1?{pressed:{[key]:true}}:{});
function perched(m,index=0,side=LEFT){const a=m.fighters[index];a.x=side;m.fighters[1-index].x=640;press(m,'grapple',index);assert.equal(a.state,'climb');run(m,50);assert.equal(a.state,'perch');}
function resetVictim(m){const [a,b]=m.fighters;Object.assign(b,{x:a.x+80*a.facing,z:0,hp:100,state:'idle',stun:0,invincible:0,vx:0,downTime:0,t:0});}

test('bare-hand heavy is quicker and shorter than a chair and uses the actual active pose',()=>{
 const damage=[];
 for(const weapon of ['none','chair','bat','guitar','trashcan','bottle']){
  const m=make(1),[a,b]=m.fighters;a.weapon=weapon;press(m,'heavy');const timing=attackTiming(a.move,a.attackStyle);
  run(m,Math.floor(timing.startup*60));assert.equal(b.hp,100);
  while(b.hp===100&&a.move)tick(m);
  assert.ok(b.hp<100);assert.ok(attackPose(a.definition,a.move,a.t,a.attackStyle).frame);
  damage.push((100-b.hp)*b.definition.toughness/a.definition.power);
 }
 assert.deepEqual(damage.map(Math.round),[11,17,12,23,21,18]);
 assert.ok(attackTiming('heavy','light').reach<attackTiming('heavy','chair').reach);
 assert.ok(attackTiming('heavy','light').startup<attackTiming('heavy','chair').startup);
});
test('every weapon breaks at its hit limit and cycling cannot repair or re-equip broken gear',()=>{
 for(const [weapon,uses] of Object.entries(WEAPON_USES)){
  const m=make(1),a=m.fighters[0];a.weapon=weapon;
  for(let i=0;i<uses;i++){resetVictim(m);press(m,'heavy');run(m,70);assert.equal(a.weaponWear[weapon],i+1);}
  assert.equal(a.weapon,'none');const events=m.drainEvents();assert.equal(events.filter(e=>e.type==='weaponBreak'&&e.name===weapon).length,1);
  for(let i=0;i<8;i++){press(m,'weapon');run(m,16);assert.notEqual(a.weapon,weapon);}
  m.newRound();assert.deepEqual(m.fighters[0].weaponWear,{});
 }
 const m=make(),a=m.fighters[0];a.weapon='chair';press(m,'heavy');run(m,70);assert.equal(a.weaponWear.chair,1);
 for(let i=0;i<5;i++){press(m,'weapon');run(m,16);}assert.equal(a.weapon,'chair');assert.equal(a.weaponUses,1);
});
test('a missed or blocked weapon swing neither damages health nor consumes wear',()=>{
 for(const block of [true,false]){const m=make(),a=m.fighters[0];a.weapon='guitar';if(!block)m.fighters[1].x=1000;run(m,15,{}, {block});press(m,'heavy');run(m,65,{}, {block});assert.equal(m.fighters[1].hp,100);assert.equal(a.weaponWear.guitar,undefined);}
});
test('all fighters taunt on either top rope, earn 20 once and remain perched',()=>{
 for(let id=0;id<roster.length;id++)for(const side of [LEFT,RIGHT]){
  const m=make(id),a=m.fighters[0];perched(m,0,side);press(m,'taunt');assert.equal(a.state,'ropeTaunt');run(m,62);assert.equal(a.meter,20);assert.equal(a.state,'perch');assert.equal(a.z,140);
  press(m,'taunt');run(m,62);assert.equal(a.meter,20);assert.ok(m.drainEvents().some(e=>e.type==='taunt'&&e.amount===20));
 }
});
test('top-rope taunts are interruptible by an aerial strike or a superplex and never award interrupted meter',()=>{
 for(const action of ['heavy','grapple']){const m=make(),a=m.fighters[0],b=m.fighters[1];perched(m);press(m,'taunt');b.x=a.x+85;
  if(action==='heavy'){b.z=100;b.vz=300;b.state='jump';}press(m,action,1);run(m,125);assert.ok(a.hp<100);assert.equal(m.drainEvents().some(e=>e.type==='taunt'),false);assert.equal(a.z,0);
 }
});
test('all fighters superplex from both corners and either attacker position for extra damage',()=>{
 for(let id=0;id<roster.length;id++)for(const side of [LEFT,RIGHT])for(const fromTop of [true,false]){
  const m=make(id),a=m.fighters[0],b=m.fighters[1];perched(m,fromTop?0:1,side);const on=fromTop?a:b,below=fromTop?b:a;below.x=on.x+(side===LEFT?90:-90);
  assert.ok(canCornerThrow(a,b));assert.equal(touchContext(m).grabLabel,'SUPERPLEX');press(m,'grapple');assert.equal(m.grapple.kind,'superplex');
  let prior=b.z;for(let i=0;i<150&&m.grapple;i++){tick(m);assert.ok(Math.abs(b.z-prior)<35,'continuous lift/flight');prior=b.z;assert.ok(validSnapshot(packSnapshot(m,i+1),m.ids));}
  assert.equal(m.grapple,null);const expected=28*a.definition.power*a.definition.technique/b.definition.toughness;assert.ok(Math.abs(b.hp-(100-expected))<.001);assert.equal(a.hp,100);assert.equal(a.z,0);assert.equal(b.z,0);
  assert.ok(side===LEFT?b.x>LEFT+200:b.x<RIGHT-200);assert.equal(m.drainEvents().filter(e=>e.type==='slam'&&e.superplex).length,1);
 }
});
test('superplex break is fair for either player, restores the perch and deals no damage',()=>{
 for(const attacker of [0,1]){const m=make();perched(m,1-attacker);m.fighters[attacker].x=LEFT+100;press(m,'grapple',attacker);run(m,18);assert.equal(touchContext(m,1-attacker).grabLabel,'BREAK');press(m,'grapple',1-attacker);assert.equal(m.grapple,null);assert.equal(m.fighters[1-attacker].state,'perch');assert.equal(m.fighters[1-attacker].z,140);assert.ok(m.fighters.every(f=>f.hp===100));}
 const m=make();perched(m,1);m.fighters[0].x=LEFT+100;press(m,'grapple');run(m,25);press(m,'grapple',1);assert.ok(m.grapple);run(m,130);assert.ok(m.fighters[1].hp<100);
});
test('pole retrieval requires the correct corner and a continuous hold, then normal falls still decide the match',()=>{
 for(const index of [0,1]){const m=make(0,'pole-local');perched(m,index,RIGHT);run(m,68,index===0?{grapple:true}:{},index===1?{grapple:true}:{});assert.equal(m.pole.claimed,false);
  Object.assign(m.fighters[index],{state:'idle',z:0,vx:0,vz:0,t:0});perched(m,index,LEFT);assert.equal(touchContext(m,index).grabLabel,'CLAIM');
  run(m,30,index===0?{grapple:true}:{},index===1?{grapple:true}:{});assert.ok(m.pole.progress>0);tick(m);assert.equal(m.pole.progress,0);
  run(m,Math.ceil(POLE_RETRIEVE_TIME*60)+1,index===0?{grapple:true}:{},index===1?{grapple:true}:{});
  assert.equal(m.pole.holder,index);assert.equal(m.fighters[index].weapon,'chair');assert.deepEqual(m.wins,[0,0]);assert.equal(m.phase,'fight');
  m.endRound(index,'PINFALL');run(m,150);assert.equal(m.round,2);assert.equal(m.pole.x,RIGHT-18);assert.equal(m.pole.claimed,false);assert.ok(m.fighters.every(f=>f.weapon==='none'));
 }
});
test('knocking a claimant off cancels progress and dropped pole gear can change hands without resetting wear',()=>{
 const m=make(0,'pole-local'),[a,b]=m.fighters;perched(m);run(m,25,{grapple:true});assert.ok(m.pole.progress>0);b.x=a.x+90;press(m,'grapple',1);run(m,140);assert.equal(m.pole.claimed,false);assert.equal(m.pole.progress,0);
 Object.assign(a,{state:'perch',x:LEFT+18,z:140,ropeTime:0,stun:0,t:0});b.x=640;run(m,66,{grapple:true});assert.equal(m.pole.holder,0);
 m.pole.uses=2;a.weaponWear.chair=2;m.knockDown(a);assert.equal(m.pole.holder,null);assert.equal(a.weapon,'none');assert.equal(m.pole.looseX,a.x);
 b.x=a.x+70;press(m,'weapon',1);assert.equal(m.pole.holder,1);assert.equal(b.weaponWear.chair,2);assert.equal(m.pole.looseX,null);
 run(m,20);press(m,'weapon',1);assert.equal(b.weapon,'none');assert.equal(m.pole.holder,null);
});
test('pole mode prohibits free weapon cycling, local P2 input works, and CPU can claim the objective',()=>{
 const m=make(0,'pole-local');for(let n=0;n<6;n++){press(m,'weapon');run(m,18);}assert.equal(m.fighters[0].weapon,'none');
 const input=new InputState();input.setMode('pole-local');input.pressKey('KeyD');const keys=input.read();assert.equal(keys[1].right,true);assert.equal(keys[0].right,false);
 const cpu=make(0,'pole');cpu.fighters[0].x=RIGHT;cpu.fighters[1].x=LEFT+15;for(let i=0;i<360&&!cpu.pole.claimed;i++)tick(cpu);assert.equal(cpu.pole.holder,1);
});
test('new rope states and weapon wear reach the guest once and malformed snapshots are rejected',()=>{
 const m=make(),guest=make(),buf=new SnapshotBuffer(m.ids);perched(m);press(m,'taunt');m.fighters[0].weaponWear={chair:2};const packet=packSnapshot(m,1,[{type:'taunt',index:0,amount:20,serial:1}]);assert.ok(buf.receive(packet,0));buf.apply(guest,50);assert.equal(guest.fighters[0].state,'ropeTaunt');assert.equal(guest.fighters[0].weaponWear.chair,2);assert.equal(buf.drainEvents().length,1);assert.equal(buf.receive(packet,60),false);
 for(const bad of [{chair:-1},{chair:Infinity},{chair:'2'},{laser:1}]){const copy=structuredClone(packet);copy.fighters[0].weaponWear=bad;assert.equal(validSnapshot(copy,m.ids),false);}
});

test('overlay weapon grips follow the actual cloned contact crop and return to the resting hand',()=>{
 for(let i=0;i<9;i++)for(const weapon of roster[i].overlayWeapons){const m=make(i),f=m.fighters[0];f.weapon=weapon;m.startAttack(f,'heavy',0);const timing=attackTiming(f.move,f.attackStyle);
  f.t=timing.startup+.01;const pose=attackPose(f.definition,f.move,f.t,f.attackStyle),grip=weaponGrip(f,pose.frame,pose.offsetX);assert.ok(grip.x>=110&&grip.y>=110,`${f.definition.id} ${weapon}`);
  assert.deepEqual(weaponGrip(f,{...pose.frame},pose.offsetX),grip);
  f.t=timing.startup+timing.active+timing.recovery;const rest=attackPose(f.definition,f.move,f.t,f.attackStyle),restGrip=weaponGrip(f,rest.frame,rest.offsetX);assert.ok(restGrip.x<20&&restGrip.y<110);
 }
});

test('fresh online weapon wear survives Firebase omission of nulls and empty objects',()=>{
 const strip=value=>{if(Array.isArray(value))return value.map(strip);if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value)){const child=strip(v);if(child!==null&&!(typeof child==='object'&&!Array.isArray(child)&&Object.keys(child).length===0))out[k]=child;}return out;}return value;};
 const host=make(),guest=make(),packet=strip(packSnapshot(host,1));assert.equal(packet.fighters[0].weaponWear.chair,0);assert.ok(validSnapshot(packet,host.ids));const buf=new SnapshotBuffer(host.ids);assert.ok(buf.receive(packet,0));buf.apply(guest,50);assert.equal(guest.fighters[0].weaponWear.chair,0);
});

test('simultaneous corner grabs break fairly with either wrestler perched',()=>{
 for(const top of [0,1]){const m=make();perched(m,top);m.fighters[1-top].x=LEFT+100;tick(m,{pressed:{grapple:true}},{pressed:{grapple:true}});assert.equal(m.grapple,null);assert.ok(m.fighters.every(f=>f.hp===100));assert.equal(m.fighters[top].state,'perch');assert.equal(m.fighters[top].z,140);assert.equal(m.drainEvents().filter(e=>e.type==='throwBreak').length,1);}
});
