import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,STEP,emptyInput,isTeamMode,LEFT,RIGHT,SUDDEN_DEATH_HP,defenderOf} from '../dist/src/engine.js';
import {packSquadSnapshot,validSquadSnapshot} from '../dist/src/online-protocol.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const idle=()=>[emptyInput(),emptyInput(),emptyInput(),emptyInput()];
const squad=(format,cpu=[],teams=[[1,2],[3,4]])=>{const m=new Match(roster,teams[0][0],teams[1][0],{mode:'squad',format,teams,cpuPlayers:cpu});m.phase='fight';return m;};
const press=key=>({...emptyInput(),[key]:true,pressed:{[key]:true}});

test('team modes are recognised and need two distinct wrestlers per side',()=>{
  assert.ok(['tag','tornado','squad'].every(isTeamMode));assert.ok(!isTeamMode('elimination'));
  assert.throws(()=>squad('tag',[],[[1,2],[2,3]]),/distinct/);
  assert.throws(()=>squad('tornado',[],[[1,2,5],[3,4,6]]),/two wrestlers/);
  assert.throws(()=>new Match(roster,1,3,{mode:'squad',format:'cage',teams:[[1,2],[3,4]]}),/format/);
});
test('each person drives their own wrestler: P1+P3 on the left, P2+P4 on the right',()=>{
  const m=squad('tornado');
  assert.deepEqual(m.fighters.map(f=>[f.id,f.side,f.player]),[[1,0,0],[3,1,1],[2,0,2],[4,1,3]]);
  const before=m.fighters.map(f=>f.x),inputs=idle();inputs[2]={...emptyInput(),right:true};inputs[1]={...emptyInput(),left:true};
  for(let i=0;i<20;i++)m.step(inputs,STEP);
  assert.ok(m.fighters[2].x>before[2]);assert.ok(m.fighters[1].x<before[1]);assert.equal(m.fighters[0].x,before[0]);
});
test('tag: TAUNT in your own corner brings the partner in, with the wrestler’s damage saved',()=>{
  const m=squad('tag');m.fighters[0].hp=41;m.fighters[0].x=LEFT+150;
  m.step([press('taunt'),...idle().slice(1)],STEP);assert.deepEqual(m.ids,[1,3],'no tag away from the corner');
  for(let i=0;i<70;i++)m.step(idle(),STEP);
  m.fighters[0].state='idle';m.fighters[0].x=LEFT+20;m.step([press('taunt'),...idle().slice(1)],STEP);
  assert.deepEqual(m.ids,[2,3]);assert.equal(m.fighters[0].id,2);assert.equal(m.fighters[0].player,2);assert.equal(m.fighters[0].hp,100);
  assert.equal(m.partnerOf(0).hp,41);assert.ok(m.drainEvents().some(e=>e.type==='tag'&&e.to===2));
  // The partner (P3) now has the controls; P1 is on the apron.
  const x=m.fighters[0].x,inputs=idle();inputs[0]={...emptyInput(),right:true};for(let i=0;i<10;i++)m.step(inputs,STEP);assert.equal(m.fighters[0].x,x);
  inputs[0]=emptyInput();inputs[2]={...emptyInput(),right:true};for(let i=0;i<10;i++)m.step(inputs,STEP);assert.ok(m.fighters[0].x>x);
  // Tagging back restores the saved health.
  m.fighters[0].x=LEFT+10;m.fighters[0].state='idle';m.step([emptyInput(),emptyInput(),press('taunt'),emptyInput()],STEP);
  assert.equal(m.fighters[0].id,1);assert.equal(m.fighters[0].hp,41);
});
test('tag: one fall wins the match; a double knockout goes to sudden death',()=>{
  const m=squad('tag');m.fighters[1].hp=0;m.endRound(0,'PINFALL');
  for(let i=0;i<200;i++)m.step(idle(),STEP);assert.equal(m.phase,'done');assert.equal(m.winner,0);
  const d=squad('tag');d.fighters[0].hp=0;d.fighters[1].hp=0;d.step(idle(),STEP);
  assert.equal(d.phase,'fight');assert.ok(d.suddenDeath);assert.deepEqual(d.fighters.map(f=>f.hp),[SUDDEN_DEATH_HP,SUDDEN_DEATH_HP]);
});
test('tornado: a pinned wrestler is eliminated and the last team standing wins',()=>{
  const m=squad('tornado');m.fighters[1].state='down';m.fighters[1].hp=20;m.fighters[1].t=5;m.fighters[0].x=m.fighters[1].x-60;
  m.startPin(0,'pin',1);assert.equal(defenderOf(m.pin),1);
  for(let i=0;i<60*3.2&&m.pin;i++)m.step(idle(),STEP);
  assert.ok(m.fighters[1].out);assert.deepEqual(m.out[1],[3]);assert.equal(m.remainingOn(1),1);assert.equal(m.phase,'fight');
  m.fighters[3].hp=0;m.step(idle(),STEP);
  assert.equal(m.phase,'roundEnd');assert.equal(m.roundWinner,0);
  for(let i=0;i<200;i++)m.step(idle(),STEP);assert.equal(m.phase,'done');assert.equal(m.winner,0);
});
test('tornado: a partner’s strike on the pinning wrestler breaks the pin up',()=>{
  const m=squad('tornado');const [a,b,c]=m.fighters;
  b.state='down';b.t=5;b.x=640;a.x=600;m.startPin(0,'pin',1);
  const d=m.fighters[3];d.x=a.x+70;d.facing=-1;
  m.resolveAttack({index:3,target:0,move:'heavy',facing:-1,blocked:false,combo:false});
  assert.equal(m.pin,null);assert.equal(b.state,'rise');assert.equal(a.state,'hurt');
  assert.ok(m.drainEvents().some(e=>e.type==='pinBreak'));
});
test('tornado: strikes never hit a partner, and wrestlers face the nearest opponent',()=>{
  const m=squad('tornado');const [a,,c]=m.fighters;
  a.x=600;c.x=650;m.fighters[1].x=900;m.fighters[3].x=1000;
  a.move='light';a.state='light';a.attackStyle='light';a.t=.12;a.hit=false;a.facing=1;
  assert.equal(m.contact(0),undefined,'the partner in front is not a target');
  m.fighters[1].x=690;const hit=m.contact(0);assert.equal(hit.target,1);
  assert.equal(m.foe(2),1);
});
test('CPU teammates and opponents play a full tag and tornado match to a winner',()=>{
  let seed=7;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(const format of ['tag','tornado']){
    const m=new Match(roster,9,10,{mode:'squad',format,teams:[[9,11],[10,12]],cpuPlayers:[0,1,2,3],random});
    let n=0;while(m.phase!=='done'&&n<60*60*10){m.step(idle(),STEP);n++;}
    assert.equal(m.phase,'done',format);assert.ok([0,1].includes(m.winner));
  }
});
test('offline tag and tornado give the person P1 and the CPU everything else',()=>{
  const m=new Match(roster,1,3,{mode:'tornado',teams:[[1,2],[3,4]]});
  assert.deepEqual([...m.cpuPlayers],[1,2,3]);assert.equal(m.fighters[0].player,0);
  const t=new Match(roster,1,3,{mode:'tag',teams:[[1,2],[3,4]]});assert.equal(t.format,'tag');assert.equal(t.fighters.length,2);
});
test('the final elimination snapshot (a team with nobody left) is still accepted by guests',()=>{
  const teams=[[1,2],[3,4]],m=squad('elimination',[],teams);
  for(let fall=0;fall<2;fall++){m.phase='fight';m.fighters[1].hp=0;m.endRound(0,'KNOCKOUT');for(let i=0;i<200&&m.phase==='roundEnd';i++)m.step(idle(),STEP);}
  assert.equal(m.phase,'done');assert.deepEqual(m.slot,[0,2]);
  assert.ok(validSquadSnapshot(JSON.parse(JSON.stringify(packSquadSnapshot(m,9))),teams));
});
test('the setup screen offers tag, tornado and four-player online rooms',async()=>{
  const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
  for(const value of ['tag','tornado','squad'])assert.match(html,new RegExp(`<option value="${value}">`));
  for(const id of ['squad-lobby','squad-format','squad-create','squad-join','squad-code','squad-seats','squad-start','squad-cancel'])assert.match(html,new RegExp(`id="${id}"`));
});
test('offline Tag Team: after a tag the person controls the partner, never the CPU',()=>{
  const m=new Match(roster,1,3,{mode:'tag',teams:[[1,2],[3,4]]});m.phase='fight';
  assert.equal(m.fighters[0].player,0);
  m.fighters[0].x=LEFT+15;m.step([press('taunt'),emptyInput()],STEP);
  assert.equal(m.fighters[0].id,2);assert.equal(m.fighters[0].player,0,'the partner is driven by player 1');
  // The CPU never moves the person's partner; the player's input does.
  const x=m.fighters[0].x;for(let i=0;i<40;i++)m.step([emptyInput(),emptyInput()],STEP);assert.equal(m.fighters[0].x,x);
  for(let i=0;i<20;i++)m.step([{...emptyInput(),right:true},emptyInput()],STEP);assert.ok(m.fighters[0].x>x);
  // Tag back from the corner returns control to the first wrestler.
  m.fighters[0].x=LEFT+10;m.fighters[0].state='idle';m.step([press('taunt'),emptyInput()],STEP);
  assert.equal(m.fighters[0].id,1);assert.equal(m.fighters[0].player,0);
  // The CPU team still has its own legal wrestler and partner.
  assert.equal(m.fighters[1].player,1);assert.ok(m.cpuPlayers.has(1));
});
test('online Tag: when a partner seat is filled by the CPU, the person on that team plays both wrestlers',()=>{
  const m=new Match(roster,1,3,{mode:'squad',format:'tag',teams:[[1,2],[3,4]],cpuPlayers:[2,3]});m.phase='fight';
  m.fighters[0].x=LEFT+15;m.step([press('taunt'),emptyInput(),emptyInput(),emptyInput()],STEP);
  assert.equal(m.fighters[0].id,2);assert.equal(m.fighters[0].player,0);
  // With four people, each still drives only their own wrestler.
  const f=new Match(roster,1,3,{mode:'squad',format:'tag',teams:[[1,2],[3,4]],cpuPlayers:[]});f.phase='fight';
  f.fighters[0].x=LEFT+15;f.step([press('taunt'),emptyInput(),emptyInput(),emptyInput()],STEP);assert.equal(f.fighters[0].player,2);
});
