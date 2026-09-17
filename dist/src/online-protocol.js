import {emptyInput} from './engine.js';
export const PROTOCOL='lunacy-2d-v12';
export const ACTIONS=['jump','light','heavy','grapple','special','weapon','taunt'];
const KEYS=Object.keys(emptyInput());
const STATES=new Set(['idle','walk','jump','block','light','heavy','special','hurt','down','pinned','rise','grapple','grabbed','lifted','thrown','throw','pin','defeat','victory','run','equip','taunt','climb','perch','dive']);
const FIELDS=['x','z','vz','vx','facing','hp','meter','guard','t','invincible','downTime','combo','walkDirection','fallDuration','divePower','chain'];
const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
const clone=value=>JSON.parse(JSON.stringify(value));

// Cumulative press counters survive coalesced writes and taps between packets.
// The receiver never deletes the sender's input node, avoiding lost-button races.
export class InputPackets{
  constructor(){this.seq=0;this.batch=0;this.batches=[];this.counts=Object.fromEntries(ACTIONS.map(k=>[k,0]));this.held=emptyInput();}
  capture(input){
    const keys=ACTIONS.filter(key=>input.pressed?.[key]||(input[key]&&!this.held[key]));
    for(const key of keys)this.counts[key]++;
    if(keys.length)this.batches.push({n:++this.batch,keys});this.batches=this.batches.slice(-64);
    this.held=Object.fromEntries(KEYS.map(k=>[k,Boolean(input[k])]));
  }
  packet(player){return {player,seq:++this.seq,held:{...this.held},presses:{...this.counts},batches:clone(this.batches)};}
}
export class RemoteInput{
  constructor(){this.seq=0;this.at=-Infinity;this.lastBatch=0;this.groups=[];this.counts=Object.fromEntries(ACTIONS.map(k=>[k,0]));this.held=emptyInput();}
  receive(packet,player,now){
    if(!packet||packet.player!==player||!Number.isSafeInteger(packet.seq)||packet.seq<=this.seq||!packet.held||!packet.presses)return false;
    if(!KEYS.every(k=>typeof packet.held[k]==='boolean')||!ACTIONS.every(k=>Number.isSafeInteger(packet.presses[k])&&packet.presses[k]>=this.counts[k]))return false;
    const batches=packet.batches||[];
    if(!Array.isArray(batches)||batches.length>64||!batches.every((b,i)=>Number.isSafeInteger(b.n)&&b.n>0&&(!i||b.n>batches[i-1].n)&&Array.isArray(b.keys)&&b.keys.length>0&&b.keys.length<=ACTIONS.length&&new Set(b.keys).size===b.keys.length&&b.keys.every(k=>ACTIONS.includes(k))))return false;
    this.seq=packet.seq;this.at=now;this.held={...packet.held};
    for(const b of batches)if(b.n>this.lastBatch){this.groups.push(b.keys);this.lastBatch=b.n;}
    this.groups=this.groups.slice(-32);this.counts={...packet.presses};
    return true;
  }
  read(now){
    if(now-this.at>600){this.groups=[];return emptyInput();}
    const input={...this.held,pressed:{}};
    for(const k of this.groups.shift()||[])input.pressed[k]=true;
    return input;
  }
}

export function packSnapshot(match,seq,events=[]){
  return {protocol:PROTOCOL,seq,round:match.round,wins:[...match.wins],phase:match.phase,phaseTime:match.phaseTime,
    remaining:match.remaining,winner:match.winner,roundWinner:match.roundWinner,method:match.method,
    fighters:match.fighters.map(f=>({id:f.id,state:f.state,weapon:f.weapon||'chair',attackStyle:f.attackStyle||'chair',move:f.move||null,fallFace:f.fallFace||'back',exhausted:Boolean(f.exhausted),confirmed:Boolean(f.confirmed),...Object.fromEntries(FIELDS.map(k=>[k,Number.isFinite(f[k])?f[k]:0]))})),
    grapple:match.grapple?clone(match.grapple):null,pin:match.pin?clone(match.pin):null,events:clone(events)};
}
export function validSnapshot(s,ids){
  if(!s||s.protocol!==PROTOCOL||!Number.isSafeInteger(s.seq)||s.seq<1||!['intro','fight','roundEnd','done'].includes(s.phase))return false;
  if(!finite(s.round,1,1000)||!finite(s.remaining,0,99)||!finite(s.phaseTime,0,100000)||!Array.isArray(s.wins)||s.wins.length!==2||!s.wins.every(n=>Number.isInteger(n)&&n>=0&&n<=2))return false;
  if(![null,0,1].includes(s.winner??null)||![null,0,1].includes(s.roundWinner??null)||typeof s.method!=='string'||s.method.length>80)return false;
  if(!Array.isArray(s.fighters)||s.fighters.length!==2)return false;
  if(!s.fighters.every((f,i)=>f.id===ids[i]&&STATES.has(f.state)&&['none','chair','bat','guitar','trashcan'].includes(f.weapon)&&['light','chair','bat','guitar','trashcan','kick'].includes(f.attackStyle)&&[null,undefined,'light','heavy','special','bat','guitar','trashcan'].includes(f.move)&&['front','back'].includes(f.fallFace)&&typeof f.exhausted==='boolean'&&typeof f.confirmed==='boolean'&&Number.isInteger(f.chain)&&finite(f.chain,0,2)&&FIELDS.every(k=>finite(f[k],-100000,100000))&&finite(f.x,200,1080)&&finite(f.z,0,1000)&&finite(f.hp,0,100)&&finite(f.meter,0,100)&&finite(f.guard,-100,100)&&[-1,1].includes(f.facing)))return false;
  if(s.grapple&&(![0,1].includes(s.grapple.attacker)||!finite(s.grapple.time,0,10)))return false;
  if(s.pin&&(![0,1].includes(s.pin.attacker)||!finite(s.pin.time,0,10)||!finite(s.pin.count,0,3)||!finite(s.pin.escape,0,100)||![undefined,'pin','submission'].includes(s.pin.kind)))return false;
  return true;
}
const EVENT_TYPES=new Set(['round','fight','hit','slam','block','special','notReady','throwBreak','holdBreak','kickout','guardBreak','count','roundEnd','matchEnd','jump','land','whiff','throw','pin','weapon','weaponBreak','taunt','tauntStart','climb','dive','ropeBreak','pinRelease','grapple','swing']);
export class SnapshotBuffer{
  constructor(ids){this.ids=ids;this.prev=null;this.next=null;this.at=0;this.eventSeq=0;this.events=[];}
  receive(packet,now){
    if(!validSnapshot(packet,this.ids)||(this.next&&packet.seq<=this.next.seq))return false;
    this.prev=this.next||packet;this.next=clone(packet);this.at=now;
    for(const e of packet.events||[])if(Number.isSafeInteger(e.serial)&&e.serial>this.eventSeq){
      this.eventSeq=e.serial;if(EVENT_TYPES.has(e.type))this.events.push(e);
    }
    return true;
  }
  apply(match,now){
    if(!this.next)return false;
    const s=this.next,old=this.prev,t=Math.max(0,Math.min(1,(now-this.at)/50));
    for(const key of ['round','wins','phase','phaseTime','remaining','method'])match[key]=clone(s[key]);
    match.winner=s.winner??null;match.roundWinner=s.roundWinner??null;match.grapple=s.grapple?clone(s.grapple):null;match.pin=s.pin?clone(s.pin):null;
    s.fighters.forEach((f,i)=>{
      const previous=old.fighters[i];Object.assign(match.fighters[i],f,{move:f.move??null});
      // Never interpolate across a new round, a hit pose, or a pin/throw boundary.
      if(old.round===s.round&&old.phase===s.phase&&previous.state===f.state){
        for(const key of ['x','z','t'])match.fighters[i][key]=previous[key]+(f[key]-previous[key])*t;
      }
    });
    return true;
  }
  drainEvents(){return this.events.splice(0);}
}
