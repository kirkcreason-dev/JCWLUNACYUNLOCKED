import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {RosterSelection} from '../dist/src/roster-selection.js';
import {Championship} from '../dist/src/championship.js';
import {ArcadeRewards} from '../dist/src/arcade-rewards.js';
import {attackPose} from '../dist/src/attack-animation.js';
import {MOVES,UNARMED_HEAVY} from '../dist/src/engine.js';
const read=p=>readFileSync(new URL(p,import.meta.url));
const roster=JSON.parse(read('../dist/assets/roster.json')),fighter=roster.at(-1);
const disk=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};

test('Evil Dead is the 40th selectable fighter on every phone/desktop layout with honest default balance',()=>{
  assert.equal(roster.length,40);assert.equal(fighter.id,'evil-dead');assert.equal(fighter.name,'Evil Dead');
  const picker=new RosterSelection(roster.length,6);
  for(const size of [6,8,12,6]){
    picker.choose(39);picker.resize(size);assert.equal(picker.selected,39);assert.ok(picker.visible.includes(39));
  }
  assert.deepEqual(picker.visible,[36,37,38,39]);
  assert.match(read('../dist/index.html').toString(),/40 FIGHTERS/);
  for(const key of ['power','speed','technique','toughness'])assert.equal(fighter[key],1);
  assert.equal(fighter.websiteStats,null);assert.equal(fighter.finisher,'LUNACY FINISHER');
  assert.match(fighter.balanceSource,/not supplied/);
});

test('all 31 source sheets are accounted for and the original Evil Dead pack is retained',()=>{
  const audit=JSON.parse(read('../tools/evil-dead-source-audit.json'));
  assert.equal(audit.sheets.length,31);assert.equal(new Set(audit.sheets.map(s=>s.source)).size,31);
  assert.equal(createHash('sha256').update(read('../source-packs/Evil-Dead.zip')).digest('hex'),audit.sourceSHA256);
  for(const sheet of audit.sheets){assert.ok(sheet.count>0);assert.match(sheet.sha256,/^[a-f0-9]{64}$/);}
  const a=fighter.animations;
  assert.equal(a.walk.length,5);assert.equal(a.run.length,6);assert.equal(a.climb.length,3);assert.ok(a.taunt.length>=4);
  for(const e of a.climb)assert.ok(e.h<=a.idle[0].h*1.1,'climbing retains body scale');
  for(const weapon of ['Chair','Bat','Guitar','Trashcan'])assert.equal(a[`carry${weapon}`].length,5);
  assert.deepEqual(a.fallFront.at(-1),a.down[0]);assert.deepEqual(a.fallBack.at(-1),a.down[1]);
  assert.deepEqual(a.rise[0],a.down[0]);assert.deepEqual(a.riseBack[0],a.down[1]);
  assert.deepEqual(a.rise.at(-1),a.idle[0]);assert.deepEqual(a.riseBack.at(-1),a.idle[0]);
  assert.deepEqual(a.ko[0],a.down[1]);
});

test('Evil Dead weapon contact uses the forward swing and unarmed heavy uses the extended kick',()=>{
  const A=fighter.animations;
  for(const [move,style] of [['heavy','chair'],['bat','bat'],['guitar','guitar'],['trashcan','trashcan']]){
    const pose=attackPose(fighter,move,MOVES[move].startup+.02,style);
    assert.equal(pose.frame,A[style][style==='trashcan'?3:2]);
    assert.ok(pose.frame.w>pose.frame.h*.7,`${style} forward contact`);
    assert.equal(pose.propGuitar,false);
  }
  assert.equal(attackPose(fighter,'heavy',UNARMED_HEAVY.startup+.01,'kick').frame,A.kick[2]);
});

test('Evil Dead earns and reloads championship titles and arcade rewards on every difficulty',()=>{
  const storage=disk();
  for(const difficulty of ['easy','normal','hard']){
    let mode=new Championship(roster,storage,()=>.4),result;
    for(let bout=0;bout<5;bout++)result=mode.settle(mode.start(fighter.id,difficulty,0),true);
    assert.equal(result.outcome,'crowned');mode=new Championship(roster,storage,()=>.7);
    assert.equal(mode.load(fighter.id,difficulty).phase,'defend');
    assert.equal(mode.settle(mode.start(fighter.id,difficulty,0),true).outcome,'defended');
    const rewards=new ArcadeRewards(roster,storage);
    assert.ok(rewards.award({fighter:fighter.id,difficulty,defeated:roster.slice(0,-1).map(f=>f.id),mode:'arcade',won:true}).fresh);
    assert.equal(new ArcadeRewards(roster,storage).get(fighter.id,difficulty).opponents,39);
  }
  assert.equal(new ArcadeRewards(roster,storage).triple(fighter.id),true);
});

test('adding Evil Dead preserves championship checkpoints and previously earned 38-opponent medals',()=>{
  const storage=disk(),previous=roster.slice(0,39),id='violent-j';
  const before=new Championship(previous,storage,()=>.2);
  before.settle(before.start(id,'normal',0),true);const checkpoint=before.load(id,'normal');
  assert.deepEqual(new Championship(roster,storage).load(id,'normal'),checkpoint);
  new ArcadeRewards(previous,storage).award({fighter:id,difficulty:'hard',defeated:previous.slice(1).map(f=>f.id),mode:'arcade',won:true});
  assert.equal(new ArcadeRewards(roster,storage).get(id,'hard').opponents,38);
});
