import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
const paths=(await readdir('src')).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['index.html','style.css']);
const forbidden=/\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|FormData|localStorage|indexedDB)\b|CacheStorage|caches\.|navigator\.storage|showOpenFilePicker|showSaveFilePicker|cloudinary|supabase|multipart|use server|https?:\/\//i;
const results=[];
for(const file of paths){
  const source=await readFile(file,'utf8');if(forbidden.test(source))throw new Error('Forbidden runtime API in '+file);
  results.push({file,networkOrPersistentAPI:false});
}
const pkg=JSON.parse(await readFile('package.json','utf8'));
if(Object.keys(pkg.dependencies??{}).length)throw new Error('Unexpected runtime dependency.');
const server=await readFile('scripts/serve.mjs','utf8');
if(!server.includes("['GET','HEAD']")||!server.includes("connect-src 'none'")||/req\.(?:on|pipe)|req\.body/.test(server))throw new Error('Static server audit failed.');
await mkdir('tests/artifacts',{recursive:true});
await writeFile('tests/artifacts/audit.json',JSON.stringify({results,runtimeDependencies:[],staticOnly:true,cspConnectNone:true,analytics:false,storage:false},null,2));
console.log('Runtime audit passed: no network APIs, upload SDK, remote URLs, persistent storage, analytics or runtime dependencies.');
