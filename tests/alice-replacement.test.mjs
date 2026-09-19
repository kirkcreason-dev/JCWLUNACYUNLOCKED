import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Match,attackTiming} from '../dist/src/engine.js';
import {Renderer} from '../dist/src/render.js';
import {fighterAtlas,fighterPortrait} from '../dist/src/fighter-artwork.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url))),id=roster.findIndex(f=>f.id==='alice-crowley'),alice=roster[id];
const audit=JSON.parse(await readFile(new URL('../tools/alice-replacement-audit.json',import.meta.url)));

test('Alice replacement PNGs contain complete RGBA scanlines and the original source pack is preserved',async()=>{
 for(const file of ['alice-crowley.png','alice-crowley-portrait.png']){
  const bytes=await readFile(new URL(`../dist/assets/${file}`,import.meta.url));assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  let offset=8,ended=false,width,height;const data=[];
  while(offset+12<=bytes.length){
   const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert.ok(offset+length+12<=bytes.length,'Incomplete PNG chunk');
   if(type==='IHDR'){width=bytes.readUInt32BE(offset+8);height=bytes.readUInt32BE(offset+12);assert.equal(bytes[offset+16],8);assert.equal(bytes[offset+17],6);assert.equal(bytes[offset+20],0);}
   if(type==='IDAT')data.push(bytes.subarray(offset+8,offset+8+length));
   offset+=length+12;if(type==='IEND'){ended=true;break;}
  }
  assert.ok(ended,'Missing PNG end marker');assert.equal(offset,bytes.length);assert.equal(inflateSync(Buffer.concat(data)).length,(width*4+1)*height,'Every body row must decode');
  if(file==='alice-crowley.png'){assert.deepEqual([width,height],alice.atlasSize);assert.ok(width*height<=2048*1972,'Replacement must fit the previous texture budget');}
 }
 const source=await readFile(new URL('../source-packs/Alice-Crowley.zip',import.meta.url));assert.equal(createHash('sha256').update(source).digest('hex'),audit.sourceZipSHA256);assert.equal(audit.sourceSheets,26);assert.equal(new Set(audit.sheets.map(s=>s.source)).size,26);
});

test('Alice keeps full directional gaits, a proper kick, and matching fall/recovery endpoints',()=>{
 const a=alice.animations;assert.equal(roster.filter(f=>f.id==='alice-crowley').length,1);
 for(const name of ['walk','run','carryChair','carryBat','carryGuitar','carryTrashcan']){assert.equal(a[name].length,5);assert.ok(a[name].every(e=>!e.flipX&&e.h>=180&&e.h<=230));}
 assert.equal(a.kick.length,5);assert.ok(a.kick[2].w>a.kick[0].w);
 assert.deepEqual(a.fallFront.at(-1),a.down[0]);assert.deepEqual(a.fallBack.at(-1),a.down[1]);assert.deepEqual(a.rise[0],a.down[0]);assert.deepEqual(a.riseBack[0],a.down[1]);assert.ok(a.rise.at(-1).h>=210);
 for(const frame of [...a.down,...a.ko]){assert.ok(frame.w>frame.h);assert.ok(frame.w>=210&&frame.w<=230);}
});

test('Alice carries one authored weapon and adds one measured prop only during adapted weapon attacks',()=>{
 const ctx=new Proxy({},{get:()=>()=>{}}),m=new Match(roster,id,1,{mode:'local'});m.phase='fight';
 const r=new Renderer({getContext:()=>ctx},roster,{[id]:{}},[]);r.reduced=true;let props=0;r.weaponProp=()=>props++;
 for(const weapon of alice.weapons)for(const state of ['idle','walk','run','equip']){
  const f=m.fighters[0];Object.assign(f,{weapon,state,move:null,t:.2});props=0;r.fighter(f,0,m);assert.equal(props,0,`${weapon} ${state}: duplicate prop`);
 }
 for(const weapon of ['guitar','trashcan']){
  const f=m.fighters[0];Object.assign(f,{weapon,state:'idle',move:null,stun:0});m.startAttack(f,'heavy',0);f.t=attackTiming(f.move,f.attackStyle).startup+.01;props=0;r.fighter(f,0,m);assert.equal(props,1);
  assert.ok(alice.animations[weapon].every(e=>e.weaponGrip?.length===2&&e.weaponGrip.every(Number.isFinite)));
 }
});

test('Alice cache revision reaches both the atlas and every portrait surface without changing other fighters URLs',async()=>{
 assert.match(fighterAtlas(alice),/alice-crowley\.png\?v=2026-09-19$/);assert.match(fighterPortrait(alice),/alice-crowley-portrait\.png\?v=2026-09-19$/);
 assert.equal(fighterAtlas(roster[0]),roster[0].atlas);assert.equal(fighterPortrait(roster[0]),`./assets/${roster[0].id}-portrait.png`);
 const main=await readFile(new URL('../dist/src/main.js',import.meta.url),'utf8');assert.ok(main.includes('loadingImage(fighterAtlas(roster[index]))'));assert.ok(main.includes('fighterPortrait(opponent)'));assert.ok(main.includes('fighterPortrait(winner)'));assert.equal((main.match(/fighterPortrait\(f\)/g)||[]).length,2);
});
