import {blur,pixelate} from './effects';
import {AnonymizerError} from './errors';
export type Mode = 'tarja' | 'desfoque' | 'pixelizacao';
export interface Config { mode: Mode; top: number; bottom: number; left: number; right: number }
export interface Pixels { width: number; height: number; rgb: Uint8Array }
export const DEFAULT: Config = {mode:'tarja',top:4,bottom:4,left:0,right:0};
export const MAX_PIXELS = 12_000_000;
export const MAX_SIDE = 8192;
export const MAX_BYTES = 64 * 1024 * 1024;
export const itemName = (i: number) => 'Item '+String(i).padStart(3,'0');
export const outputName = (i: number) => 'imagem_anonimizada_'+String(i).padStart(3,'0')+'.png';
export function roundEven(n: number): number {
  const lo = Math.floor(n), fraction = n - lo;
  return fraction === .5 ? lo + (Math.abs(lo) % 2) : fraction < .5 ? lo : lo + 1;
}
export function dimensions(w:number,h:number) {
  if (!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>MAX_SIDE||h>MAX_SIDE||w*h>MAX_PIXELS)
    throw new AnonymizerError('dimensions');
}
export function regions(w:number,h:number,c:Config) {
  if(!['tarja','desfoque','pixelizacao'].includes(c.mode)||[c.top,c.bottom,c.left,c.right].some(v=>!Number.isInteger(v)||v<0||v>40))
    throw new AnonymizerError('config');
  return [[0,0,w,roundEven(h*c.top/100)],[0,roundEven(h*(100-c.bottom)/100),w,h],
    [0,0,roundEven(w*c.left/100),h],[roundEven(w*(100-c.right)/100),0,w,h]];
}
export function anonymize(p:Pixels,c:Config):Pixels {
  dimensions(p.width,p.height);
  if(p.rgb.length!==p.width*p.height*3) throw new AnonymizerError('processing');
  for(const [x1,y1,x2,y2] of regions(p.width,p.height,c)){
    const w=x2-x1,h=y2-y1;if(!w||!h)continue;
    if(c.mode==='tarja'){
      for(let y=y1;y<y2;y++)p.rgb.fill(0,(y*p.width+x1)*3,(y*p.width+x2)*3);
    }else{
      const roi=new Uint8Array(w*h*3);
      for(let y=0;y<h;y++)roi.set(p.rgb.subarray(((y+y1)*p.width+x1)*3,((y+y1)*p.width+x2)*3),y*w*3);
      const changed=c.mode==='desfoque'?blur(roi,w,h):pixelate(roi,w,h);
      for(let y=0;y<h;y++)p.rgb.set(changed.subarray(y*w*3,(y+1)*w*3),((y+y1)*p.width+x1)*3);
    }
  }
  return p;
}

export {reflect101,gaussianKernel,gaussianKernel8} from './effects';
