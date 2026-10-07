import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectJPEG,inspectInput,bitmapRGB,decode} from './generated/codec.js';
import {detectCapabilities} from './generated/capabilities.js';
import {AnonymizerError,MESSAGES,publicMessage} from './generated/errors.js';
const fixture=new URL('./generated/fixtures/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest-hardening.json',fixture)));
test('JPEG grayscale, progressive, direct RGB accepted; real CMYK/YCCK rejected explicitly',async()=>{
  for(const name of ['progressive.jpg',...manifest.cases.map(c=>c.name)])assert.ok(inspectJPEG(await readFile(new URL(name,fixture))).width>0);
  for(const c of manifest.rejected){assert.equal(c.pythonAccepts,true);assert.throws(()=>inspectJPEG(Buffer.from([])),e=>e.code==='corrupt');
    const data=await readFile(new URL(c.name,fixture));assert.throws(()=>inspectJPEG(data),e=>e instanceof AnonymizerError&&e.code==='jpeg');}
  // Structural probes only: changing markers/precision does NOT make a valid fixture.
  const original=await readFile(new URL('gray-jpeg.jpg',fixture)),at=original.indexOf(Buffer.from([255,192]));assert.ok(at>0);
  for(const marker of [195,197,198,199,201,202,203,205,206,207]){const b=Buffer.from(original);b[at+1]=marker;assert.throws(()=>inspectJPEG(b),e=>e.code==='jpeg');}
  const twelve=Buffer.from(original);twelve[at+4]=12;assert.throws(()=>inspectJPEG(twelve),e=>e.code==='jpeg');
});
test('only explicit controlled errors become public; sensitive native exception strings never pass',async()=>{
  const secret='C:/clinica/PACIENTE-123.jpg bytes 0xDEAD stack';
  for(const value of [new Error(secret),secret,{message:secret},new Error('JPEG '+secret)])assert.equal(publicMessage(value),MESSAGES.processing);
  for(const code of Object.keys(MESSAGES))assert.equal(publicMessage(new AnonymizerError(code)),MESSAGES[code]);
  for(const [data,ext,code] of [[new Uint8Array(),'png','invalid'],[new Uint8Array([1]),'txt','extension'],[new Uint8Array([1]),'jpg','format']])assert.throws(()=>inspectInput(data,ext),e=>e.code===code);
});
function capable(){
  const obj=Object.fromEntries(['Blob','ArrayBuffer','Uint8Array','DataView','TextEncoder','TextDecoder','ReadableStream','Response','CompressionStream','DecompressionStream','Worker','File','FileReader','createImageBitmap'].map(k=>[k,function(){}]));
  obj.Blob.prototype.arrayBuffer=()=>{};obj.Blob.prototype.stream=()=>{};
  obj.ImageBitmap={prototype:{close(){}}};obj.URL={createObjectURL(){},revokeObjectURL(){}};
  obj.document={createElement(){return {getContext(){return {drawImage(){},getImageData(){}};}};}};
  obj.OffscreenCanvas=class {getContext(){return {drawImage(){},getImageData(){}};}};
  return obj;
}
test('capabilities check each required API, deflate and actual Canvas context; Offscreen optional',()=>{
  assert.equal(detectCapabilities(capable(),true).supported,true);
  for(const key of ['Blob','ArrayBuffer','TextEncoder','TextDecoder','ReadableStream','Response','CompressionStream','DecompressionStream','Worker','File','FileReader','createImageBitmap']){
    const scope=capable();scope[key]=undefined;assert.equal(detectCapabilities(scope,true).supported,false,key);
  }
  for(const key of ['createObjectURL','revokeObjectURL']){const scope=capable();scope.URL[key]=undefined;assert.equal(detectCapabilities(scope,true).supported,false);}
  const scope=capable();scope.ImageBitmap.prototype.close=undefined;assert.equal(detectCapabilities(scope,true).supported,false);
  const compression=capable();compression.CompressionStream=class{constructor(){throw Error('unsupported');}};assert.equal(detectCapabilities(compression,true).supported,false);
  const dom=capable();dom.document.createElement=()=>({getContext:()=>null});assert.equal(detectCapabilities(dom,true).supported,false);
  const fallback=capable();fallback.OffscreenCanvas=undefined;assert.equal(detectCapabilities(fallback,true).supported,true);assert.equal(detectCapabilities(fallback).offscreen,false);
  const broken=capable();broken.OffscreenCanvas=class{constructor(){throw Error('broken');}};assert.equal(detectCapabilities(broken).offscreen,false);
});
test('bitmap and canvas released on success, mismatch, draw/read failure; fallback after native failure',async()=>{
  const original={bitmap:globalThis.createImageBitmap,canvas:globalThis.OffscreenCanvas};let closed=0,canvases=[];
  try{
    for(const failure of ['none','dimensions','draw','read']){
      globalThis.createImageBitmap=async()=>({width:failure==='dimensions'?2:1,height:1,close(){closed++;}});
      globalThis.OffscreenCanvas=class{constructor(w,h){this.width=w;this.height=h;canvases.push(this);}getContext(){return {drawImage(){if(failure==='draw')throw Error('secret');},getImageData(){if(failure==='read')throw Error('secret');return {data:new Uint8ClampedArray([3,4,5,255])};}};}};
      if(failure==='none')assert.deepEqual([...(await bitmapRGB(new Blob(),1,1)).rgb],[3,4,5]);else await assert.rejects(()=>bitmapRGB(new Blob(),1,1));
    }
    assert.equal(closed,4);assert.ok(canvases.every(c=>c.width===1&&c.height===1));
    globalThis.createImageBitmap=async()=>{throw Error('decoder secret');};let called=0;
    const result=await decode(await readFile(new URL('gray-jpeg.jpg',fixture)),'jpg',async j=>{called++;return {width:j.width,height:j.height,rgb:new Uint8Array(j.width*j.height*3)};});
    assert.equal(called,1);assert.equal(result.width,125);
    const cmyk=await readFile(new URL('cmyk.jpg',fixture));await assert.rejects(()=>decode(cmyk,'jpg',()=>{throw Error('must not decode rejected JPEG');}),e=>e.code==='jpeg');
  }finally{globalThis.createImageBitmap=original.bitmap;globalThis.OffscreenCanvas=original.canvas;}
});
