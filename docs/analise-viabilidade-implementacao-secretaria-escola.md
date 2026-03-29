# Analise de Viabilidade de Implementacao - Secretaria de Educacao e Escola

**Data:** 28/03/2026  
**Projeto:** LAB-IA Educacao (Assistente institucional com governanca algoritmica)  
**Objetivo:** Estimar custo mensal de infraestrutura, impostos e suporte; avaliar viabilidade com preco de **R$ 1,20 por aluno/mes**; projetar escala para **138 mil escolas**.

---

## 1) Resumo Executivo

Com base na arquitetura atual do sistema (Node + Express em Cloud Run, frontend em Firebase Hosting, Supabase como banco/autenticacao, IA via API), o modelo economico e **viavel** no preco de R$ 1,20/aluno/mes, inclusive em escala nacional, desde que:

- a operacao seja **multi-tenant centralizada** (uma plataforma para muitas redes)
- haja disciplina de custo por aluno (especialmente IA)
- contratos publicos considerem perda de **10% a 15% em impostos na nota fiscal**
- para cidades pequenas, seja adotado modelo federado (federal custeia camada central) ou arranjo de suporte compartilhado

No cenario nacional (138 mil escolas, 46,92 milhoes de alunos), a simulacao base indica:

- Receita bruta mensal: **R$ 56.304.000**
- Custo operacional (infra + suporte compartilhado): **R$ 18.276.000**
- Impostos (10% a 15% sobre NF): **R$ 5.630.400 a R$ 8.445.600**
- Resultado operacional estimado: **R$ 29.582.400 a R$ 32.397.600/mes**

---

## 2) Arquitetura Atual Considerada no Calculo

A estimativa usa a stack real identificada no repositorio:

- **Backend:** Node.js + Express
- **Compute:** Google Cloud Run
- **Frontend e CDN:** Firebase Hosting
- **Banco e Auth:** Supabase (PostgreSQL + JWT + RLS)
- **IA:** Provedor via API (hoje com configuracao orientada a Groq, com estrutura para alternancia)
- **Integracoes presentes no codigo:** Google APIs (ex.: calendario), Edge Functions Supabase
- **Seguranca/logs:** controle de acesso por papeis + trilhas de auditoria de negocio + logging basico

---

## 3) Premissas Financeiras e Operacionais

### 3.1 Premissas macro

- Escolas alvo: **138.000**
- Alunos medio por escola (hipotese): **340**
- Alunos totais estimados: **46.920.000**
- Preco de venda: **R$ 1,20 por aluno/mes**
- Impostos sobre NF: **10% a 15%**

### 3.2 Custo variavel base por aluno/mes

Para manter previsibilidade, foi modelado custo variavel unitario de **R$ 0,30/aluno/mes**, distribuido assim:

- IA (inferencias e processamento de texto): **R$ 0,17**
- Supabase (DB/Auth/storage/backup operacional): **R$ 0,08**
- Cloud Run + rede: **R$ 0,04**
- Firebase Hosting/CDN: **R$ 0,005**
- Observabilidade e contingencia tecnica: **R$ 0,005**

**Total variavel por aluno:** **R$ 0,30**

### 3.3 Suporte e operacao

Dois modos de operacao foram considerados:

- **Modo A (atual, voce + IA):** operacao enxuta para piloto e crescimento inicial
- **Modo B (escala publica):** suporte compartilhado com estrutura minima (N1/N2, CS publico, SRE, seguranca, operacao de contratos)

Para a simulacao nacional, foi considerado **R$ 4.200.000/mes** em operacao/suporte compartilhado (Modo B).

---

## 4) Custos Mensais por Solucao (com justificativa)

### 4.1 Secretaria media (40 mil alunos)

| Solucao | Custo mensal estimado | Justificativa tecnica |
|---|---:|---|
| IA (API de inferencia) | R$ 6.800 | Componente mais sensivel ao volume de perguntas e respostas |
| Supabase (DB + Auth + storage) | R$ 3.200 | Persistencia transacional, trilha de auditoria, RBAC e dados de atendimento |
| Cloud Run + rede | R$ 1.600 | Execucao da API, autoscaling, trafego e chamadas de backend |
| Firebase Hosting/CDN | R$ 200 | Entrega de frontend estatico e roteamento |
| Observabilidade/backup tecnico | R$ 200 | Logs, alertas e resiliencia operacional |
| **Subtotal infraestrutura variavel** | **R$ 12.000** | **Equivale a R$ 0,30/aluno** |
| Suporte/operacao compartilhada (secretaria) | R$ 3.500 | Treinamento, atendimento funcional, gestao de configuracao local |
| **Total operacional (sem imposto)** | **R$ 15.500** | Base para compor margem |

### 4.2 Escala nacional (46,92 milhoes de alunos)

| Solucao | Custo mensal estimado | Justificativa tecnica |
|---|---:|---|
| IA (API de inferencia) | R$ 7.976.400 | Cresce com interacoes; principal alavanca de eficiencia |
| Supabase (DB + Auth + storage) | R$ 3.753.600 | Base de dados multi-tenant de alta criticidade |
| Cloud Run + rede | R$ 1.876.800 | Processamento de APIs e escala horizontal |
| Firebase Hosting/CDN | R$ 234.600 | Distribuicao de assets e paginas |
| Observabilidade/backup tecnico | R$ 234.600 | Confiabilidade e governanca operacional |
| **Subtotal infraestrutura variavel** | **R$ 14.076.000** | **Equivale a R$ 0,30/aluno** |
| Suporte/operacao compartilhada nacional | R$ 4.200.000 | Estrutura minima para contrato publico em larga escala |
| **Total operacional (sem imposto)** | **R$ 18.276.000** | Antes de impostos da NF |

---

## 5) Simulacao por Escola e por Secretaria

## 5.1 Escola media (340 alunos)

- Receita: **R$ 408/mes**
- Custo variavel infra: **R$ 102/mes**
- Imposto (10% a 15%): **R$ 40,80 a R$ 61,20**
- Resultado antes de custos fixos locais: **R$ 244,80 a R$ 265,20/mes**

Leitura: economicamente viavel quando a plataforma e centralizada. O custo de uma escola isolada nao deve carregar estrutura propria completa.

### 5.2 Secretaria (cenarios)

| Porte da secretaria | Alunos | Receita (R$ 1,20) | Custo total c/ imposto (10%-15%) | Resultado estimado |
|---|---:|---:|---:|---:|
| Pequena | 8.000 | R$ 9.600 | R$ 6.860 a R$ 7.340 | R$ 2.260 a R$ 2.740 |
| Media | 40.000 | R$ 48.000 | R$ 20.300 a R$ 22.700 | R$ 25.300 a R$ 27.700 |
| Grande | 200.000 | R$ 240.000 | R$ 87.500 a R$ 99.500 | R$ 140.500 a R$ 152.500 |

Observacao: este quadro considera suporte compartilhado de R$ 3.500/mes por secretaria. Em municipios muito pequenos, esse fixo precisa ser subsidiado/compartilhado (ver secao de estrategia federada).

---

## 6) Projecao Nacional (138 mil escolas)

### 6.1 Resultado mensal estimado

- Alunos estimados: **46.920.000**
- Receita bruta: **R$ 56.304.000**
- Infraestrutura variavel: **R$ 14.076.000**
- Suporte/operacao nacional: **R$ 4.200.000**
- Impostos (10% a 15%): **R$ 5.630.400 a R$ 8.445.600**

**Resultado mensal estimado:**

- Faixa conservadora (imposto 15%): **R$ 29.582.400**
- Faixa favoravel (imposto 10%): **R$ 32.397.600**

Margem operacional estimada: **52,5% a 57,5%** sobre receita bruta.

### 6.2 Ponto de equilibrio

Com preco de R$ 1,20 e custo variavel de R$ 0,30 por aluno:

- Margem de contribuicao por aluno (imposto 10%): **R$ 0,78**
- Margem de contribuicao por aluno (imposto 15%): **R$ 0,72**

Com custo fixo nacional de R$ 4,2 milhoes/mes:

- Break-even: **5,38 a 5,83 milhoes de alunos**
- Em escolas (340 alunos/escola): **15.837 a 17.157 escolas**

Conclusao: abaixo de ~17 mil escolas a operacao nacional ainda exige calibracao/funding; acima disso, a escala melhora rapidamente a margem.

---

## 7) Estrategia de Negociacao no Sandbox (AGU/MEC)

Proposta alinhada a sua sugestao de posicionamento como **"Solucao de Prateleira Democratica"**.

### 7.1 Narrativa de valor publico

- Universalizacao: modelo pensado para caber no orcamento de redes pequenas
- Governanca: auditoria formal, trilha de evidencia e ciclos de correcao da IA
- Escalabilidade: mesma plataforma atende rede pequena e grande sem reescrever arquitetura

### 7.2 Modelo comercial recomendado (federado)

- **Camada 1 - Federal (MEC/consorcio):** contrata hospedagem central, manutencao central, seguranca e evolucao da plataforma
- **Camada 2 - Secretarias/municipios:** pagam ativacao local no valor de **R$ 1,20/aluno/mes**

Efeito pratico:

- elimina barreira de entrada para municipios muito pequenos
- reduz risco de descontinuidade por oscilacao de caixa local
- permite padronizacao nacional de qualidade e compliance

### 7.3 Se nao houver custeio federal

Sem camada federal, secretarias muito pequenas tendem a ficar pressionadas por custo fixo de suporte. Nesse caso, adotar:

- consorcio intermunicipal
- polo regional de suporte compartilhado
- piso contratual minimo ou subsidio cruzado por carteira

---

## 8) Impostos e Estrutura Societaria (faixa de 10%-15%)

A analise considera exatamente sua observacao: em contratos publicos, dependendo do enquadramento e da estrutura societaria, a perda na NF pode ficar em **10% a 15%**.

Recomendacao pratica:

- sempre precificar com **duas faixas** (otimista e conservadora)
- conduzir modelagem tributaria com contador especializado em contrato publico e software
- amarrar reajuste anual por inflacao e revisao de escopo tecnico

### 8.1 Divisao societaria 25/25/50 (conta enxuta)

Regra aplicada sobre o resultado operacional:

- Socio 1: **25%**
- Socio 2: **25%**
- Empresa (caixa/reinvestimento): **50%**

Legenda de unidade:

- `mil` = mil reais
- `mi` = milhao de reais

#### a) Cenario nacional (138 mil escolas) - mensal

| Referencia | Total | Socio 1 (25%) | Socio 2 (25%) | Empresa (50%) |
|---|---:|---:|---:|---:|
| Bruto (antes imposto NF) | **R$ 38,03 mi** | R$ 9,51 mi | R$ 9,51 mi | R$ 19,01 mi |
| Liquido (imposto 10%) | **R$ 32,40 mi** | R$ 8,10 mi | R$ 8,10 mi | R$ 16,20 mi |
| Liquido (imposto 15%) | **R$ 29,58 mi** | R$ 7,40 mi | R$ 7,40 mi | R$ 14,79 mi |

#### b) Secretarias - mensal

| Cenario | Total bruto | Total liquido (10%-15%) | Socio 1 liquido | Socio 2 liquido | Empresa liquido |
|---|---:|---:|---:|---:|---:|
| Pequena (8 mil alunos) | R$ 3,70 mil | R$ 2,74 mil a R$ 2,26 mil | R$ 685 a R$ 565 | R$ 685 a R$ 565 | R$ 1,37 mil a R$ 1,13 mil |
| Media (40 mil alunos) | R$ 32,50 mil | R$ 27,70 mil a R$ 25,30 mil | R$ 6,93 mil a R$ 6,33 mil | R$ 6,93 mil a R$ 6,33 mil | R$ 13,85 mil a R$ 12,65 mil |
| Grande (200 mil alunos) | R$ 176,50 mil | R$ 152,50 mil a R$ 140,50 mil | R$ 38,13 mil a R$ 35,13 mil | R$ 38,13 mil a R$ 35,13 mil | R$ 76,25 mil a R$ 70,25 mil |

Observacao: estes valores sao operacionais/societarios. O valor final no bolso de cada socio ainda depende da forma de retirada (pro-labore, distribuicao de lucro e IRPF).

---

## 9) Riscos de Viabilidade e Mitigacoes

| Risco | Impacto | Mitigacao recomendada |
|---|---|---|
| Custo de IA subir por aumento de uso | Alto | Fallback de modelos, controle de tokens, cache semantico |
| Contrato exigir segregacao forte por rede | Medio/Alto | Multi-tenant com isolamento logico reforcado e opcao de ambiente dedicado |
| Operacao ficar concentrada em 1 pessoa | Alto | Estruturar runbook, automacao, suporte em camadas |
| Exigencias de compliance aumentarem | Medio | Roadmap formal de seguranca, trilhas e governanca |

---

## 10) Conclusao de Viabilidade do Negocio

No preco de **R$ 1,20/aluno/mes**, a operacao e financeiramente viavel para secretaria media e grande, e tambem em escala nacional, mesmo considerando impostos de 10%-15%.

A condicao chave para universalizacao real (inclusive cidades pequenas) e o modelo federado de contratacao:

- federal custeia a camada central de hospedagem/manutencao
- municipio/secretaria paga ativacao local por aluno

Esse desenho sustenta a narrativa de produto publico escalavel, com governanca e custo acessivel.

---

## 11) Checklist para fechar proposta comercial

1. Validar ticket de alunos por rede alvo (base real de matriculas)
2. Rodar piloto de 60-90 dias para medir custo real de IA por aluno
3. Fechar modelo tributario final (10%, 12%, 15%) com contador
4. Definir pacote de suporte (SLA, canais, horario, N1/N2)
5. Converter este estudo em anexo de edital/proposta tecnica-financeira

---

## 12) Nota metodologica

Esta analise usa premissas de mercado e arquitetura atual do repositorio, com finalidade de planejamento estrategico e comercial. Valores sao aproximados e devem ser refinados com:

- cotacao atual dos provedores (GCP/Supabase/IA)
- regime tributario efetivo da empresa
- perfil real de uso por rede (mensagens, consultas, anexos e canais)
