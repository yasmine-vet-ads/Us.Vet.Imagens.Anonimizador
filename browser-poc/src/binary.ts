export const signature=new Uint8Array([137,80,78,71,13,10,26,10]);
const table=Uint32Array.from({length:256},(_,n)=>{for(let j=0;j<8;j++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(b:Uint8Array){let crc=0xffffffff;for(const x of b)crc=table[(crc^x)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
export const text=(b:Uint8Array)=>new TextDecoder('ascii').decode(b);
export function join(parts:Uint8Array[]){const b=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let i=0;for(const p of parts){b.set(p,i);i+=p.length;}return b;}
export function bytesBlob(bytes:Uint8Array,type='application/octet-stream'){return new Blob([bytes as Uint8Array<ArrayBuffer>],{type});}
