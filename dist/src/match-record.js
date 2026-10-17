// Complete matches only: falls, practice and local two-player bouts are excluded.
const modes=['cpu','pole','arcade','championship','online'];
const key='lunacy-match-record-v1';
const empty=()=>({version:1,wins:0,losses:0,receipts:[]});
export class MatchRecord {
  constructor(storage=null){this.storage=storage;this.memory=null;this.dirty=false;this.saved=Boolean(storage);}
  load(){
    let raw=this.memory;
    try{if(!this.dirty)raw=this.storage?.getItem(key)||raw;}catch{this.saved=false;}
    try{const r=JSON.parse(raw||'null');if(r?.version===1&&[r.wins,r.losses].every(n=>Number.isSafeInteger(n)&&n>=0)&&Array.isArray(r.receipts)&&r.receipts.length<=256&&r.receipts.every(s=>typeof s==='string'&&s.length<200))return r;}catch{}
    return empty();
  }
  flush(){
    if(!this.dirty)return this.saved;
    try{if(this.storage){this.storage.setItem(key,this.memory);this.dirty=false;this.saved=true;}else this.saved=false;}catch{this.saved=false;}
    return this.saved;
  }
  record(match,index=0){
    if(!match||match.phase!=='done'||![0,1].includes(index)||![0,1].includes(match.winner)||!modes.includes(match.options.mode)||typeof match.resultTicket!=='string')return false;
    const r=this.load();if(r.receipts.includes(match.resultTicket)){this.flush();return false;}
    r[match.winner===index?'wins':'losses']++;r.receipts.push(match.resultTicket);r.receipts=r.receipts.slice(-256);
    this.memory=JSON.stringify(r);this.dirty=true;
    this.flush();return true;
  }
}
