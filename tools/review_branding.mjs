// Native canvas artwork/placement review, not browser layout verification.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {drawArenaWordmarks,UNLOCKED_CROP,ARENA_WORDMARKS} from '../dist/src/branding.js';
const require=createRequire(import.meta.url);
let canvasPath;try{canvasPath=require.resolve('@napi-rs/canvas');}catch{canvasPath=`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`;}
const {createCanvas,loadImage}=await import(pathToFileURL(canvasPath));
const assets=new URL('../dist/assets/',import.meta.url),out=new URL('../review/',import.meta.url);await mkdir(out,{recursive:true});
const logo=await loadImage(await readFile(new URL('banners/unlocked.png',assets)));
const sheet=createCanvas(1280,1170),c=sheet.getContext('2d');c.fillStyle='#160b20';c.fillRect(0,0,1280,1170);
c.fillStyle='#b0ff20';c.font='bold 22px sans-serif';c.fillText('SUPPLIED UNLOCKED ARTWORK · UI SCALE + ARENA PLACEMENTS',24,32);
c.drawImage(logo,...UNLOCKED_CROP,24,54,750,192);
c.drawImage(logo,...UNLOCKED_CROP,820,75,290,74.24);
c.drawImage(logo,...UNLOCKED_CROP,820,175,60,15.36);
let row=0;
for(const index of [0,1,3]){
 const bg=await loadImage(await readFile(new URL(`arena-${index}.jpg`,assets))),arena=createCanvas(1672,941),a=arena.getContext('2d');
 a.drawImage(bg,0,0);drawArenaWordmarks(a,bg,index,logo,1672,941);
 await writeFile(new URL(`branding-arena-${index}.png`,out),arena.toBuffer('image/png'));
 for(const {box:[x,y,w,h]} of ARENA_WORDMARKS[index]){
  const sy=Math.max(0,y-24),sh=Math.min(941-sy,h+48),sw=Math.min(1672-x+20,w+40),sx=x-20;
  c.fillStyle='#b0ff20';c.font='bold 15px sans-serif';c.fillText(`ARENA ${index} · BEFORE / AFTER`,24,285+row*172);
  c.drawImage(bg,sx,sy,sw,sh,24,296+row*172,580,140);
  c.drawImage(arena,sx,sy,sw,sh,654,296+row*172,580,140);row++;
 }
}
await writeFile(new URL('branding-review.png',out),sheet.toBuffer('image/png'));
console.log('Reviewed exact logo at interface scales and all five arena sign/mat/apron placements.');
