// Bounded image requests cannot leave FIGHT stuck forever on a flaky connection.
export function loadGameImage(url,{ImageClass=globalThis.Image,timeout=15000}={}){
  return new Promise((resolve,reject)=>{
    const image=new ImageClass();let settled=false;
    const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=null;image.onerror=null;if(error){try{image.src='';}catch{}reject(error);}else resolve(image);};
    const timer=setTimeout(()=>finish(new Error(`Artwork timed out: ${url}`)),timeout);
    image.decoding='async';image.onload=()=>finish();image.onerror=()=>finish(new Error(`Could not load ${url}`));image.src=url;
  });
}
