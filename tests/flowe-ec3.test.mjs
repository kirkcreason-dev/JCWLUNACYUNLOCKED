import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {attackPose} from '../dist/src/attack-animation.js';
import {MOVES} from '../dist/src/engine.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const audit=JSON.parse(await readFile(new URL('../tools/new-asset-audit.json',import.meta.url),'utf8'));
for(const [index,id,stats,finisher] of [[24,'steven-flowe',[6,10,8,7],'STEVEN FLOWESION'],[25,'ec3',[8,6,8,8],'ONE PERCENTER']]){
 test(`${id} occupies the new roster slot with exact JCW ratings`,()=>{
  const f=roster[index];assert.equal(f.id,id);assert.deepEqual(['power','speed','technique','toughness'].map(k=>f.websiteStats[k]),stats);assert.equal(f.finisher,finisher);
 });
 test(`${id} has complete single-body movement, throws and all four weapons`,()=>{
  const f=roster[index],a=f.animations;
  for(const [key,n] of Object.entries({walk:5,run:6,bat:5,trashcan:5,throw:5,lifted:5,jump:4,climb:6,entry:5,dive:2,down:2,ko:id==='steven-flowe'?2:1}))assert.equal(a[key].length,n,key);
  assert.equal(a.thrown.length,id==='ec3'?5:4);
  assert.deepEqual(f.weapons,['chair','bat','guitar','trashcan']);
  for(const e of [...a.bat,...a.trashcan,...a.thrown])assert.ok(e.w<290&&e.h>25,'No merged neighboring wrestlers or printed shadow frames');
  assert.equal(attackPose(f,'light',MOVES.light.startup,'light').frame.frame,a.throw[3].frame);
  assert.equal(a.guitar[2].frame,a.throw[3].frame);assert.ok(a.propGuitar.length);
  const used=audit.filter(a=>a.fighter===id&&!a.source.startsWith('prepared:'));
  assert.equal(new Set(used.map(a=>a.source)).size,30);assert.ok(used.every(a=>a.count>0));
 });
}
