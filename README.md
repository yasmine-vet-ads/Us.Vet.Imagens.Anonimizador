# Us.Vet.Imagens.Anonimizador

MVP open source para anonimização de imagens ultrassonográficas veterinárias.

O **Us.Vet.Imagens.Anonimizador** é um projeto desenvolvido para auxiliar na remoção de dados sensíveis presentes em imagens ultrassonográficas veterinárias, como nome do paciente, tutor, ID do exame, data, clínica ou outras informações exibidas na tela do aparelho.

A proposta surgiu a partir da rotina em diagnóstico por imagem veterinário, especialmente na ultrassonografia de cães, gatos e pequenos mamíferos, onde imagens podem conter informações identificáveis que precisam ser protegidas antes de uso em estudos, aulas, apresentações, publicações, portfólio ou desenvolvimento de projetos com dados clínicos.

---

## Objetivo

Criar uma ferramenta simples para apoiar a anonimização de imagens ultrassonográficas veterinárias, permitindo que o usuário selecione áreas sensíveis da imagem e gere uma versão protegida para uso educacional, acadêmico ou técnico.

O projeto tem foco em:

- privacidade de dados;
- diagnóstico por imagem veterinária;
- anonimização de imagens;
- documentação técnica;
- uso educacional e acadêmico;
- automação de processos;
- desenvolvimento de soluções VetTech.

---

## Problema

Imagens ultrassonográficas frequentemente exibem informações sensíveis na tela, como:

- nome do paciente;
- nome do tutor;
- data do exame;
- identificação do aparelho;
- clínica ou hospital;
- número do exame;
- dados administrativos;
- outras informações pessoais ou institucionais.

Quando essas imagens são usadas em materiais acadêmicos, aulas, publicações, apresentações, portfólio ou bases de teste, é necessário remover ou ocultar esses dados para preservar a privacidade.

A anonimização manual pode ser demorada, pouco padronizada e sujeita a falhas.

---

## Solução proposta

O projeto propõe um MVP para facilitar esse processo, permitindo carregar uma imagem ultrassonográfica, selecionar áreas que devem ser ocultadas e gerar uma nova imagem anonimizada.

A ferramenta foi pensada para ser simples, prática e alinhada a problemas reais da rotina veterinária.

---

## Público-alvo

- Médicos-veterinários;
- ultrassonografistas veterinários;
- estudantes de Medicina Veterinária;
- pesquisadores;
- professores;
- clínicas e hospitais veterinários;
- projetos de diagnóstico por imagem;
- iniciativas de HealthTech e VetTech.

---

## Status do projeto

🚧 MVP em desenvolvimento.

O projeto já possui uma estrutura inicial com aplicação, documentação e exemplo de imagem anonimizada.

---

## Funcionalidades previstas

- Upload de imagem ultrassonográfica;
- visualização da imagem original;
- seleção de áreas sensíveis;
- aplicação de tarja ou ocultação visual;
- geração de imagem anonimizada;
- download da imagem processada;
- documentação das regras de anonimização;
- evolução para fluxos mais automatizados.

---

## Funcionalidades futuras

- Detecção semiautomática de áreas com texto;
- suporte a múltiplas imagens;
- padronização de exportação;
- melhoria da interface;
- processamento em lote;
- comparação antes/depois;
- integração com fluxos de organização documental;
- uso conjunto com sistemas de consulta e documentação técnica.

---

## Tecnologias utilizadas

- Python;
- Streamlit;
- OpenCV;
- Jupyter Notebook;
- Git e GitHub.

---

## Estrutura do repositório

```text
Us.Vet.Imagens.Anonimizador/
│
├── app/
│   └── anonimizador.py
│
├── docs/
│   └── regras_anonimizacao.md
│
├── notebooks/
│
├── .gitignore
├── LICENSE
├── README.md
├── imagem_anonimizada.png
└── requirements.txt
```

---

## Como executar o projeto

### Requisitos

- Python 3 instalado;
- dependências listadas em `requirements.txt`.

### Instalação

Clone o repositório:

```bash
git clone https://github.com/yasmine-vet-ads/Us.Vet.Imagens.Anonimizador.git
```

Acesse a pasta do projeto:

```bash
cd Us.Vet.Imagens.Anonimizador
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

Execute a aplicação:

```bash
streamlit run app/anonimizador.py
```

---

## Exemplo de uso

1. O usuário carrega uma imagem ultrassonográfica;
2. identifica regiões com dados sensíveis;
3. aplica a anonimização visual;
4. confere a imagem final;
5. exporta a versão anonimizada.

Esse fluxo pode apoiar o preparo de imagens para:

- aulas;
- estudos de caso;
- apresentações;
- portfólio técnico;
- publicações;
- bases de teste;
- documentação interna.

---

## Regras de anonimização

A documentação das regras de anonimização está disponível em:

- [`docs/regras_anonimizacao.md`](docs/regras_anonimizacao.md)

Esse documento orienta quais informações devem ser removidas ou ocultadas antes do uso de imagens em contextos educacionais, acadêmicos ou técnicos.

---

## Projeto relacionado

Este projeto se conecta ao repositório [Ia-Vet-Doc](https://github.com/yasmine-vet-ads/Ia-Vet-Doc), voltado à organização, consulta e estruturação de documentos veterinários.

Enquanto o **Us.Vet.Imagens.Anonimizador** tem foco na remoção de dados sensíveis em imagens ultrassonográficas, o **Ia-Vet-Doc** explora o processamento de documentos, laudos e informações técnicas com apoio de IA aplicada e consulta contextual.

Juntos, os dois projetos representam uma linha de desenvolvimento voltada à aplicação de tecnologia na rotina de diagnóstico por imagem veterinária, com atenção a:

- privacidade de dados;
- documentação técnica;
- organização de informações clínicas;
- automação;
- apoio à tomada de decisão;
- inovação aplicada à Medicina Veterinária.

Essa conexão reforça a proposta de criar soluções digitais para problemas reais observados na rotina veterinária.

---

## Possível evolução integrada

No futuro, os dois projetos podem compor um fluxo mais completo:

1. anonimização de imagens ultrassonográficas;
2. organização de laudos e documentos técnicos;
3. consulta contextual a informações clínicas;
4. estruturação de achados;
5. apoio à documentação veterinária;
6. preparação de dados para ensino, pesquisa e portfólio.

Essa linha de evolução conecta imagem, texto, privacidade, automação e organização de dados clínicos.

---

## Cuidados éticos

Este projeto tem finalidade educacional, técnica e experimental.

A ferramenta não substitui revisão humana. Toda imagem anonimizada deve ser conferida antes de uso externo.

Antes de utilizar imagens reais, é necessário remover ou ocultar qualquer informação que permita identificar:

- paciente;
- tutor;
- clínica;
- profissional;
- data ou número de exame;
- dados administrativos sensíveis.

O uso de imagens deve respeitar princípios de privacidade, consentimento, ética profissional e legislação aplicável.

---

## Roadmap

- [x] Criar repositório inicial;
- [x] estruturar aplicação;
- [x] criar documentação inicial;
- [x] adicionar exemplo de imagem anonimizada;
- [x] organizar dependências;
- [ ] melhorar interface;
- [ ] documentar passo a passo com prints;
- [ ] adicionar exemplos de antes/depois;
- [ ] implementar processamento de múltiplas imagens;
- [ ] estudar detecção semiautomática de texto;
- [ ] integrar com fluxo de organização de documentos.

---

## Diferencial do projeto

Este projeto nasceu de uma necessidade real da rotina em diagnóstico por imagem veterinária.

Além de demonstrar conhecimentos em Python, Streamlit e processamento de imagens, o projeto mostra aplicação prática de tecnologia em um problema concreto: proteger dados sensíveis em imagens ultrassonográficas antes de uso educacional, acadêmico ou técnico.

A proposta conecta Medicina Veterinária, diagnóstico por imagem, privacidade de dados, automação e desenvolvimento de soluções digitais aplicadas.

---

## Autora

Yasmine Santos  
Estudante de Análise e Desenvolvimento de Sistemas — IFRS  
Médica-veterinária especialista em Diagnóstico por Imagem  
GitHub: [yasmine-vet-ads](https://github.com/yasmine-vet-ads)
