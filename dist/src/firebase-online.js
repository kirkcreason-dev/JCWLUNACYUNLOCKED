import {FIREBASE_CONFIG} from './firebase-config.js';
let loading;
const load=src=>new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=src;script.async=true;
  const timer=setTimeout(()=>{script.remove();reject(new Error('Online connection timed out. Check your connection and try again.'));},12000);
  script.onload=()=>{clearTimeout(timer);resolve();};
  script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('Could not load online play. Check your connection and try again.'));};
  document.head.append(script);
});
export function connectFirebase(){
  if(!loading)loading=(async()=>{
    // Keep the same pinned SDK and Firebase project used by the original game.
    if(!globalThis.firebase?.initializeApp)await load('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
    if(!globalThis.firebase?.database)await load('https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js');
    const name='lunacy-unlocked-online';
    const app=firebase.apps.find(app=>app.name===name)||firebase.initializeApp(FIREBASE_CONFIG,name);
    const db=app.database();
    await new Promise((resolve,reject)=>{
      const ref=db.ref('.info/connected');
      const timer=setTimeout(()=>{ref.off('value',connected);reject(new Error('Could not reach online play. Check your connection and try again.'));},12000);
      const connected=s=>{if(s.val()){clearTimeout(timer);ref.off('value',connected);resolve();}};
      ref.on('value',connected,error=>{clearTimeout(timer);reject(error);});
    });
    return db;
  })().catch(error=>{loading=null;throw error;});
  return loading;
}
