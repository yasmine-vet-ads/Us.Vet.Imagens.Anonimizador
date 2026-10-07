export const MESSAGES = {
  invalid: 'Arquivo vazio ou acima do limite de 64 MiB.',
  extension: 'Selecione um arquivo PNG, JPG ou JPEG.',
  format: 'O formato do arquivo não corresponde à extensão selecionada.',
  corrupt: 'A imagem está corrompida ou tem estrutura inválida. Exporte uma nova cópia e tente novamente.',
  apng: 'Imagens animadas APNG não são aceitas. Exporte um PNG estático.',
  dimensions: 'A imagem excede o limite de 12 megapixels ou 8192 pixels por lado.',
  jpeg: 'A codificação deste JPEG não é suportada. Exporte como JPEG RGB de 8 bits ou PNG.',
  processing: 'Não foi possível processar a imagem com segurança. Reduza o tamanho ou tente novamente.',
  browser: 'Este navegador não oferece os recursos necessários. Use outro navegador atualizado.',
  config: 'Configuração de máscara inválida.'
} as const;
export type ErrorCode = keyof typeof MESSAGES;
export class AnonymizerError extends Error {
  constructor(readonly code: ErrorCode) { super(MESSAGES[code]); this.name='AnonymizerError'; }
}
export function publicMessage(error: unknown): string {
  return error instanceof AnonymizerError ? MESSAGES[error.code] : MESSAGES.processing;
}
