// Call after the new match is ready; keep the previous match drawable while loading.
// Clearing an evicted HTMLImageElement's source releases its decoded backing store
// sooner on mobile Safari/Chromium instead of waiting for an unpredictable GC pass.
function releaseImage(image){
  if(!image||typeof image.src!=='string')return;
  try{image.onload=null;image.onerror=null;image.src='';}catch{}
}
export function retainMatchArtwork(atlases,arenas,promises,fighterIds,arena){
  const keep=new Set(fighterIds);
  for(const key of Object.keys(atlases))if(!keep.has(Number(key))){releaseImage(atlases[key]);delete atlases[key];promises.delete(Number(key));}
  for(const key of Object.keys(arenas))if(Number(key)!==arena){releaseImage(arenas[key]);delete arenas[key];promises.delete(`arena-${key}`);}
}
