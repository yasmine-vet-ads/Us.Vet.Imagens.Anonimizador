# Us.Vet.Imagens.Anonimizador

**MVP para anonimização de imagens ultrassonográficas veterinárias.**

O **Us.Vet.Imagens.Anonimizador** é uma aplicação desenvolvida em Python para auxiliar na remoção de dados sensíveis presentes em imagens ultrassonográficas veterinárias, como nome de paciente, tutor, clínica, data, número de exame e outras informações exibidas na tela do aparelho.

O projeto surgiu a partir da rotina em diagnóstico por imagem veterinário e tem como objetivo preparar imagens de forma mais segura para estudo, organização, banco de imagens, documentação técnica e futuros projetos em VetTech, HealthTech e IA aplicada.

---

## Objetivo do MVP

Criar uma ferramenta simples capaz de:

- receber imagens ultrassonográficas;
- aplicar anonimização automática em regiões sensíveis;
- permitir escolha entre tarja preta, desfoque ou pixelização;
- visualizar imagem original e imagem tratada;
- baixar a imagem anonimizada;
- processar imagens individualmente ou em lote;
- remover metadados do arquivo final.

---

## Problema

Imagens de exames ultrassonográficos podem conter dados sensíveis incorporados diretamente na imagem. Isso dificulta o uso seguro dessas imagens em:

- estudos;
- aulas;
- portfólio;
- trabalhos acadêmicos;
- banco de imagens;
- projetos de análise de dados;
- futuras aplicações de visão computacional.

---

## Solução proposta

O MVP utiliza processamento de imagens para aplicar máscaras em áreas onde os dados sensíveis geralmente aparecem, como topo, rodapé e laterais da imagem.

A aplicação permite ajustar as áreas de anonimização e revisar o resultado antes do download.

---

## Stack

- Python
- Streamlit
- OpenCV
- Pillow
- NumPy

---

## Funcionalidades atuais

- Upload de imagem.
- Anonimização por regiões.
- Opções de tratamento:
  - tarja preta;
  - desfoque;
  - pixelização.
- Download da imagem anonimizada.
- Processamento em lote com exportação em `.zip`.

---

## Cuidados com privacidade

Este projeto não substitui revisão humana.

Antes de usar ou publicar qualquer imagem, revise se todos os dados sensíveis foram removidos.

Não devem ser publicados no GitHub:

- nome do tutor;
- nome do paciente;
- nome da clínica;
- telefone;
- endereço;
- número de prontuário;
- dados clínicos identificáveis;
- imagens reais sem anonimização adequada.

---

## Status

🚧 MVP em desenvolvimento.

---

## Autora

**Yasmine Santos**  
Estudante de Análise e Desenvolvimento de Sistemas pelo IFRS  
Médica-veterinária especialista em Diagnóstico por Imagem  
Interesses: VetTech, HealthTech, processamento de imagens, dados, automação e IA aplicada.
