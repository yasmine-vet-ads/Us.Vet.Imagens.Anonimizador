export interface Capabilities { supported:boolean; missing:string[]; offscreen:boolean }
export function detectCapabilities(scope:any=globalThis, page=false):Capabilities {
  const required=['Blob','ArrayBuffer','Uint8Array','DataView','TextEncoder','TextDecoder','ReadableStream','Response','CompressionStream','DecompressionStream'];
  if(page)required.push('Worker','File','FileReader','createImageBitmap');
  const missing=required.filter(key=>typeof scope[key]!=='function');
  if(typeof scope.Blob?.prototype?.arrayBuffer!=='function'||typeof scope.Blob?.prototype?.stream!=='function')missing.push('Blob readers');
  if(page){
    if(typeof scope.ImageBitmap?.prototype?.close!=='function')missing.push('ImageBitmap.close');
    for(const key of ['createObjectURL','revokeObjectURL'])if(typeof scope.URL?.[key]!=='function')missing.push('URL.'+key);
    let canvas:any;
    try{canvas=scope.document.createElement('canvas');canvas.width=canvas.height=1;
      const ctx=canvas.getContext('2d');if(!ctx||!['drawImage','getImageData'].every(k=>typeof ctx[k]==='function'))missing.push('Canvas 2D');
    }catch{missing.push('Canvas 2D');}finally{if(canvas)canvas.width=canvas.height=1;}
  }
  for(const key of ['CompressionStream','DecompressionStream']){
    if(typeof scope[key]==='function')try{new scope[key]('deflate');}catch{missing.push(key+' deflate');}
  }
  let canvas:any,offscreen=false;
  try{if(typeof scope.OffscreenCanvas==='function'&&typeof scope.createImageBitmap==='function'&&typeof scope.ImageBitmap?.prototype?.close==='function'){
    canvas=new scope.OffscreenCanvas(1,1);const ctx=canvas.getContext('2d');offscreen=!!ctx&&['drawImage','getImageData'].every(k=>typeof ctx[k]==='function');
  }}catch{}finally{if(canvas)canvas.width=canvas.height=1;}
  return {supported:missing.length===0,missing,offscreen};
}
