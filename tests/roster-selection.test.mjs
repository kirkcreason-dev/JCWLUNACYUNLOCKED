import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {RosterSelection} from '../dist/src/roster-selection.js';
import {Match} from '../dist/src/engine.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));

test('phone, landscape and desktop pages expose every fighter exactly once',()=>{
 for(const size of [6,8,12]){
  const picker=new RosterSelection(roster.length,size),seen=[];
  for(let page=0;page<picker.pages;page++){seen.push(...picker.visible);picker.turn(1);}
  assert.equal(seen.length,36);assert.equal(new Set(seen).size,36);
  assert.deepEqual(seen.map(i=>roster[i].name),roster.map(f=>f.name));
 }
});
test('the direct picker reaches all 36 real match fighters without changing the opponent',()=>{
 const picker=new RosterSelection(roster.length,6);
 for(let index=0;index<roster.length;index++){
  assert.equal(picker.choose(index),true);assert.ok(picker.visible.includes(index));
  const match=new Match(roster,picker.selected,4,{mode:'local'});
  assert.equal(match.fighters[0].definition.name,roster[index].name);
  assert.equal(match.fighters[1].definition.name,'Kerry Morton');
 }
});
test('browsing pages preserves the confirmed fighter and clamps at either end',()=>{
 const picker=new RosterSelection(24,6);picker.choose(7);picker.turn(20);
 assert.equal(picker.selected,7);assert.equal(picker.page,3);
 picker.turn(-20);assert.equal(picker.selected,7);assert.equal(picker.page,0);
 assert.equal(picker.choose(-1),false);assert.equal(picker.choose(24),false);assert.equal(picker.selected,7);
});
test('rotating the phone keeps Hokane selected and reveals his new page',()=>{
 const picker=new RosterSelection(roster.length,6);picker.choose(23);
 assert.deepEqual(picker.visible.map(i=>roster[i].name),['Bruce Wayans','Alice Crowley','Ruffo','Kongo Kong','Father Bronson','Hokane']);
 for(const size of [8,12,6]){picker.resize(size);assert.equal(picker.selected,23);assert.ok(picker.visible.includes(23));}
});

test('expanded portrait pages preserve Jeeves while exposing the final newcomers',()=>{
 const p=new RosterSelection(roster.length,6);p.choose(27);
 assert.equal(p.pages,6);assert.equal(p.page,4);assert.deepEqual(p.visible,[24,25,26,27,28,29]);
 for(const size of [8,12,6]){p.resize(size);assert.equal(p.selected,27);assert.ok(p.visible.includes(27));}
});
