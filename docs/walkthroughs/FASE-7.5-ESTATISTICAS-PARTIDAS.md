# BASEOS — FASE 7.5 — PROMPT 8
## WALKTHROUGH TÉCNICO OFICIAL

### RELATÓRIO DE ESTATÍSTICAS DE PARTIDAS, SETS E DURAÇÃO
#### Resumo Estatístico de Partidas, Parciais de Sets e Desempenho por Equipe

**Projeto:** BaseOS — Sports Intelligence  
**Ambiente:** DEV Local exclusivamente  
**Produção:** VOLTZ (`https://voltz.baseos.online`) — **TOTALMENTE CONGELADA / INTOCADA**  
**Data:** 12 de Setembro de 2026  
**Status Final:** **GO (CAMINHO A)** — Relatório operacional completo, auditado e validado  

---

## 1. RESUMO EXECUTIVO

Nesta etapa (Fase 7.5 — Prompt 8), foi auditada a capacidade do ecossistema **BaseOS — Sports Intelligence** de gerar um relatório estatístico de partidas, parciais de sets e tempo de jogo, culminando na implementação em **CAMINHO A** da rota:

`/relatorios?competitionId=:id&report=estatisticas`

A implementação pautou-se na **Regra Central de Honestidade Estatística**:
> **UM PLACAR NÃO É UMA ESTATÍSTICA AVANÇADA.**  
> O BaseOS registra com excelência placares, sets disputados, pontos por set e vencedores. O sistema **não** possui dados de duração cronometrada em minutos, scouts individuais (pontos por atleta, aces, bloqueios, ataques, erros) ou ralis. Qualquer estimativa arbitrária foi expressamente vetada.

O relatório foi batizado com fidelidade semântica como **Resumo Estatístico de Partidas e Sets** (ou **Estatísticas de Partidas e Sets**). Todos os canais (HTML-first, PDF oficial e CSV) declaram formalmente: **`Duração: Não registrada`** com aviso claro de que o banco de dados não armazena cronometragem contínua.

---

## 2. AUDITORIA E CONTRATOS ENCONTRADOS

### 2.1 Contrato Real de Partidas (`MatchRecord`)
- Arquivo canônico: `src/types/entities.ts`
- Campos utilizados:
  - `id`: identificador único da partida
  - `competitionId`: isolamento estrito por competição
  - `matchNumber`: número oficial do confronto
  - `round`: rodada
  - `phase` e `groupName`: fase e chaveamento
  - `scheduledTime`: data/hora agendada
  - `venue` e `court`: ginásio e quadra
  - `teamAId`, `teamBId`, `teamAName`, `teamBName`, `teamAShortName`, `teamBShortName`: dados das equipes
  - `status`: ciclo de vida (`scheduled`, `warmup`, `in-progress`, `completed`, `homologated`, `cancelled`, `wo`, etc.)
  - `sets: SetScoreRecord[]`: parciais oficiais `{ setNumber, scoreA, scoreB }`
  - `winnerId`: vencedor oficial
  - `isWo`: indicador canônico de W.O.

### 2.2 Estrutura Real dos Sets (`SetScoreRecord`)
Armazenado como coluna `jsonb` em `matches`:
```ts
export type SetScoreRecord = {
  setNumber: number; // 1..5
  scoreA: number;    // Pontos da Equipe A
  scoreB: number;    // Pontos da Equipe B
};
```

### 2.3 Auditoria de Duração (Sem Cronômetro no DB)
- **Não existem** campos como `startedAt`, `finishedAt`, `duration`, `durationMinutes` ou `elapsedSeconds` em `matches` ou `MatchRecord`.
- A constante `ESTIMATED_MATCH_DURATION_MINUTES = 75` em `scheduleConflictService.ts` destina-se unicamente ao cálculo de avisos de choque de horário.
- O cronômetro de 30s do `LiveScorerDeskModal.tsx` é meramente visual e transitório em memória.
- **Conclusão:** Duração informada honestamente como **`Não registrada`**.

### 2.4 Auditoria de Scout e Eventos
- Não existem tabelas ou campos para rali a rali, aces, bloqueios, ataques, recepções, erros, side-outs ou scouts individuais de atletas.
- Tais métricas foram deliberadamente excluídas e registradas como oportunidades de evolução futura (*Future Domain Work*).

---

## 3. MATRIZ DE DOMÍNIO E MÉTRICAS

| Métrica | Classificação | Origem | Comportamento no BaseOS |
| :--- | :---: | :--- | :--- |
| **Placar de Sets** | **REAL** | `match.sets` | Calculado via `CompetitionRulesService.getCanonicalMatchResult` |
| **Pontuação por Set** | **REAL** | `set.scoreA`, `set.scoreB` | Exibido como parciais (ex.: 25-21, 23-25, 15-12) |
| **Total de Pontos** | **DERIVÁVEL** | $\sum$ pontos dos sets | Soma exata de todos os sets disputados |
| **Saldo de Pontos** | **DERIVÁVEL** | $\text{Pontos Feitos} - \text{Pontos Sofridos}$ | Diferença matemática direta |
| **Média Sets / Jogo** | **DERIVÁVEL** | $\text{Sets em Concluídas} / \text{Concluídas}$ | Média com 2 casas decimais |
| **Resumo por Equipe** | **DERIVÁVEL** | Agregação em memória $O(M)$ | Jogos, Vitórias, Derrotas, Sets Vencidos/Perdidos, Pontos, Saldo |
| **Duração da Partida** | **INEXISTENTE** | Nenhuma fonte persistida | Explicitado formalmente como "Não registrada" |
| **Aces, Bloqueios, Ataques** | **INEXISTENTE** | Sem base de scout | Omitido do relatório |

---

## 4. ARQUITETURA E VIEW MODEL DEDICADO

Seguindo o padrão de arquitetura do BaseOS, foi estabelecida a cadeia unidirecional:
```text
ReportsPage ──► MatchStatisticsReportView ──► matchStatisticsReportService ──► View Model ──► PDF / CSV / HTML
```

### Tipos Canônicos Criados (`src/lib/pdf/types.ts`):
1. **`MatchStatisticsSetRow`**: Detalhe de cada set (`setNumber`, `scoreA`, `scoreB`, `winnerSide`).
2. **`MatchStatisticsRow`**: Linha de confronto com equipes, parciais (`setsBreakdownLabel`), placar (`setsScoreLabel`), totais de pontos, saldo e status.
3. **`TeamStatisticsSummaryRow`**: Tabela de desempenho acumulado por equipe na competição.
4. **`MatchStatisticsReportData`**: View Model raiz com métricas executivas, confrontos e resumo das equipes.

---

## 5. EXPERIÊNCIA DO USUÁRIO E ENTREGÁVEIS

### 5.1 HTML-First (`src/components/report/MatchStatisticsReportView.tsx`)
- **6 Cards de Métricas Executivas:** Total de Jogos, Concluídos, Sets Disputados, Pontos Totais, Média Sets/Jogo e Duração (Não registrada).
- **Aviso de Transparência:** Banner oficial informando que os dados advêm dos sets homologados e que scouts individuais/cronômetros não estão persistidos.
- **Tabs de Navegação:**
  1. *Confrontos e Parciais*: Tabela rica desktop e cards responsivos mobile (390px/375px), com filtros por equipe, fase, status e busca textual.
  2. *Desempenho por Equipe*: Tabela completa de estatísticas consolidadas (J, V, D, Sets+, Sets-, Pontos+, Pontos-, Saldo).
- **Identidade BaseOS:** Enterprise Dark SaaS (Zinc-950/900, Âmbar-500, Azul-400), com ZERO ocorrências de "VolleyPro".

### 5.2 Emissão de PDF Oficial (`src/lib/pdf/reportsPdf.ts`)
- Função: `generateMatchStatisticsReportPdf(data, orgName)`
- Layout: A4 Retrato com cabeçalho oficial BaseOS, banner executivo de métricas, tabela consolidada de equipes e listagem de partidas com parciais e coluna de duração formalmente anotada como "Não registrada".

### 5.3 Exportação CSV (`src/pages/ReportsPage.tsx`)
- Função: `exportMatchStatisticsCsv()`
- Colunas oficiais: `Jogo,Data,Horario,Local,Quadra,Fase,Grupo,Rodada,Equipe A,Equipe B,Vencedor,Sets A,Sets B,Placar Sets,Pontos A,Pontos B,Saldo Pontos,Status,WO,Duracao`.

---

## 6. ARQUIVOS MODIFICADOS E CRIADOS

### Criados:
1. `src/services/matchStatisticsReportService.ts` — Lógica pura de agregação $O(M)$, formatação e regras de W.O./CBV.
2. `src/components/report/MatchStatisticsReportView.tsx` — Componente de apresentação HTML-first com dual desktop/mobile layout.
3. `src/test/matchStatisticsReport.test.tsx` — Suíte de 19 testes automatizados cobrindo todos os cenários de negócio.
4. `docs/audits/FASE-7.5-ESTATISTICAS-PARTIDAS.md` — Documento de auditoria de domínio.
5. `docs/walkthroughs/FASE-7.5-ESTATISTICAS-PARTIDAS.md` — Este walkthrough técnico permanente.

### Alterados:
1. `src/lib/pdf/types.ts` — Adição dos tipos `MatchStatisticsSetRow`, `MatchStatisticsRow`, `TeamStatisticsSummaryRow`, `MatchStatisticsReportData`.
2. `src/lib/pdf/reportsPdf.ts` — Implementação do gerador de PDF oficial `generateMatchStatisticsReportPdf`.
3. `src/lib/pdf/index.ts` — Barrel export dos novos tipos e gerador de PDF.
4. `src/components/report/ReportSelector.tsx` — Inclusão do relatório `estatisticas` na categoria "Competição & Confrontos".
5. `src/pages/ReportsPage.tsx` — Integração da rota `/relatorios?competitionId=:id&report=estatisticas`, exportação PDF, CSV e renderização HTML.

---

## 7. SUÍTE DE TESTES E VERIFICAÇÃO

A suíte em `src/test/matchStatisticsReport.test.tsx` cobre com 100% de sucesso os 19 cenários essenciais:
- Isolamento estrito por competição
- Cálculo de métricas executivas gerais (totais de jogos, concluídos, tiebreaks, pontos)
- Partida com 3 sets (parciais, vencedor, pontos)
- Partida com 5 sets / tiebreak
- Partida com W.O. com pontuação canônica CBV (2x0 / 50 pts)
- Partida agendada sem sets (elegância visual, sem placar falso)
- Partida em andamento
- Agregação consolidada de desempenho por equipe
- Compatibilidade total com Vôlei de Praia (Beach Volleyball)
- Ordenação determinística de partidas por data/horário/número
- Estado vazio com zero jogos
- Helpers de formatação (status, data, hora)
- Interface HTML-first: 6 cards de métricas
- Banner de transparência estatística
- Alternância de abas (Confrontos vs Equipes)
- Filtragem textual de jogos
- Ausência total da marca legada "VolleyPro"
- Geração de PDF oficial BaseOS

---

## 8. REGRESSÃO E QUALIDADE DO CÓDIGO

Comandos executados com 100% de sucesso:
- **Typecheck:** `npx tsc -p tsconfig.app.json --noEmit` — 0 erros.
- **ESLint:** `npm run lint` — 0 erros.
- **Testes Unitários da Fase:** `npx vitest run src/test/matchStatisticsReport.test.tsx` — 19/19 aprovados.
- **Testes de Regressão de Relatórios:**
  - `reportsPage.test.tsx`
  - `mvpReport.test.tsx`
  - `delegationReport.test.tsx`
  - `dailyScheduleReport.test.tsx`
  - `refereesScheduleReport.test.tsx`
  Todos aprovados sem quebra de contrato.
- **Build de Produção:** `npm run build` — compilação concluída com sucesso.

---

## 9. DECLARAÇÃO FORMAL DE PRODUÇÃO CONGELADA

> A instância de produção VOLTZ (`https://voltz.baseos.online`) permaneceu **100% CONGELADA E INTOCADA** durante todo o Prompt 8 da Fase 7.5. Não foi realizado qualquer deploy, migration, alteração de infraestrutura ou interação com o banco de dados remoto.

---

## 10. STATUS FINAL

**STATUS: GO**  
O Relatório de Estatísticas de Partidas e Sets está auditado, homologado, testado e pronto para a release consolidada no BaseOS.
