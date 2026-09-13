// A Firebase-shaped in-memory transport for lifecycle/race tests. It is never
// imported by the shipped game and does not replace the real Firebase service.
const clone=v=>v==null?null:JSON.parse(JSON.stringify(v));
export class MemoryFirebase{
  constructor(){this.data={};this.listeners=new Set();this.tail=Promise.resolve();this.disconnects=new Set();}
  ref(path){return new Ref(this,path);}
  get(path){if(path==='.info/connected')return true;return path.split('/').reduce((v,k)=>v?.[k],this.data)??null;}
  write(path,value){
    if(value!==null&&JSON.stringify(value)===undefined)throw new Error('Undefined Firebase value');
    const keys=path.split('/'),key=keys.pop();let parent=this.data;
    for(const k of keys)parent=parent[k]??={};
    if(value===null)delete parent[key];else parent[key]=clone(value);
    for(const item of this.listeners)if(item.path===path||item.path.startsWith(path+'/')||path.startsWith(item.path+'/'))queueMicrotask(()=>{if(this.listeners.has(item))item.fn({val:()=>clone(this.get(item.path))});});
  }
  schedule(work){const next=this.tail.then(work);this.tail=next.catch(()=>{});return next;}
}
class Ref{
  constructor(server,path){this.server=server;this.path=path;}
  child(path){return new Ref(this.server,this.path+'/'+path);}
  once(){return Promise.resolve({val:()=>clone(this.server.get(this.path))});}
  on(event,fn){const item={path:this.path,fn};this.server.listeners.add(item);queueMicrotask(()=>{if(this.server.listeners.has(item))fn({val:()=>clone(this.server.get(this.path))});});}
  off(event,fn){for(const item of this.server.listeners)if(item.path===this.path&&(!fn||fn===item.fn))this.server.listeners.delete(item);}
  set(value){return this.server.schedule(()=>this.server.write(this.path,value));}
  remove(){return this.set(null);}
  update(value){return this.server.schedule(()=>{for(const [key,val] of Object.entries(value))this.server.write(this.path+'/'+key,val);});}
  transaction(update){return this.server.schedule(()=>{
    // A real Firebase transaction may start with an empty local cache. Aborting
    // on null must fail here too, even if once() previously returned room data.
    const initial=update(null),actual=this.server.get(this.path);
    const value=initial===undefined?undefined:actual===null?initial:update(clone(actual));
    if(value===undefined)return {committed:false,snapshot:{val:()=>clone(actual)}};
    this.server.write(this.path,value);return {committed:true,snapshot:{val:()=>clone(value)}};
  });}
  onDisconnect(){const ref=this,item={};return {set:async value=>{Object.assign(item,{ref,value});ref.server.disconnects.add(item);},remove:async()=>{Object.assign(item,{ref,value:null});ref.server.disconnects.add(item);},cancel:async()=>{ref.server.disconnects.delete(item);}};}
}
export async function settle(){for(let i=0;i<50;i++)await Promise.resolve();}
