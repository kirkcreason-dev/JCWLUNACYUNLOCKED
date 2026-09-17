// Native contact sheets from the shipped sprite metadata; no artwork is modified.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);let path;try{path=require.resolve('@napi-rs/canvas');}catch{path=`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`;}
const {createCanvas,loadImage}=await import(pathToFileURL(path));
const root=new URL('../',import.meta.url),roster=JSON.parse(await readFile(new URL('dist/assets/roster.json',root)));
await mkdir(new URL('review/',root),{recursive:true});
for(const group of (process.argv.length>2?process.argv.slice(2):['motion','combat','extra']))for(let page=0;page<6;page++){
 const rows=[];
 for(const f of roster.slice(page*6,page*6+6)){
  const atlas=await loadImage(new URL(`dist/assets/${f.id}.png`,root).pathname);
  const names=group==='motion'?['idle','walk','run','down','rise']:group==='combat'?['light','heavy','special','hurt','lift','throw','jump','pin','victory']:Object.keys(f.animations).filter(k=>!['idle','walk','run','down','rise','light','heavy','special','hurt','lift','throw','jump','pin','victory'].includes(k));
  const frames=names.flatMap(name=>(f.animations[name]||[]).map((frame,i)=>({name,i,frame})));
  for(let i=0;i<frames.length;i+=12)rows.push({f,atlas,frames:frames.slice(i,i+12)});
 }
 const canvas=createCanvas(1440,rows.length*160),c=canvas.getContext('2d');c.fillStyle='#292333';c.fillRect(0,0,canvas.width,canvas.height);
 rows.forEach((row,y)=>{row.frames.forEach(({name,i,frame:e},x)=>{
   const cx=x*120+60,cy=y*160+143,s=.45*(e.drawScale||1);c.save();c.translate(cx,cy);c.scale(e.flipX?-s:s,s);c.drawImage(row.atlas,e.x,e.y,e.w,e.h,-(e.anchorX??e.w/2),-(e.anchorY??e.h),e.w,e.h);c.restore();
   c.strokeStyle='#aaff4444';c.beginPath();c.moveTo(cx,cy-100);c.lineTo(cx,cy+3);c.stroke();c.fillStyle='#fff';c.font='11px sans-serif';c.fillText(`${name}[${i}] #${e.frame}`,x*120+3,y*160+27);
  });c.fillStyle='#fa8bcc';c.font='bold 12px sans-serif';c.fillText(row.f.name,3,y*160+12);
 });
 await writeFile(new URL(`review/${group}-${page+1}.png`,root),canvas.toBuffer('image/png'));
 if(group==='extra')for(let start=0;start<rows.length;start+=8){const part=createCanvas(1440,Math.min(8,rows.length-start)*160);part.getContext('2d').drawImage(canvas,0,start*160,1440,part.height,0,0,1440,part.height);await writeFile(new URL(`review/extra-${page+1}-part-${start/8+1}.png`,root),part.toBuffer('image/png'));}
}
console.log('Rendered the requested animation groups for all 36 fighters.');
