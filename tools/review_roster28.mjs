// Actual Match/Renderer output plus schematic control bounds, not a browser screenshot.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Match} from '../dist/src/engine.js';
import {Renderer} from '../dist/src/render.js';
import {phoneLayout,canvasSize} from '../dist/src/phone-layout.js';
const require=createRequire(import.meta.url);
let canvasPath;try{canvasPath=require.resolve('@napi-rs/canvas');}catch{canvasPath=`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`;}
const {createCanvas,loadImage}=await import(pathToFileURL(canvasPath));
const assets=new URL('../dist/assets/',import.meta.url),out=new URL('../review/',import.meta.url);await mkdir(out,{recursive:true});
const roster=JSON.parse(await readFile(new URL('roster.json',assets),'utf8')),atlases={};
for(const id of [26,27])atlases[id]=await loadImage(await readFile(new URL(`${roster[id].id}.png`,assets)));
const unlocked=await loadImage(await readFile(new URL('banners/unlocked.png',assets)));
const arenas=[await loadImage(await readFile(new URL('arena-0.jpg',assets)))];
const cases=[{width:320,height:568},{width:390,height:844,safe:{top:47,bottom:34}},{width:844,height:390,safe:{left:47,right:47,bottom:21}},{width:568,height:320},{width:667,height:232,safe:{left:47,right:47,bottom:21}}];
const contact=createCanvas(1580,1180),sheet=contact.getContext('2d');sheet.fillStyle='#211726';sheet.fillRect(0,0,1580,1180);
for(let i=0;i<cases.length;i++){
 const config=cases[i],layout=phoneLayout({...config,online:i===2}),portrait=layout.mode==='portrait';
 const size=canvasSize({cssWidth:layout.stage.width,portrait,touch:true,dpr:3});
 const canvas=createCanvas(size.width,size.height),r=new Renderer(canvas,roster,atlases,arenas);r.bannerArt={unlocked};r.portrait=portrait;r.compact=!portrait;r.lowPower=true;r.reduced=true;r.scheme='touch';
 const m=new Match(roster,26,27,{mode:'local'});m.phase='fight';m.fighters[0].x=i===3?250:490;m.fighters[1].x=i===3?1060:650;m.fighters[1].hp=64;m.fighters[0].meter=100;
 r.draw(m,0,0);
 await writeFile(new URL(`phone-ring-${config.width}x${config.height}.png`,out),canvas.toBuffer('image/png'));
 const phone=createCanvas(config.width,config.height),c=phone.getContext('2d');c.fillStyle='#0b090f';c.fillRect(0,0,config.width,config.height);
 const text=(t,x,y,size=12,color='#eee')=>{c.fillStyle=color;c.font=`bold ${size}px sans-serif`;c.textAlign='center';c.fillText(t,x,y);};
 const box=(rect,label,color='#302636')=>{c.fillStyle=color;c.fillRect(rect.x,rect.y,rect.width,rect.height);text(label,rect.x+rect.width/2,rect.y+rect.height/2+4);};
 text('JCW',layout.header.x+24,layout.header.y+28,20,'#b0ff20');text('Ⅱ     ♪     ?     ⛶',layout.header.x+layout.header.width-90,layout.header.y+27,20);
 c.drawImage(canvas,layout.stage.x,layout.stage.y,layout.stage.width,layout.stage.height);
 const d=layout.dpad,s=d.width/3;for(const [x,y,label] of [[1,0,'JUMP'],[0,1,'◀'],[1,1,'JCW'],[2,1,'▶'],[1,2,'BLOCK']])box({x:d.x+x*s,y:d.y+y*s,width:s,height:s},label);
 const a=layout.actions,aw=(a.width-8)/2,ah=(a.height-8)/2;for(const [x,y,label,color] of [[0,0,'HIT','#263617'],[1,0,'HEAVY','#3f172c'],[0,1,'GRAB','#182e3e'],[1,1,'FINISH','#776122']])box({x:a.x+x*(aw+8),y:a.y+y*(ah+8),width:aw,height:ah},label,color);
 box(layout.weapon,'WEAPON');box(layout.taunt,'TAUNT');text('MOVE + ATTACK',layout.hint.x+layout.hint.width/2,layout.hint.y+20,12,'#d3c6dd');
 const pos=[[8,38],[344,38],[736,38],[736,500],[736,850]][i];sheet.drawImage(phone,...pos);sheet.fillStyle='#b0ff20';sheet.font='bold 15px sans-serif';sheet.fillText(`${config.width} × ${config.height} · ${size.width} px backing`,pos[0],pos[1]-10);
}
sheet.fillStyle='#d3c6dd';sheet.font='16px sans-serif';sheet.fillText('NATIVE CANVAS REVIEW · actual game render + schematic control bounds · no browser/device emulation',18,1157);
await writeFile(new URL('roster28-phone-review.png',out),contact.toBuffer('image/png'));
console.log('Rendered five phone viewport cases with the actual camera/HUD and computed control bounds.');
