// Native canvas pixel regression. Optional @napi-rs/canvas; no browser/GPU emulation.
// Pass an optional baseline renderer module to measure the same regions before the fix.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Match} from '../dist/src/engine.js';
import {Renderer} from '../dist/src/render.js';
const require=createRequire(import.meta.url);
let canvasPath;try{canvasPath=require.resolve('@napi-rs/canvas');}catch{canvasPath=`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`;}
const {createCanvas,loadImage}=await import(pathToFileURL(canvasPath));
const assets=new URL('../dist/assets/',import.meta.url),out=new URL('../review/',import.meta.url);await mkdir(out,{recursive:true});
const roster=JSON.parse(await readFile(new URL('roster.json',assets),'utf8')),atlases={};
for(const id of [31,33,34])atlases[id]=await loadImage(await readFile(new URL(`${roster[id].id}.png`,assets)));
const arenas=await Promise.all(Array.from({length:6},(_,i)=>loadImage(new URL(`arena-${i}.jpg`,assets).pathname)));
const banners={unlocked:await loadImage(new URL('banners/unlocked.png',assets).pathname)};
const Baseline=process.argv[2]?(await import(pathToFileURL(process.argv[2]))).Renderer:null;
const reports=[];
for(const [label,Type] of [...(Baseline?[['before',Baseline]]:[]),['after',Renderer]]){
 for(const mode of ['desktop','portrait','landscape']){
  const height=mode==='portrait'?960:720,canvas=createCanvas(1280,height),r=new Type(canvas,roster,atlases,arenas,banners);
  r.portrait=mode==='portrait';r.compact=mode==='landscape';r.lowPower=mode!=='desktop';r.reduced=false;
  const m=new Match(roster,33,34,{mode:'local'});m.phase='fight';m.shake=18;
  const bands=mode==='desktop'?[[0,142],[660,60]]:mode==='portrait'?[[0,204],[909,51]]:[[0,204],[669,51]];
  let changed=0;
  for(let arena=0;arena<6;arena++){
   const pixels=[];
   for(const sample of [.01,.99]){
    const random=Math.random;try{Math.random=()=>sample;r.draw(m,arena,1/60);}finally{Math.random=random;}
    pixels.push(bands.map(([y,h])=>canvas.getContext('2d').getImageData(0,y,1280,h).data));
   }
   for(let b=0;b<bands.length;b++)for(let p=0;p<pixels[0][b].length;p+=4){
    if([0,1,2,3].some(c=>pixels[0][b][p+c]!==pixels[1][b][p+c]))changed++;
   }
  }
  reports.push({renderer:label,mode,changedPixelsAcrossSixArenas:changed});
  if(label==='after')assert.equal(changed,0,`${mode}: stationary HUD rails changed during shake`);
  await writeFile(new URL(`flicker-${label}-${mode}.png`,out),canvas.toBuffer('image/png'));
 }
}
console.log(JSON.stringify(reports,null,2));
await writeFile(new URL('flicker-review.json',out),JSON.stringify(reports,null,2));
