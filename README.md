# LAB-IA Educacao

LAB-IA Educacao e uma plataforma de atendimento institucional e governanca do conhecimento com IA auditavel para redes e orgaos educacionais.

O projeto foi estruturado para apoiar o uso seguro de IA em contextos publicos de educacao, transformando interacoes em dados de gestao, rastreabilidade e aprendizagem institucional.

## Proposito

- apoiar gestores publicos no uso responsavel de IA na educacao
- organizar conhecimento institucional com fonte e versionamento
- registrar interacoes para auditoria, analise e melhoria continua do atendimento
- gerar inteligencia administrativa a partir do uso real da plataforma

## Estrutura da plataforma

Base institucional derivada do Qnexy para atendimento educacional publico com quatro assistentes:

- Assistente Publico
- Assistente da Secretaria
- Assistente da Tesouraria
- Assistente da Direcao

## Perfis de acesso

- Superadmin do Projeto
- Gestor da Rede / Institucional
- Curador de Conteudo
- Operador de Atendimento Publico
- Servidor da Secretaria
- Servidor da Coordenacao
- Servidor da Direcao
- Auditor / Compliance
- Observador Externo

## O que foi reaproveitado

- autenticacao
- RBAC
- layout base
- chat base
- knowledge base atual
- usuarios
- permissoes
- relatorios
- logs existentes

## O que foi adaptado

- fluxo de visita substituido por fluxo de consulta institucional
- assistentes separados por area
- respostas amarradas a fonte e versionamento
- dashboard de inteligencia de atendimento
- auditoria formal
- arquitetura de acesso preparada para perfis institucionais e perfil global de superadmin

## O que foi removido

- CRM
- leads
- agenda de visitas
- eventos
- financeiro legado
- social monitor

## Licenciamento Open Source

Este projeto e licenciado sob a **Apache License 2.0**.

Em conformidade com o art. 36 do Edital no 1/2026 do Sandbox Regulatorio de Inteligencia Artificial na Educacao (MEC/SEAI), o codigo-fonte, os componentes tecnicos, os pipelines de inferencia, a documentacao tecnica e os artefatos desenvolvidos no ambito do Sandbox Regulatorio serao disponibilizados sob a licenca Apache License 2.0.

Permanecem resguardados os direitos sobre componentes de terceiros sujeitos a licenciamento proprio (ex: AdminLTE sob MIT), bem como eventuais restricoes legais aplicaveis.

Consulte o arquivo [LICENSE](LICENSE) para os termos completos.
