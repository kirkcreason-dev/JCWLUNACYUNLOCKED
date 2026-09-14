// Reproducible native-canvas review; this is not a browser/device test.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Match,emptyInput,LEFT,MOVES} from '../dist/src/engine.js';
import {Renderer} from '../dist/src/render.js';
const require=createRequire(import.meta.url);
let canvasPath;try{canvasPath=require.resolve('@napi-rs/canvas');}catch{canvasPath=`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`;}
const {createCanvas,loadImage}=await import(pathToFileURL(canvasPath));
const assets=new URL('../dist/assets/',import.meta.url),out=new URL('../review/',import.meta.url);await mkdir(out,{recursive:true});
const roster=JSON.parse(await readFile(new URL('roster.json',assets),'utf8'));
const atlases={};for(const id of [0,21,22,23])atlases[id]=await loadImage(await readFile(new URL(`${roster[id].id}.png`,assets)));
const arenas=[await loadImage(await readFile(new URL('arena-0.jpg',assets)))];
const sheet=createCanvas(1280,1176),ctx=sheet.getContext('2d');ctx.fillStyle='#130b18';ctx.fillRect(0,0,1280,1176);
const cases=['CONFIRMED THREE-HIT CHAIN','INTERRUPTING A HEAVY ATTACK','GRAB BREAK WINDOW','ROPE BREAK','DIVE THROUGH DEPLETED GUARD','PORTRAIT GRAB-BREAK CUE'];
for(let i=0;i<cases.length;i++){
 const portrait=i===5,canvas=createCanvas(1280,portrait?960:720),renderer=new Renderer(canvas,roster,atlases,arenas);renderer.reduced=true;renderer.portrait=portrait;
 const m=new Match(roster,23,22,{mode:'local'});m.phase='fight';const [a,b]=m.fighters;a.x=500;b.x=580;
 const tick=(p1={},p2={})=>{m.step([{...emptyInput(),...p1},{...emptyInput(),...p2}]);renderer.receive(m.drainEvents(),m);};
 const wait=(predicate)=>{for(let j=0;j<180&&!predicate();j++)tick();if(!predicate())throw new Error(cases[i]);};
 if(i===0){
  for(const action of ['light','light','heavy']){const hp=b.hp;tick({pressed:{[action]:true}});wait(()=>b.hp<hp);}
 }else if(i===1){tick({light:true},{heavy:true});wait(()=>b.hp<100);}
 else if(i===2||portrait){tick({}, {grapple:true});for(let j=0;j<5;j++)tick();}
 else if(i===3){b.x=LEFT+20;a.x=LEFT+95;a.facing=-1;b.hp=15;m.knockDown(b,'back',0,4);tick({grapple:true});wait(()=>!m.pin);}
 else{b.guard=15;b.state='block';a.state='dive';a.z=80;a.vz=-100;tick({}, {block:true});}
 renderer.draw(m,0,0);
 if(i===0||portrait)await writeFile(new URL(portrait?'gameplay-portrait.png':'gameplay-combo.png',out),canvas.toBuffer('image/png'));
 const x=i%2*640,y=Math.floor(i/2)*392;ctx.fillStyle='#b0ff20';ctx.font='bold 18px sans-serif';ctx.fillText(cases[i],x+16,y+23);
 ctx.drawImage(canvas,x+(portrait?80:0),y+32,portrait?480:640,360);
}
await writeFile(new URL('gameplay-review.png',out),sheet.toBuffer('image/png'));
console.log('Rendered six gameplay scenarios, including portrait HUD, through the actual Match/Renderer.');
