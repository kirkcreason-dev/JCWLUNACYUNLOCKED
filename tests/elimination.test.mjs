import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,STEP,emptyInput,isLocalMode,isEliminationMode,TEAM_SIZE,ELIMINATION_RECOVERY} from '../dist/src/engine.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const teams=()=>[[1,2,3,4],[5,6,7,8]];
const make=(mode='elimination',t=teams())=>{const m=new Match(roster,t[0][0],t[1][0],{mode,teams:t});m.phase='fight';return m;};
const finishFall=m=>{for(let i=0;i<400&&m.phase==='roundEnd';i++)m.step([emptyInput(),emptyInput()],STEP);};

test('elimination modes are recognised and only the 2-player one is local',()=>{
  assert.ok(isEliminationMode('elimination')&&isEliminationMode('elimination-local'));
  assert.ok(isLocalMode('elimination-local')&&!isLocalMode('elimination'));
  assert.equal(TEAM_SIZE,4);
});
test('teams must be eight different, real fighters',()=>{
  assert.throws(()=>new Match(roster,1,1,{mode:'elimination',teams:[[1,2,3,4],[4,5,6,7]]}),/distinct/);
  assert.throws(()=>new Match(roster,1,5,{mode:'elimination',teams:[[1,2,3,999],[5,6,7,8]]}),/distinct/);
});
test('the loser is eliminated, the next teammate enters and the winner keeps the damage plus a breather',()=>{
  const m=make();assert.deepEqual(m.ids,[1,5]);
  m.fighters[0].hp=40;m.fighters[0].meter=55;m.fighters[1].hp=0;m.endRound(0,'KNOCKOUT');
  const e=m.drainEvents().find(x=>x.type==='elimination');
  assert.deepEqual(e.eliminated,[{side:1,id:5}]);assert.deepEqual(e.left,[4,3]);assert.deepEqual(e.next,[1,6]);
  finishFall(m);
  assert.equal(m.phase,'intro');assert.equal(m.round,2);assert.deepEqual(m.ids,[1,6]);
  assert.equal(m.fighters[0].hp,40+ELIMINATION_RECOVERY);assert.equal(m.fighters[0].meter,55);assert.equal(m.fighters[1].hp,100);
});
test('the next fall waits while the incoming wrestler is still loading',()=>{
  const m=make();m.fighters[1].hp=0;m.endRound(0,'KNOCKOUT');m.waiting=true;
  for(let i=0;i<60*6;i++)m.step([emptyInput(),emptyInput()],STEP);
  assert.equal(m.phase,'roundEnd');m.waiting=false;finishFall(m);assert.equal(m.phase,'intro');
});
test('a draw eliminates both wrestlers; the last team with anyone left wins',()=>{
  const m=make();m.endRound(null,'DOUBLE KO');assert.deepEqual([m.remainingOn(0),m.remainingOn(1)],[3,3]);finishFall(m);
  for(let fall=0;fall<3;fall++){m.phase='fight';m.fighters[1].hp=0;m.endRound(0,'PINFALL');finishFall(m);}
  assert.equal(m.phase,'done');assert.equal(m.winner,0);assert.deepEqual(m.out[1],[5,6,7,8]);assert.equal(m.remainingOn(0),3);
});
test('if both last wrestlers go down together, they come back for a sudden-death fall',()=>{
  const m=make('elimination',[[1],[2]]);m.endRound(null,'DOUBLE KO');
  assert.ok(m.suddenDeath);assert.deepEqual([m.remainingOn(0),m.remainingOn(1)],[1,1]);
  finishFall(m);assert.equal(m.phase,'intro');assert.deepEqual(m.fighters.map(f=>f.hp),[50,50]);
  m.phase='fight';m.fighters[0].hp=0;m.endRound(1,'KNOCKOUT');finishFall(m);
  assert.equal(m.phase,'done');assert.equal(m.winner,1);
});
test('a CPU 4-on-4 plays through to a winner with every fall accounted for',()=>{
  for(const difficulty of ['easy','hard']){
    const m=new Match(roster,9,10,{mode:'elimination',difficulty,teams:[[9,10,11,12],[13,14,15,16]]});
    let n=0;while(m.phase!=='done'&&n<60*60*40){m.step([emptyInput(),emptyInput()],STEP);if(m.phase==='roundEnd')m.waiting=false;n++;}
    assert.equal(m.phase,'done');assert.ok([0,1].includes(m.winner));
    assert.equal(m.out[1-m.winner].length,TEAM_SIZE);assert.ok(m.out[m.winner].length<TEAM_SIZE);
  }
});
test('the 2-player version takes both players’ input and never runs the CPU',()=>{
  const m=make('elimination-local');m.cpu=()=>{throw new Error('CPU used in local play');};
  for(let i=0;i<120;i++)m.step([emptyInput(),{...emptyInput(),right:i%2===0}],STEP);
  assert.equal(m.phase,'fight');
});
test('the game page offers both 4-on-4 modes and an eight-slot team picker',async()=>{
  const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
  assert.match(html,/value="elimination">4 ON 4 ELIMINATION · CPU/);assert.match(html,/value="elimination-local">4 ON 4 ELIMINATION · 2 PLAYER/);
  for(const side of ['a','b'])for(let i=0;i<4;i++)assert.match(html,new RegExp(`id="team-${side}-${i}"`));
});
