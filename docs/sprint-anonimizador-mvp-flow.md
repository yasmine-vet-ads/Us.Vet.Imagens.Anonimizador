# Sprint — fluxo completo do Anonimizador MVP

Data: 03/10/2026. Status: PRONTO PARA TESTE HUMANO, sujeito à validação humana posterior.

## Base e estado inicial

- Repositório: yasmine-vet-ads/Us.Vet.Imagens.Anonimizador.
- Worktree: `C:\Users\USER\.codex\worktrees\2441\Us.Vet.Imagens.Anonimizador`.
- Branch criada: `codex/anonymizer-mvp-flow`, a partir de `origin/develop` após fetch.
- Base: `3020b83d689a1565c5a7b3478368c862769f9b85`.
- Estado inicial: worktree limpo, HEAD destacado; main e develop em outros worktrees, ambas no mesmo commit após fetch. Não havia AGENTS.md aplicável encontrado.
- O Python global não possuía NumPy: a primeira tentativa falhou na importação. No ambiente virtual existente do projeto, os 4 testes originais passaram (0,086 s) e compileall passou antes da alteração.
- Ambiente usado: `C:\Users\USER\Development\Us.Vet.Imagens.Anonimizador\.venv\Scripts\python.exe`; Streamlit 1.65.0, Pillow 12.3.0, OpenCV 5.0.0, NumPy 2.5.3. Dependências não alteradas.

## Objetivo e mudanças

Completar Upload → Validação → Processamento → Conferência → Download ZIP com revisão humana obrigatória, mantendo o MVP local e simples.

Modificados:

- `app/main.py`: fases explícitas, processamento por botão, pré-validação, conferência de todas as imagens, confirmação global e somente ZIP.
- `app/anonimizador.py`: exportação reconstrói pixels RGB em imagem nova; comentários retiram a garantia implícita da máscara de 4%. A função legada de salvar também usa PNG limpo, mas não é chamada pelo fluxo Streamlit.
- `README.md`, `docs/requisitos.md`, `docs/regras_anonimizacao.md`: alinhamento ao escopo e fatos verificados.
- `notebooks/UsVet_Anonimizador_MVP.ipynb`: convertido em guia sem código executável. O antigo Colab escrevia arquivos, reutilizava nomes e permitia baixar sem revisão; essa rota alternativa foi retirada. O histórico Git preserva a versão antiga.

Criados:

- `app/fluxo.py`: validação, assinatura do lote, invalidação, processamento isolado e ZIP revisado.
- `tests/test_fluxo.py`: 34 testes novos de lógica e metadados.
- `tests/test_interface.py`: 4 testes de interface com AppTest, usando unittest e uploads sintéticos simulados.
- `.streamlit/config.toml`: estatísticas de uso desativadas e endereço local 127.0.0.1.
- Este documento técnico.

## Validação e falhas

Todos os itens são validados antes do botão permitir processamento. Quantidade aceita: 1 a 10. Extensões PNG/JPG/JPEG são confrontadas com o formato real PNG/JPEG; `Image.verify()` verifica integridade, seguida de reabertura e `load()` para decodificar pixels. Vazios, entradas inválidas, incompatibilidades de formato, corrupção, imagens animadas e imagens que ultrapassem as proteções do Pillow são rejeitados.

Um erro em qualquer entrada bloqueia o lote inteiro. O usuário remove/substitui os itens pelo seletor de upload. O seletor nativo mostra os nomes enviados; os erros da aplicação usam apenas Item NNN, sem caminhos ou nomes identificadores. Mensagens inesperadas de bibliotecas não são expostas.

A função de processamento revalida o lote antes de iniciar. Depois, cada item possui tratamento independente incluindo decodificação, máscara e serialização. Falhas ficam no estado em memória, com índice neutro e mensagem controlada; não são gravadas em log pela aplicação. Resultados válidos continuam disponíveis. Se todos falharem, não há revisão/download. Os índices de entrada são preservados, portanto lacunas no ZIP são esperadas.

## Conferência, invalidação e ZIP

Todas as imagens bem-sucedidas são apresentadas Original × Anonimizada. Há escolha entre duas colunas e disposição vertical simples para telas pequenas. A confirmação global aparece após todas as comparações, sem aprovação por imagem.

A assinatura SHA-256 inclui nome, conteúdo e ordem dos uploads, e todas as configurações de saída. Uma mudança descarta os resultados, falhas e confirmação da sessão. Isso também cobre inclusão/remoção e mudança de modo ou de qualquer faixa. Reprocessar o mesmo lote revoga a confirmação. Trocar somente a disposição visual não altera os pixels e preserva a revisão.

Somente após o usuário marcar “Revisei visualmente todas as imagens processadas” o ZIP é gerado e o botão aparece. A função de ZIP recusa resultados vazios ou confirmação ausente. Mesmo uma única imagem gera ZIP. Não há botão de download individual nem célula de notebook que o implemente.

Conteúdo: somente PNG RGB bem-sucedidos. Nomes: `imagem_anonimizada_001.png` etc.; ZIP: `usvet_imagens_anonimizadas.zip`. O ZIP não contém originais, relatório, nomes de entrada ou falhas. Cabeçalhos ZIP incluem informações técnicas de criação/compressão, sem copiar datas ou caminhos dos uploads.

**ANONIMIZAÇÃO VERIFICADA** significa conferência humana visual declarada pelo usuário. O software não prova que a revisão ocorreu ou que não restaram identificadores.

**ANONIMIZAÇÃO VERIFICADA ≠ AUTORIZAÇÃO EDITORIAL.**
**ANONIMIZAÇÃO TÉCNICA ≠ AUTORIZAÇÃO EDITORIAL.**

Não há autorização automática para Learn, Case Atlas, Resources ou qualquer publicação.

## Fatos técnicos para Jurídico/Privacidade

| Tema | Fato observado e limite |
| --- | --- |
| Processamento | Local no processo Streamlit; navegador envia bytes ao servidor local. Pillow/NumPy/OpenCV processam em memória. |
| Persistência de imagens no servidor | O fluxo `main.py`/`fluxo.py` não grava imagens ou ZIP em disco. |
| Temporários | Nenhum arquivo temporário de imagem/ZIP criado pelo fluxo. `BytesIO` não é arquivo em disco. Python pode criar `__pycache__`/`.pyc` de código; compileall os cria. Não contêm imagens. |
| Função legada | `salvar_sem_metadados` grava no destino explícito caso chamada por código externo. Não é usada pela aplicação Streamlit; teste usa BytesIO. |
| Cache da aplicação | Nenhum `st.cache_data`/`st.cache_resource`. Resultados e declaração de revisão ficam em `st.session_state`. |
| Buffers do framework | Streamlit 1.65.0 usa `MemoryUploadedFileManager` e `MemoryMediaFileStorage` na construção do servidor; uploads, prévias e downloads permanecem em memória, inclusive originais para comparação. Não há promessa de limpeza imediata. |
| Nomes de entrada | Existem em memória e no seletor nativo; assinatura os inclui via hash. Não são usados em saídas, erros ou logs da aplicação. |
| Logs | A aplicação não configura logs persistentes nem registra conteúdo/nome de imagem. Streamlit/Python podem emitir mensagens no terminal, que podem ser persistidas por redirecionamento ou infraestrutura externa. Não há auditoria total do sistema operacional. |
| Banco/histórico | Nenhum banco ou histórico implementado. Estado volátil de sessão não é histórico permanente. |
| Chamadas externas | Não há chamadas de processamento a APIs externas ou serviços terceiros no código da aplicação. Dependências locais de terceiros são usadas. Instalação de pacotes e operações Git podem acessar rede, fora do fluxo de imagens. Não foi feita captura completa de tráfego de navegador/SO. |
| Telemetria | Configuração local `browser.gatherUsageStats=false`, confirmada no ambiente. Execução deve ocorrer na raiz; opções de ambiente/CLI podem sobrescrever configuração. Não se afirma ausência universal de telemetria do computador/navegador. |
| Endereço | Configuração local `server.address=127.0.0.1`, confirmada. Não há autenticação. Não publicar nem expor o servidor. |
| EXIF | Testes com campos realmente preenchidos (descrição, autor e data) em JPEG/PNG verificam ausência de EXIF na saída, inclusive exportação direta. |
| Outros metadados | Texto PNG tEXt/iTXt, ICC e DPI sintéticos são presentes na entrada e não copiados à saída verificada. A imagem exportada é reconstruída dos pixels RGB; não há garantia sobre todas as categorias possíveis nem sobre identificadores visuais. |
| ZIP | Gerado em memória após confirmação; navegador baixa arquivo permanente no destino configurado. Sua exclusão cabe ao usuário. |
| Alteração/remoção | Descarta referências aos resultados e à revisão do estado da aplicação; framework/browser podem reter buffers antigos. Não é apagamento seguro. |
| Fechar aba | Não implica apagar imediatamente: o TTL efetivo de sessões desconectadas observado é 120 s. É parâmetro do framework, não prazo garantido de eliminação de todos os buffers. Reconexões podem preservar sessão/revisão enquanto a mesma saída persistir. |
| Encerrar processo | Encerra o estado volátil do processo. Não remove ZIPs baixados, arquivos externos, cache do navegador, swap, dumps ou backups; não há garantia de sobrescrita segura de memória. |
| Terceiros/nuvem | Nenhum upload a Colab/Cloudinary ou integração externa neste MVP. Notebook agora é guia sem execução. |

A inspeção foi do código da aplicação, configuração efetiva e implementação instalada dos gestores de upload/mídia/sessão do Streamlit; não equivale a perícia de retenção do SO nem a teste de rede completo.

## Testes e evidência

42 testes totais: 4 originais + 38 novos (34 lógica/metadados e 4 interface). Todos usam somente dados sintéticos. Subtestes ampliam combinações sem inflar a contagem de métodos.

Cobertura: lotes com 1/múltiplas/10/>10 imagens; PNG/JPG/JPEG; vazio, extensão real divergente, conteúdo inválido, corrupção, entrada inválida, APNG; validação completa e bloqueio; segurança Pillow; mensagens neutras; falhas de máscara e serialização isoladas, sucesso parcial e falha total; ZIP válido com somente sucessos, uma imagem e nomes neutros; tarja/desfoque/pixelização; quatro bordas e combinação; tamanhos pequenos, 1600×1200 e proporções extremas; RGB PNG; EXIF preenchido, ICC, DPI e texto PNG; invalidação por configuração/lote e preservação da disposição visual; ZIP ausente até confirmação, revisão de todos os resultados e ausência de download individual na interface.

A primeira rodada dos testes novos de interface teve duas falhas no próprio teste: foi usado o nome incorreto do elemento de imagem no AppTest. Corrigido para `image`; os testes passaram. Avisos de API obsoleta `use_container_width` levaram à atualização para `width="stretch"`. Os avisos `missing ScriptRunContext` são do harness AppTest em modo de teste, sem exceções na aplicação.

Comandos de verificação neste worktree:

```powershell
& 'C:\Users\USER\Development\Us.Vet.Imagens.Anonimizador\.venv\Scripts\python.exe' -m unittest discover -s tests -v
& 'C:\Users\USER\Development\Us.Vet.Imagens.Anonimizador\.venv\Scripts\python.exe' -m compileall app tests
```

Resultado final completo do unittest: `Ran 42 tests in 2.941s` — `OK` (0 falhas, 0 erros). Compileall de app/tests passou, sem erros. `git diff --check` passou. O servidor local iniciou em 127.0.0.1:8501; `/_stcore/health` respondeu HTTP 200 com `ok`. A instância de verificação foi encerrada após o teste. A seleção real pelo navegador e o download permanecem para o teste humano posterior.

## Teste humano local — instruções exatas

Abra PowerShell:

```powershell
Set-Location 'C:\Users\USER\.codex\worktrees\2441\Us.Vet.Imagens.Anonimizador'
& 'C:\Users\USER\Development\Us.Vet.Imagens.Anonimizador\.venv\Scripts\python.exe' -m streamlit run app/main.py --server.address 127.0.0.1 --server.port 8501 --browser.gatherUsageStats false
```

Abra http://localhost:8501. Se a porta estiver ocupada, encerre a instância anterior ou use explicitamente outra porta e seu endereço correspondente. Não iniciar o código de main na pasta principal por engano: o diretório acima contém esta branch.

Use o seletor de arquivos do navegador para acessar o lote externo preparado em `C:\Users\USER\Development\anonimizador-testes`. Essa pasta não foi lida, copiada ou versionada pelo sprint. Utilize somente imagens sintéticas ou previamente anonimizadas e revisadas; não usar clínicas identificáveis.

Checklist:

- [ ] Upload de uma imagem; processamento exige clique; ZIP ausente antes da revisão.
- [ ] Upload de múltiplas imagens e 10 arquivos; todas as comparações aparecem.
- [ ] Mais de 10, arquivo vazio/corrompido ou extensão enganosa bloqueiam o processamento; remover/substituir permite continuar.
- [ ] Tarja, desfoque, pixelização e quatro bordas; conferir identificação residual e região diagnóstica.
- [ ] Disposição vertical em tela menor; conferir todas as imagens.
- [ ] Marcar revisão libera um único botão ZIP; uma imagem também gera ZIP.
- [ ] Trocar arquivo, lote, modo ou qualquer máscara remove a revisão e exige novo processamento/confirmação.
- [ ] Reprocessar o mesmo lote revoga a revisão; trocar só a disposição visual preserva a revisão.
- [ ] Abrir o ZIP e conferir nomes neutros, PNG RGB e apenas resultados válidos.
- [ ] Encerrar o Streamlit com Ctrl+C; decidir sobre retenção/exclusão do ZIP baixado.

## Limitações e pendências

- Teste humano real de seleção de arquivos, aparência em diferentes tamanhos de tela e download no navegador ainda pendente. AppTest simula uploads; não substitui esse teste.
- Máscaras são globais; não há OCR/detecção automática ou confirmação por IA. 4% pode ser insuficiente; faixas podem arredondar para zero em imagens muito pequenas. Blur/pixelização não garantem ilegibilidade.
- A memória disponível e as proteções do Pillow limitam arquivos grandes. Não há novo limite agregado de bytes; o limite de upload do Streamlit também se aplica.
- Declaração global é humana; o sistema não comprova que todas as imagens foram de fato examinadas.
- Não há apagamento seguro, gestão de arquivos baixados nem promessa universal de remoção de metadados.
- Dependências permanecem sem pinagem, como antes; versões distintas podem ter diferenças de interface/retenção e exigem nova verificação.
- Nenhum recurso pós-MVP adicionado. Não houve merge, deploy, publicação, envio remoto ou integração com a plataforma principal. Aguardar validação humana.
