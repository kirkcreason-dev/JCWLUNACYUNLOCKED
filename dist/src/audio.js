import {SampleBank} from './sample-bank.js?v=0.19.0';
import {impactGroup,gruntGroup} from './sound-events.js?v=0.19.0';
import {MOVES} from './engine.js?v=0.19.0';
// Supplied synthesized samples, with procedural fallbacks for missing audio.
export class Sound {
  constructor(music=new Audio(),{bank=new SampleBank()}={}){
    this.enabled=false;this.context=null;this.music=music;this.music.src='./assets/jcw-theme.mp3';this.music.loop=true;this.music.volume=.22;this.music.preload='metadata';this.suspended=false;
    this.voices=new Set();this.maxVoices=24;this.noiseBuffer=null;this.effectsVolume=.7;this.musicVolume=.22;this.lastCrowd=-10;this.bank=bank;this.limiter=null;this.footsteps=[];this.lastGrunt=[-Infinity,-Infinity];
  }
  setMix(music=.22,effects=.7){this.musicVolume=Math.max(0,Math.min(1,Number(music)||0));this.effectsVolume=Math.max(0,Math.min(1,Number(effects)||0));this.music.volume=this.musicVolume;if(this.effectsVolume===0)this.stopEffects();}
  setTrack(track){
    const src=track==='fight-club'?(this.music.canPlayType('audio/ogg; codecs=vorbis')?'./assets/fight-club.ogg':'./assets/fight-club.mp3'):'./assets/jcw-theme.mp3';
    if(this.track===track)return;this.track=track;this.music.pause();this.music.src=src;
    if(this.enabled&&!this.suspended)this.music.play().catch(()=>{});
  }
  enable(){return this.setEnabled(!this.enabled);}
  start(){this.suspended=false;return this.setEnabled(true);}
  async setEnabled(on){
    this.enabled=Boolean(on);
    if(!this.enabled){this.music.pause();this.stopEffects();return false;}
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(AudioContext&&(!this.context||this.context.state==='closed')){this.stopEffects();this.context=new AudioContext();this.noiseBuffer=null;this.lastCrowd=-10;this.lastGrunt=[-Infinity,-Infinity];}
      if(this.context)void this.bank.load(this.context);
      const playback=this.suspended?Promise.resolve():this.music.play();
      await Promise.all([playback,this.suspended?null:this.context?.resume()]);
    }catch{}return this.enabled;
  }
  bootChime(){
    for(const [delay,freq,length] of [[0,261.63,.18],[.13,311.13,.18],[.26,392,.18],[.39,523.25,.42],[.52,261.63,.65],[.52,392,.65],[.52,659.25,.65],[2.08,783.99,.3],[3.2,130.81,.22]])this.tone(freq,length,'triangle',.055,freq,delay);
  }
  stopEffects(){for(const voice of [...this.voices])voice.dispose();this.footsteps=[];try{this.limiter?.disconnect();}catch{}this.limiter=null;}
  suspend(){this.suspended=true;this.music.pause();this.stopEffects();this.context?.suspend?.().catch(()=>{});}
  resume(){this.suspended=false;if(this.enabled){this.context?.resume().catch(()=>{});this.music.play().catch(()=>{});}}
  ready(){return this.enabled&&!this.suspended&&this.context&&this.context.state==='running'&&this.effectsVolume>0&&this.voices.size<this.maxVoices;}
  voice(source,gain,extra=[],tag=null){
    const nodes=[source,gain,...extra];let disposed=false;
    const voice={tag,dispose:()=>{if(disposed)return;disposed=true;source.onended=null;try{source.stop();}catch{}for(const n of nodes)try{n.disconnect();}catch{}this.voices.delete(voice);}};
    this.voices.add(voice);source.onended=voice.dispose;return voice;
  }
  tone(freq,duration=.1,type='square',volume=.08,end=40,delay=0,tag=null){
    if(!this.ready())return;let voice;
    try{const c=this.context,at=c.currentTime+delay,osc=c.createOscillator(),gain=c.createGain();voice=this.voice(osc,gain,[],tag);osc.type=type;osc.frequency.setValueAtTime(freq,at);osc.frequency.exponentialRampToValueAtTime(Math.max(1,end),at+duration);gain.gain.setValueAtTime(.001,at);gain.gain.linearRampToValueAtTime(volume*this.effectsVolume,at+.005);gain.gain.exponentialRampToValueAtTime(.001,at+duration);osc.connect(gain);gain.connect(this.output());osc.start(at);osc.stop(at+duration+.01);}catch{voice?.dispose();}
  }
  noise(duration=.12,volume=.1,frequency=900,band='lowpass',delay=0){
    if(!this.ready())return;let voice;
    try{const c=this.context,at=c.currentTime+delay;
      if(!this.noiseBuffer){this.noiseBuffer=c.createBuffer(1,Math.floor(c.sampleRate*.5),c.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
      const source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();voice=this.voice(source,gain,[filter]);source.buffer=this.noiseBuffer;source.loop=true;filter.type=band;filter.frequency.setValueAtTime(frequency,at);filter.Q.setValueAtTime(.7,at);gain.gain.setValueAtTime(.001,at);gain.gain.linearRampToValueAtTime(volume*this.effectsVolume,at+Math.min(.06,duration*.2));gain.gain.exponentialRampToValueAtTime(.001,at+duration);source.connect(filter);filter.connect(gain);gain.connect(this.output());source.start(at);source.stop(at+duration+.01);
    }catch{voice?.dispose();}
  }
  output(){
    const c=this.context;if(this.limiter)return this.limiter;if(!c?.createDynamicsCompressor)return c?.destination;
    try{const node=c.createDynamicsCompressor();node.threshold.value=-10;node.knee.value=12;node.ratio.value=8;node.attack.value=.003;node.release.value=.18;node.connect(c.destination);this.limiter=node;return node;}catch{return c.destination;}
  }
  sample(group,{volume=.45,delay=0,duration=null,tail=false,tag=null}={}){
    if(!this.ready())return false;const selected=this.bank.pick(group);if(!selected)return false;let voice;
    try{
      const c=this.context,buffer=selected.buffer,span=Math.min(buffer.duration,duration??buffer.duration);if(span<.01)return false;
      const at=c.currentTime+Math.max(0,delay),source=c.createBufferSource(),gain=c.createGain();voice=this.voice(source,gain,[],tag);source.buffer=buffer;
      const level=volume*this.effectsVolume;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.002);gain.gain.setValueAtTime(level,at+Math.max(.002,span-.015));gain.gain.linearRampToValueAtTime(0,at+span);
      source.connect(gain);gain.connect(this.output());source.start(at,tail?Math.max(0,buffer.duration-span):0,span);source.stop(at+span+.01);return true;
    }catch{voice?.dispose();return false;}
  }
  stopCharge(index){for(const voice of [...this.voices])if(voice.tag===`dj-charge-${index}`)voice.dispose();}
  djCharge(index,elapsed=0){
    this.stopCharge(index);const startup=MOVES.special.startup;if(elapsed>=startup)return;
    const tag=`dj-charge-${index}`,delay=Math.max(0,startup/3-elapsed),duration=startup-Math.max(elapsed,startup/3);
    if(elapsed<startup/3&&!this.sample('dj_button',{volume:.45,tag}))this.tone(740,.045,'triangle',.05,1100,0,tag);
    if(duration>.01&&!this.sample('dj_charge',{volume:.25,delay,duration,tail:true,tag}))this.tone(160,duration,'sawtooth',.035,880,delay,tag);
  }
  djBlast(index){
    this.stopCharge(index);
    if(!this.sample('dj_blast',{volume:.52})){this.tone(95,.5,'sine',.20,35);this.noise(.24,.08,680);}
  }
  grunt(index,match){
    const now=this.context?.currentTime||0;if(!Number.isInteger(index)||now-(this.lastGrunt[index]??-Infinity)<.42)return;
    if(this.sample(gruntGroup(match?.fighters?.[index]?.definition?.id),{volume:.14}))this.lastGrunt[index]=now;
  }
  updateMovement(match,paused=false){
    if(!this.ready()||paused||match?.phase!=='fight'){this.footsteps=[];return;}
    for(const [index,f] of match.fighters.entries()){
      const old=this.footsteps[index],moving=f.z===0&&['walk','run'].includes(f.state)&&!match.hitStop&&!match.grapple&&!match.pin;
      const next={x:f.x,id:f.id,round:match.round,distance:0,last:old?.last??-Infinity};this.footsteps[index]=next;
      if(!moving||!old||old.id!==f.id||old.round!==match.round)continue;
      const distance=Math.abs(f.x-old.x);if(distance<.1||distance>110)continue;
      next.distance=old.distance+distance;const stride=f.state==='run'?100:78,now=this.context.currentTime;
      if(next.distance>=stride&&now-old.last>=.15){this.sample('ring_footstep',{volume:.11});next.distance%=stride;next.last=now;}
    }
  }
  bell(){if(this.sample('ring_bell',{volume:.38}))return;for(const [f,v] of [[880,.12],[1422,.045],[2100,.025]])this.tone(f,.7,'sine',v,f);}
  crowd(){const now=this.context?.currentTime||0;if(now-this.lastCrowd<1.5)return;this.lastCrowd=now;this.noise(.95,.095,1450,'bandpass');this.noise(.7,.05,650,'bandpass',.14);}
  celebrate(){if(!this.enabled||this.suspended)return;for(const [i,f] of [261.63,329.63,392,523.25,659.25].entries())this.tone(f,.65,'triangle',.08,f,i*.14);this.crowd();}
  play(events,match=null){
    if(match)for(const [i,f] of match.fighters.entries())if(f.move!=='special'||f.definition.id!=='dj-clay')this.stopCharge(i);
    for(const e of events){switch(e.type){
    case 'hit':{
      this.stopCharge(e.index);const group=impactGroup(e,match),heavy=e.move!=='light';
      if(group&&!this.sample(group,{volume:heavy?.48:.40})){this.tone(heavy?105:170,heavy?.18:.10,'sine',heavy?.19:.13,45);this.noise(heavy?.16:.075,heavy?.12:.075,heavy?720:1700);}
      this.grunt(e.index,match);if(e.move==='special'||e.combo>=3)this.crowd();break;
    }
    case 'slam':this.stopCharge(e.index);if(!this.sample('body_slam_ring',{volume:.5})){this.tone(85,.32,'sine',.24,25);this.noise(.32,.19,430);}this.grunt(e.index,match);this.crowd();break;
    case 'throwBreak':this.tone(410,.17,'triangle',.10,650);break;
    case 'ropeRebound':if(!this.sample('rope_bounce',{volume:.3})){this.tone(180,.24,'triangle',.08,370);this.noise(.09,.05,2100,'bandpass');}break;
    case 'ropeBreak':case 'holdBreak':case 'kickout':this.tone(500,.22,'triangle',.10,850);this.crowd();break;
    case 'reversal':this.stopCharge(e.attacker);this.tone(620,.12,'triangle',.10,1020);this.noise(.12,.07,2400,'bandpass');break;
    case 'secondWind':this.tone(330,.35,'triangle',.12,880);this.crowd();break;
    case 'block':this.noise(.06,.08,2800,'bandpass');this.tone(480,.08,'triangle',.05,180);break;
    case 'fight':this.bell();break;
    case 'count':this.noise(.09,.18,950);this.tone(180+e.count*70,.12,'triangle',.08,110);break;
    case 'special':{
      const f=match?.fighters?.[e.index],dj=(e.fighter||f?.definition?.id)==='dj-clay'&&e.kind!=='dive';
      if(dj){if(!f||f.move==='special')this.djCharge(e.index,f?.t||0);}else this.tone(160,.36,'sawtooth',.04,880);break;
    }
    case 'attackActive':if(e.move==='special'&&e.fighter==='dj-clay')this.djBlast(e.index);break;
    case 'roundEnd':this.stopCharge(0);this.stopCharge(1);this.bell();this.crowd();break;
    case 'round':this.stopEffects();break;
    case 'grapple':this.stopCharge(0);this.stopCharge(1);this.noise(.08,.05,600);break;
    case 'swing':if(!(e.move==='special'&&e.fighter==='dj-clay')&&!this.sample('weapon_swing',{volume:e.move==='light'?.12:.19}))this.noise(.07,.025,1900,'bandpass');break;
    case 'land':if(!events.some(x=>x.type==='slam'&&x.index===e.index)&&!this.sample('jump_landing',{volume:.25}))this.noise(.065,.04,350);break;
    }}
  }
}
