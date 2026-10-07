import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {anonymize,roundEven,regions,DEFAULT,reflect101,MAX_PIXELS} from './generated/core.js';
import {decodePNG,encodePNG,inspectPNG,inspectInput,createZIP,crc32} from './generated/codec.js';
import {ReviewState} from './generated/state.js';
const dir=new URL('./generated/fixtures/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',dir)));
const extra=JSON.parse(await readFile(new URL('manifest-extra.json',dir)));manifest.cases.push(...extra.cases);manifest.invalid.push(...extra.invalid);
const toConfig=c=>({mode:({'Tarja preta':'tarja','Desfoque':'desfoque','Pixelização':'pixelizacao'})[c.mode],top:c.top_percent,bottom:c.bottom_percent,left:c.left_percent,right:c.right_percent});
const metrics=[];
function compare(a,b){assert.equal(a.length,b.length);let max=0,sum=0;for(let i=0;i<a.length;i++){const e=Math.abs(a[i]-b[i]);max=Math.max(max,e);sum+=e;}return {max,mean:sum/a.length};}
test('Python round: halves and all mask dimensions through 1000',()=>{
  assert.deepEqual([.5,1.5,2.5,3.5,12.5,17.5,-.5,-1.5,-2.5,-3.5].map(roundEven),[0,2,2,4,12,18,0,-2,-2,-4]);
  for(let dim=1;dim<=1000;dim++)for(let pct=0;pct<=100;pct++){
    const n=dim*pct,lo=Math.floor(n/100),rem=n%100;
    assert.equal(roundEven(dim*pct/100),lo+(rem>50||(rem===50&&lo%2)?1:0));
  }
  assert.deepEqual(regions(25,35,{...DEFAULT,top:10,bottom:10,left:10,right:10}),[[0,0,25,4],[0,32,25,35],[0,0,2,35],[22,0,25,35]]);
  assert.deepEqual([-2,-1,0,1,2,3,4].map(v=>reflect101(v,3)),[2,1,0,1,2,1,0]);
});
test('revisions invalidate on file/order/settings/reprocessing; no stale ZIP',()=>{
  const s=new ReviewState();assert.equal(s.canExport,false);
  s.processed(0);s.confirm(true);assert.equal(s.canExport,true);
  for(const change of ['file','order','remove','mode','top','bottom','left','right','reprocess']){
    s.invalidate();assert.equal(s.canExport,false,change);
    s.processed(s.processingRevision-1);s.confirm(true);assert.equal(s.canExport,false);
    s.processed(s.processingRevision);s.confirm(true);assert.equal(s.canExport,true);
    s.confirm(false);assert.equal(s.canExport,false);s.confirm(true);
  }
});
test('PNG normalization, masks, RGB encoding, metadata and Python pixel comparison',async()=>{
  for(const c of manifest.cases.filter(c=>c.name.endsWith('.png'))){
    const raw=await readFile(new URL(c.name,dir)),decoded=await decodePNG(raw);
    assert.deepEqual(Buffer.from(decoded.rgb),await readFile(new URL(c.raw,dir)),c.name+' normalization');
    assert.equal(decoded.width,c.width);assert.equal(decoded.height,c.height);
    for(const [kind,ref] of Object.entries(c.refs)){
      const out=anonymize({...decoded,rgb:decoded.rgb.slice()},toConfig(ref.config));
      const reference=await decodePNG(await readFile(new URL(ref.file,dir)));
      const m=compare(out.rgb,reference.rgb);metrics.push({case:c.name,mode:kind,...m});
      if(['blur','pixel'].includes(kind)){assert.ok(m.max<=2&&m.mean<=.5,JSON.stringify(metrics.at(-1)));}
      else assert.equal(m.max,0,c.name+'/'+kind);
      const bytes=new Uint8Array(await (await encodePNG(out)).arrayBuffer()),header=inspectPNG(bytes);
      assert.equal(header.depth,8);assert.equal(header.color,2);assert.deepEqual(header.chunks,['IHDR','IDAT','IEND']);
      for(const sentinel of manifest.sentinels)assert.equal(Buffer.from(bytes).includes(Buffer.from(sentinel)),false);
      assert.equal(Buffer.from(bytes).includes(Buffer.from(c.name)),false);
      assert.deepEqual(Buffer.from((await decodePNG(bytes)).rgb),Buffer.from(out.rgb));
    }
  }
  await mkdir('tests/artifacts',{recursive:true});
  await writeFile('tests/artifacts/core-metrics.json',JSON.stringify(metrics,null,2));
});
test('extension/magic/CRC/truncation/APNG/size/actual inflate corruption',async()=>{
  for(const c of manifest.invalid){
    const bytes=await readFile(new URL(c.name,dir)),ext=c.name.split('.').at(-1);
    await assert.rejects(async()=>{inspectInput(bytes,ext);if(ext==='png')await decodePNG(bytes);},undefined,c.name);
    assert.equal(c.pythonRejects,true,c.name+' Python');
  }
});
test('ZIP STORE with 1 and 10 entries, CRC, neutral names, no metadata',async()=>{
  const source=await decodePNG(await readFile(new URL('rgb.png',dir))),blob=await encodePNG(source);
  for(const count of [1,10]){
    const zip=await createZIP(Array.from({length:count},(_,i)=>({name:'imagem_anonimizada_'+String(i+1).padStart(3,'0')+'.png',blob})));
    const b=new Uint8Array(await zip.arrayBuffer()),v=new DataView(b.buffer);let at=0;
    for(let i=0;i<count;i++){
      assert.equal(v.getUint32(at,true),0x04034b50);assert.equal(v.getUint16(at+8,true),0);
      const size=v.getUint32(at+18,true),n=v.getUint16(at+26,true);
      const name=new TextDecoder().decode(b.subarray(at+30,at+30+n));assert.equal(name,'imagem_anonimizada_'+String(i+1).padStart(3,'0')+'.png');
      const payload=b.subarray(at+30+n,at+30+n+size);assert.equal(crc32(payload),v.getUint32(at+14,true));assert.equal(inspectPNG(payload).color,2);at+=30+n+size;
    }
    assert.equal(v.getUint32(at,true),0x02014b50);assert.equal(v.getUint16(b.length-12,true),count);
  }
});
test('pixel cap documented and enforced; configuration guards',()=>{
  assert.equal(MAX_PIXELS,12_000_000);
  assert.throws(()=>anonymize({width:4001,height:3000,rgb:new Uint8Array()},DEFAULT));
  assert.throws(()=>regions(10,10,{...DEFAULT,top:41}));
});
