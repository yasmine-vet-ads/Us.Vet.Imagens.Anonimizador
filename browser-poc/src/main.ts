import {Config,Mode,itemName,outputName,MAX_BYTES} from './core';
import {bitmapRGB} from './codec';
import {ReviewState} from './state';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const filesInput=el<HTMLInputElement>('files'),processButton=el<HTMLButtonElement>('process'),clearButton=el<HTMLButtonElement>('clear');
const review=el<HTMLInputElement>('review'),download=el<HTMLButtonElement>('download'),progress=el<HTMLProgressElement>('progress');
const state=new ReviewState();
let files:File[]=[],results:{index:number;original:Blob;output:Blob;width:number;height:number;ms:number}[]=[],valid=false,busy=false,worker:Worker;
let requestId=0;const pending=new Map<number,{resolve:(v:any)=>void;reject:()=>void}>();
let previewURLs:string[]=[],zipURL:string|undefined;
const controls=['mode','top','bottom','left','right'];
function config():Config{return {mode:el<HTMLSelectElement>('mode').value as Mode,...Object.fromEntries(controls.slice(1).map(k=>[k,Number(el<HTMLInputElement>(k).value)]))} as Config;}
function spawnWorker(){
  worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
  worker.onmessage=async({data})=>{
    if(data.type==='canvas'){
      try{const p=await bitmapRGB(data.blob,data.width,data.height,true);worker.postMessage({type:'canvasResult',token:data.token,pixels:{...p,rgb:p.rgb.buffer}},[p.rgb.buffer]);}
      catch{worker.postMessage({type:'canvasResult',token:data.token,error:true});}
      return;
    }
    const waiting=pending.get(data.id);pending.delete(data.id);waiting?.resolve(data);
  };
  worker.onerror=(event)=>{event.preventDefault();worker.terminate();for(const wait of pending.values())wait.reject();pending.clear();spawnWorker();};
}
spawnWorker();
function request(data:Record<string,unknown>,transfer:Transferable[]=[]):Promise<any>{
  const id=++requestId;
  return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject:()=>reject(new Error('Falha local de processamento.'))});worker.postMessage({...data,id},transfer);});
}
async function imageRequest(file:File,operation:string){
  if(file.size>MAX_BYTES||!file.size)return {ok:false,message:'Arquivo vazio ou acima de 64 MiB.'};
  const bytes=await file.arrayBuffer(),extension=file.name.split('.').pop()?.toLowerCase()??'';
  return request({bytes,extension,operation,config:config()},[bytes]);
}
function message(text:string){el('status').textContent=text;}
function error(index:number,text:string){const li=document.createElement('li');li.textContent=(index?itemName(index)+': ':'')+text;el('errors').append(li);}
function releasePreviews(){for(const url of previewURLs)URL.revokeObjectURL(url);previewURLs=[];for(const image of el('comparisons').querySelectorAll('img'))image.remove();}
function revokeZIP(){if(zipURL){URL.revokeObjectURL(zipURL);zipURL=undefined;}}
function updateControls(){
  filesInput.disabled=busy;controls.forEach(k=>(el(k) as HTMLInputElement).disabled=busy);
  clearButton.disabled=busy||!files.length;processButton.disabled=busy||!valid;
  review.disabled=busy||!results.length||state.outputRevision!==state.processingRevision;
  download.disabled=busy||!results.length||!state.canExport;
  for(const button of el('items').querySelectorAll('button'))button.disabled=busy||button.dataset.blocked==='true';
}
function invalidate(){
  state.invalidate();results=[];review.checked=false;releasePreviews();revokeZIP();
  el('comparisons').replaceChildren();el('review-status').textContent='O ZIP será liberado após processamento e confirmação da revisão.';
  updateControls();
}
function itemList(){
  el('items').replaceChildren();
  files.forEach((_,i)=>{
    const li=document.createElement('li'),label=document.createElement('span');label.textContent=itemName(i+1);li.append(label);
    for(const [title,fn,disabled] of [
      ['Mover para cima',()=>{[files[i-1],files[i]]=[files[i],files[i-1]];changedFiles();},i===0],
      ['Mover para baixo',()=>{[files[i+1],files[i]]=[files[i],files[i+1]];changedFiles();},i===files.length-1],
      ['Remover',()=>{files.splice(i,1);changedFiles();},false]
    ] as [string,()=>void,boolean][]){
      const b=document.createElement('button');b.className='secondary';b.textContent=title==='Remover'?'Remover':title==='Mover para cima'?'↑':'↓';b.setAttribute('aria-label',title+' '+itemName(i+1));
      b.dataset.blocked=String(disabled);b.disabled=disabled||busy;b.onclick=()=>{if(!busy&&!disabled)fn();};li.append(b);
    }
    el('items').append(li);
  });
}
async function changedFiles(){
  invalidate();valid=false;el('errors').replaceChildren();itemList();
  if(files.length<1||files.length>10){message('Selecione de 1 a 10 imagens por lote.');if(files.length>10)error(0,'Limite de 10 arquivos excedido.');updateControls();return;}
  const revision=state.processingRevision;busy=true;updateControls();let failures=0;progress.hidden=false;progress.max=files.length;progress.value=0;
  try{
    for(let i=0;i<files.length;i++){
      message('Validando '+itemName(i+1)+' de '+files.length+'…');
      try{const response=await imageRequest(files[i],'validate');if(!response.ok){error(i+1,response.message);failures++;}}
      catch{error(i+1,'Não foi possível validar a imagem com segurança.');failures++;}
      progress.value=i+1;
    }
    if(revision===state.processingRevision){valid=failures===0;message(valid?'Lote validado. Configure as máscaras e processe.':'O lote contém erros. Remova ou substitua os itens indicados.');}
  }finally{busy=false;progress.hidden=true;itemList();updateControls();}
}
filesInput.onchange=()=>{files=Array.from(filesInput.files??[]);filesInput.value='';void changedFiles();};
clearButton.onclick=()=>{files=[];void changedFiles();};
controls.forEach(k=>el(k).addEventListener('input',()=>{
  if(k!=='mode')el(k+'-value').textContent=el<HTMLInputElement>(k).value+'%';
  invalidate();message(valid?'Configuração alterada. Processe novamente e refaça a revisão.':'Selecione um lote válido para continuar.');
}));
function comparisons(){
  el('comparisons').replaceChildren();
  results.forEach((r,i)=>{
    const detail=document.createElement('details'),summary=document.createElement('summary');
    summary.textContent=itemName(r.index)+' · '+r.width+' × '+r.height+' · '+(r.ms/1000).toFixed(3)+' s';detail.append(summary);
    const tools=document.createElement('div');tools.className='viewer-tools';
    const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';label.append(check,document.createTextNode(' Inspecionar em resolução completa (rolagem)'));tools.append(label);detail.append(tools);
    const pair=document.createElement('div');pair.className='pair';
    check.onchange=()=>pair.classList.toggle('native',check.checked);
    for(const caption of ['Original','Anonimizada']){
      const figure=document.createElement('figure'),cap=document.createElement('figcaption'),view=document.createElement('div');
      cap.textContent=caption;view.className='viewport';figure.append(cap,view);pair.append(figure);
    }
    detail.append(pair);el('comparisons').append(detail);
    detail.addEventListener('toggle',()=>{
      if(!detail.isConnected)return;
      if(!detail.open){for(const image of detail.querySelectorAll('img')){URL.revokeObjectURL(image.src);previewURLs=previewURLs.filter(u=>u!==image.src);image.remove();}return;}
      // At most one original/processed pair decoded for full-resolution review.
      for(const other of el('comparisons').querySelectorAll('details'))if(other!==detail)other.open=false;
      releasePreviews();
      [r.original,r.output].forEach((blob,j)=>{
        const url=URL.createObjectURL(blob);previewURLs.push(url);
        const img=document.createElement('img');img.alt=(j?'Anonimizada — ':'Original — ')+itemName(r.index);img.src=url;
        pair.querySelectorAll('.viewport')[j].append(img);
      });
    });
    if(i===0)detail.open=true;
  });
}
processButton.onclick=async()=>{
  if(!valid||busy)return;
  invalidate();const revision=state.processingRevision;busy=true;updateControls();el('errors').replaceChildren();
  progress.hidden=false;progress.max=files.length;progress.value=0;const start=performance.now();
  try{
    for(let i=0;i<files.length;i++){
      message('Processando '+itemName(i+1)+' de '+files.length+'…');
      try{
        const response=await imageRequest(files[i],'process');
        if(response.ok)results.push({index:i+1,...response});else error(i+1,'Falha inesperada de processamento. Item excluído do ZIP; tente novamente ou remova-o.');
      }catch{error(i+1,'Falha inesperada de processamento. Item excluído do ZIP; tente novamente ou remova-o.');}
      progress.value=i+1;
    }
    if(revision===state.processingRevision&&results.length){
      state.processed(revision);comparisons();
      message(results.length+' imagem(ns) processada(s) em '+((performance.now()-start)/1000).toFixed(2)+' s. Abra cada item e revise Original × Anonimizada.');
    }else message('Nenhuma imagem foi processada com sucesso.');
  }finally{busy=false;progress.hidden=true;updateControls();}
};
review.onchange=()=>{
  state.confirm(review.checked);revokeZIP();
  el('review-status').textContent=state.canExport?'ANONIMIZAÇÃO VERIFICADA: revisão visual declarada pelo usuário.':'Confirme a revisão visual de todas as imagens processadas.';
  updateControls();
};
download.onclick=async()=>{
  if(busy||!state.canExport||!results.length)return;
  const revision=state.processingRevision;busy=true;updateControls();message('Gerando ZIP local…');
  try{
    const response=await request({operation:'zip',entries:results.map(r=>({name:outputName(r.index),blob:r.output}))});
    if(!response.ok||revision!==state.processingRevision||!state.canExport)throw new Error('ZIP indisponível.');
    revokeZIP();zipURL=URL.createObjectURL(response.zip);
    const link=document.createElement('a');link.href=zipURL;link.download='usvet_imagens_anonimizadas.zip';link.click();
    // Delayed revocation lets the browser consume its download; also revoked on invalidation/pagehide.
    const url=zipURL;setTimeout(()=>{if(zipURL===url)revokeZIP();},30_000);
    message('ZIP gerado localmente. '+results.length+' imagem(ns) revisada(s).');
  }catch{message('Não foi possível gerar o ZIP local. Tente novamente.');}
  finally{busy=false;updateControls();}
};
window.addEventListener('pagehide',()=>{releasePreviews();revokeZIP();worker.terminate();files=[];results=[];});
