import {emptyInput,STEP,MOVES} from './engine.js?v=0.21.1';
const REPEAT_HIT_INTERVAL=MOVES.light.startup+MOVES.light.active+MOVES.light.recovery+.03;
export const KEYMAPS=[
  {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'jump',ArrowDown:'block',KeyZ:'light',KeyX:'heavy',KeyC:'grapple',KeyV:'special',KeyJ:'light',KeyK:'heavy',KeyL:'grapple',KeyU:'special',KeyQ:'weapon',KeyE:'taunt',ShiftLeft:'run'},
  {KeyA:'left',KeyD:'right',KeyW:'jump',KeyS:'block',KeyF:'light',KeyG:'heavy',KeyH:'grapple',KeyR:'special',Digit1:'light',Digit2:'heavy',Digit3:'grapple',Digit0:'special',Numpad1:'light',Numpad2:'heavy',Numpad3:'grapple',Numpad0:'special',KeyT:'weapon',KeyY:'taunt',ShiftRight:'run'}
];
const soloDirections={KeyA:'left',KeyD:'right',KeyW:'jump',KeyS:'block'};
const actions=new Set(['jump','light','heavy','grapple','special','weapon','taunt','block']);
const pauseKeys=new Set(['Escape','KeyP']);
// Normalized D-pad position. The central dead zone lets a thumb rest without walking.
export function dpadDirections(x,y){
  if(x<0||x>1||y<0||y>1)return [];
  const dx=x-.5,dy=y-.5;if(Math.hypot(dx,dy)<.16)return [];
  const keys=[];
  if(Math.abs(dx)>.17)keys.push(dx<0?'left':'right');
  if(Math.abs(dy)>.17)keys.push(dy<0?'jump':'block');
  return keys;
}

export class InputState {
  constructor(onPause=()=>{}){
    this.keys=new Set();this.touch=emptyInput();this.pending=[new Set(),new Set()];
    this.active=false;this.onPause=onPause;this.pointers=new Map();this.scheme='keyboard';
    this.padSlots=[null,null];this.padPrevious=[{},{}];this.padPause=[false,false];
    this.local=false;this.repeatHit=true;this.repeatClock=0;this.escapeLast='heavy';
  }
  keymaps(){return this.local?KEYMAPS:[{...KEYMAPS[0],...soloDirections},Object.fromEntries(Object.entries(KEYMAPS[1]).filter(([key])=>!soloDirections[key]))];}
  setMode(mode){this.local=mode==='local'||mode==='pole-local';this.clear();}
  pressKey(code){
    const maps=this.keymaps();
    if(!this.keys.has(code))for(let i=0;i<2;i++){const action=maps[i][code];if(actions.has(action))this.pending[i].add(action);}
    this.keys.add(code);if(maps[0][code])this.scheme='keyboard';
  }
  releaseKey(code){this.keys.delete(code);}
  pressTouch(pointer,keys){
    if(keys==='escape'){
      if(this.pointers.has(pointer)||[...this.pointers.values()].some(p=>p.escape))return;
      const key=this.escapeLast==='light'?'heavy':'light';this.escapeLast=key;
      this.pending[0].add(key);this.pointers.set(pointer,{keys:[],escape:true});
    }else{
      keys=Array.isArray(keys)?keys:[keys];const before=this.pointers.get(pointer)?.keys||[];
      for(const key of keys)if(actions.has(key)&&!before.includes(key))this.pending[0].add(key);
      if(keys.includes('light')&&!before.includes('light'))this.repeatClock=0;
      this.pointers.set(pointer,{keys});
    }
    this.scheme='touch';this.syncTouch();
  }
  releaseTouch(pointer){this.pointers.delete(pointer);this.syncTouch();}
  syncTouch(){this.touch=emptyInput();for(const p of this.pointers.values())for(const key of p.keys)this.touch[key]=true;}
  clearTouch(){this.pointers.clear();this.touch=emptyInput();this.pending[0].clear();this.repeatClock=0;this.escapeLast='heavy';}
  clear(){this.keys.clear();this.clearTouch();this.pending.forEach(set=>set.clear());}
  read(pads=[],dt=STEP){
    if(this.repeatHit&&this.touch.light){this.repeatClock+=dt;if(this.repeatClock>=REPEAT_HIT_INTERVAL){this.pending[0].add('light');this.repeatClock=0;}}else this.repeatClock=0;
    const result=this.keymaps().map((map,i)=>{const input=emptyInput();for(const code of this.keys)if(map[code])input[map[code]]=true;input.pressed=Object.fromEntries([...this.pending[i]].map(key=>[key,true]));this.pending[i].clear();return input;});
    for(const k in this.touch)result[0][k] ||= this.touch[k];
    const connected=Array.from(pads).filter(p=>p&&p.connected!==false);
    this.padSlots.forEach((id,i)=>{if(id!==null&&!connected.some(p=>p.index===id)){this.padSlots[i]=null;this.padPrevious[i]={};this.padPause[i]=false;if(this.active)this.onPause(true);}});
    for(const pad of connected)if(!this.padSlots.includes(pad.index)){const vacant=this.padSlots.indexOf(null);if(vacant>=0)this.padSlots[vacant]=pad.index;}
    this.padSlots.forEach((id,i)=>{
      const pad=connected.find(p=>p.index===id);if(!pad)return;
      const b=n=>Boolean(pad.buttons[n]?.pressed),value={left:pad.axes[0]<-.35||b(14),right:pad.axes[0]>.35||b(15),jump:b(0)||b(12),light:b(2),heavy:b(3),grapple:b(1),block:b(4)||b(13),special:b(5),weapon:b(6),taunt:b(7),run:b(10)};
      for(const key of Object.keys(value)){result[i][key] ||= value[key];if(actions.has(key)&&value[key]&&!this.padPrevious[i][key])result[i].pressed[key]=true;}
      this.padPrevious[i]=value;if(i===0&&Object.values(value).some(Boolean))this.scheme='gamepad';
      const start=b(9);if(start&&!this.padPause[i]&&this.active)this.onPause();this.padPause[i]=start;
    });
    return result;
  }
}
export class Input extends InputState {
  constructor(onPause){
    super(onPause);
    this.touchButtons=Array.from(document.querySelectorAll('[data-key]'));
    addEventListener('keydown',e=>{
      if(e.target instanceof HTMLSelectElement||e.target instanceof HTMLInputElement||e.target?.isContentEditable)return;
      if(this.active&&(this.keymaps().some(m=>m[e.code])||pauseKeys.has(e.code)||e.code==='Space'))e.preventDefault();
      if(this.active&&!e.repeat&&pauseKeys.has(e.code)){onPause();return;}
      this.pressKey(e.code);
    });
    addEventListener('keyup',e=>this.releaseKey(e.code));
    addEventListener('blur',()=>{this.clear();if(this.active)this.onPause(true);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clear();if(this.active)this.onPause(true);}});
    const dpad=document.getElementById('dpad');
    const move=e=>{const rect=this.dpadRect;this.pressTouch(e.pointerId,dpadDirections((e.clientX-rect.left)/rect.width,(e.clientY-rect.top)/rect.height));this.paintTouch();};
    dpad.addEventListener('pointerdown',e=>{if(e.button!==0||!this.active)return;e.preventDefault();this.dpadRect=dpad.getBoundingClientRect();dpad.setPointerCapture(e.pointerId);move(e);});
    dpad.addEventListener('pointermove',e=>{if(!dpad.hasPointerCapture(e.pointerId)||!this.dpadRect)return;e.preventDefault();move(e);});
    const release=e=>{this.releaseTouch(e.pointerId);this.paintTouch();};
    for(const event of ['pointerup','pointercancel','lostpointercapture'])dpad.addEventListener(event,release);
    for(const button of document.querySelectorAll('.action-pad [data-key], .utility-pad [data-key]')){
      button.addEventListener('pointerdown',e=>{if(e.button!==0||!this.active)return;e.preventDefault();button.setPointerCapture(e.pointerId);this.pressTouch(e.pointerId,button.dataset.key);this.paintTouch();});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
    }
    document.getElementById('touch-controls').addEventListener('contextmenu',e=>e.preventDefault());
  }
  paintTouch(){const escape=[...this.pointers.values()].some(p=>p.escape);for(const button of this.touchButtons||[]){const pressed=button.dataset.key==='escape'?escape:Boolean(this.touch[button.dataset.key]);if(button.classList.contains('pressed')!==pressed)button.classList.toggle('pressed',pressed);}}
  clearTouch(){super.clearTouch();this.dpadRect=null;this.paintTouch();}
  clear(){super.clear();this.paintTouch();}
  read(){return super.read(navigator.getGamepads?.()||[]);}
}
