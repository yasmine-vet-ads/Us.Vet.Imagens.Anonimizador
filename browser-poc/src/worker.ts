import {anonymize,Config,Pixels} from './core';
import {decode,encodePNG,JPEG,createZIP} from './codec';
const scope=self as unknown as {postMessage:(message:unknown,transfer?:Transferable[])=>void;onmessage:((event:MessageEvent)=>void)|null};
const fallbackWait=new Map<number,{resolve:(p:Pixels)=>void;reject:()=>void}>();let fallbackId=0;
function fallback(j:JPEG):Promise<Pixels>{
  const token=++fallbackId;
  return new Promise((resolve,reject)=>{
    fallbackWait.set(token,{resolve,reject:()=>reject(new Error('Decodificação indisponível.'))});
    scope.postMessage({type:'canvas',token,blob:j.clean,width:j.width,height:j.height});
  });
}
scope.onmessage=async({data})=>{
  if(data.type==='canvasResult'){
    const pending=fallbackWait.get(data.token);fallbackWait.delete(data.token);
    if(data.error)pending?.reject();else pending?.resolve({...data.pixels,rgb:new Uint8Array(data.pixels.rgb)});
    return;
  }
  if(data.operation==='zip'){try{scope.postMessage({id:data.id,ok:true,zip:await createZIP(data.entries)});}catch{scope.postMessage({id:data.id,ok:false});}return;}
  const {id,bytes,extension,config,operation}=data as {id:number;bytes:ArrayBuffer;extension:string;config:Config;operation:string};
  try{
    const start=performance.now();
    const pixels=await decode(new Uint8Array(bytes),extension,fallback);
    if(operation==='validate'){scope.postMessage({id,ok:true});return;}
    const original=await encodePNG(pixels);
    anonymize(pixels,config);
    const output=await encodePNG(pixels);
    scope.postMessage({id,ok:true,original,output,width:pixels.width,height:pixels.height,ms:performance.now()-start});
  }catch(error){
    // Only our controlled validation messages; never decoder exception strings or filenames.
    const known=error instanceof Error&&/^(Assinatura|PNG|IHDR|Formato|Use |Dimensões|Arquivo|Dados PNG|Filtro PNG|Índice|JPEG|Fim JPEG|Estrutura JPEG|Marcador JPEG|SOF|Codificação JPEG|Chunk PNG|Ordem dos chunks)/.test(error.message);
    scope.postMessage({id,ok:false,message:known?error.message:'Não foi possível decodificar ou processar a imagem com segurança.'});
  }
};
