// Exercise the shipped main controller in Node with a minimal DOM and injected
// device adapters. These are lifecycle regressions, not browser/device tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {Match,STEP,emptyInput,isPoleMode,isLocalMode} from '../dist/src/engine.js';
import {ArcadeRun,resultTicket} from '../dist/src/arcade-run.js';
import {ArcadeRewards,ARCADE_REWARDS} from '../dist/src/arcade-rewards.js';
import {MatchRecord} from '../dist/src/match-record.js';
import {Championship,STAGES,championshipLabel,championshipArena} from '../dist/src/championship.js';
import {FramePacer} from '../dist/src/frame-pacer.js';
import {RenderBudget} from '../dist/src/render-budget.js';
import {retainMatchArtwork} from '../dist/src/artwork-cache.js';
import {fighterAtlas,fighterPortrait} from '../dist/src/fighter-artwork.js';
import {phoneLayout,canvasSize,resizeCanvas} from '../dist/src/phone-layout.js';
import {ARENAS} from '../dist/src/arenas.js';
import {RosterSelection} from '../dist/src/roster-selection.js';
import {SecretFighters} from '../dist/src/secret-fighters.js';
import {fighterProfile} from '../dist/src/fighter-profile.js';
import {Coach} from '../dist/src/coach.js';
import {Renderer as ActualRenderer} from '../dist/src/render.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url)));
const main=(await readFile(new URL('../dist/src/main.js',import.meta.url),'utf8')).replace(/^import .+;\n/gm,'').replace(/\ninit\(\);\s*$/,'');
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
async function controller(storage=store()){
 const nodes=new Map(),frames=[],loads=[],pending=[];let defer=false,fail=false,draws=0,resets=0,drawFailure=false;
 function element(){const classes=new Set(),attrs=new Map();return {hidden:false,parentElement:{hidden:false},children:[],dataset:{},textContent:'',value:'',style:{setProperty(){},removeProperty(){}},classList:{add(...c){c.forEach(x=>classes.add(x));},remove(...c){c.forEach(x=>classes.delete(x));},contains:c=>classes.has(c),toggle(c,on){on??=!classes.has(c);on?classes.add(c):classes.delete(c);}},addEventListener(){},setAttribute:(k,v)=>attrs.set(k,v),getAttribute:k=>attrs.get(k),removeAttribute:k=>attrs.delete(k),append(...e){this.children.push(...e);},replaceChildren(...e){this.children=e;},querySelector(){return element();},querySelectorAll(){return [];},cloneNode(){return element();},getBoundingClientRect(){return {width:1280};},focus(){},blur(){}};}
 for(const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){const e=element();e.hidden=/\bhidden\b/.test(tag[0]);nodes.set(tag[1],e);}
 const get=id=>{assert.ok(nodes.has(id),`Unknown DOM id ${id}`);return nodes.get(id);};
 for(const [id,v] of [['mode','arcade'],['difficulty','normal'],['arena','0'],['opponent','1']])get(id).value=v;
 get('selection').hidden=false;get('opening').hidden=true;
 const document={hidden:false,activeElement:element(),body:element(),getElementById:get,querySelector:()=>element(),querySelectorAll:()=>[],createElement:element,addEventListener(){}};
 class Sound{constructor(){this.music={};}stopEffects(){}suspend(){}resume(){}setMix(){}setTrack(){}play(){}celebrate(){}updateMovement(){}}
 class Input{constructor(){this.scheme='keyboard';}clear(){}clearTouch(){}read(){return [emptyInput(),emptyInput()];}setMode(){}}
 class Haptics{activate(){}stop(){}pulse(){return false;}}
 class OnlineSession{leave(){this.active=false;return Promise.resolve();}capture(){}sendInput(){}}
 class Renderer{constructor(canvas,rs,atlases,arenas,banners,fx,options){this.canvas=canvas;this.options=options;this.contextLost=false;}reset(){}resetSurface(){resets++;}receive(){}draw(){draws++;if(drawFailure)throw new Error('Injected draw failure');}}
 const context=vm.createContext({console:{error(){}},document,localStorage:storage,performance:{now:()=>0},Date,Math,Error,Map,Set,Promise,JSON,Number,Boolean,Array,Object,String,globalThis:undefined,
  matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},getComputedStyle:()=>({getPropertyValue:()=>0}),innerWidth:1280,innerHeight:720,devicePixelRatio:1,requestAnimationFrame:fn=>frames.push(fn),setTimeout,clearTimeout,
  Haptics,Input,Sound,OnlineSession,Renderer,Match,STEP,emptyInput,isPoleMode,isLocalMode,ArcadeRun,resultTicket,ArcadeRewards,ARCADE_REWARDS,MatchRecord,Championship,STAGES,championshipLabel,championshipArena,FramePacer,RenderBudget,ARENAS,RosterSelection,SecretFighters,fighterProfile,Coach,
  fetch:async()=>({ok:true,json:async()=>roster}),loadOptionalArtwork:async()=>[],
  retainMatchArtwork,fighterAtlas,fighterPortrait,phoneLayout,canvasSize,resizeCanvas,connectFirebase(){},fullscreenElement:()=>null,
  loadGameImage:url=>{loads.push(url);if(defer)return new Promise((resolve,reject)=>pending.push({resolve:()=>resolve({src:url}),reject}));return fail?Promise.reject(new Error('Image unavailable')):Promise.resolve({src:url});},
  rosterInput:roster,campaignStorage:storage
 });context.globalThis=context;
 vm.runInContext(main+`\nroster=rosterInput;arcadeRuns=new ArcadeRun(roster,campaignStorage);arcadeRewards=new ArcadeRewards(roster,campaignStorage);championships=new Championship(roster,campaignStorage);matchRecord=new MatchRecord(campaignStorage);renderer=new Renderer($('game'),roster,atlases,arenas,{},{});\n globalThis.hooks={init,refreshSavedArcade,flushProgress,startMatch,finishMatch,matchEvents,quit,loop,recoverRuntime,graphicsRestored,get match(){return match;},get renderer(){return renderer;},get fault(){return runtimeFault;},get paused(){return paused;},get loading(){return loading;},get runs(){return arcadeRuns;},get record(){return matchRecord;},get arena(){return arena;},get atlases(){return atlases;},get arenas(){return arenas;}};`,context);
 return {h:context.hooks,get,storage,document,frames,loads,pending,setDeferred:v=>defer=v,setFail:v=>fail=v,setDrawFailure:v=>drawFailure=v,get draws(){return draws;},get resets(){return resets;}};
}
function win(c){const m=c.h.match;m.phase='roundEnd';m.wins=[2,0];m.method='PINFALL';c.h.matchEvents([{type:'roundEnd',winner:0,method:'PINFALL'}]);m.phase='done';m.winner=0;c.h.finishMatch();}

test('actual arcade buttons continue saved opponents after reload and count once without touching medals',async()=>{
 let c=await controller();await c.h.startMatch();win(c);assert.equal(c.h.record.load().wins,1);c.h.finishMatch();assert.equal(c.h.record.load().wins,1);
 const oldEnemy=c.h.match.ids[1],storage=c.storage;c=await controller(storage);await c.h.startMatch();assert.equal(c.h.match.options.arcadeIndex,1);assert.notEqual(c.h.match.ids[1],oldEnemy);
 assert.match(c.get('arcade-progress').textContent,/1 \/ 39/);assert.match(c.get('fight').textContent,/CONTINUE/);
});
test('match transitions freeze simulation and drawing while old atlases are released; failed loads retry the same opponent',async()=>{
 const c=await controller();await c.h.startMatch();win(c);const old=c.h.match;c.setDeferred(true);c.get('rematch').onclick(); // Event starts the async load.
 assert.equal(c.h.loading,true);assert.equal(c.get('match-loading').hidden,false);assert.equal(c.get('result').inert,true);
 c.h.loop(1000);assert.equal(c.draws,0);assert.equal(old.phase,'done');assert.equal(c.frames.length,1);
 for(const request of c.pending.splice(0))request.reject(new Error('Disconnected'));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(c.h.loading,false);assert.ok(c.h.fault);assert.equal(c.get('pause').hidden,false);assert.equal(c.get('pause').inert,false,'retry controls must receive input');assert.equal(c.get('result').hidden,true,'old result must not cover retry controls');assert.equal(c.h.runs.load(roster[0].id,'normal').index,1);
 c.setDeferred(false);c.setFail(true);await c.h.startMatch();assert.ok(c.h.fault);assert.equal(c.get('pause').hidden,false,'a second failed retry keeps recovery controls visible');
 c.setFail(false);await c.h.startMatch();assert.equal(c.h.match.options.arcadeIndex,1);assert.equal(c.h.fault,null);assert.ok(c.resets>0);
 assert.equal(Object.keys(c.h.atlases).length,2);assert.equal(Object.keys(c.h.arenas).length,1);
});
test('restoring a graphics context preserves the current offline match and offers Resume',async()=>{
 const c=await controller();await c.h.startMatch();const m=c.h.match;m.phase='fight';m.fighters[0].hp=41;m.remaining=57;m.wins=[1,0];
 c.h.renderer.contextLost=true;c.h.recoverRuntime(new Error('Context lost'),true);c.h.loop(500);assert.equal(c.draws,0);
 c.h.renderer.contextLost=false;c.h.graphicsRestored();assert.equal(c.h.fault,null);assert.equal(c.h.paused,true);assert.equal(c.get('resume').hidden,false);assert.equal(c.h.match,m);assert.equal(m.fighters[0].hp,41);assert.equal(m.remaining,57);
 c.get('resume').onclick();assert.equal(c.h.paused,false);c.h.loop(516);assert.equal(c.draws,1);
});
test('the animation loop survives a draw error and resets the canvas before retrying',async()=>{
 const c=await controller();await c.h.startMatch();c.setDrawFailure(true);c.get('pause-detail').style=null;
 c.h.loop(16);assert.ok(c.h.fault);assert.equal(c.frames.length,1);
 c.setDrawFailure(false);await c.h.startMatch();assert.equal(c.h.fault,null);c.h.loop(32);assert.equal(c.frames.length,2);
});
test('hidden pages never advance a match and cancelling pending loading cannot resurrect it',async()=>{
 const c=await controller();await c.h.startMatch();const m=c.h.match;m.phase='fight';c.document.hidden=true;c.h.loop(10000);assert.equal(m.remaining,99);assert.equal(c.draws,0);
 c.document.hidden=false;win(c);c.setDeferred(true);c.get('rematch').onclick();assert.ok(c.pending.length);c.get('cancel-loading').onclick();
 for(const request of c.pending.splice(0))request.resolve();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(c.h.match,null);assert.equal(c.get('selection').hidden,false);assert.equal(c.h.loading,false);assert.equal(c.get('match-loading').hidden,true);
 assert.equal(Object.keys(c.h.atlases).length,0);
});
test('the real renderer notifies restoration and resets an interrupted canvas save stack only on recovery',()=>{
 const events={},ctx={};let resets=0,restored=0,lost=0;
 const canvas={getContext:()=>ctx,addEventListener:(key,fn)=>events[key]=fn,get width(){return 1280;},set width(v){assert.equal(v,1280);resets++;}};
 const r=new ActualRenderer(canvas,roster,{},[],{},{},{onContextLost:()=>lost++,onContextRestored:()=>restored++});
 events.contextlost({preventDefault(){}});assert.equal(lost,1);assert.equal(r.contextLost,true);assert.equal(r.draw(null),false);
 events.contextrestored();assert.equal(restored,1);assert.equal(r.contextLost,false);assert.equal(resets,0);
 r.shade={};r.resetSurface();assert.equal(resets,1);assert.equal(r.shade,null);
});


test('boot exposes a saved non-default fighter run and the resume button restores its setup',async()=>{
 const storage=store(),runs=new ArcadeRun(roster,storage);let bout=runs.start('evil-dead','hard',4);runs.settle(bout,true);bout=runs.start('evil-dead','hard',4);
 const m=new Match(roster,39,0,{mode:'arcade'});m.phase='roundEnd';m.wins=[1,1];m.round=2;m.method='PINFALL';runs.checkpoint(bout,m);
 new SecretFighters(roster,storage).unlock('ruffo'); // Evil Dead is a secret fighter: the belt must have been won.
 const c=await controller(storage);c.get('mode').value='cpu';await c.h.init();
 assert.equal(c.get('resume-arcade').hidden,false);assert.match(c.get('resume-arcade').textContent,/EVIL DEAD.*HARD.*1\/39/);
 await c.get('resume-arcade').onclick();assert.equal(c.h.match.ids[0],39);assert.equal(c.h.match.options.difficulty,'hard');assert.equal(c.h.match.options.arcadeIndex,1);assert.equal(c.h.arena,5);assert.equal(c.h.match.round,3);assert.deepEqual([...c.h.match.wins],[1,1]);
});
test('boot keeps the continue label for the default fighter and difficulty',async()=>{
 const c=await controller();c.h.runs.start(roster[1].id,'normal',0);await c.h.init(); // roster[0] (Violent J) is a locked secret fighter; 2 Tuff Tony is the default pickassert.equal(c.get('fight').textContent,'CONTINUE ARCADE RUN');
});
test('graphics recovery on a completed match reopens results without recounting its win',async()=>{
 const c=await controller();await c.h.startMatch();win(c);c.h.renderer.contextLost=true;c.h.recoverRuntime(new Error('GPU reset'),true);
 assert.equal(c.get('pause').inert,false);assert.equal(c.get('result').hidden,true);
 c.h.renderer.contextLost=false;c.h.graphicsRestored();assert.equal(c.get('result').hidden,false);assert.equal(c.get('pause').hidden,true);assert.equal(c.h.record.load().wins,1);
});
test('leaving a match retries a previously failed win save before returning to selection',async()=>{
 const storage=store(),setItem=storage.setItem;let blocked=true;
 storage.setItem=(k,v)=>{if(blocked&&k==='lunacy-match-record-v1')throw new Error('Temporary storage failure');setItem(k,v);};
 const c=await controller(storage);await c.h.startMatch();win(c);assert.equal(c.h.record.saved,false);assert.equal(new MatchRecord(storage).load().wins,0);
 blocked=false;c.h.quit();assert.equal(new MatchRecord(storage).load().wins,1);assert.match(c.get('record-save').textContent,/saved on this browser/);
});
test('a saved arcade run for a locked secret fighter is not offered until the belt is won',async()=>{
 const storage=store(),runs=new ArcadeRun(roster,storage);runs.start('evil-dead','hard',4);
 const c=await controller(storage);await c.h.init();assert.equal(c.get('resume-arcade').hidden,true);
});
