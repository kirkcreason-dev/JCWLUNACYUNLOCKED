import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,emptyInput} from '../dist/src/engine.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url)));
const t=roster.find(f=>f.id==='2-tuff-tony'),a=t.animations;
test('Tony mixed-direction sheets correct only the left-facing walking and running poses',()=>{
 assert.deepEqual(a.walk.map(f=>Boolean(f.flipX)),[false,false,false,false,true]);
 assert.deepEqual(a.run.map(f=>Boolean(f.flipX)),[false,false,false,false,false,true]);
 const aligned=a.run.map(f=>f.flipX?f.w-f.anchorX:f.anchorX);
 assert.ok(Math.max(...aligned)-Math.min(...aligned)<2,'Hip anchors must not jump to alternate feet');
});
test('Tony settles into a flat resting pose after front and back knockdowns without inverted head-first source frames',()=>{
 assert.equal(a.down.length,2);assert.equal(a.down[1].groundAngle,-Math.PI/2);assert.equal(a.down[0].frame,a.rise[0].frame);assert.ok(a.down[0].h<60);
 for(const name of ['fallFront','fallBack'])assert.ok(a[name].every(e=>e.frame!==30&&e.frame!==31));
 for(const face of ['front','back']){
  const m=new Match(roster,0,1,{mode:'local'});m.phase='fight';m.knockDown(m.fighters[1],face,.38,2.5);
  for(let i=0;i<30;i++)m.step([emptyInput(),emptyInput()]);assert.equal(m.fighters[1].state,'down');assert.ok(m.fighters[1].t>m.fighters[1].fallDuration);assert.equal(m.fighters[1].z,0);
 }
});
