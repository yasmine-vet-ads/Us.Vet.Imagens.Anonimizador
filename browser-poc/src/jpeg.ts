import {AnonymizerError} from './errors';
import {dimensions,Pixels} from './core';
import {join,bytesBlob,text} from './binary';
export interface JPEG {width:number;height:number;clean:Blob}
export function inspectJPEG(b:Uint8Array):JPEG{
  if(b.length<4||b[0]!==255||b[1]!==216)throw new AnonymizerError('corrupt');
  const kept:Uint8Array[]=[b.subarray(0,2)];let at=2,width=0,height=0,sof=false,scan=false,ended=false,components=0,adobe:number|undefined;
  while(at<b.length){
    const start=at;if(b[at++]!==255)throw new AnonymizerError('corrupt');
    while(b[at]===255)at++;
    const marker=b[at++];
    if(marker===217){if(at!==b.length||!sof||!scan)throw new AnonymizerError('corrupt');kept.push(b.subarray(start,at));ended=true;break;}
    if(marker===0||marker===216||marker>=208&&marker<=215||at+2>b.length)throw new AnonymizerError('corrupt');
    const n=b[at]*256+b[at+1];if(n<2||at+n>b.length)throw new AnonymizerError('corrupt');
    if([192,193,194].includes(marker)){
      if(sof||n<8)throw new AnonymizerError('corrupt');
      components=b[at+7];
      if(b[at+2]!==8||![1,3].includes(components))throw new AnonymizerError('jpeg');
      height=b[at+3]*256+b[at+4];width=b[at+5]*256+b[at+6];dimensions(width,height);sof=true;
      if(n!==8+3*b[at+7])throw new AnonymizerError('corrupt');
    }else if(marker>=192&&marker<=207&&marker!==196)throw new AnonymizerError('jpeg');
    if(marker===238&&n>=14&&text(b.subarray(at+2,at+7))==='Adobe'){
      const transform=b[at+13];
      if(transform>1||adobe!==undefined&&adobe!==transform)throw new AnonymizerError('jpeg');
      adobe=transform;
    }
    // Remove APP/COM BEFORE browser decode: orientation, ICC, XMP, thumbnails.
    if(!(marker>=224&&marker<=239)&&marker!==254)kept.push(b.subarray(start,at+n));
    at+=n;
    if(marker===218){
      if(!sof)throw new AnonymizerError('corrupt');scan=true;
      const entropyStart=at;
      while(at<b.length){
        if(b[at]!==255){at++;continue;}
        let next=at+1;while(b[next]===255)next++;
        if(b[next]===0||b[next]>=208&&b[next]<=215){at=next+1;continue;}
        break;
      }
      if(at>=b.length)throw new AnonymizerError('corrupt');
      kept.push(b.subarray(entropyStart,at));
    }
  }
  if(!ended)throw new AnonymizerError('corrupt');
  if(adobe!==undefined){
    if(components!==3&&adobe!==0)throw new AnonymizerError('jpeg');
    // Fixed APP14 color hint: no original APP bytes or metadata are retained.
    kept.splice(1,0,new Uint8Array([255,238,0,14,65,100,111,98,101,0,100,0,0,0,0,adobe]));
  }
  return {width,height,clean:bytesBlob(join(kept),'image/jpeg')};
}
export async function bitmapRGB(blob:Blob,width:number,height:number,useDOM=false):Promise<Pixels>{
  let bitmap:ImageBitmap;
  try {bitmap=await createImageBitmap(blob,{imageOrientation:'none',colorSpaceConversion:'none',premultiplyAlpha:'none'});}
  catch { // Some engines reject the enum "none". inspectJPEG already removed EXIF/ICC.
    bitmap=await createImageBitmap(blob,{imageOrientation:'from-image',colorSpaceConversion:'none',premultiplyAlpha:'none'});
  }
  let canvas:OffscreenCanvas|HTMLCanvasElement|undefined;
  try{
    if(bitmap.width!==width||bitmap.height!==height)throw new AnonymizerError('corrupt');
    canvas=useDOM?Object.assign(document.createElement('canvas'),{width,height}):new OffscreenCanvas(width,height);
    const context=canvas.getContext('2d',{willReadFrequently:true}) as CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D|null;
    if(!context)throw new AnonymizerError('corrupt');
    context.drawImage(bitmap,0,0);
    const data=context.getImageData(0,0,width,height).data,rgb=new Uint8Array(width*height*3);
    for(let i=0,j=0;i<data.length;i+=4,j+=3){rgb[j]=data[i];rgb[j+1]=data[i+1];rgb[j+2]=data[i+2];}
    return {width,height,rgb};
  }finally{if(typeof bitmap.close==='function')bitmap.close();if(canvas){canvas.width=1;canvas.height=1;}}
}
