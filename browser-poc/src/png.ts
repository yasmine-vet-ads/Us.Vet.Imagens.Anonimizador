import {AnonymizerError} from './errors';
import {dimensions,Pixels} from './core';
import {signature,text,join,bytesBlob,crc32} from './binary';
export interface PNG {width:number;height:number;depth:number;color:number;interlace:number;idat:Uint8Array[];palette?:Uint8Array;chunks:string[]}
export function inspectPNG(b:Uint8Array):PNG {
  if(b.length<33||signature.some((v,i)=>b[i]!==v))throw new AnonymizerError('corrupt');
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
  const p:PNG={width:0,height:0,depth:0,color:0,interlace:0,idat:[],chunks:[]};
  let at=8,ended=false,closedIDAT=false,seenIDAT=false;
  const singleton=new Set(['IHDR','PLTE','IEND','tRNS']);
  while(at<b.length){
    if(at+12>b.length)throw new AnonymizerError('corrupt');
    const n=v.getUint32(at),end=at+12+n;if(end>b.length)throw new AnonymizerError('corrupt');
    const type=text(b.subarray(at+4,at+8)),data=b.subarray(at+8,at+8+n);
    if(!/^[A-Za-z]{4}$/.test(type)||crc32(b.subarray(at+4,at+8+n))!==v.getUint32(at+8+n))throw new AnonymizerError('corrupt');
    if(['acTL','fcTL','fdAT'].includes(type))throw new AnonymizerError('apng');
    if(singleton.has(type)&&p.chunks.includes(type))throw new AnonymizerError('corrupt');
    if(!p.chunks.length&&type!=='IHDR')throw new AnonymizerError('corrupt');
    if(seenIDAT&&type!=='IDAT')closedIDAT=true;
    if(type==='IHDR'){
      if(n!==13)throw new AnonymizerError('corrupt');
      p.width=v.getUint32(at+8);p.height=v.getUint32(at+12);dimensions(p.width,p.height);
      p.depth=data[8];p.color=data[9];p.interlace=data[12];
      const valid:Record<number,number[]>={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
      if(!valid[p.color]?.includes(p.depth)||data[10]!==0||data[11]!==0||p.interlace>1)throw new AnonymizerError('corrupt');
    }else if(type==='PLTE'){
      if(seenIDAT||n===0||n>768||n%3||[0,4].includes(p.color))throw new AnonymizerError('corrupt');
      p.palette=data;
    }else if(type==='IDAT'){
      if(closedIDAT||p.color===3&&!p.palette)throw new AnonymizerError('corrupt');
      p.idat.push(data);seenIDAT=true;
    }else if(type==='IEND'){
      if(n||!seenIDAT||end!==b.length)throw new AnonymizerError('corrupt');
      ended=true;
    }else if(type[0]===type[0].toUpperCase())throw new AnonymizerError('corrupt');
    p.chunks.push(type);at=end;
  }
  if(!ended)throw new AnonymizerError('corrupt');
  return p;
}
const passes=(p:PNG)=>p.interlace?[[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]]:[[0,0,1,1]];
function passSize(total:number,start:number,step:number){return Math.max(0,Math.ceil((total-start)/step));}
async function inflate(parts:Uint8Array[],expected:number){
  // Streamed, bounded decompression: stop before output exceeds dimensions.
  const stream=new Blob(parts as Uint8Array<ArrayBuffer>[]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader=stream.getReader(),out=new Uint8Array(expected);let offset=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;
    if(offset+value.length>expected)throw new AnonymizerError('corrupt');
    out.set(value,offset);offset+=value.length;
  }}catch{await reader.cancel().catch(()=>{});throw new AnonymizerError('corrupt');}
  finally{reader.releaseLock();}
  if(offset!==expected)throw new AnonymizerError('corrupt');
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
      if(filter>4)throw new AnonymizerError('corrupt');
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
        if(p.color===3){const index=sample(x);if(!p.palette||index*3+2>=p.palette.length)throw new AnonymizerError('corrupt');rgb.set(p.palette.subarray(index*3,index*3+3),target);}
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
  dimensions(p.width,p.height);if(p.rgb.length!==p.width*p.height*3)throw new AnonymizerError('processing');
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
