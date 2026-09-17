import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,MOVES,STEP,emptyInput} from '../dist/src/engine.js';
import {InputState} from '../dist/src/input.js';
import {InputPackets,RemoteInput,packSnapshot,SnapshotBuffer,validSnapshot} from '../dist/src/online-protocol.js';
import {touchContext} from '../dist/src/touch-ui.js';
const roster=[0,1].map(i=>({id:`fighter-${i}`,name:`Fighter ${i}`,power:1,speed:1,toughness:1,weapons:['chair','bat','guitar','trashcan']}));
const make=()=>{const m=new Match(roster,0,1,{mode:'local'});m.phase='fight';m.fighters[0].x=500;m.fighters[1].x=580;return m;};
const tick=(m,a={},b={})=>m.step([{...emptyInput(),...a},{...emptyInput(),...b}]);
const run=(m,n,a={},b={})=>{for(let i=0;i<n;i++)tick(m,a,b);};
const command=(m,index,input)=>tick(m,index===0?input:{},index===1?input:{});
function windup(m,index,move='light'){
  const f=m.fighters[index];if(['bat','guitar','trashcan'].includes(move))f.weapon=move;
  if(move==='special')f.meter=100;
  command(m,index,{pressed:{[move==='special'?'special':move==='light'?'light':'heavy']:true}});
  while(f.t<MOVES[move].startup-STEP)tick(m);
}
function hit(m,index=0,move='light'){windup(m,index,move);tick(m);}

test('well-timed blocks reverse normal strikes and weapons from either player slot and ring direction',()=>{
  for(const index of [0,1])for(const swapped of [false,true])for(const move of ['light','heavy','bat','guitar','trashcan']){
    const m=make();if(swapped)[m.fighters[0].x,m.fighters[1].x]=[580,500];
    windup(m,index,move);command(m,1-index,{block:true});
    const [attacker,defender]=[m.fighters[index],m.fighters[1-index]];
    assert.equal(defender.hp,100);assert.equal(defender.guard,100);assert.equal(defender.meter,12);
    assert.equal(attacker.move,null);assert.equal(attacker.state,'hurt');assert.ok(attacker.stun>0);
    const events=m.drainEvents();assert.equal(events.filter(e=>e.type==='reversal').length,1);assert.equal(events.some(e=>e.type==='hit'),false);
    assert.equal(events.find(e=>e.type==='reversal').index,1-index);
  }
});

test('a reversal creates enough time to release guard and land a normal counter jab',()=>{
  const m=make();windup(m,0);tick(m,{}, {block:true});
  tick(m,{}, {light:true});run(m,20);
  assert.equal(m.fighters[0].hp,94);assert.equal(m.fighters[1].hp,100);
  assert.equal(m.drainEvents().filter(e=>e.type==='hit').length,1);
});

test('holding guard or tapping repeatedly during cooldown does not create repeated reversal windows',()=>{
  const m=make();tick(m,{}, {block:true});run(m,15,{}, {block:true});
  assert.equal(m.fighters[1].reversalWindow,0);
  for(let i=0;i<6;i++){tick(m);tick(m,{}, {block:true});assert.equal(m.fighters[1].reversalWindow,0);}
  run(m,80,{}, {block:true});assert.equal(m.fighters[1].reversalCooldown,0);assert.equal(m.fighters[1].reversalWindow,0);
  tick(m);tick(m,{}, {block:true});assert.ok(m.fighters[1].reversalWindow>0);
});

test('low guard and early block presses still take normal guard damage; releasing block takes the hit',()=>{
  for(const kind of ['lowGuard','early','released']){
    const m=make(),defender=m.fighters[1];
    if(kind==='lowGuard'){defender.guard=19;defender.guardDelay=1;windup(m,0);tick(m,{}, {block:true});}
    if(kind==='early'){tick(m,{}, {block:true});run(m,10,{}, {block:true});tick(m,{light:true},{block:true});run(m,9,{}, {block:true});}
    if(kind==='released'){
      tick(m,{heavy:true},{block:true});tick(m);run(m,22);
      assert.equal(defender.hp,87);assert.equal(m.drainEvents().some(e=>e.type==='reversal'),false);continue;
    }
    assert.equal(defender.hp,100);assert.ok(defender.guard<100);assert.equal(m.drainEvents().some(e=>e.type==='reversal'),false);
  }
});

test('finishers, grabs and dives retain their counters instead of being cancelled by a reversal',()=>{
  const special=make();windup(special,0,'special');tick(special,{}, {block:true});
  assert.equal(special.fighters[1].hp,100);assert.equal(special.fighters[1].guard,45);assert.equal(special.drainEvents().some(e=>e.type==='reversal'),false);
  const grab=make();tick(grab,{}, {block:true});tick(grab,{grapple:true},{block:true});assert.ok(grab.grapple);
  const dive=make();tick(dive,{}, {block:true});dive.fighters[0].state='dive';dive.fighters[0].z=70;dive.fighters[0].vz=-100;
  tick(dive,{}, {block:true});assert.equal(dive.fighters[0].state,'down');assert.equal(dive.fighters[1].guard,65);
  assert.equal(dive.drainEvents().some(e=>e.type==='reversal'),false);
});

test('pressing guard during hitstun cannot cancel it or grant a delayed reversal on recovery',()=>{
  const m=make(),f=m.fighters[1];f.state='hurt';f.stun=.2;
  run(m,14,{}, {block:true});assert.equal(f.state,'block');assert.equal(f.reversalWindow,0);assert.equal(f.reversalCooldown,0);
});

test('second wind grants meter and guard once at critical health without healing or cancelling a hit',()=>{
  const m=make(),f=m.fighters[1];f.hp=35;f.guard=40;f.guardDelay=10;
  hit(m);assert.equal(f.hp,29);assert.equal(f.meter,29.8);assert.equal(f.guard,60);assert.equal(f.secondWindUsed,true);assert.equal(f.state,'hurt');assert.ok(f.stun>0);
  run(m,60);hit(m);assert.equal(f.hp,23);assert.ok(Math.abs(f.meter-34.6)<1e-9);
  assert.equal(m.drainEvents().filter(e=>e.type==='secondWind').length,1);
  m.newRound();assert.equal(m.fighters[1].secondWindUsed,false);assert.equal(m.fighters[1].meter,0);assert.equal(m.fighters[1].reversalCooldown,0);
});

test('critical throws, dives and finishers grant second wind to either player, without rescuing a knockout',()=>{
  for(const index of [0,1])for(const move of ['grapple','dive','special']){
    const m=make(),a=m.fighters[index],b=m.fighters[1-index];b.hp=40;
    if(move==='grapple'){command(m,index,{grapple:true});run(m,120);}
    if(move==='special')hit(m,index,'special');
    if(move==='dive'){a.state='dive';a.z=70;a.vz=-100;tick(m);}
    assert.ok(b.hp>0&&b.hp<=30);assert.equal(b.secondWindUsed,true,`${index} ${move}`);
    assert.equal(m.drainEvents().filter(e=>e.type==='secondWind').length,1);
  }
  const ko=make();ko.fighters[1].hp=5;hit(ko);assert.equal(ko.phase,'roundEnd');assert.equal(ko.fighters[1].secondWindUsed,false);
  assert.equal(ko.drainEvents().some(e=>e.type==='secondWind'),false);
});

test('second wind respects the threshold, caps resources, and cannot be farmed from a missed dive',()=>{
  const healthy=make();healthy.fighters[1].hp=37;hit(healthy);assert.equal(healthy.fighters[1].hp,31);assert.equal(healthy.fighters[1].secondWindUsed,false);
  const critical=make();Object.assign(critical.fighters[1],{hp:36,meter:95,guard:90,guardDelay:5});hit(critical);
  assert.equal(critical.fighters[1].hp,30);assert.equal(critical.fighters[1].meter,100);assert.equal(critical.fighters[1].guard,100);
  const missed=make(),f=missed.fighters[0];f.hp=32;f.state='dive';f.z=0;missed.fighters[1].x=1000;tick(missed);
  assert.equal(f.hp,28);assert.equal(f.secondWindUsed,false);assert.equal(f.meter,0);
});

test('keyboard, touch and gamepad block presses all reverse an imminent strike',()=>{
  for(const device of ['keyboard','touch','gamepad']){
    const m=make(),input=new InputState();windup(m,1);
    if(device==='keyboard')input.pressKey('ArrowDown');
    if(device==='touch')input.pressTouch(1,'block');
    const pads=device==='gamepad'?[{index:0,connected:true,axes:[0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===4}))}]:[];
    m.step(input.read(pads));assert.equal(m.fighters[0].meter,12,device);assert.equal(m.fighters[0].hp,100);
  }
});

test('online re-presses preserve guard timing and both new events and comeback state reach the guest once',()=>{
  const packets=new InputPackets(),remote=new RemoteInput();
  packets.capture({...emptyInput(),block:true});remote.receive(packets.packet('guest'),'guest',0);remote.read(0);
  packets.capture(emptyInput());packets.capture({...emptyInput(),block:true,pressed:{block:true}});
  remote.receive(packets.packet('guest'),'guest',50);
  const m=make();windup(m,0);m.fighters[1].last.block=true;tick(m,{},remote.read(50));assert.equal(m.fighters[1].meter,12);
  const reversal=m.drainEvents().find(e=>e.type==='reversal');
  run(m,90);m.fighters[1].hp=35;hit(m);
  const events=[reversal,...m.drainEvents().filter(e=>e.type==='secondWind')].map((e,i)=>({...e,serial:i+1}));
  const packet=packSnapshot(m,1,events),guest=make(),buffer=new SnapshotBuffer(m.ids);
  assert.ok(buffer.receive(packet,100));buffer.apply(guest,150);
  assert.equal(guest.fighters[1].secondWindUsed,true);assert.equal(guest.fighters[1].meter,m.fighters[1].meter);
  assert.deepEqual(buffer.drainEvents().map(e=>e.type),['reversal','secondWind']);assert.equal(buffer.receive(packet,160),false);assert.deepEqual(buffer.drainEvents(),[]);
  assert.equal(validSnapshot({...packet,protocol:'lunacy-2d-v13'},m.ids),false);
  const invalid=structuredClone(packet);invalid.fighters[1].secondWindUsed='yes';assert.equal(validSnapshot(invalid,m.ids),false);
});

test('phone hints explain reversal timing while keeping pin escape and finisher cues first',()=>{
  const m=make();assert.match(touchContext(m).hint,/REVERSE/);
  m.fighters[0].meter=100;assert.match(touchContext(m).hint,/finisher/i);
  m.fighters[0].hp=20;m.startPin(1);assert.equal(touchContext(m).escape,true);assert.match(touchContext(m).hint,/KICK OUT/);
});
