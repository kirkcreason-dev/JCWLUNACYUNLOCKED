// Small, persistent lessons. No input blocking and no timers outside the match.
export class Coach {
  constructor(storage=null){this.storage=storage;this.learned=new Set();this.active=null;this.until=0;
    try{const keys=JSON.parse(storage?.getItem('lunacy-lessons-v1')||'[]');if(Array.isArray(keys))for(const k of keys)if(typeof k==='string')this.learned.add(k);}catch{}
  }
  reset(){this.learned.clear();this.active=null;try{this.storage?.removeItem('lunacy-lessons-v1');}catch{}}
  start(){this.active=null;this.until=0;}
  learn(key){if(this.learned.has(key))return;this.learned.add(key);try{this.storage?.setItem('lunacy-lessons-v1',JSON.stringify([...this.learned]));}catch{}}
  receive(events,index=0){for(const e of events){if(e.type==='hit'&&e.attacker===index){this.learn('strike');if(e.combo>1)this.learn('combo');}if(e.type==='reversal'&&e.index===index)this.learn('reversal');if(e.type==='special'&&e.index===index)this.learn('finisher');if(e.type==='pin'&&e.index===index)this.learn('pin');if(['kickout','holdBreak'].includes(e.type))this.learn('escape');}}
  text(match,scheme='keyboard',enabled=true){
    if(!enabled||!match||match.options.mode==='online'||match.options.mode==='local'||match.phase!=='fight')return '';
    const [me,other]=match.fighters,distance=Math.abs(me.x-other.x),pad=scheme==='gamepad',touch=scheme==='touch';
    const hit=pad?'X':touch?'HIT':'Z',heavy=pad?'Y':touch?'HEAVY':'X',grab=pad?'B':touch?'PIN':'C',finish=pad?'RB':touch?'FINISH':'V',block=pad?'LB':'Down';
    if(match.pin?.attacker===1)return touch?'Tap KICK OUT repeatedly':`Alternate ${hit} and ${heavy} to escape`;
    if(match.grapple?.attacker===0||match.pin?.attacker===0)return '';
    if(me.state==='down')return touch?'Tap GET UP to recover sooner':`Tap ${hit} or ${heavy} to get up sooner`;
    if(me.meter>=100&&!this.learned.has('finisher'))return `Move close + ${finish}: ${me.definition.finisher}`;
    if(other.state==='down'&&distance<125&&!this.learned.has('pin'))return `Tap ${grab} to pin · ${block} + ${grab} to submit`;
    let key='',text='';
    if(me.move==='light'&&me.confirmed&&!this.learned.has('combo')){key='combo';text=`Hit confirmed! Tap ${hit}, then ${heavy} to chain`;}
    else if(distance>160&&!this.learned.has('strike')){key='approach';text=touch?'Slide toward your opponent · HIT at close range':pad?'Move closer with the stick · X strikes':'← → move closer · Z strikes';}
    else if(!this.learned.has('strike')){key='strike';text=`Tap ${hit} to strike · ${heavy} for a heavy attack`;}
    else if(!this.learned.has('reversal')){key='reversal';text=`Press ${block} just before impact to REVERSE`;}
    if(this.active&&match.totalTime<this.until)return this.active.text;
    if(key){this.active={key,text};this.until=match.totalTime+3;return text;}this.active=null;return '';
  }
}
