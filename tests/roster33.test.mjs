import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {RosterSelection} from '../dist/src/roster-selection.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const ids=['atiba','jp-grayson','tommy','shaggy-2-dope','jacksyn'];
for(const [offset,id] of ids.entries())test(`${id} has full combat art and a stable new roster slot`,()=>{
 const f=roster[28+offset];assert.equal(f.id,id);
 for(const action of ['idle','walk','run','light','heavy','chair','bat','guitar','trashcan','carryChair','carryBat','carryGuitar','carryTrashcan','lift','lifted','throw','thrown','jump','down','rise','hurt','pin','defeat','victory','climb','entry','dive','ko'])assert.ok(f.animations[action]?.length,action);
 for(const e of f.animations.light)assert.ok(e.w>30&&e.h>100,'A complete body is required for strikes');
 assert.equal(f.websiteStats===null,id==='shaggy-2-dope');
 if(f.websiteStats)assert.equal(f.websiteStats.retrieved,'2026-09-16');
});
test('all 148 new source sheets have a hashed audit record',async()=>{
 const audit=JSON.parse(await readFile(new URL('../tools/expansion33-audit.json',import.meta.url),'utf8'));
 assert.equal(new Set(audit.map(v=>v.source)).size,148);
 for(const entry of audit){assert.match(entry.sourceSHA256,/^[a-f0-9]{64}$/);assert.ok(entry.count>0);}
});
test('the sixth phone page reaches Tommy, Shaggy and Jacksyn and survives rotation',()=>{
 const selection=new RosterSelection(roster.length,6);selection.choose(32);
 assert.equal(selection.pages,6);assert.deepEqual(selection.visible,[30,31,32,33,34,35]);
 for(const size of [8,12,6]){selection.resize(size);assert.equal(selection.selected,32);assert.ok(selection.visible.includes(32));}
});
