import {PROTOCOL,InputPackets,RemoteInput,packSnapshot} from './online-protocol.js?v=0.19.0';

const QUEUE='rooms/LU190-queue';
const noop=()=>{};
export const randomId=(source=globalThis.crypto)=>source.randomUUID?.()||Array.from(source.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
export function roomCode(value){return String(value||'').trim().toUpperCase().replace(/^LU190-/, '');}
export function validRoom(meta,now=Date.now()){
  return meta?.protocol===PROTOCOL&&Number.isInteger(meta.host?.fighter)&&meta.host.fighter>=0&&meta.host.fighter<39
    &&typeof meta.host.id==='string'&&Number.isInteger(meta.arena)&&meta.arena>=0&&meta.arena<6
    &&['lobby','loading','playing','done','closed'].includes(meta.state)&&Number.isFinite(meta.created)
    &&now-meta.created<6*60*60*1000&&(!meta.guest||(typeof meta.guest.id==='string'&&Number.isInteger(meta.guest.fighter)&&meta.guest.fighter>=0&&meta.guest.fighter<39));
}
const cancelled=()=>Object.assign(new Error('Cancelled'),{cancelled:true});
const timed=promise=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Online connection timed out. Please try again.')),12000);
  promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
});

// Adapted from the original NET: Firebase rooms, atomic quick-match queue,
// host simulation, guest input packets and interpolated host snapshots.
export class OnlineSession{
  constructor({connect,prepare=noop,start=noop,snapshot=noop,status=noop,ended=noop,now=()=>Date.now(),id=randomId,code}={}){
    Object.assign(this,{connect,prepare,start,snapshot,status,ended,now,id});
    this.makeCode=code||(()=>{const a='ABCDEFGHJKLMNPQRSTUVWXYZ';return Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>a[n%a.length]).join('');});
    this.ctx=null;
  }
  get active(){return Boolean(this.ctx&&!this.ctx.closed);}
  get role(){return this.ctx?.role||'none';}
  get code(){return this.ctx?.code||'';}
  get playing(){return this.ctx?.meta?.state==='playing'||this.ctx?.meta?.state==='done';}
  check(ctx){if(ctx.closed||this.ctx!==ctx)throw cancelled();}
  async begin(kind,fighter,arena=0,value=''){
    await this.leave();
    const ctx={id:this.id(),closed:false,offs:[],role:'none',code:'',input:new InputPackets(),remote:new RemoteInput(),events:[],eventSerial:0,snapSerial:0,lastInput:0,lastSnap:0,lastRemote:this.now(),lastBeat:0};
    this.ctx=ctx;this.status('CONNECTING…');
    try{
      ctx.db=await timed(this.connect());this.check(ctx);
      if(kind==='join')await this.join(ctx,value,fighter);
      else if(kind==='quick')await this.quick(ctx,fighter,arena);
      else await this.create(ctx,fighter,arena);
      this.check(ctx);this.watch(ctx);
      return ctx.code;
    }catch(error){
      if(!ctx.closed){ctx.closed=true;if(this.ctx===ctx)this.ctx=null;await this.dispose(ctx);}
      else await this.dispose(ctx);
      if(!error.cancelled)throw error;
      return null;
    }
  }
  async create(ctx,fighter,arena){
    ctx.role='host';
    for(let attempt=0;attempt<8;attempt++){
      this.check(ctx);ctx.code=this.makeCode();ctx.ref=ctx.db.ref(`rooms/LU190-${ctx.code}`);
      const meta={protocol:PROTOCOL,created:this.now(),state:'lobby',arena,host:{id:ctx.id,fighter,online:false,ready:false}};
      const result=await timed(ctx.ref.child('meta').transaction(cur=>ctx.closed||cur?undefined:meta,undefined,false));
      if(!result.committed)continue;
      this.check(ctx);await this.presence(ctx);this.check(ctx);
      this.status(`ROOM ${ctx.code} · WAITING FOR OPPONENT`,ctx.code);return;
    }
    throw new Error('Could not reserve a room. Please try again.');
  }
  async join(ctx,value,fighter){
    const code=roomCode(value);if(!/^[A-Z]{4}$/.test(code))throw new Error('Enter the four-letter room code.');
    ctx.role='guest';ctx.code=code;ctx.ref=ctx.db.ref(`rooms/LU190-${code}`);
    // Check that the path can be read; transactions still have to handle a cold
    // null cache even after once() has returned the room.
    await timed(ctx.ref.child('meta').once('value'));this.check(ctx);
    const result=await timed(ctx.ref.child('meta').transaction(meta=>{
      if(ctx.closed)return;
      if(meta===null)return null; // Force a server comparison/retry, not an abort.
      if(!validRoom(meta,this.now())||meta.state!=='lobby'||!meta.host.online||meta.guest||this.now()-meta.created>300000)return;
      return {...meta,guest:{id:ctx.id,fighter,online:false,ready:false}};
    },undefined,false));
    if(!result.committed||result.snapshot.val()?.guest?.id!==ctx.id)throw new Error('Room not found, full, or already playing. Check the code.');
    this.check(ctx);await this.presence(ctx);this.check(ctx);this.status(`ROOM ${code} · JOINING…`,code);
  }
  async presence(ctx){
    ctx.disconnect=(ctx.role==='host'?ctx.ref:ctx.ref.child('meta/guest/online')).onDisconnect();
    await timed(ctx.role==='host'?ctx.disconnect.remove():ctx.disconnect.set(false));this.check(ctx);
    await timed(ctx.ref.child(`meta/${ctx.role}/online`).set(true));
  }
  async quick(ctx,fighter,arena){
    // Separate protocol queue: legacy clients cannot claim a new-engine room.
    ctx.searching=true;
    for(let retry=0;retry<4;retry++){
      await this.create(ctx,fighter,arena);this.check(ctx);
      let opponent=null;const queue=ctx.db.ref(QUEUE),myCode=ctx.code;
      await timed(queue.transaction(cur=>{
        opponent=null;if(ctx.closed)return;
        if(cur?.code&&cur.code!==myCode&&this.now()-cur.at<45000){opponent=cur.code;return null;}
        return {code:myCode,owner:ctx.id,at:this.now()};
      },undefined,false));
      this.check(ctx);
      if(!opponent){
        ctx.searchDeadline=this.now()+45000;this.status('SEARCHING FOR OPPONENT…',ctx.code);return;
      }
      await this.releaseRoom(ctx);this.check(ctx);
      try{await this.join(ctx,opponent,fighter);ctx.searching=false;return;}
      catch(error){if(error.cancelled)throw error;await this.releaseRoom(ctx);this.check(ctx);}
    }
    throw new Error('No opponent available. Try Quick Match again.');
  }
  listen(ctx,ref,callback){
    const fn=s=>{if(!ctx.closed)callback(s.val());};
    ref.on('value',fn,error=>this.fail(ctx,error));ctx.offs.push(()=>ref.off('value',fn));
  }
  watch(ctx){
    this.listen(ctx,ctx.ref.child('meta'),meta=>this.handleMeta(ctx,meta));
    this.listen(ctx,ctx.db.ref('.info/connected'),online=>{
      if(online===false)this.fail(ctx,new Error('Your connection was lost. Return to the menu and reconnect.'));
    });
    const remoteRole=ctx.role==='host'?'guest':'host';
    this.listen(ctx,ctx.ref.child(`heartbeat/${remoteRole}`),()=>{ctx.lastRemote=this.now();});
    if(ctx.role==='host')this.listen(ctx,ctx.ref.child('input'),packet=>{
      if(ctx.meta?.guest&&ctx.remote.receive(packet,ctx.meta.guest.id,this.now()))ctx.lastRemote=this.now();
    });
    else this.listen(ctx,ctx.ref.child('snapshot'),packet=>{
      if(packet){ctx.lastRemote=this.now();ctx.lastSnapshot=this.now();this.snapshot(packet);}
    });
    ctx.timer=setInterval(()=>this.heartbeat(ctx),1000);
  }
  handleMeta(ctx,meta){
    if(!validRoom(meta,this.now())){this.fail(ctx,new Error('This room has closed.'));return;}
    ctx.meta=meta;
    const mine=meta[ctx.role],other=meta[ctx.role==='host'?'guest':'host'];
    if(mine?.id!==ctx.id||meta.state==='closed'){this.fail(ctx,new Error('This room has closed.'));return;}
    if(ctx.started&&meta.state!=='done'&&(!other||other.online===false)){this.fail(ctx,new Error('Your opponent left the match.'));return;}
    if(other?.online===false&&(meta.state==='loading'||ctx.role==='guest')){this.fail(ctx,new Error('Your opponent left the room.'));return;}
    if(ctx.role==='host'&&meta.state==='lobby'&&meta.host.online&&meta.guest?.online&&!ctx.loading){
      ctx.loading=true;ctx.searching=false;
      this.clearQueue(ctx).catch(noop);
      timed(ctx.ref.child('meta/state').set('loading')).catch(e=>this.fail(ctx,e));
    }
    if(meta.state==='loading'&&!ctx.preparing){
      ctx.preparing=true;this.status(`ROOM ${ctx.code} · LOADING FIGHTERS…`,ctx.code);
      Promise.resolve().then(()=>this.prepare(meta,ctx.role)).then(async()=>{
        this.check(ctx);await timed(ctx.ref.child(`meta/${ctx.role}/ready`).set(true));
      }).catch(e=>{if(!e.cancelled)this.fail(ctx,e);});
    }
    if(ctx.role==='host'&&meta.state==='loading'&&meta.host.ready&&meta.guest?.ready&&!ctx.starting){
      ctx.starting=true;timed(ctx.ref.child('meta/state').set('playing')).catch(e=>this.fail(ctx,e));
    }
    if(meta.state==='playing'&&!ctx.started){
      ctx.started=true;ctx.lastRemote=this.now();
      this.status(`ONLINE · YOU ARE ${ctx.role==='host'?'P1':'P2'} · ROOM ${ctx.code}`,ctx.code);this.start(meta,ctx.role);
    }
  }
  heartbeat(ctx){
    if(ctx.closed)return;
    if(ctx.searching&&this.now()>ctx.searchDeadline){this.fail(ctx,new Error('No opponent found. Try Quick Match again.'));return;}
    if(ctx.meta?.state==='lobby'&&!ctx.searching&&this.now()-ctx.meta.created>300000){this.fail(ctx,new Error('This room code expired. Create a new room.'));return;}
    if(ctx.started&&ctx.meta?.state!=='done'&&this.now()-ctx.lastRemote>15000){this.fail(ctx,new Error('Your opponent’s connection stopped responding.'));return;}
    if(ctx.role==='guest'&&ctx.started&&ctx.meta?.state!=='done'&&this.now()-(ctx.lastSnapshot||ctx.lastRemote)>15000){this.fail(ctx,new Error('The host stopped sending the match. Please reconnect.'));return;}
    if(ctx.preparing&&!ctx.started){ctx.loadStarted??=this.now();if(this.now()-ctx.loadStarted>30000){this.fail(ctx,new Error('The match could not start. Try another room.'));return;}}
    if(ctx.role==='guest'&&ctx.started)this.sendInput(true);
    if(ctx.beatBusy)return;ctx.beatBusy=true;
    timed(ctx.ref.child(`heartbeat/${ctx.role}`).set(this.now())).catch(e=>this.fail(ctx,e)).finally(()=>{ctx.beatBusy=false;});
  }
  readRemote(){return this.ctx?.remote.read(this.now());}
  capture(input){this.ctx?.input.capture(input);}
  sendInput(force=false){
    const ctx=this.ctx;if(!ctx||ctx.closed||ctx.role!=='guest'||!ctx.started||ctx.meta?.state==='done'||ctx.inputBusy||(!force&&this.now()-ctx.lastInput<50))return;
    ctx.lastInput=this.now();ctx.inputBusy=true;
    timed(ctx.ref.child('input').set(ctx.input.packet(ctx.id))).catch(e=>this.fail(ctx,e)).finally(()=>{ctx.inputBusy=false;});
  }
  sendSnapshot(match,events=[],force=false){
    const ctx=this.ctx;if(!ctx||ctx.closed||ctx.role!=='host'||!ctx.started||ctx.reported)return;
    for(const event of events)ctx.events.push({...event,serial:++ctx.eventSerial});
    ctx.events=ctx.events.slice(-32);
    if(ctx.snapBusy||(!force&&this.now()-ctx.lastSnap<50))return;
    ctx.lastSnap=this.now();ctx.snapBusy=true;
    const packet=packSnapshot(match,++ctx.snapSerial,ctx.events);
    timed(ctx.ref.child('snapshot').set(packet)).then(()=>{
      if(match.phase==='done'&&!ctx.reported&&!ctx.closed){ctx.reported=true;return timed(ctx.ref.child('meta/state').set('done'));}
    }).catch(e=>this.fail(ctx,e)).finally(()=>{ctx.snapBusy=false;});
  }
  fail(ctx,error){
    if(ctx.closed||this.ctx!==ctx)return;
    const message=/permission|denied/i.test(error?.message||'')?'Online rooms are unavailable. The game’s Firebase access needs checking.':error?.message||'Online play disconnected. Please try again.';
    this.ended(message);this.leave().catch(noop);
  }
  async clearQueue(ctx){
    if(!ctx.db)return;
    await timed(ctx.db.ref(QUEUE).transaction(cur=>cur===null||cur?.owner===ctx.id?null:undefined,undefined,false));
  }
  async releaseRoom(ctx){
    if(ctx.disconnect){await timed(ctx.disconnect.cancel()).catch(noop);ctx.disconnect=null;}
    if(!ctx.ref)return;
    const ref=ctx.ref,role=ctx.role;
    await timed(ref.child('meta').once('value')).then(async snapshot=>{
      const meta=snapshot.val();if(meta?.[role]?.id!==ctx.id)return;
      if(role==='host')await timed(ref.remove());
      else if(meta.state==='lobby')await timed(ref.child('meta').transaction(cur=>{
        if(cur===null)return null;
        if(cur?.guest?.id!==ctx.id||cur.state!=='lobby')return;
        const next={...cur};delete next.guest;return next;
      },undefined,false));
      else await timed(ref.child('meta/guest').update({online:false,ready:false}));
    }).catch(noop);
    ctx.ref=null;
  }
  async dispose(ctx){
    clearInterval(ctx.timer);ctx.offs.splice(0).forEach(off=>off());
    await this.clearQueue(ctx).catch(noop);await this.releaseRoom(ctx);
  }
  async leave(){
    const ctx=this.ctx;if(!ctx)return;
    this.ctx=null;ctx.closed=true;clearInterval(ctx.timer);ctx.offs.splice(0).forEach(off=>off());
    await this.dispose(ctx);
  }
}
