import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {attackPose} from '../dist/src/attack-animation.js';
import {MOVES} from '../dist/src/engine.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const audit=JSON.parse(await readFile(new URL('../tools/new-asset-audit.json',import.meta.url),'utf8'));
for(const [index,id,stats,finisher,sheets] of [[26,'krule',[10,5,6,9],'',29],[27,'jeeves',[5,7,7,6],'Heads Bangers Balls',30]]){
 test(`${id} is selectable in the new slot with exact JCW website ratings`,()=>{
  const f=roster[index];assert.equal(f.id,id);
  assert.deepEqual(['power','speed','technique','toughness'].map(k=>f.websiteStats[k]),stats);
  assert.equal(f.websiteStats.finisher,finisher);assert.equal(f.finisher,(finisher||'Lunacy Finisher').toUpperCase());
 });
 test(`${id} has clean attacks and complete movement, fall and rope sequences`,()=>{
  const f=roster[index],a=f.animations;
  for(const [key,n] of Object.entries({walk:5,run:6,bat:5,trashcan:5,throw:5,lifted:5,jump:4,climb:6,entry:5,dive:2,down:2,ko:1}))assert.equal(a[key].length,n,key);
  assert.equal(a.thrown.length,id==='krule'?3:4);
  if(id==='krule')assert.equal(a.thrown.at(-1).frame,a.down[1].frame,'Missing victim sheet uses the own clean face-up landing');
  assert.deepEqual(f.weapons,['chair','bat','guitar','trashcan']);
  for(const e of [...a.bat,...a.trashcan,...a.thrown])assert.ok(e.w<290&&e.h>25,'No merged bodies or printed shadows');
  assert.equal(attackPose(f,'light',MOVES.light.startup,'light').frame.frame,a.throw[3].frame);
  assert.equal(a.guitar[2].frame,a.throw[3].frame);assert.ok(a.propGuitar.length);
  const used=audit.filter(a=>a.fighter===id&&!a.source.startsWith('prepared:'));
  assert.equal(new Set(used.map(a=>a.source)).size,sheets);
  assert.ok(used.every(a=>a.count>0&&/^[a-f0-9]{64}$/.test(a.sourceSHA256)));
 });
}
