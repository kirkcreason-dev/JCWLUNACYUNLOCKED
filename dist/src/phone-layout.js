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
    const stageWidth=Math.min(innerWidth,Math.max(1,stageRoom)*4/3),stageHeight=stageWidth*3/4;
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

export function canvasSize({cssWidth=1280,portrait=false,touch=false,dpr=1,quality='auto'}={}){
  const ratio=quality==='battery'?1.5:2;
  const width=touch?clamp(Math.ceil(cssWidth*Math.min(dpr,ratio)/32)*32,640,1280):1280;
  return {width,height:width*(portrait?3/4:9/16)};
}

export function resizeCanvas(canvas,size){
  // Assigning even the same size clears the canvas and resets its 2D context.
  let changed=false;
  for(const key of ['width','height'])if(canvas[key]!==size[key]){canvas[key]=size[key];changed=true;}
  return changed;
}

export function phoneCamera(fighters,{portrait=false,floor=593}={}){
  const [a,b]=fighters,feet=portrait?870:650;
  // Leave room below the HUD for jump, dive and lifted poses before zooming in.
  const top=Math.max(...fighters.map(f=>(f.z||0)+260));
  const zoom=Math.min(portrait?2:1.4,1280/(Math.abs(a.x-b.x)+370),(feet-224)/top);
  const width=1280/zoom,center=zoom<=1?640:clamp((a.x+b.x)/2,width/2,1280-width/2);
  return {x:640-center*zoom,y:feet-floor*zoom,zoom};
}
