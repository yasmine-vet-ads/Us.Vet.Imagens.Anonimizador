# Us.Vet Image Anonymizer

MVP local e independente para aplicar máscaras em imagens ultrassonográficas veterinárias. A revisão visual humana é obrigatória antes do download.

## Fluxo e escopo

**Upload → Validação → Processamento → Conferência → Download ZIP**

- De 1 a 10 imagens estáticas PNG/JPG/JPEG por lote.
- Validação de extensão, formato real, integridade e decodificação de todos os arquivos antes de processar.
- Tarja preta, desfoque ou pixelização com máscaras nas quatro bordas; configuração única para o lote.
- Processamento iniciado explicitamente por botão. Falhas inesperadas são isoladas por item.
- Comparação de todas as imagens bem-sucedidas: lado a lado ou vertical para telas menores.
- Confirmação global: **Revisei visualmente todas as imagens processadas.**
- Somente ZIP, inclusive para uma imagem; sem download individual.
- Saída PNG RGB e nomes neutros `imagem_anonimizada_001.png`, `imagem_anonimizada_002.png` etc. Falhas podem deixar lacunas na numeração.

Alterar conteúdo, nome, ordem, quantidade, modo ou máscaras descarta resultados e revisão. Reprocessar também exige nova confirmação. Mudar somente a disposição visual preserva a revisão.

**4% nas faixas superior e inferior é apenas um ponto de partida.** Máscaras não garantem anonimização universal nem preservação diagnóstica. Texto fora das regiões pode continuar visível; desfoque e pixelização podem deixar texto reconhecível. Confira cada resultado antes de usar ou compartilhar.

**ANONIMIZAÇÃO VERIFICADA** significa que o usuário declarou ter realizado conferência humana visual.
**ANONIMIZAÇÃO VERIFICADA ≠ AUTORIZAÇÃO EDITORIAL.** Uma imagem tecnicamente anonimizada não fica automaticamente autorizada para Learn, Case Atlas, Resources ou qualquer publicação.

OCR, DICOM, IA, login, histórico, banco de imagens, nuvem, API externa, máscaras diferentes por imagem e integração com a plataforma principal estão fora do MVP.

## Execução local

Python e as dependências de `requirements.txt` são necessários. Não houve alteração de dependências neste ciclo.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m streamlit run app/main.py --server.port 8501
```

Execute a partir da raiz do repositório para carregar `.streamlit/config.toml`, que configura acesso em `127.0.0.1` e desativa estatísticas de uso do Streamlit. URL esperada: http://localhost:8501.

1. Selecione arquivos; remova ou substitua todos os itens inválidos indicados por referência neutra.
2. Ajuste modo e bordas; clique em **Processar lote**.
3. Confira todas as imagens e eventuais falhas, preservação diagnóstica e identificação residual.
4. Confirme a revisão visual global e baixe `usvet_imagens_anonimizadas.zip`.

O notebook existente contém apenas um guia; o antigo fluxo executável em Colab foi retirado.

## Privacidade e metadados

O fluxo Streamlit não grava imagens ou ZIP no disco do servidor: usa bytes, imagens/arrays, `BytesIO` e estado de sessão em memória. Uploads são enviados do navegador ao processo Streamlit local. Prévias e download ficam também nos buffers de mídia em memória do framework; não se usa `st.cache_data` ou `st.cache_resource`. Não há banco, histórico ou logs persistentes implementados pela aplicação. O terminal pode receber avisos do framework.

O ZIP baixado é um arquivo persistente no destino do navegador, sob controle do usuário. Fechar a aba não garante exclusão imediata: o framework pode reter a sessão desconectada e seus buffers. Encerrar o processo termina o estado volátil, sem garantia de apagamento seguro de memória, swap, cache do navegador ou backups do sistema.

A exportação reconstrói uma imagem nova a partir dos pixels RGB. Testes com EXIF preenchido em JPEG/PNG, texto PNG, ICC e DPI verificam que esses campos não são copiados à saída. Isso não equivale a uma garantia genérica de remoção de todos os metadados ou de dados escritos nos pixels.

Fatos técnicos, limites de retenção e instruções exatas para teste humano estão em [docs/sprint-anonimizador-mvp-flow.md](docs/sprint-anonimizador-mvp-flow.md).

## Verificação automatizada

Somente imagens sintéticas geradas em memória:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -m compileall app tests
```

Os testes incluem validação, limites, falhas isoladas, máscaras, tamanhos/proporções, EXIF preenchido, PNG RGB, ZIP neutro e controle da revisão, com testes da interface via `streamlit.testing.v1.AppTest` dentro de unittest.

Não copie nem versione imagens clínicas ou a pasta externa de teste humano.

## Documentação

- [Requisitos](docs/requisitos.md)
- [Regras de anonimização](docs/regras_anonimizacao.md)
- [Sprint e privacidade técnica](docs/sprint-anonimizador-mvp-flow.md)

## Autoria e licença

Yasmine Santos — Veterinária especializada em Diagnóstico por Imagem; estudante de Análise e Desenvolvimento de Sistemas, IFRS. [GitHub](https://github.com/yasmine-vet-ads).

Consulte [LICENSE](LICENSE).
