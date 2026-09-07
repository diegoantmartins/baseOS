# BASEOS — PORTAL PÚBLICO DA COMPETIÇÃO (`/c/:slug`)

**Sistema:** BaseOS  
**Módulo:** Experiência Pública e Espectador  
**Rota Oficial:** `/c/:slug`  

---

## 1. Visão Geral

O **Portal Público da Competição** é a porta de entrada de acesso universal (sem autenticação) para torcedores, atletas, famílias e comunidade esportiva acompanharem em tempo real a tabela, as partidas, os resultados e a classificação oficial de uma competição gerida pelo **BaseOS**.

### Características Fundamentais:
1. **Public Read Layer:** É uma camada de apresentação e leitura pura, que consome os dados persistidos oficiais sem criar motores esportivos paralelos.
2. **URL Semântica e Canônica:** Acessível exclusivamente por `/c/:slug` (ex: `/c/liga-nacional-pro-masculino-2026`). IDs internos não são aceitos na URL pública.
3. **Imutabilidade de Slug:** Uma vez que uma competição possui um slug persistido, alterações em seu nome não alteram o slug. A URL original permanece válida para sempre, preservando links e QR Codes impressos.
4. **Proteção de Privacidade e LGPD:** A camada pública não seleciona nem retorna campos privados. No MVP, elencos de atletas individuais, CPFs, datas de nascimento e tokens de agremiações (`access_token`, `registration_deadline`) são omitidos.

---

## 2. Abas e Experiência do Usuário

### A. Visão Geral
- **Métricas:** Total de equipes participantes, total de jogos e jogos já realizados.
- **Destaques:** Cards com as próximas partidas agendadas e os últimos resultados homologados.
- **Regulamento Esportivo Oficial:** Resumo claro do formato de sets (pontos regulares e tiebreak) e do sistema de pontuação oficial (vitória 3x0/3x1, vitória 3x2, derrota 2x3, derrota 0x3, W.O.).

### B. Classificação Oficial
- Renderiza a classificação de cada chave utilizando o componente oficial `StandingsTable` do BaseOS.
- Exibe: Posição, Equipe, Pontos, Jogos, Vitórias, Derrotas, Sets Vencidos/Perdidos, Set Average (SV/SP), Pontos Pró/Contra, Pontos Average (PM/PS) e Saldo.
- Indicador visual claro de zona de avanço para as fases finais.

### C. Jogos e Resultados
- Filtros por status: **Todos**, **Agendados** e **Encerrados**.
- Filtro por Chave/Grupo.
- Cards detalhados com:
  - Nomes e escudos das duas equipes.
  - Placar geral em sets.
  - Parciais dos sets (ex: `25x21, 23x25, 15x11`).
  - Badges de status esportivo (`Agendado`, `Encerrado`, `Homologado`, `W.O.`).
  - Local e quadra da partida.

### D. Grupos e Equipes
- Visualização de todas as equipes agrupadas pelas suas chaves oficiais.
- Nome oficial da agremiação, sigla e cidade.
- Aviso de conformidade com a LGPD e privacidade de dados.

---

## 3. Segurança e RLS

- Acesso anônimo restrito a consultas via Views sanitizadas (`public_competitions`, `public_competition_teams`).
- O usuário anônimo não possui permissões de INSERT, UPDATE ou DELETE em nenhuma tabela base.
- Declaração de conformidade: *"A camada pública não seleciona nem retorna campos privados"*.
