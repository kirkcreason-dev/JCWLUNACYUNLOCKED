// Native game renderer only: no browser engine or physical-device claim.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Match,STEP,emptyInput,LEFT} from '../dist/src/engine.js';
import {Renderer} from '../dist/src/render.js';
import {phoneLayout,canvasSize} from '../dist/src/phone-layout.js';
const require=createRequire(import.meta.url);
let canvasPath;try{canvasPath=require.resolve('@napi-rs/canvas');}catch{canvasPath=`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`;}
const {createCanvas,loadImage}=await import(pathToFileURL(canvasPath));
const assets=new URL('../dist/assets/',import.meta.url),out=new URL('../review/',import.meta.url);await mkdir(out,{recursive:true});
const roster=JSON.parse(await readFile(new URL('roster.json',assets))),atlases={};
for(const id of [36,37,38])atlases[id]=await loadImage(await readFile(new URL(`${roster[id].id}.png`,assets)));
const arenas=[await loadImage(await readFile(new URL('arena-0.jpg',assets)))];
const canvas=createCanvas(1280,720),renderer=new Renderer(canvas,roster,atlases,arenas);renderer.reduced=true;
const step=(m,n,command={})=>{for(let j=0;j<n;j++)m.step([{...emptyInput(),...command},emptyInput()],STEP);};
for(const id of [36,37,38]){
 const sheet=createCanvas(1536,1152),ctx=sheet.getContext('2d');ctx.fillStyle='#19121e';ctx.fillRect(0,0,1536,1152);
 const cases=['HIT','HEAVY','CHAIR','BAT','GUITAR','TRASHCAN','LIFT','THROWN','PIN','CLIMB','DIVE','FALL'];
 for(let n=0;n<cases.length;n++){
  const label=cases[n],m=new Match(roster,id,36+(id-35)%3,{mode:'local'});m.phase='fight';const [a,b]=m.fighters;a.x=515;b.x=620;
  if(n<6){if(n>1)a.weapon=label.toLowerCase();step(m,1,{[label==='HIT'?'light':'heavy']:true});for(let j=0;j<50&&b.hp===100;j++)step(m,1);}
  else if(['LIFT','THROWN'].includes(label)){b.x=600;step(m,1,{grapple:true});step(m,label==='LIFT'?43:56);}
  else if(label==='PIN'){b.x=595;m.knockDown(b,'back',0,10);b.hp=30;step(m,1,{grapple:true});step(m,30);}
  else if(['CLIMB','DIVE'].includes(label)){a.x=LEFT;b.x=630;step(m,1,{grapple:true});step(m,label==='CLIMB'?28:53);if(label==='DIVE'){step(m,1,{jump:true});step(m,26);}}
  else{m.knockDown(a,'front',.4,2.5);step(m,17);}
  renderer.reset();renderer.draw(m,0,0);const x=n%3*512,y=Math.floor(n/3)*288;
  ctx.drawImage(canvas,110,200,1000,420,x,y+30,512,250);ctx.fillStyle='#b0ff20';ctx.font='bold 18px sans-serif';ctx.fillText(`${roster[id].name.toUpperCase()} · ${label}`,x+12,y+22);
 }
 await writeFile(new URL(`${roster[id].id}-mechanics.png`,out),sheet.toBuffer('image/png'));
}
for(const config of [{width:390,height:844,safe:{top:47,bottom:34}},{width:844,height:390,safe:{left:47,right:47,bottom:21}}]){
 const layout=phoneLayout(config),portrait=layout.mode==='portrait',size=canvasSize({cssWidth:layout.stage.width,portrait,touch:true,dpr:3});
 const c=createCanvas(size.width,size.height),r=new Renderer(c,roster,atlases,arenas);r.portrait=portrait;r.compact=!portrait;r.lowPower=true;r.reduced=true;r.scheme='touch';
 const m=new Match(roster,36,38,{mode:'local'});m.phase='fight';m.fighters[0].x=510;m.fighters[1].x=625;step(m,1,{heavy:true});step(m,15);r.draw(m,0,0);
 await writeFile(new URL(`roster39-${portrait?'portrait':'landscape'}.png`,out),c.toBuffer('image/png'));
}
console.log('PASS: rendered all three additions across 12 combat states and two phone canvas layouts.');
