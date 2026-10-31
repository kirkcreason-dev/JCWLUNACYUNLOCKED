import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SquadSession,squadTeams,cpuSeats,seatsOf,validSquadRoom,SQUAD_PREFIX} from '../dist/src/online-squad.js';
import {SquadSnapshotBuffer,packSquadSnapshot,validSquadSnapshot,SQUAD_PROTOCOL} from '../dist/src/online-protocol.js';
import {Match,emptyInput,STEP} from '../dist/src/engine.js';
import {MemoryFirebase,settle} from './firebase-memory.mjs';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
let serial=0;
function client(db,extra={}){
  const log={started:0,prepared:0,ended:[],packets:[],lobby:[],dropped:[]},n=++serial;let op=0;
  const session=new SquadSession({connect:async()=>db,id:()=>`sq-${n}-${++op}`,code:()=>'SQAD',
    prepare:()=>{log.prepared++;},start:()=>{log.started++;},ended:m=>log.ended.push(m),snapshot:p=>log.packets.push(p),lobby:m=>log.lobby.push(m),dropped:s=>log.dropped.push(s),...extra});
  return {session,log};
}
test('four friends fill the seats, alternate teams, and the room starts by itself',async t=>{
  const db=new MemoryFirebase(),c=[0,1,2,3].map(()=>client(db));t.after(async()=>{for(const x of c)await x.session.leave();});
  const code=await c[0].session.begin('create',3,{arena:2,format:'tornado'});assert.equal(code,'SQAD');
  for(const [i,f] of [[1,5],[2,7],[3,9]]){await c[i].session.begin('join',f,{code});await settle();}
  await settle();await settle();
  const meta=db.get(`${SQUAD_PREFIX}SQAD/meta`);
  assert.equal(meta.state,'playing');assert.deepEqual(c.map(x=>x.session.seat),[0,1,2,3]);
  assert.deepEqual(squadTeams(meta),[[3,7],[5,9]]);assert.deepEqual(cpuSeats(meta),[]);
  assert.ok(c.every(x=>x.log.prepared===1&&x.log.started===1));
});
test('a wrestler can only be picked once per room',async t=>{
  const db=new MemoryFirebase(),c=[0,1,2,3,4].map(()=>client(db));t.after(async()=>{for(const x of c)await x.session.leave();});
  await c[0].session.begin('create',3,{format:'tag'});
  await assert.rejects(c[1].session.begin('join',3,{code:'SQAD'}),/already taken/);
  await c[1].session.begin('join',4,{code:'SQAD'});await settle();
  assert.equal(db.get(`${SQUAD_PREFIX}SQAD/meta/state`),'lobby');
  assert.equal(c[0].log.lobby.at(-1).players.p1.fighter,4);
});
test('the host can start early: empty seats become CPU wrestlers nobody picked',async t=>{
  const db=new MemoryFirebase(),host=client(db,{fill:()=>[3,11,12,13]}),guest=client(db);t.after(async()=>{await host.session.leave();await guest.session.leave();});
  await host.session.begin('create',3,{format:'elimination'});await guest.session.begin('join',4,{code:'SQAD'});await settle();
  assert.equal(await host.session.launch(),true);await settle();await settle();
  const meta=db.get(`${SQUAD_PREFIX}SQAD/meta`);
  assert.equal(meta.state,'playing');assert.deepEqual(meta.cpu,{p2:11,p3:12});assert.deepEqual(cpuSeats(meta),[2,3]);
  assert.deepEqual(squadTeams(meta),[[3,11],[4,12]]);assert.ok(validSquadRoom(meta));
  assert.equal(guest.log.started,1);
});
test('a friend leaving the lobby frees the seat; leaving mid-match hands the wrestler to the CPU',async t=>{
  const db=new MemoryFirebase(),host=client(db),a=client(db),b=client(db);t.after(async()=>{for(const x of [host,a,b])await x.session.leave();});
  await host.session.begin('create',0,{format:'tag'});await a.session.begin('join',1,{code:'SQAD'});await b.session.begin('join',2,{code:'SQAD'});await settle();
  await a.session.leave();await settle();await settle();
  assert.equal(seatsOf(db.get(`${SQUAD_PREFIX}SQAD/meta`))[1],null);
  await host.session.launch();await settle();await settle();
  assert.equal(db.get(`${SQUAD_PREFIX}SQAD/meta/state`),'playing');
  await b.session.leave();await settle();
  assert.deepEqual(host.log.dropped,[2]);assert.equal(host.session.active,true);
});
test('when the host leaves, everyone else is told and the room is removed',async t=>{
  const db=new MemoryFirebase(),host=client(db),a=client(db);t.after(async()=>{await a.session.leave();});
  await host.session.begin('create',0,{format:'tag'});await a.session.begin('join',1,{code:'SQAD'});await settle();
  await host.session.leave();await settle();
  assert.equal(db.get(`${SQUAD_PREFIX}SQAD`),null);assert.equal(a.log.ended.length,1);assert.equal(a.session.active,false);
});
test('guests send controls per seat; the host snapshot drives all four wrestlers on every guest',async t=>{
  let now=1000;const db=new MemoryFirebase();const guests={},buffers={};let host;
  const make=(meta,n)=>new Match(roster,0,0,{mode:'squad',format:meta.format,teams:squadTeams(meta),cpuPlayers:cpuSeats(meta)});
  const h=client(db,{now:()=>now,prepare:meta=>{host=make(meta,0);host.phase='fight';}});
  const g=[1,2,3].map(n=>client(db,{now:()=>now,prepare:(meta,s)=>{guests[s]=make(meta,s);buffers[s]=new SquadSnapshotBuffer(squadTeams(meta));},snapshot:p=>{for(const s of Object.keys(buffers))if(g[s-1]?.session.ctx)void 0;}}));
  // Route each guest's snapshot to its own buffer.
  g.forEach((x,i)=>{x.session.snapshot=p=>buffers[i+1].receive(p,now);});
  t.after(async()=>{for(const x of [h,...g])await x.session.leave();});
  await h.session.begin('create',16,{format:'tornado'});for(const [i,f] of [[0,20],[1,21],[2,22]])await g[i].session.begin('join',f,{code:'SQAD'});await settle();await settle();
  assert.equal(host.fighters.length,4);
  for(let i=0;i<24;i++){
    now+=50;g[1].session.capture({...emptyInput(),right:true});g[1].session.sendInput();g[2].session.capture({...emptyInput(),left:true});g[2].session.sendInput();await settle();
    host.step([emptyInput(),h.session.readRemote(1),h.session.readRemote(2),h.session.readRemote(3)],STEP);h.session.sendSnapshot(host);await settle();
    for(const s of [1,2,3])buffers[s].apply(guests[s],now+50);
  }
  assert.ok(host.fighters[2].x>480);assert.ok(host.fighters[3].x<800);
  for(const s of [1,2,3]){assert.deepEqual(guests[s].fighters.map(f=>f.x),host.fighters.map(f=>f.x));assert.deepEqual(guests[s].fighters.map(f=>f.id),[16,20,21,22]);}
});
test('squad snapshots survive Firebase dropping empty lists and carry tags, eliminations and CPU seats',()=>{
  const teams=[[1,2],[3,4]],m=new Match(roster,1,3,{mode:'squad',format:'tag',teams,cpuPlayers:[3]});m.phase='fight';
  m.fighters[0].x=210;m.fighters[0].buffer={action:'taunt',remaining:.1};m.step([emptyInput(),emptyInput(),emptyInput(),emptyInput()],STEP);
  assert.deepEqual(m.ids,[2,3]);
  const packet=JSON.parse(JSON.stringify(packSquadSnapshot(m,1,m.drainEvents().map((e,i)=>({...e,serial:i+1})))));
  delete packet.team.out;delete packet.team.cpu;packet.team.cpu={0:3};
  assert.equal(packet.protocol,SQUAD_PROTOCOL);assert.ok(validSquadSnapshot(packet,teams));
  const guest=new Match(roster,1,3,{mode:'squad',format:'tag',teams}),buffer=new SquadSnapshotBuffer(teams);
  assert.ok(buffer.receive(packet,0));buffer.apply(guest,0);
  assert.equal(guest.fighters[0].id,2);assert.equal(guest.fighters[0].definition,roster[2]);assert.deepEqual(guest.out,[[],[]]);assert.ok(guest.cpuPlayers.has(3));
  assert.ok(buffer.drainEvents().some(e=>e.type==='tag'));
  assert.equal(validSquadSnapshot({...packet,fighters:packet.fighters.map(f=>({...f,id:9}))},teams),false);
  assert.equal(validSquadSnapshot({...packet,pin:{attacker:0,defender:0,time:0,count:0,escape:0}},teams),false);
});
