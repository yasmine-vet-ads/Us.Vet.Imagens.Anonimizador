import {inspectInput} from './validation';
import {decodePNG} from './png';
import {JPEG,bitmapRGB} from './jpeg';
import {Pixels} from './core';
export async function decode(bytes:Uint8Array,extension:string,fallback?:(p:JPEG)=>Promise<Pixels>,offscreenAvailable=true){
  const header=inspectInput(bytes,extension);
  if(extension==='png')return decodePNG(bytes);
  const j=header as JPEG;
  if((!offscreenAvailable||typeof OffscreenCanvas==='undefined')&&fallback)return fallback(j);
  try{return await bitmapRGB(j.clean,j.width,j.height);}
  catch(error){if(fallback)return fallback(j);throw error;}
}
