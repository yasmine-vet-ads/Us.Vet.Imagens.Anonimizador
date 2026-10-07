import {AnonymizerError} from './errors';
import {MAX_BYTES} from './core';
import {signature} from './binary';
import {inspectPNG} from './png';
import {inspectJPEG} from './jpeg';
export function inspectInput(bytes:Uint8Array,extension:string){
  if(bytes.length===0||bytes.length>MAX_BYTES)throw new AnonymizerError('invalid');
  if(!['png','jpg','jpeg'].includes(extension))throw new AnonymizerError('extension');
  const isPNG=signature.every((v,i)=>bytes[i]===v),isJPEG=bytes[0]===255&&bytes[1]===216;
  if(extension==='png'?!isPNG:!isJPEG)throw new AnonymizerError('format');
  return extension==='png'?inspectPNG(bytes):inspectJPEG(bytes);
}
