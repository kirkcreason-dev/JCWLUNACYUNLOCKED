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

// Action camera shared by desktop, portrait and landscape layouts.
// A fixed, slightly closer zoom with the view panning to follow the pair.
export const CAMERA_ZOOM=1.2;        // "a bit" closer than the full-ring view
export const CAMERA_MARGIN=90;       // ring space kept beside the outer wrestler
const BODY=230;                      // sprite envelope above the feet
const JUMP=151;                      // normal jump apex (vz 615, g 1250)
export function arenaCamera(fighters,{portrait=false,compact=false,floor=593,height=portrait?960:720,previous=null,dt=1/60}={}){
  const phone=portrait||compact;
  // Screen row where the mat sits, and the bottom of the top HUD rail.
  const feet=phone?height-70:640,hud=portrait?212:compact?168:150;
  // Reserve room for a normal jump even while standing, so ordinary jumps
  // never change the zoom. Taller throws widen the view only as far as
  // needed to keep heads below the HUD, then ease back in over half a second.
  const top=Math.max(JUMP,...fighters.map(f=>f.z||0))+BODY;
  const target=Math.max(1,Math.min(CAMERA_ZOOM,(feet-hud)/top));  // never past the arena edges
  const zoom=previous?Math.min(target,previous.zoom+(target-previous.zoom)*(1-Math.exp(-4*Math.min(dt,.1)))):target;
  // Follow the midpoint between the wrestlers, never past the arena edges.
  const view=1280/zoom,xs=fighters.map(f=>f.x),lo=Math.min(...xs),hi=Math.max(...xs);
  const edge=1280-view;let left=clamp((lo+hi)/2-view/2,0,edge);
  if(previous){const was=-previous.x/previous.zoom;left=was+(left-was)*(1-Math.exp(-6*Math.min(dt,.1)));}
  // Easing may lag a dash, but never pushes a wrestler off the screen.
  const min=hi+CAMERA_MARGIN-view,max=lo-CAMERA_MARGIN;
  if(min<=max)left=clamp(left,min,max);
  left=clamp(left,0,edge);
  return {x:-left*zoom,y:feet-floor*zoom,zoom};
}
export const phoneCamera=arenaCamera;
