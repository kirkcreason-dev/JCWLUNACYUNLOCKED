// Deterministic engine stress, not a substitute for browser/device playtesting.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Match,STEP,emptyInput,LEFT,RIGHT} from '../dist/src/engine.js';
import {packSnapshot,validSnapshot} from '../dist/src/online-protocol.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const results=[];let totalSteps=0;
for(let id=0;id<roster.length;id++)for(const difficulty of ['easy','normal','hard']){
 let seed=1+id*31+['easy','normal','hard'].indexOf(difficulty),steps=0,eventCount=0;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const m=new Match(roster,id,(id+7)%roster.length,{mode:'cpu',difficulty,random:rng});
 while(m.phase!=='done'&&steps<36000){
  const [a,b]=m.fighters,v=emptyInput(),d=Math.abs(a.x-b.x);steps++;
  if(m.phase==='fight'){
   if(a.state==='down'||m.pin?.attacker===1){if(steps%5===0){v[steps%10===0?'light':'heavy']=true;}}
   else if(!m.pin&&!m.grapple){
    if(d>80)v[a.x<b.x?'right':'left']=true;
    if(steps%11===0){let key=a.meter>=100&&d<135?'special':b.state==='down'&&d<120?'grapple':d<100&&rng()<.2?'grapple':rng()<.58?'light':'heavy';if(d<180){v[key]=true;v.pressed={[key]:true};}}
    if(b.move&&rng()<.08)v.block=true;
   }
  }
  m.step([v,emptyInput()],STEP);eventCount+=m.drainEvents().length;
  for(const f of m.fighters){assert.ok([f.x,f.z,f.hp,f.meter,f.guard,f.t,f.vz,f.vx].every(Number.isFinite),`${id} ${difficulty}: nonfinite`);assert.ok(f.x>=LEFT&&f.x<=RIGHT&&f.hp>=0&&f.hp<=100&&f.meter<=100&&f.z>=0,`${id} ${difficulty}: bounds`);}
  if(steps%120===0)assert.ok(validSnapshot(packSnapshot(m,steps),m.ids),`${id} ${difficulty}: invalid network state`);
 }
 assert.equal(m.phase,'done',`${roster[id].name} ${difficulty}: stalled match`);assert.ok(m.wins.includes(2));totalSteps+=steps;
 results.push({fighter:roster[id].name,difficulty,rounds:m.round,winner:m.winner,seconds:Math.round(steps/60),events:eventCount});
}
await mkdir(new URL('../review/',import.meta.url),{recursive:true});await writeFile(new URL('../review/soak.json',import.meta.url),JSON.stringify({matches:results.length,totalSteps,results},null,2));
console.log(`PASS: ${results.length} completed matches across all 39 fighters and three difficulties; ${totalSteps} simulation steps; finite bounded state and valid network snapshots.`);
