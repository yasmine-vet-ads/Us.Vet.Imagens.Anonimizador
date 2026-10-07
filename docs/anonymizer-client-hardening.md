# Anonymizer client-side hardening — revisão local

Data: 07/10/2026. Baseline validada: `2e4991fcfaeab2d3dc814263e5a8b28e8278b655`, branch `codex/anonymizer-client-poc` (GO COM RESSALVAS; teste humano PC e Chrome Android informado pelo solicitante). `git fetch` executado e commit confirmado. Nova branch: `codex/anonymizer-client-hardening`, criada desse commit. Worktree: `C:/Users/USER/.codex/worktrees/anonymizer-client-hardening/Us.Vet.Imagens.Anonimizador`.

Escopo: preparação privada do motor para futura integração. Não houve integração Next.js, publicação de pacote, deploy, push, PR ou merge. Python/Streamlit, documentos jurídicos e evidências históricas da PoC foram preservados. O commit final é o HEAD local desta branch; `git log -1` fornece seu identificador sem uma referência circular no próprio commit.

## Mudanças e comparação com a baseline

O motor foi separado em módulos TypeScript de validação, parsing JPEG/PNG, efeitos, encoding PNG RGB, ZIP, revisão e erros. `engine.ts` expõe `processImage`; `codec.ts` preserva imports antigos. `main.ts` contém somente a adaptação da interface, e `worker.ts` o transporte local. [Contrato de reutilização](../browser-poc/src/README.md).

Limites de 10 imagens, 64 MiB por arquivo, 12 MP/8192 por lado, nomes neutros, quatro máscaras, revisão obrigatória antes do ZIP, invalidação por ordem/entrada/configuração/reprocessamento e processamento sequencial continuam iguais à baseline. Os cálculos Gaussian/pixel/rounding foram extraídos sem mudanças algorítmicas. PNG continua RGB8, tipo 2, apenas IHDR/IDAT/IEND.

Diferenças justificadas: handshake de capacidades; rejeição explícita de JPEG incomum; fallback também após falha no caminho nativo; erros tipados; encerramento sem respawn infinito do Worker; timeout de startup de 15 s, callback Canvas de 60 s e requisição de 5 min. Falha fatal invalida resultados e revisão e exige recarregar a página. `pagehide` elimina também elementos que retinham Blobs por listeners, encerra Worker e limpa referências; retorno por BFCache recarrega uma sessão nova.

## Decisões JPEG

| Variante | Decisão do MVP | Condições / evidência |
|---|---|---|
| JPEG RGB / YCbCr comum | SUPORTADO | DCT Huffman de 8 bits, 3 componentes, SOF0; decodificação via navegador após limpeza |
| RGB direto Adobe transform 0 | SUPORTADO | Fixture Pillow `keep_rgb=True`, comparada com Python |
| JPEG grayscale | SUPORTADO | 1 componente, 8 bits; baseline e progressive comparados |
| Progressive JPEG | SUPORTADO | SOF2 Huffman de 8 bits; RGB já na PoC, cinza acrescentado |
| Extended sequential 8-bit | SUPORTADO | SOF1, mesma varredura DCT legal; fixture confirmada por Pillow e navegadores |
| JPEG CMYK | REJEITADO PELO MVP | 4 componentes, inclusive Adobe transform 0 |
| JPEG YCCK | REJEITADO PELO MVP | 4 componentes / Adobe transform 2; fixture DCT realmente codificada |
| JPEG de 12/16 bits, lossless, diferencial, arithmetic, hierarchical, componentes incomuns | REJEITADO PELO MVP | precisão diferente de 8, SOFs fora de 0/1/2, DAC/reserved ou transform incompatível; sondagens estruturais, sem alegar corpus válido para todos |
| Truncado / estrutura inválida | REJEITADO | parser antes do decoder; não há garantia universal para corrupção apenas na entropia tolerada por decoders nativos |

A baseline rejeitava CMYK/YCCK por número de componentes, precisão não-8 e SOFs fora do corpus, com mensagens técnicas parcialmente filtradas. A decisão de escopo foi preservada e ganhou erro claro: exportar JPEG RGB8 ou PNG, usando apenas `Item 001` etc.

O Python preservado usa Pillow `convert("RGB")` e aceita as fixtures CMYK/YCCK. A [documentação oficial do Pillow](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#jpeg) descreve leitura de L/RGB/CMYK. Nas sondagens isoladas, Chrome/Edge/Firefox decodificaram ambas; CMYK coincidiu com Python, mas YCCK constante teve erro máximo/médio 1 (acima da média 0,5 exigida para normalização JPEG pela PoC). Isso não prova suporte previsível a todo CMYK/YCCK, perfis ICC e convenções Adobe, nem em Safari. Não há necessidade real demonstrada de ampliar esse escopo; suportar esses casos exigiria corpus de cor mais amplo e decisões de conversão/perfil. Foram rejeitados antes de qualquer bitmap no runtime.

A fixture YCCK não é um CMYK renomeado: contém quatro blocos DCT constantes, tabelas quantização/Huffman, scan e APP14 transform 2; Pillow confirma modo CMYK/transform 2. O corpus é sintético, pequeno e limitado. Mutação de SOFs/precisão em unit tests é somente teste estrutural de rejeição.

O parser remove todos os APP/COM originais antes de decode. Para RGB Adobe ele recria um APP14 fixo com somente a dica de cor 0/1; não copia versão, flags, payloads ou identificadores. Sem essa dica, RGB direto pode ser tratado como YCbCr. O PNG exportado não tem APP14 nem metadados. EXIF/orientação/ICC/XMP/thumbnails originais não entram no decoder nem na saída, como na baseline.

## Capacidades e fallback

Sem inferência pelo nome do navegador. Página: Worker, File/FileReader, Blob e leitores arrayBuffer/stream, ArrayBuffer/typed arrays/DataView, TextEncoder/Decoder, ReadableStream, Response, CompressionStream/DecompressionStream com construtor `deflate`, createImageBitmap, ImageBitmap.close, URL.createObjectURL/revokeObjectURL e Canvas 2D real. Worker verifica suas APIs de bytes/streams e sonda contexto OffscreenCanvas, createImageBitmap e close. Ausência de API obrigatória bloqueia processamento com mensagem neutra; falha em startup/onerror/onmessageerror invalida o lote. As sondagens não substituem decodificação real: incompatibilidades posteriores têm tratamento controlado.

OffscreenCanvas é opcional. Se o Worker não tem bitmap/close/contexto utilizável, ou se a tentativa nativa falha, envia somente o JPEG limpo à página para usar o mesmo `bitmapRGB` com Canvas DOM. Os pixels voltam por buffer transferido e efeitos/encoding/ZIP continuam no Worker. Não há segunda implementação de blur/pixelização, framework, polyfill ou WASM. Worker, bitmap/close na página e streams continuam obrigatórios. Se ambos os caminhos falham, o item recebe erro controlado. Fallback pode produzir uma pausa de UI em JPEG grande e requer teste mobile/Safari real.

## Erros, memória, privacidade e offline

`AnonymizerError` usa códigos fechados; `publicMessage` nunca repassa strings de exceções nativas, prefixos arbitrários, paths, nomes originais, bytes ou stacks. Mensagens específicas: arquivo vazio/grande, extensão, formato real, estrutura/corrupção, APNG, dimensão, JPEG não suportado, processamento e navegador. A UI apresenta só nomes `Item NNN`; erros de processamento excluem o item do ZIP como na baseline.

Bitmaps são fechados em finally; Canvas reduzido a 1×1 em sucesso e falhas; RGB via buffer transferido; callbacks Canvas removem entries/timers, pending requests limpam timers; bytes, pixels e buffers de compressão são locais sem cache. Apenas Blobs de original normalizado/resultado e arquivos selecionados ficam durante a sessão de revisão. URLs de preview são revogadas ao fechar/trocar/invalidate/clear/pagehide; ZIP em invalidação, após download (30 s) ou saída. Elementos e closures de preview são removidos na limpeza. São garantias sobre caminhos exercitados, não sobre GC nem RAM total.

Zero upload, API/backend de processamento, armazenamento remoto/persistente, analytics e telemetry. Nenhuma dependência runtime nova. Auditoria estática de todos os módulos mais instrumentação de página/Worker e interceptação de requests: apenas GETs estáticos de startup são permitidos. Todos os flows browser são colocados offline após carregar página e Worker e completam seleção → processamento → revisão → ZIP → download. Recarregar uma página offline sem cache prévio não é prometido e não foi adicionado service worker.

## Safari desktop / iOS — pendente de teste real

Nenhuma aprovação Safari é declarada; Playwright Firefox ou viewport mobile não certificam WebKit/iOS. Registrar versão de Safari/OS, dispositivo, motor selecionado (Offscreen ou fallback), dimensões/formato e tempo perceptível, somente com dados sintéticos.

- [ ] Seleção por picker e Files/Photos; mensagens sem nomes originais.
- [ ] Lotes 1, 5, 10; 11 rejeitado; arquivos/dimensões grandes controlados.
- [ ] JPEG RGB, grayscale, progressive; CMYK/YCCK rejeitados com orientação útil.
- [ ] Tarja, blur, pixelização e quatro bordas; comparação visual com Python.
- [ ] Original × Anonimizada em todos os itens e em resolução completa; revisão consciente.
- [ ] Invalidação por configuração, ordem, remoção, novos arquivos e reprocessamento.
- [ ] ZIP obrigatório, só após revisão; nomes neutros, somente sucessos e PNG RGB8 sem metadata.
- [ ] Download desktop/iOS, abrir ZIP e PNGs no sistema, sem perda/arquivo vazio.
- [ ] Offline após página/Worker carregados: seleção, processamento, revisão, ZIP/download sem request.
- [ ] Memória/fluidez com 1/5/10 e ciclos repetidos; testar fallback em JPEG grande; observar crash/aba encerrada, sem alegar RAM total.
- [ ] EXIF 1–8 sem giro/troca de dimensões indevida; ICC/nomes/sentinelas ausentes dos exports.
- [ ] PNG RGB, alpha descartado como Python, paleta/16-bit/Adam7; APNG rejeitado.
- [ ] Interface portrait/landscape, scroll, zoom, toque, labels/progresso, sem overflow.
- [ ] Fechar/reload/navegar/voltar: referências eliminadas, revisão não reutilizada; reload online inicia sessão vazia; explicitar limite do reload offline.

## Checklist humano de revisão geral

- [ ] Conferir branch/worktree/base e `git status` limpo após commit.
- [ ] Abrir a PoC local e confirmar visualmente os três modos com 1/5/10 imagens sintéticas.
- [ ] Conferir erro neutro CMYK/YCCK/APNG/corrompido/extensão e limites.
- [ ] Abrir cada comparação, mudar config/ordem/remover/reprocessar e verificar bloqueio do ZIP até nova revisão.
- [ ] Extrair ZIP: nomes neutros, RGB8, dimensões e ausência de metadata.
- [ ] Repetir lote → limpar → lote; fechar/reabrir aba e observar fluidez.
- [ ] DevTools Network offline depois do startup: nenhuma tentativa de envio.
- [ ] Repetir PC e Chrome Android na versão de hardening; aprovação humana anterior vale para a baseline.
- [ ] Executar checklist Safari acima em equipamentos reais antes de declarar compatibilidade.

## Riscos remanescentes

Decoder JPEG continua nativo: tolerância a entropia danificada e diferenças de cor/arredondamento dependem do engine. CMYK/YCCK ficam fora do MVP mesmo se um navegador aceitar uma amostra. Corpus YCCK uniforme não cobre perfis/cores reais. Heap principal não mede native/GPU/Worker/Blobs, e contadores de objetos não demonstram ausência universal de vazamentos. Stress 12 MP cobre tarja; blur extremo nessa resolução e fallback com imagens grandes não estão aprovados. Startup/assets precisam estar carregados para offline. Safari/iOS e a integração futura Next.js permanecem pendentes.

## Resultados executados e evidências

Build TypeScript/esbuild: aprovado. **42 testes Python/Streamlit**, **10 grupos core**, **54 cenários de capacidades** e **516 comparações browser/Python** passaram. Conjunto completo da PoC, extras e stress tarja 1/5/10×12 MP reexecutados em Chrome 155.0.8059.40, Edge 154.0.4258.62, Firefox 142.0.1. Verificação independente Pillow/OpenCV: 144 PNGs funcionais, 48 de stress, 237 do hardening.

Seis ciclos de 10 imagens por navegador: bitmaps da página 6/6 e Worker 62/62 criados/fechados; object URLs 97/97 criadas/revogadas. Não é medição de RAM total. Todas as matrizes de fluxo registraram zero requests/APIs de processamento, offline aprovado e zero erros/crashes não tratados. Capacidades ausentes e falhas locais foram tratadas de forma controlada.

[Resumo e lista completa de arquivos](anonymizer-client-hardening-evidence/summary.json) · [regressão PoC](anonymizer-client-hardening-evidence/browser-report.json) · [extras](anonymizer-client-hardening-evidence/extra-report.json) · [stress](anonymizer-client-hardening-evidence/stress-report.json) · [hardening](anonymizer-client-hardening-evidence/hardening-report.json) · [capacidades](anonymizer-client-hardening-evidence/capabilities-report.json) · [exports independentes](anonymizer-client-hardening-evidence/hardening-export-verification.json) · [auditoria](anonymizer-client-hardening-evidence/audit.json).
