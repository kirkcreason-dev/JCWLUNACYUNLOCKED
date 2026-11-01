import {fighterProfile,finisherMove} from './fighter-profile.js?v=0.25.1';
// Pure fixed-step match simulation. Rendering and input devices never change the rules.
export const STEP = 1 / 60;
export const FLOOR = 593;
export const LEFT = 200;
export const RIGHT = 1080;
export const INPUT_BUFFER = .16;
export const THROW_BREAK_WINDOW = .28;
export const TOP_ROPE_HEIGHT = 140;
export const POLE_RETRIEVE_TIME = 1.05;
export const WEAPON_USES = Object.freeze({chair:4,bat:6,guitar:2,trashcan:3,bottle:1});
export const throwBreakWindow = g => g?.kind==='superplex'?.38:THROW_BREAK_WINDOW;
export const onTopRope = f => ['perch','ropeTaunt'].includes(f.state);
export const canCornerThrow = (a,b) => Math.abs(a.x-b.x)<120 && (onTopRope(a)||onTopRope(b)) &&
  (a.z===0||onTopRope(a)) && (b.z===0||onTopRope(b)) && !a.move && !b.move && a.stun===0 && b.stun===0 && b.invincible===0 &&
  ['idle','walk','run','block','perch','ropeTaunt'].includes(a.state) && ['idle','walk','run','block','perch','ropeTaunt'].includes(b.state);
export const weaponRemaining = f => f.weapon==='none'?0:Math.max(0,(WEAPON_USES[f.weapon]||0)-(f.weaponWear?.[f.weapon]||0));
export const isPoleMode = mode => mode==='pole'||mode==='pole-local';
export const isLocalMode = mode => mode==='local'||mode==='pole-local'||mode==='elimination-local';
export const isEliminationMode = mode => mode==='elimination'||mode==='elimination-local';
export const TEAM_SIZE = 4;
// Survivor-style 4-on-4: one wrestler per side in the ring; the loser of each fall is
// eliminated and the next teammate enters. The winner stays in with the damage taken,
// plus a short breather. Last team with a wrestler left wins.
export const ELIMINATION_RECOVERY = 15;
// Team formats for two-on-two play (vs CPU or four people online):
//   elimination — one wrestler per side in the ring, loser of each fall is out.
//   tag         — one legal wrestler per side; TAUNT in your own corner tags your partner.
//                 One fall decides the match.
//   tornado     — all four in the ring at once; a pinned, submitted or knocked-out
//                 wrestler is eliminated. Last team with anyone left wins.
export const TEAM_FORMATS = Object.freeze(['elimination','tag','tornado']);
export const isTeamMode = mode => mode==='tag'||mode==='tornado'||mode==='squad';
export const TAG_REACH = 78;
export const SUDDEN_DEATH_HP = 30;
export const defenderOf = hold => hold?(hold.defender??1-hold.attacker):null;
// Tune travel and attack commitment without speeding the match/escape clocks.
export const MOVEMENT_PACE = 1.12;
export const RUN_BUILDUP = .38;
export const REVERSAL_WINDOW = .12;
export const REVERSAL_COOLDOWN = 1.2;
export const escapeTarget = hp => 7 + Math.round((100-hp)*.10);
export const canPin = (a,b) => b.state==='down' && b.z===0 && b.t>=(b.fallDuration||0) && Math.abs(a.x-b.x)<125;
export const nearRopes = f => f.x<LEFT+55 || f.x>RIGHT-55;
export const MOVES = Object.freeze({
  light: {startup:.09, active:.11, recovery:.198, reach:113, damage:6, stun:.32, knock:20, meter:7},
  heavy: {startup:.261, active:.16, recovery:.378, reach:155, damage:17, stun:.48, knock:58, meter:12, guard:38},
  bat: {startup:.198, active:.14, recovery:.306, reach:178, damage:12, stun:.34, knock:40, meter:10, guard:26},
  guitar: {startup:.297, active:.16, recovery:.441, reach:160, damage:23, stun:.55, knock:70, meter:14, guard:45},
  trashcan: {startup:.333, active:.20, recovery:.432, reach:140, damage:21, stun:.65, knock:76, meter:16, guard:52},
  counter: {startup:.18, active:.12, recovery:.40, reach:120, damage:9, stun:.38, knock:23, meter:9},
  aerial: {startup:.10, active:.18, recovery:.30, reach:135, damage:14, stun:.48, knock:42, meter:12},
  bottle: {startup:.16, active:.13, recovery:.30, reach:128, damage:18, stun:.36, knock:33, meter:10, guard:32},
  special: {startup:.171, active:.18, recovery:.585, reach:157, damage:31, stun:.75, knock:130, meter:0},
});
export const UNARMED_HEAVY = Object.freeze({startup:.198,active:.14,recovery:.288,reach:124,damage:11,stun:.40,knock:34,meter:10,guard:23});
export const attackTiming = (move,style) => move==='heavy'&&['kick','light'].includes(style)?UNARMED_HEAVY:MOVES[move];
export const emptyInput = () => ({left:false,right:false,jump:false,block:false,light:false,heavy:false,grapple:false,special:false,weapon:false,taunt:false,run:false});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const tap=(input,last,key)=>Boolean(input.pressed?.[key] || (input[key]&&!last[key]));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const unavailable=f=>['down','rise','grabbed','lifted','thrown','pinned','pin','climb','perch','ropeTaunt','dive'].includes(f.state);
export class Match {
  constructor(roster,p1=0,p2=1,options={}) {
    this.roster=roster;this.ids=[p1,p2];this.options={difficulty:'normal',mode:'cpu',...options};
    this.random=options.random||Math.random;this.round=1;this.wins=[0,0];this.events=[];this.winner=null;
    const mode=this.options.mode;
    this.routed=isTeamMode(mode);
    this.format=isEliminationMode(mode)?'elimination':mode==='squad'?this.options.format:this.routed?mode:null;
    if(this.routed&&!TEAM_FORMATS.includes(this.format))throw new Error('Unknown team format');
    // Players 0 and 2 are on the left team, 1 and 3 on the right. Offline team modes
    // give player 0 to the person and every other wrestler to the CPU.
    this.cpuPlayers=new Set(mode==='squad'?(this.options.cpuPlayers||[]):this.routed?[1,2,3]:[]);
    this.ai={};
    if(this.format){
      const teams=this.options.teams||[[p1],[p2]];
      if(teams.length!==2||teams.some(t=>!t.length||t.some(id=>!Number.isInteger(id)||!roster[id]))||new Set(teams.flat()).size!==teams.flat().length)throw new Error(`${this.format==='elimination'?'Elimination':'Tag'} teams need distinct fighters`);
      if(this.format!=='elimination'&&teams.some(t=>t.length!==2))throw new Error('Tag and tornado teams need two wrestlers each');
      this.teams=teams.map(t=>t.slice());this.slot=[0,0];this.out=[[],[]];this.carry=[null,null];this.waiting=false;this.nextIds=null;this.stats={};
      this.ids=this.format==='tornado'?[this.teams[0][0],this.teams[1][0],this.teams[0][1],this.teams[1][1]]:[this.teams[0][0],this.teams[1][0]];
    }
    this.brawl=this.format==='tornado';
    this.newRound();
  }
  newRound(){
    this.fighters=this.ids.map((id,i)=>this.makeFighter(id,i));
    this.pole=isPoleMode(this.options.mode)?{x:this.round%2?LEFT+18:RIGHT-18,claimed:false,holder:null,looseX:null,progress:0,claimant:null,uses:0,broken:false}:null;
    if(this.pole)for(const f of this.fighters)f.weapon='none';
    if(this.teams)this.fighters.forEach((f,i)=>{const c=this.carry[i];if(c&&!this.brawl){f.hp=c.hp;f.meter=c.meter;f.secondWindUsed=c.secondWindUsed;}});
    if(this.options.mode==='practice')this.fighters[0].meter=100;
    this.phase='intro';this.phaseTime=0;this.remaining=this.brawl?150:99;this.grapple=null;this.pin=null;this.hitStop=0;this.shake=0;this.totalTime=0;this.aiTimer=0;this.aiInput=emptyInput();this.ai={};this.roundWinner=null;this.method='';
    this.emit('round',{round:this.round});
  }
  // Which person (input slot) drives a wrestler. Unrouted modes keep index = player.
  playerFor(side,slot=0){return this.routed?side+2*slot:side;}
  makeFighter(id,i){
    const side=this.brawl?i%2:i,slot=this.brawl?i>>1:this.slot?.[side]||0;
    const x=this.brawl?[330,950,480,800][i]:i?870:410;
    const f=this.newFighter(id,x,side?-1:1);
    f.side=side;f.player=this.playerFor(side,slot);
    const saved=this.format==='tag'&&this.stats[id];
    if(saved)Object.assign(f,{hp:saved.hp,meter:saved.meter,guard:saved.guard,secondWindUsed:saved.secondWindUsed,weaponWear:{...saved.weaponWear}});
    return f;
  }
  newFighter(id,x,facing){
    return ({id,definition:this.roster[id],x,z:0,vz:0,vx:0,facing,hp:100,meter:0,guard:100,guardDelay:0,reversalWindow:0,reversalCooldown:0,secondWindUsed:false,reboundTime:0,reboundDirection:0,state:'idle',t:0,move:null,hit:false,confirmed:false,chain:0,stun:0,invincible:0,wakeUpProtected:false,downTime:0,combo:0,comboTime:0,buffer:null,weapon:this.roster[id].weapons?'none':'chair',attackStyle:'chair',weaponUses:0,weaponWear:{},ropeTime:0,runTime:0,runDirection:0,fallFace:'back',fallDuration:0,exhausted:false,divePower:1,diveHit:false,tauntCooldown:0,last:emptyInput()});
  }
  emit(type,detail={}){this.events.push({type,...detail});}
  drainEvents(){return this.events.splice(0);}
  step(inputs=[emptyInput(),emptyInput()],dt=STEP){
    if(this.phase==='done')return;
    dt=clamp(dt,0,.05);this.totalTime+=dt;this.shake=Math.max(0,this.shake-dt*35);
    this.phaseTime+=dt;
    if(this.routed)inputs=this.routeInputs(inputs,dt,this.phase==='fight');
    if(this.phase==='intro'){
      if(this.phaseTime>=2.4){this.phase='fight';this.phaseTime=0;this.emit('fight');}
      this.remember(inputs);
      return;
    }
    if(this.phase==='roundEnd'){
      for(const f of this.fighters)f.t+=dt;
      if(this.options.mode==='practice'&&this.phaseTime>2){this.newRound();this.phase='fight';this.emit('fight');return;}
      if(this.format==='elimination'){if(this.phaseTime>2.4&&!this.waiting)this.nextFall();return;}
      if(this.teams){if(this.phaseTime>2.4){this.phase='done';this.winner=this.roundWinner;this.emit('matchEnd',{winner:this.winner,method:this.method});}return;}
      if(this.phaseTime>2.4){
        if(this.wins.some(n=>n>=2)){this.phase='done';this.winner=this.wins[0]>=2?0:1;this.emit('matchEnd',{winner:this.winner,method:this.method});}
        else{this.round++;this.newRound();}
      }return;
    }
    if(this.options.mode==='practice'){inputs=[inputs[0],emptyInput()];this.fighters[0].meter=100;}
    else if(!this.routed&&!isLocalMode(this.options.mode)&&this.options.mode!=='online') inputs=[inputs[0],this.hitStop>0?this.aiInput:this.cpu(dt)];
    // Capture short presses even during hit-stop; consume one command only when it becomes legal.
    this.fighters.forEach((f,i)=>this.bufferInput(f,inputs[i]||emptyInput(),this.hitStop>0?0:dt));
    if(this.hitStop>0){this.hitStop-=dt;this.remember(inputs);return;}
    if(this.options.mode!=='practice')this.remaining=Math.max(0,this.remaining-dt);
    if(this.remaining<=0&&!this.grapple&&!this.pin){this.timeLimit();return;}
    if(this.brawl){this.stepBrawl(inputs,dt);return;}
    for(const f of this.fighters){f.t+=dt;f.invincible=Math.max(0,f.invincible-dt);if(!f.invincible)f.wakeUpProtected=false;f.guardDelay=Math.max(0,f.guardDelay-dt);f.comboTime=Math.max(0,f.comboTime-dt);f.tauntCooldown=Math.max(0,f.tauntCooldown-dt);f.reversalWindow=Math.max(0,f.reversalWindow-dt);f.reversalCooldown=Math.max(0,f.reversalCooldown-dt);if(!f.comboTime)f.combo=0;}
    if(this.grapple){this.updateGrapple(dt);this.remember(inputs);if(!this.grapple&&this.remaining<=0)this.timeLimit();return;}
    if(this.pin){this.updatePin(inputs,dt);this.remember(inputs);if(!this.pin&&this.remaining<=0)this.timeLimit();return;}
    if(this.fighters.every(f=>f.buffer?.action==='grapple')&&canCornerThrow(this.fighters[0],this.fighters[1])){this.startSuperplex(0);this.breakGrapple();this.remember(inputs);return;}
    // A same-frame grab clash is a break for either player, never an index advantage.
    if(this.fighters.every((f,i)=>f.buffer?.action==='grapple'&&!inputs[i]?.block&&f.z===0&&f.stun===0&&!f.move&&f.invincible===0&&['idle','walk','run','block'].includes(f.state))&&Math.abs(this.fighters[0].x-this.fighters[1].x)<106){
      this.fighters[0].facing=this.fighters[1].x>=this.fighters[0].x?1:-1;
      this.startGrapple(0);this.breakGrapple();this.remember(inputs);return;
    }
    if(this.pole?.claimant!==null&&this.pole?.claimant!==undefined){const i=this.pole.claimant;if(this.fighters[i].state!=='perch'||!inputs[i]?.grapple){this.pole.progress=0;this.pole.claimant=null;}}
    // Resolve both players' intentions before evaluating attack ranges.
    for(let i=0;i<2;i++){this.updateFighter(this.fighters[i],this.fighters[1-i],inputs[i]||emptyInput(),dt,i);if(this.grapple||this.pin)break;}
    if(this.grapple||this.pin){this.remember(inputs);return;}
    // Capture both contacts before applying either. One hit must not cancel the other by update order.
    const contacts=[this.contact(0),this.contact(1)].filter(Boolean);
    for(const contact of contacts)this.resolveAttack(contact);
    const [a,b]=this.fighters;
    if(this.pole?.claimant!==null&&this.pole?.claimant!==undefined&&this.fighters[this.pole.claimant].state!=='perch'){this.pole.progress=0;this.pole.claimant=null;}
    if(!unavailable(a)&&!unavailable(b)&&a.z<50&&b.z<50&&Math.abs(a.x-b.x)<66){
      const left=a.x<=b.x?a:b,right=left===a?b:a;
      const center=clamp((left.x+right.x)/2,LEFT+33,RIGHT-33);left.x=center-33;right.x=center+33;
    }
    this.remember(inputs);
    if(a.hp<=0&&b.hp<=0)this.endRound(null,'DOUBLE KO');
    else if(a.hp<=0||b.hp<=0)this.endRound(a.hp<=0?1:0,'KNOCKOUT');
  }
  bufferInput(f,input,dt){
    if(f.buffer){f.buffer.remaining-=dt;if(f.buffer.remaining<=0)f.buffer=null;}
    for(const action of ['special','grapple','heavy','light','jump','weapon','taunt']){
      if(tap(input,f.last,action)){f.buffer={action,remaining:INPUT_BUFFER,submission:action==='grapple'&&Boolean(input.block),low:action==='heavy'&&Boolean(input.block)};break;}
    }
  }
  clearInputs(){for(const f of this.fighters){f.buffer=null;f.last=emptyInput();f.reversalWindow=0;}}
  timeLimit(){
    if(this.brawl){
      // More wrestlers still standing wins; then more health left between them.
      const alive=[0,1].map(s=>this.remainingOn(s)),hp=[0,1].map(s=>this.fighters.reduce((n,f)=>n+(f.side===s&&!f.out?f.hp:0),0));
      this.endRound(alive[0]!==alive[1]?(alive[0]>alive[1]?0:1):Math.abs(hp[0]-hp[1])<.001?null:hp[0]>hp[1]?0:1,'TIME LIMIT');return;
    }
    const [a,b]=this.fighters;this.endRound(Math.abs(a.hp-b.hp)<.001?null:a.hp>b.hp?0:1,'TIME LIMIT');}
  remember(inputs){this.fighters.forEach((f,i)=>f.last={...(inputs[i]||emptyInput())});}
  updateFighter(f,enemy,input,dt,index){
    if(!input.block)f.reversalWindow=0;
    f.reboundTime=Math.max(0,(f.reboundTime||0)-dt);
    if(input.block){f.reboundTime=0;f.reboundDirection=0;}
    if(!['idle','walk','run'].includes(f.state)||input.block){f.runTime=0;f.runDirection=0;}
    if(Math.abs(f.vx)>.1){f.x=clamp(f.x+f.vx*dt,LEFT,RIGHT);f.vx*=Math.exp(-14*dt);}else f.vx=0;
    if(!['climb','perch','ropeTaunt'].includes(f.state)&&(f.z>0||f.vz>0)){f.z+=f.vz*dt;f.vz-=1250*dt;if(f.z<=0){f.z=0;f.vz=0;this.emit('land',{index});}}
    if(this.updateRopes(f,enemy,input,dt,index))return;
    if(f.state==='down'){
      f.downTime-=dt;
      if(tap(input,f.last,'light')||tap(input,f.last,'heavy'))f.downTime-=.11;
      if(f.downTime<=0){f.state='rise';f.t=0;f.invincible=.6;f.wakeUpProtected=true;}return;
    }
    if(f.state==='rise'){if(f.t<.5)return;f.state='idle';f.t=0;}
    if(f.state==='taunt'){if(f.t>=1){f.meter=clamp(f.meter+12,0,100);f.state='idle';f.t=0;this.emit('taunt',{index});}else return;}
    if(f.state==='equip'){if(f.t>=.24){f.state='idle';f.t=0;}else return;}
    if(f.stun>0){f.stun=Math.max(0,f.stun-dt);if(f.stun>0)return;f.state=f.z>0?'jump':'idle';f.t=0;f.exhausted=false;}
    if(f.move){
      const m=f.move==='special'?finisherMove(f.definition,MOVES.special):attackTiming(f.move,f.attackStyle),action=f.buffer?.action;
      if(!f.activeCue&&f.t>=m.startup){f.activeCue=true;this.emit('attackActive',{index,move:f.move,style:f.attackStyle,fighter:f.definition.id});}
      // Confirmed grounded jabs can link twice, then finish with a heavy.
      // Whiffs, blocks, weapon swings and finishers retain their full recovery.
      if(f.move==='light'&&f.confirmed&&f.z===0&&enemy.stun>0&&(!input.block||action==='heavy')&&f.t>=m.startup+m.active&&f.t<m.startup+m.active+m.recovery&&((action==='light'&&f.chain<1)||(action==='heavy'&&f.chain<2))){
        this.startAttack(f,action==='heavy'&&f.buffer.low?'counter':action,index,true);return;
      }
      if(f.t>=m.startup+m.active+m.recovery){f.move=null;f.state=f.z>0?'jump':'idle';f.t=0;f.chain=0;f.confirmed=false;}else return;
    }
    f.facing=enemy.x>=f.x?1:-1;
    const canAct=!input.block||f.z>0;
    const command=f.buffer?.action;
    if(canAct&&command==='weapon'&&f.z===0){
      f.buffer=null;
      if(this.pole){this.poleWeapon(index);return;}
      const choices=f.definition.weapons?['none',...f.definition.weapons.filter(w=>(f.weaponWear[w]||0)<WEAPON_USES[w])]:['chair'];
      f.weapon=choices[(choices.indexOf(f.weapon)+1)%choices.length];f.weaponUses=f.weaponWear[f.weapon]||0;f.state='equip';f.t=0;
      this.emit('weapon',{index,name:f.weapon});return;
    }
    if(this.format==='tag'&&canAct&&command==='taunt'&&f.z===0&&this.canTag(index)){f.buffer=null;this.tag(index);return;}
    if(canAct&&command==='taunt'&&f.z===0){f.buffer=null;if(f.tauntCooldown===0){f.state='taunt';f.t=0;f.tauntCooldown=4;this.emit('tauntStart',{index});return;}}
    const target=this.fighters.indexOf(enemy),held=Boolean(this.grapple||this.pin);
    if((canAct||enemy.state==='down')&&command==='grapple'&&f.z===0){
      if(enemy.state==='down'&&Math.abs(f.x-enemy.x)<125){
        if(canPin(f,enemy)&&!held){const kind=f.buffer.submission?'submission':'pin';f.buffer=null;this.startPin(index,kind,target);}return;
      }
      f.buffer=null;
      if(!held&&canCornerThrow(f,enemy)){this.startSuperplex(index,target);return;}
      if(!held&&enemy.z===0&&enemy.stun===0&&enemy.state!=='rise'&&enemy.invincible===0&&Math.abs(f.x-enemy.x)<106){this.startGrapple(index,target);return;}
      if(f.definition.animations?.climb&&(f.x<LEFT+65||f.x>RIGHT-65)&&Math.abs(f.x-enemy.x)>135){
        this.dropPoleWeapon(index);f.state='climb';f.t=0;f.ropeTime=0;f.move=null;f.vx=0;f.weapon='none';f.x=f.x<640?LEFT+18:RIGHT-18;f.facing=f.x<640?1:-1;this.emit('climb',{index});return;
      }
      f.attackStyle='light';f.move='light';f.state='light';f.t=0;f.hit=true;f.confirmed=false;f.chain=0;f.invincible=0;f.wakeUpProtected=false;this.emit('whiff',{index});return;
    }
    if(command==='heavy'&&f.buffer.low&&f.z===0){this.startAttack(f,'counter',index);return;}
    for(const key of ['special','heavy','light']){
      if(canAct&&command===key){
        if(key==='special'&&f.meter<100){f.buffer=null;this.emit('notReady',{index});continue;}
        this.startAttack(f,key==='heavy'&&f.z>0?'aerial':key,index);return;
      }
    }
    if(command==='jump'&&f.z===0&&!input.block){f.buffer=null;f.vz=615;f.state='jump';f.t=0;this.emit('jump',{index});return;}
    if(input.block&&f.z===0){
      if(tap(input,f.last,'block')&&f.reversalCooldown===0&&f.guard>=20){f.reversalWindow=REVERSAL_WINDOW;f.reversalCooldown=REVERSAL_COOLDOWN;}
      if(f.state!=='block'){f.t=0;f.state='block';}if(!f.guardDelay)f.guard=Math.min(100,f.guard+dt*7*(f.definition.technique||1));return;
    }
    if(!f.guardDelay)f.guard=Math.min(100,f.guard+dt*18*(f.definition.technique||1));
    let movement=Number(input.right)-Number(input.left);
    if(f.reboundTime>0)movement=f.reboundDirection;
    if(movement){
      f.runTime=f.runDirection===movement?f.runTime+dt:0;f.runDirection=movement;f.walkDirection=movement;
      const running=f.reboundTime>0||input.run||f.runTime>RUN_BUILDUP,pace=f.reboundTime>0?1.62:input.run?1.48:1+.48*smooth(f.runTime/RUN_BUILDUP);
      if(running&&f.z===0&&f.runTime>=.20&&f.reboundTime===0&&((movement<0&&f.x<=LEFT)||(movement>0&&f.x>=RIGHT))){
        f.reboundTime=.30;f.reboundDirection=-movement;movement=-movement;f.runDirection=movement;f.walkDirection=movement;
        this.emit('ropeRebound',{index,x:f.x});
      }
      f.facing=movement;
      f.x=clamp(f.x+movement*245*MOVEMENT_PACE*f.definition.speed*(f.z>0?.84:pace)*dt,LEFT,RIGHT);
      const state=running?'run':'walk';if(f.z===0&&f.state!==state){f.state=state;f.t=0;}
    }else{f.runTime=0;f.runDirection=0;if(f.z===0&&f.state!=='idle'){f.state='idle';f.t=0;}}
  }
  startAttack(f,key,index,chained=false){
    // Keep a short burst of forward momentum when committing a running heavy.
    // Require a real run toward the opponent; no instant dash from idle/backpedal.
    const running=key==='heavy'&&!chained&&f.z===0&&f.state==='run'&&f.runTime>=.20&&f.runDirection===f.facing;
    f.runningAttack=running;if(running)f.vx=f.facing*560;
    f.reboundTime=0;f.buffer=null;f.invincible=0;f.wakeUpProtected=false;f.runTime=0;f.runDirection=0;f.chain=chained?f.chain+1:0;
    if(key==='special'){f.meter=0;this.emit('special',{index,name:f.definition.finisher||'LUNACY FINISHER',fighter:f.definition.id,kind:'strike'});}
    f.attackStyle=key==='light'?'light':['counter','aerial'].includes(key)?(f.definition.animations?.kick?'kick':'light'):f.weapon==='none'?(f.definition.animations?.kick?'kick':'light'):f.weapon;
    if(key==='special'&&f.definition.id==='bigfoot')f.attackStyle='light';
    f.state=['counter','aerial'].includes(key)?'heavy':key;f.move=key==='heavy'&&['bat','guitar','trashcan','bottle'].includes(f.weapon)?f.weapon:key;
    f.t=chained&&key==='heavy'?.09:0;f.hit=false;f.confirmed=false;f.activeCue=false;
    this.emit('swing',{index,move:key,style:f.attackStyle,fighter:f.definition.id});
    if(key==='special'&&f.definition.id==='bigfoot'&&f.z===0&&!this.grapple&&!this.pin){
      const target=this.foe(index),enemy=this.fighters[target];
      // A close, unguarded target follows the supplied one-hand lift. A block,
      // jump, protected recovery or out-of-range attempt keeps the ordinary
      // charged-strike rules; meter is spent even on a miss or grab break.
      if(enemy.z===0&&enemy.invincible===0&&!unavailable(enemy)&&enemy.state!=='block'&&Math.abs(enemy.x-f.x)<106){
        this.grapple={kind:'chokeslam',attacker:index,defender:target,time:0,startX:enemy.x};
        f.vx=0;enemy.reboundTime=0;enemy.state='grabbed';enemy.move=null;enemy.vx=0;enemy.vz=0;enemy.stun=0;enemy.t=0;enemy.buffer=null;
      }
    }
  }
  contact(index){
    const f=this.fighters[index];if(!f.move||f.hit)return;
    const m=f.move==='special'?finisherMove(f.definition,MOVES.special):attackTiming(f.move,f.attackStyle);if(f.t<m.startup||f.t>m.startup+m.active)return;
    // One-on-one strikes always look at the other wrestler; in a four-way the
    // nearest opponent in front of the swing takes it (partners are never hit).
    let target=null,gap=Infinity;
    for(const j of this.brawl?this.opponents(index):[1-index]){
      const e=this.fighters[j];
      if(e.state==='down'||e.state==='rise'||e.invincible>0)continue;
      if(this.brawl&&['grabbed','lifted','thrown','pinned'].includes(e.state))continue;
      const dx=e.x-f.x;if(Math.abs(dx)>m.reach||dx*f.facing<0||Math.abs(f.z-e.z)>(f.move==='aerial'?155:105))continue;
      if(Math.abs(dx)<gap){gap=Math.abs(dx);target=j;}
    }
    if(target===null)return;
    const e=this.fighters[target];
    return {index,target,move:f.move,facing:f.facing,blocked:e.state==='block'&&e.facing===-f.facing&&e.z===0,combo:e.stun>0,chain:f.chain,counter:Boolean(e.move&&e.t<attackTiming(e.move,e.attackStyle).startup),running:Boolean(f.runningAttack)};
  }
  resolveAttack({index,target=1-index,move,facing,blocked,combo,chain=0,counter=false,running=false}){
    // A partner's strike on the wrestler holding a pin or throw breaks it up.
    if(this.brawl&&this.grapple&&this.grapple.attacker===target)this.breakGrapple();
    if(this.brawl&&this.pin&&this.pin.attacker===target)this.breakPin();
    const f=this.fighters[index],e=this.fighters[target],m=move==='special'?finisherMove(f.definition,MOVES.special):attackTiming(move,f.attackStyle);
    f.hit=true;
    if(blocked){
      // A fresh, well-timed guard turns a normal strike aside. Finishers,
      // grapples and dives retain their existing counters instead.
      if(move!=='special'&&e.reversalWindow>0&&e.guard>=20){
        e.reversalWindow=0;e.meter=clamp(e.meter+12,0,100);
        f.move=null;f.buffer=null;f.confirmed=false;f.chain=0;f.combo=0;f.runningAttack=false;
        f.state='hurt';f.t=0;f.stun=.32;f.vx=-facing*160;
        this.hitStop=Math.max(this.hitStop,.045);
        this.emit('reversal',{index:target,attacker:index,x:e.x,z:e.z});return;
      }
      const guardCost=move==='special'?55:move==='light'?14:(m.guard||30);e.guard-=guardCost;e.guardDelay=.7;
      if(e.guard>0){e.vx=facing*m.knock*5;e.meter=clamp(e.meter+4,0,100);f.meter=clamp(f.meter+2,0,100);f.combo=0;this.hitStop=.04;this.emit('block',{index:target,x:(f.x+e.x)/2,z:e.z});return;}
      e.guard=0;e.stun=.85;this.emit('guardBreak',{index:target});
    }
    const scale=chain===0?1:chain===1?.85:.70;
    const damage=m.damage*scale*f.definition.power/e.definition.toughness;
    e.hp=Math.max(0,e.hp-damage);e.meter=clamp(e.meter+damage*.8,0,100);f.meter=clamp(f.meter+m.meter,0,100);
    e.reboundTime=0;e.move=null;e.buffer=null;e.confirmed=false;e.chain=0;e.exhausted=blocked;e.stun=Math.max(e.stun,m.stun);e.state='hurt';e.t=0;f.confirmed=true;
    e.vx=facing*m.knock*14;f.combo=combo?f.combo+1:1;f.comboTime=1.2;
    this.hitStop=Math.max(this.hitStop,move==='special'?.10:counter?.065:move==='light'?.045:.075);this.shake=Math.max(this.shake,move==='light'?3:8);
    this.emit('hit',{index:target,attacker:index,move,x:e.x-facing*25,z:e.z,damage,combo:f.combo,counter,running,ender:chain===2,style:f.attackStyle,fighter:f.definition.id});
    this.secondWind(target);
    if(WEAPON_USES[f.attackStyle]&&!['light','counter','aerial'].includes(move)){
      const name=f.attackStyle;f.weaponWear[name]=(f.weaponWear[name]||0)+1;f.weaponUses=f.weaponWear[name];
      if(this.pole)this.pole.uses=f.weaponUses;
      if(f.weaponUses>=WEAPON_USES[name]){f.weapon='none';if(this.pole){this.pole.holder=null;this.pole.broken=true;this.pole.looseX=null;}this.emit('weaponBreak',{index,name});}
    }
    if(move==='counter'){this.knockDown(e,'back',.28,1.35);}
    else if(chain===2||move==='special'||e.hp<=0||['guitar','trashcan','bottle'].includes(move)||(move==='heavy'&&f.attackStyle==='chair'&&(running||e.hp<55))){this.knockDown(e,'back',.38,e.hp<25?3.7:2.5);}
  }
  secondWind(index){
    const f=this.fighters[index];
    if(f.hp<=0||f.hp>30||f.secondWindUsed)return;
    f.secondWindUsed=true;f.meter=clamp(f.meter+25,0,100);f.guard=clamp(f.guard+20,0,100);
    // One chance per round; no healing, invulnerability or cancelled hitstun.
    this.emit('secondWind',{index,x:f.x,z:f.z});
  }
  startGrapple(index,target=this.foe(index)){
    this.dropPoleWeapon(index);this.dropPoleWeapon(target);
    const a=this.fighters[index],b=this.fighters[target];
    a.weapon=a.definition.weapons?'none':a.weapon;b.weapon=b.definition.weapons?'none':b.weapon;
    this.grapple={attacker:index,defender:target,time:0,released:false,startX:b.x,fromX:a.x,throwDir:a.x<LEFT+180?1:a.x>RIGHT-180?-1:a.facing};
    a.reboundTime=0;b.reboundTime=0;a.state='grapple';a.t=0;a.move=null;a.vx=0;a.buffer=null;a.invincible=0;a.wakeUpProtected=false;a.runTime=0;a.runDirection=0;b.state='grabbed';b.move=null;b.vx=0;b.t=0;b.stun=0;this.emit('grapple',{index});
  }
  updateGrapple(dt){
    const g=this.grapple,d=defenderOf(g),a=this.fighters[g.attacker],b=this.fighters[d];g.time+=dt;
    if(g.kind==='superplex'){this.updateSuperplex(dt);return;}
    if(g.kind==='chokeslam'){this.updateChokeslam();return;}
    const t=g.time;a.t=t;b.t=t;
    if(t<=THROW_BREAK_WINDOW&&b.buffer?.action==='grapple'){this.breakGrapple();return;}
    if(t<.32){b.x=g.startX+(clamp(a.x+a.facing*62,LEFT,RIGHT)-g.startX)*smooth(t/.32);b.z=0;}
    else if(t<.84){
      const lift=smooth((t-.32)/.52);b.z=245*lift;
      const beside=clamp(a.x+a.facing*62,LEFT,RIGHT);b.x=beside+(a.x+a.facing*12-beside)*lift;b.state='lifted';
    }
    else{
      if(!g.released){g.released=true;a.facing=g.throwDir;a.state='throw';a.t=0;b.state='thrown';b.vz=135;this.emit('throw',{index:g.attacker});}
      a.t=t-.84;b.t=t-.84;
      b.x=clamp(b.x+g.throwDir*330*dt,LEFT,RIGHT);b.z+=b.vz*dt;b.vz-=1450*dt;
      if(b.z<=30){
        b.z=0;b.vz=0;b.hp=Math.max(0,b.hp-17*a.definition.power*(a.definition.technique||1)/b.definition.toughness);b.meter=clamp(b.meter+15,0,100);a.meter=clamp(a.meter+20,0,100);this.knockDown(b,'front',.16,b.hp<35?3.8:2.6);b.invincible=.1;a.state='idle';a.t=0;this.grapple=null;this.hitStop=.11;this.shake=11;this.emit('slam',{x:b.x,index:d});
        this.secondWind(d);
        if(b.hp<=0)this.decide(g.attacker,d,'KNOCKOUT');
      }
    }
  }
  updateChokeslam(){
    const g=this.grapple,d=defenderOf(g),a=this.fighters[g.attacker],b=this.fighters[d],m=finisherMove(a.definition,MOVES.special),t=g.time;
    a.t=t;b.t=t;
    if(t<=THROW_BREAK_WINDOW&&b.buffer?.action==='grapple'){this.breakGrapple();return;}
    b.x=g.startX+(clamp(a.x+a.facing*72,LEFT,RIGHT)-g.startX)*smooth(t/(m.startup/2));
    const liftStart=m.startup/4,driveStart=m.startup*.75;
    b.z=t<driveStart?112*smooth((t-liftStart)/(driveStart-liftStart)):112*(1-smooth((t-driveStart)/(m.startup-driveStart)));
    if(t<m.startup)return;
    b.z=0;b.vz=0;this.grapple=null;a.activeCue=true;
    this.emit('attackActive',{index:g.attacker,move:'special',style:a.attackStyle,fighter:a.definition.id});
    this.resolveAttack({index:g.attacker,target:d,move:'special',facing:a.facing,blocked:false,combo:false});
    b.vx=0;b.fallDuration=0; // The body has already landed beside the attacker.
    if(b.hp<=0)this.decide(g.attacker,d,'KNOCKOUT');
  }
  breakGrapple(){
    const g=this.grapple;
    if(g.kind==='superplex'){
      for(const [k,i] of [g.attacker,defenderOf(g)].entries()){const f=this.fighters[i],origin=g.origins[k];Object.assign(f,{x:origin.x,z:origin.z,vz:0,vx:0,state:origin.z>0?'perch':'hurt',t:0,stun:origin.z>0?0:.24,buffer:null,move:null,invincible:.3,wakeUpProtected:false});}this.grapple=null;this.emit('throwBreak');return;
    }
    for(const i of [g.attacker,defenderOf(g)]){const f=this.fighters[i];f.state='hurt';f.t=0;f.stun=.24;f.buffer=null;f.move=null;f.z=0;f.vz=0;f.vx=(i===g.attacker?-1:1)*this.fighters[g.attacker].facing*260;f.invincible=.3;f.wakeUpProtected=false;}
    this.grapple=null;this.emit('throwBreak');
  }
  knockDown(f,face='back',duration=.38,downTime=2.5){
    this.dropPoleWeapon(this.fighters.indexOf(f));
    f.wakeUpProtected=false;f.reboundTime=0;f.state='down';f.t=0;f.fallFace=face;f.fallDuration=duration;f.downTime=downTime;f.stun=0;f.z=0;f.vz=0;f.move=null;f.buffer=null;f.confirmed=false;f.chain=0;f.runTime=0;f.runDirection=0;
  }
  updateRopes(f,enemy,input,dt,index){
    if(f.state==='climb'){
      f.z=140*smooth(f.t/.8);
      if(f.t>=.8){f.state='perch';f.t=0;f.z=140;}return true;
    }
    if(onTopRope(f)){
      f.ropeTime=(f.ropeTime||0)+dt;f.z=TOP_ROPE_HEIGHT;
      if(f.state==='ropeTaunt'){
        if(input.block){f.state='perch';f.t=0;}else if(f.t<1)return true;
        else{f.meter=clamp(f.meter+20,0,100);f.state='perch';f.t=0;this.emit('taunt',{index,amount:20,topRope:true});return true;}
      }
      f.z=140;f.facing=f.x<640?1:-1;
      if(input.block||f.ropeTime>6){f.state='jump';f.t=0;f.vz=0;f.x=clamp(f.x+f.facing*45,LEFT,RIGHT);f.buffer=null;return true;}
      if(f.buffer?.action==='taunt'){
        f.buffer=null;if(f.tauntCooldown===0){f.state='ropeTaunt';f.t=0;f.tauntCooldown=6;this.emit('tauntStart',{index,topRope:true});}return true;
      }
      if(f.buffer?.action==='grapple'&&canCornerThrow(f,enemy)){this.startSuperplex(index);return true;}
      if(this.pole&&!this.pole.claimed&&Math.abs(f.x-this.pole.x)<40){
        if(input.grapple){this.pole.claimant=index;this.pole.progress+=dt;f.buffer=null;
          if(this.pole.progress>=POLE_RETRIEVE_TIME){this.pole.claimed=true;this.pole.holder=index;this.pole.progress=0;this.pole.claimant=null;f.weapon='chair';f.weaponWear.chair=0;f.weaponUses=0;this.emit('poleClaim',{index});}return true;
        }
        if(this.pole.claimant===index){this.pole.progress=0;this.pole.claimant=null;}
      }
      if(['jump','light','heavy','special','grapple'].includes(f.buffer?.action)){
        const superDive=f.buffer.action==='special'&&f.meter>=100;f.divePower=superDive?1.55:1;
        if(superDive){f.meter=0;this.emit('special',{index,name:f.definition.finisher,fighter:f.definition.id,kind:'dive'});}
        f.state='dive';f.t=0;f.vz=360;f.vx=0;f.diveHit=false;f.buffer=null;this.emit('dive',{index});
      }return true;
    }
    if(f.state!=='dive')return false;
    f.x=clamp(f.x+f.facing*490*MOVEMENT_PACE*f.definition.speed*dt,LEFT,RIGHT);
    const grounded=f.z===0,close=Math.abs(f.x-enemy.x)<115,vertical=enemy.state==='down'?f.z<90:Math.abs(f.z-enemy.z)<150;
    // Getting up protects against grounded pressure, not a dive already landing on the body.
    // Keep throw-break, kickout and other invulnerability intact. The flag lasts through
    // the final standing recovery frames, so the animation boundary cannot create a miss.
    const canHit=enemy.invincible===0||enemy.wakeUpProtected;
    if(!f.diveHit&&close&&vertical&&canHit&&enemy.state!=='pinned'){
      f.diveHit=true;const blocked=enemy.state==='block',ei=this.fighters.indexOf(enemy);
      if(blocked){
        enemy.guard=Math.max(0,enemy.guard-35);enemy.guardDelay=.7;
        if(enemy.guard>0){this.emit('block',{index:ei,x:enemy.x,z:0});this.knockDown(f,'front',.18,1.1);return true;}
        this.emit('guardBreak',{index:ei});
      }
      const damage=23*f.divePower*f.definition.power/enemy.definition.toughness;enemy.hp=Math.max(0,enemy.hp-damage);enemy.meter=clamp(enemy.meter+damage*.8,0,100);f.meter=clamp(f.meter+16,0,100);
      enemy.invincible=0;this.knockDown(enemy,'back',.20,3.1);enemy.vx=f.facing*350;this.shake=10;this.hitStop=.09;this.emit('slam',{index:ei,x:enemy.x});
      this.secondWind(ei);
    }
    if(grounded){
      if(f.diveHit){f.state='rise';f.t=0;f.invincible=.25;f.wakeUpProtected=false;}
      else{f.hp=Math.max(1,f.hp-4);this.knockDown(f,'front',.25,1.35);this.emit('slam',{index,x:f.x});}
    }return true;
  }
  dropPoleWeapon(index){
    if(!this.pole||this.pole.holder!==index)return;
    const f=this.fighters[index];this.pole.holder=null;this.pole.looseX=f.x;f.weapon='none';this.emit('poleDrop',{index,x:f.x});
  }
  poleWeapon(index){
    const p=this.pole,f=this.fighters[index];
    if(p.holder===index){this.dropPoleWeapon(index);return;}
    if(p.looseX!==null&&Math.abs(f.x-p.looseX)<80){p.holder=index;p.looseX=null;f.weapon='chair';f.weaponWear.chair=p.uses;f.weaponUses=p.uses;f.state='equip';f.t=0;this.emit('weapon',{index,name:'chair'});}
    else this.emit('poleHint',{index});
  }
  startSuperplex(index,target=this.foe(index)){
    const a=this.fighters[index],b=this.fighters[target];
    if(!canCornerThrow(a,b))return false;
    const corner=onTopRope(a)?a.x:b.x,dir=corner<640?1:-1;
    const origins=[a,b].map(f=>({x:f.x,z:f.z}));
    this.dropPoleWeapon(index);this.dropPoleWeapon(target);
    this.grapple={kind:'superplex',attacker:index,defender:target,time:0,released:false,corner,throwDir:dir,origins};
    for(const f of [a,b]){f.move=null;f.buffer=null;f.vx=0;f.vz=0;f.stun=0;f.reboundTime=0;f.runTime=0;f.t=0;f.invincible=0;f.wakeUpProtected=false;f.weapon='none';}
    a.facing=dir;b.facing=-dir;a.state='grapple';b.state='grabbed';this.emit('grapple',{index,kind:'superplex'});return true;
  }
  updateSuperplex(dt){
    const g=this.grapple,d=defenderOf(g),a=this.fighters[g.attacker],b=this.fighters[d],t=g.time,dir=g.throwDir;
    if(t<=throwBreakWindow(g)&&b.buffer?.action==='grapple'){this.breakGrapple();return;}
    const [a0,b0]=g.origins;
    a.t=t;b.t=t;
    if(t<.95){
      const rise=smooth(t/.65),lift=smooth((t-.40)/.55);
      a.x=a0.x+(g.corner+dir*35-a0.x)*rise;a.z=a0.z+(TOP_ROPE_HEIGHT-a0.z)*rise;
      b.x=b0.x+(g.corner+dir*55-b0.x)*rise;b.z=b0.z+(TOP_ROPE_HEIGHT-b0.z)*rise+105*lift;
      if(t>.4)b.state='lifted';return;
    }
    if(!g.released){g.released=true;a.state='throw';b.state='thrown';a.vz=155;b.vz=135;this.emit('throw',{index:g.attacker,kind:'superplex'});}
    a.t=t-.95;b.t=t-.95;
    for(const f of [a,b]){f.x=clamp(f.x+dir*(f===a?255:360)*dt,LEFT,RIGHT);f.z=Math.max(0,f.z+f.vz*dt);f.vz-=1250*dt;}
    if(b.z<=0){
      const damage=28*a.definition.power*(a.definition.technique||1)/b.definition.toughness;
      b.hp=Math.max(0,b.hp-damage);b.meter=clamp(b.meter+damage*.8,0,100);a.meter=clamp(a.meter+26,0,100);
      this.knockDown(b,'back',.18,3.2);b.invincible=.1;a.z=0;a.vz=0;a.state='rise';a.t=0;a.invincible=.2;a.wakeUpProtected=false;
      this.grapple=null;this.hitStop=.12;this.shake=10;this.emit('slam',{index:d,x:b.x,damage,superplex:true});this.secondWind(d);
      if(b.hp<=0)this.decide(g.attacker,d,'KNOCKOUT');
    }
  }
  startPin(index,kind='pin',target=this.foe(index)){
    this.dropPoleWeapon(index);this.dropPoleWeapon(target);
    const a=this.fighters[index],b=this.fighters[target];a.state='pin';a.t=0;a.buffer=null;a.vx=0;a.invincible=0;a.wakeUpProtected=false;a.runTime=0;a.runDirection=0;b.vx=0;b.buffer=null;b.state='pinned';b.fallFace='back';b.fallDuration=0;b.t=0;this.pin={kind,attacker:index,defender:target,time:0,count:0,escape:0,lastButton:null,startX:a.x,targetX:clamp(b.x-a.facing*23,LEFT,RIGHT)};this.emit('pin',{index,kind});
  }
  updatePin(inputs,dt){
    const p=this.pin,d=defenderOf(p),a=this.fighters[p.attacker],b=this.fighters[d],input=inputs[d]||emptyInput();p.time+=dt;
    a.x=p.startX+(p.targetX-p.startX)*smooth(p.time/.2);
    if(p.time>=.35&&nearRopes(b)){this.releasePin('ropeBreak');return;}
    if(p.time>=.3&&tap(inputs[p.attacker]||emptyInput(),a.last,'grapple')){this.releasePin('pinRelease');return;}
    const need=escapeTarget(b.hp);
    const pressed=['light','heavy'].filter(key=>tap(input,b.last,key));
    if(pressed.length===1&&pressed[0]!==p.lastButton){p.escape++;p.lastButton=pressed[0];}
    if(this.routed?this.cpuPlayers.has(b.player):!isLocalMode(this.options.mode)&&!['practice','online'].includes(this.options.mode)&&p.attacker===0){
      const level=this.options.difficulty==='hard'?1.2:this.options.difficulty==='easy'?.65:1;
      p.escape+=dt*(b.hp>55?12:b.hp>30?7:3.2)*level;
    }
    // Healthy opponents naturally resist an early pin, even without input.
    if(b.hp>60)p.escape+=dt*6;
    const count=p.kind==='submission'?0:Math.min(3,Math.floor(p.time/.9));if(count>p.count){p.count=count;this.emit('count',{count});}
    if(p.escape>=need){this.releasePin(p.kind==='submission'?'holdBreak':'kickout');}
    else if(p.kind==='submission'?p.time>=3.6:p.count>=3){this.pin=null;b.state='down';if(this.brawl){a.state='idle';a.t=0;a.buffer=null;a.vx=-a.facing*300;}this.decide(p.attacker,d,p.kind==='submission'?'TAP OUT':'PINFALL');}
  }
  releasePin(type){
    const p=this.pin,a=this.fighters[p.attacker],b=this.fighters[defenderOf(p)];
    b.state='rise';b.t=0;b.buffer=null;b.invincible=.8;b.wakeUpProtected=false;a.state='idle';a.t=0;a.buffer=null;a.vx=-a.facing*900;
    this.pin=null;this.emit(type);
  }
  endRound(winner,method){
    if(this.phase!=='fight')return;
    // Tag and tornado matches are one fall: a level finish goes to sudden-death overtime.
    if(winner===null&&(this.format==='tag'||this.brawl)){this.overtime(method);return;}
    this.phase='roundEnd';this.phaseTime=0;this.roundWinner=winner;this.method=method;this.grapple=null;this.pin=null;
    for(const [i,f] of this.fighters.entries()){if(f.out)continue;f.z=0;f.vz=0;f.vx=0;f.move=null;f.buffer=null;f.stun=0;if(f.state!=='down')f.t=0;if(this.brawl?f.side!==winner:i!==winner)f.state=f.hp<=0||f.state==='down'||method==='PINFALL'?'down':'defeat';}
    if(winner!==null){if(this.options.mode!=='practice')this.wins[winner]++;for(const [i,f] of this.fighters.entries())if(this.brawl?f.side===winner&&!f.out:i===winner){f.state='victory';f.t=0;}}
    if(this.format==='elimination')this.eliminate(winner);
    this.emit('roundEnd',{winner,method});
  }
  remainingOn(side){
    if(!this.teams)return 0;
    if(this.brawl)return this.fighters.filter(f=>f.side===side&&!f.out).length;
    return this.format==='tag'?this.teams[side].length:this.teams[side].length-this.slot[side];
  }
  // ---- team play helpers ----
  opponents(index){const side=this.fighters[index].side??index;return this.fighters.map((f,j)=>j).filter(j=>(this.fighters[j].side??j)!==side&&!this.fighters[j].out);}
  involved(index){const g=this.grapple,p=this.pin;return Boolean((g&&(g.attacker===index||defenderOf(g)===index))||(p&&(p.attacker===index||defenderOf(p)===index)));}
  // The opponent a wrestler faces and attacks. Two in the ring: the other one.
  // Four in the ring: the nearest free opponent, kept unless another is clearly closer.
  foe(index){
    if(this.fighters.length===2)return 1-index;
    const f=this.fighters[index],all=this.opponents(index);
    if(!all.length)return this.fighters.findIndex(e=>e.side!==f.side);
    const free=all.filter(j=>!['pinned','grabbed','lifted','thrown'].includes(this.fighters[j].state)),pool=free.length?free:all;
    const gap=j=>Math.abs(this.fighters[j].x-f.x);
    let best=pool.reduce((a,b)=>gap(b)<gap(a)?b:a);
    if(pool.includes(f.target)&&gap(f.target)<gap(best)+60)best=f.target;
    f.target=best;return best;
  }
  decide(winner,loser,method){if(this.brawl)this.eliminateFighter(loser,method);else this.endRound(winner,method);}
  breakPin(){
    const p=this.pin;if(!p)return;const b=this.fighters[defenderOf(p)];
    b.state='rise';b.t=0;b.buffer=null;b.invincible=.8;b.wakeUpProtected=false;this.pin=null;this.emit('pinBreak',{index:defenderOf(p),attacker:p.attacker});
  }
  overtime(method){
    // Both sides would lose at once: anyone knocked out comes back on 30 health
    // and the clock gets at least 30 more seconds.
    this.grapple=null;this.pin=null;
    for(const f of this.fighters)if(!f.out&&f.hp<=0){Object.assign(f,{hp:SUDDEN_DEATH_HP,state:'rise',t:0,invincible:1,wakeUpProtected:false,move:null,buffer:null,stun:0,z:0,vz:0,vx:0});}
    for(const f of this.fighters)if(!f.out&&['pin','pinned','grapple','grabbed','lifted','thrown','throw'].includes(f.state)){f.state='idle';f.t=0;f.z=0;f.vz=0;}
    this.remaining=Math.max(this.remaining,30);this.suddenDeath=true;
    this.emit('suddenDeath',{method});
  }
  eliminateFighter(index,method){
    const f=this.fighters[index];if(!f||f.out)return;
    if(this.pin&&this.involved(index)){const other=this.fighters[this.pin.attacker===index?defenderOf(this.pin):this.pin.attacker];this.pin=null;if(other!==f){other.state=other.hp>0?'rise':'down';other.t=0;other.buffer=null;other.invincible=.5;}}
    if(this.grapple&&this.involved(index)){const other=this.fighters[this.grapple.attacker===index?defenderOf(this.grapple):this.grapple.attacker];this.grapple=null;if(other!==f){Object.assign(other,{state:'idle',t:0,z:0,vz:0,vx:0,buffer:null,move:null});}}
    if(f.state!=='down')this.knockDown(f,'back',.38,99);
    Object.assign(f,{out:true,outTime:0,state:'down',downTime:99,move:null,buffer:null,vx:0,z:0,vz:0,invincible:0});
    this.out[f.side].push(f.id);
    const left=[0,1].map(s=>this.remainingOn(s));
    this.emit('elimination',{eliminated:[{side:f.side,id:f.id,index}],left,next:null,method,live:true,index});
    if(left[f.side]===0)this.endRound(1-f.side,method);
  }
  canTag(index){
    const f=this.fighters[index];if(!this.teams||this.teams[f.side].length<2)return false;
    return f.side===0?f.x<=LEFT+TAG_REACH:f.x>=RIGHT-TAG_REACH;
  }
  tag(index){
    const f=this.fighters[index],side=f.side,team=this.teams[side];
    this.stats[f.id]={hp:f.hp,meter:f.meter,guard:f.guard,secondWindUsed:f.secondWindUsed,weaponWear:{...f.weaponWear}};
    this.slot[side]=(this.slot[side]+1)%team.length;
    const id=team[this.slot[side]];this.ids[side]=id;
    const n=this.makeFighter(id,index);
    Object.assign(n,{x:side?RIGHT-24:LEFT+24,facing:side?-1:1,invincible:.6,state:'idle',t:0});
    this.fighters[index]=n;
    if(this.ai[index])this.ai[index]={aiTimer:.25,aiInput:emptyInput()};
    this.emit('tag',{index,side,from:f.id,to:id,player:n.player});
  }
  partnerOf(side){
    // Tag: the wrestler waiting on the apron, with their saved health.
    if(this.format!=='tag'||!this.teams)return null;
    const id=this.teams[side][(this.slot[side]+1)%this.teams[side].length];if(id===this.ids[side])return null;
    return {id,hp:this.stats[id]?.hp??100,meter:this.stats[id]?.meter??0};
  }
  routeInputs(inputs,dt,think=true){
    return this.fighters.map((f,i)=>{
      if(f.out)return emptyInput();
      if(this.cpuPlayers.has(f.player)){if(!think)return emptyInput();const ai=this.ai[i];return this.hitStop>0&&ai?ai.aiInput:this.cpu(dt,i);}
      return inputs[f.player]||emptyInput();
    });
  }
  stepBrawl(inputs,dt){
    const live=this.fighters.map((f,i)=>i).filter(i=>!this.fighters[i].out);
    for(const f of this.fighters){
      f.t+=dt;if(f.out){f.outTime=(f.outTime||0)+dt;continue;}
      f.invincible=Math.max(0,f.invincible-dt);if(!f.invincible)f.wakeUpProtected=false;f.guardDelay=Math.max(0,f.guardDelay-dt);f.comboTime=Math.max(0,f.comboTime-dt);f.tauntCooldown=Math.max(0,f.tauntCooldown-dt);f.reversalWindow=Math.max(0,f.reversalWindow-dt);f.reversalCooldown=Math.max(0,f.reversalCooldown-dt);if(!f.comboTime)f.combo=0;
    }
    if(this.grapple)this.updateGrapple(dt);
    if(this.phase!=='fight'){this.remember(inputs);return;}
    if(this.pin)this.updatePin(inputs,dt);
    if(this.phase!=='fight'){this.remember(inputs);return;}
    // Same-frame grab clashes break, pair by pair, never by index order.
    if(!this.grapple&&!this.pin)for(const i of live)for(const j of this.opponents(i)){
      if(j<i)continue;const a=this.fighters[i],b=this.fighters[j];
      if([a,b].every((f,k)=>f.buffer?.action==='grapple'&&!inputs[k?j:i]?.block&&f.z===0&&f.stun===0&&!f.move&&f.invincible===0&&['idle','walk','run','block'].includes(f.state))&&Math.abs(a.x-b.x)<106){
        a.facing=b.x>=a.x?1:-1;this.startGrapple(i,j);this.breakGrapple();
      }
    }
    for(const i of live){
      const f=this.fighters[i];if(f.out||this.involved(i))continue;
      this.updateFighter(f,this.fighters[this.foe(i)],inputs[i]||emptyInput(),dt,i);
    }
    const contacts=live.filter(i=>!this.involved(i)).map(i=>this.contact(i)).filter(Boolean);
    for(const contact of contacts)if(!this.fighters[contact.index].out&&!this.fighters[contact.target].out)this.resolveAttack(contact);
    for(const i of live)for(const j of this.opponents(i)){
      if(j<i)continue;const a=this.fighters[i],b=this.fighters[j];
      if(!unavailable(a)&&!unavailable(b)&&a.z<50&&b.z<50&&Math.abs(a.x-b.x)<66){
        const left=a.x<=b.x?a:b,right=left===a?b:a;
        const center=clamp((left.x+right.x)/2,LEFT+33,RIGHT-33);left.x=center-33;right.x=center+33;
      }
    }
    this.remember(inputs);
    const down=live.filter(i=>!this.fighters[i].out&&this.fighters[i].hp<=0);
    if(down.length){
      const wiped=[0,1].filter(s=>this.fighters.every((f,i)=>f.side!==s||f.out||down.includes(i)));
      if(wiped.length===2){this.overtime('DOUBLE KO');return;}
      for(const i of down)this.eliminateFighter(i,'KNOCKOUT');
    }
  }
  eliminate(winner){
    // A draw (double KO or a level time limit) eliminates both wrestlers in the ring.
    const losers=winner===null?[0,1]:[1-winner];
    for(const side of losers){this.out[side].push(this.ids[side]);this.slot[side]++;this.carry[side]=null;}
    if(winner!==null){const f=this.fighters[winner];this.carry[winner]={hp:Math.min(100,Math.max(1,f.hp)+ELIMINATION_RECOVERY),meter:f.meter,secondWindUsed:f.secondWindUsed};}
    // Both teams wiped out in the same fall: the last two come back for a sudden-death fall.
    if(this.slot.every((n,i)=>n>=this.teams[i].length)){
      for(const side of [0,1]){this.slot[side]--;this.out[side].pop();this.carry[side]={hp:50,meter:0,secondWindUsed:true};}
      this.suddenDeath=true;
    }
    const left=[0,1].map(i=>this.remainingOn(i));
    this.nextIds=left.every(n=>n>0)?[0,1].map(i=>this.teams[i][this.slot[i]]):null;
    this.emit('elimination',{eliminated:losers.map(side=>({side,id:this.out[side].at(-1)})).filter(e=>e.id!==undefined&&!this.suddenDeath),left,next:this.nextIds,suddenDeath:Boolean(this.suddenDeath)});
  }
  nextFall(){
    const left=[0,1].map(i=>this.remainingOn(i));
    if(left.some(n=>n===0)){this.phase='done';this.winner=left[0]>0?0:1;this.emit('matchEnd',{winner:this.winner,method:this.method});return;}
    this.ids=this.nextIds||[0,1].map(i=>this.teams[i][this.slot[i]]);this.nextIds=null;this.suddenDeath=false;this.round++;this.newRound();
  }
  cpu(dt,index=1){
    // Unrouted modes keep one CPU state on the match itself; team play keeps one per wrestler.
    const ai=this.routed?(this.ai[index]??={aiTimer:0,aiInput:emptyInput()}):this;
    const me=this.fighters[index],diff=this.options.difficulty;
    let target=this.foe(index);
    // A four-way partner runs in to break up a pin or throw on a teammate.
    for(const hold of [this.pin,this.grapple])if(this.brawl&&hold&&!this.involved(index)&&this.fighters[defenderOf(hold)]?.side===me.side&&!this.fighters[hold.attacker].out)target=hold.attacker;
    const enemy=this.fighters[target];
    const profile=fighterProfile(me.definition);
    const rate=diff==='hard'?.13:diff==='easy'?.34:.22;
    ai.aiTimer-=dt;
    if(ai.aiTimer>0)return ai.aiInput;
    ai.aiTimer=rate+this.random()*.11;
    const v=emptyInput(),distance=Math.abs(me.x-enemy.x),toward=me.x<enemy.x?'right':'left',away=me.x<enemy.x?'left':'right';
    const busy=!this.brawl||this.involved(index);
    if(this.pin&&busy){ai.aiInput={...v};delete ai.aiInput.pressed;return v;}
    if(this.grapple&&busy){if(defenderOf(this.grapple)===index&&this.grapple.time<throwBreakWindow(this.grapple)&&this.random()<(diff==='hard'?.6:diff==='easy'?.05:.25))v.grapple=true;ai.aiInput={...v};delete ai.aiInput.pressed;return v;}
    if(me.state==='down'){v[this.random()<.5?'light':'heavy']=true;ai.aiInput={...v};delete ai.aiInput.pressed;return v;}
    if(this.format==='tag'&&me.state!=='down'){
      // Hurt and the partner is fresher: head for the corner and make the tag.
      const partner=this.partnerOf(me.side);
      if(partner&&me.hp<45&&partner.hp>me.hp+20){
        if(this.canTag(index)){v.taunt=true;v.pressed={taunt:true};ai.aiInput={...v};delete ai.aiInput.pressed;return v;}
        if(distance>110||this.random()<.6){v[me.side===0?'left':'right']=true;ai.aiInput={...v};delete ai.aiInput.pressed;return v;}
      }
    }
    if(distance>92)v[toward]=true;
    if(this.pole&&!this.pole.broken){
      if(!this.pole.claimed){
        // Use the same corner boundary as updateFighter's climb check.
        // Measuring 65px from the inset pole leaves an 18px band of endless grab whiffs.
        const atPole=this.pole.x<640?me.x<LEFT+65:me.x>RIGHT-65;
        if(me.state==='perch'&&atPole){v.grapple=true;ai.aiInput={...v};delete ai.aiInput.pressed;return v;}
        if(distance>180){v.left=false;v.right=false;if(!atPole)v[me.x<this.pole.x?'right':'left']=true;else if(me.z===0){v.grapple=true;v.pressed={grapple:true};}ai.aiInput={...v};delete ai.aiInput.pressed;return v;}
      }else if(this.pole.looseX!==null&&me.z===0){const gap=Math.abs(me.x-this.pole.looseX);if(gap<80){v.weapon=true;v.pressed={weapon:true};}else if(distance>180){v.left=false;v.right=false;v[me.x<this.pole.looseX?'right':'left']=true;}if(gap<80||distance>180){ai.aiInput={...v};delete ai.aiInput.pressed;return v;}}
    }
    if(canCornerThrow(me,enemy)){v.grapple=true;v.pressed={grapple:true};ai.aiInput={...v};delete ai.aiInput.pressed;return v;}
    if(me.state==='perch'){if(distance>300&&me.tauntCooldown===0&&this.random()<.2)v.taunt=true;else v.jump=true;v.pressed={[v.taunt?'taunt':'jump']:true};ai.aiInput={...v};delete ai.aiInput.pressed;return v;}
    if(!this.pole&&me.definition.weapons&&me.weapon==='none'&&distance>260&&this.random()<profile.weapon)v.weapon=true;
    if(me.definition.animations?.climb&&distance>300&&(me.x<LEFT+65||me.x>RIGHT-65)&&this.random()<profile.climb)v.grapple=true;
    if(distance>420&&me.meter<85&&me.tauntCooldown===0&&this.random()<.08)v.taunt=true;
    if(enemy.move&&distance<165&&this.random()<(diff==='easy'?.28:diff==='hard'?.85:.6))v.block=true;
    else if(distance<155){
      const r=this.random();
      if(canPin(me,enemy)&&!nearRopes(enemy)){v.grapple=true;v.block=enemy.hp<35&&this.random()<(profile.id==='technician'?.75:.20);}
      else if(enemy.state==='down'||enemy.state==='rise'){v[toward]=false;if(distance<120)v[away]=true;}
      else if(me.meter>=100&&r<.6)v.special=true;
      else if(distance<100&&enemy.stun===0&&r<profile.grab)v.grapple=true;
      else if(distance<105&&r<(profile.id==='powerhouse'?.40:.64))v.light=true;
      else if(distance<attackTiming(['bat','guitar','trashcan','bottle'].includes(me.weapon)?me.weapon:'heavy',me.weapon==='none'?'light':me.weapon).reach-8&&r<Math.min(.97,profile.heavy+.20))v.heavy=true;
      else if(distance<92){v[toward]=false;v[away]=true;}
    }
    if(distance>155&&distance<320&&this.random()<profile.jump)v.jump=true;
    // A fresh decision can repeat the same attack. Store only held state so the
    // press is consumed once, including when the next step is hit-stop.
    ai.aiInput={...v};
    v.pressed=Object.fromEntries(['light','heavy','special','weapon','taunt','jump','grapple'].filter(k=>v[k]).map(k=>[k,true]));
    return v;
  }
}
