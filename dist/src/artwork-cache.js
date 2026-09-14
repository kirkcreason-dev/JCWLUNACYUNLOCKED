// Call after the new match is ready; keep the previous match drawable while loading.
export function retainMatchArtwork(atlases,arenas,promises,fighterIds,arena){
  const keep=new Set(fighterIds);
  for(const key of Object.keys(atlases))if(!keep.has(Number(key))){delete atlases[key];promises.delete(Number(key));}
  for(const key of Object.keys(arenas))if(Number(key)!==arena){delete arenas[key];promises.delete(`arena-${key}`);}
}
