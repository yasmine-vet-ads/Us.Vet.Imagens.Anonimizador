# Regras de Anonimização

Este projeto tem como objetivo reduzir o risco de exposição de dados sensíveis presentes em imagens ultrassonográficas veterinárias.

## Dados que devem ser removidos

- Nome do tutor.
- Nome do paciente.
- Nome da clínica.
- Nome do profissional.
- Número de prontuário.
- Data do exame, se permitir identificação.
- Telefone.
- Endereço.
- Identificação do equipamento, quando necessário.
- Qualquer dado pessoal visível na imagem.

## Estratégia do MVP

A primeira versão utiliza máscaras por região, pois muitos aparelhos exibem informações sensíveis em áreas previsíveis da imagem, especialmente na faixa superior.

## Limitações

A anonimização automática pode falhar se os dados estiverem em regiões não configuradas.

Toda imagem deve ser revisada manualmente antes de publicação, compartilhamento ou uso acadêmico.

## Recomendação

No GitHub público, utilizar apenas:

- imagens fictícias;
- imagens já anonimizadas;
- prints de demonstração;
- bases simuladas.
