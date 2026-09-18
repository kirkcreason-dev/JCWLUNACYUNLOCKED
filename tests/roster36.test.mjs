import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,MOVES,STEP,emptyInput} from '../dist/src/engine.js';
import {attackPose} from '../dist/src/attack-animation.js';
import {RosterSelection} from '../dist/src/roster-selection.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
for(const [offset,id] of ['dj-clay','jeff-lane','shane-mercer'].entries())test(`${id} has complete combat art in its appended roster slot`,()=>{
 const f=roster[33+offset];assert.equal(f.id,id);
 for(const action of ['idle','walk','run','light','heavy','chair','bat','guitar','trashcan','carryChair','carryBat','carryGuitar','carryTrashcan','lift','lifted','throw','thrown','jump','down','rise','hurt','pin','defeat','victory','climb','entry','dive','ko'])assert.ok(f.animations[action]?.length,action);
 assert.equal(f.animations.down.length,2);assert.equal(f.animations.run.length,6);
 assert.equal(f.websiteStats===null,id!=='shane-mercer');
 if(f.websiteStats)assert.deepEqual([f.websiteStats.power,f.websiteStats.speed,f.websiteStats.technique,f.websiteStats.toughness],[10,6,7,8]);
});
test('all 92 supplied sheets have a hashed preparation audit',async()=>{
 const audit=JSON.parse(await readFile(new URL('../tools/expansion36-audit.json',import.meta.url),'utf8'));
 assert.equal(new Set(audit.map(v=>v.source)).size,92);
 for(const entry of audit){assert.match(entry.sourceSHA256,/^[a-f0-9]{64}$/);assert.ok(entry.count>0);}
});
test('the complete sixth phone page reaches each newcomer through rotation',()=>{
 const picker=new RosterSelection(roster.length,6);
 for(const id of [33,34,35]){
  picker.choose(id);assert.equal(picker.pages,7);assert.deepEqual(picker.visible,[30,31,32,33,34,35]);
  for(const size of [8,12,6]){picker.resize(size);assert.equal(picker.selected,id);assert.ok(picker.visible.includes(id));}
 }
});
test('Bass Blast art follows the real finisher damage window and works from either side',()=>{
 const def=roster[33],frames=def.animations.special,timing=MOVES.special,end=timing.startup+timing.active;
 assert.equal(def.finisher,'BASS BLAST');assert.equal(frames.length,6);
 assert.equal(attackPose(def,'special',timing.startup-1e-6,'kick').frame,frames[2]);
 for(const t of [timing.startup,end-1e-6])assert.ok(frames.slice(3,5).includes(attackPose(def,'special',t,'chair').frame));
 assert.equal(attackPose(def,'special',end+1e-6).frame,frames[5]);
 assert.equal(attackPose(def,'special',end+timing.recovery).frame,frames[0]);
 for(const facing of [-1,1]){
  const m=new Match(roster,33,34,{mode:'local'});m.phase='fight';m.fighters[0].x=640;m.fighters[1].x=640+95*facing;m.fighters[0].meter=100;
  m.step([{...emptyInput(),special:true},emptyInput()],STEP);
  assert.equal(m.fighters[0].meter,0);assert.equal(m.fighters[1].hp,100);
  for(let tick=0;tick<40&&m.fighters[1].hp===100;tick++)m.step([emptyInput(),emptyInput()],STEP);
  const f=m.fighters[0];assert.equal(f.facing,facing);assert.ok(m.fighters[1].hp<100);
  assert.ok(frames.slice(3,5).includes(attackPose(def,f.move,f.t,f.attackStyle).frame));
 }
});
