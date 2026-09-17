import {MOVES} from './engine.js?v=0.16.0';

const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};

// Explicit phases keep contact art aligned with the simulation's active window,
// even when one wrestler has four chair frames and another has five.
export function attackPose(definition,move,time,style){
  if(move==='special'&&definition.animations.special?.length===6){
    const timing=MOVES.special,frames=definition.animations.special;
    // The supplied Bass Blast charges before contact; sound waves appear only
    // in the active window. Recovery returns to the intact standing pose.
    const activeEnd=timing.startup+timing.active;
    const index=time<timing.startup?Math.min(2,Math.floor(clamp(time/timing.startup)*3))
      :time<activeEnd?3+Math.min(1,Math.floor((time-timing.startup)/timing.active*2))
      :time<activeEnd+timing.recovery*.35?5:0;
    return {frame:frames[index],offsetX:0,propGuitar:false};
  }
  const timing=MOVES[move]||MOVES.heavy,animations=definition.animations,frames=animations[style]||animations[move==='light'?'light':'heavy'];
  const light=style==='light'||(!style&&move==='light');
  // A kick has a chamber and one extended contact frame. Weapon art has an
  // explicit wind-up/contact/recovery order, independent of the move's speed.
  if(style==='kick'){
    const index=time<timing.startup?Math.min(1,Math.floor(time/timing.startup*2)):time<timing.startup+timing.active?2:0;
    return {frame:frames[Math.min(index,frames.length-1)],offsetX:0};
  }
  const activeEnd=timing.startup+timing.active;
  let frame,offsetX=0;
  if(light){
    if(time<timing.startup){frame=frames[0];offsetX=8*smooth(time/timing.startup);}
    else if(time<activeEnd){frame=frames[1];offsetX=16;}
    else{
      const recovery=clamp((time-activeEnd)/timing.recovery);
      frame=frames[recovery<.4?2:3];offsetX=16*(1-smooth(recovery));
    }
  }else{
    const index=time<timing.startup?Math.min(1,Math.floor(clamp(time/timing.startup)*2))
      :time<activeEnd?(style==='trashcan'?Math.min(3,frames.length-1):2)
      :Math.min(frames.length-1,3+Math.floor(clamp((time-activeEnd)/timing.recovery)*(frames.length-3)));
    frame=frames[Math.min(index,frames.length-1)];
  }
  // Two source sheets clip the extended guitar pose at the panel boundary.
  // Their intact throwing pose holds a separate guitar cutout at contact.
  const propGuitar=style==='guitar'&&Boolean(animations.propGuitar)&&time>=timing.startup&&time<activeEnd;
  return {frame,offsetX,propGuitar};
}
