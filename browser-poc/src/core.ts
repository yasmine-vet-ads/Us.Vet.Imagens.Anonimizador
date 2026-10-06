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
    throw new Error('Dimensões acima do limite seguro da POC (12 MP; lado até 8192).');
}
export function regions(w:number,h:number,c:Config) {
  if(!['tarja','desfoque','pixelizacao'].includes(c.mode)||[c.top,c.bottom,c.left,c.right].some(v=>!Number.isInteger(v)||v<0||v>40))
    throw new Error('Configuração inválida.');
  return [[0,0,w,roundEven(h*c.top/100)],[0,roundEven(h*(100-c.bottom)/100),w,h],
    [0,0,roundEven(w*c.left/100),h],[roundEven(w*(100-c.right)/100),0,w,h]];
}
export function reflect101(x:number,n:number):number {
  if(n===1) return 0;
  const period=2*n-2; x=((x%period)+period)%period;
  return x<n?x:period-x;
}
export function gaussianKernel(size:number) {
  const sigma=.3*((size-1)*.5-1)+.8;
  const k=Float64Array.from({length:size},(_,i)=>Math.exp(-.5*((i-(size-1)/2)/sigma)**2));
  const sum=k.reduce((a,b)=>a+b,0); return k.map(v=>v/sum);
}
export function gaussianKernel8(size:number) {
  const floating=gaussianKernel(size),fixed=new Uint16Array(size),half=(size-1)/2;
  let error=0,sum=0;
  // Error-diffused symmetric 8-bit coefficients; center closes sum to 256.
  for(let i=0;i<half;i++){
    const adjusted=floating[i]*256+error,weight=roundEven(adjusted);
    error=adjusted-weight;fixed[i]=weight;fixed[size-1-i]=weight;sum+=weight;
  }
  fixed[half]=256-2*sum;return fixed;
}
function blur(src:Uint8Array,w:number,h:number) {
  const size=Math.max(21,Math.floor(Math.min(w,h)/8)*2+1), half=(size-1)/2, k=gaussianKernel8(size);
  const temp=new Uint16Array(src.length), dst=new Uint8Array(src.length);
  // BORDER_REFLECT_101, isolated ROI, like the copied Python region.
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) for(let c=0;c<3;c++){
    let sum=0; for(let j=0;j<size;j++) sum+=src[(y*w+reflect101(x+j-half,w))*3+c]*k[j];
    temp[(y*w+x)*3+c]=sum;
  }
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) for(let c=0;c<3;c++){
    let sum=0; for(let j=0;j<size;j++) sum+=temp[(reflect101(y+j-half,h)*w+x)*3+c]*k[j];
    dst[(y*w+x)*3+c]=Math.min(255,Math.floor((sum+32768)/65536));
  }
  return dst;
}
function pixelate(src:Uint8Array,w:number,h:number) {
  const sw=Math.max(1,Math.floor(w/12)),sh=Math.max(1,Math.floor(h/12)),small=new Uint8Array(sw*sh*3);
  // OpenCV INTER_LINEAR uses half-pixel coordinates, not browser smoothing.
  for(let y=0;y<sh;y++) for(let x=0;x<sw;x++){
    const fx=(x+.5)*w/sw-.5,fy=(y+.5)*h/sh-.5;
    const x0=Math.max(0,Math.floor(fx)),y0=Math.max(0,Math.floor(fy));
    const x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1);
    const ax=Math.max(0,fx-x0),ay=Math.max(0,fy-y0);
    for(let c=0;c<3;c++) small[(y*sw+x)*3+c]=roundEven(
      (src[(y0*w+x0)*3+c]*(1-ax)+src[(y0*w+x1)*3+c]*ax)*(1-ay)+
      (src[(y1*w+x0)*3+c]*(1-ax)+src[(y1*w+x1)*3+c]*ax)*ay);
  }
  const dst=new Uint8Array(src.length);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const a=(Math.min(sh-1,Math.floor(y*sh/h))*sw+Math.min(sw-1,Math.floor(x*sw/w)))*3;
    dst.set(small.subarray(a,a+3),(y*w+x)*3);
  }
  return dst;
}
export function anonymize(p:Pixels,c:Config):Pixels {
  dimensions(p.width,p.height);
  if(p.rgb.length!==p.width*p.height*3) throw new Error('Pixels inválidos.');
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
