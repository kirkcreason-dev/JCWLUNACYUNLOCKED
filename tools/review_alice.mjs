// Native renderer review; this is not a browser or physical-phone test.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Renderer} from '../dist/src/render.js';
import {Match,attackTiming} from '../dist/src/engine.js';
const require=createRequire(import.meta.url);let path;
try{path=require.resolve('@napi-rs/canvas');}catch{path=`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`;}
const {createCanvas,loadImage}=await import(pathToFileURL(path));
const root=new URL('../dist/assets/',import.meta.url),out=new URL('../review/',import.meta.url);await mkdir(out,{recursive:true});
const roster=JSON.parse(await readFile(new URL('roster.json',root))),id=roster.findIndex(f=>f.id==='alice-crowley');
const atlases={[id]:await loadImage(new URL('alice-crowley.png',root).pathname),1:await loadImage(new URL('2-tuff-tony.png',root).pathname)};
const arenas=[await loadImage(new URL('arena-0.jpg',root).pathname)],unlocked=await loadImage(new URL('banners/unlocked.png',root).pathname);
const states=['idle','walk','run','jump','block','light','bare','chair','bat','guitar','trashcan','taunt','climb','perch','dive','lifted','throw','hurt','fallFront','fallBack','down','pinned','rise','pin','victory','defeat'];
for(const facing of [1,-1]){
 const sheet=createCanvas(1680,Math.ceil(states.length/4)*310),c=sheet.getContext('2d');c.fillStyle='#302736';c.fillRect(0,0,sheet.width,sheet.height);
 for(const [n,state] of states.entries()){
  const cell=createCanvas(420,280),ctx=cell.getContext('2d');ctx.translate(210,267);ctx.translate(0,-593);
  const m=new Match(roster,id,1,{mode:'local'});m.phase='fight';const f=m.fighters[0];Object.assign(f,{x:0,facing,walkDirection:facing,state,t:.35,weapon:'none'});
  if(['bare','chair','bat','guitar','trashcan','light'].includes(state)){f.state='idle';f.weapon=['bare','light'].includes(state)?'none':state;m.startAttack(f,state==='light'?'light':'heavy',0);f.t=attackTiming(f.move,f.attackStyle).startup+.01;}
  if(state==='jump'){f.vz=0;f.z=0;}
  if(state==='dive'||state==='lifted')f.z=90;
  if(state==='fallFront'||state==='fallBack'){f.state='down';f.fallFace=state==='fallFront'?'front':'back';f.fallDuration=.4;f.t=.2;}
  if(['down','pinned'].includes(state)){f.fallFace='back';f.t=1;}
  const r=new Renderer(cell,roster,atlases,[]);r.reduced=true;r.fighter(f,0,m);
  c.drawImage(cell,n%4*420,Math.floor(n/4)*310+25);c.fillStyle='#e8f4d0';c.font='16px sans-serif';c.fillText(state,n%4*420+7,Math.floor(n/4)*310+20);
 }
 await writeFile(new URL(`alice-render-${facing}.png`,out),sheet.toBuffer('image/png'));
}
for(const [label,portrait,compact] of [['desktop',false,false],['portrait',true,false],['landscape',false,true]]){
 const canvas=createCanvas(1280,portrait?960:720),r=new Renderer(canvas,roster,atlases,arenas);r.bannerArt.unlocked=unlocked;r.reduced=true;r.portrait=portrait;r.compact=compact;
 const m=new Match(roster,id,1,{mode:'local'});m.phase='fight';m.fighters[0].x=350;m.fighters[1].x=900;
 r.draw(m,0,0);await writeFile(new URL(`alice-ring-${label}.png`,out),canvas.toBuffer('image/png'));
}
console.log('Rendered Alice in both facings, combat/ground/rope states, and three viewport modes.');
