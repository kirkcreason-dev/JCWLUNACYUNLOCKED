import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,LEFT,RIGHT,emptyInput} from '../dist/src/engine.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url)));
test('every pole CPU crosses the old dead band, climbs either corner and claims without phantom punches',()=>{
 for(let id=0;id<roster.length;id++)for(const difficulty of ['easy','normal','hard'])for(const side of ['left','right']){
  const m=new Match(roster,(id+1)%roster.length,id,{mode:'pole',difficulty,random:()=>.41});
  if(side==='right'){m.round=2;m.newRound();}m.phase='fight';
  m.fighters[0].x=side==='left'?RIGHT:LEFT;m.fighters[1].x=side==='left'?LEFT+75:RIGHT-75;
  let whiffs=0;
  for(let n=0;n<500&&!m.pole.claimed;n++){m.step([emptyInput(),emptyInput()]);whiffs+=m.drainEvents().filter(e=>e.type==='whiff'&&e.index===1).length;}
  assert.equal(m.pole.holder,1,`${roster[id].id} ${difficulty} ${side}`);assert.equal(whiffs,0);
  for(let n=0;n<60&&m.fighters[1].state==='perch';n++)m.step();assert.notEqual(m.fighters[1].state,'perch','CPU leaves after claiming');
 }
});
