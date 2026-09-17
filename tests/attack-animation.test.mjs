import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Match,MOVES,STEP,emptyInput} from '../dist/src/engine.js';
import {attackPose} from '../dist/src/attack-animation.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));

test('every fighter holds the contact pose throughout the actual damage window',()=>{
  for(const fighter of roster)for(const move of ['light','heavy','special']){
    if(move==='special'&&fighter.animations.special)continue; // Dedicated sequence is checked against real hits below.
    const timing=MOVES[move],expected=fighter.animations[move==='light'?'light':'heavy'][move==='light'?1:2];
    for(const time of [timing.startup,timing.startup+timing.active/2,timing.startup+timing.active-1e-6]){
      assert.equal(attackPose(fighter,move,time).frame,expected,`${fighter.name} ${move} impact`);
    }
    assert.notEqual(attackPose(fighter,move,timing.startup-1e-6).frame,expected);
    assert.notEqual(attackPose(fighter,move,timing.startup+timing.active+1e-6).frame,expected);
  }
});

test('a real match hit renders its contact pose and recovers to the original stance',()=>{
  for(let i=0;i<roster.length;i++)for(const facing of [-1,1]){
    const match=new Match(roster,i,(i+1)%roster.length,{mode:'local'});match.phase='fight';
    match.fighters[0].x=640;match.fighters[1].x=640+90*facing;
    match.step([{...emptyInput(),light:true},emptyInput()],STEP);
    for(let tick=0;tick<20&&match.fighters[1].hp===100;tick++)match.step([emptyInput(),emptyInput()],STEP);
    const fighter=match.fighters[0];
    assert.ok(match.fighters[1].hp<100);assert.equal(fighter.facing,facing);
    assert.equal(attackPose(fighter.definition,'light',fighter.t).frame,fighter.definition.animations.light[1]);
    const end=MOVES.light.startup+MOVES.light.active+MOVES.light.recovery;
    const settled=attackPose(fighter.definition,'light',end);
    assert.deepEqual(settled.frame,fighter.definition.animations.idle[0]);assert.equal(settled.offsetX,0);
  }
});

test('strike and throw metadata never selects detached dust, and retains facing corrections',()=>{
  for(const fighter of roster){
    for(const frame of [...fighter.animations.light,...fighter.animations.throw])assert.ok(frame.h>=100,`${fighter.name}: incomplete figure`);
    assert.equal(fighter.animations.light.length,4);
  }
  const willie=roster.find(f=>f.id==='willie-mack');
  assert.ok(willie.animations.throw.every(frame=>frame.flipX));
  assert.equal(willie.animations.light[1].flipX,true);
  assert.equal(willie.animations.light[1].drawScale,.84);
  assert.equal(willie.animations.light[3].flipX,undefined);
});
