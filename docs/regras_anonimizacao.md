# Regras de anonimização

A ferramenta reduz a exposição de dados visíveis por máscaras nas bordas configuradas; não detecta identificadores automaticamente.

## Conferência humana obrigatória

Inspecione todas as saídas para conferir nomes de paciente, tutor, clínica e profissional, prontuário/ID, datas identificáveis, telefone, endereço e outros identificadores, inclusive fora das bordas. Verifique também se a região diagnóstica foi preservada suficientemente.

Faixas iniciais de 4% não cobrem todos os layouts. Imagens pequenas podem ter faixas arredondadas para zero pixels. Desfoque e pixelização podem deixar texto reconhecível. Se o resultado não for adequado, ajuste a configuração, reprocesse e revise novamente; não confirme uma saída que ainda contém identificação.

A interface apresenta todas as imagens bem-sucedidas, com comparação lado a lado ou vertical. O usuário declara **Revisei visualmente todas as imagens processadas** antes de liberar o único download: ZIP, mesmo para uma imagem. Arquivos inválidos bloqueiam processamento; falhas inesperadas são indicadas por item neutro e excluídas do ZIP.

Mudanças em lote, nome, conteúdo, ordem, modo ou máscaras invalidam resultados e revisão. Reprocessar exige nova confirmação.

## Significado e autorização

**ANONIMIZAÇÃO VERIFICADA** significa conferência humana visual declarada pelo usuário; o software não comprova que a revisão foi efetivamente realizada nem que todos os identificadores desapareceram.

**ANONIMIZAÇÃO VERIFICADA ≠ AUTORIZAÇÃO EDITORIAL.**
**ANONIMIZAÇÃO TÉCNICA ≠ AUTORIZAÇÃO EDITORIAL.**

Uma imagem tecnicamente anonimizada não se torna automaticamente autorizada para Learn, Case Atlas, Resources ou qualquer publicação. A autorização editorial deve ser obtida pelo processo próprio, fora desta ferramenta.

## Saída e escopo

PNG RGB, nomes neutros `imagem_anonimizada_NNN.png`, sem reutilizar o nome original. A saída é reconstruída a partir dos pixels. EXIF preenchido de entradas JPEG/PNG, texto PNG, ICC e DPI não são copiados nos casos sintéticos testados; não se promete remoção universal de metadados nem de identificação nos pixels.

DICOM, OCR, IA, histórico e banco de imagens estão fora do MVP. O repositório e os testes devem conter somente dados sintéticos. Não copiar a pasta externa de teste humano para o Git.

O fluxo Streamlit local trabalha em memória. O arquivo baixado persiste no computador do usuário; fechar a aba não implica exclusão imediata dos buffers. Consulte `sprint-anonimizador-mvp-flow.md` para os fatos técnicos de privacidade.
