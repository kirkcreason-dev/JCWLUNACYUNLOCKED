// Only presentation is paced. Match.step and network inputs keep their 60 Hz clock.
export class FramePacer {
  constructor(){this.dirty=true;this.last=null;this.next=0;}
  invalidate(){this.dirty=true;}
  frame(now,{animated=true,hidden=false,fps=60}={}){
    if(hidden){this.last=now;this.dirty=true;return null;}
    if(!animated&&!this.dirty){this.last=now;return null;}
    if(animated&&!this.dirty&&now+.5<this.next)return null;
    const dt=animated&&this.last!==null?Math.min(.1,Math.max(0,(now-this.last)/1000)):0;
    const interval=1000/fps;
    this.next=this.dirty||now-this.next>interval*2?now+interval:this.next+interval;
    this.last=now;this.dirty=false;
    return dt;
  }
}
