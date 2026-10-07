import {Pixels} from './core';
import {JPEG,createZIP} from './codec';
import {processImage} from './engine';
import {detectCapabilities} from './capabilities';
import {AnonymizerError,publicMessage} from './errors';
const scope=self as unknown as {postMessage:(message:unknown,transfer?:Transferable[])=>void;onmessage:((event:MessageEvent)=>void)|null};
const capabilities=detectCapabilities();
const fallbackWait=new Map<number,{resolve:(p:Pixels)=>void;reject:()=>void;timer:ReturnType<typeof setTimeout>}>();let fallbackId=0;
function fallback(j:JPEG):Promise<Pixels>{
  const token=++fallbackId;
  return new Promise((resolve,reject)=>{
    const fail=()=>reject(new AnonymizerError('processing'));
    const timer=setTimeout(()=>{fallbackWait.delete(token);fail();},60_000);
    fallbackWait.set(token,{resolve,reject:fail,timer});
    scope.postMessage({type:'canvas',token,blob:j.clean,width:j.width,height:j.height});
  });
}
scope.onmessage=async({data})=>{
  if(data.type==='canvasResult'){
    const pending=fallbackWait.get(data.token);fallbackWait.delete(data.token);
    if(pending){clearTimeout(pending.timer);if(data.error)pending.reject();else pending.resolve({...data.pixels,rgb:new Uint8Array(data.pixels.rgb)});}
    return;
  }
  try{
    if(!capabilities.supported)throw new AnonymizerError('browser');
    if(data.operation==='zip'){scope.postMessage({id:data.id,ok:true,zip:await createZIP(data.entries)});return;}
    const result=await processImage(new Uint8Array(data.bytes),data.extension,data.config,data.operation==='validate',fallback,capabilities.offscreen);
    scope.postMessage({id:data.id,...result});
  }catch(error){scope.postMessage({id:data.id,ok:false,message:publicMessage(error)});}
};
scope.postMessage({type:'ready',capabilities});
