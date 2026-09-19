import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,MOVES,attackTiming,STEP,emptyInput} from '../dist/src/engine.js';
import {InputState} from '../dist/src/input.js';
import {packSnapshot,SnapshotBuffer} from '../dist/src/online-protocol.js';
const roster=[0,1].map(i=>({id:`test-${i}`,name:`Test ${i}`,power:1,speed:1,toughness:1,weapons:['chair','bat','guitar','trashcan']}));
const make=()=>{const m=new Match(roster,0,1,{mode:'local'});m.phase='fight';m.fighters[0].x=300;m.fighters[1].x=1000;return m;};
const tick=(m,a={},b={})=>m.step([{...emptyInput(),...a},{...emptyInput(),...b}]);
function run(m,n,a={},b={}){for(let i=0;i<n;i++)tick(m,a,b);}
function approach(direction=1,weapon='none'){
  const m=make();if(direction<0)[m.fighters[0].x,m.fighters[1].x]=[980,280];
  run(m,30,direction>0?{right:true}:{left:true});
  m.fighters[0].weapon=weapon;
  const move=['bat','guitar','trashcan'].includes(weapon)?weapon:'heavy';
  m.fighters[1].x=m.fighters[0].x+direction*(attackTiming(move,weapon==='none'?'light':weapon).reach+25);
  m.drainEvents();return m;
}

test('running covers 12% more ground while one second still uses one second of the round clock',()=>{
  const m=make();run(m,60,{right:true,run:true});
  assert.ok(Math.abs((m.fighters[0].x-300)/(245*1.48)-1.12)<1e-9);
  assert.ok(Math.abs(m.remaining-98)<1e-9);
});

test('each attack keeps its declared damage and full active window at the faster pace',()=>{
  const before={light:.43,heavy:.87,bat:.70,guitar:.98,trashcan:1.05,special:1.02};
  for(const [move,oldDuration] of Object.entries(before)){
    const m=make(),a=m.fighters[0],b=m.fighters[1];
    if(['bat','guitar','trashcan'].includes(move))a.weapon=move;if(move==='heavy')a.weapon='chair';
    a.meter=100;tick(m,{[move==='light'?'light':move==='special'?'special':'heavy']:true});
    let frames=0;while(a.move&&frames<90){tick(m);frames++;}
    assert.ok(frames*STEP<oldDuration,move);assert.ok(frames*STEP>oldDuration*.8,move);
    assert.equal(b.hp,100);
    const late=make(),attacker=late.fighters[0],target=late.fighters[1],timing=MOVES[move];
    attacker.weapon=a.weapon;attacker.meter=100;
    tick(late,{[move==='light'?'light':move==='special'?'special':'heavy']:true});
    while(attacker.t<timing.startup+timing.active*.6)tick(late);
    target.x=attacker.x+80;tick(late);
    assert.equal(target.hp,100-timing.damage,`${move}: late active hit`);
    run(late,90);assert.equal(late.drainEvents().filter(e=>e.type==='hit').length,1);
  }
});

test('running heavies bridge a small gap from either side with each weapon and retain normal damage',()=>{
  for(const direction of [-1,1])for(const weapon of ['none','chair','bat','guitar','trashcan']){
    const m=approach(direction,weapon),a=m.fighters[0],b=m.fighters[1],start=a.x;
    tick(m,{heavy:true});run(m,90);
    const move=['bat','guitar','trashcan'].includes(weapon)?weapon:'heavy';
    assert.equal(b.hp,100-attackTiming(move,weapon==='none'?'light':weapon).damage,`${direction} ${weapon}`);
    assert.ok((a.x-start)*direction>25&&(a.x-start)*direction<50);
    const hit=m.drainEvents().find(e=>e.type==='hit');assert.equal(hit.running,true);
    const guest=make(),buffer=new SnapshotBuffer(m.ids);
    assert.ok(buffer.receive(packSnapshot(m,1,[{...hit,serial:1}]),0));buffer.apply(guest,50);
    assert.equal(guest.fighters[0].x,a.x);assert.equal(buffer.drainEvents()[0].running,true);
  }
});

test('a missed or blocked running heavy cannot cancel recovery into another attack',()=>{
  for(const blocked of [false,true]){
    const m=approach();if(!blocked)m.fighters[1].x=1000;
    tick(m,{heavy:true},blocked?{block:true}:{});
    run(m,8,{},blocked?{block:true}:{});tick(m,{pressed:{light:true}},blocked?{block:true}:{});
    run(m,25,{},blocked?{block:true}:{});assert.equal(m.fighters[0].move,'heavy');
    run(m,70);assert.equal(m.fighters[1].hp,100);
    assert.equal(m.drainEvents().filter(e=>e.type==='swing').length,1);
  }
});

test('standing, airborne and retreating heavies cannot produce a forward rush',()=>{
  for(const kind of ['standing','airborne','retreating']){
    const m=make(),a=m.fighters[0];
    if(kind==='airborne'){tick(m,{jump:true});run(m,8,{right:true});}
    if(kind==='retreating'){a.x=700;m.fighters[1].x=1000;run(m,30,{left:true});}
    const x=a.x;tick(m,{heavy:true,run:true});run(m,30);
    assert.equal(a.runningAttack,false);assert.equal(a.x,x);
  }
});

test('holding phone HIT repeats after recovery and releases cleanly at the quicker pace',()=>{
  const m=make(),input=new InputState();input.pressTouch(1,'light');
  const starts=[];
  for(let i=0;i<120;i++){m.step(input.read());if(m.drainEvents().some(e=>e.type==='swing'))starts.push(i);}
  assert.ok(starts.length>=5);assert.ok(starts.slice(1).every((n,i)=>n-starts[i]>=24&&n-starts[i]<=27));
  input.releaseTouch(1);for(let i=0;i<60;i++)m.step(input.read());
  assert.equal(m.drainEvents().filter(e=>e.type==='swing').length,0);
});

test('a round win advances in 2.4 seconds and still resets both fighters for the next round',()=>{
  const m=make();m.fighters[1].hp=0;m.endRound(0,'KNOCKOUT');run(m,144);
  assert.equal(m.phase,'roundEnd');run(m,2);
  assert.equal(m.phase,'intro');assert.equal(m.round,2);assert.deepEqual(m.wins,[1,0]);
  assert.ok(m.fighters.every(f=>f.hp===100));assert.equal(m.remaining,99);
});
