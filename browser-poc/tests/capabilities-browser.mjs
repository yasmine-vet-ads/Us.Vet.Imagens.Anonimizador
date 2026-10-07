import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve('tests/generated/browsers');
const {chromium,firefox}=await import('playwright');
const workerSource=await readFile('dist/worker.js','utf8');
const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>{if(c)reject(Error('Server startup failed'));});});
const report=[];let failure;
try{
 for(const choice of [{name:'Chrome',type:chromium,options:{channel:'chrome'}},{name:'Edge',type:chromium,options:{channel:'msedge'}},{name:'Firefox',type:firefox,options:{}}]){
  const browser=await choice.type.launch({...choice.options,headless:true});
  try{
   for(const missing of ['Worker','Worker-constructor','File','FileReader','Blob','ArrayBuffer','TextEncoder','TextDecoder','CompressionStream','DecompressionStream','createImageBitmap','ImageBitmap.close','URL.createObjectURL','URL.revokeObjectURL','Worker-DecompressionStream','Worker-createImageBitmap','Worker-runtime-error','Worker-request-timeout']){
    const context=await browser.newContext({acceptDownloads:true});let loaded=false;const requests=[],calls=[],errors=[];
    await context.addInitScript(missing=>{
      globalThis.__calls=[];
      const block=kind=>function(){globalThis.__calls.push(kind);throw Error('Forbidden network');};
      globalThis.fetch=block('fetch');globalThis.WebSocket=block('WebSocket');XMLHttpRequest.prototype.open=block('XHR');navigator.sendBeacon=block('beacon');
      if(missing==='Worker-constructor')globalThis.Worker=class{constructor(){throw Error('PRIVATE C:/secret');}};
      else if(missing==='ImageBitmap.close')Object.defineProperty(ImageBitmap.prototype,'close',{value:undefined,configurable:true});
      else if(!missing.startsWith('Worker-')){let owner=globalThis;const keys=missing.split('.');for(const key of keys.slice(0,-1))owner=owner[key];Object.defineProperty(owner,keys.at(-1),{value:undefined,configurable:true});}
    },missing);
    await context.route('**/*',async route=>{
      const request=route.request(),url=request.url();
      if(!loaded&&request.method()==='GET'&&/^http:\/\/127\.0\.0\.1:4173\/(?:main\.js|worker\.js|style\.css)?$/.test(url)){
        if(url.endsWith('/worker.js')&&['Worker-DecompressionStream','Worker-createImageBitmap'].includes(missing)){
          const feature=missing.slice(7);await route.fulfill({contentType:'text/javascript',body:'globalThis.'+feature+'=undefined;'+workerSource});
        }else await route.continue();return;
      }
      requests.push({url,method:request.method()});await route.abort();
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/');
    if(missing==='Worker-createImageBitmap'){
      await page.waitForFunction(()=>!document.querySelector('#files').disabled);const workers=page.workers();assert.equal(workers.length,1);
      await workers[0].evaluate(()=>{globalThis.__calls=[];globalThis.fetch=()=>{globalThis.__calls.push('fetch');throw Error('Forbidden');};globalThis.XMLHttpRequest=class{constructor(){globalThis.__calls.push('XHR');throw Error('Forbidden');}};globalThis.WebSocket=class{constructor(){globalThis.__calls.push('WebSocket');throw Error('Forbidden');}};});
      loaded=true;await context.setOffline(true);
      await page.locator('#files').setInputFiles(path.resolve('tests/generated/fixtures/gray-jpeg.jpg'));
      await page.waitForFunction(()=>!document.querySelector('#files').disabled);
      assert.equal(await page.locator('#process').isDisabled(),false);await page.locator('#process').click();await page.waitForFunction(()=>!document.querySelector('#files').disabled);
      assert.equal(await page.locator('details').count(),1);await page.locator('#review').check();
      const event=page.waitForEvent('download');await page.locator('#download').click();const dl=await event;await dl.saveAs(path.resolve('tests/artifacts/'+choice.name+'-worker-no-bitmap.zip'));
      calls.push(...await workers[0].evaluate(()=>globalThis.__calls));
    }else if(['Worker-runtime-error','Worker-request-timeout'].includes(missing)){
      await page.waitForFunction(()=>!document.querySelector('#files').disabled);const worker=page.workers()[0];loaded=true;await context.setOffline(true);
      await page.locator('#files').setInputFiles(path.resolve('tests/generated/fixtures/rgb.png'));await page.waitForFunction(()=>!document.querySelector('#files').disabled);
      await page.locator('#process').click();await page.waitForFunction(()=>!document.querySelector('#files').disabled);await page.locator('#review').check();assert.equal(await page.locator('#download').isDisabled(),false);
      if(missing==='Worker-runtime-error')await worker.evaluate(()=>{setTimeout(()=>{throw Error('PRIVATE C:/secret.jpg');},0);});
      else{
        await page.evaluate(()=>{const nativeTimer=setTimeout;globalThis.setTimeout=(fn,ms,...args)=>nativeTimer(fn,ms===300_000?20:ms,...args);const nativePost=Worker.prototype.postMessage;Worker.prototype.postMessage=function(data,...args){if(data.operation==='process')return;return nativePost.call(this,data,...args);};});
        await page.locator('#process').click();
      }
      await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('recursos necessários'));
      assert.equal(await page.locator('#files').isDisabled(),true);assert.equal(await page.locator('#download').isDisabled(),true);assert.equal(await page.locator('details').count(),0);
      assert.doesNotMatch(await page.locator('body').textContent(),/PRIVATE|secret/);
    }else{
      await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('recursos necessários'));
      assert.equal(await page.locator('#files').isDisabled(),true);assert.equal(await page.locator('#process').isDisabled(),true);assert.equal(await page.locator('#download').isDisabled(),true);
      assert.doesNotMatch(await page.locator('body').textContent(),/PRIVATE|secret/);loaded=true;await context.setOffline(true);
    }
    calls.push(...await page.evaluate(()=>globalThis.__calls));assert.deepEqual(calls,[]);assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
    report.push({browser:choice.name,version:browser.version(),missing,result:missing==='Worker-createImageBitmap'?'DOM fallback + offline ZIP':'controlled unsupported',requests:0,calls:0,errors:0});await context.close();
   }
  }finally{await browser.close();}
 }
}catch(error){failure=error;}
finally{server.kill();await writeFile('tests/artifacts/capabilities-report.json',JSON.stringify({cases:report,failure:failure?.stack},null,2));}
if(failure)throw failure;console.log('Capability browser gates:',report.length);
