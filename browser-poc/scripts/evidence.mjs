import {readFile,writeFile,mkdir,copyFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='../docs/anonymizer-client-poc-evidence';
await mkdir(out,{recursive:true});
const read=name=>readFile('tests/artifacts/'+name,'utf8').then(JSON.parse);
const functional=await read('browser-report.json'),extra=await read('extra-report.json'),stress=await read('stress-report.json');
for(const r of [functional,extra,stress]){
  if(r.failure||r.browsers.length!==3)throw new Error('Incomplete browser evidence');
  for(const b of r.browsers)if(!b.offline||b.errors.length||b.crashes||b.privacy.unexpectedRequests.length||b.privacy.pageCalls.length||b.privacy.workerCalls.length||b.urls.created!==b.urls.revoked)throw new Error('Failed browser evidence: '+b.name);
}
const files=['.gitignore','README.md','package.json','package-lock.json','tsconfig.json','index.html','style.css'];
for(const dir of ['src','scripts','tests']){
  for(const name of await readdir(dir))if((await stat(dir+'/'+name)).isFile())files.push(dir+'/'+name);
}
const assetSizes={};
for(const name of await readdir('dist')){
  const b=await readFile('dist/'+name);assetSizes[name]={bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};
}
const aggregate=cases=>cases.reduce((all,c)=>{
  all[c.mode]??={max:0,meanMaximum:0,borderMaximum:0};
  all[c.mode].max=Math.max(all[c.mode].max,c.max);all[c.mode].meanMaximum=Math.max(all[c.mode].meanMaximum,c.mean);all[c.mode].borderMaximum=Math.max(all[c.mode].borderMaximum,c.borderMax??0);return all;
},{});
const independentFunctional=await read('functional-export-verification.json'),independentStress=await read('stress-export-verification.json');
const summary={
  date:'2026-10-06',base:'dd8513c9fd227ad64e0eff7e7010a93be500ef5f',branch:'codex/anonymizer-client-poc',
  worktree:'C:/Users/USER/.codex/worktrees/anonymizer-client-poc/Us.Vet.Imagens.Anonimizador',
  classification:'GO COM RESSALVAS',scope:'Human POC tests of validated desktop corpus; not public replacement or deploy',
  runtimeDependencies:[],devDependencies:{esbuild:'0.25.10',typescript:'5.9.3',playwright:'1.56.1'},assetSizes,
  originalPythonTests:{passed:42,modified:false,streamlit:'1.65.0'},
  core:{groupsPassed:6,pixelComparisons:(await read('core-metrics.json')).length,invalidFixtures:14,syntheticValidFixtures:28,roundMaskComparisons:101000},
  independentPillowOpenCV:{functionalImages:independentFunctional.length,stressImages:independentStress.length,maxFunctional:Math.max(...independentFunctional.map(v=>v.max)),meanFunctionalMaximum:Math.max(...independentFunctional.map(v=>v.mean)),maxStress:Math.max(...independentStress.map(v=>v.max))},
  browsers:functional.browsers.map(b=>{
    const e=extra.browsers.find(e=>e.name===b.name),s=stress.browsers.find(s=>s.name===b.name);
    return {name:b.name,version:b.version,pixelCases:b.cases.length+e.cases.length,metrics:aggregate(b.cases.concat(e.cases)),functional:b.performance,stress:s.performance,nativeCanvasPNG:e.nativeCanvasPNG,orientationProbe:e.orientationProbe,forcedCanvasFallback:e.canvasFallback,offline:true,processingNetworkRequests:0,networkAPIInvocations:0,crashes:0,errors:[],objectURLs:{functional:b.urls,extra:e.urls,stress:s.urls}};
  }),
  output:{format:'PNG',bitDepth:8,colorType:2,chunks:['IHDR','IDAT','IEND'],neutralNames:true,metadata:'nenhum metadado identificador da entrada foi propagado nos casos testados'},
  privacy:{runtimeAudit:await read('audit.json'),storageImplemented:false,analytics:false},
  limitations:['Real Android/iOS and Safari not tested','Main JS heap is not total process/native/Worker/Blob memory','12 MP stress uses black mask; extreme blur not approved','CMYK/YCCK and unusual JPEG are rejected','No universal corrupted entropy guarantee from native JPEG decoders'],
  createdFiles:files.map(f=>'browser-poc/'+f).concat(['docs/anonymizer-client-poc.md','docs/anonymizer-client-poc-evidence/*'])
};
for(const name of ['browser-report.json','extra-report.json','stress-report.json','core-metrics.json','audit.json','functional-export-verification.json','stress-export-verification.json','python-browser-comparison.png',...['Chrome','Edge','Firefox'].flatMap(b=>[b+'-desktop.png',b+'-mobile-layout.png'])])await copyFile('tests/artifacts/'+name,out+'/'+name);
summary.createdFiles=files.map(f=>'browser-poc/'+f).concat(['docs/anonymizer-client-poc.md',...(await readdir(out)).filter(n=>n!=='summary.json').map(n=>'docs/anonymizer-client-poc-evidence/'+n),'docs/anonymizer-client-poc-evidence/summary.json']);
summary.memoryMeasurement={totalProcessMeasured:false,mainHeapUsedMaximumBytes:Math.max(...summary.browsers.flatMap(b=>b.functional.concat(b.stress)).map(p=>p.ui.heap?.used??0)),maxFunctionalSchedulingLagMs:Math.max(...summary.browsers.flatMap(b=>b.functional).map(p=>p.ui.lag.max)),maxStressSchedulingLagMs:Math.max(...summary.browsers.flatMap(b=>b.stress).map(p=>p.ui.lag.max))};
await writeFile(out+'/summary.json',JSON.stringify(summary,null,2));
const seconds=ms=>(ms/1000).toFixed(2);
const lines=[
'Gates concluídos em 06/10/2026: 42 testes originais Python, 6 grupos core (116 comparações PNG e 101.000 cálculos de rounding), 28 fixtures válidas/14 inválidas e **156 comparações por navegador (468 no total)**. Verificação independente Pillow/OpenCV dos ZIPs: **144 PNGs funcionais + 48 PNGs de stress**.',
'',
'Normalização, dimensões, tarjas e blur: erro **0** no corpus comparado. Pixelização: máximo **1**, maior média por fixture **0,253242**, máximo de borda **1**. No corpus 1600×1200, maior média **0,000525**. O decoder JPEG e EXIF 1–8 ficaram exatos nas fixtures testadas. Não se generaliza essa identidade a todos os JPEGs.',
'',
'PNG final: RGB, 8 bits, tipo 2, apenas IHDR/IDAT/IEND. Metadata/nomes originais/sentinels ausentes. Zero tentativas de request/API de processamento em página e Worker; fluxo completo offline passou nos três navegadores. URLs criadas/revogadas ficaram iguais ao limpar.',
'',
'**Sondagem nativa crítica:** Canvas produziu PNG tipo 6 (RGBA) nos três browsers. Em Chrome/Edge, imageOrientation="none" sobre JPEG original com EXIF 5–8 mudou 125×75 para 75×125; Firefox manteve 125×75. A POC remove EXIF antes do decoder e encoda RGB explicitamente; seus outputs 1–8 foram pixel-equivalentes ao Python. Fallback Canvas DOM forçado: erro 0 nos três engines, no JPEG sintético pequeno.',
'',
'| Navegador testado | Tarja 10×1,92 MP | Blur 10×1,92 MP | Pixel 10×1,92 MP | Stress tarja 1/5/10×12 MP |',
'|---|---:|---:|---:|---|',
...summary.browsers.map(b=>{
 const p=mode=>seconds(b.functional.find(p=>p.count===10&&p.mode===mode).totalMs)+' s';
 return '| '+b.name+' '+b.version+' | '+p('tarja')+' | '+p('desfoque')+' | '+p('pixelizacao')+' | '+b.stress.map(p=>seconds(p.totalMs)+' s').join(' / ')+' |';
}),
'',
'Tempos da tabela são processamento (validação/ZIP/fluxo completo e tempos por item constam nos JSONs). Nenhum erro ou crash nos corpus desktop. Não houve long task registrada no corpus funcional; scheduling lag e heap principal, quando mensuráveis, estão no relatório. O heap principal não mede memória total. Stress e dispositivos reais não são equivalentes a aprovação mobile.',
'',
'Memória mensurável: máximo de heap JS principal '+summary.memoryMeasurement.mainHeapUsedMaximumBytes+' bytes; memória total não medida. Atraso máximo de agendamento: '+summary.memoryMeasurement.maxFunctionalSchedulingLagMs.toFixed(1)+' ms no gate funcional e '+summary.memoryMeasurement.maxStressSchedulingLagMs.toFixed(1)+' ms no stress. A UI continuou atualizando status/progresso e aceitou revisão/download; atrasos do stress podem ser perceptíveis. São medições headless, não avaliação humana de fluidez em dispositivos reais.',
'',
'Bundle runtime JS: '+Object.entries(assetSizes).filter(([n])=>n.endsWith('.js')).reduce((sum,[,v])=>sum+v.bytes,0)+' bytes sem gzip (main+worker), zero dependências de runtime. Ferramentas de build/teste ficam fora do bundle.',
'',
'[Resumo estruturado e lista de arquivos](anonymizer-client-poc-evidence/summary.json) · [matriz funcional](anonymizer-client-poc-evidence/browser-report.json) · [gates adicionais](anonymizer-client-poc-evidence/extra-report.json) · [stress separado](anonymizer-client-poc-evidence/stress-report.json) · [auditoria de runtime](anonymizer-client-poc-evidence/audit.json).',
'',
'![Python/browser/diferença amplificada em fixtures sintéticas](anonymizer-client-poc-evidence/python-browser-comparison.png)',
'',
'Classificação final preliminar da POC: **GO COM RESSALVAS**, pronta para teste humano do corpus documentado; nenhuma liberação para produção/mobile ou substituição Python foi declarada.'
].join('\n');
const doc=await readFile('../docs/anonymizer-client-poc.md','utf8');
await writeFile('../docs/anonymizer-client-poc.md',doc.slice(0,doc.indexOf('## Resultados locais e evidências')+'## Resultados locais e evidências'.length)+'\n\n'+lines+'\n');
console.log('Evidence complete:',summary.browsers.map(b=>b.name+' '+b.pixelCases+' pixel cases').join(', '));
