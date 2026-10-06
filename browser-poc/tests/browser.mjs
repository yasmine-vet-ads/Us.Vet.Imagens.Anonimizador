
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {inflateSync} from 'node:zlib';
import {decodePNG,inspectPNG,crc32} from './generated/codec.js';
const fixture=path.resolve('tests/generated/fixtures'),manifest=JSON.parse(await readFile(path.join(fixture,'manifest.json')));
const stress=process.argv.includes('--stress'),single=process.env.POC_BROWSER;
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve('tests/generated/browsers');
const {chromium,firefox}=await import('playwright');
const extras=process.argv.includes('--extras');
if(extras){const extra=JSON.parse(await readFile(path.join(fixture,'manifest-extra.json')));manifest.cases=extra.cases;manifest.invalid=extra.invalid;}
await mkdir('tests/artifacts',{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>{if(code)reject(new Error('Static server failed: '+code));});});
const report={started:new Date().toISOString(),stress,extras,browsers:[],tolerance:{pngMax:0,blurMax:2,pixelMax:2,mean:.5,jpegDecodeMax:3,jpegDecodeMean:.5,jpegPipelineMax:5,jpegPipelineMean:.7}};
function privacyGuard(){
  globalThis.__privacy=[];
  const block=kind=>function(...args){globalThis.__privacy.push(kind);throw new Error('Network call blocked by privacy test: '+kind);};
  globalThis.fetch=block('fetch');
  if(globalThis.XMLHttpRequest){XMLHttpRequest.prototype.open=block('XMLHttpRequest');XMLHttpRequest.prototype.send=block('XMLHttpRequest.send');}
  if(globalThis.navigator?.sendBeacon)Object.defineProperty(navigator,'sendBeacon',{value:block('sendBeacon')});
  if(globalThis.WebSocket)globalThis.WebSocket=block('WebSocket');
  if(globalThis.FormData){const Original=FormData;globalThis.FormData=class extends Original{constructor(...args){super(...args);globalThis.__privacy.push('FormData');}};}
  if(globalThis.document){
    globalThis.__lag={max:0,longTasks:0,maxLongTask:0};let last=performance.now();
    setInterval(()=>{const now=performance.now();globalThis.__lag.max=Math.max(globalThis.__lag.max,now-last-50);last=now;},50);
    try{new PerformanceObserver(list=>{for(const e of list.getEntries()){globalThis.__lag.longTasks++;globalThis.__lag.maxLongTask=Math.max(globalThis.__lag.maxLongTask,e.duration);}}).observe({type:'longtask',buffered:true});}catch{}
    globalThis.__urlStats={created:0,revoked:0};
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=(...args)=>{globalThis.__urlStats.created++;return create(...args);};
    URL.revokeObjectURL=(...args)=>{globalThis.__urlStats.revoked++;return revoke(...args);};
  }
}
const configToControls=c=>({mode:({'Tarja preta':'tarja','Desfoque':'desfoque','Pixelização':'pixelizacao'})[c.mode],top:c.top_percent,bottom:c.bottom_percent,left:c.left_percent,right:c.right_percent});
function zipEntries(b){
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength),out=[];let at=0;
  while(v.getUint32(at,true)===0x04034b50){
    const method=v.getUint16(at+8,true),size=v.getUint32(at+18,true),n=v.getUint16(at+26,true),extra=v.getUint16(at+28,true);
    const name=b.subarray(at+30,at+30+n).toString(),start=at+30+n+extra;
    const bytes=b.subarray(start,start+size);assert.equal(method,0);assert.equal(crc32(bytes),v.getUint32(at+14,true));
    out.push({name,bytes});at=start+size;
  }
  assert.equal(v.getUint32(at,true),0x02014b50);assert.equal(v.getUint32(b.length-22,true),0x06054b50);
  assert.equal(v.getUint16(b.length-12,true),out.length);return out;
}
function diff(a,b,width,height){
  assert.equal(a.length,b.length);let max=0,sum=0,borderMax=0;
  for(let i=0;i<a.length;i++){const e=Math.abs(a[i]-b[i]),pixel=Math.floor(i/3),x=pixel%width,y=Math.floor(pixel/width);
    max=Math.max(max,e);sum+=e;if(x<10||x>=width-10||y<10||y>=height-10)borderMax=Math.max(borderMax,e);
  }return {max,mean:sum/a.length,borderMax};
}
async function waitIdle(page){await page.waitForFunction(()=>!document.querySelector('#files').disabled,{},{timeout:120_000});}
async function select(page,names){await page.locator('#files').setInputFiles(names.map(name=>path.join(fixture,name)));await waitIdle(page);}
async function configure(page,c){
  const values=configToControls(c);
  for(const [id,value] of Object.entries(values))await page.locator('#'+id).evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},value);
}
async function processBatch(page){const begin=Date.now();await page.locator('#process').click();await waitIdle(page);return Date.now()-begin;}
async function downloadZIP(page,label){
  const before=page.waitForEvent('download');await page.locator('#download').click();const dl=await before;
  assert.equal(dl.suggestedFilename(),'usvet_imagens_anonimizadas.zip');
  const destination=path.resolve('tests/artifacts/'+label+'.zip');await dl.saveAs(destination);await waitIdle(page);
  const b=await readFile(destination);
  for(const s of manifest.sentinels)assert.equal(b.includes(Buffer.from(s)),false);
  return zipEntries(b);
}
let failure;
try{
  for(const choice of [{name:'Chrome',type:chromium,options:process.env.POC_CHROMIUM?{}:{channel:'chrome'}},{name:'Edge',type:chromium,options:{channel:'msedge'}},{name:'Firefox',type:firefox,options:{}}]){
    if(single&&choice.name.toLowerCase()!==single.toLowerCase())continue;
    const browser=await choice.type.launch({...choice.options,headless:true});
    try{
      const br={name:choice.name,version:browser.version(),cases:[],performance:[],privacy:{unexpectedRequests:[],pageCalls:[],workerCalls:[]},offline:false,errors:[],crashes:0};
      report.browsers.push(br);
      const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}});
      await context.addInitScript(privacyGuard);
      let loaded=false;
      await context.route('**/*',async route=>{
        const req=route.request(),url=req.url();
        if(!loaded&&req.method()==='GET'&&/^http:\/\/127\.0\.0\.1:4173\/(?:main\.js|worker\.js|style\.css)?$/.test(url)){await route.continue();return;}
        br.privacy.unexpectedRequests.push({url,method:req.method(),body:req.postData()?.slice(0,200)});await route.abort();
      });
      const page=await context.newPage();page.on('pageerror',e=>br.errors.push(e.message));page.on('crash',()=>br.crashes++);
      const workerEvent=page.waitForEvent('worker');await page.goto('http://127.0.0.1:4173/');
      let worker=await workerEvent;await worker.evaluate(privacyGuard);loaded=true;
      // All assets including the dedicated Worker have loaded. Entire processing flow is now offline.
      await context.setOffline(true);
      assert.equal(await page.locator('#process').isDisabled(),true);assert.equal(await page.locator('#download').isDisabled(),true);
      await select(page,[]);assert.equal(await page.locator('#process').isDisabled(),true);
      for(const invalid of manifest.invalid){await select(page,[invalid.name]);assert.equal(await page.locator('#process').isDisabled(),true,choice.name+'/'+invalid.name);assert.ok((await page.locator('#status').textContent()).includes('erros'));assert.equal((await page.locator('#errors').textContent()).includes(invalid.name),false);}
      await select(page,['rgb.png','broken.png']);assert.equal(await page.locator('#process').isDisabled(),true);
      await select(page,Array(11).fill('rgb.png'));assert.equal(await page.locator('#process').isDisabled(),true);
      if(!stress){
        for(const c of manifest.cases){
          await select(page,[c.name]);assert.equal(await page.locator('#process').isDisabled(),false,c.name+': '+await page.locator('#errors').textContent());
          for(const [mode,ref] of Object.entries(c.refs)){
            await configure(page,ref.config);assert.equal(await page.locator('#download').isDisabled(),true);
            await processBatch(page);assert.equal(await page.locator('details').count(),1);
            assert.equal(await page.locator('#download').isDisabled(),true);
            await page.locator('#review').check();
            const [entry]=await downloadZIP(page,choice.name+'-'+c.name.replace(/\W/g,'_')+'-'+mode);
            assert.equal(entry.name,'imagem_anonimizada_001.png');
            const header=inspectPNG(entry.bytes);assert.equal(header.color,2);assert.equal(header.depth,8);assert.deepEqual(header.chunks,['IHDR','IDAT','IEND']);
            assert.equal(header.width,c.width);assert.equal(header.height,c.height);
            const actual=await decodePNG(entry.bytes),expected=await decodePNG(await readFile(path.join(fixture,ref.file)));
            const m=diff(actual.rgb,expected.rgb,c.width,c.height),jpeg=!c.name.endsWith('.png');
            br.cases.push({file:c.name,mode,...m});
            const max=jpeg?5:mode==='blur'||mode==='pixel'?2:0,mean=jpeg?.7:mode==='blur'||mode==='pixel'?.5:0;
            assert.ok(m.max<=max&&m.mean<=mean,JSON.stringify(br.cases.at(-1)));
            if(jpeg&&mode==='none')assert.ok(m.max<=3&&m.mean<=.5,'JPEG normalization gate');
            assert.equal(await page.locator('#errors').textContent(),'');
          }
        }
        // Changes to every relevant setting, removal, reorder and reprocessing invalidate review.
        await select(page,['rgb.png','gray.png']);await processBatch(page);await page.locator('#review').check();
        for(const [id,value] of Object.entries({mode:'desfoque',top:9,bottom:11,left:7,right:6})){
          await page.locator('#'+id).evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},value);
          assert.equal(await page.locator('#review').isChecked(),false);assert.equal(await page.locator('#download').isDisabled(),true);assert.equal(await page.locator('details').count(),0);
          await processBatch(page);await page.locator('#review').check();
        }
        await page.getByRole('button',{name:'Mover para baixo Item 001',exact:true}).click();await waitIdle(page);
        assert.equal(await page.locator('#download').isDisabled(),true);assert.equal(await page.locator('#review').isChecked(),false);
        await processBatch(page);await page.locator('#review').check();await processBatch(page);
        assert.equal(await page.locator('#review').isChecked(),false);
        await page.locator('#review').check();await page.getByRole('button',{name:'Remover Item 001',exact:true}).click();await waitIdle(page);
        assert.equal(await page.locator('#download').isDisabled(),true);
        // Inject one unexpected item failure at the Worker boundary; subsequent items still succeed.
        await select(page,['rgb.png','gray.png']);
        await page.evaluate(()=>{
          const native=Worker.prototype.postMessage;let count=0;
          Worker.prototype.postMessage=function(data,...args){
            if(data.operation==='process'&&++count===1)data.bytes=new ArrayBuffer(0);
            return native.call(this,data,...args);
          };
        });
        await processBatch(page);assert.equal(await page.locator('details').count(),1);assert.ok((await page.locator('#errors').textContent()).includes('Item 001'));
        await page.locator('#review').check();const survivors=await downloadZIP(page,choice.name+'-isolated');assert.equal(survivors.length,1);assert.equal(survivors[0].name,'imagem_anonimizada_002.png');
      }
      const perfFile=stress?'stress.png':'functional.png';
      for(const mode of extras?[]:stress?['tarja']:['tarja','desfoque','pixelizacao']){
        for(const count of [1,5,10]){
          const flowStart=Date.now();await select(page,Array(count).fill(perfFile));const validationMs=Date.now()-flowStart;
          await configure(page,{mode:({'tarja':'Tarja preta','desfoque':'Desfoque','pixelizacao':'Pixelização'})[mode],top_percent:4,bottom_percent:4,left_percent:0,right_percent:0});
          await page.evaluate(()=>{globalThis.__lag={max:0,longTasks:0,maxLongTask:0};});
          const totalMs=await processBatch(page);assert.equal(await page.locator('details').count(),count);
          const timing=await page.locator('summary').allTextContents();
          await page.locator('#review').check();const zipStart=Date.now();const entries=await downloadZIP(page,choice.name+'-'+mode+'-'+count+(stress?'-stress':''));const zipMs=Date.now()-zipStart;
          assert.equal(entries.length,count);entries.forEach((e,i)=>assert.equal(e.name,'imagem_anonimizada_'+String(i+1).padStart(3,'0')+'.png'));
          const ui=await page.evaluate(()=>({lag:globalThis.__lag,heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null}));
          br.performance.push({count,mode,corpus:stress?'4000x3000':'1600x1200',totalMs,validationMs,zipMs,fullFlowMs:Date.now()-flowStart,perImage:timing,ui,zipBytes:entries.reduce((sum,e)=>sum+e.bytes.length,0)});
          console.log(choice.name,perfFile,mode,count,totalMs+'ms');
        }
      }
      if(extras){
        const nativePNG=await page.evaluate(async()=>{
          const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;
          canvas.getContext('2d').fillRect(0,0,2,2);
          const b=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
          return [...new Uint8Array(await b.arrayBuffer())];
        });
        const nh=inspectPNG(new Uint8Array(nativePNG));br.nativeCanvasPNG={color:nh.color,depth:nh.depth,chunks:nh.chunks};
        br.orientationProbe=[];
        for(let ori=1;ori<=8;ori++){
          const bytes=await readFile(path.join(fixture,'orientation'+ori+(ori%2?'.jpg':'.jpeg')));
          const dimensions=await page.evaluate(async bytes=>{
            const blob=new Blob([new Uint8Array(bytes)],{type:'image/jpeg'});
            try{const bitmap=await createImageBitmap(blob,{imageOrientation:'none'});
            const d={width:bitmap.width,height:bitmap.height};bitmap.close();return d;}catch{return {unsupported:true};}
          },[...bytes]);
          br.orientationProbe.push({orientation:ori,...dimensions});
        }
        await worker.evaluate(()=>{globalThis.__offscreen=OffscreenCanvas;globalThis.OffscreenCanvas=undefined;});
        await select(page,['orientation6.jpeg']);await configure(page,{mode:'Tarja preta',top_percent:0,bottom_percent:0,left_percent:0,right_percent:0});
        await processBatch(page);await page.locator('#review').check();
        const [entry]=await downloadZIP(page,choice.name+'-canvas-fallback');
        const p=await decodePNG(entry.bytes),reference=await readFile(path.join(fixture,'orientation6.rgb'));
        br.canvasFallback=diff(p.rgb,reference,p.width,p.height);assert.ok(br.canvasFallback.max<=3&&br.canvasFallback.mean<=.5);
        await worker.evaluate(()=>{globalThis.OffscreenCanvas=globalThis.__offscreen;});
      }
      await select(page,['PACIENTE-TESTE-PRIVACIDADE-7F2A9C.png']);await processBatch(page);await page.locator('#review').check();await downloadZIP(page,choice.name+'-privacy');
      await page.screenshot({path:'tests/artifacts/'+choice.name+(stress?'-stress':'')+'-desktop.png',fullPage:true});
      await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tests/artifacts/'+choice.name+(stress?'-stress':'')+'-mobile-layout.png',fullPage:true});
      br.mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(br.mobileOverflow,false);
      // Open then close and clear: all review URLs must be revoked.
      await page.locator('#clear').click();await waitIdle(page);
      const audit=await page.evaluate(()=>({calls:globalThis.__privacy,urls:globalThis.__urlStats}));
      br.privacy.pageCalls=audit.calls;br.privacy.workerCalls=await worker.evaluate(()=>globalThis.__privacy);
      br.urls=audit.urls;assert.equal(audit.urls.created,audit.urls.revoked);
      assert.deepEqual(br.privacy.pageCalls,[]);assert.deepEqual(br.privacy.workerCalls,[]);assert.deepEqual(br.privacy.unexpectedRequests,[]);
      assert.deepEqual(br.errors,[]);assert.equal(br.crashes,0);br.offline=true;
      await context.close();
    }finally{await browser.close();}
  }
}catch(e){failure=e;report.failure=String(e.stack);}
finally{
  await writeFile('tests/artifacts/'+(stress?'stress-report':extras?'extra-report':'browser-report')+(single?'-'+single:'')+'.json',JSON.stringify(report,null,2));server.kill();
}
if(failure)throw failure;
console.log('Browser gates passed: '+report.browsers.map(b=>b.name+' '+b.version).join(', '));
