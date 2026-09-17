export class Sound {
  constructor(music=new Audio()){this.enabled=false;this.context=null;this.music=music;this.music.src='./assets/jcw-theme.mp3';this.music.loop=true;this.music.volume=.22;this.music.preload='metadata';this.suspended=false;}
  setTrack(track){
    const src=track==='fight-club'?(this.music.canPlayType('audio/ogg; codecs=vorbis')?'./assets/fight-club.ogg':'./assets/fight-club.mp3'):'./assets/jcw-theme.mp3';
    if(this.track===track)return;this.track=track;this.music.pause();this.music.src=src;
    if(this.enabled&&!this.suspended)this.music.play().catch(()=>{});
  }
  enable(){return this.setEnabled(!this.enabled);}
  start(){this.suspended=false;return this.setEnabled(true);}
  async setEnabled(on){
    this.enabled=Boolean(on);
    if(!this.enabled){this.music.pause();return false;}
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(AudioContext)this.context ||= new AudioContext();
      // Request playback directly inside the opening button's user gesture.
      const playback=this.suspended?Promise.resolve():this.music.play();
      await Promise.all([playback,this.context?.resume()]);
    }catch{ /* A codec/device failure must not interrupt gameplay. */ }
    return this.enabled;
  }
  bootChime(){
    if(!this.enabled||this.suspended||!this.context)return;
    const c=this.context,now=c.currentTime;
    // Original ascending arcade arpeggio and a brief chord; no sampled console audio.
    for(const [delay,freq,length,volume,type] of [[0,261.63,.18,.05,'square'],[.13,311.13,.18,.05,'square'],[.26,392,.18,.05,'square'],[.39,523.25,.42,.06,'triangle'],[.52,261.63,.65,.04,'triangle'],[.52,392,.65,.035,'triangle'],[.52,659.25,.65,.025,'triangle'],[2.08,783.99,.3,.04,'triangle'],[3.2,130.81,.22,.04,'triangle']]){
      const osc=c.createOscillator(),gain=c.createGain(),at=now+delay;osc.type=type;osc.frequency.setValueAtTime(freq,at);gain.gain.setValueAtTime(.001,at);gain.gain.linearRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.001,at+length);osc.connect(gain);gain.connect(c.destination);osc.start(at);osc.stop(at+length+.02);
    }
  }
  suspend(){this.suspended=true;this.music.pause();}
  resume(){this.suspended=false;if(this.enabled){this.context?.resume().catch(()=>{});this.music.play().catch(()=>{});}}
  tone(freq,duration=.1,type='square',volume=.08,end=40){
    if(!this.enabled||this.suspended||!this.context)return;const c=this.context,osc=c.createOscillator(),gain=c.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,c.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(1,end),c.currentTime+duration);gain.gain.setValueAtTime(volume,c.currentTime);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);osc.connect(gain);gain.connect(c.destination);osc.start();osc.stop(c.currentTime+duration);
  }
  play(events){for(const e of events){switch(e.type){case 'hit':this.tone(e.move==='heavy'?110:190,.13,'sawtooth',.10);break;case 'slam':this.tone(90,.35,'triangle',.3,22);break;case 'throwBreak':this.tone(410,.17,'triangle',.11,650);break;case 'ropeBreak':case 'holdBreak':case 'kickout':this.tone(500,.22,'triangle',.12,850);break;case 'reversal':this.tone(620,.12,'triangle',.10,1020);break;case 'secondWind':this.tone(330,.35,'triangle',.12,880);break;case 'block':this.tone(560,.08,'square',.055,160);break;case 'fight':this.tone(880,.45,'square',.075,880);break;case 'count':this.tone(620,.15,'triangle',.17,500);break;case 'special':this.tone(160,.6,'sawtooth',.08,1100);break;case 'roundEnd':this.tone(700,.5,'triangle',.13,280);break;case 'grapple':this.tone(120,.08,'triangle',.06,70);break;case 'swing':this.tone(260,.06,'triangle',.025,60);break;}}}
}
