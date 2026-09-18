// Native canvas review (not a browser or physical phone test).
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Renderer} from '../dist/src/render.js';
import {Match,MOVES,MOVEMENT_PACE,emptyInput,LEFT} from '../dist/src/engine.js';
import {phoneLayout,canvasSize} from '../dist/src/phone-layout.js';
const require=createRequire(import.meta.url);let path;try{path=require.resolve('@napi-rs/canvas');}catch{path=`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`;}
const {createCanvas,loadImage}=await import(pathToFileURL(path));
const root=new URL('../dist/assets/',import.meta.url),out=new URL('../review/',import.meta.url);await mkdir(out,{recursive:true});
const roster=JSON.parse(await readFile(new URL('roster.json',root))),arena=await loadImage(new URL('arena-0.jpg',root).pathname);
const modes=['idle','walk','run','jump','taunt','climb','fall','down','pin','bare','bat','bottle'];
for(const [page,start] of [0,10,20,30].entries()){
 const sheet=createCanvas(1800,Math.min(10,roster.length-start)*190),c=sheet.getContext('2d');c.fillStyle='#211827';c.fillRect(0,0,sheet.width,sheet.height);
 for(let id=start;id<Math.min(start+10,roster.length);id++){
  const atlas=await loadImage(new URL(`${roster[id].id}.png`,root).pathname);
  for(let k=0;k<modes.length;k++){
   const cell=createCanvas(150,170),cx=cell.getContext('2d');cx.translate(75,157);cx.scale(.55,.55);cx.translate(0,-593);
   const m=new Match(roster,id,0,{mode:'local'});m.phase='fight';const f=m.fighters[0];f.x=0;f.facing=1;f.walkDirection=1;f.weapon='none';f.t=.35;f.state=modes[k];
   if(f.state==='walk'||f.state==='run')f.t=2.1/((f.state==='run'?13:10)*f.definition.speed*MOVEMENT_PACE);
   if(f.state==='jump'){f.vz=0;f.z=0;}
   if(f.state==='climb')f.t=.55;
   if(f.state==='fall'){f.state='down';f.fallFace='back';f.fallDuration=.38;f.t=.17;}
   if(f.state==='down'){f.fallFace='back';f.t=1;}
   if(f.state==='pin'){f.state='pinned';f.t=1;}
   if(['bare','bat','bottle'].includes(f.state)){f.weapon=f.state==='bare'?'none':f.state==='bottle'&&f.definition.id!=='2-tuff-tony'?'trashcan':f.state;m.startAttack(f,'heavy',0);f.t=MOVES[f.move].startup+.01;}
   const r=new Renderer(cell,roster,{[id]:atlas},[]);r.reduced=true;r.fighter(f,0,m);
   c.drawImage(cell,k*150,(id-start)*190+20);c.fillStyle='#c4f783';c.font='12px sans-serif';c.fillText(`${id+1} ${roster[id].name} · ${modes[k]}`,k*150+4,(id-start)*190+16,144);
  }
 }
 await writeFile(new URL(`testers-roster-${page+1}.png`,out),sheet.toBuffer('image/png'));
}
const touchSheet=await loadImage(new URL('ui/touch-control-sheet.png',root).pathname),touchRegions=JSON.parse(await readFile(new URL('ui/touch-control-regions.json',root))).regions;
const ids=['2-tuff-tony','kerry-morton'].map(id=>roster.findIndex(f=>f.id===id)),atlases={};for(const id of ids)atlases[id]=await loadImage(new URL(`${roster[id].id}.png`,root).pathname);
for(const [w,h,safe] of [[390,844,{top:47,bottom:34}],[844,390,{left:47,right:47,bottom:21}],[320,480,{}]]){
 const l=phoneLayout({width:w,height:h,safe}),size=canvasSize({cssWidth:l.stage.width,touch:true,portrait:l.mode==='portrait',aspect:l.stage.width/l.stage.height,dpr:2});
 const canvas=createCanvas(size.width,size.height),r=new Renderer(canvas,roster,atlases,[arena]);r.reduced=true;r.portrait=l.mode==='portrait';r.compact=!r.portrait;r.logicalHeight=1280*l.stage.height/l.stage.width;
 const m=new Match(roster,...ids,{mode:'local'});m.phase='fight';m.fighters[0].x=510;m.fighters[1].x=650;m.fighters[0].weapon='bottle';
 r.draw(m,0,0);const sheet=createCanvas(w,h),c=sheet.getContext('2d');c.fillStyle='#0b090f';c.fillRect(0,0,w,h);c.drawImage(canvas,l.stage.x,l.stage.y,l.stage.width,l.stage.height);c.font='bold 12px sans-serif';
 for(const key of ['header','dpad','actions','weapon','taunt','hint']){const rect=l[key];c.strokeStyle='#63546b';c.strokeRect(rect.x,rect.y,rect.width,rect.height);c.fillStyle='#eee';c.fillText(key.toUpperCase(),rect.x+8,rect.y+18);}
 const drawButton=(name,r)=>{c.drawImage(touchSheet,...touchRegions[name],r.x,r.y,r.width,r.height);};
 drawButton('dpad',l.dpad);const pad=l.actions,gap=8,bw=(pad.width-gap)/2,bh=(pad.height-gap)/2;
 for(const [i,name] of ['hit','heavy','grab','finish'].entries())drawButton(name,{x:pad.x+(i%2)*(bw+gap),y:pad.y+Math.floor(i/2)*(bh+gap),width:bw,height:bh});
 c.fillStyle='#fff';c.font='bold 8px sans-serif';c.textAlign='center';c.fillText('BOTTLE',pad.x+bw+gap+bw/2,pad.y+bh*.88);c.fillText('0%',pad.x+bw+gap+bw/2,pad.y+bh+gap+bh*.88);
 await writeFile(new URL(`testers-phone-${w}x${h}.png`,out),sheet.toBuffer('image/png'));
}
console.log('Rendered all 39 fighters across 12 actions plus three phone geometry previews.');
