// Save the run, and completed falls, rather than a fragile mid-animation snapshot.
const copy=value=>JSON.parse(JSON.stringify(value));
const levels=['easy','normal','hard'];
export const resultTicket=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}-${Math.random()}`;
export class ArcadeRun {
  constructor(roster,storage=null,random=Math.random){this.roster=roster;this.storage=storage;this.random=random;this.memory=new Map();this.dirty=new Set();this.saved=Boolean(storage);}
  key(fighter,difficulty){return `lunacy-arcade-run-v1:${fighter}:${difficulty}`;}
  valid(run,fighter,difficulty,ids=new Set(this.roster.map(f=>f.id))){
    return run?.version===1&&run.fighter===fighter&&ids.has(fighter)&&run.difficulty===difficulty&&levels.includes(difficulty)&&
      typeof run.id==='string'&&run.id.length<160&&(run.ticket===null||typeof run.ticket==='string'&&run.ticket.length<160)&&
      Array.isArray(run.opponents)&&run.opponents.length>0&&new Set(run.opponents).size===run.opponents.length&&run.opponents.every(id=>id!==fighter&&ids.has(id))&&
      Number.isInteger(run.index)&&run.index>=0&&run.index<=run.opponents.length&&Number.isInteger(run.arena)&&run.arena>=0&&run.arena<6&&
      (run.checkpoint===null||Number.isInteger(run.checkpoint?.round)&&run.checkpoint.round>0&&run.checkpoint.round<1000000&&
        Array.isArray(run.checkpoint.wins)&&run.checkpoint.wins.length===2&&run.checkpoint.wins.every(n=>Number.isInteger(n)&&n>=0&&n<=2)&&
        !run.checkpoint.wins.every(n=>n===2)&&typeof run.checkpoint.method==='string'&&run.checkpoint.method.length<80);
  }
  load(fighter,difficulty){
    const key=this.key(fighter,difficulty);let raw=this.memory.get(key);
    try{if(!this.dirty.has(key))raw=this.storage?.getItem(key)||raw;}catch{this.saved=false;}
    try{
      const run=JSON.parse(raw||'null'),ids=new Set(this.roster.map(f=>f.id));
      if(ids.has(fighter)&&!ids.has('yabo')&&run?.opponents?.includes('yabo')&&this.valid(run,fighter,difficulty,new Set([...ids,'yabo']))){
        const removed=run.opponents.indexOf('yabo'),complete=run.index===run.opponents.length,current=removed===run.index;
        run.opponents.splice(removed,1);if(removed<run.index)run.index--;
        if(!complete)for(const id of ids)if(id!==fighter&&!run.opponents.includes(id))run.opponents.push(id);
        if(current){run.checkpoint=null;run.ticket=null;}
        this.save(run);
      }
      return this.valid(run,fighter,difficulty)?run:null;
    }catch{return null;}
  }
  save(run){
    run.updatedAt=Date.now();
    const key=this.key(run.fighter,run.difficulty),raw=JSON.stringify(run);this.memory.set(key,raw);this.dirty.add(key);
    try{if(this.storage){this.storage.setItem(key,raw);this.dirty.delete(key);this.saved=true;}else this.saved=false;}catch{this.saved=false;}
    return copy(run);
  }
  latest(){
    let latest=null;
    const time=run=>Number.isFinite(run?.updatedAt)?run.updatedAt:0;
    for(const f of this.roster)for(const difficulty of levels){
      const run=this.load(f.id,difficulty);if(!run||run.index===run.opponents.length)continue;
      if(!latest||time(run)>time(latest)||time(run)===time(latest)&&run.index>latest.index)latest=run;
    }
    return latest;
  }
  flush(){
    if(!this.storage){this.saved=false;return false;}
    for(const key of this.dirty){try{this.storage.setItem(key,this.memory.get(key));this.dirty.delete(key);}catch{}}
    this.saved=this.dirty.size===0;return this.saved;
  }
  start(fighter,difficulty,arena,{fresh=false}={}){
    if(!this.roster.some(f=>f.id===fighter)||!levels.includes(difficulty)||!Number.isInteger(arena)||arena<0||arena>=6)throw new Error('Invalid arcade setup');
    let run=fresh?null:this.load(fighter,difficulty);
    if(!run||run.index===run.opponents.length){
      const opponents=this.roster.filter(f=>f.id!==fighter).map(f=>f.id);
      for(let i=opponents.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[opponents[i],opponents[j]]=[opponents[j],opponents[i]];}
      run={version:1,id:resultTicket(),fighter,difficulty,arena,opponents,index:0,ticket:null,checkpoint:null};
    }else{
      // A future roster expansion keeps defeated opponents and appends newcomers.
      for(const f of this.roster)if(f.id!==fighter&&!run.opponents.includes(f.id))run.opponents.push(f.id);
    }
    run.ticket ||= resultTicket();return this.save(run);
  }
  current(bout){const run=bout&&this.load(bout.fighter,bout.difficulty);return run&&run.id===bout.id&&run.ticket&&run.ticket===bout.ticket&&run.index===bout.index?run:null;}
  checkpoint(bout,match){
    const run=this.current(bout);if(!run||match.phase!=='roundEnd')return false;
    const next={round:match.round+1,wins:[...match.wins],method:match.method};
    // Another window cannot roll the checkpoint back to an earlier fall.
    if(run.checkpoint&&run.checkpoint.round>=next.round)return false;
    run.checkpoint=next;this.save(run);return true;
  }
  restore(bout,match){
    const point=bout?.checkpoint;if(!point)return;
    match.round=point.round;match.wins=[...point.wins];match.newRound();
    if(point.wins.includes(2)){match.phase='done';match.winner=point.wins[0]===2?0:1;match.method=point.method;}
  }
  settle(bout,won){
    const run=this.current(bout);if(!run||typeof won!=='boolean')return null;
    if(won)run.index++;
    run.ticket=null;run.checkpoint=null;this.save(run);return {run,complete:run.index===run.opponents.length};
  }
}
