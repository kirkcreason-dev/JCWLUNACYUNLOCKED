// Local championship campaigns use stable fighter IDs, never roster positions.
export const STAGES=['OPENING BOUT','QUARTERFINAL','CONTENDER MATCH','SEMIFINAL','TITLE MATCH'];
const copy=value=>JSON.parse(JSON.stringify(value));
const integer=value=>Number.isSafeInteger(value)&&value>=0&&value<=1000000;
export class Championship {
  constructor(roster,storage=null,random=Math.random){this.roster=roster;this.storage=storage;this.random=random;this.memory=new Map();this.dirty=new Set();this.saved=Boolean(storage);}
  key(fighter,difficulty){return `lunacy-championship-v1:${fighter}:${difficulty}`;}
  valid(r,fighter,difficulty){
    const ids=new Set(this.roster.map(f=>f.id));
    return r&&r.version===1&&r.fighter===fighter&&ids.has(fighter)&&r.difficulty===difficulty&&['easy','normal','hard'].includes(difficulty)&&['road','defend','dethroned'].includes(r.phase)&&Array.isArray(r.path)&&r.path.length===5&&new Set(r.path).size===5&&r.path.every(id=>ids.has(id)&&id!==fighter)&&integer(r.stage)&&r.stage<=5&&(r.phase==='road'?r.stage<5:r.stage===5)&&integer(r.arena)&&r.arena<6&&integer(r.titles)&&integer(r.defenses)&&integer(r.best)&&r.best>=r.defenses&&ids.has(r.opponent)&&r.opponent!==fighter&&(r.phase!=='road'||r.opponent===r.path[r.stage])&&(r.ticket===null||typeof r.ticket==='string'&&r.ticket.length<150);
  }
  load(fighter,difficulty){
    const key=this.key(fighter,difficulty);let raw=this.memory.get(key);
    try{const stored=this.dirty.has(key)?null:this.storage?.getItem(key);if(stored!==null&&stored!==undefined)raw=stored;}catch{this.saved=false;}
    try{const r=JSON.parse(raw||'null');return this.valid(r,fighter,difficulty)?r:null;}catch{return null;}
  }
  save(run){
    const key=this.key(run.fighter,run.difficulty),raw=JSON.stringify(run);this.memory.set(key,raw);
    try{if(!this.storage){this.saved=false;this.dirty.add(key);return;}this.storage.setItem(key,raw);this.dirty.delete(key);this.saved=true;}catch{this.saved=false;this.dirty.add(key);}
  }
  challenger(fighter,previous){
    const pool=this.roster.filter(f=>f.id!==fighter&&f.id!==previous);
    return pool[Math.floor(this.random()*pool.length)].id;
  }
  create(fighter,difficulty,arena,previous=null){
    if(!this.roster.some(f=>f.id===fighter)||!['easy','normal','hard'].includes(difficulty)||!Number.isInteger(arena)||arena<0||arena>=6)throw new Error('Invalid championship setup');
    const pool=this.roster.filter(f=>f.id!==fighter).map(f=>f.id);
    if(pool.length<5)throw new Error('Championship needs six fighters');
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const path=pool.slice(0,5);
    // Put the strongest drawn opponent in the title match, with no hidden stat buffs.
    const strength=id=>{const f=this.roster.find(f=>f.id===id);return f.power+f.speed+f.toughness+(f.technique||1);};
    const strongest=path.reduce((best,id,i)=>strength(id)>strength(path[best])?i:best,0);
    [path[4],path[strongest]]=[path[strongest],path[4]];
    return {version:1,fighter,difficulty,arena,phase:'road',path,stage:0,opponent:path[0],titles:previous?.titles||0,defenses:0,best:previous?.best||0,ticket:null};
  }
  start(fighter,difficulty,arena){
    let run=this.load(fighter,difficulty);
    if(!run||run.phase==='dethroned')run=this.create(fighter,difficulty,arena,run);
    run.ticket=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}-${Math.random()}`;
    this.save(run);return copy(run);
  }
  settle(bout,won){
    if(!bout||typeof won!=='boolean')return null;
    const run=this.load(bout.fighter,bout.difficulty);
    if(!run||!run.ticket||run.ticket!==bout.ticket)return null;
    run.ticket=null;let outcome='retry';
    if(won&&run.phase==='road'){
      run.stage++;
      if(run.stage===5){run.phase='defend';run.titles++;outcome='crowned';run.opponent=this.challenger(run.fighter,run.opponent);}
      else{run.opponent=run.path[run.stage];outcome='advance';}
    }else if(run.phase==='defend'){
      if(won){run.defenses++;run.best=Math.max(run.best,run.defenses);run.opponent=this.challenger(run.fighter,run.opponent);outcome='defended';}
      else{run.phase='dethroned';outcome='dethroned';}
    }
    this.save(run);return {run:copy(run),outcome};
  }
}
export function championshipLabel(run){return run.phase==='defend'?`TITLE DEFENSE ${run.defenses+1}`:run.phase==='dethroned'?'CHASE THE BELT':`${STAGES[run.stage]} · ${run.stage+1}/5`;}
export function championshipArena(run){return (run.arena+(run.phase==='road'?run.stage:5+run.defenses))%6;}
