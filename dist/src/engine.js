import {fighterProfile,finisherMove} from './fighter-profile.js?v=0.20.2';
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
export const isLocalMode = mode => mode==='local'||mode==='pole-local';
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
    this.newRound();
  }
  newRound(){
    this.fighters=this.ids.map((id,i)=>({id,definition:this.roster[id],x:i?870:410,z:0,vz:0,vx:0,facing:i?-1:1,hp:100,meter:0,guard:100,guardDelay:0,reversalWindow:0,reversalCooldown:0,secondWindUsed:false,reboundTime:0,reboundDirection:0,state:'idle',t:0,move:null,hit:false,confirmed:false,chain:0,stun:0,invincible:0,downTime:0,combo:0,comboTime:0,buffer:null,weapon:this.roster[id].weapons?'none':'chair',attackStyle:'chair',weaponUses:0,weaponWear:{},ropeTime:0,runTime:0,runDirection:0,fallFace:'back',fallDuration:0,exhausted:false,divePower:1,diveHit:false,tauntCooldown:0,last:emptyInput()}));
    this.pole=isPoleMode(this.options.mode)?{x:this.round%2?LEFT+18:RIGHT-18,claimed:false,holder:null,looseX:null,progress:0,claimant:null,uses:0,broken:false}:null;
    if(this.pole)for(const f of this.fighters)f.weapon='none';
    if(this.options.mode==='practice')this.fighters[0].meter=100;
    this.phase='intro';this.phaseTime=0;this.remaining=99;this.grapple=null;this.pin=null;this.hitStop=0;this.shake=0;this.totalTime=0;this.aiTimer=0;this.aiInput=emptyInput();this.roundWinner=null;this.method='';
    this.emit('round',{round:this.round});
  }
  emit(type,detail={}){this.events.push({type,...detail});}
  drainEvents(){return this.events.splice(0);}
  step(inputs=[emptyInput(),emptyInput()],dt=STEP){
    if(this.phase==='done')return;
    dt=clamp(dt,0,.05);this.totalTime+=dt;this.shake=Math.max(0,this.shake-dt*35);
    this.phaseTime+=dt;
    if(this.phase==='intro'){
      if(this.phaseTime>=2.4){this.phase='fight';this.phaseTime=0;this.emit('fight');}
      this.remember(inputs);
      return;
    }
    if(this.phase==='roundEnd'){
      for(const f of this.fighters)f.t+=dt;
      if(this.options.mode==='practice'&&this.phaseTime>2){this.newRound();this.phase='fight';this.emit('fight');return;}
      if(this.phaseTime>2.4){
        if(this.wins.some(n=>n>=2)){this.phase='done';this.winner=this.wins[0]>=2?0:1;this.emit('matchEnd',{winner:this.winner,method:this.method});}
        else{this.round++;this.newRound();}
      }return;
    }
    if(this.options.mode==='practice'){inputs=[inputs[0],emptyInput()];this.fighters[0].meter=100;}
    else if(!isLocalMode(this.options.mode)&&this.options.mode!=='online') inputs=[inputs[0],this.hitStop>0?this.aiInput:this.cpu(dt)];
    // Capture short presses even during hit-stop; consume one command only when it becomes legal.
    this.fighters.forEach((f,i)=>this.bufferInput(f,inputs[i]||emptyInput(),this.hitStop>0?0:dt));
    if(this.hitStop>0){this.hitStop-=dt;this.remember(inputs);return;}
    if(this.options.mode!=='practice')this.remaining=Math.max(0,this.remaining-dt);
    if(this.remaining<=0&&!this.grapple&&!this.pin){this.timeLimit();return;}
    for(const f of this.fighters){f.t+=dt;f.invincible=Math.max(0,f.invincible-dt);f.guardDelay=Math.max(0,f.guardDelay-dt);f.comboTime=Math.max(0,f.comboTime-dt);f.tauntCooldown=Math.max(0,f.tauntCooldown-dt);f.reversalWindow=Math.max(0,f.reversalWindow-dt);f.reversalCooldown=Math.max(0,f.reversalCooldown-dt);if(!f.comboTime)f.combo=0;}
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
  timeLimit(){const [a,b]=this.fighters;this.endRound(Math.abs(a.hp-b.hp)<.001?null:a.hp>b.hp?0:1,'TIME LIMIT');}
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
      if(f.downTime<=0){f.state='rise';f.t=0;f.invincible=.6;}return;
    }
    if(f.state==='rise'){if(f.t<.5)return;f.state='idle';f.t=0;}
    if(f.state==='taunt'){if(f.t>=1){f.meter=clamp(f.meter+12,0,100);f.state='idle';f.t=0;this.emit('taunt',{index});}else return;}
    if(f.state==='equip'){if(f.t>=.24){f.state='idle';f.t=0;}else return;}
    if(f.stun>0){f.stun=Math.max(0,f.stun-dt);if(f.stun>0)return;f.state=f.z>0?'jump':'idle';f.t=0;f.exhausted=false;}
    if(f.move){
      const m=attackTiming(f.move,f.attackStyle),action=f.buffer?.action;
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
    if(canAct&&command==='taunt'&&f.z===0){f.buffer=null;if(f.tauntCooldown===0){f.state='taunt';f.t=0;f.tauntCooldown=4;this.emit('tauntStart',{index});return;}}
    if((canAct||enemy.state==='down')&&command==='grapple'&&f.z===0){
      if(enemy.state==='down'&&Math.abs(f.x-enemy.x)<125){
        if(canPin(f,enemy)){const kind=f.buffer.submission?'submission':'pin';f.buffer=null;this.startPin(index,kind);}return;
      }
      f.buffer=null;
      if(canCornerThrow(f,enemy)){this.startSuperplex(index);return;}
      if(enemy.z===0&&enemy.stun===0&&enemy.state!=='rise'&&enemy.invincible===0&&Math.abs(f.x-enemy.x)<106){this.startGrapple(index);return;}
      if(f.definition.animations?.climb&&(f.x<LEFT+65||f.x>RIGHT-65)&&Math.abs(f.x-enemy.x)>135){
        this.dropPoleWeapon(index);f.state='climb';f.t=0;f.ropeTime=0;f.move=null;f.vx=0;f.weapon='none';f.x=f.x<640?LEFT+18:RIGHT-18;f.facing=f.x<640?1:-1;this.emit('climb',{index});return;
      }
      f.attackStyle='light';f.move='light';f.state='light';f.t=0;f.hit=true;f.confirmed=false;f.chain=0;f.invincible=0;this.emit('whiff',{index});return;
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
    f.reboundTime=0;f.buffer=null;f.invincible=0;f.runTime=0;f.runDirection=0;f.chain=chained?f.chain+1:0;
    if(key==='special'){f.meter=0;this.emit('special',{index,name:f.definition.finisher||'LUNACY FINISHER',fighter:f.definition.id,kind:'strike'});}
    f.attackStyle=key==='light'?'light':['counter','aerial'].includes(key)?(f.definition.animations?.kick?'kick':'light'):f.weapon==='none'?(f.definition.animations?.kick?'kick':'light'):f.weapon;
    f.state=['counter','aerial'].includes(key)?'heavy':key;f.move=key==='heavy'&&['bat','guitar','trashcan','bottle'].includes(f.weapon)?f.weapon:key;
    f.t=chained&&key==='heavy'?.09:0;f.hit=false;f.confirmed=false;f.activeCue=false;
    this.emit('swing',{index,move:key,style:f.attackStyle,fighter:f.definition.id});
  }
  contact(index){
    const f=this.fighters[index],e=this.fighters[1-index];if(!f.move||f.hit)return;
    const m=f.move==='special'?finisherMove(f.definition,MOVES.special):attackTiming(f.move,f.attackStyle);if(f.t<m.startup||f.t>m.startup+m.active)return;
    if(e.state==='down'||e.state==='rise'||e.invincible>0)return;
    const dx=e.x-f.x;if(Math.abs(dx)>m.reach||dx*f.facing<0||Math.abs(f.z-e.z)>(f.move==='aerial'?155:105))return;
    return {index,move:f.move,facing:f.facing,blocked:e.state==='block'&&e.facing===-f.facing&&e.z===0,combo:e.stun>0,chain:f.chain,counter:Boolean(e.move&&e.t<attackTiming(e.move,e.attackStyle).startup),running:Boolean(f.runningAttack)};
  }
  resolveAttack({index,move,facing,blocked,combo,chain=0,counter=false,running=false}){
    const f=this.fighters[index],e=this.fighters[1-index],m=move==='special'?finisherMove(f.definition,MOVES.special):attackTiming(move,f.attackStyle);
    f.hit=true;
    if(blocked){
      // A fresh, well-timed guard turns a normal strike aside. Finishers,
      // grapples and dives retain their existing counters instead.
      if(move!=='special'&&e.reversalWindow>0&&e.guard>=20){
        e.reversalWindow=0;e.meter=clamp(e.meter+12,0,100);
        f.move=null;f.buffer=null;f.confirmed=false;f.chain=0;f.combo=0;f.runningAttack=false;
        f.state='hurt';f.t=0;f.stun=.32;f.vx=-facing*160;
        this.hitStop=Math.max(this.hitStop,.045);
        this.emit('reversal',{index:1-index,attacker:index,x:e.x,z:e.z});return;
      }
      const guardCost=move==='special'?55:move==='light'?14:(m.guard||30);e.guard-=guardCost;e.guardDelay=.7;
      if(e.guard>0){e.vx=facing*m.knock*5;e.meter=clamp(e.meter+4,0,100);f.meter=clamp(f.meter+2,0,100);f.combo=0;this.hitStop=.04;this.emit('block',{index:1-index,x:(f.x+e.x)/2,z:e.z});return;}
      e.guard=0;e.stun=.85;this.emit('guardBreak',{index:1-index});
    }
    const scale=chain===0?1:chain===1?.85:.70;
    const damage=m.damage*scale*f.definition.power/e.definition.toughness;
    e.hp=Math.max(0,e.hp-damage);e.meter=clamp(e.meter+damage*.8,0,100);f.meter=clamp(f.meter+m.meter,0,100);
    e.reboundTime=0;e.move=null;e.buffer=null;e.confirmed=false;e.chain=0;e.exhausted=blocked;e.stun=Math.max(e.stun,m.stun);e.state='hurt';e.t=0;f.confirmed=true;
    e.vx=facing*m.knock*14;f.combo=combo?f.combo+1:1;f.comboTime=1.2;
    this.hitStop=Math.max(this.hitStop,move==='special'?.10:counter?.065:move==='light'?.045:.075);this.shake=Math.max(this.shake,move==='light'?3:8);
    this.emit('hit',{index:1-index,attacker:index,move,x:e.x-facing*25,z:e.z,damage,combo:f.combo,counter,running,ender:chain===2,style:f.attackStyle,fighter:f.definition.id});
    this.secondWind(1-index);
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
  startGrapple(index){
    this.dropPoleWeapon(index);this.dropPoleWeapon(1-index);
    const a=this.fighters[index],b=this.fighters[1-index];
    a.weapon=a.definition.weapons?'none':a.weapon;b.weapon=b.definition.weapons?'none':b.weapon;
    this.grapple={attacker:index,time:0,released:false,startX:b.x,fromX:a.x,throwDir:a.x<LEFT+180?1:a.x>RIGHT-180?-1:a.facing};
    a.reboundTime=0;b.reboundTime=0;a.state='grapple';a.t=0;a.move=null;a.vx=0;a.buffer=null;a.invincible=0;a.runTime=0;a.runDirection=0;b.state='grabbed';b.move=null;b.vx=0;b.t=0;b.stun=0;this.emit('grapple',{index});
  }
  updateGrapple(dt){
    const g=this.grapple,a=this.fighters[g.attacker],b=this.fighters[1-g.attacker];g.time+=dt;
    if(g.kind==='superplex'){this.updateSuperplex(dt);return;}
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
        b.z=0;b.vz=0;b.hp=Math.max(0,b.hp-17*a.definition.power*(a.definition.technique||1)/b.definition.toughness);b.meter=clamp(b.meter+15,0,100);a.meter=clamp(a.meter+20,0,100);this.knockDown(b,'front',.16,b.hp<35?3.8:2.6);b.invincible=.1;a.state='idle';a.t=0;this.grapple=null;this.hitStop=.11;this.shake=11;this.emit('slam',{x:b.x,index:1-g.attacker});
        this.secondWind(1-g.attacker);
        if(b.hp<=0)this.endRound(g.attacker,'KNOCKOUT');
      }
    }
  }
  breakGrapple(){
    const g=this.grapple;
    if(g.kind==='superplex'){
      for(let i=0;i<2;i++){const f=this.fighters[i],origin=g.origins[i];Object.assign(f,{x:origin.x,z:origin.z,vz:0,vx:0,state:origin.z>0?'perch':'hurt',t:0,stun:origin.z>0?0:.24,buffer:null,move:null,invincible:.3});}this.grapple=null;this.emit('throwBreak');return;
    }
    for(let i=0;i<2;i++){const f=this.fighters[i];f.state='hurt';f.t=0;f.stun=.24;f.buffer=null;f.move=null;f.z=0;f.vz=0;f.vx=(i===g.attacker?-1:1)*this.fighters[g.attacker].facing*260;f.invincible=.3;}
    this.grapple=null;this.emit('throwBreak');
  }
  knockDown(f,face='back',duration=.38,downTime=2.5){
    this.dropPoleWeapon(this.fighters.indexOf(f));
    f.reboundTime=0;f.state='down';f.t=0;f.fallFace=face;f.fallDuration=duration;f.downTime=downTime;f.stun=0;f.z=0;f.vz=0;f.move=null;f.buffer=null;f.confirmed=false;f.chain=0;f.runTime=0;f.runDirection=0;
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
    if(!f.diveHit&&close&&vertical&&enemy.invincible===0&&!['rise','pinned'].includes(enemy.state)){
      f.diveHit=true;const blocked=enemy.state==='block';
      if(blocked){
        enemy.guard=Math.max(0,enemy.guard-35);enemy.guardDelay=.7;
        if(enemy.guard>0){this.emit('block',{index:1-index,x:enemy.x,z:0});this.knockDown(f,'front',.18,1.1);return true;}
        this.emit('guardBreak',{index:1-index});
      }
      const damage=23*f.divePower*f.definition.power/enemy.definition.toughness;enemy.hp=Math.max(0,enemy.hp-damage);enemy.meter=clamp(enemy.meter+damage*.8,0,100);f.meter=clamp(f.meter+16,0,100);
      this.knockDown(enemy,'back',.20,3.1);enemy.vx=f.facing*350;this.shake=10;this.hitStop=.09;this.emit('slam',{index:1-index,x:enemy.x});
      this.secondWind(1-index);
    }
    if(grounded){
      if(f.diveHit){f.state='rise';f.t=0;f.invincible=.25;}
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
  startSuperplex(index){
    const a=this.fighters[index],b=this.fighters[1-index];
    if(!canCornerThrow(a,b))return false;
    const corner=onTopRope(a)?a.x:b.x,dir=corner<640?1:-1;
    const origins=this.fighters.map(f=>({x:f.x,z:f.z}));
    this.dropPoleWeapon(index);this.dropPoleWeapon(1-index);
    this.grapple={kind:'superplex',attacker:index,time:0,released:false,corner,throwDir:dir,origins};
    for(const f of [a,b]){f.move=null;f.buffer=null;f.vx=0;f.vz=0;f.stun=0;f.reboundTime=0;f.runTime=0;f.t=0;f.invincible=0;f.weapon='none';}
    a.facing=dir;b.facing=-dir;a.state='grapple';b.state='grabbed';this.emit('grapple',{index,kind:'superplex'});return true;
  }
  updateSuperplex(dt){
    const g=this.grapple,a=this.fighters[g.attacker],b=this.fighters[1-g.attacker],t=g.time,dir=g.throwDir;
    if(t<=throwBreakWindow(g)&&b.buffer?.action==='grapple'){this.breakGrapple();return;}
    const a0=g.origins[g.attacker],b0=g.origins[1-g.attacker];
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
      this.knockDown(b,'back',.18,3.2);b.invincible=.1;a.z=0;a.vz=0;a.state='rise';a.t=0;a.invincible=.2;
      this.grapple=null;this.hitStop=.12;this.shake=10;this.emit('slam',{index:1-g.attacker,x:b.x,damage,superplex:true});this.secondWind(1-g.attacker);
      if(b.hp<=0)this.endRound(g.attacker,'KNOCKOUT');
    }
  }
  startPin(index,kind='pin'){
    this.dropPoleWeapon(index);this.dropPoleWeapon(1-index);
    const a=this.fighters[index],b=this.fighters[1-index];a.state='pin';a.t=0;a.buffer=null;a.vx=0;a.invincible=0;a.runTime=0;a.runDirection=0;b.vx=0;b.buffer=null;b.state='pinned';b.fallFace='back';b.fallDuration=0;b.t=0;this.pin={kind,attacker:index,time:0,count:0,escape:0,lastButton:null,startX:a.x,targetX:clamp(b.x-a.facing*23,LEFT,RIGHT)};this.emit('pin',{index,kind});
  }
  updatePin(inputs,dt){
    const p=this.pin,a=this.fighters[p.attacker],b=this.fighters[1-p.attacker],input=inputs[1-p.attacker]||emptyInput();p.time+=dt;
    a.x=p.startX+(p.targetX-p.startX)*smooth(p.time/.2);
    if(p.time>=.35&&nearRopes(b)){this.releasePin('ropeBreak');return;}
    if(p.time>=.3&&tap(inputs[p.attacker]||emptyInput(),a.last,'grapple')){this.releasePin('pinRelease');return;}
    const need=escapeTarget(b.hp);
    const pressed=['light','heavy'].filter(key=>tap(input,b.last,key));
    if(pressed.length===1&&pressed[0]!==p.lastButton){p.escape++;p.lastButton=pressed[0];}
    if(!['local','pole-local','practice','online'].includes(this.options.mode)&&p.attacker===0){
      const level=this.options.difficulty==='hard'?1.2:this.options.difficulty==='easy'?.65:1;
      p.escape+=dt*(b.hp>55?12:b.hp>30?7:3.2)*level;
    }
    // Healthy opponents naturally resist an early pin, even without input.
    if(b.hp>60)p.escape+=dt*6;
    const count=p.kind==='submission'?0:Math.min(3,Math.floor(p.time/.9));if(count>p.count){p.count=count;this.emit('count',{count});}
    if(p.escape>=need){this.releasePin(p.kind==='submission'?'holdBreak':'kickout');}
    else if(p.kind==='submission'?p.time>=3.6:p.count>=3){this.pin=null;b.state='down';this.endRound(p.attacker,p.kind==='submission'?'TAP OUT':'PINFALL');}
  }
  releasePin(type){
    const p=this.pin,a=this.fighters[p.attacker],b=this.fighters[1-p.attacker];
    b.state='rise';b.t=0;b.buffer=null;b.invincible=.8;a.state='idle';a.t=0;a.buffer=null;a.vx=-a.facing*900;
    this.pin=null;this.emit(type);
  }
  endRound(winner,method){
    if(this.phase!=='fight')return;
    this.phase='roundEnd';this.phaseTime=0;this.roundWinner=winner;this.method=method;this.grapple=null;this.pin=null;
    for(let i=0;i<2;i++){const f=this.fighters[i];f.z=0;f.vz=0;f.vx=0;f.move=null;f.buffer=null;f.stun=0;if(f.state!=='down')f.t=0;if(i!==winner)f.state=f.hp<=0||f.state==='down'||method==='PINFALL'?'down':'defeat';}
    if(winner!==null){if(this.options.mode!=='practice')this.wins[winner]++;this.fighters[winner].state='victory';this.fighters[winner].t=0;}
    this.emit('roundEnd',{winner,method});
  }
  cpu(dt){
    const me=this.fighters[1],enemy=this.fighters[0],diff=this.options.difficulty;
    const profile=fighterProfile(me.definition);
    const rate=diff==='hard'?.13:diff==='easy'?.34:.22;
    this.aiTimer-=dt;
    if(this.aiTimer>0)return this.aiInput;
    this.aiTimer=rate+this.random()*.11;
    const v=emptyInput(),distance=Math.abs(me.x-enemy.x),toward=me.x<enemy.x?'right':'left',away=me.x<enemy.x?'left':'right';
    if(this.pin){this.aiInput={...v};delete this.aiInput.pressed;return v;}
    if(this.grapple){if(this.grapple.attacker===0&&this.grapple.time<throwBreakWindow(this.grapple)&&this.random()<(diff==='hard'?.6:diff==='easy'?.05:.25))v.grapple=true;this.aiInput={...v};delete this.aiInput.pressed;return v;}
    if(me.state==='down'){v[this.random()<.5?'light':'heavy']=true;this.aiInput={...v};delete this.aiInput.pressed;return v;}
    if(distance>92)v[toward]=true;
    if(this.pole&&!this.pole.broken){
      if(!this.pole.claimed){
        const atPole=Math.abs(me.x-this.pole.x)<65;
        if(me.state==='perch'&&atPole){v.grapple=true;this.aiInput={...v};delete this.aiInput.pressed;return v;}
        if(distance>180){v.left=false;v.right=false;if(!atPole)v[me.x<this.pole.x?'right':'left']=true;else if(me.z===0){v.grapple=true;v.pressed={grapple:true};}this.aiInput={...v};delete this.aiInput.pressed;return v;}
      }else if(this.pole.looseX!==null&&me.z===0){const gap=Math.abs(me.x-this.pole.looseX);if(gap<80){v.weapon=true;v.pressed={weapon:true};}else if(distance>180){v.left=false;v.right=false;v[me.x<this.pole.looseX?'right':'left']=true;}if(gap<80||distance>180){this.aiInput={...v};delete this.aiInput.pressed;return v;}}
    }
    if(canCornerThrow(me,enemy)){v.grapple=true;v.pressed={grapple:true};this.aiInput={...v};delete this.aiInput.pressed;return v;}
    if(me.state==='perch'){if(distance>300&&me.tauntCooldown===0&&this.random()<.2)v.taunt=true;else v.jump=true;v.pressed={[v.taunt?'taunt':'jump']:true};this.aiInput={...v};delete this.aiInput.pressed;return v;}
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
    this.aiInput={...v};
    v.pressed=Object.fromEntries(['light','heavy','special','weapon','taunt','jump','grapple'].filter(k=>v[k]).map(k=>[k,true]));
    return v;
  }
}
