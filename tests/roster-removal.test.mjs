import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {ArcadeRun} from '../dist/src/arcade-run.js';
import {ArcadeRewards} from '../dist/src/arcade-rewards.js';
import {Championship} from '../dist/src/championship.js';
const roster=JSON.parse(readFileSync(new URL('../dist/assets/roster.json',import.meta.url)));
const old=roster.map(f=>f.id==='bigfoot'?{...f,id:'yabo',name:'Yabo'}:f);
const store=()=>{const data=new Map();return {data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};

test('exactly 40 fighters remain, Bigfoot occupies the removed slot and no Yabo runtime art remains',()=>{
 assert.equal(roster.length,40);assert.equal(new Set(roster.map(f=>f.id)).size,40);assert.equal(roster[8].id,'bigfoot');assert.ok(!roster.some(f=>/yabo/i.test(f.id+' '+f.name)));
 for(const name of ['yabo.png','yabo-portrait.png'])assert.equal(existsSync(new URL('../dist/assets/'+name,import.meta.url)),false);
});

test('arcade removal preserves the active opponent/falls unless it was Yabo and adds Bigfoot without granting a false win',()=>{
 for(const placement of ['past','current','future']){
  const disk=store(),legacy=new ArcadeRun(old,disk),run=legacy.start('violent-j','normal',4);run.opponents=old.slice(1).map(f=>f.id);const position=run.opponents.indexOf('yabo');run.index=position+({past:1,current:0,future:-1}[placement]);run.checkpoint={round:2,wins:[1,0],method:'PINFALL'};legacy.save(run);
  const previousOpponent=run.opponents[run.index],current=new ArcadeRun(roster,disk),loaded=current.load(run.fighter,run.difficulty);
  assert.equal(loaded.opponents.length,39);assert.ok(!loaded.opponents.includes('yabo'));assert.equal(loaded.opponents.at(-1),'bigfoot');assert.equal(loaded.index,run.index-(placement==='past'?1:0));
  if(placement==='current'){assert.equal(loaded.ticket,null);assert.equal(loaded.checkpoint,null);assert.equal(current.settle(run,true),null);}
  else{assert.equal(loaded.opponents[loaded.index],previousOpponent);assert.deepEqual(loaded.checkpoint,run.checkpoint);assert.equal(loaded.ticket,run.ticket);}
  const resumed=current.start(run.fighter,run.difficulty,0);assert.equal(resumed.arena,4);assert.ok(resumed.ticket);assert.deepEqual(new ArcadeRun(roster,disk).load(run.fighter,run.difficulty),resumed);
 }
});

test('completed old arcade runs and earned medals stay completed; new runs exclude Yabo',()=>{
 const disk=store(),legacy=new ArcadeRun(old,disk),run=legacy.start('violent-j','hard',0);run.index=run.opponents.length;run.ticket=null;legacy.save(run);
 new ArcadeRewards(old,disk).award({fighter:run.fighter,difficulty:'hard',defeated:run.opponents,mode:'arcade',won:true});
 const current=new ArcadeRun(roster,disk),loaded=current.load(run.fighter,'hard');assert.equal(loaded.index,loaded.opponents.length);assert.equal(current.latest(),null);
 assert.equal(new ArcadeRewards(roster,disk).get(run.fighter,'hard').opponents,39);
 const fresh=current.start(run.fighter,'hard',0);assert.equal(fresh.index,0);assert.ok(fresh.opponents.includes('bigfoot'));assert.ok(!fresh.opponents.includes('yabo'));
 const removed=legacy.start('yabo','normal',0);assert.equal(current.load(removed.fighter,removed.difficulty),null);
});

test('championship removes upcoming Yabo bouts while retaining completed stages, titles and defenses',()=>{
 for(const stage of [0,1,2,5]){
  const disk=store(),legacy=new Championship(old,disk),run=legacy.create('violent-j','normal',2);run.path=['2-tuff-tony','yabo','willie-mack','cokane','evil-dead'];run.stage=stage;run.phase=stage===5?'defend':'road';run.opponent=stage===5?'yabo':run.path[stage];run.titles=2;run.defenses=3;run.best=4;run.ticket='old-bout';legacy.save(run);
  const current=new Championship(roster,disk),loaded=current.load(run.fighter,run.difficulty);
  assert.equal(loaded.stage,stage);assert.equal(loaded.titles,2);assert.equal(loaded.defenses,3);assert.equal(loaded.best,4);assert.equal(loaded.arena,2);assert.notEqual(loaded.opponent,'yabo');assert.ok(!loaded.path.slice(stage).includes('yabo'));
  if(stage>1)assert.equal(loaded.path[1],'yabo','completed history is not re-awarded as a Bigfoot win');
  if(run.opponent==='yabo'){assert.equal(loaded.opponent,'bigfoot');assert.equal(loaded.ticket,null);assert.equal(current.settle(run,true),null);}
  const resumed=current.start(run.fighter,run.difficulty,0);assert.ok(roster.some(f=>f.id===resumed.opponent));assert.equal(resumed.stage,stage);
 }
});

test('roster migration still rejects corrupt saves and retries failed writes without losing the migrated run',()=>{
 const disk=store(),legacy=new ArcadeRun(old,disk),run=legacy.start('violent-j','easy',0),key=legacy.key(run.fighter,run.difficulty);
 disk.setItem(key,JSON.stringify({...run,index:-1}));assert.equal(new ArcadeRun(roster,disk).load(run.fighter,run.difficulty),null);
 legacy.save(run);const write=disk.setItem;disk.setItem=()=>{throw Error('unavailable');};const current=new ArcadeRun(roster,disk),migrated=current.load(run.fighter,run.difficulty);assert.ok(migrated);assert.equal(current.saved,false);assert.ok(!migrated.opponents.includes('yabo'));
 disk.setItem=write;assert.equal(current.flush(),true);assert.deepEqual(new ArcadeRun(roster,disk).load(run.fighter,run.difficulty),migrated);
});
