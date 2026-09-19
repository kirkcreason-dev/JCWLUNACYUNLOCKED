// Native canvas review only; no browser engine or physical-device claims.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Renderer} from '../dist/src/render.js';
import {Match,emptyInput,LEFT,attackTiming} from '../dist/src/engine.js';
const require=createRequire(import.meta.url);let modulePath;try{modulePath=require.resolve('@napi-rs/canvas');}catch{modulePath=`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`;}
const {createCanvas,loadImage}=await import(pathToFileURL(modulePath));
const root=new URL('../dist/assets/',import.meta.url),out=new URL('../review/',import.meta.url);await mkdir(out,{recursive:true});
const roster=JSON.parse(await readFile(new URL('roster.json',root))),atlases={};
const shaggy=roster.findIndex(f=>f.id==='shaggy-2-dope');
const ids=[0,1,13,shaggy];for(const id of ids)atlases[id]=await loadImage(new URL(roster[id].atlas.replace('./assets/',''),root).pathname);
const arenas=[await loadImage(new URL('arena-0.jpg',root).pathname)];
const unlocked=await loadImage(new URL('banners/unlocked.png',root).pathname);
const weapons=['none','chair','bat','guitar','trashcan','bottle'];
for(const id of [0,1]){
 const sheet=createCanvas(1680,810),ctx=sheet.getContext('2d');ctx.fillStyle='#24182b';ctx.fillRect(0,0,1680,810);
 for(let w=0;w<weapons.length;w++)for(let k=0;k<3;k++){
  if(weapons[w]!=='none'&&!roster[id].weapons.includes(weapons[w]))continue;
  const cell=createCanvas(280,250),c=cell.getContext('2d'),m=new Match(roster,id,13,{mode:'local'});m.phase='fight';const f=m.fighters[0];f.x=0;f.weapon=weapons[w];m.startAttack(f,'heavy',0);const t=attackTiming(f.move,f.attackStyle);f.t=k===0?t.startup*.7:k===1?t.startup+.01:t.startup+t.active+t.recovery*.6;
  c.translate(87,238);c.scale(.86,.86);c.translate(0,-593);const r=new Renderer(cell,roster,atlases,[]);r.reduced=true;r.fighter(f,0,m);
  ctx.drawImage(cell,w*280,k*270);ctx.font='14px sans-serif';ctx.fillStyle='#e6f2d1';ctx.fillText(`${weapons[w]} · ${['wind-up','contact','recovery'][k]}`,w*280+9,k*270+265);
 }
 await writeFile(new URL(`weapons-${id}.png`,out),sheet.toBuffer('image/png'));
}
const m=new Match(roster,1,13,{mode:'pole-local'});m.phase='fight';const tick=(a={},b={})=>m.step([{...emptyInput(),...a},{...emptyInput(),...b}]);
function render(name,{portrait=false,compact=false,match=m}={}){const height=portrait?960:720,canvas=createCanvas(1280,height),r=new Renderer(canvas,roster,atlases,arenas);r.bannerArt.unlocked=unlocked;r.reduced=true;r.portrait=portrait;r.compact=compact;r.logicalHeight=height;r.draw(match,0,0);return writeFile(new URL(name,out),canvas.toBuffer('image/png'));}
m.fighters[0].x=LEFT;m.fighters[1].x=640;tick({grapple:true});for(let i=0;i<50;i++)tick();tick({taunt:true});for(let i=0;i<20;i++)tick();await render('pole-taunt-desktop.png');
for(let i=0;i<45;i++)tick();for(let i=0;i<25;i++)tick({grapple:true});await render('pole-claim-portrait.png',{portrait:true});await render('pole-claim-landscape.png',{compact:true});
m.fighters[1].x=m.fighters[0].x+90;tick({}, {grapple:true});for(let i=0;i<50;i++)tick();await render('superplex-lift.png');
for(let i=0;i<22;i++)tick();await render('superplex-flight.png');for(let i=0;i<60;i++)tick();await render('superplex-land.png');
const phoneMatch=new Match(roster,shaggy,1,{mode:'local'});phoneMatch.phase='fight';
for(const [label,positions] of [['center',[500,580]],['left',[200,280]],['opposite',[200,1080]],['right',[980,1080]]]){
 phoneMatch.fighters.forEach((f,i)=>{f.x=positions[i];f.facing=i?-1:1;});
 await render(`phone-corner-${label}.png`,{portrait:true,match:phoneMatch});
}
console.log('Native canvas weapon phases, pole phone views and superplex stages rendered to review/.');
