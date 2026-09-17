// Original procedural arcade effects; no downloaded voice or crowd recordings.
export class Sound {
  constructor(music=new Audio()){
    this.enabled=false;this.context=null;this.music=music;this.music.src='./assets/jcw-theme.mp3';this.music.loop=true;this.music.volume=.22;this.music.preload='metadata';this.suspended=false;
    this.voices=new Set();this.maxVoices=24;this.noiseBuffer=null;this.effectsVolume=.7;this.musicVolume=.22;this.lastCrowd=-10;
  }
  setMix(music=.22,effects=.7){this.musicVolume=Math.max(0,Math.min(1,Number(music)||0));this.effectsVolume=Math.max(0,Math.min(1,Number(effects)||0));this.music.volume=this.musicVolume;}
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
      if(AudioContext&&(!this.context||this.context.state==='closed')){this.context=new AudioContext();this.noiseBuffer=null;}
      const playback=this.suspended?Promise.resolve():this.music.play();
      await Promise.all([playback,this.suspended?null:this.context?.resume()]);
    }catch{}return this.enabled;
  }
  bootChime(){
    for(const [delay,freq,length] of [[0,261.63,.18],[.13,311.13,.18],[.26,392,.18],[.39,523.25,.42],[.52,261.63,.65],[.52,392,.65],[.52,659.25,.65],[2.08,783.99,.3],[3.2,130.81,.22]])this.tone(freq,length,'triangle',.055,freq,delay);
  }
  stopEffects(){for(const voice of [...this.voices])voice.dispose();}
  suspend(){this.suspended=true;this.music.pause();this.stopEffects();this.context?.suspend?.().catch(()=>{});}
  resume(){this.suspended=false;if(this.enabled){this.context?.resume().catch(()=>{});this.music.play().catch(()=>{});}}
  ready(){return this.enabled&&!this.suspended&&this.context&&this.context.state!=='closed'&&this.effectsVolume>0&&this.voices.size<this.maxVoices;}
  voice(source,gain,extra=[]){
    const nodes=[source,gain,...extra];let disposed=false;
    const voice={dispose:()=>{if(disposed)return;disposed=true;source.onended=null;try{source.stop();}catch{}for(const n of nodes)try{n.disconnect();}catch{}this.voices.delete(voice);}};
    this.voices.add(voice);source.onended=voice.dispose;return voice;
  }
  tone(freq,duration=.1,type='square',volume=.08,end=40,delay=0){
    if(!this.ready())return;let voice;
    try{const c=this.context,at=c.currentTime+delay,osc=c.createOscillator(),gain=c.createGain();voice=this.voice(osc,gain);osc.type=type;osc.frequency.setValueAtTime(freq,at);osc.frequency.exponentialRampToValueAtTime(Math.max(1,end),at+duration);gain.gain.setValueAtTime(.001,at);gain.gain.linearRampToValueAtTime(volume*this.effectsVolume,at+.005);gain.gain.exponentialRampToValueAtTime(.001,at+duration);osc.connect(gain);gain.connect(c.destination);osc.start(at);osc.stop(at+duration+.01);}catch{voice?.dispose();}
  }
  noise(duration=.12,volume=.1,frequency=900,band='lowpass',delay=0){
    if(!this.ready())return;let voice;
    try{const c=this.context,at=c.currentTime+delay;
      if(!this.noiseBuffer){this.noiseBuffer=c.createBuffer(1,Math.floor(c.sampleRate*.5),c.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
      const source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();voice=this.voice(source,gain,[filter]);source.buffer=this.noiseBuffer;source.loop=true;filter.type=band;filter.frequency.setValueAtTime(frequency,at);filter.Q.setValueAtTime(.7,at);gain.gain.setValueAtTime(.001,at);gain.gain.linearRampToValueAtTime(volume*this.effectsVolume,at+Math.min(.06,duration*.2));gain.gain.exponentialRampToValueAtTime(.001,at+duration);source.connect(filter);filter.connect(gain);gain.connect(c.destination);source.start(at);source.stop(at+duration+.01);
    }catch{voice?.dispose();}
  }
  bell(){for(const [f,v] of [[880,.12],[1422,.045],[2100,.025]])this.tone(f,.7,'sine',v,f);}
  crowd(){const now=this.context?.currentTime||0;if(now-this.lastCrowd<1.5)return;this.lastCrowd=now;this.noise(.95,.095,1450,'bandpass');this.noise(.7,.05,650,'bandpass',.14);}
  celebrate(){if(!this.enabled||this.suspended)return;for(const [i,f] of [261.63,329.63,392,523.25,659.25].entries())this.tone(f,.65,'triangle',.08,f,i*.14);this.crowd();}
  play(events){for(const e of events){switch(e.type){
    case 'hit':{const heavy=e.move!=='light';this.tone(heavy?105:170,heavy?.18:.10,'sine',heavy?.19:.13,45);this.noise(heavy?.16:.075,heavy?.12:.075,heavy?720:1700);if(e.move==='special'||e.combo>=3)this.crowd();break;}
    case 'slam':this.tone(85,.32,'sine',.24,25);this.noise(.32,.19,430);this.crowd();break;
    case 'throwBreak':this.tone(410,.17,'triangle',.10,650);break;
    case 'ropeRebound':this.tone(180,.24,'triangle',.08,370);this.noise(.09,.05,2100,'bandpass');break;
    case 'ropeBreak':case 'holdBreak':case 'kickout':this.tone(500,.22,'triangle',.10,850);this.crowd();break;
    case 'reversal':this.tone(620,.12,'triangle',.10,1020);this.noise(.12,.07,2400,'bandpass');break;
    case 'secondWind':this.tone(330,.35,'triangle',.12,880);this.crowd();break;
    case 'block':this.noise(.06,.08,2800,'bandpass');this.tone(480,.08,'triangle',.05,180);break;
    case 'fight':this.bell();break;
    case 'count':this.noise(.09,.18,950);this.tone(180+e.count*70,.12,'triangle',.08,110);break;
    case 'special':this.tone(160,.36,'sawtooth',.04,880);break;
    case 'roundEnd':this.bell();this.crowd();break;
    case 'grapple':this.noise(.08,.05,600);break;
    case 'swing':this.noise(.07,.025,1900,'bandpass');break;
    case 'land':this.noise(.065,.04,350);break;
  }}}
}
