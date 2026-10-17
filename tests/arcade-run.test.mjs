import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ArcadeRun} from '../dist/src/arcade-run.js';
import {ArcadeRewards} from '../dist/src/arcade-rewards.js';
import {Match} from '../dist/src/engine.js';
import {MatchRecord} from '../dist/src/match-record.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url)));
const storage=()=>{const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
function fight(bout){const m=new Match(roster,roster.findIndex(f=>f.id===bout.fighter),roster.findIndex(f=>f.id===bout.opponents[bout.index]),{mode:'arcade',difficulty:bout.difficulty});m.resultTicket=bout.ticket;return m;}

test('a full arcade run survives reloading between all roster opponents on every difficulty and awards the existing medals',()=>{
 for(const difficulty of ['easy','normal','hard']){
  const store=storage();let run=new ArcadeRun(roster,store,()=>.4),bout=run.start('evil-dead',difficulty,4);const order=[...bout.opponents];
  for(let n=0;n<roster.length-1;n++){
   assert.equal(bout.index,n);assert.deepEqual(bout.opponents,order);
   const m=fight(bout);m.phase='roundEnd';m.wins=[1,0];m.round=1;m.method='PINFALL';assert.ok(run.checkpoint(bout,m));
   run=new ArcadeRun(roster,store);bout=run.start('evil-dead',difficulty,0);run.restore(bout,m);assert.deepEqual(m.wins,[1,0]);assert.equal(m.round,2);assert.equal(m.phase,'intro');
   m.phase='roundEnd';m.wins=[2,0];m.method='KNOCKOUT';run.checkpoint(bout,m);
   // Simulate a tab killed after the winning fall, before the result overlay.
   run=new ArcadeRun(roster,store);bout=run.start('evil-dead',difficulty,0);const resumed=fight(bout);run.restore(bout,resumed);
   assert.equal(resumed.phase,'done');assert.equal(resumed.winner,0);assert.equal(resumed.method,'KNOCKOUT');
   const record=new MatchRecord(store);assert.ok(record.record(resumed));assert.equal(new MatchRecord(store).record(resumed),false);
   assert.equal(run.settle(bout,true).complete,n===roster.length-2);assert.equal(run.settle(bout,true),null);
   if(n<roster.length-2){run=new ArcadeRun(roster,store);bout=run.start('evil-dead',difficulty,0);assert.equal(bout.arena,4);}
  }
  assert.equal(new MatchRecord(store).load().wins,roster.length-1);
  assert.ok(new ArcadeRewards(roster,store).award({fighter:'evil-dead',difficulty,defeated:order,mode:'arcade',won:true}));
  assert.ok(new ArcadeRewards(roster,store).get('evil-dead',difficulty));
 }
});
test('losses retry the same opponent; manual start-over rejects old checkpoints and results',()=>{
 const runs=new ArcadeRun(roster,storage());let b=runs.start(roster[0].id,'normal',0);
 runs.settle(b,true);b=runs.start(roster[0].id,'normal',0);const index=b.index,enemy=b.opponents[index];runs.settle(b,false);
 const retry=runs.start(roster[0].id,'normal',0);assert.equal(retry.index,index);assert.equal(retry.opponents[index],enemy);assert.notEqual(retry.ticket,b.ticket);
 const fresh=runs.start(roster[0].id,'normal',3,{fresh:true});assert.equal(fresh.index,0);assert.notEqual(fresh.id,retry.id);assert.equal(runs.settle(retry,true),null);
 const m=fight(retry);m.phase='roundEnd';assert.equal(runs.checkpoint(retry,m),false);
});
test('fighter and difficulty saves are isolated and stable IDs tolerate reordering and an appended fighter',()=>{
 const store=storage(),oldRoster=roster.slice(0,-1),runs=new ArcadeRun(oldRoster,store);
 const a=runs.start(roster[0].id,'easy',0);runs.settle(a,true);runs.start(roster[0].id,'hard',2);runs.start(roster[1].id,'easy',3);
 const resumed=new ArcadeRun([...roster].reverse(),store).start(roster[0].id,'easy',5);
 assert.equal(resumed.index,1);assert.equal(resumed.opponents.at(-1),'evil-dead');assert.equal(resumed.opponents[0],a.opponents[0]);assert.equal(resumed.arena,0);
 assert.equal(runs.load(roster[0].id,'hard').index,0);assert.equal(runs.load(roster[1].id,'easy').index,0);
});
test('corrupt checkpoints are rejected; failed saving keeps session progress and warns accurately',()=>{
 const store=storage(),runs=new ArcadeRun(roster,store);const b=runs.start(roster[0].id,'normal',0);
 for(const mutation of [{index:-1},{opponents:['missing']},{checkpoint:{round:2,wins:[2,2],method:'X'}},{checkpoint:{round:NaN,wins:[1,0],method:'X'}}]){
  store.setItem(runs.key(b.fighter,b.difficulty),JSON.stringify({...b,...mutation}));assert.equal(new ArcadeRun(roster,store).load(b.fighter,b.difficulty),null);
 }
 store.setItem=()=>{throw new Error('Quota exceeded');};const limited=new ArcadeRun(roster,store);let local=limited.start(b.fighter,b.difficulty,0);assert.equal(limited.saved,false);limited.settle(local,true);assert.equal(limited.start(b.fighter,b.difficulty,0).index,1);
 const unavailable=new ArcadeRun(roster);local=unavailable.start(b.fighter,b.difficulty,0);unavailable.settle(local,true);assert.equal(unavailable.load(b.fighter,b.difficulty).index,1);assert.equal(unavailable.saved,false);
});
test('match totals count once for all supported match modes, including guest wins; never count falls or abandoned games',()=>{
 const store=storage(),stats=new MatchRecord(store);
 for(const mode of ['cpu','pole','arcade','championship','online']){
  const m=new Match(roster,0,1,{mode});m.resultTicket=mode;m.winner=1;m.wins=[0,2];m.phase='roundEnd';assert.equal(stats.record(m,1),false);
  m.phase='done';assert.equal(stats.record(m,1),true);assert.equal(new MatchRecord(store).record(m,1),false);
 }
 const m=new Match(roster,0,1,{mode:'cpu'});m.phase='done';m.winner=1;m.resultTicket='loss';assert.ok(stats.record(m,0));
 for(const mode of ['practice','local','pole-local']){m.options.mode=mode;m.resultTicket=mode;assert.equal(stats.record(m),false);}
 assert.equal(stats.load().wins,5);assert.equal(stats.load().losses,1);
});

test('failed saves for totals, arcade progress, medals and championship progress can be retried without changing counts',async()=>{
 const {Championship}=await import('../dist/src/championship.js');const store=storage(),write=store.setItem;let blocked=true;
 store.setItem=(k,v)=>{if(blocked)throw new Error('Storage temporarily unavailable');write(k,v);};
 const runs=new ArcadeRun(roster,store),rewards=new ArcadeRewards(roster,store),titles=new Championship(roster,store),stats=new MatchRecord(store);
 const bout=runs.start(roster[0].id,'normal',0);runs.settle(bout,true);
 rewards.award({fighter:roster[0].id,difficulty:'normal',defeated:roster.slice(1).map(f=>f.id),mode:'arcade',won:true});
 const title=titles.start(roster[0].id,'normal',0);titles.settle(title,true);
 const m=fight(bout);m.wins=[2,0];m.winner=0;m.phase='done';stats.record(m);
 for(const manager of [runs,rewards,titles,stats]){assert.equal(manager.saved,false);assert.equal(manager.flush(),false);}
 blocked=false;
 for(const manager of [runs,rewards,titles,stats]){assert.equal(manager.flush(),true);assert.equal(manager.flush(),true);}
 assert.equal(new ArcadeRun(roster,store).load(roster[0].id,'normal').index,1);
 assert.ok(new ArcadeRewards(roster,store).get(roster[0].id,'normal'));
 assert.equal(new Championship(roster,store).load(roster[0].id,'normal').stage,1);
 assert.equal(new MatchRecord(store).load().wins,1);assert.equal(new MatchRecord(store).record(m),false);
});
test('resume discovery accepts v0.22.0 saves without timestamps and excludes completed runs',()=>{
 const store=storage(),runs=new ArcadeRun(roster,store);const legacy=runs.start(roster[5].id,'hard',1);delete legacy.updatedAt;legacy.index=4;store.setItem(runs.key(legacy.fighter,legacy.difficulty),JSON.stringify(legacy));
 assert.equal(runs.latest().fighter,legacy.fighter);assert.equal(runs.latest().index,4);
 const newer=runs.start(roster[39].id,'easy',2);assert.equal(runs.latest().fighter,'evil-dead');
 newer.index=newer.opponents.length;runs.save(newer);assert.equal(runs.latest().fighter,legacy.fighter);
 legacy.index=legacy.opponents.length;runs.save(legacy);assert.equal(runs.latest(),null);
});
test('a duplicate result retries a failed write but never adds another game win',()=>{
 const store=storage(),write=store.setItem;store.setItem=()=>{throw new Error('Temporarily blocked');};
 const stats=new MatchRecord(store),m=new Match(roster,0,1,{mode:'cpu'});m.wins=[2,0];m.winner=0;m.phase='done';m.resultTicket='temporary-save';
 assert.equal(stats.record(m),true);assert.equal(stats.saved,false);store.setItem=write;
 assert.equal(stats.record(m),false);assert.equal(stats.saved,true);assert.equal(new MatchRecord(store).load().wins,1);
});
