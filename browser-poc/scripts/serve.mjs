// Static assets only. No upload endpoint, request body reader, or processing service.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'};
http.createServer(async(req,res)=>{
  const headers={'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src blob:; worker-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,headers).end();return;}
  const url=new URL(req.url,'http://localhost');
  const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!['index.html','main.js','worker.js','style.css'].includes(name)){res.writeHead(404,headers).end();return;}
  try {const data=await readFile(path.join(root,name));res.writeHead(200,{...headers,'Content-Type':types[path.extname(name)]});res.end(req.method==='HEAD'?undefined:data);}
  catch {res.writeHead(404,headers).end();}
}).listen(4173,'127.0.0.1',()=>console.log('POC: http://127.0.0.1:4173'));
