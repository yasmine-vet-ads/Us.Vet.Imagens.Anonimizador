import {AnonymizerError} from './errors';
import {crc32} from './binary';
export async function createZIP(entries:{name:string;blob:Blob}[]):Promise<Blob>{
  if(!entries.length||entries.length>10)throw new AnonymizerError('processing');
  // ZIP STORE: no recompression of already deflated PNG. Neutral ASCII names only.
  const parts:BlobPart[]=[],central:Uint8Array<ArrayBuffer>[]=[];let offset=0;
  for(const entry of entries){
    if(!/^imagem_anonimizada_[0-9]{3}\.png$/.test(entry.name))throw new AnonymizerError('processing');
    const b=new Uint8Array(await entry.blob.arrayBuffer()),name=new TextEncoder().encode(entry.name),crc=crc32(b);
    const local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(12,33,true);
    lv.setUint32(14,crc,true);lv.setUint32(18,b.length,true);lv.setUint32(22,b.length,true);lv.setUint16(26,name.length,true);local.set(name,30);
    parts.push(local,entry.blob);
    const dir=new Uint8Array(46+name.length),dv=new DataView(dir.buffer);
    dv.setUint32(0,0x02014b50,true);dv.setUint16(4,20,true);dv.setUint16(6,20,true);dv.setUint16(14,33,true);
    dv.setUint32(16,crc,true);dv.setUint32(20,b.length,true);dv.setUint32(24,b.length,true);dv.setUint16(28,name.length,true);dv.setUint32(42,offset,true);dir.set(name,46);
    central.push(dir);offset+=local.length+b.length;
  }
  const size=central.reduce((n,d)=>n+d.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,size,true);ev.setUint32(16,offset,true);
  return new Blob([...parts,...central,end],{type:'application/zip'});
}
