import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {RosterSelection} from '../dist/src/roster-selection.js';
import {Match,STEP,MOVES,emptyInput} from '../dist/src/engine.js';
import {finisherMove} from '../dist/src/fighter-profile.js';
import {attackPose} from '../dist/src/attack-animation.js';
import {Championship} from '../dist/src/championship.js';
import {ArcadeRewards} from '../dist/src/arcade-rewards.js';
import {ArcadeRun} from '../dist/src/arcade-run.js';
import {Sound} from '../dist/src/audio.js';
import {SAMPLE_GROUPS} from '../dist/src/sample-bank.js';
import {gruntGroup,impactGroup} from '../dist/src/sound-events.js';
import {packSnapshot,SnapshotBuffer} from '../dist/src/online-protocol.js';
const read=p=>readFileSync(new URL(p,import.meta.url));
const roster=JSON.parse(read('../dist/assets/roster.json')),id=roster.findIndex(f=>f.id==='bigfoot'),def=roster[id];
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
const step=(m,a={},b={})=>m.step([{...emptyInput(),...a},{...emptyInput(),...b}],STEP);
function match(index=0,side=1){const m=new Match(roster,index===0?id:0,index===1?id:0,{mode:'local'});m.phase='fight';m.fighters[index].x=640;m.fighters[1-index].x=640+90*side;m.fighters[index].facing=side;m.drainEvents();return m;}
function audioSpy(){
 const s=new Sound({play:()=>Promise.resolve(),pause(){}}),played=[];s.context={currentTime:10};s.ready=()=>true;s.sample=(group,options={})=>{played.push({group,...options});return true;};s.tone=()=>{};s.noise=()=>{};return {s,played};
}

test('Bigfoot replaces Yabo in the 40-fighter regular selection, exposed by every phone/desktop page size',()=>{
 assert.equal(id,8);assert.equal(roster.length,40);assert.ok(!roster.some(f=>f.id==='yabo'));assert.equal(def.name,'Bigfoot');
 for(const size of [6,8,12]){const p=new RosterSelection(roster.length,size);p.choose(id);assert.ok(p.visible.includes(id));p.resize(6);assert.deepEqual(p.visible,[6,7,8,9,10,11]);}
 assert.equal(def.websiteStats,null);assert.equal(def.finisher,'CHOKESLAM');for(const key of ['power','speed','technique','toughness'])assert.equal(def[key],1);
 assert.deepEqual(def.weapons,['chair','bat','guitar','trashcan']);
 assert.deepEqual(def.animations.fallFront.at(-1),def.animations.down[0]);assert.deepEqual(def.animations.fallBack.at(-1),def.animations.down[1]);assert.deepEqual(def.animations.riseBack[0],def.animations.down[1]);assert.deepEqual(def.animations.ko[0],def.animations.down[1]);
});

test('Bigfoot retains both supplied packs, all 31 audited sheets and all 12 original WAVs',()=>{
 const art=JSON.parse(read('../tools/bigfoot-source-audit.json')),sound=JSON.parse(read('../tools/bigfoot-sound-audit.json'));
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 assert.equal(sha(read('../source-packs/Big-Foot.zip')),art.sourceSHA256);assert.equal(art.sheets.length,31);assert.equal(new Set(art.sheets.map(s=>s.source)).size,31);
 assert.equal(sha(read('../source-packs/JCW-Big-Foot-Sound-Pack.zip')),sound.sourceSHA256);assert.equal(sound.files.length,12);
 for(const row of sound.files){assert.equal(sha(read('../'+row.file)),row.sha256);assert.equal(row.hz,48000);assert.equal(row.channels,1);assert.ok(row.seconds<=1.8);}
 assert.equal(Object.entries(SAMPLE_GROUPS).filter(([name])=>name.startsWith('bigfoot_')).flatMap(([,paths])=>paths).length,12);
 assert.equal(def.animations.special.length,6);assert.equal(def.animations.run.length,6);assert.equal(def.animations.walk.length,5);assert.equal(def.animations.climb.length,3);
});

test('Bigfoot special contacts on authored frame five exactly once in either slot/direction, without consuming a held weapon',()=>{
 for(const index of [0,1])for(const side of [-1,1]){
  const m=match(index,side),f=m.fighters[index],enemy=m.fighters[1-index];f.meter=100;f.weapon='guitar';
  const inputs=[{},{}];inputs[index]={special:true};step(m,...inputs);assert.equal(f.meter,0);
  let hits=0,cues=0;
  for(let n=0;n<100;n++){
   step(m);const events=m.drainEvents();
   if(events.some(e=>e.type==='attackActive'&&e.index===index))assert.equal(attackPose(def,'special',f.t,f.attackStyle).frame,def.animations.special[4]);
   hits+=events.filter(e=>e.type==='hit'&&e.attacker===index).length;cues+=events.filter(e=>e.type==='attackActive'&&e.index===index).length;
  }
  assert.equal(hits,1);assert.equal(cues,1);assert.ok(enemy.hp<100);assert.equal(f.weaponWear.guitar||0,0);assert.equal(f.move,null);
 }
 const timing=finisherMove(def,MOVES.special);
 for(let n=0;n<4;n++)assert.equal(attackPose(def,'special',(n+.1)*timing.startup/4,'light').frame,def.animations.special[n]);
 assert.equal(attackPose(def,'special',timing.startup+timing.active+.01,'light').frame,def.animations.special[5]);
});

test('a missed Bigfoot special spends meter, a block protects health, and interruption cannot emit a late slam',()=>{
 for(const scenario of ['miss','block','interrupt']){
  const m=match(),[a,b]=m.fighters;a.meter=100;if(scenario==='miss')b.x=1050;if(scenario==='interrupt')b.x=750;
  if(scenario==='block')for(let n=0;n<15;n++)step(m,{}, {block:true});
  step(m,{special:true},scenario==='block'?{block:true}:{});const events=[];
  for(let n=0;n<95;n++){step(m,{},scenario==='block'?{block:true}:scenario==='interrupt'&&n===0?{light:true}:{});events.push(...m.drainEvents());}
  assert.equal(b.hp,100);assert.ok(a.meter<100);
  assert.equal(events.filter(e=>e.type==='attackActive'&&e.index===0).length,scenario==='interrupt'?0:1);
 }
});

test('Bigfoot sound events route only his vocals/steps and synchronize lift and impact without duplicate generic hits',()=>{
 const {s,played}=audioSpy(),m=match(),f=m.fighters[0];
 assert.equal(gruntGroup('bigfoot'),'bigfoot_hurt');assert.equal(gruntGroup('bigfoot',true),'bigfoot_hurt_heavy');
 assert.equal(impactGroup({fighter:'bigfoot',move:'heavy',style:'kick'}),'bigfoot_hit');assert.equal(impactGroup({fighter:'bigfoot',move:'heavy',style:'chair'}),'chair_hit');
 s.play([{type:'fight'},{type:'tauntStart',index:0},{type:'swing',index:0,fighter:'bigfoot',move:'light'}],m);
 assert.ok(played.some(e=>e.group==='bigfoot_idle'));assert.ok(played.some(e=>e.group==='bigfoot_roar'));assert.ok(played.some(e=>e.group==='bigfoot_attack'));
 f.meter=100;step(m,{special:true});s.play(m.drainEvents(),m);const lift=played.find(e=>e.group==='bigfoot_lift');assert.ok(lift);assert.ok(Math.abs(lift.delay+lift.duration-finisherMove(def,MOVES.special).startup)<1e-9);
 for(let n=0;n<65;n++){step(m);s.play(m.drainEvents(),m);}
 assert.equal(played.filter(e=>e.group==='bigfoot_impact').length,1);assert.ok(!played.some(e=>e.group==='punch_hit'||e.group==='kick_hit'));
 const before=played.length;f.state='walk';f.z=0;m.hitStop=0;s.updateMovement(m);for(let n=0;n<8;n++){f.x+=12;s.context.currentTime+=.04;s.updateMovement(m);}assert.equal(played.slice(before).filter(e=>e.group==='bigfoot_step').length,1);
 const normal=new Match(roster,0,1,{mode:'local'}),other=audioSpy();other.s.play([{type:'fight'},{type:'tauntStart',index:0},{type:'swing',index:0,fighter:'violent-j',move:'light'},{type:'roundEnd',winner:0}],normal);assert.ok(!other.played.some(e=>e.group.startsWith('bigfoot_')));
});

test('Bigfoot can win and reload titles/medals on all difficulties while existing progress survives the addition',()=>{
 const disk=storage(),old=roster.map(f=>f.id==='bigfoot'?{...f,id:'yabo',name:'Yabo'}:f),oldMode=new Championship(old,disk,()=>.3);
 oldMode.settle(oldMode.start('violent-j','normal',0),true);const before=oldMode.load('violent-j','normal');
 new ArcadeRewards(old,disk).award({fighter:'violent-j',difficulty:'hard',defeated:old.slice(1).map(f=>f.id),mode:'arcade',won:true});
 assert.deepEqual(new Championship(roster,disk).load('violent-j','normal'),before);assert.equal(new ArcadeRewards(roster,disk).get('violent-j','hard').opponents,39);
 for(const difficulty of ['easy','normal','hard']){
  let mode=new Championship(roster,disk,()=>.3),result;for(let n=0;n<5;n++)result=mode.settle(mode.start('bigfoot',difficulty,0),true);
  assert.equal(result.outcome,'crowned');mode=new Championship(roster,disk);assert.equal(mode.settle(mode.start('bigfoot',difficulty,0),true).outcome,'defended');
  const run=new ArcadeRun(roster,disk,()=>.4).start('bigfoot',difficulty,0);assert.equal(run.opponents.length,39);assert.ok(!run.opponents.includes('bigfoot'));
  assert.ok(new ArcadeRewards(roster,disk).award({fighter:'bigfoot',difficulty,defeated:run.opponents,mode:'arcade',won:true}));assert.equal(new ArcadeRewards(roster,disk).get('bigfoot',difficulty).opponents,39);
 }
});

test('Bigfoot special animation, committed contact and sound cue reach online guests once',()=>{
 const host=match(),guest=match(),buffer=new SnapshotBuffer(host.ids);host.fighters[0].meter=100;step(host,{special:true});let serial=0,cues=0;
 for(let n=0;n<90;n++){
  step(host);const events=host.drainEvents().map(e=>({...e,serial:++serial})),packet=packSnapshot(host,n+1,events);
  assert.ok(buffer.receive(packet,n*STEP*1000));buffer.apply(guest,n*STEP*1000+50);assert.ok(Math.abs(guest.fighters[0].t-host.fighters[0].t)<1e-9);assert.equal(guest.fighters[1].hp,host.fighters[1].hp);
  cues+=buffer.drainEvents().filter(e=>e.type==='attackActive'&&e.fighter==='bigfoot').length;assert.equal(buffer.receive(packet,n*STEP*1000+1),false);
 }
 assert.equal(cues,1);
});

test('close chokeslams lift and drop the defender, allow a grab break, and cannot seize a downed or airborne target',()=>{
 for(const index of [0,1])for(const side of [-1,1]){
  const m=match(index,side),a=m.fighters[index],b=m.fighters[1-index];a.meter=100;const inputs=[{},{}];inputs[index]={special:true};step(m,...inputs);assert.equal(m.grapple.kind,'chokeslam');
  for(let n=0;n<16;n++)step(m);assert.ok(b.z>70);assert.equal(b.hp,100);
  for(let n=0;n<12;n++)step(m);assert.equal(m.grapple,null);assert.equal(b.z,0);assert.equal(b.state,'down');assert.equal(b.vx,0);
  const broken=match(index,side),fighter=broken.fighters[index];fighter.meter=100;step(broken,...inputs);inputs[index]={};inputs[1-index]={grapple:true};step(broken,...inputs);assert.equal(broken.grapple,null);
  for(let n=0;n<100;n++)step(broken);assert.equal(broken.fighters[1-index].hp,100);assert.ok(!broken.drainEvents().some(e=>e.type==='attackActive'&&e.index===index));
 }
 for(const state of ['down','rise','jump']){
  const m=match();m.fighters[0].meter=100;Object.assign(m.fighters[1],{state,z:state==='jump'?100:0,downTime:10,t:0});step(m,{special:true});assert.equal(m.grapple,null);
 }
});
