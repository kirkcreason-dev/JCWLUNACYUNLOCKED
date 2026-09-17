// Optional native-canvas review of real combat events, not a browser/device test.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Match,MOVES,STEP,emptyInput} from '../dist/src/engine.js';
import {Renderer} from '../dist/src/render.js';
const require=createRequire(import.meta.url);
let canvasPath;try{canvasPath=require.resolve('@napi-rs/canvas');}catch{canvasPath=`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`;}
const {createCanvas,loadImage}=await import(pathToFileURL(canvasPath));
const assets=new URL('../dist/assets/',import.meta.url),out=new URL('../review/',import.meta.url);await mkdir(out,{recursive:true});
const roster=JSON.parse(await readFile(new URL('roster.json',assets),'utf8')),atlases={};
for(const id of [33,34])atlases[id]=await loadImage(new URL(`${roster[id].id}.png`,assets).pathname);
const arenas=[await loadImage(new URL('arena-0.jpg',assets).pathname)];
const banners={unlocked:await loadImage(new URL('banners/unlocked.png',assets).pathname)};
for(const key of ['timeout'])banners[key]=await loadImage(new URL(`banners/${key}.png`,assets).pathname);
const sheet=createCanvas(640,1560),c=sheet.getContext('2d');c.fillStyle='#100a19';c.fillRect(0,0,640,1560);
for(const [row,mode] of ['desktop','portrait','landscape'].entries())for(const [column,event] of ['timeout'].entries()){
  const m=new Match(roster,33,34,{mode:'local'});m.phase='fight';m.fighters[0].x=590;m.fighters[1].x=680;
  m.remaining=0;m.drainEvents();m.step([emptyInput(),emptyInput()]);
  const events=m.drainEvents();assert.ok(events.some(e=>e.type==='roundEnd'&&e.method==='TIME LIMIT'));
  const canvas=createCanvas(1280,mode==='portrait'?960:720),r=new Renderer(canvas,roster,atlases,arenas,banners);
  r.portrait=mode==='portrait';r.compact=mode==='landscape';r.lowPower=mode!=='desktop';r.reduced=true;r.scheme=mode==='desktop'?'keyboard':'touch';
  r.receive(events,m);r.draw(m,0,0);
  await writeFile(new URL(`${event}-${mode}.png`,out),canvas.toBuffer('image/png'));
  const x=column*640,y=row*520;c.fillStyle='#b0ff20';c.font='bold 18px sans-serif';c.fillText(`${mode.toUpperCase()} / ${event.toUpperCase()}`,x+16,y+26);
  c.drawImage(canvas,x,y+36,640,mode==='portrait'?480:360);
}
await writeFile(new URL('timeout-review.png',out),sheet.toBuffer('image/png'));
console.log('Actual time-limit endings rendered in desktop, portrait and landscape.');
