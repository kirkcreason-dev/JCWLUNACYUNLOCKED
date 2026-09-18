export function fullscreenElement(doc){return doc.fullscreenElement||doc.webkitFullscreenElement||null;}
export async function toggleFullscreen(element,doc){
  try{
    if(fullscreenElement(doc)){const exit=doc.exitFullscreen||doc.webkitExitFullscreen;if(exit)await exit.call(doc);return 'exited';}
    const enter=element.requestFullscreen||element.webkitRequestFullscreen;
    if(enter){await enter.call(element);return 'entered';}
  }catch{}
  return 'fitted';
}
