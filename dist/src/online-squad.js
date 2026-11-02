import {SQUAD_PROTOCOL,InputPackets,RemoteInput,packSquadSnapshot} from './online-protocol.js?v=0.25.3';
import {randomId,timed,cancelled} from './online.js?v=0.25.3';

// Four-player rooms: one host (P1) runs the match; up to three friends join with the
// room code. Seats alternate teams: P1 + P3 on the left, P2 + P4 on the right.
// The host can start early; empty seats are filled by CPU wrestlers.
export const SQUAD_PREFIX='rooms/LU250Q-';
export const SEATS=4;
export const SQUAD_FORMATS=['elimination','tag','tornado'];
const LOBBY_LIFE=10*60*1000;
const noop=()=>{};
const seat=n=>`p${n}`;
export const teamOfSeat=n=>n%2;
export function squadCode(value){return String(value||'').trim().toUpperCase().replace(/^LU250Q-/,'');}
const validPlayer=p=>p&&typeof p.id==='string'&&p.id.length<80&&Number.isInteger(p.fighter)&&p.fighter>=0&&p.fighter<40;
export function seatsOf(meta){
  // Seat number → {fighter, human, id, online, ready}; CPU seats are filled at the start.
  const out=[];
  for(let n=0;n<SEATS;n++){
    // A half-written seat (a late presence write after the seat was freed) counts as empty.
    const p=validPlayer(meta?.players?.[seat(n)])?meta.players[seat(n)]:null,cpu=meta?.cpu?.[seat(n)];
    out[n]=p?{fighter:p.fighter,human:true,id:p.id,online:p.online!==false,ready:Boolean(p.ready)}:Number.isInteger(cpu)?{fighter:cpu,human:false}:null;
  }
  return out;
}
export function validSquadRoom(meta,now=Date.now()){
  if(meta?.protocol!==SQUAD_PROTOCOL||!SQUAD_FORMATS.includes(meta.format)||!Number.isInteger(meta.arena)||meta.arena<0||meta.arena>=6)return false;
  if(!['lobby','loading','playing','done','closed'].includes(meta.state)||!Number.isFinite(meta.created)||now-meta.created>=6*60*60*1000)return false;
  if(!meta.players||typeof meta.players!=='object'||!validPlayer(meta.players.p0))return false;
  if(!Object.keys(meta.players).every(k=>/^p[0-3]$/.test(k)))return false;
  if(meta.cpu&&(typeof meta.cpu!=='object'||!Object.entries(meta.cpu).every(([k,f])=>/^p[1-3]$/.test(k)&&!validPlayer(meta.players[k])&&Number.isInteger(f)&&f>=0&&f<40)))return false;
  const fighters=seatsOf(meta).filter(Boolean).map(s=>s.fighter);
  return new Set(fighters).size===fighters.length;
}
// Teams in engine order: [[P1, P3], [P2, P4]].
export const squadTeams=meta=>{const s=seatsOf(meta);return [[s[0]?.fighter,s[2]?.fighter],[s[1]?.fighter,s[3]?.fighter]];};
export const cpuSeats=meta=>seatsOf(meta).map((s,n)=>s&&!s.human?n:null).filter(n=>n!==null);

export class SquadSession{
  constructor({connect,prepare=noop,start=noop,snapshot=noop,status=noop,lobby=noop,ended=noop,dropped=noop,fill=null,now=()=>Date.now(),id=randomId,code}={}){
    Object.assign(this,{connect,prepare,start,snapshot,status,lobby,ended,dropped,fill,now,id});
    this.makeCode=code||(()=>{const a='ABCDEFGHJKLMNPQRSTUVWXYZ';return Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>a[n%a.length]).join('');});
    this.ctx=null;
  }
  get active(){return Boolean(this.ctx&&!this.ctx.closed);}
  get host(){return this.ctx?.seat===0;}
  get seat(){return this.ctx?.seat??-1;}
  get code(){return this.ctx?.code||'';}
  get meta(){return this.ctx?.meta||null;}
  check(ctx){if(ctx.closed||this.ctx!==ctx)throw cancelled();}
  async begin(kind,fighter,{arena=0,format='tag',code=''}={}){
    await this.leave();
    const ctx={id:this.id(),closed:false,offs:[],seat:-1,code:'',input:new InputPackets(),remotes:{},seen:{},dropped:new Set(),events:[],eventSerial:0,snapSerial:0,lastInput:0,lastSnap:0,lastHost:this.now()};
    this.ctx=ctx;this.status('CONNECTING…');
    try{
      ctx.db=await timed(this.connect());this.check(ctx);
      if(kind==='join')await this.join(ctx,code,fighter);else await this.create(ctx,fighter,arena,format);
      this.check(ctx);this.watch(ctx);return ctx.code;
    }catch(error){
      if(!ctx.closed){ctx.closed=true;if(this.ctx===ctx)this.ctx=null;}
      await this.dispose(ctx);
      if(!error.cancelled)throw error;return null;
    }
  }
  async create(ctx,fighter,arena,format){
    if(!SQUAD_FORMATS.includes(format))throw new Error('Pick a match type for the room.');
    ctx.seat=0;
    for(let attempt=0;attempt<8;attempt++){
      this.check(ctx);ctx.code=this.makeCode();ctx.ref=ctx.db.ref(`${SQUAD_PREFIX}${ctx.code}`);
      const meta={protocol:SQUAD_PROTOCOL,created:this.now(),state:'lobby',arena,format,players:{p0:{id:ctx.id,fighter,online:false,ready:false}}};
      const result=await timed(ctx.ref.child('meta').transaction(cur=>ctx.closed||cur?undefined:meta,undefined,false));
      if(!result.committed)continue;
      this.check(ctx);await this.presence(ctx);this.check(ctx);
      this.status(`4-PLAYER ROOM ${ctx.code} · SHARE THE CODE`,ctx.code);return;
    }
    throw new Error('Could not reserve a room. Please try again.');
  }
  async join(ctx,value,fighter){
    const code=squadCode(value);if(!/^[A-Z]{4}$/.test(code))throw new Error('Enter the four-letter room code.');
    ctx.code=code;ctx.ref=ctx.db.ref(`${SQUAD_PREFIX}${code}`);
    await timed(ctx.ref.child('meta').once('value'));this.check(ctx);
    let reason='Room not found, full, or already playing. Check the code.';
    const result=await timed(ctx.ref.child('meta').transaction(meta=>{
      if(ctx.closed)return;
      if(meta===null)return null;
      if(!validSquadRoom(meta,this.now())||meta.state!=='lobby'||meta.players.p0.online===false||this.now()-meta.created>LOBBY_LIFE)return;
      const taken=seatsOf(meta);
      if(taken.some(s=>s?.fighter===fighter)){reason=`That wrestler is already taken in room ${code}. Pick someone else.`;return;}
      const free=[1,2,3].find(n=>!taken[n]);if(free===undefined)return;
      reason='';return {...meta,players:{...meta.players,[seat(free)]:{id:ctx.id,fighter,online:false,ready:false}}};
    },undefined,false));
    const players=result.snapshot.val()?.players||{};
    const mine=Object.entries(players).find(([,p])=>p?.id===ctx.id);
    if(!result.committed||!mine)throw new Error(reason||'Room not found, full, or already playing. Check the code.');
    ctx.seat=Number(mine[0].slice(1));
    this.check(ctx);await this.presence(ctx);this.check(ctx);
    this.status(`ROOM ${code} · YOU ARE P${ctx.seat+1} · WAITING FOR THE HOST`,code);
  }
  async presence(ctx){
    const path=`meta/players/${seat(ctx.seat)}/online`;
    ctx.disconnect=(ctx.seat===0?ctx.ref:ctx.ref.child(path)).onDisconnect();
    await timed(ctx.seat===0?ctx.disconnect.remove():ctx.disconnect.set(false));this.check(ctx);
    await timed(ctx.ref.child(path).set(true));
  }
  listen(ctx,ref,callback){
    const fn=s=>{if(!ctx.closed)callback(s.val());};
    ref.on('value',fn,error=>this.fail(ctx,error));ctx.offs.push(()=>ref.off('value',fn));
  }
  watch(ctx){
    this.listen(ctx,ctx.ref.child('meta'),meta=>this.handleMeta(ctx,meta));
    this.listen(ctx,ctx.db.ref('.info/connected'),online=>{if(online===false)this.fail(ctx,new Error('Your connection was lost. Return to the menu and reconnect.'));});
    if(ctx.seat===0){
      for(let n=1;n<SEATS;n++){
        ctx.remotes[n]=new RemoteInput();
        this.listen(ctx,ctx.ref.child(`heartbeat/${seat(n)}`),()=>{ctx.seen[n]=this.now();});
        this.listen(ctx,ctx.ref.child(`input/${seat(n)}`),packet=>{
          const player=ctx.meta?.players?.[seat(n)];
          if(player&&ctx.remotes[n].receive(packet,player.id,this.now()))ctx.seen[n]=this.now();
        });
      }
    }else{
      this.listen(ctx,ctx.ref.child('heartbeat/p0'),()=>{ctx.lastHost=this.now();});
      this.listen(ctx,ctx.ref.child('snapshot'),packet=>{if(packet){ctx.lastHost=this.now();ctx.lastSnapshot=this.now();this.snapshot(packet);}});
    }
    ctx.timer=setInterval(()=>this.heartbeat(ctx),1000);
  }
  humans(meta){return seatsOf(meta).map((s,n)=>s?.human?n:null).filter(n=>n!==null);}
  handleMeta(ctx,meta){
    if(!validSquadRoom(meta,this.now())){this.fail(ctx,new Error(ctx.seat===0?'This room has closed.':'The host closed the room.'));return;}
    ctx.meta=meta;
    const mine=meta.players[seat(ctx.seat)];
    for(const n of this.humans(meta))if(meta.players[seat(n)].online)(ctx.wasOnline??=new Set()).add(n);
    if(mine?.id!==ctx.id||meta.state==='closed'){this.fail(ctx,new Error('This room has closed.'));return;}
    if(ctx.seat!==0&&meta.players.p0.online===false&&meta.state!=='done'){this.fail(ctx,new Error('The host left the room.'));return;}
    if(meta.state==='lobby')this.lobby(meta,ctx.seat);
    if(ctx.seat===0){
      // A friend who closes the page before the start frees their seat.
      for(const n of this.humans(meta))if(n&&meta.players[seat(n)].online===false&&ctx.wasOnline?.has(n)){
        if(meta.state==='lobby')this.vacate(ctx,n);
        else if(!ctx.dropped.has(n)&&meta.state!=='done'){ctx.dropped.add(n);this.dropped(n,meta);}
      }
      if(meta.state==='lobby'&&!ctx.launching&&this.humans(meta).length===SEATS&&this.humans(meta).every(n=>meta.players[seat(n)].online))this.launch();
      if(meta.state==='loading'&&!ctx.starting&&this.humans(meta).every(n=>meta.players[seat(n)].ready||meta.players[seat(n)].online===false||ctx.dropped.has(n))){
        ctx.starting=true;timed(ctx.ref.child('meta/state').set('playing')).catch(e=>this.fail(ctx,e));
      }
    }
    if(meta.state==='loading'&&!ctx.preparing){
      ctx.preparing=true;this.status(`ROOM ${ctx.code} · LOADING ALL FOUR WRESTLERS…`,ctx.code);
      Promise.resolve().then(()=>this.prepare(meta,ctx.seat)).then(async()=>{this.check(ctx);await timed(ctx.ref.child(`meta/players/${seat(ctx.seat)}/ready`).set(true));})
        .catch(e=>{if(!e.cancelled)this.fail(ctx,e);});
    }
    if(meta.state==='playing'&&!ctx.started){
      ctx.started=true;ctx.lastHost=this.now();for(const n of this.humans(meta))ctx.seen[n]=this.now();
      this.status(`ONLINE · YOU ARE P${ctx.seat+1} · ROOM ${ctx.code}`,ctx.code);this.start(meta,ctx.seat);
    }
  }
  vacate(ctx,n){
    const id=ctx.meta.players[seat(n)].id;
    timed(ctx.ref.child('meta').transaction(cur=>{
      if(cur===null)return null;
      if(cur.state!=='lobby'||cur.players?.[seat(n)]?.online!==false||cur.players[seat(n)].id!==id)return;
      const players={...cur.players};delete players[seat(n)];return {...cur,players};
    },undefined,false)).catch(noop);
  }
  // Host: start now. Empty seats get CPU wrestlers that nobody has picked.
  async launch(){
    const ctx=this.ctx;if(!ctx||ctx.closed||ctx.seat!==0||ctx.launching)return false;
    ctx.launching=true;
    try{
      const result=await timed(ctx.ref.child('meta').transaction(cur=>{
        if(ctx.closed)return;
        if(cur===null)return null;
        if(!validSquadRoom(cur,this.now())||cur.state!=='lobby')return;
        const seats=seatsOf(cur),used=new Set(seats.filter(Boolean).map(s=>s.fighter)),cpu={};
        const picks=this.fill?this.fill(used,seats):[];
        for(let n=1;n<SEATS;n++)if(!seats[n]){
          let f=picks.find(i=>Number.isInteger(i)&&i>=0&&i<40&&!used.has(i));
          if(f===undefined)for(f=0;used.has(f);f++);
          used.add(f);cpu[seat(n)]=f;
        }
        const players={...cur.players};for(const k of Object.keys(players))players[k]={...players[k],ready:false};
        return {...cur,state:'loading',players,...(Object.keys(cpu).length?{cpu}:{})};
      },undefined,false));
      if(!result.committed){ctx.launching=false;return false;}
      return true;
    }catch(error){ctx.launching=false;this.fail(ctx,error);return false;}
  }
  heartbeat(ctx){
    if(ctx.closed)return;
    const meta=ctx.meta;
    if(meta?.state==='lobby'&&this.now()-meta.created>LOBBY_LIFE){this.fail(ctx,new Error('This room code expired. Create a new room.'));return;}
    if(ctx.preparing&&!ctx.started){ctx.loadStarted??=this.now();if(this.now()-ctx.loadStarted>45000){this.fail(ctx,new Error('The match could not start. Try another room.'));return;}}
    if(ctx.started&&meta?.state!=='done'){
      if(ctx.seat===0){
        // A friend whose connection stops answering is handed to the CPU; the match goes on.
        for(const n of this.humans(meta))if(n&&!ctx.dropped.has(n)&&this.now()-(ctx.seen[n]||0)>15000){ctx.dropped.add(n);this.dropped(n,meta);}
      }else if(this.now()-Math.max(ctx.lastHost,ctx.lastSnapshot||0)>15000){this.fail(ctx,new Error('The host stopped sending the match. Please reconnect.'));return;}
      if(ctx.seat!==0)this.sendInput(true);
    }
    if(ctx.beatBusy)return;ctx.beatBusy=true;
    timed(ctx.ref.child(`heartbeat/${seat(ctx.seat)}`).set(this.now())).catch(e=>this.fail(ctx,e)).finally(()=>{ctx.beatBusy=false;});
  }
  readRemote(n){return this.ctx?.remotes[n]?.read(this.now());}
  capture(input){this.ctx?.input.capture(input);}
  sendInput(force=false){
    const ctx=this.ctx;if(!ctx||ctx.closed||ctx.seat<1||!ctx.started||ctx.meta?.state==='done'||ctx.inputBusy||(!force&&this.now()-ctx.lastInput<50))return;
    ctx.lastInput=this.now();ctx.inputBusy=true;
    timed(ctx.ref.child(`input/${seat(ctx.seat)}`).set(ctx.input.packet(ctx.id))).catch(e=>this.fail(ctx,e)).finally(()=>{ctx.inputBusy=false;});
  }
  sendSnapshot(match,events=[],force=false){
    const ctx=this.ctx;if(!ctx||ctx.closed||ctx.seat!==0||!ctx.started||ctx.reported)return;
    for(const event of events)ctx.events.push({...event,serial:++ctx.eventSerial});
    ctx.events=ctx.events.slice(-32);
    if(ctx.snapBusy||(!force&&this.now()-ctx.lastSnap<50))return;
    ctx.lastSnap=this.now();ctx.snapBusy=true;
    const packet=packSquadSnapshot(match,++ctx.snapSerial,ctx.events);
    timed(ctx.ref.child('snapshot').set(packet)).then(()=>{
      if(match.phase==='done'&&!ctx.reported&&!ctx.closed){ctx.reported=true;return timed(ctx.ref.child('meta/state').set('done'));}
    }).catch(e=>this.fail(ctx,e)).finally(()=>{ctx.snapBusy=false;});
  }
  fail(ctx,error){
    if(ctx.closed||this.ctx!==ctx)return;
    const message=/permission|denied/i.test(error?.message||'')?'Online rooms are unavailable. The game’s Firebase access needs checking.':error?.message||'Online play disconnected. Please try again.';
    this.ended(message);this.leave().catch(noop);
  }
  async releaseRoom(ctx){
    if(ctx.disconnect){await timed(ctx.disconnect.cancel()).catch(noop);ctx.disconnect=null;}
    if(!ctx.ref||ctx.seat<0)return;
    const ref=ctx.ref,key=seat(ctx.seat);
    await timed(ref.child('meta').once('value')).then(async snapshot=>{
      const meta=snapshot.val();if(meta?.players?.[key]?.id!==ctx.id)return;
      if(ctx.seat===0)await timed(ref.remove());
      else if(meta.state==='lobby')await timed(ref.child('meta').transaction(cur=>{
        if(cur===null)return null;
        if(cur?.players?.[key]?.id!==ctx.id||cur.state!=='lobby')return;
        const players={...cur.players};delete players[key];return {...cur,players};
      },undefined,false));
      else await timed(ref.child(`meta/players/${key}`).update({online:false,ready:false}));
    }).catch(noop);
    ctx.ref=null;
  }
  async dispose(ctx){clearInterval(ctx.timer);ctx.offs.splice(0).forEach(off=>off());await this.releaseRoom(ctx);}
  async leave(){
    const ctx=this.ctx;if(!ctx)return;
    this.ctx=null;ctx.closed=true;clearInterval(ctx.timer);ctx.offs.splice(0).forEach(off=>off());
    await this.dispose(ctx);
  }
}
