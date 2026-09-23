import {fighterPortrait,fighterAtlas} from './fighter-artwork.js?v=0.21.0';
import {RenderBudget} from './render-budget.js?v=0.21.0';
import {Coach} from './coach.js?v=0.21.0';
import {loadGameImage} from './image-loader.js?v=0.21.0';
import {fighterProfile} from './fighter-profile.js?v=0.21.0';
import {Championship,STAGES,championshipLabel,championshipArena} from './championship.js?v=0.21.0';
import {Match,STEP,emptyInput,isPoleMode,isLocalMode} from './engine.js?v=0.21.0';
import {Renderer} from './render.js?v=0.21.0';
import {Input} from './input.js?v=0.21.0';
import {Sound} from './audio.js?v=0.21.0';
import {ARENAS} from './arenas.js?v=0.21.0';
import {touchContext} from './touch-ui.js?v=0.21.0';
import {OnlineSession} from './online.js?v=0.21.0';
import {connectFirebase} from './firebase-online.js?v=0.21.0';
import {SnapshotBuffer} from './online-protocol.js?v=0.21.0';
import {RosterSelection} from './roster-selection.js?v=0.21.0';
import {retainMatchArtwork} from './artwork-cache.js?v=0.21.0';
import {phoneLayout,canvasSize,resizeCanvas} from './phone-layout.js?v=0.21.0';
import {FramePacer} from './frame-pacer.js?v=0.21.0';
import {loadOptionalArtwork} from './optional-artwork.js?v=0.21.0';
import {Haptics} from './haptics.js?v=0.21.0';
import {ArcadeRewards,ARCADE_REWARDS} from './arcade-rewards.js?v=0.21.0';
import {SecretFighters} from './secret-fighters.js?v=0.21.0';
import {fullscreenElement,toggleFullscreen} from './fullscreen.js?v=0.21.0';
const haptics=new Haptics();let arcadeRewards=null;
const $=id=>document.getElementById(id);
const selection=$('selection'),pauseScreen=$('pause'),resultScreen=$('result'),helpScreen=$('help'),creditsScreen=$('credits');
let coach=null,creditsPending=false;
let championships=null,championshipBout=null;
let roster=[],atlases={},arenas=[],renderer,match=null,chosen=0,arena=0,paused=false,helpWasPaused=false,arcadeOpponents=[],arcadeIndex=0,session=0,loading=false,returnFocus=null;
let onlineBusy=false,onlineStarted=false,onlineFailed=false,localIndex=0,snapshotBuffer=null;
let rosterSelection=null,secrets=null,playable=[];
let artworkState=null;
let runtimeFault=null;
const net=new OnlineSession({connect:connectFirebase,prepare:prepareOnline,start:startOnline,
  snapshot:packet=>snapshotBuffer?.receive(packet,performance.now()),status:onlineStatus,ended:onlineEnded});
const imagePromises=new Map();
const sound=new Sound($('theme-audio'));
const coarse=matchMedia('(any-pointer:coarse)');
let preferences={muted:false,music:'theme',touch:'auto',repeat:true,haptics:true,quality:'auto',musicVolume:.22,effectsVolume:.7,hints:true},touchSignature='',touchEscapeMode=false;
const framePacer=new FramePacer(),renderBudget=new RenderBudget();
const batteryDisplay=()=>preferences.quality==='battery'||renderBudget.limited;
let viewportPending=false,lastPhoneOrientation=null,lastControlGeometry='';
try{const saved=JSON.parse(localStorage.getItem('lunacy-controls-v3')||'null');if(saved&&typeof saved==='object')preferences={...preferences,...saved};}catch{}
function savePreferences(){try{localStorage.setItem('lunacy-controls-v3',JSON.stringify(preferences));}catch{}}
const input=new Input(force=>togglePause(force));
const loadingImage=loadGameImage;
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
function modalState(){const active=[helpScreen,creditsScreen,resultScreen,pauseScreen].find(el=>!el.hidden);$('cabinet').classList.toggle('selecting',!selection.hidden);$('cabinet').classList.toggle('modal-open',Boolean(active));selection.inert=Boolean(active)||loading;for(const el of [helpScreen,creditsScreen,resultScreen,pauseScreen])el.inert=Boolean(active&&el!==active);updateTouch();return active;}
function showModal(element,button){returnFocus=document.activeElement;element.hidden=false;modalState();button?.focus();}
function hideModal(element){element.hidden=true;const active=modalState();if(active)active.querySelector('button')?.focus();else returnFocus?.focus?.();}
let touchArtRequest=null;
function updateTouch(){
  const showing=Boolean(match&&selection.hidden&&(coarse.matches||preferences.touch==='on'));
  if(showing&&!touchArtRequest)touchArtRequest=loadingImage('./assets/ui/touch-control-sheet.png').then(()=>{$('touch-controls').classList.add('control-art');}).catch(()=>{});
  $('touch-controls').hidden=!showing;$('cabinet').classList.toggle('playing-touch',showing);
  $('cabinet').classList.toggle('in-match',Boolean(match&&selection.hidden));
  $('touch-controls').inert=paused||match?.phase==='done'||!helpScreen.hidden||!resultScreen.hidden||!pauseScreen.hidden||!creditsScreen.hidden;
  $('touch-controls').classList.toggle('inactive',$('touch-controls').inert);
  updatePhoneLayout(showing);framePacer.invalidate();
}
const phoneNodes={header:document.querySelector('.topbar'),network:$('network-banner'),stage:$('stage-wrap'),dpad:$('dpad'),actions:document.querySelector('.action-pad'),weapon:document.querySelector('[data-key="weapon"]'),taunt:document.querySelector('[data-key="taunt"]'),hint:$('touch-hint')};
function updatePhoneLayout(showing){
  const cabinet=$('cabinet'),viewport=globalThis.visualViewport;
  // Do not rearrange the interface while a user is pinch-zooming it.
  const unzoomed=!viewport||Math.abs(viewport.scale-1)<.01;
  const nativeFull=Boolean(fullscreenElement(document));
  const width=!nativeFull&&unzoomed&&viewport?viewport.width:innerWidth,height=!nativeFull&&unzoomed&&viewport?viewport.height:innerHeight;
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
    Object.assign(cabinet.style,{width:`${width}px`,height:`${height}px`,left:`${!nativeFull&&unzoomed&&viewport?viewport.offsetLeft:0}px`,top:`${!nativeFull&&unzoomed&&viewport?viewport.offsetTop:0}px`});
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
    renderer.portrait=layout?.mode==='portrait';renderer.compact=layout?.mode==='landscape';renderer.logicalHeight=layout?1280*layout.stage.height/layout.stage.width:720;
    renderer.lowPower=showing||batteryDisplay();
    const cssWidth=layout?.stage.width||$('stage-wrap').getBoundingClientRect().width;
    resizeCanvas(renderer.canvas,canvasSize({cssWidth,aspect:layout?layout.stage.width/layout.stage.height:undefined,portrait:renderer.portrait,touch:showing,dpr:devicePixelRatio||1,quality:batteryDisplay()?'battery':'auto'}));
  }
}
function scheduleViewport(){viewportPending=true;}
function updateTouchContext(){
  if(!match||$('touch-controls').hidden)return;
  const context=touchContext(match,localIndex),signature=JSON.stringify(context);if(signature===touchSignature)return;touchSignature=signature;
  if(context.escape!==touchEscapeMode){input.clearTouch();touchEscapeMode=context.escape;}
  $('touch-grapple').dataset.state=context.grabLabel;$('touch-escape').dataset.state=context.escapeLabel;
  $('touch-hint').textContent=context.hint;$('grab-label').textContent=context.grabLabel;$('grab-detail').textContent=context.grabDetail;
  $('touch-grapple').setAttribute('aria-label',context.grabLabel==='CLAIM'?'Hold to retrieve pole weapon':context.grabLabel==='SUPERPLEX'?'Throw opponent off top rope':context.grabLabel==='RELEASE'?'Release hold':context.grabLabel==='PIN'?'Pin opponent':context.grabLabel==='BREAK'?'Break grapple':context.grabLabel==='CLIMB'?'Climb top rope':context.grabLabel==='DIVE'?'Top rope dive':'Grapple');
  $('heavy-detail').textContent=context.heavy;$('weapon-detail').textContent=context.weaponDetail;
  $('touch-special').classList.toggle('ready',context.ready);$('touch-special').style.setProperty('--charge',`${context.meter}%`);
  $('finish-detail').textContent=context.ready?'READY!':`${context.meter}%`;
  $('touch-special').setAttribute('aria-label',context.ready?'Finisher ready':`Finisher charging: ${context.meter} percent`);
  $('touch-controls').classList.toggle('escaping',context.escape);$('touch-escape').hidden=!context.escape;
  $('escape-label').textContent=context.escapeLabel;$('escape-fill').style.width=`${context.escapeProgress*100}%`;
}
function rosterPageSize(){return matchMedia('(max-width:650px) and (orientation:portrait)').matches?6:matchMedia('(max-width:1000px), (max-height:600px)').matches?8:12;}
function renderRosterPage(){
  if(!rosterSelection)return;
  const positions=rosterSelection.visible,visible=positions.map(p=>playable[p]),focus=visible.includes(chosen)?chosen:visible[0];
  Array.from($('roster').children).forEach((b,i)=>{b.hidden=!visible.includes(i);if(!b.hidden){const img=b.querySelector('img');if(!img.getAttribute('src'))img.src=img.dataset.src;}b.setAttribute('aria-pressed',String(i===chosen));b.tabIndex=i===focus?0:-1;b.disabled=onlineBusy;});
  $('roster-page').textContent=`${positions[0]+1}–${positions.at(-1)+1} OF ${playable.length} · PAGE ${rosterSelection.page+1}/${rosterSelection.pages}`;
  $('roster-prev').disabled=onlineBusy||rosterSelection.page===0;$('roster-next').disabled=onlineBusy||rosterSelection.page===rosterSelection.pages-1;
  $('roster-select').value=String(chosen);$('selected-fighter').textContent=roster[chosen].name.toUpperCase();
}
function setSelectionPanel(panel){
  selection.dataset.panel=panel;$('show-roster').setAttribute('aria-pressed',String(panel==='roster'));$('show-setup').setAttribute('aria-pressed',String(panel==='setup'));
}
function resizeRoster(){if(rosterSelection){rosterSelection.resize(rosterPageSize());renderRosterPage();}}
function choose(index){if(!rosterSelection?.choose(playable.indexOf(index)))return;chosen=index;const f=roster[index];
  renderRosterPage();
  $('portrait').src=fighterPortrait(f);$('portrait').alt=f.name;$('fighter-name').textContent=f.name;$('fighter-style').textContent=`${f.style.toUpperCase()} · ${fighterProfile(f).label}`;
  $('fighter-traits').textContent=fighterProfile(f).tip;
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
  const approvedSource=f.websiteStats?.source==='User-supplied approval table';
  $('stats-source').textContent=approvedSource?'USER-APPROVED RATINGS':f.websiteStats?'JCW WEBSITE RATINGS ↗':'JCW ROSTER ↗';
  if(approvedSource)$('stats-source').removeAttribute('href');else $('stats-source').setAttribute('href','https://jcwlunacy.net/');
  updateOpponent();
}
function updateChampionship(){
  const active=$('mode').value==='championship';$('championship-panel').hidden=!active;
  if(!active){$('arena').parentElement.hidden=false;if(!loading)$('fight').textContent='FIGHT';return;}if(!championships)return;
  const run=championships.load(roster[chosen].id,$('difficulty').value);
  $('arena').parentElement.hidden=Boolean(run&&run.phase!=='dethroned');
  $('championship-status').textContent=run?championshipLabel(run):'ROAD TO THE BELT · FIVE MATCHES';
  $('championship-record').textContent=run?`${run.titles} title wins · ${run.defenses} defenses this reign · Best: ${run.best}`:'Win five best-of-three matches, then defend your title.';
  $('championship-save').textContent=championships.saved?'Progress saves after each match on this browser. Each fighter and difficulty has its own run.':'Saving unavailable: progress lasts only for this session.';
  $('championship-road').replaceChildren();
  for(let i=0;i<5;i++){const item=document.createElement('li');const name=run?roster.find(f=>f.id===run.path[i]).name:'Opponent revealed when you start';item.textContent=`${run&&i<run.stage?'✓ ':''}${STAGES[i]} · ${name}`;if(run?.phase==='road'&&i===run.stage)item.setAttribute('aria-current','step');$('championship-road').append(item);}
  $('fight').textContent=run?.phase==='defend'?'DEFEND YOUR TITLE':run?.phase==='road'?'CONTINUE CHAMPIONSHIP':'START CHAMPIONSHIP';
}
function updateArcadeRewards(){
  if(!arcadeRewards||!roster[chosen])return;
  const id=roster[chosen].id,difficulty=$('difficulty').value;
  $('arcade-rewards').hidden=$('mode').value!=='arcade';
  $('arcade-medals').replaceChildren();
  for(const [level,reward] of Object.entries(ARCADE_REWARDS)){
    const earned=Boolean(arcadeRewards.get(id,level)),item=document.createElement('li');
    item.dataset.medal=earned?reward.medal:'locked';item.textContent=`${earned?'✓ ':''}${level.toUpperCase()} · ${reward.medal.toUpperCase()} · ${reward.title}`;$('arcade-medals').append(item);
  }
  $('arcade-save').textContent=(arcadeRewards.triple(id)?'TRIPLE CROWN EARNED! ':`Beat all ${roster.length-1} opponents to earn this difficulty’s medal and portrait frame. `)+(arcadeRewards.saved?'Medals save on this browser.':'Saving unavailable: medals last for this session.');
  $('portrait').dataset.arcadeMedal=arcadeRewards.triple(id)?'triple':arcadeRewards.get(id,difficulty)?ARCADE_REWARDS[difficulty].medal:'none';
}
function updateOpponent(){
  if(!roster.length)return;
  const mode=$('mode').value,opponent=roster[Number($('opponent').value)||0];
  $('versus-name').textContent=mode==='online'?'ROOM CODES + QUICK MATCH':mode==='championship'?'FIVE WINS TO THE BELT':mode==='arcade'?`${roster.length-1} OPPONENTS. ONE CHAMPION.`:`VS ${opponent.name.toUpperCase()}`;
  $('versus-avatar').hidden=['arcade','online','championship'].includes(mode);$('versus-avatar').src=fighterPortrait(opponent);
  $('versus-label').textContent=mode==='online'?'ONLINE MULTIPLAYER':mode==='championship'?'CHAMPIONSHIP':mode==='arcade'?'ARCADE RUN':isLocalMode(mode)?'PLAYER 2':mode==='practice'?'PRACTICE PARTNER':'CPU OPPONENT';
  $('pole-rules').hidden=!isPoleMode(mode);
  updateChampionship();updateArcadeRewards();
}
function refreshPlayable(){
  // Secret fighters are hidden from the pick list until the belt has been won on this browser.
  playable=secrets?secrets.indices():roster.map((_,i)=>i);
  rosterSelection=new RosterSelection(playable.length,rosterPageSize());
  $('roster-count').textContent=`${playable.length} FIGHTERS`;
  $('show-roster').textContent=`FIGHTERS · ${playable.length}`;
  $('roster-select').replaceChildren(...playable.map(i=>{const option=document.createElement('option');option.value=i;option.textContent=roster[i].name.toUpperCase();return option;}));
  const hidden=secrets?secrets.present.filter(f=>!secrets.playable(f.id)):[];
  $('secret-note').hidden=!hidden.length;
  $('secret-note').textContent=hidden.length?`${hidden.length} SECRET FIGHTER${hidden.length===1?'':'S'} · WIN THE CHAMPIONSHIP BELT TO UNLOCK`:'';
  Array.from($('roster').children).forEach((b,i)=>{b.dataset.secret=secrets?.isSecret(roster[i].id)?'true':'false';});
  if(!playable.includes(chosen))chosen=playable[0]??0;
}
function buildRoster(){
  roster.forEach((f,i)=>{
    const b=document.createElement('button');b.className='fighter-card';b.style.setProperty('--fighter',f.color);b.setAttribute('aria-label',f.name);b.setAttribute('aria-pressed','false');
    const img=document.createElement('img');img.dataset.src=fighterPortrait(f);img.alt='';img.decoding='async';const name=document.createElement('span');name.textContent=f.name.toUpperCase();b.append(img,name);b.onclick=()=>choose(i);$('roster').append(b);
    const option=document.createElement('option');option.value=i;option.textContent=f.name.toUpperCase();$('opponent').append(option);
  });refreshPlayable();$('opponent').value='1';choose(chosen);
  $('roster-select').onchange=()=>choose(Number($('roster-select').value));
  $('roster-prev').onclick=()=>{rosterSelection.turn(-1);renderRosterPage();};
  $('roster-next').onclick=()=>{rosterSelection.turn(1);renderRosterPage();};
  $('show-roster').onclick=()=>setSelectionPanel('roster');$('show-setup').onclick=()=>setSelectionPanel('setup');
  $('confirm-fighter').onclick=()=>{setSelectionPanel('setup');$('mode').focus();};
  $('mode').onchange=()=>{const mode=$('mode').value;$('difficulty-label').hidden=['local','pole-local','practice','online'].includes(mode);$('opponent').parentElement.hidden=['arcade','online','championship'].includes(mode);$('opponent-label').textContent=isLocalMode(mode)?'PLAYER 2':'OPPONENT';$('online-lobby').hidden=mode!=='online';$('fight').hidden=mode==='online';updateOpponent();};
  $('opponent').onchange=updateOpponent;$('difficulty').onchange=()=>{updateChampionship();updateArcadeRewards();};
  $('roster').addEventListener('keydown',event=>{
    const columns=getComputedStyle($('roster')).gridTemplateColumns.split(' ').length,current=Array.from($('roster').children).indexOf(event.target);
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns,PageUp:-rosterSelection.pageSize,PageDown:rosterSelection.pageSize}[event.key],position=playable.indexOf(current);
    if(position>=0&&(delta||event.key==='Home'||event.key==='End')){event.preventDefault();choose(playable[event.key==='Home'?0:event.key==='End'?playable.length-1:(position+delta+playable.length)%playable.length]);$('roster').children[chosen].focus();}
  });
}
async function loadFighter(index){
  if(atlases[index])return;
  if(!imagePromises.has(index)){
    let pending;
    pending=loadingImage(fighterAtlas(roster[index])).then(image=>{
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
  if(loading)return;loading=true;runtimeFault=null;sound.stopEffects();modalState();const thisSession=++session;$('fight').disabled=true;$('fight').textContent='ENTERING THE RING…';
  try{
    const mode=$('mode').value;arena=Number($('arena').value);
    if(mode==='arcade'&&!nextArcade){arcadeOpponents=roster.map((_,i)=>i).filter(i=>i!==chosen); // Fisher-Yates keeps an unbiased, complete roster run.
      for(let i=arcadeOpponents.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arcadeOpponents[i],arcadeOpponents[j]]=[arcadeOpponents[j],arcadeOpponents[i]];}arcadeIndex=0;}
    if(secrets&&!secrets.playable(roster[chosen].id)){choose(playable[0]);}
    championshipBout=mode==='championship'?championships.start(roster[chosen].id,$('difficulty').value,arena):null;
    const opponent=championshipBout?roster.findIndex(f=>f.id===championshipBout.opponent):mode==='arcade'?arcadeOpponents[arcadeIndex]:Number($('opponent').value);
    if(championshipBout)arena=championshipArena(championshipBout);
    if(mode==='arcade')arena=(Number($('arena').value)+arcadeIndex)%ARENAS.length;
    // The previous match is covered by the menu: free it before decoding the next pair.
    retainMatchArtwork(atlases,arenas,imagePromises,[chosen,opponent],arena);
    await Promise.all([loadFighter(chosen),loadFighter(opponent),loadArena(arena)]);
    if(thisSession!==session)return;
    localIndex=0;renderer.localIndex=0;onlineStarted=false;onlineFailed=false;$('network-banner').hidden=true;$('pause-button').setAttribute('aria-label','Pause match');
    match=new Match(roster,chosen,opponent,{mode,difficulty:$('difficulty').value,arcadeIndex,championshipLabel:championshipBout?championshipLabel(championshipBout):null});
    match.championshipBout=championshipBout;
    retainMatchArtwork(atlases,arenas,imagePromises,match.ids,arena);
    coach?.start();creditsPending=false;creditsScreen.hidden=true;paused=false;selection.hidden=true;pauseScreen.hidden=true;resultScreen.hidden=true;helpScreen.hidden=true;modalState();input.active=true;input.setMode(mode);if(coarse.matches||preferences.touch==='on')input.scheme='touch';renderer.reset();touchSignature='';$('pause-button').hidden=false;updateTouch();sound.resume();
    $('footer-status').textContent=championshipBout?championshipLabel(championshipBout):isPoleMode(mode)?'WEAPON ON A POLE · CLAIM THE CHAIR, THEN WIN TWO FALLS':isLocalMode(mode)?'LOCAL VERSUS · TWO PLAYERS. ONE RING.':mode==='arcade'?`ARCADE RUN · OPPONENT ${arcadeIndex+1} OF ${roster.length-1}`:mode==='practice'?'PRACTICE · FULL METER · AUTO RESET':'VS CPU · BEST OF THREE';
    document.activeElement?.blur();status(`Round 1. ${roster[chosen].name} versus ${roster[opponent].name}.`);
  }catch(error){status('The match artwork could not load. Try again.');$('footer-status').textContent='COULD NOT LOAD MATCH ARTWORK. PRESS FIGHT TO RETRY.';console.error(error);}
  finally{loading=false;modalState();$('fight').disabled=false;$('fight').textContent='FIGHT';updateChampionship();}
}
function togglePause(force){
  if(!match||match.phase==='done'||!selection.hidden||!helpScreen.hidden)return;
  if(match.options.mode==='online'){
    input.clear();net.capture(emptyInput());net.sendInput(true);
    if(force===true||onlineFailed)return;
    $('pause-art').hidden=true;$('pause-title').textContent='ONLINE MATCH CONTINUES';$('pause-detail').textContent='The other player is still in the ring. Return to the fight or leave the match.';$('pause-detail').hidden=false;
    $('restart').hidden=true;$('resume').hidden=false;
    if(pauseScreen.hidden)showModal(pauseScreen,$('resume'));else hideModal(pauseScreen);
    updateTouch();return;
  }
  $('pause-art').hidden=false;$('pause-title').textContent='MATCH PAUSED';$('pause-detail').hidden=true;$('restart').hidden=false;$('resume').hidden=false;
  paused=force===true?true:!paused;input.clear();match.clearInputs();if(paused){showModal(pauseScreen,$('resume'));sound.suspend();}else{pauseScreen.hidden=true;modalState();sound.resume();document.activeElement?.blur();}updateTouch();
}
function quit(){creditsPending=false;creditsScreen.hidden=true;sound.stopEffects();retainMatchArtwork(atlases,arenas,imagePromises,[],arena);session++;runtimeFault=null;net.leave().catch(()=>{});onlineStarted=false;onlineFailed=false;setOnlineBusy(false);snapshotBuffer=null;localIndex=0;renderer.localIndex=0;match=null;paused=false;input.active=false;input.clear();selection.hidden=false;pauseScreen.hidden=true;resultScreen.hidden=true;helpScreen.hidden=true;modalState();renderer.reset();sound.resume();$('pause-button').hidden=true;$('network-banner').hidden=true;$('room-share').hidden=true;$('online-status').textContent='Create a room, join a friend, or try Quick Match.';updateTouch();$('footer-status').textContent='SELECT YOUR FIGHTER. SETTLE IT IN THE RING.';updateChampionship();updateArcadeRewards();($('mode').value==='online'?$('online-quick'):$('fight')).focus();}
function finishMatch(){
  if(match.resultShown)return;match.resultShown=true;
  input.active=false;input.clear();$('pause-button').hidden=true;
  const won=match.winner===localIndex,arcade=match.options.mode==='arcade',champion=arcade&&won&&arcadeIndex===arcadeOpponents.length-1;
  $('result-win-art').hidden=!(won||isLocalMode(match.options.mode));
  $('result-title').textContent=champion?'LUNACY CHAMPION':`${match.fighters[match.winner].definition.name.toUpperCase()} WINS`;
  $('result-method').textContent=champion?'ENTIRE ROSTER DEFEATED':match.method;
  $('result-detail').textContent=`${match.wins[0]} — ${match.wins[1]}${arcade?` · ${Math.min(arcadeOpponents.length,arcadeIndex+(won?1:0))} of ${arcadeOpponents.length} opponents defeated`:''}`;
  const winner=match.fighters[match.winner].definition;$('winner-portrait').src=fighterPortrait(winner);$('winner-portrait').alt=winner.name;
  $('rematch').textContent=match.options.mode==='online'?'BACK TO ONLINE LOBBY':arcade&&won&&!champion?'NEXT OPPONENT':arcade?'NEW ARCADE RUN':'REMATCH';
  $('championship-belt').hidden=true;creditsPending=false;$('show-credits').hidden=true;$('secret-unlock').hidden=true;resultScreen.classList.remove('champion-result');
  if(match.options.mode==='championship'){
    const result=championships.settle(match.championshipBout,won);
    if(result){
      const {run,outcome}=result;
      $('result-title').textContent=outcome==='crowned'?'LUNACY CHAMPION!':outcome==='defended'?'TITLE DEFENDED!':outcome==='dethroned'?'THE BELT CHANGES HANDS':won?'ONE STEP CLOSER':'YOUR RUN CONTINUES';
      $('result-method').textContent=`${championshipLabel(match.championshipBout)} · ${match.method}`;
      $('result-detail').textContent=`${match.wins[0]} — ${match.wins[1]} · ${run.titles} title wins · ${run.defenses} defenses · Best: ${run.best}. ${championships.saved?'Progress saved.':'Session only — browser saving unavailable.'}`;
      $('championship-belt').hidden=!['crowned','defended'].includes(outcome);
      if(['crowned','defended'].includes(outcome)){resultScreen.classList.add('champion-result');$('show-credits').hidden=false;sound.celebrate();}
      creditsPending=outcome==='crowned';
      const revealed=outcome==='crowned'&&secrets?secrets.unlock(run.fighter):[];
      $('secret-unlock').hidden=!revealed.length;
      if(revealed.length){$('secret-unlock').textContent=`SECRET FIGHTERS UNLOCKED · ${revealed.map(f=>f.name.toUpperCase()).join(' · ')} · ${secrets.saved?'Saved on this browser.':'Session only — saving unavailable.'}`;refreshPlayable();choose(chosen);}
      $('rematch').textContent=outcome==='dethroned'?'CHASE THE BELT':run.phase==='defend'?'DEFEND YOUR TITLE':won?'NEXT CHAMPIONSHIP MATCH':'RETRY THIS MATCH';
          if(creditsPending)$('rematch').textContent='CELEBRATE · VIEW CREDITS';
    }else{$('result-detail').textContent+=' · This run changed in another window; continue from the saved match.';$('rematch').textContent='CONTINUE SAVED RUN';}
  }
  $('arcade-reward-result').hidden=true;
  if(champion){
    const reward=arcadeRewards.award({fighter:match.fighters[0].definition.id,difficulty:match.options.difficulty,defeated:arcadeOpponents.map(i=>roster[i].id),mode:match.options.mode,won});
    if(reward){const box=$('arcade-reward-result');box.hidden=false;box.dataset.medal=arcadeRewards.triple(winner.id)?'triple':reward.medal;box.textContent=`${reward.medal.toUpperCase()} MEDAL · ${reward.title}${arcadeRewards.triple(winner.id)?' · TRIPLE CROWN!':''} · ${reward.fresh?'PORTRAIT FRAME EARNED':'MEDAL ALREADY EARNED'} · ${arcadeRewards.saved?'Saved on this browser.':'Session only — saving unavailable.'}`;sound.celebrate();updateArcadeRewards();}
  }
  showModal(resultScreen,$('rematch'));status($('result-title').textContent);
  if(creditsPending)openCredits();
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
  retainMatchArtwork(atlases,arenas,imagePromises,[meta.host.fighter,meta.guest.fighter],meta.arena);
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
  $('network-banner').textContent=message;$('pause-art').hidden=true;$('pause-title').textContent='CONNECTION ENDED';$('pause-detail').textContent=message;$('pause-detail').hidden=false;
  $('resume').hidden=true;$('restart').hidden=true;showModal(pauseScreen,$('quit'));sound.suspend();
}
function matchEvents(events){
  const banners=new Set(),effects=new Set();
  for(const e of events){
    if(e.type==='special')banners.add('lunacy');
    if(e.type==='kickout')banners.add('kickout');
    if(e.type==='reversal'||e.type==='secondWind')banners.add(e.type);
    if(e.type==='roundEnd'){
      if(e.method==='PINFALL')banners.add('pinfall');
      if(e.method==='TAP OUT')banners.add('tapout');
      if(e.method==='TIME LIMIT')banners.add('timeout');
    }
    if(e.type==='block')effects.add('guard');
    if(e.type==='slam'||e.type==='land')effects.add('ground');
    if(e.type==='hit')effects.add(e.move==='light'?'chips':'impact');
  }
  requestArtwork([...banners],[...effects]);
  coach?.receive(events,localIndex);renderer.receive(events,match);sound.play(events,match);
  if(input.scheme==='touch'&&events.some(e=>['hit','slam','reversal','secondWind'].includes(e.type)&&(e.index===localIndex||e.attacker===localIndex)))haptics.pulse(events.some(e=>e.type==='slam')?50:32);
  for(const e of events){if(e.type==='fight')status('Fight!');if(e.type==='reversal')status(`Player ${e.index+1} reverses the strike. Counterattack!`);if(e.type==='secondWind')status(`Player ${e.index+1} gets a second wind: 25 Lunacy meter.`);if(e.type==='ropeBreak')status('Rope break. The hold is released.');if(e.type==='pinRelease')status('Hold released.');if(e.type==='count')status(`Pin count ${e.count}`);if(e.type==='roundEnd')status(e.winner==null?'Round drawn':`${match.fighters[e.winner].definition.name} wins the round by ${e.method.toLowerCase()}`);}
}
function recoverRuntime(error){
  if(runtimeFault)return;
  runtimeFault=error instanceof Error?error:new Error(String(error));
  console.error('Recoverable game runtime error',runtimeFault);
  paused=true;input.active=false;input.clear();match?.clearInputs?.();sound.suspend();
  if(net.active){onlineFailed=true;net.leave().catch(()=>{});}
  $('pause-art').hidden=false;$('pause-title').textContent='MATCH PAUSED';
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
function openCredits(){$('credits-victory').textContent=`${match.fighters[match.winner].definition.name.toUpperCase()} · ${match.wins[0]} — ${match.wins[1]} · ${championships.saved?'YOUR TITLE IS SAVED':'TITLE HELD FOR THIS SESSION'}`;creditsPending=false;resultScreen.hidden=true;showModal(creditsScreen,$('credits-defend'));status('Championship credits. Your title is saved.');}
$('show-credits').onclick=openCredits;
$('credits-back').onclick=()=>{creditsScreen.hidden=true;$('rematch').textContent='DEFEND YOUR TITLE';showModal(resultScreen,$('rematch'));};
$('credits-defend').onclick=()=>startMatch();
$('rematch').onclick=()=>{if(creditsPending){openCredits();return;}if(match.options.mode==='online'){quit();return;}if(match.options.mode==='arcade'&&match.winner===0&&arcadeIndex<arcadeOpponents.length-1){arcadeIndex++;startMatch(true);}else startMatch();};
$('arena').onchange=async()=>{arena=Number($('arena').value);const requested=arena;retainMatchArtwork(atlases,arenas,imagePromises,match?.ids||[],arena);try{await loadArena(requested);if(arena===requested)framePacer.invalidate();}catch{if(arena===requested)status('Arena could not load. Press FIGHT to retry.');}};
$('controls').onclick=()=>{if(!helpScreen.hidden)return;helpWasPaused=paused;if(match){if(match.options.mode!=='online')paused=true;input.clear();match.clearInputs();net.capture(emptyInput());net.sendInput(true);}sound.suspend();showModal(helpScreen,$('close-help'));};
function closeHelp(){paused=helpWasPaused;hideModal(helpScreen);input.clear();match?.clearInputs();if(!paused)sound.resume();updateTouch();}
$('close-help').onclick=closeHelp;
function soundLabel(){const on=sound.enabled;$('sound').textContent=on?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',String(on));$('sound').setAttribute('aria-label',on?'Mute sound':'Enable sound');}
$('sound').onclick=async()=>{const on=await sound.enable();preferences.muted=!on;savePreferences();soundLabel();if(paused)sound.suspend();};
let bootTimers=[];
function finishBoot(){
  bootTimers.forEach(clearTimeout);bootTimers=[];$('boot').hidden=true;$('opening').inert=false;document.querySelector('.topbar').inert=false;sound.music.volume=sound.musicVolume;$('enter-game').focus();
}
$('boot-start').onclick=()=>{
  if($('boot').classList.contains('boot-running'))return;
  $('boot').classList.add('boot-running');$('boot-start').disabled=true;$('boot-skip').hidden=false;$('boot-skip').focus();
  if(!preferences.muted){sound.music.volume=.08;sound.start().then(()=>{soundLabel();sound.bootChime();});}
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
$('fullscreen').onclick=async()=>{const result=await toggleFullscreen($('cabinet'),document);if(result==='fitted')status('Game fitted to your screen. This browser does not offer native fullscreen.');updateTouch();scheduleViewport();};
addEventListener('resize',scheduleViewport);globalThis.visualViewport?.addEventListener('resize',scheduleViewport);globalThis.visualViewport?.addEventListener('scroll',scheduleViewport);coarse.addEventListener('change',updateTouch);
for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>{$('fullscreen').setAttribute('aria-label',fullscreenElement(document)?'Exit fullscreen':'Enter fullscreen');input.clearTouch();updateTouch();scheduleViewport();});
sound.setMix(preferences.musicVolume,preferences.effectsVolume);
for(const [id,key] of [['music-volume','musicVolume'],['effects-volume','effectsVolume']]){$(id).value=Math.round((key==='musicVolume'?sound.musicVolume:sound.effectsVolume)*100);$(id).oninput=()=>{preferences[key]=Number($(id).value)/100;sound.setMix(preferences.musicVolume,preferences.effectsVolume);savePreferences();};}
$('music').value=preferences.music==='fight-club'?'fight-club':'theme';sound.setTrack($('music').value);
$('music').onchange=()=>{preferences.music=$('music').value;sound.setTrack(preferences.music);savePreferences();};
$('touch-setting').value=preferences.touch==='on'?'on':'auto';
$('touch-setting').onchange=()=>{preferences.touch=$('touch-setting').value;savePreferences();updateTouch();};
$('repeat-hit').checked=preferences.repeat!==false;input.repeatHit=$('repeat-hit').checked;
$('repeat-hit').onchange=()=>{input.repeatHit=$('repeat-hit').checked;preferences.repeat=input.repeatHit;savePreferences();};
haptics.enabled=preferences.haptics!==false;
$('haptics').checked=haptics.enabled;$('haptics').disabled=!haptics.supported;$('test-haptics').disabled=!haptics.supported;
$('haptics-status').textContent=haptics.supported?'Tap TEST VIBRATION. Device settings can suppress vibration.':'This browser does not support vibration. Visual hit feedback stays available.';
$('haptics').onchange=()=>{preferences.haptics=$('haptics').checked;haptics.enabled=preferences.haptics;haptics.activate();if(haptics.enabled)haptics.pulse(40,{test:true});else haptics.stop();savePreferences();};
$('test-haptics').onclick=()=>{haptics.activate();$('haptics-status').textContent=haptics.pulse(100,{test:true})?'Vibration requested. If you felt nothing, check device vibration settings.':haptics.enabled?'This browser or device declined vibration.':'Turn on touch vibration to test it.';};
document.addEventListener('pointerdown',e=>{haptics.activate();if(input.active&&e.pointerType==='touch'&&e.target.closest?.('#touch-controls'))haptics.pulse(12);},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)haptics.stop();});
$('coach-enabled').checked=preferences.hints!==false;
$('coach-enabled').onchange=()=>{preferences.hints=$('coach-enabled').checked;savePreferences();};
$('reset-coach').onclick=()=>{coach?.reset();preferences.hints=true;$('coach-enabled').checked=true;savePreferences();status('First-match tips reset.');};
$('quality').value=preferences.quality==='battery'?'battery':'auto';
$('quality').onchange=()=>{preferences.quality=$('quality').value;savePreferences();updateTouch();};
// Trap focus within the active modal and restore it when the modal closes.
addEventListener('keydown',e=>{
  const modal=[helpScreen,creditsScreen,resultScreen,pauseScreen].find(el=>!el.hidden);if(!modal)return;
  if(e.code==='Escape'&&!creditsScreen.hidden){e.preventDefault();$('credits-back').click();return;}
  if(e.code==='Escape'&&!helpScreen.hidden){e.preventDefault();closeHelp();return;}
  if(e.key==='Tab'){const buttons=Array.from(modal.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled]),summary,a[href]')).filter(el=>!el.hidden),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
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
    sound.updateMovement(match,paused||!selection.hidden);
    if(renderer){
      const menu=!selection.hidden||!$('opening').hidden;
      const drawDelta=framePacer.frame(now,{animated:Boolean(match&&!paused&&match.phase!=='done'&&!menu),hidden:document.hidden,fps:batteryDisplay()?30:60});
      if(drawDelta!==null){updateTouchContext();renderer.scheme=input.scheme;renderer.coachText=coach?.text(match,input.scheme,preferences.hints!==false)||'';const drawStart=performance.now();renderer.draw(match,arena,drawDelta,menu);if(match&&!menu&&!paused&&drawDelta>0&&renderBudget.observe(performance.now()-drawStart)){updateTouch();$('quality-note').textContent='Automatic display reduced rendering work for smoother play. Match timing stays the same.';}}
    }
  }catch(error){recoverRuntime(error);}
  requestAnimationFrame(loop);
}
async function init(){
  try{
    const response=await fetch('./assets/roster.json',{cache:'no-store'});if(!response.ok)throw new Error('Roster unavailable');roster=await response.json();let campaignStorage=null;try{campaignStorage=globalThis.localStorage;}catch{}coach=new Coach(campaignStorage);championships=new Championship(roster,campaignStorage);arcadeRewards=new ArcadeRewards(roster,campaignStorage);secrets=new SecretFighters(roster,campaignStorage);secrets.adopt(championships);buildRoster();
    ARENAS.forEach((a,i)=>{const option=document.createElement('option');option.value=i;option.textContent=a.name;$('arena').append(option);});
    await loadArena(0);
    const banners={},combatFx={};artworkState={banners,combatFx,pending:new Map()};
    renderer=new Renderer($('game'),roster,atlases,arenas,banners,combatFx,{onContextLost:()=>recoverRuntime(new Error('The graphics surface was reset.'))});updateTouch();$('fight').disabled=false;$('fight').textContent='FIGHT';$('enter-game').disabled=false;$('enter-game').textContent='ENTER THE LUNACY';$('boot-start').disabled=false;$('boot-start').textContent='PRESS START';$('boot-start').focus();requestAnimationFrame(loop);
    // The logo is tiny compared with the optional effects. Load it for branding,
    // then fetch announcements/effects only when a match actually needs them.
    requestArtwork(['unlocked','reversal','secondWind','timeout'],[]);
  }catch(error){$('boot-start').textContent='RELOAD GAME';$('boot-start').disabled=false;$('boot-start').onclick=()=>location.reload();$('enter-game').textContent='RELOAD GAME';$('enter-game').disabled=false;$('enter-game').onclick=()=>location.reload();$('fight').textContent='RELOAD GAME';$('fight').disabled=false;$('fight').onclick=()=>location.reload();$('footer-status').textContent='GAME FILES COULD NOT LOAD. USE THE INCLUDED LOCAL SERVER OR GITHUB PAGES.';console.error(error);}
}
init();
