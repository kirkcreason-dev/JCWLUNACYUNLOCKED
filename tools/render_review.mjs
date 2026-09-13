// Native canvas review of actual Match transitions. Development tool only.
// Uses the optional @napi-rs/canvas package; the shipped game has no dependency on it.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
let canvasPath;try{canvasPath=require.resolve('@napi-rs/canvas');}catch{
  if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw new Error('Optional review tool: install @napi-rs/canvas with npm install --no-save @napi-rs/canvas');
  canvasPath=`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`;
}
const {createCanvas,loadImage}=await import(pathToFileURL(canvasPath));
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Match,STEP,emptyInput,LEFT} from '../dist/src/engine.js';
import {Renderer} from '../dist/src/render.js';
const assets=new URL('../dist/assets/',import.meta.url),out=new URL('../review/',import.meta.url);await mkdir(out,{recursive:true});
const roster=JSON.parse(await readFile(new URL('roster.json',assets),'utf8'));
const atlases={};for(let i=9;i<roster.length;i++)atlases[i]=await loadImage(await readFile(new URL(`${roster[i].id}.png`,assets)));
const arenas=[await loadImage(await readFile(new URL('arena-0.jpg',assets)))];
const canvas=createCanvas(1280,720),renderer=new Renderer(canvas,roster,atlases,arenas);renderer.reduced=true;
const step=(m,n,p1={},p2={})=>{for(let j=0;j<n;j++)m.step([{...emptyInput(),...p1},{...emptyInput(),...p2}],STEP);};
for(let id=9;id<roster.length;id++){
 if(process.argv[2]&&roster[id].id!==process.argv[2])continue;
 const sheet=createCanvas(1536,1152),ctx=sheet.getContext('2d');ctx.fillStyle='#19121e';ctx.fillRect(0,0,1536,1152);
 const cases=['HIT','HEAVY','CHAIR','BAT','GUITAR','TRASHCAN','LIFT','THROWN','PIN','CLIMB','DIVE','FALL'];
 for(let n=0;n<cases.length;n++){
  const label=cases[n],m=new Match(roster,id,(id-8)%(roster.length-9)+9,{mode:'local'});m.phase='fight';const [a,b]=m.fighters;a.x=515;b.x=620;
  if(['HIT','HEAVY','CHAIR','BAT','GUITAR','TRASHCAN'].includes(label)){
   if(!['HIT','HEAVY'].includes(label))a.weapon=label.toLowerCase();
   step(m,1,{[label==='HIT'?'light':'heavy']:true});for(let j=0;j<50&&b.hp===100;j++)step(m,1);
  }else if(['LIFT','THROWN'].includes(label)){b.x=600;step(m,1,{grapple:true});step(m,label==='LIFT'?43:56);}
  else if(label==='PIN'){b.x=595;m.knockDown(b,'back',0,10);b.hp=30;step(m,1,{grapple:true});step(m,30);}
  else if(['CLIMB','DIVE'].includes(label)){a.x=LEFT;b.x=630;step(m,1,{grapple:true});step(m,label==='CLIMB'?28:53);if(label==='DIVE'){step(m,1,{jump:true});step(m,26);}}
  else{m.knockDown(a,'front',.4,2.5);step(m,17);}
  renderer.reset();renderer.draw(m,0,0);const x=n%3*512,y=Math.floor(n/3)*288;
  ctx.drawImage(canvas,110,200,1000,420,x,y+30,512,250);ctx.fillStyle='#b0ff20';ctx.font='bold 18px sans-serif';ctx.fillText(`${roster[id].name.toUpperCase()} · ${label}`,x+12,y+22);
 }
 await writeFile(new URL(`${roster[id].id}-mechanics.png`,out),sheet.toBuffer('image/png'));
}
console.log('Actual-engine review sheets rendered.');
