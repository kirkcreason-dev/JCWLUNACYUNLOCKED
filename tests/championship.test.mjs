import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Championship,championshipLabel,championshipArena} from '../dist/src/championship.js';
import {Match} from '../dist/src/engine.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url)));
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const make=(s=storage())=>new Championship(roster,s,()=>.31);
function crown(c,id=roster[0].id){let result;for(let i=0;i<5;i++){const bout=c.start(id,'normal',0);assert.equal(bout.stage,i);result=c.settle(bout,true);}return result;}
test('every fighter gets five unique opponents excluding themselves, with valid rotating arenas',()=>{
 for(const f of roster){const c=make(),r=c.start(f.id,'normal',4);assert.equal(new Set(r.path).size,5);assert.ok(!r.path.includes(f.id));assert.equal(r.opponent,r.path[0]);assert.equal(championshipArena(r),4);assert.match(championshipLabel(r),/1\/5/);}
});
test('five wins award one title; defense wins rotate challengers and retain the best streak',()=>{
 const c=make(),result=crown(c);assert.equal(result.outcome,'crowned');assert.equal(result.run.titles,1);assert.equal(result.run.phase,'defend');
 let last=result.run.path[4];for(let i=0;i<3;i++){const bout=c.start(roster[0].id,'normal',5);assert.notEqual(bout.opponent,last);assert.match(championshipLabel(bout),new RegExp(`DEFENSE ${i+1}`));last=bout.opponent;const r=c.settle(bout,true);assert.equal(r.outcome,'defended');assert.equal(r.run.defenses,i+1);assert.equal(r.run.best,i+1);assert.equal(r.run.titles,1);}
});
test('road losses retry the same opponent, while losing the belt starts a new chase retaining records',()=>{
 const c=make(),first=c.start(roster[0].id,'normal',2);c.settle(first,false);const retry=c.start(first.fighter,'normal',4);assert.equal(retry.opponent,first.opponent);assert.equal(retry.arena,2);
 c.settle(retry,true);for(let i=1;i<5;i++)c.settle(c.start(first.fighter,'normal',0),true);
 c.settle(c.start(first.fighter,'normal',0),true);const lost=c.settle(c.start(first.fighter,'normal',0),false);assert.equal(lost.outcome,'dethroned');
 const next=c.start(first.fighter,'normal',3);assert.equal(next.stage,0);assert.equal(next.titles,1);assert.equal(next.best,1);assert.equal(next.defenses,0);assert.equal(next.arena,3);
});
test('reload resumes the current opponent and difficulty/fighter saves remain independent',()=>{
 const s=storage(),c=make(s),id=roster[0].id;const first=c.start(id,'normal',1);c.settle(first,true);const ongoing=c.start(id,'normal',5);
 const reloaded=make(s),resumed=reloaded.start(id,'normal',0);assert.equal(resumed.stage,1);assert.equal(resumed.opponent,ongoing.opponent);assert.equal(resumed.arena,1);
 assert.equal(reloaded.start(id,'hard',0).stage,0);assert.equal(reloaded.start(roster[1].id,'normal',0).stage,0);assert.equal(reloaded.load(id,'normal').stage,1);
});
test('replayed results and stale results from another tab cannot award progress twice',()=>{
 const s=storage(),a=make(s),b=make(s),old=a.start(roster[0].id,'normal',0),current=b.start(old.fighter,'normal',0);
 assert.equal(a.settle(old,true),null);assert.equal(b.settle(current,true).run.stage,1);assert.equal(b.settle(current,true),null);assert.equal(a.load(old.fighter,'normal').stage,1);
});
test('corrupt and obsolete saves start cleanly, including invalid paths and removed fighters',()=>{
 const s=storage(),c=make(s),id=roster[0].id;
 for(const bad of ['{broken',JSON.stringify({version:1}),JSON.stringify({...c.create(id,'normal',0),path:Array(5).fill(roster[1].id)}),JSON.stringify({...c.create(id,'normal',0),opponent:'removed-fighter'})]){s.setItem(c.key(id,'normal'),bad);assert.equal(c.load(id,'normal'),null);assert.equal(c.start(id,'normal',0).stage,0);}
});
test('blocked writes retain session progress even when an older save can still be read',()=>{
 const s=storage(),c=make(s),id=roster[0].id,bout=c.start(id,'normal',0);s.setItem=()=>{throw Error('quota');};
 c.settle(bout,true);assert.equal(c.saved,false);assert.equal(c.start(id,'normal',0).stage,1);
 const noStorage=make(null);crown(noStorage);assert.equal(noStorage.load(id,'normal').titles,1);assert.equal(noStorage.saved,false);
});
test('championship uses real best-of-three CPU combat and a loss keeps the current rung',()=>{
 const c=make(),bout=c.start(roster[0].id,'easy',0),opponent=roster.findIndex(f=>f.id===bout.opponent);let seed=182;
 const m=new Match(roster,0,opponent,{mode:'championship',difficulty:'easy',random:()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296)});
 for(let i=0;i<60*240&&m.phase!=='done';i++)m.step();assert.equal(m.phase,'done');assert.equal(m.winner,1);assert.equal(m.wins[1],2);
 assert.equal(c.settle(bout,m.winner===0).run.stage,0);
});
