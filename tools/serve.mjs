import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
const {values}=parseArgs({options:{host:{type:'string'},port:{type:'string'},strictPort:{type:'boolean'},qa:{type:'boolean'}}});
const root=fileURLToPath(new URL('../dist/',import.meta.url));const port=Number(values.port||process.env.PORT||8080),host=values.host||'127.0.0.1';
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Choose a port from 1 to 65535.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
http.createServer(async(req,res)=>{
  try{const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const qa=values.qa&&requestPath==='/__qa__';const file=qa?fileURLToPath(new URL('./browser-qa.html',import.meta.url)):path.resolve(root,'.'+requestPath+(requestPath.endsWith('/')?'index.html':''));
    if(!qa&&!file.startsWith(root)){res.writeHead(403);res.end();return;}
    const info=await stat(file);if(!info.isFile())throw new Error();const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(bytes);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
}).listen(port,host,()=>console.log(`Lunacy Unlocked: http://localhost:${port}`));
