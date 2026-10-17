import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const f=roster.find(f=>f.id==='father-bronson');
test('Father Bronson has exact website ratings and the listed Red Bloom finisher',()=>{
 assert.equal(roster.indexOf(f),22);
 assert.deepEqual([f.websiteStats.power,f.websiteStats.speed,f.websiteStats.technique,f.websiteStats.toughness],[8,6,7,8]);
 assert.equal(f.websiteStats.finisher,'The Red Bloom');assert.equal(f.finisher,'THE RED BLOOM');
 assert.deepEqual([f.power,f.speed,f.technique,f.toughness],[1.1,1,1.05,1.1]);
});
test('Bronson keeps full jump and throw sequences and one body per attack frame',()=>{
 const a=f.animations;for(const [key,n] of Object.entries({walk:6,run:6,jump:4,throw:5,kick:4,climb:7,ropePose:1,entry:5,down:2,fallBack:5,fallBackReverse:5,chair:5}))assert.equal(a[key].length,n,key);
 for(const e of [...a.throw,...a.bat])assert.ok(e.w<280&&e.h>150,'No merged two-body attack');
 assert.equal(a.guitar[2].frame,a.throw[3].frame);assert.ok(a.propGuitar);assert.ok(f.guitarGrip);
 assert.notEqual(a.chair[2].frame,a.carryChair[0].frame,'Contact uses the adapted attack, not a carrying pose');
 assert.deepEqual(f.weapons,['chair','bat','guitar','trashcan']);
});
test('all 35 Bronson sheets have a recorded use or an explicit reviewed exception',async()=>{
 const audit=JSON.parse(await readFile(new URL('../tools/new-asset-audit.json',import.meta.url),'utf8')).filter(a=>a.fighter===f.id);
 const supplied=audit.filter(a=>a.source.startsWith('Father Bronson/'));
 assert.equal(new Set(supplied.map(a=>a.source)).size,35);
 const alternates=supplied.filter(a=>a.count===0);assert.equal(alternates.length,3);assert.ok(alternates.every(a=>a.reason));
 assert.ok(alternates.some(a=>a.source.endsWith('Father Bronson Grapple.png')),'Paired art must not bake a fixed opponent into gameplay');
});
