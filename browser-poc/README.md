# Image Anonymizer — POC client-side

POC técnica isolada. A referência Python/Streamlit continua em ../app, intacta. Não é a versão pública definitiva.

Requer Node.js 22+ somente para compilar e servir assets locais. O processamento roda no navegador.

```powershell
cd browser-poc
npm ci
npm run build
npm start
```

Abra http://127.0.0.1:4173. Selecione imagens sintéticas, ajuste as quatro faixas e processe. Confira Original × Anonimizada de **todos** os itens, declare a revisão global e baixe o ZIP. As comparações são abertas uma por vez para limitar memória, com opção de inspeção em resolução completa. Mudanças descartam resultados e confirmação.

O servidor Node atende apenas GET/HEAD de quatro assets estáticos. Não recebe arquivos, não lê corpos de requisição e não processa imagens. Depois de carregar os assets e o Worker, o fluxo funciona offline, sem recarregar a página.

Zero dependências de runtime. Os PNGs exportados são RGB truecolor de 8 bits, com encoder local determinístico de estrutura (IHDR/IDAT/IEND). ZIP local STORE, inclusive com um item. Sem analytics nem armazenamento persistente implementado. A aplicação não controla decisões internas de caching do navegador.

Limites da POC: 10 arquivos, 64 MiB por arquivo, 12 MP, lado máximo 8192; JPEG de 8 bits RGB/cinza baseline ou progressivo. CMYK/YCCK, JPEG aritmético/12 bits e formatos além de PNG/JPG/JPEG são rejeitados. Esta redução de escopo está documentada; não se declara equivalência universal.

Documentação e resultados: [relatório técnico](../docs/anonymizer-client-poc.md).
Reprodução dos testes: [tests/README.md](tests/README.md).
