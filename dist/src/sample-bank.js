const wavs=(group,count)=>Array.from({length:count},(_,i)=>`./assets/sfx/jcw/${group}_${String(i+1).padStart(2,'0')}.wav`);
export const SAMPLE_GROUPS=Object.freeze({
  punch_hit:wavs('punch_hit',3),kick_hit:wavs('kick_hit',3),body_slam_ring:wavs('body_slam_ring',4),
  chair_hit:wavs('chair_hit',3),trashcan_hit:wavs('trashcan_hit',3),bat_hit:wavs('bat_hit',3),guitar_smash:wavs('guitar_smash',3),
  weapon_swing:wavs('weapon_swing',4),rope_bounce:wavs('rope_bounce',3),jump_landing:wavs('jump_landing',3),ring_bell:wavs('ring_bell',2),
  ring_footstep:wavs('ring_footstep',4),male_oof_synthetic:wavs('male_oof_synthetic',3),female_oof_synthetic:wavs('female_oof_synthetic',3),
  dj_button:['./assets/sfx/dj-clay/01_chest_button_press.wav'],dj_charge:['./assets/sfx/dj-clay/02_speaker_charge.wav'],
  dj_blast:[1,2,3].map(i=>`./assets/sfx/dj-clay/03_bass_blast_0${i}.wav`)
});
// Never decode the long preview or layer the combined DJ attack over components.
export const SAMPLE_FILES=Object.freeze([...new Set(Object.values(SAMPLE_GROUPS).flat())]);
export class SampleBank {
  constructor({fetcher=(...args)=>fetch(...args),clock=()=>Date.now(),random=Math.random,timeout=8000,maxBytes=16*1024*1024}={}){
    this.fetcher=fetcher;this.clock=clock;this.random=random;this.timeout=timeout;this.maxBytes=maxBytes;
    this.context=null;this.buffers=new Map();this.failures=new Map();this.last=new Map();this.controllers=new Set();this.bytes=0;this.generation=0;this.loading=null;
  }
  reset(context){
    this.generation++;for(const controller of this.controllers)controller.abort();this.controllers.clear();
    this.context=context;this.buffers.clear();this.failures.clear();this.last.clear();this.bytes=0;this.loading=null;
  }
  load(context){
    if(!context?.decodeAudioData)return Promise.resolve();
    if(this.context!==context)this.reset(context);
    if(this.loading)return this.loading;
    const generation=this.generation,queue=SAMPLE_FILES.filter(path=>!this.buffers.has(path)&&this.clock()-(this.failures.get(path)??-Infinity)>=30000);
    const worker=async()=>{while(queue.length&&generation===this.generation){const path=queue.shift();await this.loadOne(path,context,generation);}};
    const loading=Promise.all([worker(),worker(),worker()]).then(()=>{if(generation===this.generation)this.loading=null;});this.loading=loading;return loading;
  }
  async loadOne(path,context,generation){
    const controller=new AbortController();this.controllers.add(controller);let timer;
    try{
      const operation=(async()=>{
        const response=await this.fetcher(path,{signal:controller.signal});if(!response.ok)throw Error('Sound unavailable');
        const data=await response.arrayBuffer();if(data.byteLength>300000)throw Error('Unexpected sound size');
        return context.decodeAudioData(data);
      })();
      const buffer=await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Sound timeout'));},this.timeout);})]);
      if(generation!==this.generation)return;
      const bytes=buffer.length*buffer.numberOfChannels*4;
      if(!Number.isFinite(bytes)||bytes<=0||buffer.duration>3||this.bytes+bytes>this.maxBytes)throw Error('Sound memory limit');
      this.buffers.set(path,buffer);this.bytes+=bytes;this.failures.delete(path);
    }catch{if(generation===this.generation)this.failures.set(path,this.clock());}
    finally{clearTimeout(timer);this.controllers.delete(controller);}
  }
  pick(group){
    const paths=(SAMPLE_GROUPS[group]||[]).filter(path=>this.buffers.has(path));if(!paths.length)return null;
    const alternatives=paths.length>1?paths.filter(path=>path!==this.last.get(group)):paths;
    const path=alternatives[Math.min(alternatives.length-1,Math.floor(this.random()*alternatives.length))];this.last.set(group,path);
    return {path,buffer:this.buffers.get(path)};
  }
}
