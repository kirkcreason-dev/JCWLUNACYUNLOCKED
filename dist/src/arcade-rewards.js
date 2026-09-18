export const ARCADE_REWARDS=Object.freeze({easy:{medal:'bronze',title:'LUNACY SURVIVOR'},normal:{medal:'silver',title:'ROSTER WRECKER'},hard:{medal:'gold',title:'LUNACY LEGEND'}});
// Stable IDs preserve achievements when names or roster order change.
export class ArcadeRewards {
  constructor(roster,storage=null){this.roster=roster;this.storage=storage;this.memory=new Map();this.dirty=new Set();this.saved=Boolean(storage);}
  key(id,difficulty){return `lunacy-arcade-medal-v1:${id}:${difficulty}`;}
  get(id,difficulty){
    if(!ARCADE_REWARDS[difficulty]||!this.roster.some(f=>f.id===id))return null;
    const key=this.key(id,difficulty);let raw=this.memory.get(key);
    try{if(!this.dirty.has(key))raw=this.storage?.getItem(key)||raw;}catch{this.saved=false;}
    try{const r=JSON.parse(raw||'null');return r?.version===1&&r.fighter===id&&r.difficulty===difficulty&&Number.isSafeInteger(r.opponents)&&r.opponents>0&&typeof r.date==='string'?r:null;}catch{return null;}
  }
  award({fighter,difficulty,defeated,mode,won}){
    const expected=this.roster.filter(f=>f.id!==fighter).map(f=>f.id);
    if(mode!=='arcade'||won!==true||!ARCADE_REWARDS[difficulty]||!this.roster.some(f=>f.id===fighter)||!Array.isArray(defeated)||defeated.length!==expected.length||new Set(defeated).size!==expected.length||!expected.every(id=>defeated.includes(id)))return null;
    const previous=this.get(fighter,difficulty);if(previous)return {record:previous,fresh:false,...ARCADE_REWARDS[difficulty]};
    const record={version:1,fighter,difficulty,opponents:expected.length,date:new Date().toISOString()},key=this.key(fighter,difficulty),raw=JSON.stringify(record);
    this.memory.set(key,raw);this.dirty.add(key);
    try{if(this.storage){this.storage.setItem(key,raw);this.dirty.delete(key);this.saved=true;}else this.saved=false;}catch{this.saved=false;}
    return {record,fresh:true,...ARCADE_REWARDS[difficulty]};
  }
  triple(id){return Object.keys(ARCADE_REWARDS).every(d=>this.get(id,d));}
}
