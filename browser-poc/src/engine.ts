import {anonymize,Config,Pixels} from './core';
import {decode,encodePNG,JPEG} from './codec';
export async function processImage(bytes:Uint8Array,extension:string,config:Config,validateOnly=false,fallback?:(j:JPEG)=>Promise<Pixels>,offscreenAvailable=true){
  const start=performance.now();
  const pixels=await decode(bytes,extension,fallback,offscreenAvailable);
  if(validateOnly)return {ok:true as const};
  const original=await encodePNG(pixels);
  anonymize(pixels,config);
  const output=await encodePNG(pixels);
  return {ok:true as const,original,output,width:pixels.width,height:pixels.height,ms:performance.now()-start};
}
