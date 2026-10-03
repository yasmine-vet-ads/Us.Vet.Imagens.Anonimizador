# Requisitos do MVP

Aplicação local independente, Python/Streamlit/Pillow/OpenCV/NumPy, sem integração com a plataforma principal.

## Requisitos funcionais

- Upload de 1 a 10 imagens estáticas PNG/JPG/JPEG.
- Validar o lote inteiro: extensão e formato real compatíveis, arquivo não vazio, integridade e decodificação completa. Entradas inválidas bloqueiam o botão de processamento até remoção/substituição pelo usuário.
- Processamento explícito com configuração global: tarja preta, desfoque ou pixelização; faixas superior, inferior, esquerda e direita.
- Isolar falhas inesperadas por arquivo, apresentar referência neutra e preservar as demais saídas; não exportar itens falhos.
- Conferir todas as imagens bem-sucedidas Original × Anonimizada, lado a lado ou verticalmente.
- Exigir confirmação global de revisão visual antes de liberar ZIP.
- Invalidar resultados e revisão quando mudam arquivos, conteúdo, nomes, ordem ou qualquer configuração de saída. Novo processamento revoga confirmação anterior.
- Exportar somente ZIP, inclusive para uma imagem; sem download individual. Somente PNG RGB bem-sucedidos, com nomes `imagem_anonimizada_NNN.png`.
- Reconstruir pixels RGB na exportação sem copiar metadados de entrada. Escopo verificado: EXIF preenchido JPEG/PNG, texto PNG, ICC e DPI sintéticos; sem promessa universal.

## Requisitos não funcionais

- Simplicidade, modularidade e testes unittest com dados exclusivamente sintéticos.
- Fluxo em memória, sem arquivos de imagem/ZIP temporários ou armazenamento permanente no servidor pela aplicação.
- Não implementar banco, histórico ou logs persistentes de imagens. Buffers de sessão/mídia do Streamlit são voláteis e não constituem garantia de exclusão imediata.
- Sem chamadas a APIs externas no fluxo de imagens; uso local com estatísticas de uso do Streamlit desativadas na configuração do projeto.
- Informar limitações das máscaras e necessidade de inspeção visual de identificação residual e preservação diagnóstica. 4% não garante anonimização.

**ANONIMIZAÇÃO VERIFICADA** significa conferência humana visual declarada pelo usuário.
**ANONIMIZAÇÃO VERIFICADA ≠ AUTORIZAÇÃO EDITORIAL.** Isso não autoriza automaticamente Learn, Case Atlas, Resources ou qualquer publicação.

## Fora do MVP

OCR, DICOM, IA, reconhecimento de texto, detecção de dados pessoais, histórico, banco de imagens, autenticação, nuvem, API externa, integração Next.js/Atlas/Cloudinary, editor avançado, máscaras por imagem e aprovação editorial automática.

Retenção, exclusão, telemetria e limites técnicos: consulte `sprint-anonimizador-mvp-flow.md`.
