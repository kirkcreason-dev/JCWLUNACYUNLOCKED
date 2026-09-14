// Decorative artwork never prevents the roster, controls, or matches from loading.
// Each successful image can appear immediately; text/procedural effects are fallbacks.
export async function loadOptionalArtwork({banners,combatFx,loadImage,loadManifest,onChange=()=>{}}){
  return Promise.allSettled([
    ...['pinfall','kickout','tapout','lunacy','win'].map(async key=>{
      banners[key]=await loadImage(`./assets/banners/${key}.png`);onChange();
    }),
    (async()=>{
      const manifest=await loadManifest();
      return Promise.allSettled(Object.entries(manifest).map(async([key,meta])=>{
        combatFx[key]={...meta,image:await loadImage(`./assets/fx/${key}.png`)};onChange();
      }));
    })()
  ]);
}
