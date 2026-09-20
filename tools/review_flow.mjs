// Optional DOM-model integration check. No browser engine, network or CSS rendering.
// npm install --prefix /tmp/lunacy-qa linkedom@0.18.12
// LUNACY_QA_NODE_MODULES=/tmp/lunacy-qa/node_modules node tools/review_flow.mjs
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),modulePath=require.resolve('linkedom',{paths:[process.env.LUNACY_QA_NODE_MODULES||'/tmp/lunacy-qa/node_modules']});
const {parseHTML}=await import(pathToFileURL(modulePath)),root=new URL('../dist/',import.meta.url);
const {window}=parseHTML(await readFile(new URL('index.html',root),'utf8')),document=window.document;
const memory=new Map();Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[]}});
Object.assign(globalThis,{window,document,localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},innerWidth:1280,innerHeight:900,devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:()=>{},requestAnimationFrame:()=>1,getComputedStyle:()=>({gridTemplateColumns:'1fr 1fr 1fr',getPropertyValue:()=>0}),HTMLSelectElement:window.HTMLSelectElement,HTMLInputElement:window.HTMLInputElement});
Object.defineProperty(document,'activeElement',{configurable:true,writable:true,value:null});
window.HTMLElement.prototype.focus=function(){document.activeElement=this;};window.HTMLElement.prototype.blur=function(){document.activeElement=null;};window.HTMLElement.prototype.getBoundingClientRect=()=>({width:1280,height:720,left:0,top:0});
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return this._value??this.querySelector('option[selected]')?.getAttribute('value')??this.querySelector('option')?.getAttribute('value')??'';},set(value){this._value=String(value);}});
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>(t[k]=v,true)});
document.getElementById('game').getContext=()=>ctx;
const media=document.getElementById('theme-audio');media.play=()=>Promise.resolve();media.pause=()=>{};media.canPlayType=()=>'';
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL(url,root),'utf8'))});
globalThis.Image=class{set src(value){this._src=value;this.width=4096;this.height=4096;if(value)queueMicrotask(()=>this.onload?.());}get src(){return this._src;}};
const temp=new URL('src/.review-flow-main.mjs',root),$=id=>document.getElementById(id);
try{
 const source=await readFile(new URL('src/main.js',root),'utf8');await writeFile(temp,source+'\nexport {startMatch,finishMatch,togglePause,closeHelp,quit};export const inspect=()=>({match,championships,arcadeRewards,paused,atlases,arenas});');
 const app=await import(temp.href);
 for(let i=0;i<100&&$('fight').disabled;i++)await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal($('fight').disabled,false);assert.equal($('roster').children.length,39);await $('enter-game').onclick();
 for(const [i,id] of ['josh-bishop','ring-rat','green-phantom'].entries()){$('roster-select').value=String(36+i);$('roster-select').onchange();assert.equal($('portrait').getAttribute('src'),`./assets/${id}-portrait.png`);assert.equal($('stats-source').textContent,'USER-APPROVED RATINGS');assert.equal($('stats-source').hasAttribute('href'),false);assert.equal($('stats').children.length,4);}
 $('roster-select').value='0';$('roster-select').onchange();assert.equal($('stats-source').getAttribute('href'),'https://jcwlunacy.net/');
 $('mode').value='cpu';await app.startMatch();app.togglePause(true);assert.equal($('pause').hidden,false);assert.equal($('pause-art').hidden,false);app.togglePause();assert.equal(app.inspect().paused,false);
 $('controls').onclick();assert.equal(app.inspect().paused,true);app.closeHelp();assert.equal(app.inspect().paused,false);
 app.quit();assert.equal(Object.keys(app.inspect().atlases).length,0);
 // Multiple arena changes must keep just the latest decoded scene.
 for(let i=0;i<6;i++){$('arena').value=String(i);await $('arena').onchange();}assert.equal(Object.keys(app.inspect().arenas).length,1);
 $('mode').value='championship';$('mode').onchange();
 for(let bout=0;bout<5;bout++){
  await app.startMatch();const {match}=app.inspect();match.phase='done';match.winner=0;match.wins=[2,0];app.finishMatch();
  assert.equal($('credits').hidden,bout!==4,`credits on bout ${bout+1}`);
 }
 assert.equal($('result').hidden,true);assert.equal($('credits-art').getAttribute('src'),'./assets/ui/championship-credits.png?v=0.20.0');assert.equal(document.activeElement.id,'credits-defend');
 const transcript=$('credits').textContent;for(const name of ['Kirk Creason','Brandon Pein','Andy Montgomery','Eric Goldstein','Nocturnal Deadhead','Jeff Lane','Kailyn Creason','Violent J','DJ Clay','3-Zee','Son of Man'])assert.ok(transcript.includes(name));
 assert.match($('credits-victory').textContent,/SAVED/);$('credits-back').onclick();assert.equal($('credits').hidden,true);assert.equal($('championship-belt').hidden,false);$('show-credits').onclick();assert.equal($('credits').hidden,false);
 await $('credits-defend').onclick();assert.equal($('credits').hidden,true);assert.equal(app.inspect().match.championshipBout.phase,'defend');
 // Defenses go to the result rather than replaying the completion screen.
 {const {match}=app.inspect();match.phase='done';match.winner=0;match.wins=[2,1];app.finishMatch();assert.equal($('credits').hidden,true);assert.equal($('result-title').textContent,'TITLE DEFENDED!');}
 app.quit();
 assert.equal($('haptics').disabled,true);assert.match($('haptics-status').textContent,/does not support/);
 $('touch-setting').value='on';$('touch-setting').onchange();
 for(const difficulty of ['easy','normal','hard']){
  $('mode').value='arcade';$('mode').onchange();$('difficulty').value=difficulty;$('difficulty').onchange();
  await app.startMatch();await new Promise(resolve=>setTimeout(resolve,0));assert.ok($('touch-controls').classList.contains('control-art'));
  for(let bout=0;bout<38;bout++){
   const {match}=app.inspect();match.phase='done';match.winner=0;match.wins=[2,0];app.finishMatch();
   assert.equal($('arcade-reward-result').hidden,bout!==37);
   if(bout<37){$('rematch').onclick();for(let i=0;i<100&&app.inspect().match===match;i++)await new Promise(resolve=>setTimeout(resolve,1));assert.notEqual(app.inspect().match,match);}
  }
  assert.ok(app.inspect().arcadeRewards.get('violent-j',difficulty));assert.match($('arcade-reward-result').textContent,/Saved on this browser/);app.quit();
 }
 assert.equal($('portrait').dataset.arcadeMedal,'triple');assert.match($('arcade-save').textContent,/TRIPLE CROWN/);
 $('mode').value='cpu';await app.startMatch();app.inspect().match.options.mode='online';app.togglePause();assert.equal($('pause-art').hidden,true);assert.equal($('pause-title').textContent,'ONLINE MATCH CONTINUES');
 console.log('PASS: DOM-model startup, roster, pause/help, arena eviction, championship progression, automatic supplied credits, title defense online-menu labeling, all three full arcade reward flows and touch artwork loading. No browser/device rendering claim.');
}finally{await unlink(temp).catch(()=>{});}
