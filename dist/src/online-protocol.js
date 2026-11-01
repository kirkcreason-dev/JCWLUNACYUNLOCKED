import {emptyInput} from './engine.js?v=0.25.1';
export const PROTOCOL='lunacy-2d-v25';
export const SQUAD_PROTOCOL='lunacy-squad-v25';
export const ACTIONS=['jump','light','heavy','grapple','special','weapon','taunt','block'];
const KEYS=Object.keys(emptyInput());
const STATES=new Set(['idle','walk','jump','block','light','heavy','special','hurt','down','pinned','rise','grapple','grabbed','lifted','thrown','throw','pin','defeat','victory','run','equip','taunt','climb','perch','ropeTaunt','dive']);
const FIELDS=['x','z','vz','vx','facing','hp','meter','guard','t','invincible','downTime','combo','walkDirection','fallDuration','divePower','chain','reversalWindow','reversalCooldown','reboundTime','reboundDirection','ropeTime','weaponUses'];
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

const WEAPON_KEYS=['chair','bat','guitar','trashcan','bottle'];
const packFighter=f=>({id:f.id,state:f.state,weapon:f.weapon||'chair',weaponWear:Object.fromEntries(WEAPON_KEYS.map(k=>[k,f.weaponWear?.[k]||0])),attackStyle:f.attackStyle||'chair',move:f.move||null,fallFace:f.fallFace||'back',exhausted:Boolean(f.exhausted),confirmed:Boolean(f.confirmed),secondWindUsed:Boolean(f.secondWindUsed),...Object.fromEntries(FIELDS.map(k=>[k,Number.isFinite(f[k])?f[k]:0]))});
export function packSnapshot(match,seq,events=[]){
  return {protocol:PROTOCOL,seq,round:match.round,wins:[...match.wins],phase:match.phase,phaseTime:match.phaseTime,
    remaining:match.remaining,winner:match.winner,roundWinner:match.roundWinner,method:match.method,
    fighters:match.fighters.map(packFighter),
    pole:match.pole?clone(match.pole):null,grapple:match.grapple?clone(match.grapple):null,pin:match.pin?clone(match.pin):null,events:clone(events)};
}
export function validSnapshot(s,ids){
  if(!s||s.protocol!==PROTOCOL||!Number.isSafeInteger(s.seq)||s.seq<1||!['intro','fight','roundEnd','done'].includes(s.phase))return false;
  if(!finite(s.round,1,1000)||!finite(s.remaining,0,99)||!finite(s.phaseTime,0,100000)||!Array.isArray(s.wins)||s.wins.length!==2||!s.wins.every(n=>Number.isInteger(n)&&n>=0&&n<=2))return false;
  if(![null,0,1].includes(s.winner??null)||![null,0,1].includes(s.roundWinner??null)||typeof s.method!=='string'||s.method.length>80)return false;
  if(!Array.isArray(s.fighters)||s.fighters.length!==2)return false;
  if(!s.fighters.every((f,i)=>f.id===ids[i]&&validFighter(f)))return false;
  return validHolds(s,2);
}
// Shape and range checks shared by one-on-one and four-player snapshots.
function validFighter(f){
  if(!f||typeof f.secondWindUsed!=='boolean'||!finite(f.reversalWindow,0,.12)||!finite(f.reversalCooldown,0,1.2))return false;
  if(!(STATES.has(f.state)&&['none',...WEAPON_KEYS].includes(f.weapon)&&['light','chair','bat','guitar','trashcan','bottle','kick'].includes(f.attackStyle)&&[null,undefined,'light','heavy','special','bat','guitar','trashcan','bottle','counter','aerial'].includes(f.move)&&['front','back'].includes(f.fallFace)&&typeof f.exhausted==='boolean'&&typeof f.confirmed==='boolean'&&Number.isInteger(f.chain)&&finite(f.chain,0,2)&&FIELDS.every(k=>finite(f[k],-100000,100000))&&finite(f.x,200,1080)&&finite(f.z,0,1000)&&finite(f.hp,0,100)&&finite(f.meter,0,100)&&finite(f.guard,-100,100)&&[-1,1].includes(f.facing)))return false;
  return Boolean(f.weaponWear&&typeof f.weaponWear==='object'&&!Array.isArray(f.weaponWear)&&Object.entries(f.weaponWear).every(([k,v])=>WEAPON_KEYS.includes(k)&&Number.isInteger(v)&&finite(v,0,6)));
}
function validHolds(s,count){
  const who=n=>Number.isInteger(n)&&n>=0&&n<count;
  if(s.pole&&(!finite(s.pole.x,200,1080)||typeof s.pole.claimed!=='boolean'||typeof s.pole.broken!=='boolean'||![null,0,1].includes(s.pole.holder??null)||![null,0,1].includes(s.pole.claimant??null)||!finite(s.pole.progress,0,1.05)||!finite(s.pole.uses,0,4)||(s.pole.looseX!=null&&!finite(s.pole.looseX,200,1080))))return false;
  if(s.grapple?.kind==='superplex'&&(!finite(s.grapple.corner,200,1080)||![-1,1].includes(s.grapple.throwDir)||!Array.isArray(s.grapple.origins)||s.grapple.origins.length!==2||!s.grapple.origins.every(o=>finite(o.x,200,1080)&&finite(o.z,0,140))))return false;
  if(s.grapple?.kind==='chokeslam'&&!finite(s.grapple.startX,200,1080))return false;
  if(s.grapple&&(!who(s.grapple.attacker)||(s.grapple.defender!=null&&(!who(s.grapple.defender)||s.grapple.defender===s.grapple.attacker))||!finite(s.grapple.time,0,10)))return false;
  if(s.pin&&(!who(s.pin.attacker)||(s.pin.defender!=null&&(!who(s.pin.defender)||s.pin.defender===s.pin.attacker))||!finite(s.pin.time,0,10)||!finite(s.pin.count,0,3)||!finite(s.pin.escape,0,100)||![undefined,'pin','submission'].includes(s.pin.kind)))return false;
  return true;
}
const EVENT_TYPES=new Set(['pinBreak','tag','elimination','suddenDeath','poleClaim','poleDrop','poleHint','attackActive','round','fight','hit','slam','block','special','notReady','throwBreak','holdBreak','kickout','guardBreak','count','roundEnd','matchEnd','jump','land','whiff','throw','pin','weapon','weaponBreak','taunt','tauntStart','climb','dive','ropeBreak','pinRelease','grapple','swing','reversal','secondWind','ropeRebound']);
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
    match.pole=s.pole?{holder:null,claimant:null,looseX:null,...clone(s.pole)}:null;match.winner=s.winner??null;match.roundWinner=s.roundWinner??null;match.grapple=s.grapple?clone(s.grapple):null;match.pin=s.pin?clone(s.pin):null;
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

// ---- four-player rooms ----
// Wrestlers can change between falls (elimination) or on a tag, so a guest checks
// ids against the room's eight team slots instead of a fixed pair.
const list=v=>Array.isArray(v)?v:v&&typeof v==='object'?Object.values(v):[];
const pair=v=>[0,1].map(i=>list(v?.[i]));
export function packSquadSnapshot(match,seq,events=[]){
  const base=packSnapshot(match,seq,events);
  return {...base,protocol:SQUAD_PROTOCOL,
    fighters:match.fighters.map(f=>({...packFighter(f),side:f.side??0,player:f.player??0,out:Boolean(f.out),outTime:Number.isFinite(f.outTime)?f.outTime:0})),
    team:{format:match.format,slot:[...(match.slot||[0,0])],out:(match.out||[[],[]]).map(o=>o.slice()),suddenDeath:Boolean(match.suddenDeath),
      stats:Object.fromEntries(Object.entries(match.stats||{}).map(([id,v])=>[id,{hp:v.hp,meter:v.meter}])),cpu:[...(match.cpuPlayers||[])]}};
}
export function validSquadSnapshot(s,teams){
  const ids=new Set(teams.flat());
  if(!s||s.protocol!==SQUAD_PROTOCOL||!Number.isSafeInteger(s.seq)||s.seq<1||!['intro','fight','roundEnd','done'].includes(s.phase))return false;
  if(!finite(s.round,1,1000)||!finite(s.remaining,0,150)||!finite(s.phaseTime,0,100000)||!Array.isArray(s.wins)||s.wins.length!==2||!s.wins.every(n=>Number.isInteger(n)&&n>=0&&n<=20))return false;
  if(![null,0,1].includes(s.winner??null)||![null,0,1].includes(s.roundWinner??null)||typeof s.method!=='string'||s.method.length>80)return false;
  if(!Array.isArray(s.fighters)||![2,4].includes(s.fighters.length))return false;
  if(!s.fighters.every(f=>ids.has(f.id)&&validFighter(f)&&[0,1].includes(f.side)&&Number.isInteger(f.player)&&f.player>=0&&f.player<4&&typeof f.out==='boolean'&&finite(f.outTime,0,100000)))return false;
  if(new Set(s.fighters.map(f=>f.id)).size!==s.fighters.length)return false;
  const t=s.team;if(!t||typeof t!=='object'||!['elimination','tag','tornado'].includes(t.format)||!Array.isArray(t.slot)||t.slot.length!==2||!t.slot.every((n,i)=>Number.isInteger(n)&&n>=0&&n<=teams[i].length))return false;
  if(!pair(t.out).every(o=>o.every(id=>ids.has(id)))||!list(t.cpu).every(n=>Number.isInteger(n)&&n>=0&&n<4))return false;
  if(t.stats&&(typeof t.stats!=='object'||!Object.entries(t.stats).every(([id,v])=>ids.has(Number(id))&&finite(v?.hp,0,100)&&finite(v?.meter,0,100))))return false;
  return validHolds(s,s.fighters.length);
}
export class SquadSnapshotBuffer extends SnapshotBuffer{
  constructor(teams){super([]);this.teams=teams;}
  receive(packet,now){
    if(!validSquadSnapshot(packet,this.teams)||(this.next&&packet.seq<=this.next.seq))return false;
    this.prev=this.next||packet;this.next=clone(packet);this.at=now;
    for(const e of packet.events||[])if(Number.isSafeInteger(e.serial)&&e.serial>this.eventSeq){this.eventSeq=e.serial;if(EVENT_TYPES.has(e.type))this.events.push(e);}
    return true;
  }
  apply(match,now){
    if(!this.next)return false;
    const s=this.next,old=this.prev,t=Math.max(0,Math.min(1,(now-this.at)/50));
    for(const key of ['round','wins','phase','phaseTime','remaining','method'])match[key]=clone(s[key]);
    match.pole=null;match.winner=s.winner??null;match.roundWinner=s.roundWinner??null;match.grapple=s.grapple?clone(s.grapple):null;match.pin=s.pin?clone(s.pin):null;
    const team=s.team;match.slot=team.slot.slice();match.out=pair(team.out).map(o=>o.slice());match.suddenDeath=team.suddenDeath;
    match.stats=Object.fromEntries(Object.entries(team.stats||{}).map(([id,v])=>[id,{...v}]));match.cpuPlayers=new Set(list(team.cpu));
    if(match.fighters.length!==s.fighters.length)match.fighters=[];
    s.fighters.forEach((f,i)=>{
      const previous=old.fighters[i],current=match.fighters[i];
      // A new wrestler (next fall or a tag) gets a fresh body; never morph the old one.
      if(!current||current.id!==f.id)match.fighters[i]={...f,move:f.move??null,definition:match.roster[f.id],last:emptyInput()};
      else Object.assign(current,f,{move:f.move??null});
      if(previous&&previous.id===f.id&&old.round===s.round&&old.phase===s.phase&&previous.state===f.state){
        for(const key of ['x','z','t'])match.fighters[i][key]=previous[key]+(f[key]-previous[key])*t;
      }
    });
    match.ids=s.fighters.map(f=>f.id);
    return true;
  }
}
