// Secret fighters stay off the player's pick list until the championship belt is won once
// on this browser (any fighter, any difficulty). IDs are stable, so a secret that is not in
// the roster yet (Evil Dead) becomes hidden automatically the day it is added. Secret
// fighters can still be drawn as CPU opponents, so arcade and championship runs are unchanged.
export const SECRET_FIGHTERS=Object.freeze(['evil-dead','violent-j','jeff-lane','dj-clay','shaggy-2-dope']);
export const SECRET_KEY='lunacy-secrets-v1';
export class SecretFighters {
  constructor(roster,storage=null,secrets=SECRET_FIGHTERS){this.roster=roster;this.storage=storage;this.secrets=new Set(secrets);this.memory=null;this.saved=Boolean(storage);}
  isSecret(id){return this.secrets.has(id);}
  get present(){return this.roster.filter(f=>this.secrets.has(f.id));}
  record(){
    let raw=this.memory;
    try{const stored=this.storage?.getItem(SECRET_KEY);if(stored!==null&&stored!==undefined)raw=stored;}catch{this.saved=false;}
    try{const r=JSON.parse(raw||'null');return r&&r.version===1&&r.unlocked===true&&typeof r.by==='string'&&typeof r.date==='string'?r:null;}catch{return null;}
  }
  unlocked(){return Boolean(this.record());}
  playable(id){return !this.secrets.has(id)||this.unlocked();}
  indices(){return this.roster.map((f,i)=>i).filter(i=>this.playable(this.roster[i].id));}
  // Returns the newly revealed fighters the first time; an empty list if already unlocked.
  unlock(by){
    if(this.unlocked())return [];
    const record={version:1,unlocked:true,by:String(by||'championship'),date:new Date().toISOString()},raw=JSON.stringify(record);
    this.memory=raw;
    try{if(this.storage){this.storage.setItem(SECRET_KEY,raw);this.saved=true;}else this.saved=false;}catch{this.saved=false;}
    return this.present;
  }
  // Players who already won a title before secrets existed are unlocked at boot.
  adopt(championships,difficulties=['easy','normal','hard']){
    if(this.unlocked()||!championships)return [];
    for(const f of this.roster)for(const d of difficulties){const run=championships.load(f.id,d);if(run&&run.titles>0)return this.unlock(f.id);}
    return [];
  }
}
