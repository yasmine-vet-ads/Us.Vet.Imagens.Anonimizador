# Us.Vet.Imagens.Anonimizador

**MVP open source para anonimização de imagens ultrassonográficas veterinárias.**

O **Us.Vet.Imagens.Anonimizador** é um projeto desenvolvido para auxiliar na remoção de dados sensíveis presentes em imagens ultrassonográficas veterinárias, como nome do paciente, tutor, ID do exame, data, clínica ou outras informações exibidas na tela do aparelho.

A proposta surgiu a partir da rotina em diagnóstico por imagem veterinário, especialmente na ultrassonografia de cães e gatos, onde imagens clínicas podem conter informações identificáveis. O projeto busca criar uma solução simples, acessível e aplicável para preparar imagens com mais segurança antes de uso em estudo, documentação técnica, banco de imagens, portfólio acadêmico ou projetos futuros de análise de dados e inteligência artificial.

---

## Objetivo do projeto

Criar um MVP capaz de anonimizar imagens ultrassonográficas veterinárias por meio de processamento de imagem, preservando a região diagnóstica e removendo áreas com dados sensíveis.

Nesta primeira versão, o sistema permite aplicar uma tarja automática em regiões específicas da imagem, com foco inicial no canto inferior direito, onde determinados aparelhos exibem nome do paciente, tutor e ID do exame.

---

## Problema

Na rotina de ultrassonografia veterinária, as imagens dos exames muitas vezes contêm dados sensíveis incorporados diretamente na imagem.

Isso dificulta o uso seguro dessas imagens para:

- estudo;
- ensino;
- organização de casuística;
- trabalhos acadêmicos;
- construção de banco de imagens;
- portfólio técnico;
- pesquisa;
- aplicações futuras de visão computacional.

Além disso, a anonimização manual pode ser demorada, repetitiva e sujeita a falhas.

---

## Solução proposta

O projeto utiliza Python e bibliotecas de processamento de imagem para aplicar anonimização automática em áreas configuráveis da imagem.

A primeira versão do MVP permite:

- carregar uma imagem ultrassonográfica;
- definir regiões sensíveis;
- aplicar tarja preta, desfoque ou pixelização;
- preservar a maior parte da imagem diagnóstica;
- visualizar o resultado antes e depois;
- baixar a imagem anonimizada.

---

## Funcionalidades do MVP

- Upload de imagem no Google Colab.
- Leitura da imagem com Python.
- Conversão da imagem para processamento.
- Anonimização por região.
- Máscara seletiva no canto inferior direito.
- Ajuste da largura e altura da faixa de anonimização.
- Visualização comparativa antes/depois.
- Download da imagem anonimizada.
- Estrutura inicial para evolução futura em lote e interface web.

---

## Tecnologias utilizadas

- Python
- Google Colab
- OpenCV
- Pillow
- NumPy
- Matplotlib

---

## Como usar no Google Colab

1. Abra o notebook do projeto no Google Colab.
2. Execute a célula de importação das bibliotecas.
3. Envie uma imagem ultrassonográfica de teste.
4. Execute a célula de carregamento da imagem.
5. Aplique a função de anonimização do canto inferior direito:

```python
imagem_anonimizada = anonimizar_canto_inferior_direito(
    imagem_original,
    modo="tarja",
    largura_percent=55,
    altura_percent=3
)

mostrar_antes_depois(imagem_original, imagem_anonimizada)
