import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {attackPose} from '../dist/src/attack-animation.js';
import {MOVES} from '../dist/src/engine.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const f=roster.find(f=>f.id==='hokane');
test('Hokane is fighter 24 with exact website ratings and an honest unlisted finisher',()=>{
 assert.equal(roster.indexOf(f),23);
 assert.deepEqual([f.websiteStats.power,f.websiteStats.speed,f.websiteStats.technique,f.websiteStats.toughness],[8,6,6,8]);
 assert.equal(f.websiteStats.finisher,'');assert.equal(f.finisher,'LUNACY FINISHER');
 assert.deepEqual([f.power,f.speed,f.technique,f.toughness],[1.1,1,1,1.1]);
});
test('Hokane uses a forward strike and intact weapon contact poses',()=>{
 const a=f.animations;
 const strike=attackPose(f,'light',MOVES.light.startup,'light');assert.equal(strike.frame.frame,a.throw[3].frame);
 assert.notEqual(strike.frame.frame,a.throw[2].frame,'The raised overhead pose cannot be the punch contact');
 assert.equal(a.guitar[2].frame,a.throw[3].frame);assert.ok(a.propGuitar);
 assert.equal(a.bat.at(-1).frame,a.bat[0].frame,'Use the clean ready pose instead of overlapping recovery weapons');
 for(const e of [...a.throw,...a.bat,...a.thrown])assert.ok(e.w<280&&e.h>50,'Single body, no printed shadow frame');
 assert.deepEqual(f.weapons,['chair','bat','guitar','trashcan']);
});
test('all 31 Hokane sheets are mapped, including both front falls, KO and rope setup',async()=>{
 const a=f.animations;
 for(const [key,n] of Object.entries({walk:10,run:6,jump:4,throw:5,lifted:5,thrown:5,climb:6,ropePose:1,entry:5,down:2,fallBack:5,fallFront:5,fallFrontReverse:6,ko:1}))assert.equal(a[key].length,n,key);
 const audit=JSON.parse(await readFile(new URL('../tools/new-asset-audit.json',import.meta.url),'utf8')).filter(a=>a.fighter===f.id);
 assert.equal(new Set(audit.map(a=>a.source)).size,31);
 assert.ok(audit.every(a=>a.count>0));
});
