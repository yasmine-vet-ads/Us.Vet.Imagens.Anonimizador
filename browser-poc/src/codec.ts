import {dimensions,MAX_BYTES,Pixels} from './core';
const signature=new Uint8Array([137,80,78,71,13,10,26,10]);
const table=Uint32Array.from({length:256},(_,n)=>{for(let j=0;j<8;j++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(b:Uint8Array){let crc=0xffffffff;for(const x of b)crc=table[(crc^x)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
const text=(b:Uint8Array)=>new TextDecoder('ascii').decode(b);
function join(parts:Uint8Array[]){const b=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let i=0;for(const p of parts){b.set(p,i);i+=p.length;}return b;}
function bytesBlob(bytes:Uint8Array,type='application/octet-stream'){return new Blob([bytes as Uint8Array<ArrayBuffer>],{type});}
export interface PNG {width:number;height:number;depth:number;color:number;interlace:number;idat:Uint8Array[];palette?:Uint8Array;chunks:string[]}
export function inspectPNG(b:Uint8Array):PNG {
  if(b.length<33||signature.some((v,i)=>b[i]!==v))throw new Error('Assinatura PNG inválida.');
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
  const p:PNG={width:0,height:0,depth:0,color:0,interlace:0,idat:[],chunks:[]};
  let at=8,ended=false,closedIDAT=false,seenIDAT=false;
  const singleton=new Set(['IHDR','PLTE','IEND','tRNS']);
  while(at<b.length){
    if(at+12>b.length)throw new Error('PNG truncado.');
    const n=v.getUint32(at),end=at+12+n;if(end>b.length)throw new Error('PNG truncado.');
    const type=text(b.subarray(at+4,at+8)),data=b.subarray(at+8,at+8+n);
    if(!/^[A-Za-z]{4}$/.test(type)||crc32(b.subarray(at+4,at+8+n))!==v.getUint32(at+8+n))throw new Error('PNG corrompido (chunk/CRC).');
    if(['acTL','fcTL','fdAT'].includes(type))throw new Error('Use uma imagem estática por arquivo (APNG rejeitado).');
    if(singleton.has(type)&&p.chunks.includes(type))throw new Error('PNG com estrutura inválida.');
    if(!p.chunks.length&&type!=='IHDR')throw new Error('IHDR ausente.');
    if(seenIDAT&&type!=='IDAT')closedIDAT=true;
    if(type==='IHDR'){
      if(n!==13)throw new Error('IHDR inválido.');
      p.width=v.getUint32(at+8);p.height=v.getUint32(at+12);dimensions(p.width,p.height);
      p.depth=data[8];p.color=data[9];p.interlace=data[12];
      const valid:Record<number,number[]>={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
      if(!valid[p.color]?.includes(p.depth)||data[10]!==0||data[11]!==0||p.interlace>1)throw new Error('Formato PNG incompatível.');
    }else if(type==='PLTE'){
      if(seenIDAT||n===0||n>768||n%3||[0,4].includes(p.color))throw new Error('Paleta PNG inválida.');
      p.palette=data;
    }else if(type==='IDAT'){
      if(closedIDAT||p.color===3&&!p.palette)throw new Error('Ordem dos chunks PNG inválida.');
      p.idat.push(data);seenIDAT=true;
    }else if(type==='IEND'){
      if(n||!seenIDAT||end!==b.length)throw new Error('Fim PNG inválido.');
      ended=true;
    }else if(type[0]===type[0].toUpperCase())throw new Error('Chunk PNG crítico desconhecido.');
    p.chunks.push(type);at=end;
  }
  if(!ended)throw new Error('PNG sem IEND.');
  return p;
}
const passes=(p:PNG)=>p.interlace?[[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]]:[[0,0,1,1]];
function passSize(total:number,start:number,step:number){return Math.max(0,Math.ceil((total-start)/step));}
async function inflate(parts:Uint8Array[],expected:number){
  // Streamed, bounded decompression: stop before output exceeds dimensions.
  const stream=new Blob(parts as Uint8Array<ArrayBuffer>[]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader=stream.getReader(),out=new Uint8Array(expected);let offset=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;
    if(offset+value.length>expected)throw new Error('Dados PNG excedem dimensões declaradas.');
    out.set(value,offset);offset+=value.length;
  }}catch{await reader.cancel().catch(()=>{});throw new Error('Dados PNG corrompidos.');}
  finally{reader.releaseLock();}
  if(offset!==expected)throw new Error('Dados PNG truncados.');
  return out;
}
const paeth=(a:number,b:number,c:number)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
export async function decodePNG(b:Uint8Array):Promise<Pixels>{
  const p=inspectPNG(b),channels=({0:1,2:3,3:1,4:2,6:4} as Record<number,number>)[p.color];
  const ps=passes(p),bpp=Math.max(1,Math.ceil(channels*p.depth/8));
  let expected=0;
  for(const [sx,sy,dx,dy] of ps){const w=passSize(p.width,sx,dx),h=passSize(p.height,sy,dy);if(w&&h)expected+=h*(1+Math.ceil(w*channels*p.depth/8));}
  const raw=await inflate(p.idat,expected),rgb=new Uint8Array(p.width*p.height*3);let at=0;
  for(const [sx,sy,dx,dy] of ps){
    const w=passSize(p.width,sx,dx),h=passSize(p.height,sy,dy);if(!w||!h)continue;
    const rowSize=Math.ceil(w*channels*p.depth/8);let previous=new Uint8Array(rowSize);
    for(let y=0;y<h;y++){
      const filter=raw[at++],row=raw.subarray(at,at+rowSize);at+=rowSize;
      if(filter>4)throw new Error('Filtro PNG inválido.');
      for(let i=0;i<rowSize;i++){
        const a=i>=bpp?row[i-bpp]:0,bv=previous[i],c=i>=bpp?previous[i-bpp]:0;
        row[i]=(row[i]+([0,a,bv,Math.floor((a+bv)/2),paeth(a,bv,c)][filter]))&255;
      }
      const sample=(index:number)=>{
        if(p.depth===8)return row[index];
        if(p.depth===16)return row[index*2]*256+row[index*2+1];
        const bit=index*p.depth;return(row[bit>>3]>>(8-p.depth-(bit&7)))&((1<<p.depth)-1);
      };
      for(let x=0;x<w;x++){
        const target=((sy+y*dy)*p.width+sx+x*dx)*3;
        if(p.color===3){const index=sample(x);if(!p.palette||index*3+2>=p.palette.length)throw new Error('Índice de paleta inválido.');rgb.set(p.palette.subarray(index*3,index*3+3),target);}
        else if([0,4].includes(p.color)){
          // Pillow I;16 -> RGB saturates grayscale, unlike 16-bit multichannel high-byte conversion.
          const val=p.depth===16?(p.color===0?Math.min(255,sample(x*channels)):sample(x*channels)>>8):sample(x*channels)*255/((1<<p.depth)-1);
          rgb.fill(val,target,target+3);
        }else for(let c=0;c<3;c++)rgb[target+c]=p.depth===16?sample(x*channels+c)>>8:sample(x*channels+c);
        // Alpha/tRNS is deliberately discarded, preserving hidden RGB like convert("RGB").
      }
      previous=row;
    }
  }
  return {width:p.width,height:p.height,rgb};
}
function chunk(type:string,data:Uint8Array){
  const out=new Uint8Array(data.length+12),v=new DataView(out.buffer);v.setUint32(0,data.length);
  out.set(new TextEncoder().encode(type),4);out.set(data,8);v.setUint32(8+data.length,crc32(out.subarray(4,8+data.length)));return out;
}
export async function encodePNG(p:Pixels){
  dimensions(p.width,p.height);if(p.rgb.length!==p.width*p.height*3)throw new Error('Pixels inválidos.');
  const ihdr=new Uint8Array(13),v=new DataView(ihdr.buffer);v.setUint32(0,p.width);v.setUint32(4,p.height);ihdr[8]=8;ihdr[9]=2;
  // A row at a time avoids another full-size uncompressed buffer.
  let y=0;
  const rows=new ReadableStream<Uint8Array<ArrayBuffer>>({pull(controller){
    if(y===p.height){controller.close();return;}
    const row=new Uint8Array(1+p.width*3);row.set(p.rgb.subarray(y*p.width*3,(y+1)*p.width*3),1);y++;controller.enqueue(row);
  }});
  const compressed=new Uint8Array(await new Response(rows.pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  return bytesBlob(join([signature,chunk('IHDR',ihdr),chunk('IDAT',compressed),chunk('IEND',new Uint8Array())]),'image/png');
}
export interface JPEG {width:number;height:number;clean:Blob}
export function inspectJPEG(b:Uint8Array):JPEG{
  if(b.length<4||b[0]!==255||b[1]!==216)throw new Error('Assinatura JPEG inválida.');
  const kept:Uint8Array[]=[b.subarray(0,2)];let at=2,width=0,height=0,sof=false,scan=false,ended=false;
  while(at<b.length){
    const start=at;if(b[at++]!==255)throw new Error('Estrutura JPEG inválida.');
    while(b[at]===255)at++;
    const marker=b[at++];
    if(marker===217){if(at!==b.length||!sof||!scan)throw new Error('Fim JPEG inválido.');kept.push(b.subarray(start,at));ended=true;break;}
    if(marker===0||marker===216||marker>=208&&marker<=215||at+2>b.length)throw new Error('Marcador JPEG inválido.');
    const n=b[at]*256+b[at+1];if(n<2||at+n>b.length)throw new Error('JPEG truncado.');
    if([192,193,194].includes(marker)){
      if(sof||n<8||b[at+2]!==8||![1,3].includes(b[at+7]))throw new Error('JPEG fora do corpus suportado (8 bits, cinza/RGB).');
      height=b[at+3]*256+b[at+4];width=b[at+5]*256+b[at+6];dimensions(width,height);sof=true;
      if(n!==8+3*b[at+7])throw new Error('SOF inválido.');
    }else if(marker>=192&&marker<=207&&![196,200,204].includes(marker))throw new Error('Codificação JPEG não suportada.');
    // Remove APP/COM BEFORE browser decode: orientation, ICC, XMP, thumbnails.
    if(!(marker>=224&&marker<=239)&&marker!==254)kept.push(b.subarray(start,at+n));
    at+=n;
    if(marker===218){
      if(!sof)throw new Error('JPEG sem dimensões.');scan=true;
      const entropyStart=at;
      while(at<b.length){
        if(b[at]!==255){at++;continue;}
        let next=at+1;while(b[next]===255)next++;
        if(b[next]===0||b[next]>=208&&b[next]<=215){at=next+1;continue;}
        break;
      }
      if(at>=b.length)throw new Error('JPEG truncado (sem EOI).');
      kept.push(b.subarray(entropyStart,at));
    }
  }
  if(!ended)throw new Error('JPEG truncado.');
  return {width,height,clean:bytesBlob(join(kept),'image/jpeg')};
}
export function inspectInput(bytes:Uint8Array,extension:string){
  if(bytes.length===0||bytes.length>MAX_BYTES)throw new Error('Arquivo vazio ou acima de 64 MiB.');
  if(!['png','jpg','jpeg'].includes(extension))throw new Error('Use somente PNG, JPG ou JPEG.');
  const isPNG=signature.every((v,i)=>bytes[i]===v),isJPEG=bytes[0]===255&&bytes[1]===216;
  if(extension==='png'?!isPNG:!isJPEG)throw new Error('Formato real incompatível com a extensão.');
  return extension==='png'?inspectPNG(bytes):inspectJPEG(bytes);
}
export async function bitmapRGB(blob:Blob,width:number,height:number,useDOM=false):Promise<Pixels>{
  let bitmap:ImageBitmap;
  try {bitmap=await createImageBitmap(blob,{imageOrientation:'none',colorSpaceConversion:'none',premultiplyAlpha:'none'});}
  catch { // Some engines reject the enum "none". inspectJPEG already removed EXIF/ICC.
    bitmap=await createImageBitmap(blob,{imageOrientation:'from-image',colorSpaceConversion:'none',premultiplyAlpha:'none'});
  }
  let canvas:OffscreenCanvas|HTMLCanvasElement|undefined;
  try{
    if(bitmap.width!==width||bitmap.height!==height)throw new Error('Dimensões decodificadas incompatíveis.');
    canvas=useDOM?Object.assign(document.createElement('canvas'),{width,height}):new OffscreenCanvas(width,height);
    const context=canvas.getContext('2d',{willReadFrequently:true}) as CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D|null;
    if(!context)throw new Error('Canvas 2D indisponível.');
    context.drawImage(bitmap,0,0);
    const data=context.getImageData(0,0,width,height).data,rgb=new Uint8Array(width*height*3);
    for(let i=0,j=0;i<data.length;i+=4,j+=3){rgb[j]=data[i];rgb[j+1]=data[i+1];rgb[j+2]=data[i+2];}
    return {width,height,rgb};
  }finally{bitmap.close();if(canvas){canvas.width=1;canvas.height=1;}}
}
export async function decode(bytes:Uint8Array,extension:string,fallback?:(p:JPEG)=>Promise<Pixels>){
  const header=inspectInput(bytes,extension);
  if(extension==='png')return decodePNG(bytes);
  const j=header as JPEG;
  return typeof OffscreenCanvas==='undefined'&&fallback?fallback(j):bitmapRGB(j.clean,j.width,j.height);
}
export async function createZIP(entries:{name:string;blob:Blob}[]):Promise<Blob>{
  if(!entries.length||entries.length>10)throw new Error('ZIP inválido.');
  // ZIP STORE: no recompression of already deflated PNG. Neutral ASCII names only.
  const parts:BlobPart[]=[],central:Uint8Array<ArrayBuffer>[]=[];let offset=0;
  for(const entry of entries){
    if(!/^imagem_anonimizada_[0-9]{3}\.png$/.test(entry.name))throw new Error('Nome de exportação inválido.');
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
