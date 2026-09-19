const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const rect=(x,y,width,height)=>({x,y,width,height});

// CSS pixels from the visible viewport, excluding the notch and home indicator.
// Keep controls outside the ring; every direction remains at least 44 px square.
export function phoneLayout({width,height,safe={},online=false}){
  const left=(safe.left||0)+8,right=width-(safe.right||0)-8;
  const top=safe.top||0,bottom=height-(safe.bottom||0)-8;
  const innerWidth=right-left,portrait=height>=width,short=!portrait&&bottom-top<270;
  const header=rect(left,top,innerWidth,44),contentTop=top+52+(online&&portrait?24:0);
  const network=portrait?rect(left,top+46,innerWidth,20):rect(left+(short?176:0),top+12,innerWidth-188-(short?176:0),20);
  let stage,dpad,actions,weapon,taunt,hint;
  if(portrait){
    const pad=clamp((innerWidth-16)/2,132,180);
    const controlsTop=bottom-(pad+88),stageRoom=controlsTop-contentTop-8;
    const stageWidth=Math.min(innerWidth,Math.max(1,stageRoom)*4/3),stageHeight=Math.min(Math.max(1,stageRoom),stageWidth*.75);
    stage=rect((left+right-stageWidth)/2,contentTop+(stageRoom-stageHeight)/2,stageWidth,stageHeight);
    hint=rect(left,controlsTop,innerWidth,32);
    dpad=rect(left,controlsTop+38,pad,pad);actions=rect(right-pad,dpad.y,pad,pad);
    weapon=rect(left,bottom-44,pad,44);taunt=rect(right-pad,bottom-44,pad,44);
  }else{
    const pad=clamp((bottom-top-152)*.6,132,144),middleWidth=innerWidth-2*(pad+8);
    const hintTop=bottom-32,stageRoom=hintTop-contentTop-8;
    const stageWidth=Math.min(middleWidth,Math.max(1,stageRoom)*16/9),stageHeight=stageWidth*9/16;
    stage=rect((left+right-stageWidth)/2,contentTop+(stageRoom-stageHeight)/2,stageWidth,stageHeight);
    const padTop=contentTop+Math.max(0,(bottom-(short?0:50)-contentTop-pad)/2);
    dpad=rect(left,padTop,pad,pad);actions=rect(right-pad,padTop,pad,pad);
    weapon=short?rect(left,top,80,44):rect(left,bottom-44,pad,44);taunt=short?rect(left+88,top,80,44):rect(right-pad,bottom-44,pad,44);
    hint=rect(left+pad+8,hintTop,middleWidth,32);
  }
  return {mode:portrait?'portrait':'landscape',short,width,height,header,network,stage,dpad,actions,weapon,taunt,hint};
}

export function canvasSize({cssWidth=1280,portrait=false,touch=false,dpr=1,quality='auto',aspect}={}){
  const ratio=quality==='battery'?1.5:2;
  const width=touch?clamp(Math.ceil(cssWidth*Math.min(dpr,ratio)/32)*32,640,1280):(quality==='battery'?960:1280);
  return {width,height:Math.round(width/(aspect||(portrait?4/3:16/9)))};
}

export function resizeCanvas(canvas,size){
  // Assigning even the same size clears the canvas and resets its 2D context.
  let changed=false;
  for(const key of ['width','height'])if(canvas[key]!==size[key]){canvas[key]=size[key];changed=true;}
  return changed;
}

export function phoneCamera(fighters,{portrait=false,floor=593,height=portrait?960:720,previous=null,dt=1/60}={}){
  const feet=height-70;
  // Reserve room for the full jump/throw envelope, even while standing.
  // Normal jumps therefore do not shrink a wrestler or grow them on landing.
  const top=Math.max(portrait?520:420,...fighters.map(f=>(f.z||0)+260));
  // Keep the full playable ring framed at one scale in either orientation.
  // Moving to a corner must not shrink the whole scene. Tall aerial moves may
  // still widen the view slightly when needed to keep heads below the HUD.
  const target=Math.min(1280/(1080-200+370),(feet-(portrait?224:180))/top);
  // Widen immediately when safety requires it; ease back in over half a second.
  const zoom=previous?Math.min(target,previous.zoom+(target-previous.zoom)*(1-Math.exp(-4*Math.min(dt,.1)))):target;
  const center=640;
  return {x:640-center*zoom,y:feet-floor*zoom,zoom};
}
