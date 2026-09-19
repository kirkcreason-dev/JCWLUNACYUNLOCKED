import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,emptyInput,LEFT,MOVES} from '../dist/src/engine.js';
import {phoneLayout,phoneCamera} from '../dist/src/phone-layout.js';
import {Haptics} from '../dist/src/haptics.js';
import {ArcadeRewards} from '../dist/src/arcade-rewards.js';
import {toggleFullscreen,fullscreenElement} from '../dist/src/fullscreen.js';
import {packSnapshot,validSnapshot} from '../dist/src/online-protocol.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url)));
const tick=(m,a={},b={})=>m.step([{...emptyInput(),...a},{...emptyInput(),...b}]);
const run=(m,n,a={},b={})=>{for(let i=0;i<n;i++)tick(m,a,b);};
const make=(id=0)=>{const m=new Match(roster,id,(id+1)%roster.length,{mode:'local'});m.phase='fight';m.fighters[0].x=500;m.fighters[1].x=580;return m;};
test('all 39 fighters can complete a taunt, climb either corner and dive',()=>{
 for(let id=0;id<roster.length;id++)for(const side of [LEFT,1080]){
  const m=make(id),a=m.fighters[0];a.x=side;m.fighters[1].x=640;
  tick(m,{taunt:true});assert.equal(a.state,'taunt',a.definition.id);run(m,62);assert.equal(a.meter,12);
  tick(m,{grapple:true});assert.equal(a.state,'climb');run(m,50);assert.equal(a.state,'perch');tick(m,{heavy:true});assert.equal(a.state,'dive');run(m,100);assert.ok(a.z>=0&&Number.isFinite(a.hp));
 }
});
test('every fighter cycles all common weapons and returns to bare hands; Tony includes a bottle',()=>{
 for(let id=0;id<roster.length;id++){
  const m=make(id),a=m.fighters[0],sequence=[];assert.equal(a.weapon,'none');
  for(let n=0;n<a.definition.weapons.length+1;n++){tick(m,{pressed:{weapon:true}});sequence.push(a.weapon);run(m,16);}
  assert.deepEqual(sequence,[...a.definition.weapons,'none']);assert.deepEqual(a.definition.weapons.slice(0,4),['chair','bat','guitar','trashcan']);
  for(const weapon of ['none',...a.definition.weapons]){const match=make(id),f=match.fighters[0];f.weapon=weapon;tick(match,{heavy:true});run(match,50);assert.ok(match.fighters[1].hp<100,`${f.definition.id}: ${weapon}`);assert.equal(match.drainEvents().filter(e=>e.type==='hit').length,1);}
 }
 assert.ok(roster.find(f=>f.id==='2-tuff-tony').weapons.includes('bottle'));
});
test('every fighter faces movement in both directions and faces the opponent when attacking or guarding',()=>{
 for(let id=0;id<roster.length;id++)for(const direction of [-1,1]){
  const m=make(id),a=m.fighters[0];m.fighters[1].x=direction===1?250:950;tick(m,{[direction===1?'right':'left']:true});assert.equal(a.facing,direction);
  tick(m,{block:true});assert.equal(a.facing,-direction);tick(m,{light:true});assert.equal(a.facing,-direction);
 }
});
test('shared guard counter and air strike land once for every fighter and can be blocked',()=>{
 for(let id=0;id<roster.length;id++)for(const kind of ['counter','aerial']){
  const m=make(id),a=m.fighters[0];if(kind==='aerial'){a.z=90;a.vz=0;a.state='jump';}
  tick(m,{heavy:true,block:kind==='counter'});assert.equal(a.move,kind);run(m,35);assert.ok(m.fighters[1].hp<100);assert.equal(m.drainEvents().filter(e=>e.type==='hit').length,1);
  const blocked=make(id);run(blocked,14,{}, {block:true});if(kind==='aerial'){blocked.fighters[0].z=90;blocked.fighters[0].state='jump';}
  tick(blocked,{heavy:true,block:kind==='counter'},{block:true});run(blocked,40,{}, {block:true});assert.equal(blocked.fighters[1].hp,100);assert.ok(blocked.drainEvents().some(e=>e.type==='block'));
 }
});
test('a three-hit confirmed combo grants a knockdown; one heavy cannot chain indefinitely',()=>{
 const m=make(),a=m.fighters[0],b=m.fighters[1];
 for(const action of ['light','light','heavy']){const hp=b.hp;tick(m,{pressed:{[action]:true}});for(let n=0;n<45&&b.hp===hp;n++)tick(m);assert.ok(b.hp<hp);}
 assert.equal(a.chain,2);assert.equal(b.state,'down');assert.ok(m.drainEvents().some(e=>e.type==='hit'&&e.ender));
 tick(m,{pressed:{heavy:true}});run(m,70);assert.equal(m.drainEvents().filter(e=>e.type==='hit').length,0);
});
test('new moves and Tony bottle survive the online snapshot validator',()=>{
 for(const move of ['counter','aerial','bottle']){const m=make(1),a=m.fighters[0];a.weapon='bottle';m.startAttack(a,move==='bottle'?'heavy':move,0);assert.equal(a.move,move);assert.equal(validSnapshot(packSnapshot(m,1),m.ids),true);}
});
test('pins use a back pose and finishing the round never restarts a settled fall',()=>{
 for(const id of ['2-tuff-tony','kerry-morton','steven-flowe']){
  const index=roster.findIndex(f=>f.id===id),m=make(index),f=m.fighters[0];m.knockDown(f,'front',.38,5);f.t=1.2;f.hp=20;m.startPin(1);assert.equal(f.fallFace,'back');assert.equal(f.fallDuration,0);
  run(m,170);assert.equal(m.method,'PINFALL');assert.equal(f.state,'down');assert.equal(f.fallDuration,0);
  const ko=make(index),victim=ko.fighters[0];ko.knockDown(victim,'back',.38,5);victim.t=1.1;victim.hp=0;ko.endRound(1,'KNOCKOUT');assert.equal(victim.t,1.1);
 }
});
test('portrait phones use a fitted 4:3 arena and normal jumps do not change camera zoom',()=>{
 const l=phoneLayout({width:390,height:844,safe:{top:47,bottom:34}});assert.ok(Math.abs(l.stage.width/l.stage.height-4/3)<1e-9);
 for(const portrait of [true,false])for(const height of [720,960,1440]){
  const base=phoneCamera([{x:500,z:0},{x:600,z:0}],{portrait,height});
  for(const z of portrait?[0,80,151,195,245,259]:[0,80,151])assert.equal(phoneCamera([{x:500,z},{x:600,z:0}],{portrait,height}).zoom,base.zoom);
 }
});
test('vibration is gesture-gated, throttled and bounded; unsupported, refused and throwing APIs are safe',()=>{
 let now=0,calls=[];const h=new Haptics({vibrate:n=>(calls.push(n),true)},()=>now);
 assert.equal(h.pulse(),false);h.activate();assert.equal(h.pulse(500),true);assert.equal(calls[0],55);assert.equal(h.pulse(),false);now=100;assert.equal(h.pulse(),true);
 h.enabled=false;now=200;assert.equal(h.pulse(),false);h.enabled=true;assert.equal(h.pulse(200,{test:true}),true);assert.equal(calls.at(-1),120);h.stop();assert.equal(calls.at(-1),0);
 for(const device of [{},{vibrate:()=>false},{vibrate:()=>{throw Error('Denied');}}]){const h=new Haptics(device);h.activate();assert.equal(h.pulse(),false);assert.doesNotThrow(()=>h.stop());}
});
test('fullscreen supports standard/prefixed entry and exit with a safe fitted-screen fallback',async()=>{
 let calls=[];const el={requestFullscreen:async()=>calls.push('enter')},doc={exitFullscreen:async()=>calls.push('exit')};
 assert.equal(await toggleFullscreen(el,doc),'entered');doc.fullscreenElement=el;assert.equal(fullscreenElement(doc),el);assert.equal(await toggleFullscreen(el,doc),'exited');
 assert.equal(await toggleFullscreen({webkitRequestFullscreen:async()=>calls.push('webkit')},{}),'entered');
 assert.equal(await toggleFullscreen({},{}),'fitted');assert.equal(await toggleFullscreen({requestFullscreen:async()=>{throw Error();}},{}),'fitted');assert.deepEqual(calls,['enter','exit','webkit']);
});
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
const award=(r,id='violent-j',difficulty='easy',extra={})=>r.award({fighter:id,difficulty,defeated:roster.filter(f=>f.id!==id).map(f=>f.id),mode:'arcade',won:true,...extra});
test('arcade medals save by fighter and difficulty, survive renames/reorder and award a Triple Crown',()=>{
 const disk=storage(),r=new ArcadeRewards(roster,disk);for(const d of ['easy','normal','hard'])assert.equal(award(r,'able',d).fresh,true);
 assert.equal(r.triple('able'),true);assert.equal(r.get('violent-j','easy'),null);assert.equal(award(r,'able','easy').fresh,false);
 const reload=new ArcadeRewards([...roster].reverse(),disk);assert.equal(reload.triple('able'),true);assert.equal(reload.get('able','hard').opponents,38);
});
test('arcade awards reject loss, partial runs, duplicates, unknown IDs, and other modes',()=>{
 const r=new ArcadeRewards(roster,storage());for(const patch of [{won:false},{mode:'cpu'},{difficulty:'extreme'},{fighter:'missing'},{defeated:['able']},{defeated:Array(38).fill('able')}])assert.equal(award(r,'violent-j','easy',patch),null);
 assert.equal(r.get('violent-j','easy'),null);
});
test('arcade storage failure retains an honest session-only medal; corrupt saves are ignored',()=>{
 const r=new ArcadeRewards(roster,{getItem:()=>'{broken',setItem:()=>{throw Error('Quota');}});assert.equal(r.get('violent-j','easy'),null);assert.ok(award(r));assert.equal(r.saved,false);assert.ok(r.get('violent-j','easy'));
});
test('supplied control regions stay inside the unchanged sheet and all contextual states have artwork',async()=>{
 const m=JSON.parse(await readFile(new URL('../dist/assets/ui/touch-control-regions.json',import.meta.url)));
 for(const key of ['dpad','hit','heavy','grab','finish','pin','break','climb','dive','release','get-up','kick-out','escape']){const [x,y,w,h]=m.regions[key];assert.ok(x>=0&&y>=0&&x+w<=m.width&&y+h<=m.height);}
});
