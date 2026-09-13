# BASEOS — FASE 7.5 — AUDITORIA DE RELATÓRIO OPERACIONAL

## AUDITORIA DE ESTATÍSTICAS DE PARTIDAS, SETS E DURAÇÃO
### Auditoria de Domínio, Contratos de Jogos e Decisão Arquitetural

**Projeto:** BaseOS — Sports Intelligence  
**Ambiente:** DEV Local exclusivamente  
**Produção:** VOLTZ (`https://voltz.baseos.online`) — **TOTALMENTE CONGELADA / INTOCADA**  
**Data:** 12 de Setembro de 2026  
**Status da Auditoria:** **GO (CAMINHO A)** — Implementado com transparência e honestidade de domínio (duração declarada como não registrada)

---

## 1. OBJETIVO DA AUDITORIA

Auditar se o domínio existente do BaseOS possui dados reais e contratos canônicos para sustentar a emissão de um relatório operacional de:

> **ESTATÍSTICAS DE PARTIDAS, SETS E DURAÇÃO**  
> Rota pretendida: `/relatorios?competitionId=:id&report=estatisticas`

A premissa absoluta deste trabalho foi a **REGRA CENTRAL — NÃO INVENTAR ESTATÍSTICAS**:
> **NÃO CONFUNDIR DADO DERIVÁVEL COM DADO INEXISTENTE.**  
> Se existem sets com placares (ex.: 25×21, 25×18, 15×12), é matematicamente legítimo derivar sets disputados, pontos por set, total de pontos, saldo de pontos, vencedor e parciais. Mas **NÃO** inventar duração em minutos, rali a rali, pontos por atleta, aces, bloqueios, ataques, erros, recepções, side-outs ou eficiência individual.

---

## 2. INVESTIGAÇÃO GLOBAL DE CONTRATOS REAIS

Foi realizada varredura completa em todo o ecossistema do BaseOS:
- `src/types/entities.ts`
- `src/types/volleyball.ts`
- `src/types/registration.ts`
- `src/services/dataAccess.ts`
- `src/services/competitionRulesService.ts`
- `src/services/standingsService.ts`
- `src/services/scheduleConflictService.ts`
- `src/pages/MatchesPage.tsx`
- `src/pages/LiveScorerPage.tsx`
- `src/pages/StatisticsPage.tsx`
- `src/pages/ReportsPage.tsx`
- `src/components/scorer/LiveScorerDeskModal.tsx`
- `src/lib/pdf/reportsPdf.ts`
- `supabase/migrations/`

---

## 3. BANCO DE DADOS E TABELAS RELACIONADAS

| Tabela / Estrutura | Existe no Banco? | Onde Existe? | Observações |
| :--- | :---: | :---: | :--- |
| `matches` | **SIM** | Supabase & LocalStorage | Tabela principal de partidas |
| `matches.sets` | **SIM** | Coluna `jsonb` em `matches` | Array de parciais `{ setNumber, scoreA, scoreB }` |
| `match_sets` | **NÃO** | Inexistente | Não há tabela normalizada de sets |
| `match_events` | **NÃO** | Inexistente | Não há estrutura de eventos de jogo |
| `match_points` | **NÃO** | Inexistente | Não há rastreamento ponto a ponto |
| `match_statistics` | **NÃO** | Inexistente | Não há persistência de fundamentos técnicos |
| `match_history` | **NÃO** | Inexistente | Não há log temporal contínuo |

> **Decisão:** Em conformidade estrita com a regra de integridade do BaseOS, nenhuma dessas tabelas foi criada artificialmente no banco de dados.

---

## 4. CONTRATO CANÔNICO DE PARTIDAS E SETS

### 4.1 Entidade `MatchRecord` (`src/types/entities.ts`)
Campos reais encontrados:
- `id`: string (UUID da partida)
- `competitionId`: string (UUID da competição)
- `round`: number (Número da rodada)
- `matchNumber`: number (Identificador sequencial oficial)
- `teamAId` / `teamBId`: string (IDs das equipes)
- `teamAName` / `teamBName`: string (Nomes oficiais das equipes)
- `teamAShortName` / `teamBShortName`: string (Siglas das equipes)
- `venue`: string (Ginásio / local)
- `court`: string opcional (Quadra)
- `phase`: string opcional (Fase da competição, ex.: "Classificatória", "Semifinal", "Final")
- `groupName`: string opcional (Chave/grupo, ex.: "Grupo A")
- `scheduledTime`: string ISO (Data e horário agendado de início)
- `status`: `MatchLifecycleStatus` (`'scheduled'`, `'warmup'`, `'in-progress'`, `'completed'`, `'homologated'`, `'cancelled'`, `'wo'`, etc.)
- `sets`: `SetScoreRecord[]`
- `winnerId`: string opcional (ID da equipe vencedora)
- `isWo`: boolean opcional (Indicador canônico de W.O.)
- `referees`: `MatchRefereeRecord[]` (Escala de arbitragem)
- `observations`: string opcional

### 4.2 Estrutura Real dos Sets (`SetScoreRecord`)
```ts
export type SetScoreRecord = {
  setNumber: number; // 1, 2, 3, 4, 5
  scoreA: number;    // Pontos da Equipe A no set
  scoreB: number;    // Pontos da Equipe B no set
};
```

---

## 5. AUDITORIA DE DURAÇÃO (RESULTADO CRÍTICO)

A auditoria investigou minuciosamente qualquer evidência de registro de tempo real de jogo:
1. **Campos procurados no modelo:** `startTime`, `endTime`, `startedAt`, `finishedAt`, `duration`, `durationMinutes`, `elapsedSeconds`.
   - **Resultado:** **INEXISTENTES** no schema de banco e em `MatchRecord`.
2. **Constantes encontradas:**
   - Em `scheduleConflictService.ts` existe `ESTIMATED_MATCH_DURATION_MINUTES = 75`, utilizada estritamente como heurística operacional preventiva para alertar sobre conflitos de quadra e descanso mínimo entre jogos sucessivos.
3. **Live Scorer Desk (`LiveScorerDeskModal.tsx`):**
   - Possui apenas um timer regressivo volátil de 30 segundos em memória para controle de pedido de tempo (`timeoutTimer`), além de um log volátil de desfazimento (`pointLog`). Nenhum cronômetro contínuo de partida é persistido.
4. **Decisão de Honestidade:**
   - **NÃO foi calculada duração artificial** (nem a partir de `scheduledTime`, nem a partir de médias de sets).
   - Todos os canais (HTML, PDF, CSV) declaram formalmente: **`Duração: Não registrada`** com aviso de que o BaseOS não possui cronômetro persistido no banco de dados.

---

## 6. AUDITORIA DA PÁGINA EXISTENTE (`StatisticsPage.tsx`)

Inspecionada a rota `/estatisticas`:
- Trata-se de um dashboard geral que agrega partidas concluídas em memória (pontos marcados, sets jogados, taxa de vitórias).
- Não possui dados individuais de atletas (sem contagem de aces, ataques ou bloqueios).
- Confirma que o domínio BaseOS opera consolidando sets e placares, sem fundamentos individuais ou ralis.

---

## 7. MATRIZ DE DISPONIBILIDADE E CLASSIFICAÇÃO DE MÉTRICAS

| Métrica / Dado | Status de Disponibilidade | Fonte Canônica | Persistido? | Utilizado no Relatório? |
| :--- | :---: | :--- | :---: | :---: |
| **Resultado da Partida** | **REAL** | `match.sets`, `match.winnerId` | SIM | **SIM** |
| **Sets Disputados** | **REAL** | `match.sets.length` | SIM | **SIM** |
| **Pontos por Set** | **REAL** | `set.scoreA`, `set.scoreB` | SIM | **SIM** |
| **Total de Pontos (Partida/Equipe)** | **DERIVÁVEL** | $\sum$ pontos dos sets reais | SIM | **SIM** |
| **Diferença / Saldo de Pontos** | **DERIVÁVEL** | $\text{Pontos Feitos} - \text{Pontos Sofridos}$ | SIM | **SIM** |
| **Média de Sets por Partida** | **DERIVÁVEL** | $\text{Sets em Concluídas} / \text{Concluídas}$ | SIM | **SIM** |
| **Partidas com Tiebreak** | **DERIVÁVEL** | Contagem de jogos com 3 sets (beach) ou 5 sets (indoor) | SIM | **SIM** |
| **Resumo Consolidado por Equipe** | **DERIVÁVEL** | Vitórias, derrotas, sets vencidos/perdidos, pontos e saldo | SIM | **SIM** |
| **Tratamento de Partida W.O.** | **REAL** | `match.isWo` + regra canônica CBV (2x0 / 3x0) | SIM | **SIM** |
| **Duração da Partida** | **INEXISTENTE** | Nenhuma fonte real persistida | NÃO | **SIM (Exibido como "Não registrada")** |
| **Rally a Rally** | **INEXISTENTE** | Nenhuma tabela de ralis | NÃO | **NÃO (Deliberadamente omitido)** |
| **Aces, Bloqueios, Ataques, Erros** | **INEXISTENTE** | Nenhuma tabela de scout | NÃO | **NÃO (Deliberadamente omitido)** |
| **Estatísticas Individuais / Atleta** | **INEXISTENTE** | Nenhuma tabela de fundamentos por atleta | NÃO | **NÃO (Deliberadamente omitido)** |
| **Side-out / Eficiência** | **INEXISTENTE** | Sem base de scout | NÃO | **NÃO (Deliberadamente omitido)** |

---

## 8. DECISÃO DE CAMINHO ARQUITETURAL

### CAMINHO A — IMPLEMENTAÇÃO OFICIAL DO RELATÓRIO
O domínio possui dados reais, sólidos e consistentes para sustentar um relatório operacional verdadeiro de resultados, parciais de sets e totais de pontuação:
- Nome oficial adotado: **Resumo Estatístico de Partidas e Sets** (ou **Estatísticas de Partidas e Sets**).
- O nome evita terminologias enganosas como "Estatísticas Avançadas" ou "Scout Técnico", garantindo integridade e fidelidade aos dados oficiais CBV/FIVB suportados pelo BaseOS.
- Suporta plenamente modalidades **Indoor** e **Beach Volleyball**.

---

## 9. DECLARAÇÃO DE CONGELAMENTO DA PRODUÇÃO

> **DECLARAÇÃO FORMAL OBRIGATÓRIA:**  
> A instância de produção VOLTZ (`https://voltz.baseos.online`) permaneceu **100% CONGELADA E INTOCADA** durante toda a auditoria e implementação do Prompt 8 da Fase 7.5. Nenhum deploy, migration, alteração de banco de dados ou requisição foi emitido contra a infraestrutura de produção.
