import {Match,STEP,emptyInput} from './engine.js';
import {Renderer} from './render.js?v=0.12.1';
import {Input} from './input.js';
import {Sound} from './audio.js';
import {ARENAS} from './arenas.js';
import {touchContext} from './touch-ui.js';
import {OnlineSession} from './online.js?v=0.12.1';
import {connectFirebase} from './firebase-online.js';
import {SnapshotBuffer} from './online-protocol.js?v=0.12.1';
import {RosterSelection} from './roster-selection.js';
import {retainMatchArtwork} from './artwork-cache.js';
import {phoneLayout,canvasSize,resizeCanvas} from './phone-layout.js';
import {FramePacer} from './frame-pacer.js';
import {loadOptionalArtwork} from './optional-artwork.js?v=0.12.1';
const $=id=>document.getElementById(id);
const selection=$('selection'),pauseScreen=$('pause'),resultScreen=$('result'),helpScreen=$('help');
let roster=[],atlases={},arenas=[],renderer,match=null,chosen=0,arena=0,paused=false,helpWasPaused=false,arcadeOpponents=[],arcadeIndex=0,session=0,loading=false,returnFocus=null;
let onlineBusy=false,onlineStarted=false,onlineFailed=false,localIndex=0,snapshotBuffer=null;
let rosterSelection=null;
let artworkState=null;
let runtimeFault=null;
const net=new OnlineSession({connect:connectFirebase,prepare:prepareOnline,start:startOnline,
  snapshot:packet=>snapshotBuffer?.receive(packet,performance.now()),status:onlineStatus,ended:onlineEnded});
const imagePromises=new Map();
const sound=new Sound($('theme-audio'));
const coarse=matchMedia('(any-pointer:coarse)');
let preferences={muted:false,music:'theme',touch:'auto',repeat:true,haptics:true,quality:'auto'},touchSignature='',touchEscapeMode=false;
const framePacer=new FramePacer();
let viewportPending=false,lastPhoneOrientation=null,lastControlGeometry='';
try{const saved=JSON.parse(localStorage.getItem('lunacy-controls-v3')||'null');if(saved&&typeof saved==='object')preferences={...preferences,...saved};}catch{}
function savePreferences(){try{localStorage.setItem('lunacy-controls-v3',JSON.stringify(preferences));}catch{}}
const input=new Input(force=>togglePause(force));
const loadingImage=url=>new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Could not load ${url}`));image.src=url;});
function requestArtwork(bannerKeys=[],effectKeys=[]){
  if(!artworkState)return;
  void loadOptionalArtwork({
    banners:artworkState.banners,combatFx:artworkState.combatFx,state:artworkState,bannerKeys,effectKeys,
    loadImage:loadingImage,
    loadManifest:async()=>{const response=await fetch('./assets/fx/manifest.json');if(!response.ok)throw new Error('Effects unavailable');return response.json();},
    onChange:()=>framePacer.invalidate()
  });
}
function status(text){$('announcement').textContent=text;}
function modalState(){const active=[helpScreen,resultScreen,pauseScreen].find(el=>!el.hidden);$('cabinet').classList.toggle('selecting',!selection.hidden);$('cabinet').classList.toggle('modal-open',Boolean(active));selection.inert=Boolean(active)||loading;for(const el of [helpScreen,resultScreen,pauseScreen])el.inert=Boolean(active&&el!==active);updateTouch();return active;}
function showModal(element,button){returnFocus=document.activeElement;element.hidden=false;modalState();button?.focus();}
function hideModal(element){element.hidden=true;const active=modalState();if(active)active.querySelector('button')?.focus();else returnFocus?.focus?.();}
function updateTouch(){
  const showing=Boolean(match&&selection.hidden&&(coarse.matches||preferences.touch==='on'));
  $('touch-controls').hidden=!showing;$('cabinet').classList.toggle('playing-touch',showing);
  $('cabinet').classList.toggle('in-match',Boolean(match&&selection.hidden));
  $('touch-controls').inert=paused||match?.phase==='done'||!helpScreen.hidden||!resultScreen.hidden||!pauseScreen.hidden;
  $('touch-controls').classList.toggle('inactive',$('touch-controls').inert);
  updatePhoneLayout(showing);framePacer.invalidate();
}
const phoneNodes={header:document.querySelector('.topbar'),network:$('network-banner'),stage:$('stage-wrap'),dpad:$('dpad'),actions:document.querySelector('.action-pad'),weapon:document.querySelector('[data-key="weapon"]'),taunt:document.querySelector('[data-key="taunt"]'),hint:$('touch-hint')};
function updatePhoneLayout(showing){
  const cabinet=$('cabinet'),viewport=globalThis.visualViewport;
  // Do not rearrange the interface while a user is pinch-zooming it.
  const unzoomed=!viewport||Math.abs(viewport.scale-1)<.01;
  const width=unzoomed&&viewport?viewport.width:innerWidth,height=unzoomed&&viewport?viewport.height:innerHeight;
  const enabled=showing&&width<=1024&&(width<=650||height<=600)&&height>=200;
  let layout=null;
  if(enabled){
    const css=getComputedStyle(cabinet),safe=Object.fromEntries(['top','right','bottom','left'].map(k=>[k,parseFloat(css.getPropertyValue(`--safe-${k}`))||0]));
    layout=phoneLayout({width,height,safe,online:!$('network-banner').hidden});
    cabinet.dataset.phoneLayout=layout.mode;
    cabinet.classList.toggle('phone-short',layout.short);
    cabinet.style.setProperty('--phone-height',`${height}px`);
    cabinet.classList.toggle('phone-online',!$('network-banner').hidden);
    const geometry=JSON.stringify([layout.dpad,layout.actions]);if(geometry!==lastControlGeometry){input.clearTouch();lastControlGeometry=geometry;}
    Object.assign(cabinet.style,{width:`${width}px`,height:`${height}px`,left:`${unzoomed&&viewport?viewport.offsetLeft:0}px`,top:`${unzoomed&&viewport?viewport.offsetTop:0}px`});
    for(const [key,node] of Object.entries(phoneNodes)){
      const r=layout[key];Object.assign(node.style,{left:`${r.x}px`,top:`${r.y}px`,width:`${r.width}px`,height:`${r.height}px`});
    }
    const rotated=lastPhoneOrientation&&lastPhoneOrientation!==layout.mode;lastPhoneOrientation=layout.mode;
    if(rotated){input.clear();match?.clearInputs();if(net.active){net.capture(emptyInput());net.sendInput(true);}else if(match&&!paused)togglePause(true);}
  }else{
    delete cabinet.dataset.phoneLayout;lastPhoneOrientation=null;lastControlGeometry='';cabinet.classList.remove('phone-online','phone-short');cabinet.style.removeProperty('--phone-height');
    for(const node of [cabinet,...Object.values(phoneNodes)])for(const key of ['left','top','width','height'])node.style.removeProperty(key);
  }
  document.body.classList.toggle('phone-match',enabled);
  if(renderer){
    renderer.portrait=layout?.mode==='portrait';renderer.compact=layout?.mode==='landscape';
    renderer.lowPower=showing||preferences.quality==='battery';
    const cssWidth=layout?.stage.width||$('stage-wrap').getBoundingClientRect().width;
    resizeCanvas(renderer.canvas,canvasSize({cssWidth,portrait:renderer.portrait,touch:showing,dpr:devicePixelRatio||1,quality:preferences.quality}));
  }
}
function scheduleViewport(){viewportPending=true;}
function updateTouchContext(){
  if(!match||$('touch-controls').hidden)return;
  const context=touchContext(match,localIndex),signature=JSON.stringify(context);if(signature===touchSignature)return;touchSignature=signature;
  if(context.escape!==touchEscapeMode){input.clearTouch();touchEscapeMode=context.escape;}
  $('touch-hint').textContent=context.hint;$('grab-label').textContent=context.grabLabel;$('grab-detail').textContent=context.grabDetail;
  $('touch-grapple').setAttribute('aria-label',context.grabLabel==='RELEASE'?'Release hold':context.grabLabel==='PIN'?'Pin opponent':context.grabLabel==='BREAK'?'Break grapple':context.grabLabel==='CLIMB'?'Climb top rope':context.grabLabel==='DIVE'?'Top rope dive':'Grapple');
  $('heavy-detail').textContent=context.heavy;$('weapon-detail').textContent=context.weapon==='NONE'?'BARE HANDS':context.weapon;
  $('touch-special').classList.toggle('ready',context.ready);$('touch-special').style.setProperty('--charge',`${context.meter}%`);
  $('finish-detail').textContent=context.ready?'READY!':`${context.meter}%`;
  $('touch-special').setAttribute('aria-label',context.ready?'Finisher ready':`Finisher charging: ${context.meter} percent`);
  $('touch-controls').classList.toggle('escaping',context.escape);$('touch-escape').hidden=!context.escape;
  $('escape-label').textContent=context.escapeLabel;$('escape-fill').style.width=`${context.escapeProgress*100}%`;
}
function rosterPageSize(){return matchMedia('(max-width:650px) and (orientation:portrait)').matches?6:matchMedia('(max-width:1000px), (max-height:600px)').matches?8:12;}
function renderRosterPage(){
  if(!rosterSelection)return;
  const visible=rosterSelection.visible,focus=visible.includes(chosen)?chosen:visible[0];
  Array.from($('roster').children).forEach((b,i)=>{b.hidden=!visible.includes(i);if(!b.hidden){const img=b.querySelector('img');if(!img.getAttribute('src'))img.src=img.dataset.src;}b.setAttribute('aria-pressed',String(i===chosen));b.tabIndex=i===focus?0:-1;b.disabled=onlineBusy;});
  $('roster-page').textContent=`${visible[0]+1}–${visible.at(-1)+1} OF ${roster.length} · PAGE ${rosterSelection.page+1}/${rosterSelection.pages}`;
  $('roster-prev').disabled=onlineBusy||rosterSelection.page===0;$('roster-next').disabled=onlineBusy||rosterSelection.page===rosterSelection.pages-1;
  $('roster-select').value=String(chosen);$('selected-fighter').textContent=roster[chosen].name.toUpperCase();
}
function setSelectionPanel(panel){
  selection.dataset.panel=panel;$('show-roster').setAttribute('aria-pressed',String(panel==='roster'));$('show-setup').setAttribute('aria-pressed',String(panel==='setup'));
}
function resizeRoster(){if(rosterSelection){rosterSelection.resize(rosterPageSize());renderRosterPage();}}
function choose(index){if(!rosterSelection?.choose(index))return;chosen=index;const f=roster[index];
  renderRosterPage();
  $('portrait').src=`./assets/${f.id}-portrait.png`;$('portrait').alt=f.name;$('fighter-name').textContent=f.name;$('fighter-style').textContent=f.style.toUpperCase();
  $('finisher-name').textContent=f.websiteStats?.finisher||f.finisher;
  $('stats').replaceChildren();
  if(f.websiteStats){
    for(const key of ['power','speed','technique','toughness']){
      const value=f.websiteStats[key],stat=document.createElement('div');stat.className='stat';
      const name=document.createElement('span');name.textContent=key.toUpperCase();
      const track=document.createElement('i');track.className='stat-track';track.setAttribute('aria-hidden','true');
      const fill=document.createElement('i');fill.className='stat-fill';fill.style.width=`${value*10}%`;track.append(fill);
      const score=document.createElement('b');score.textContent=`${value}/10`;stat.append(name,track,score);$('stats').append(stat);
    }
  }else{const note=document.createElement('p');note.className='stats-unlisted';note.textContent='Website ratings not listed. Original game balance.';$('stats').append(note);}
  $('stats-source').textContent=f.websiteStats?'JCW WEBSITE RATINGS ↗':'JCW ROSTER ↗';
  updateOpponent();
}
function updateOpponent(){
  if(!roster.length)return;
  const mode=$('mode').value,opponent=roster[Number($('opponent').value)||0];
  $('versus-name').textContent=mode==='online'?'ROOM CODES + QUICK MATCH':mode==='arcade'?`${roster.length-1} OPPONENTS. ONE CHAMPION.`:`VS ${opponent.name.toUpperCase()}`;
  $('versus-avatar').hidden=mode==='arcade'||mode==='online';$('versus-avatar').src=`./assets/${opponent.id}-portrait.png`;
  $('versus-label').textContent=mode==='online'?'ONLINE MULTIPLAYER':mode==='arcade'?'ARCADE RUN':mode==='local'?'PLAYER 2':mode==='practice'?'PRACTICE PARTNER':'CPU OPPONENT';
}
function buildRoster(){
  rosterSelection=new RosterSelection(roster.length,rosterPageSize());
  $('roster-count').textContent=`${roster.length} FIGHTERS`;
  $('show-roster').textContent=`FIGHTERS · ${roster.length}`;
  roster.forEach((f,i)=>{
    const b=document.createElement('button');b.className='fighter-card';b.style.setProperty('--fighter',f.color);b.setAttribute('aria-label',f.name);b.setAttribute('aria-pressed','false');
    const img=document.createElement('img');img.dataset.src=`./assets/${f.id}-portrait.png`;img.alt='';img.decoding='async';const name=document.createElement('span');name.textContent=f.name.toUpperCase();b.append(img,name);b.onclick=()=>choose(i);$('roster').append(b);
    const option=document.createElement('option');option.value=i;option.textContent=f.name.toUpperCase();$('opponent').append(option);
    $('roster-select').append(option.cloneNode(true));
  });$('opponent').value='1';choose(0);
  $('roster-select').onchange=()=>choose(Number($('roster-select').value));
  $('roster-prev').onclick=()=>{rosterSelection.turn(-1);renderRosterPage();};
  $('roster-next').onclick=()=>{rosterSelection.turn(1);renderRosterPage();};
  $('show-roster').onclick=()=>setSelectionPanel('roster');$('show-setup').onclick=()=>setSelectionPanel('setup');
  $('confirm-fighter').onclick=()=>{setSelectionPanel('setup');$('mode').focus();};
  $('mode').onchange=()=>{const mode=$('mode').value;$('difficulty-label').hidden=['local','practice','online'].includes(mode);$('opponent').parentElement.hidden=mode==='arcade'||mode==='online';$('opponent-label').textContent=mode==='local'?'PLAYER 2':'OPPONENT';$('online-lobby').hidden=mode!=='online';$('fight').hidden=mode==='online';updateOpponent();};
  $('opponent').onchange=updateOpponent;
  $('roster').addEventListener('keydown',event=>{
    const columns=getComputedStyle($('roster')).gridTemplateColumns.split(' ').length,current=Array.from($('roster').children).indexOf(event.target);
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns,PageUp:-rosterSelection.pageSize,PageDown:rosterSelection.pageSize}[event.key];
    if(current>=0&&(delta||event.key==='Home'||event.key==='End')){event.preventDefault();choose(event.key==='Home'?0:event.key==='End'?roster.length-1:(current+delta+roster.length)%roster.length);$('roster').children[chosen].focus();}
  });
}
async function loadFighter(index){
  if(atlases[index])return;
  if(!imagePromises.has(index)){
    let pending;
    pending=loadingImage(roster[index].atlas).then(image=>{
      // A match can be changed while an image is decoding. Do not let a stale
      // completion repopulate the cache after retainMatchArtwork evicted it.
      if(imagePromises.get(index)===pending)atlases[index]=image;
      else if(typeof image.src==='string'){try{image.src='';}catch{}}
      return image;
    }).catch(error=>{if(imagePromises.get(index)===pending)imagePromises.delete(index);throw error;});
    imagePromises.set(index,pending);
  }
  await imagePromises.get(index);
}
async function loadArena(index){
  if(arenas[index])return;
  const key=`arena-${index}`;
  if(!imagePromises.has(key)){
    let pending;
    pending=loadingImage(ARENAS[index].src).then(image=>{
      if(imagePromises.get(key)===pending)arenas[index]=image;
      else if(typeof image.src==='string'){try{image.src='';}catch{}}
      return image;
    }).catch(error=>{if(imagePromises.get(key)===pending)imagePromises.delete(key);throw error;});
    imagePromises.set(key,pending);
  }
  await imagePromises.get(key);
}
async function startMatch(nextArcade=false){
  if($('mode').value==='online'||net.active||onlineBusy)return;
  if(loading)return;loading=true;runtimeFault=null;modalState();const thisSession=++session;$('fight').disabled=true;$('fight').textContent='ENTERING THE RING…';
  try{
    const mode=$('mode').value;arena=Number($('arena').value);
    if(mode==='arcade'&&!nextArcade){arcadeOpponents=roster.map((_,i)=>i).filter(i=>i!==chosen); // Fisher-Yates keeps an unbiased, complete roster run.
      for(let i=arcadeOpponents.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arcadeOpponents[i],arcadeOpponents[j]]=[arcadeOpponents[j],arcadeOpponents[i]];}arcadeIndex=0;}
    const opponent=mode==='arcade'?arcadeOpponents[arcadeIndex]:Number($('opponent').value);
    if(mode==='arcade')arena=(Number($('arena').value)+arcadeIndex)%ARENAS.length;
    await Promise.all([loadFighter(chosen),loadFighter(opponent),loadArena(arena)]);
    if(thisSession!==session)return;
    localIndex=0;renderer.localIndex=0;onlineStarted=false;onlineFailed=false;$('network-banner').hidden=true;$('pause-button').setAttribute('aria-label','Pause match');
    match=new Match(roster,chosen,opponent,{mode,difficulty:$('difficulty').value,arcadeIndex});
    retainMatchArtwork(atlases,arenas,imagePromises,match.ids,arena);
    paused=false;selection.hidden=true;pauseScreen.hidden=true;resultScreen.hidden=true;helpScreen.hidden=true;modalState();input.active=true;input.setMode(mode);if(coarse.matches||preferences.touch==='on')input.scheme='touch';renderer.reset();touchSignature='';$('pause-button').hidden=false;updateTouch();sound.resume();
    $('footer-status').textContent=mode==='local'?'LOCAL VERSUS · TWO PLAYERS. ONE RING.':mode==='arcade'?`ARCADE RUN · OPPONENT ${arcadeIndex+1} OF ${roster.length-1}`:mode==='practice'?'PRACTICE · FULL METER · AUTO RESET':'VS CPU · BEST OF THREE';
    document.activeElement?.blur();status(`Round 1. ${roster[chosen].name} versus ${roster[opponent].name}.`);
  }catch(error){status('The match artwork could not load. Try again.');$('footer-status').textContent='COULD NOT LOAD MATCH ARTWORK. PRESS FIGHT TO RETRY.';console.error(error);}
  finally{loading=false;modalState();$('fight').disabled=false;$('fight').textContent='FIGHT';}
}
function togglePause(force){
  if(!match||match.phase==='done'||!selection.hidden||!helpScreen.hidden)return;
  if(match.options.mode==='online'){
    input.clear();net.capture(emptyInput());net.sendInput(true);
    if(force===true||onlineFailed)return;
    $('pause-title').textContent='ONLINE MATCH CONTINUES';$('pause-detail').textContent='The other player is still in the ring. Return to the fight or leave the match.';$('pause-detail').hidden=false;
    $('restart').hidden=true;$('resume').hidden=false;
    if(pauseScreen.hidden)showModal(pauseScreen,$('resume'));else hideModal(pauseScreen);
    updateTouch();return;
  }
  $('pause-title').textContent='MATCH PAUSED';$('pause-detail').hidden=true;$('restart').hidden=false;$('resume').hidden=false;
  paused=force===true?true:!paused;input.clear();match.clearInputs();if(paused){showModal(pauseScreen,$('resume'));sound.suspend();}else{pauseScreen.hidden=true;modalState();sound.resume();document.activeElement?.blur();}updateTouch();
}
function quit(){session++;runtimeFault=null;net.leave().catch(()=>{});onlineStarted=false;onlineFailed=false;setOnlineBusy(false);snapshotBuffer=null;localIndex=0;renderer.localIndex=0;match=null;paused=false;input.active=false;input.clear();selection.hidden=false;pauseScreen.hidden=true;resultScreen.hidden=true;helpScreen.hidden=true;modalState();renderer.reset();sound.resume();$('pause-button').hidden=true;$('network-banner').hidden=true;$('room-share').hidden=true;$('online-status').textContent='Create a room, join a friend, or try Quick Match.';updateTouch();$('footer-status').textContent='SELECT YOUR FIGHTER. SETTLE IT IN THE RING.';($('mode').value==='online'?$('online-quick'):$('fight')).focus();}
function finishMatch(){
  input.active=false;input.clear();$('pause-button').hidden=true;
  const won=match.winner===localIndex,arcade=match.options.mode==='arcade',champion=arcade&&won&&arcadeIndex===arcadeOpponents.length-1;
  $('result-win-art').hidden=!(won||match.options.mode==='local');
  $('result-title').textContent=champion?'LUNACY CHAMPION':`${match.fighters[match.winner].definition.name.toUpperCase()} WINS`;
  $('result-method').textContent=champion?'ENTIRE ROSTER DEFEATED':match.method;
  $('result-detail').textContent=`${match.wins[0]} — ${match.wins[1]}${arcade?` · ${Math.min(arcadeOpponents.length,arcadeIndex+(won?1:0))} of ${arcadeOpponents.length} opponents defeated`:''}`;
  const winner=match.fighters[match.winner].definition;$('winner-portrait').src=`./assets/${winner.id}-portrait.png`;$('winner-portrait').alt=winner.name;
  $('rematch').textContent=match.options.mode==='online'?'BACK TO ONLINE LOBBY':arcade&&won&&!champion?'NEXT OPPONENT':arcade?'NEW ARCADE RUN':'REMATCH';
  showModal(resultScreen,$('rematch'));status($('result-title').textContent);
}
function setOnlineBusy(busy){
  onlineBusy=busy;
  for(const id of ['online-quick','online-create','online-join','join-code','mode','arena','roster-select','confirm-fighter','show-roster','show-setup'])$(id).disabled=busy;
  document.querySelectorAll('.fighter-card').forEach(button=>button.disabled=busy);
  renderRosterPage();
  $('online-cancel').hidden=!busy;
}
function onlineStatus(message,code){
  $('online-status').textContent=message;
  if(code){$('room-code').textContent=code;$('room-share').hidden=onlineStarted;}
  if(onlineStarted){$('network-banner').textContent=message;$('network-banner').hidden=false;}
}
async function beginOnline(kind){
  if(onlineBusy)return;
  const ticket=++session;onlineFailed=false;setOnlineBusy(true);$('room-share').hidden=true;
  try{await net.begin(kind,chosen,Number($('arena').value),$('join-code').value);}
  catch(error){if(ticket===session){$('online-status').textContent=/permission|denied/i.test(error.message)?'Online rooms are unavailable. The game’s Firebase access needs checking.':error.message;}}
  finally{if(ticket===session&&!net.active)setOnlineBusy(false);}
}
async function prepareOnline(meta,role){
  const ticket=session;
  await Promise.all([loadFighter(meta.host.fighter),loadFighter(meta.guest.fighter),loadArena(meta.arena)]);
  if(ticket!==session||!net.active)throw Object.assign(new Error('Cancelled'),{cancelled:true});
  arena=meta.arena;localIndex=role==='host'?0:1;renderer.localIndex=localIndex;
  match=new Match(roster,meta.host.fighter,meta.guest.fighter,{mode:'online'});
  retainMatchArtwork(atlases,arenas,imagePromises,match.ids,arena);
  snapshotBuffer=role==='guest'?new SnapshotBuffer(match.ids):null;
  renderer.reset();touchSignature='';input.setMode('online');input.clear();
}
function startOnline(meta,role){
  if(!match||!net.active)return;
  onlineStarted=true;paused=false;onlineFailed=false;selection.hidden=true;pauseScreen.hidden=true;helpScreen.hidden=true;resultScreen.hidden=true;
  input.active=true;if(coarse.matches||preferences.touch==='on')input.scheme='touch';
  $('room-share').hidden=true;$('pause-button').hidden=false;$('pause-button').setAttribute('aria-label','Match menu');
  $('network-banner').hidden=false;$('network-banner').textContent=`ONLINE · YOU ARE P${localIndex+1} · ROOM ${net.code}`;
  $('footer-status').textContent='ONLINE VERSUS · BEST OF THREE';modalState();updateTouch();sound.resume();document.activeElement?.blur();
  status(`Online match. You are player ${localIndex+1}.`);
}
function onlineEnded(message){
  setOnlineBusy(false);$('room-share').hidden=true;$('online-status').textContent=message;onlineStarted=false;
  if(match?.phase==='done')return;
  if(!match||!selection.hidden){match=null;renderer?.reset();return;}
  onlineFailed=true;paused=true;input.active=false;input.clear();
  $('network-banner').textContent=message;$('pause-title').textContent='CONNECTION ENDED';$('pause-detail').textContent=message;$('pause-detail').hidden=false;
  $('resume').hidden=true;$('restart').hidden=true;showModal(pauseScreen,$('quit'));sound.suspend();
}
function matchEvents(events){
  const banners=new Set(),effects=new Set();
  for(const e of events){
    if(e.type==='special')banners.add('lunacy');
    if(e.type==='kickout')banners.add('kickout');
    if(e.type==='roundEnd'){
      if(e.method==='PINFALL')banners.add('pinfall');
      if(e.method==='TAP OUT')banners.add('tapout');
    }
    if(e.type==='block')effects.add('guard');
    if(e.type==='slam'||e.type==='land')effects.add('ground');
    if(e.type==='hit')effects.add(e.move==='light'?'chips':'impact');
  }
  requestArtwork([...banners],[...effects]);
  renderer.receive(events,match);sound.play(events);
  if(input.scheme==='touch'&&preferences.haptics&&events.some(e=>(e.type==='hit'||e.type==='slam')&&e.index===localIndex))navigator.vibrate?.(18);
  for(const e of events){if(e.type==='fight')status('Fight!');if(e.type==='ropeBreak')status('Rope break. The hold is released.');if(e.type==='pinRelease')status('Hold released.');if(e.type==='count')status(`Pin count ${e.count}`);if(e.type==='roundEnd')status(e.winner==null?'Round drawn':`${match.fighters[e.winner].definition.name} wins the round by ${e.method.toLowerCase()}`);}
}
function recoverRuntime(error){
  if(runtimeFault)return;
  runtimeFault=error instanceof Error?error:new Error(String(error));
  console.error('Recoverable game runtime error',runtimeFault);
  paused=true;input.active=false;input.clear();match?.clearInputs?.();sound.suspend();
  if(net.active){onlineFailed=true;net.leave().catch(()=>{});}
  $('pause-title').textContent='MATCH PAUSED';
  $('pause-detail').textContent='A device graphics hiccup paused the match. Restart to keep playing.';
  $('pause-detail').hidden=false;$('resume').hidden=true;$('restart').hidden=false;
  $('footer-status').textContent='MATCH PAUSED AFTER A RECOVERABLE DEVICE ERROR.';
  try{showModal(pauseScreen,$('restart'));}catch{pauseScreen.hidden=false;}
}
$('online-quick').onclick=()=>beginOnline('quick');$('online-create').onclick=()=>beginOnline('create');$('online-join').onclick=()=>beginOnline('join');
$('join-code').addEventListener('input',()=>{$('join-code').value=$('join-code').value.toUpperCase().replace(/[^A-Z-]/g,'');});
$('join-code').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();beginOnline('join');}});
$('online-cancel').onclick=()=>{session++;net.leave().catch(()=>{});setOnlineBusy(false);$('room-share').hidden=true;$('online-status').textContent='Room left. Create or join another match.';};
addEventListener('pagehide',()=>{net.leave().catch(()=>{});});
$('fight').onclick=()=>startMatch();$('pause-button').onclick=()=>togglePause();$('resume').onclick=()=>togglePause();$('restart').onclick=()=>startMatch(match?.options.mode==='arcade');$('quit').onclick=quit;$('result-quit').onclick=quit;
$('rematch').onclick=()=>{if(match.options.mode==='online'){quit();return;}if(match.options.mode==='arcade'&&match.winner===0&&arcadeIndex<arcadeOpponents.length-1){arcadeIndex++;startMatch(true);}else startMatch();};
$('arena').onchange=()=>{arena=Number($('arena').value);loadArena(arena).catch(()=>status('Arena could not load. Press FIGHT to retry.'));};
$('controls').onclick=()=>{if(!helpScreen.hidden)return;helpWasPaused=paused;if(match){if(match.options.mode!=='online')paused=true;input.clear();match.clearInputs();net.capture(emptyInput());net.sendInput(true);}sound.suspend();showModal(helpScreen,$('close-help'));};
function closeHelp(){paused=helpWasPaused;hideModal(helpScreen);input.clear();match?.clearInputs();if(!paused)sound.resume();updateTouch();}
$('close-help').onclick=closeHelp;
function soundLabel(){const on=sound.enabled;$('sound').textContent=on?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',String(on));$('sound').setAttribute('aria-label',on?'Mute sound':'Enable sound');}
$('sound').onclick=async()=>{const on=await sound.enable();preferences.muted=!on;savePreferences();soundLabel();if(paused)sound.suspend();};
let bootTimers=[];
function finishBoot(){
  bootTimers.forEach(clearTimeout);bootTimers=[];$('boot').hidden=true;$('opening').inert=false;document.querySelector('.topbar').inert=false;sound.music.volume=.22;$('enter-game').focus();
}
$('boot-start').onclick=()=>{
  if($('boot').classList.contains('boot-running'))return;
  $('boot').classList.add('boot-running');$('boot-start').disabled=true;$('boot-skip').hidden=false;$('boot-skip').focus();
  if(!preferences.muted){sound.music.volume=.08;sound.start().then(soundLabel);sound.bootChime();}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced)$('boot').dataset.slide='all';
  else for(const [slide,at] of [['emblem',0],['wordmark',1000],['hatchet',2100],['records',3200]]){if(at===0)$('boot').dataset.slide=slide;else bootTimers.push(setTimeout(()=>{$('boot').dataset.slide=slide;},at));}
  bootTimers.push(setTimeout(finishBoot,reduced?1400:4400));
};
$('boot-skip').onclick=finishBoot;
document.querySelector('.topbar').inert=true;
$('enter-game').onclick=async()=>{
  $('opening').hidden=true;selection.hidden=false;$('cabinet').classList.remove('at-title');modalState();
  if(!preferences.muted)await sound.start();soundLabel();$('fight').focus();
};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('cabinet').requestFullscreen)await $('cabinet').requestFullscreen();else status('Fullscreen is not available in this browser.');}catch{status('Fullscreen is not available in this browser.');}};
addEventListener('resize',scheduleViewport);globalThis.visualViewport?.addEventListener('resize',scheduleViewport);globalThis.visualViewport?.addEventListener('scroll',scheduleViewport);coarse.addEventListener('change',updateTouch);
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');updateTouch();});
$('music').value=preferences.music==='fight-club'?'fight-club':'theme';sound.setTrack($('music').value);
$('music').onchange=()=>{preferences.music=$('music').value;sound.setTrack(preferences.music);savePreferences();};
$('touch-setting').value=preferences.touch==='on'?'on':'auto';
$('touch-setting').onchange=()=>{preferences.touch=$('touch-setting').value;savePreferences();updateTouch();};
$('repeat-hit').checked=preferences.repeat!==false;input.repeatHit=$('repeat-hit').checked;
$('repeat-hit').onchange=()=>{input.repeatHit=$('repeat-hit').checked;preferences.repeat=input.repeatHit;savePreferences();};
$('haptics').checked=preferences.haptics!==false;
$('haptics').onchange=()=>{preferences.haptics=$('haptics').checked;savePreferences();};
$('quality').value=preferences.quality==='battery'?'battery':'auto';
$('quality').onchange=()=>{preferences.quality=$('quality').value;savePreferences();updateTouch();};
// Trap focus within the active modal and restore it when the modal closes.
addEventListener('keydown',e=>{
  const modal=[helpScreen,resultScreen,pauseScreen].find(el=>!el.hidden);if(!modal)return;
  if(e.code==='Escape'&&!helpScreen.hidden){e.preventDefault();closeHelp();return;}
  if(e.key==='Tab'){const buttons=Array.from(modal.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled]),a[href]')).filter(el=>!el.hidden),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
let last=performance.now(),accumulator=0;
function loop(now){
  try{
    if(runtimeFault){requestAnimationFrame(loop);return;}
    // Resize and repaint in this same frame. A separate resize callback can
    // otherwise clear a just-drawn canvas until the following browser frame.
    if(viewportPending){viewportPending=false;updateTouch();resizeRoster();}
    const delta=Math.min((now-last)/1000,.10);last=now;
    if(match?.options.mode==='online'&&onlineStarted&&!onlineFailed){
      if(match.phase!=='done'){
        accumulator+=delta;
        while(accumulator>=STEP){
          const raw=input.read(),mine=!pauseScreen.hidden||!helpScreen.hidden?emptyInput():raw[0];
          if(net.role==='guest')net.capture(mine);
          else if(net.role==='host'){
            match.step([mine,net.readRemote()||emptyInput()],STEP);
            const events=match.drainEvents();matchEvents(events);net.sendSnapshot(match,events);
          }
          accumulator-=STEP;
        }
      }
      if(net.role==='guest'){
        net.sendInput();snapshotBuffer?.apply(match,now);matchEvents(snapshotBuffer?.drainEvents()||[]);
      }else if(net.role==='host')net.sendSnapshot(match,[],match.phase==='done');
      if(match.phase==='done'&&resultScreen.hidden)finishMatch();
    }else if(match&&match.options.mode!=='online'&&!paused&&match.phase!=='done'){
      accumulator+=delta;
      while(accumulator>=STEP){const controls=input.read();if(paused){accumulator=0;break;}match.step(controls,STEP);accumulator-=STEP;
        const events=match.drainEvents();matchEvents(events);if(match.phase==='done')finishMatch();
      }
    }else{accumulator=0;if(match)input.read();}
    if(renderer){
      const menu=!selection.hidden||!$('opening').hidden;
      const drawDelta=framePacer.frame(now,{animated:Boolean(match&&!paused&&match.phase!=='done'&&!menu),hidden:document.hidden,fps:preferences.quality==='battery'?30:60});
      if(drawDelta!==null){updateTouchContext();renderer.scheme=input.scheme;renderer.draw(match,arena,drawDelta,menu);}
    }
  }catch(error){recoverRuntime(error);}
  requestAnimationFrame(loop);
}
async function init(){
  try{
    const response=await fetch('./assets/roster.json',{cache:'no-store'});if(!response.ok)throw new Error('Roster unavailable');roster=await response.json();buildRoster();
    ARENAS.forEach((a,i)=>{const option=document.createElement('option');option.value=i;option.textContent=a.name;$('arena').append(option);});
    await loadArena(0);
    const banners={},combatFx={};artworkState={banners,combatFx,pending:new Map()};
    renderer=new Renderer($('game'),roster,atlases,arenas,banners,combatFx,{onContextLost:()=>recoverRuntime(new Error('The graphics surface was reset.'))});updateTouch();$('fight').disabled=false;$('fight').textContent='FIGHT';$('enter-game').disabled=false;$('enter-game').textContent='ENTER THE LUNACY';$('boot-start').disabled=false;$('boot-start').textContent='PRESS START';$('boot-start').focus();requestAnimationFrame(loop);
    // The logo is tiny compared with the optional effects. Load it for branding,
    // then fetch announcements/effects only when a match actually needs them.
    requestArtwork(['unlocked'],[]);
  }catch(error){$('boot-start').textContent='RELOAD GAME';$('boot-start').disabled=false;$('boot-start').onclick=()=>location.reload();$('enter-game').textContent='RELOAD GAME';$('enter-game').disabled=false;$('enter-game').onclick=()=>location.reload();$('fight').textContent='RELOAD GAME';$('fight').disabled=false;$('fight').onclick=()=>location.reload();$('footer-status').textContent='GAME FILES COULD NOT LOAD. USE THE INCLUDED LOCAL SERVER OR GITHUB PAGES.';console.error(error);}
}
init();
