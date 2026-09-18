// Optional hardware feedback must never interrupt a match.
export class Haptics {
  constructor(device=globalThis.navigator,clock=()=>performance.now()){this.device=device;this.clock=clock;this.last=-Infinity;this.enabled=true;this.activated=false;}
  get supported(){return typeof this.device?.vibrate==='function';}
  activate(){this.activated=true;}
  pulse(duration=30,{test=false}={}){
    if(!this.enabled||!this.supported||!this.activated)return false;
    const now=this.clock();if(!test&&now-this.last<85)return false;
    try{const accepted=this.device.vibrate(Math.max(10,Math.min(test?120:55,duration)));if(accepted===false)return false;this.last=now;return true;}catch{return false;}
  }
  stop(){try{if(this.supported)this.device.vibrate(0);}catch{}}
}
