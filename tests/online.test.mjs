import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {OnlineSession,roomCode,randomId,validRoom} from '../dist/src/online.js';
import {InputPackets,RemoteInput,SnapshotBuffer,packSnapshot,PROTOCOL} from '../dist/src/online-protocol.js';
import {Match,emptyInput,STEP} from '../dist/src/engine.js';
import {InputState} from '../dist/src/input.js';
import {touchContext} from '../dist/src/touch-ui.js';
import {MemoryFirebase,settle} from './firebase-memory.mjs';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
let serial=0;
test('room sessions work when randomUUID is unavailable on an HTTP preview',()=>{
  const id=randomId({getRandomValues:array=>{array.fill(171);return array;}});
  assert.match(id,/^[a-f0-9]{32}$/);
});
function client(db,extra={}){
  const log={started:0,prepared:0,ended:[],packets:[]},clientId=++serial;let operation=0;
  const session=new OnlineSession({connect:async()=>db,id:()=>`test-${clientId}-${++operation}`,code:()=>['ABCD','EFGH','JKLM','NPQR'][clientId%4],prepare:()=>{log.prepared++;},start:()=>{log.started++;},ended:message=>log.ended.push(message),snapshot:packet=>log.packets.push(packet),...extra});
  return {session,log};
}
async function pair(t){
  const db=new MemoryFirebase(),a=client(db),b=client(db);t.after(async()=>{await a.session.leave();await b.session.leave();});
  const code=await a.session.begin('create',0,4);await b.session.begin('join',2,0,code);await settle();
  return {db,a,b,code};
}
test('online room joins load both chosen wrestlers and host arena before starting once',async t=>{
  const {db,a,b,code}=await pair(t),meta=db.get(`rooms/LU6-${code}/meta`);
  assert.equal(meta.host.fighter,0);assert.equal(meta.guest.fighter,2);assert.equal(meta.arena,4);assert.equal(meta.state,'playing');
  assert.equal(a.session.role,'host');assert.equal(b.session.role,'guest');
  assert.equal(a.log.started,1);assert.equal(b.log.started,1);assert.equal(a.log.prepared,1);assert.equal(b.log.prepared,1);
});
test('Caleb joins and hosts with the full roster; incompatible rosters are rejected',async()=>{
 const caleb=roster.findIndex(f=>f.id==='caleb-konley');assert.equal(caleb,15);
 for(const hostCaleb of [true,false]){
  const db=new MemoryFirebase(),a=client(db),b=client(db);
  try{
   const code=await a.session.begin('create',hostCaleb?caleb:0,4);
   await b.session.begin('join',hostCaleb?0:caleb,0,code);await settle();
   const meta=db.get(`rooms/LU6-${code}/meta`);
   assert.equal(meta.state,'playing');assert.equal(a.log.started,1);assert.equal(b.log.started,1);
   assert.ok(validRoom(meta));
   assert.equal(validRoom({...meta,protocol:'lunacy-2d-v2'}),false);
   assert.equal(validRoom({...meta,host:{...meta.host,fighter:roster.length}}),false);
   assert.equal(validRoom({...meta,guest:{...meta.guest,fighter:roster.length}}),false);
   const host=new Match(roster,meta.host.fighter,meta.guest.fighter,{mode:'online'}),guest=new Match(roster,...host.ids,{mode:'online'});
   const packet=packSnapshot(host,1),buffer=new SnapshotBuffer(host.ids);assert.equal(packet.protocol,PROTOCOL);
   assert.ok(buffer.receive(packet,0));buffer.apply(guest,50);assert.equal(guest.fighters[hostCaleb?0:1].definition.name,'Caleb Konley');
  }finally{await a.session.leave();await b.session.leave();}
 }
});
test('two simultaneous joiners cannot claim the same guest seat',async t=>{
  const db=new MemoryFirebase(),a=client(db),b=client(db),c=client(db);t.after(async()=>{for(const x of [a,b,c])await x.session.leave();});
  const code=await a.session.begin('create',0,0);
  const results=await Promise.allSettled([b.session.begin('join',1,0,code),c.session.begin('join',2,0,code)]);await settle();
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.ok(db.get(`rooms/LU6-${code}`));assert.equal(a.log.started,1);
});
test('invalid room input never changes another room',async t=>{
  const {db,a,code}=await pair(t),c=client(db);t.after(()=>c.session.leave());
  await assert.rejects(c.session.begin('join',4,0,'../'),/four-letter/);
  await assert.rejects(c.session.begin('join',4,0,code),/full|playing/);
  assert.equal(db.get(`rooms/LU6-${code}/meta/host/id`),a.session.ctx.id);
  assert.equal(roomCode(' lu6-abcd '),'ABCD');
});
test('quick match atomically pairs searchers without touching the legacy queue',async t=>{
  const db=new MemoryFirebase();await db.ref('quickQueue').set({code:'OLDX',t:1});const a=client(db),b=client(db);t.after(async()=>{await a.session.leave();await b.session.leave();});
  await Promise.all([a.session.begin('quick',0,5),b.session.begin('quick',8,3)]);await settle();
  assert.equal(a.log.started,1);assert.equal(b.log.started,1);assert.equal(a.session.code,b.session.code);assert.notEqual(a.session.role,b.session.role);
  assert.deepEqual(db.get('quickQueue'),{code:'OLDX',t:1});assert.equal(db.get('rooms/LU6-queue'),null);
});
test('cancelling quick match removes only its own room and queue claim',async()=>{
  const db=new MemoryFirebase(),a=client(db);await a.session.begin('quick',0,0);const code=a.session.code;
  await db.ref('rooms/LU6-queue').set({code:'ZZZZ',owner:'someone-else',at:Date.now()});await a.session.leave();
  assert.equal(db.get(`rooms/LU6-${code}`),null);assert.equal(db.get('rooms/LU6-queue/owner'),'someone-else');assert.equal(db.listeners.size,0);
});
test('cancelling while Firebase connects cannot create a late room',async()=>{
  const db=new MemoryFirebase();let resolve;const a=client(db,{connect:()=>new Promise(r=>{resolve=r;})});
  const pending=a.session.begin('create',0,0);await settle();await a.session.leave();resolve(db);await pending;await settle();
  assert.equal(a.session.active,false);assert.equal(Object.keys(db.get('rooms')||{}).length,0);
});
test('leaving a live room ends the other client and removes listeners',async t=>{
  const {db,a,b}=await pair(t);await b.session.leave();await settle();
  assert.equal(a.log.ended.length,1);assert.match(a.log.ended[0],/opponent left/);await settle();assert.equal(a.session.active,false);
  assert.equal(db.listeners.size,0);
});
test('host disconnect cleanup removes the room and notifies the guest',async t=>{
  const {db,b,code}=await pair(t);
  const cleanup=[...db.disconnects].find(item=>item.ref.path===`rooms/LU6-${code}`);
  assert.ok(cleanup);assert.equal(cleanup.value,null);
  db.write(cleanup.ref.path,cleanup.value);await settle();
  assert.equal(db.get(`rooms/LU6-${code}`),null);assert.equal(b.log.ended.length,1);
});
test('coalesced input keeps press order and duplicate packets cannot replay actions',()=>{
  const sender=new InputPackets(),receiver=new RemoteInput();
  for(const action of ['light','heavy','light']){sender.capture({...emptyInput(),pressed:{[action]:true}});sender.capture(emptyInput());}
  const packet=sender.packet('guest');assert.equal(receiver.receive(packet,'guest',100),true);
  assert.equal(receiver.receive(packet,'guest',110),false);
  assert.deepEqual([receiver.read(120).pressed,receiver.read(130).pressed,receiver.read(140).pressed],[{light:true},{heavy:true},{light:true}]);
  assert.deepEqual(receiver.read(150).pressed,{});
});
test('stale input releases movement and simultaneous escape buttons stay simultaneous',()=>{
  const sender=new InputPackets(),receiver=new RemoteInput();sender.capture({...emptyInput(),right:true,pressed:{light:true,heavy:true}});
  receiver.receive(sender.packet('guest'),'guest',0);assert.deepEqual(receiver.read(10).pressed,{light:true,heavy:true});
  assert.equal(receiver.read(601).right,false);
  assert.equal(receiver.receive({...sender.packet('guest'),player:'intruder'},'guest',700),false);
});
test('online mode uses human P2 input and gives no CPU pin-escape assistance',()=>{
  const match=new Match(roster,0,1,{mode:'online'});match.phase='fight';match.cpu=()=>{throw Error('Online called CPU');};
  const before=match.fighters[1].x;match.step([emptyInput(),{...emptyInput(),left:true}],STEP);assert.ok(match.fighters[1].x<before);
  match.fighters[1].hp=20;match.fighters[1].state='down';match.startPin(0);
  for(let i=0;i<30;i++)match.step([emptyInput(),emptyInput()],STEP);
  assert.equal(match.pin.escape,0);
});
test('joining player can escape a real pin through delayed one-button touch packets',()=>{
  const match=new Match(roster,0,1,{mode:'online'});match.phase='fight';match.fighters[1].hp=20;match.fighters[1].state='down';match.startPin(0);
  assert.equal(touchContext(match,1).escapeLabel,'KICK OUT');assert.equal(touchContext(match,0).escape,false);
  const input=new InputState(),sender=new InputPackets(),receiver=new RemoteInput();
  for(let tick=0;tick<160&&match.pin;tick++){
    if(tick%5===0){input.pressTouch(tick,'escape');input.releaseTouch(tick);}
    sender.capture(input.read()[0]);if(tick%9===0)receiver.receive(sender.packet('guest'),'guest',tick*1000/60);
    match.step([emptyInput(),receiver.read(tick*1000/60)],STEP);
  }
  assert.equal(match.pin,null);assert.equal(match.wins[0],0);assert.ok(['rise','idle'].includes(match.fighters[1].state));
});
test('snapshots preserve throws, pins, round scores and results without serializing definitions',()=>{
  const match=new Match(roster,4,8,{mode:'online'}),guest=new Match(roster,4,8,{mode:'online'}),buffer=new SnapshotBuffer([4,8]);
  match.phase='fight';match.startPin(1);match.pin.count=2;match.pin.escape=4;
  let packet=packSnapshot(match,1,[{type:'count',count:2,serial:1}]);assert.equal(packet.fighters[0].definition,undefined);
  assert.equal(buffer.receive(packet,100),true);buffer.apply(guest,200);assert.equal(guest.pin.attacker,1);assert.equal(guest.pin.count,2);
  assert.equal(buffer.drainEvents().length,1);assert.equal(buffer.receive(packet,210),false);assert.equal(buffer.drainEvents().length,0);
  match.pin=null;match.wins=[1,2];match.winner=1;match.phase='done';match.method='PINFALL';packet=packSnapshot(match,2);
  buffer.receive(packet,300);buffer.apply(guest,400);assert.equal(guest.phase,'done');assert.equal(guest.winner,1);assert.deepEqual(guest.wins,[1,2]);
});
test('malformed snapshots are ignored and movement interpolates without moving health backward',()=>{
  const match=new Match(roster,0,1,{mode:'online'}),guest=new Match(roster,0,1,{mode:'online'}),buffer=new SnapshotBuffer([0,1]);match.phase='fight';
  assert.equal(buffer.receive({...packSnapshot(match,1),fighters:[]},0),false);
  buffer.receive(packSnapshot(match,1),0);match.fighters[0].x+=40;match.fighters[0].hp=70;buffer.receive(packSnapshot(match,2),50);buffer.apply(guest,75);
  assert.equal(guest.fighters[0].x,430);assert.equal(guest.fighters[0].hp,70);
});
test('a lifted opponent keeps the actual grapple state and height on the guest',()=>{
  const host=new Match(roster,2,7,{mode:'online'}),guest=new Match(roster,2,7,{mode:'online'}),buffer=new SnapshotBuffer([2,7]);
  host.phase='fight';host.fighters[0].x=600;host.fighters[1].x=670;host.startGrapple(0);
  for(let i=0;i<35;i++)host.step([emptyInput(),emptyInput()],STEP);
  assert.equal(host.fighters[1].state,'lifted');assert.equal(buffer.receive(packSnapshot(host,1),0),true);buffer.apply(guest,60);
  assert.deepEqual(guest.grapple,host.grapple);assert.equal(guest.fighters[1].z,host.fighters[1].z);assert.equal(guest.fighters[1].state,'lifted');
});
test('Firebase-shaped sessions deliver guest controls and host snapshots end to end',async t=>{
  let now=1000;const db=new MemoryFirebase();let host,guest,buffer;
  const a=client(db,{now:()=>now,prepare:meta=>{host=new Match(roster,meta.host.fighter,meta.guest.fighter,{mode:'online'});host.phase='fight';}});
  const b=client(db,{now:()=>now,prepare:meta=>{guest=new Match(roster,meta.host.fighter,meta.guest.fighter,{mode:'online'});buffer=new SnapshotBuffer(guest.ids);},snapshot:p=>buffer.receive(p,now)});
  t.after(async()=>{await a.session.leave();await b.session.leave();});
  await a.session.begin('create',16,2);await b.session.begin('join',20,0,a.session.code);await settle();
  for(let i=0;i<24;i++){
    now+=50;b.session.capture({...emptyInput(),left:true});b.session.sendInput();await settle();
    host.step([emptyInput(),a.session.readRemote()],STEP);a.session.sendSnapshot(host);await settle();buffer.apply(guest,now+50);
  }
  assert.ok(host.fighters[1].x<870);assert.equal(guest.fighters[1].x,host.fighters[1].x);assert.equal(guest.fighters[0].hp,host.fighters[0].hp);
});
