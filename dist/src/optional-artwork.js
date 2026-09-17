// Decorative artwork never prevents the roster, controls, or matches from loading.
// Each successful image can appear immediately; text/procedural effects are fallbacks.
// The browser build requests only the art it needs. Keeping the old all-art default
// makes this helper useful to the native review tools and preserves its simple API.
const DEFAULT_BANNERS=['unlocked','pinfall','kickout','tapout','lunacy','win'];

export async function loadOptionalArtwork({
  banners,combatFx,loadImage,loadManifest,onChange=()=>{},
  bannerKeys=DEFAULT_BANNERS,effectKeys=null,state={},now=Date.now
}){
  const pending=state.pending||(state.pending=new Map());
  const retryAfter=state.retryAfter||(state.retryAfter=new Map());
  const image=(target,kind,key,url,meta)=>{
    if(target[key])return Promise.resolve(target[key]);
    const id=`${kind}:${key}`;
    if((retryAfter.get(id)||0)>now())return Promise.resolve(null);
    if(!pending.has(id)){
      const task=Promise.resolve().then(()=>loadImage(url)).then(value=>{
        target[key]={...(meta||{}),image:value};
        if(kind==='banner')target[key]=value;
        onChange();
        return value;
      }).catch(error=>{pending.delete(id);retryAfter.set(id,now()+30000);throw error;});
      pending.set(id,task);
    }
    return pending.get(id);
  };
  const bannersToLoad=[...new Set(bannerKeys||[])].map(key=>image(banners,'banner',key,`./assets/banners/${key}.png`));
  let effectsTask=null;
  if((effectKeys===null||effectKeys?.length)&&(retryAfter.get('manifest')||0)<=now()){
    const manifestPromise=state.manifestPromise||(state.manifestPromise=Promise.resolve().then(loadManifest).then(value=>{state.manifest=value;return value;}).catch(error=>{state.manifestPromise=null;retryAfter.set('manifest',now()+30000);throw error;}));
    effectsTask=manifestPromise.then(manifest=>{
      const keys=effectKeys===null?Object.keys(manifest):[...new Set(effectKeys)];
      return Promise.allSettled(keys.filter(key=>manifest[key]&&!combatFx[key]).map(key=>image(combatFx,'effect',key,`./assets/fx/${key}.png`,manifest[key])));
    });
  }
  return Promise.allSettled([...bannersToLoad,...(effectsTask?[effectsTask]:[])]);
}
