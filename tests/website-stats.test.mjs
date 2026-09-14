import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,STEP,emptyInput} from '../dist/src/engine.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const site=JSON.parse(await readFile(new URL('../dist/assets/website-stats.json',import.meta.url),'utf8'));
const kongo=roster.findIndex(f=>f.id==='kongo-kong');
function match(overrides={},defender={}){
 const definitions=structuredClone(roster);
 Object.assign(definitions[kongo],{power:1,speed:1,technique:1,toughness:1},overrides);
 Object.assign(definitions[11],{power:1,speed:1,technique:1,toughness:1},defender);
 const m=new Match(definitions,kongo,11,{mode:'local'});m.phase='fight';m.fighters[0].x=500;m.fighters[1].x=580;return m;
}
function step(m,n,command={}){for(let i=0;i<n;i++)m.step([{...emptyInput(),...command},emptyInput()],STEP);}
function damage(m,action){step(m,1,{[action]:true});step(m,100);return 100-m.fighters[1].hp;}

test('selection data retains the website scale, names, finishers, and missing-rating exception',()=>{
 assert.equal(site.source,'https://jcwlunacy.net/');assert.equal(site.scale,10);assert.equal(Object.keys(site.ratings).length,27);
 const f=roster[kongo];assert.deepEqual([f.websiteStats.power,f.websiteStats.speed,f.websiteStats.technique,f.websiteStats.toughness],[10,5,7,9]);
 for(const f of roster){
  if(f.id==='violent-j'){assert.equal(f.websiteStats,null);assert.ok(!site.ratings[f.id]);continue;}
  assert.deepEqual(f.websiteStats,site.ratings[f.id]);
  for(const key of ['power','speed','technique','toughness'])assert.ok(Number.isInteger(f.websiteStats[key])&&f.websiteStats[key]>=1&&f.websiteStats[key]<=10);
  assert.equal(f.finisher,(f.websiteStats.finisher||'Lunacy Finisher').toUpperCase());
 }
 assert.equal(roster.find(f=>f.id==='able').websiteStats.websiteName,'Abel');
 assert.equal(roster.find(f=>f.id==='caleb-konley').finisher,'BURNING HAMMER');
 assert.equal(f.finisher,'LUNACY FINISHER');
});
test('website Power increases strike damage and Toughness reduces incoming damage',()=>{
 const normal=damage(match(),'light');
 assert.ok(damage(match({power:roster[kongo].power}),'light')>normal);
 assert.ok(damage(match({}, {toughness:roster[kongo].toughness}),'light')<normal);
});
test('website Speed makes Facade faster than Kongo with identical directional input',()=>{
 const slow=match({speed:roster[kongo].speed}),fast=match({speed:roster[11].speed});
 for(const m of [slow,fast]){m.fighters[1].x=1000;step(m,12,{right:true});}
 assert.ok(fast.fighters[0].x>slow.fighters[0].x);
 assert.ok(Math.abs((fast.fighters[0].x-500)/(slow.fighters[0].x-500)-roster[11].speed/roster[kongo].speed)<1e-9);
});
test('website Technique changes grapple damage without increasing ordinary strikes',()=>{
 const low=roster.find(f=>f.id==='sally-boy').technique,high=roster.find(f=>f.id==='kerry-morton').technique;
 assert.ok(damage(match({technique:high}),'grapple')>damage(match({technique:low}),'grapple'));
 assert.equal(damage(match({technique:high}),'light'),damage(match({technique:low}),'light'));
});
test('Kongo uses complete attack and direction sequences without sheet headers or neighboring bodies',()=>{
 const a=roster[kongo].animations;
 for(const [action,n] of Object.entries({bat:5,guitar:5,fallFront:5,fallBack:4,down:2,defeat:1,climb:7,entry:5,dive:2,kick:4,run:6}))assert.equal(a[action].length,n,action);
 for(const e of a.bat)assert.ok(e.w<260&&e.h>=180&&e.h<310,'Bat must contain one full-sized wrestler');
 for(const e of a.fallFront)assert.ok(e.h>25&&e.w<270,'A header cannot be a fall pose');
 assert.deepEqual(a.walk,a.run);assert.equal(a.propGuitar,undefined,'The supplied guitar contact is intact');
});
test('all 29 Kongo source files are audited and the second guitar sheet is explicitly a duplicate',async()=>{
 const audit=JSON.parse(await readFile(new URL('../tools/new-asset-audit.json',import.meta.url),'utf8')).filter(a=>a.fighter==='kongo-kong');
 assert.equal(new Set(audit.map(a=>a.source)).size,29);
 const duplicate=audit.find(a=>a.duplicateOf);assert.ok(duplicate);assert.equal(duplicate.count,0);
 assert.equal(duplicate.source,'Kongo Kong/Kongo Kong attack with guitar.png');
 assert.equal(duplicate.duplicateOf,'Kongo Kong/KK attack with guitar.png');
});
