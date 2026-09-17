import {readdir,readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {ARENAS} from '../dist/src/arenas.js';
import {checkRosterApprovals} from './roster-approval.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));const dist=path.join(root,'dist');
for(const file of await readdir(path.join(dist,'src')))if(file.endsWith('.js'))execFileSync(process.execPath,['--check',path.join(dist,'src',file)]);
const html=await readFile(path.join(dist,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="(\.\/[^"#?]+)(?:[?#][^"]*)?"/g))await access(path.join(dist,match[1]));
const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate HTML ids');
const main=await readFile(path.join(dist,'src/main.js'),'utf8');for(const match of main.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(match[1]),`Missing UI element ${match[1]}`);
const roster=JSON.parse(await readFile(path.join(dist,'assets/roster.json'),'utf8'));assert.equal(roster.length,36);assert.equal(new Set(roster.map(f=>f.id )).size,36);
checkRosterApprovals(roster,JSON.parse(await readFile(path.join(root,'roster-approvals.json'),'utf8')));
let count=0;
for(const f of roster){
  for(const key of ['power','speed','technique','toughness'])assert.ok(Number.isFinite(f[key])&&f[key]>0,`${f.name}: invalid ${key}`);
  await access(path.join(dist,f.atlas));await access(path.join(dist,`assets/${f.id}-portrait.png`));
  for(const animation of ['idle','walk','light','heavy','lift','throw','hurt','down','rise','victory','jump','pin']){
    assert.ok(f.animations[animation]?.length,`${f.name} missing ${animation}`);
  }
  if(f.edition)for(const action of ['run','climb','entry','dive','fallBack','fallFront','taunt','defeat','exhausted','chair','bat','guitar','trashcan','carryChair','carryBat','carryGuitar','carryTrashcan'])assert.ok(f.animations[action]?.length,`${f.name} missing supplied action ${action}`);
  for(const [animation,frames] of Object.entries(f.animations)){
    for(const frame of frames){assert.ok([frame.x,frame.y,frame.w,frame.h].every(Number.isFinite));assert.ok(frame.w>20&&frame.h>20&&frame.w<400&&frame.h<340,`${f.name} ${animation}: abnormal frame dimensions`);assert.ok(frame.x>=0&&frame.y>=0&&frame.x+frame.w<=f.atlasSize[0]&&frame.y+frame.h<=f.atlasSize[1],`${f.name} ${animation}: crop exceeds atlas`);assert.ok(Number.isFinite(frame.anchorX)&&frame.anchorX>=0&&frame.anchorX<=frame.w,`${f.name} ${animation}: invalid foot anchor`);assert.equal(frame.anchorY,frame.h);count++;}
  }
}
for(const arena of ARENAS){await access(path.join(dist,arena.src));if(arena.crop)assert.ok(arena.crop.every(Number.isFinite));}await access(path.join(dist,'assets/jcw-theme.mp3'));await access(path.join(dist,'assets/fight-club.ogg'));await access(path.join(dist,'assets/fight-club.mp3'));
console.log(`PASS: JavaScript syntax, UI references, ${roster.length} wrestlers, ${count} animation frames, ${ARENAS.length} arenas, both music tracks.`);
