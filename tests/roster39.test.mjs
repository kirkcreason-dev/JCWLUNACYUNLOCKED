import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,STEP,emptyInput} from '../dist/src/engine.js';
import {RosterSelection} from '../dist/src/roster-selection.js';
import {Championship} from '../dist/src/championship.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url)));
const ids=['josh-bishop','ring-rat','green-phantom'];
test('the seventh phone page reaches all three additions and keeps selection through rotation',()=>{
 const picker=new RosterSelection(roster.length,6);
 for(const [offset,id] of ids.entries()){
  picker.choose(36+offset);assert.equal(roster[picker.selected].id,id);
  assert.equal(picker.pages,7);assert.deepEqual(picker.visible,[36,37,38]);
  for(const size of [8,12,6]){picker.resize(size);assert.equal(picker.selected,36+offset);assert.ok(picker.visible.includes(picker.selected));}
 }
});
test('all 86 supplied sheets are accounted for and Josh’s source-label mismatch is recorded',async()=>{
 const audit=JSON.parse(await readFile(new URL('../tools/expansion39-audit.json',import.meta.url)));
 assert.equal(audit.length,86);assert.equal(new Set(audit.map(a=>a.source)).size,86);
 for(const [i,count] of [27,31,28].entries())assert.equal(audit.filter(a=>a.fighter===ids[i]).length,count);
 for(const entry of audit){assert.match(entry.sourceSHA256,/^[a-f0-9]{64}$/);assert.ok(entry.count>0);}
 for(const entry of audit.filter(a=>a.fighter==='josh-bishop'))assert.match(entry.notes,/Caleb Konley/);
});
for(const [offset,id] of ids.entries())test(`${id} lands unarmed, weapon and finisher attacks from both sides`,()=>{
 const index=36+offset;
 for(const facing of [-1,1])for(const [action,weapon] of [['light','none'],['heavy','none'],['heavy','chair'],['heavy','bat'],['heavy','guitar'],['heavy','trashcan'],['special','none']]){
  const m=new Match(roster,index,0,{mode:'local'});m.phase='fight';
  const [a,b]=m.fighters;a.x=640;b.x=640+80*facing;a.weapon=weapon;a.meter=100;
  m.step([{...emptyInput(),[action]:true},emptyInput()],STEP);
  for(let n=0;n<90&&b.hp===100;n++)m.step([emptyInput(),emptyInput()],STEP);
  assert.ok(b.hp<100,`${id} ${action} ${weapon} ${facing}`);assert.equal(a.facing,facing);
 }
 const animations=roster[index].animations;
 for(const key of ['chair','bat','guitar','trashcan'])assert.ok(animations[key][2].h>140,`${key} contact must contain a full-size body`);
 assert.deepEqual(animations.fallFront.at(-1),animations.down[0]);
 assert.deepEqual(animations.fallBack.at(-1),animations.down[1]);
 assert.deepEqual(animations.ko[0],animations.down[1]);
});
test('each added wrestler can win, reload and defend a championship with stable ID saves',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 for(const id of ids){
  let mode=new Championship(roster,storage,()=>.4),result;
  for(let bout=0;bout<5;bout++)result=mode.settle(mode.start(id,'normal',0),true);
  assert.equal(result.outcome,'crowned');assert.equal(result.run.titles,1);
  mode=new Championship(roster,storage,()=>.8);assert.equal(mode.load(id,'normal').phase,'defend');
  result=mode.settle(mode.start(id,'normal',0),true);assert.equal(result.outcome,'defended');assert.equal(result.run.defenses,1);
 }
 const mode=new Championship(roster,null,()=>.999999);
 assert.equal(mode.challenger('violent-j','ring-rat'),'green-phantom');
 assert.equal(mode.challenger('violent-j','green-phantom'),'ring-rat');
 assert.equal(new Championship(roster,null,()=>.96).challenger('violent-j','ring-rat'),'josh-bishop');
});
