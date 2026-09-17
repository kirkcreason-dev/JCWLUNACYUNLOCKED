// Native render review; optional @napi-rs/canvas, no image asset changes.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {Renderer} from '../dist/src/render.js';
import {Match} from '../dist/src/engine.js';
const require=createRequire(import.meta.url);let path;try{path=require.resolve('@napi-rs/canvas');}catch{path=`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`;}
const {createCanvas,loadImage}=await import(pathToFileURL(path));
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url)));
const atlas=await loadImage(new URL('../dist/assets/2-tuff-tony.png',import.meta.url).pathname);
const sheet=createCanvas(1440,1440),c=sheet.getContext('2d');c.fillStyle='#201a2a';c.fillRect(0,0,1440,1440);
for(const [row,kind] of ['walk','run','down'].entries())for(const [side,facing] of [1,-1].entries())for(let i=0;i<6;i++){
 const cell=createCanvas(240,240),ctx=cell.getContext('2d');ctx.scale(.82,.82);ctx.translate(146,270-593);
 const m=new Match(roster,1,0,{mode:'local'});m.phase='fight';const f=m.fighters[0];f.x=0;f.facing=facing;f.walkDirection=facing;f.weapon='chair';f.state=kind;f.fallFace='front';f.fallDuration=.38;
 f.t=kind==='down'?[0,.19,.4,.7,1,1.4][i]:(i+.2)/((kind==='run'?13:10)*f.definition.speed*1.12);
 const renderer=new Renderer(cell,roster,{1:atlas},[]);renderer.reduced=true;renderer.fighter(f,0,m);
 const x=i*240,y=(row*2+side)*240;c.drawImage(cell,x,y);c.strokeStyle='#b0ff20';c.beginPath();c.moveTo(x+120,y+30);c.lineTo(x+120,y+225);c.stroke();c.fillStyle='#fff';c.font='14px sans-serif';c.fillText(`${kind} ${facing>0?'right':'left'} ${i+1}`,x+10,y+18);
}
await mkdir(new URL('../review/',import.meta.url),{recursive:true});await writeFile(new URL('../review/tony-motion.png',import.meta.url),sheet.toBuffer('image/png'));
