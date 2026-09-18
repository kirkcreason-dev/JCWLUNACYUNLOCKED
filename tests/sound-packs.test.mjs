import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SampleBank,SAMPLE_GROUPS,SAMPLE_FILES} from '../dist/src/sample-bank.js';
import {Sound} from '../dist/src/audio.js';
import {impactGroup} from '../dist/src/sound-events.js';
import {Match,MOVES,emptyInput} from '../dist/src/engine.js';
import {attackPose} from '../dist/src/attack-animation.js';
import {packSnapshot,SnapshotBuffer} from '../dist/src/online-protocol.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url)));
const dj=roster.findIndex(f=>f.id==='dj-clay');
const make=(p1=dj,p2=0)=>{const m=new Match(roster,p1,p2,{mode:'local'});m.phase='fight';m.fighters[0].x=500;m.fighters[1].x=595;m.drainEvents();return m;};
const step=(m,a={},b={})=>m.step([{...emptyInput(),...a},{...emptyInput(),...b}]);
function context(){
 const nodes=[],starts=[],param=()=>({value:0,events:[],setValueAtTime(...v){this.events.push(['set',...v]);},linearRampToValueAtTime(...v){this.events.push(['linear',...v]);},exponentialRampToValueAtTime(...v){this.events.push(['exp',...v]);}});
 const node=kind=>{const n={kind,frequency:param(),Q:param(),gain:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(target){this.target=target;},disconnect(){this.disconnected=true;},start(...args){starts.push({node:this,args});},stop(){this.stopped=true;}};nodes.push(n);return n;};
 return {nodes,starts,state:'running',currentTime:10,sampleRate:44100,destination:{},createBufferSource:()=>node('sample'),createGain:()=>node('gain'),createBiquadFilter:()=>node('filter'),createOscillator:()=>node('tone'),createDynamicsCompressor:()=>node('limiter'),createBuffer:(_,n)=>({duration:n/44100,getChannelData:()=>new Float32Array(n)}),suspend(){this.state='suspended';return Promise.resolve();},resume(){this.state='running';return Promise.resolve();}};
}
function sound(){
 const bank=new SampleBank({random:()=>0});for(const [group,files] of Object.entries(SAMPLE_GROUPS))for(const path of files)bank.buffers.set(path,{duration:group==='dj_charge'?.48:group==='dj_blast'?1.1:.2,length:8820,numberOfChannels:1,path});
 const s=new Sound({play:()=>Promise.resolve(),pause(){},canPlayType:()=>''},{bank});s.enabled=true;s.context=context();return s;
}
const played=s=>s.context.starts.filter(x=>x.node.buffer?.path).map(x=>x.node.buffer.path);
const flush=s=>{for(const v of [...s.voices])v.dispose();};
test('all 53 supplied WAVs retain original bytes and runtime uses 49 short mono PCM sounds',async()=>{
 const audit=JSON.parse(await readFile(new URL('../tools/sound-pack-audit.json',import.meta.url)));assert.equal(audit.files.length,53);assert.equal(SAMPLE_FILES.length,49);
 for(const row of audit.files){const data=await readFile(new URL('../'+row.file,import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),row.sha256);assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');assert.equal(row.channels,1);assert.equal(row.hz,44100);assert.ok(row.peak<=.841&&row.rms>0);}
 for(const path of SAMPLE_FILES){assert.ok(!path.includes('PREVIEW')&&!path.includes('04_full'));assert.ok(audit.files.some(row=>`./${row.file.replace('dist/','')}`===path));}
});
test('sample loading is deduplicated, uses at most three requests, and respects decoded memory budget',async()=>{
 let active=0,peak=0,requests=0;const bank=new SampleBank({fetcher:async()=>{requests++;active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,1));active--;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(16)};}});
 const ctx={decodeAudioData:async()=>({length:100,numberOfChannels:1,duration:.1})};await Promise.all([bank.load(ctx),bank.load(ctx)]);assert.equal(requests,49);assert.equal(peak,3);assert.equal(bank.bytes,49*400);await bank.load(ctx);assert.equal(requests,49);
 const bounded=new SampleBank({maxBytes:800,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})});await bounded.load(ctx);assert.equal(bounded.bytes,800);assert.equal(bounded.buffers.size,2);
});
test('missing/corrupt audio backs off, timeouts do not hang startup, and context replacement rejects stale results',async()=>{
 let now=0,calls=0;const bank=new SampleBank({clock:()=>now,fetcher:async()=>{calls++;throw Error('offline');}}),ctx={decodeAudioData:async()=>({length:100,numberOfChannels:1,duration:.1})};
 await bank.load(ctx);assert.equal(calls,49);await bank.load(ctx);assert.equal(calls,49);now=30001;await bank.load(ctx);assert.equal(calls,98);
 const timeout=new SampleBank({timeout:2,fetcher:()=>new Promise(()=>{})});await timeout.load(ctx);assert.equal(timeout.buffers.size,0);assert.equal(timeout.controllers.size,0);
 const corrupt=new SampleBank({fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})});await corrupt.load({decodeAudioData:async()=>{throw Error('bad WAV');}});assert.equal(corrupt.buffers.size,0);
 let resolve;const stale=new SampleBank({timeout:100,fetcher:()=>new Promise(r=>{resolve=r;})});stale.reset(ctx);const old=stale.loadOne(SAMPLE_FILES[0],ctx,stale.generation);stale.reset({});resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});await old;assert.equal(stale.buffers.size,0);assert.equal(stale.bytes,0);
});
test('loaded variants alternate without immediate repetition and loading never replays a missed sound',async()=>{
 const s=sound();s.sample('punch_hit');s.sample('punch_hit');assert.notEqual(played(s)[0],played(s)[1]);s.stopEffects();s.bank.buffers.clear();assert.equal(s.sample('chair_hit'),false);const n=s.context.starts.length;
 s.bank.buffers.set(SAMPLE_GROUPS.chair_hit[0],{duration:.2,path:SAMPLE_GROUPS.chair_hit[0]});await Promise.resolve();assert.equal(s.context.starts.length,n);
});
test('contact style selects bare fists, kicks and each weapon independently of later equipment changes',()=>{
 for(const [style,group] of Object.entries({light:'punch_hit',kick:'kick_hit',chair:'chair_hit',bat:'bat_hit',guitar:'guitar_smash',trashcan:'trashcan_hit',bottle:'bat_hit'})){
  assert.equal(impactGroup({move:'heavy',style}),group);const s=sound();s.play([{type:'hit',index:1,attacker:0,move:'heavy',style}]);assert.ok(played(s)[0].includes(group));assert.equal(played(s).filter(p=>!p.includes('oof')).length,1);
 }
 assert.equal(impactGroup({move:'light',style:'chair'}),'punch_hit');assert.equal(impactGroup({move:'special',fighter:'dj-clay'}),null);
 const s=sound();s.play([{type:'block',index:1,move:'heavy',style:'chair'}]);assert.ok(!played(s).some(p=>p.includes('chair_hit')));
});
test('impact events retain committed weapon style after a guitar breaks',()=>{
 const m=make(0,1),a=m.fighters[0];a.weapon='guitar';a.weaponUses=1;m.startAttack(a,'heavy',0);for(let i=0;i<40&&m.fighters[1].hp===100;i++)step(m);
 const hit=m.drainEvents().find(e=>e.type==='hit');assert.equal(a.weapon,'none');assert.equal(hit.style,'guitar');assert.equal(impactGroup(hit,m),'guitar_smash');
});
test('DJ bass fires once on the active animation frame for a hit, a block or a miss',()=>{
 for(const mode of ['hit','block','miss']){
  const m=make();if(mode==='miss')m.fighters[1].x=950;if(mode==='block')for(let i=0;i<15;i++)step(m,{}, {block:true});m.drainEvents();m.fighters[0].meter=100;step(m,{special:true},mode==='block'?{block:true}:{});
  const events=[...m.drainEvents()];assert.equal(events.filter(e=>e.type==='attackActive').length,0);let frame;
  for(let i=0;i<80;i++){step(m,{},mode==='block'?{block:true}:{});const batch=m.drainEvents();if(batch.some(e=>e.type==='attackActive'))frame=attackPose(roster[dj],'special',m.fighters[0].t,'kick').frame;events.push(...batch);}
  const cue=events.filter(e=>e.type==='attackActive'&&e.fighter==='dj-clay');assert.equal(cue.length,1);assert.ok(roster[dj].animations.special.slice(3,5).includes(frame));
  const s=sound();s.play(events,m);assert.equal(played(s).filter(p=>p.includes('03_bass_blast')).length,1);assert.ok(!played(s).some(p=>p.includes('04_full')));
 }
});
test('DJ charge is trimmed to combat startup and cancelled by interruption or pause, with no delayed blast',()=>{
 const m=make(),s=sound();m.fighters[0].meter=100;step(m,{special:true});s.play(m.drainEvents(),m);
 const charging=s.context.starts.find(x=>x.node.buffer?.path?.includes('02_speaker_charge'));assert.ok(charging);assert.ok(Math.abs(charging.args[0]+charging.args[2]-(10+MOVES.special.startup))<1e-8);assert.ok(charging.args[1]>0);
 step(m,{}, {light:true});for(let i=0;i<70;i++){step(m);s.play(m.drainEvents(),m);}assert.equal(played(s).filter(p=>p.includes('03_bass_blast')).length,0);assert.ok(charging.node.disconnected);
 s.djCharge(0);s.suspend();assert.equal(s.voices.size,0);assert.ok(s.context.nodes.every(n=>n.disconnected));
});
test('a DJ super dive and another fighter finisher do not fire the speaker attack',()=>{
 const s=sound();s.play([{type:'special',index:0,fighter:'dj-clay',kind:'dive'},{type:'special',index:1,fighter:'violent-j',kind:'strike'},{type:'attackActive',index:1,fighter:'violent-j',move:'special'}]);assert.equal(played(s).length,0);
});
test('DJ charge and firing cues reach the online guest once with the same event metadata',()=>{
 const m=make(),buffer=new SnapshotBuffer(m.ids);m.fighters[0].meter=100;step(m,{special:true});const initial=m.drainEvents();let events=[];for(let n=0;n<14;n++){step(m);events.push(...m.drainEvents());}
 const all=[...initial,...events].map((e,i)=>({...e,serial:i+1})),packet=packSnapshot(m,1,all);assert.equal(buffer.receive(packet,0),true);assert.equal(buffer.drainEvents().filter(e=>e.type==='attackActive'&&e.fighter==='dj-clay').length,1);assert.equal(buffer.receive(packet,20),false);assert.deepEqual(buffer.drainEvents(),[]);
});
test('samples share the 24-voice cap, release all nodes, and respect effects mute and suspended devices',()=>{
 const s=sound();for(let n=0;n<100;n++)s.sample('body_slam_ring');assert.equal(s.voices.size,24);s.stopEffects();assert.equal(s.voices.size,0);assert.ok(s.context.nodes.every(n=>n.disconnected));
 s.sample('ring_bell');s.setMix(.4,0);assert.equal(s.voices.size,0);assert.equal(s.music.volume,.4);assert.equal(s.sample('punch_hit'),false);s.setMix(.4,.7);s.context.state='suspended';assert.equal(s.sample('punch_hit'),false);
});
test('footsteps require actual grounded movement and never accumulate a burst at walls or after a pause',()=>{
 const s=sound(),m=make();m.fighters[0].state='walk';s.updateMovement(m);for(let i=0;i<8;i++){m.fighters[0].x+=12;s.context.currentTime+=.04;s.updateMovement(m);}assert.equal(played(s).filter(p=>p.includes('footstep')).length,1);
 for(let i=0;i<100;i++){s.context.currentTime+=.02;s.updateMovement(m);}assert.equal(played(s).filter(p=>p.includes('footstep')).length,1);
 m.fighters[0].z=80;m.fighters[0].x+=90;s.updateMovement(m);s.updateMovement(m,true);m.fighters[0].z=0;m.fighters[0].x+=200;s.updateMovement(m);assert.equal(played(s).filter(p=>p.includes('footstep')).length,1);
});
test('missing samples retain immediate procedural contact and bass effects without awaiting a fetch',()=>{
 const s=sound();s.bank.buffers.clear();s.play([{type:'hit',move:'heavy',index:1},{type:'attackActive',index:0,move:'special',fighter:'dj-clay'}]);assert.ok(s.context.starts.some(x=>x.node.kind==='tone'));assert.equal(played(s).length,0);
});
