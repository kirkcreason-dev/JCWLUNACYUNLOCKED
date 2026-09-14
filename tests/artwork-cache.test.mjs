import test from 'node:test';
import assert from 'node:assert/strict';
import {retainMatchArtwork} from '../dist/src/artwork-cache.js';

test('an arcade run releases old art but retains both active fighters and the active arena',()=>{
 const atlases={},arenas={},promises=new Map();
 for(let opponent=1;opponent<24;opponent++){
  const player=atlases[0]||{id:0},enemy={id:opponent},arena={id:opponent%6};
  atlases[0]=player;atlases[opponent]=enemy;arenas[arena.id]=arena;
  promises.set(0,Promise.resolve());promises.set(opponent,Promise.resolve());promises.set(`arena-${arena.id}`,Promise.resolve());
  retainMatchArtwork(atlases,arenas,promises,[0,opponent],arena.id);
  assert.equal(atlases[0],player);assert.equal(atlases[opponent],enemy);assert.equal(arenas[arena.id],arena);
  assert.equal(Object.keys(atlases).length,2);assert.equal(Object.keys(arenas).length,1);assert.equal(promises.size,3);
 }
});
test('mirror matches keep their shared image and evicted fighters can be loaded again',()=>{
 const atlases={0:{},23:{}},arenas={0:{}},promises=new Map([[0,Promise.resolve()],[23,Promise.resolve()]]);
 retainMatchArtwork(atlases,arenas,promises,[23,23],0);assert.deepEqual(Object.keys(atlases),['23']);assert.equal(promises.has(0),false);
 const reloaded={fresh:true};atlases[0]=reloaded;promises.set(0,Promise.resolve());
 retainMatchArtwork(atlases,arenas,promises,[0,23],0);assert.equal(atlases[0],reloaded);assert.equal(Object.keys(atlases).length,2);
});
