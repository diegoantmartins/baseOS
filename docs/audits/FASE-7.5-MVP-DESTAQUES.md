# BASEOS — FASE 7.5 — AUDITORIA DE DOMÍNIO
## RELATÓRIO DE DESTAQUES / MVP / ATLETAS EM EVIDÊNCIA

**Projeto:** BaseOS — Sports Intelligence  
**Ambiente:** DEV Local exclusivamente  
**Produção VOLTZ (`https://voltz.baseos.online`):** TOTALMENTE CONGELADA / INTACTA  
**Data:** 12 de Setembro de 2026  
**Status da Auditoria:** DOMÍNIO REUTILIZÁVEL E CONSOLIDADO COM SUCESSO (GO)

---

### 1. OBJETIVO DA AUDITORIA

Auditar a sustentação de domínio, integridade de contratos e viabilidade arquitetural para a emissão do **Relatório Oficial de Destaques / MVP / Atletas em Evidência** no BaseOS, respondendo de forma fidedigna e sem duplicidade de dados:
1. Quais atletas foram eleitos como MVP/destaque;
2. Em quais partidas e por quais equipes;
3. Em qual competição;
4. Quantos destaques cada atleta possui (ranking / leaderboard acumulado);
5. Quais equipes tiveram mais destaques;
6. Quais partidas possuem MVP homologado e quais ainda não possuem destaque registrado;
7. Identificação completa da partida (número, data, horário, ginásio, quadra, placar).

---

### 2. CONTRATOS ENCONTRADOS E FONTE CANÔNICA

A investigação no código confirmou que **não há necessidade de criar novas tabelas, novas colunas ou RPCs**:

* **Fonte Canônica do MVP:**
  * Banco de Dados: `matches.highlight_athlete_id` (UUID nullable apontando para `competition_athletes.id`).
  * TypeScript / Adapter: `MatchRecord.highlightAthleteId?: string | null`.
  * Persistência: atualizado exclusivamente via `dataAccess.updateMatch(id, { highlightAthleteId })` no fluxo de finalização e homologação da partida (`MatchHomologationDialog.tsx` e `matchValidationService.ts`).
* **Resolução Atleta $\rightarrow$ Equipe $\rightarrow$ Competição:**
  * O atleta selecionado como destaque da partida reside em `competition_athletes` (`CompetitionAthlete`).
  * O vínculo com a equipe e com a competição é feito através de `competition_athletes.competition_team_id` $\rightarrow$ `competition_teams.id` (`CompetitionTeam`).
  * A equipe máster da federação/sistema é resolvida via `competition_teams.team_id` $\rightarrow$ `teams.id` (`TeamRecord`).
  * O short name e logo da equipe vêm do `TeamRecord` ou `CompetitionTeam`.
* **Exposição Existente:**
  * O portal público (`publicCompetitionService.ts`) e o Boletim Geral de Jogos (`ReportsPage.tsx`) já usavam `m.highlightAthleteId` resolvido através de `athletes.find(a => a.id === m.highlightAthleteId)`.

---

### 3. ANÁLISE DE DADOS E RISCOS IDENTIFICADOS

| Cenário / Risco | Diagnóstico Real | Tratamento Arquitetural |
| :--- | :--- | :--- |
| **Partida com MVP válido** | `highlightAthleteId != null` e atleta existe no elenco | Resolvido com nome, número de camisa, equipe e sigla oficial. |
| **Partida sem MVP registrado** | `highlightAthleteId == null` ou vazio | Representado explicitamente como "Sem destaque registrado", com badge neutro/informativo. |
| **MVP com Atleta Não Localizado** (órfão) | `highlightAthleteId` preenchido, mas ID não consta em `athletes` (ex: exclusão de inscrição prévia) | **Não fabricar dados fictícios**. Exibir badge de alerta: `"Atleta não localizado"`. O registro da partida mantém o ID mas sinaliza inconsistência; não entra no ranking de atletas ranqueados. |
| **N+1 Queries** | Resolução individual de atletas e equipes para cada jogo | **Zero N+1 queries**: `ReportsPage` carrega `matches`, `teams`, `athletes` e `competitionTeams` em lote inicial via `Promise.all` e resolve todas as relações em memória $O(1)$ através de `Map`. |
| **Isolamento de Competições** | Misturar dados de outros torneios | O serviço `buildMvpReportData` filtra estritamente por `m.competitionId === competition.id`, garantindo isolamento total. |

---

### 4. DECISÕES DE ARQUITETURA E MODELAGEM

1. **Criação do Serviço Puro `src/services/mvpReportService.ts`:**
   * Centraliza a agregação de dados e cálculo de métricas fora do JSX.
   * View Model canônico:
     * `MvpMatchRow`: confrontos, horários, placares e identificação de MVP/inconsistência.
     * `MvpLeaderboardRow`: ranking determinístico de atletas destacados.
     * `MvpReportData`: contêiner consolidado com métricas globais, ranking e partidas.
2. **Desempate Determinístico do Ranking:**
   * 1º Critério: Maior quantidade de MVPs (`mvpCount DESC`);
   * 2º Critério: Nome do atleta alfabético (`athleteName ASC`);
   * 3º Critério: ID do atleta (`athleteId ASC`).
3. **Padrão HTML-First e UI Responsiva:**
   * Componente `src/components/report/MvpReportView.tsx` com alternância entre abas "Ranking de Destaques" e "Partidas & Destaques", cards de métricas, busca textual e filtros rápidos por equipe e status.
   * Layout desktop com tabelas tabulares densas e visualização mobile sem scroll horizontal via cards adaptados.
4. **Exportação Oficial:**
   * **PDF:** Integrado à engine BaseOS (`src/lib/pdf/reportsPdf.ts`) na função `generateMvpReportPdf`, com cabeçalho oficial, métricas, tabela de ranking e lista de partidas com numeração de página e bloco de assinatura de premiação.
   * **CSV:** Exportação via browser com colunas oficiais: `Jogo,Data,Horário,Equipe A,Equipe B,Resultado,MVP,Equipe do MVP,Número da Camisa,Status`.
   * **Compartilhamento:** Preserva URL contextual `/relatorios?competitionId=:id&report=mvp`.

---

### 5. ESCOPO IMPLEMENTADO VS. NÃO IMPLEMENTADO

#### Implementado
* View Model completo em `src/lib/pdf/types.ts` (`MvpMatchRow`, `MvpLeaderboardRow`, `MvpReportData`).
* Serviço desacoplado `buildMvpReportData` em `src/services/mvpReportService.ts`.
* Componente visual `MvpReportView` em `src/components/report/MvpReportView.tsx`.
* Gerador de PDF oficial `generateMvpReportPdf` em `src/lib/pdf/reportsPdf.ts`.
* Rota contextual `/relatorios?competitionId=:id&report=mvp` em `src/pages/ReportsPage.tsx`.
* Exportação de CSV estruturado e compartilhamento com Web Share API / Clipboard.
* Suíte de testes automatizados dedicados em `src/test/mvpReport.test.tsx` (12 testes passando).

#### Explicitamente Não Implementado (Proibições Respeitadas)
* Nenhuma migration criada.
* Nenhuma alteração de schema ou tabela no Supabase / PostgreSQL.
* Nenhuma RPC criada.
* Nenhuma alteração no fluxo de homologação (`MatchHomologationDialog`) ou no Live Scorer.
* Zero dados mockados/fabricados injetados em produção.

---

### 6. CONFIRMAÇÃO DE AMBIENTE

* **Ambiente de Trabalho:** DEV Local exclusivamente.
* **Produção VOLTZ (`https://voltz.baseos.online`):** TOTALMENTE CONGELADA / INTACTA. Nenhuma requisição, deploy ou migration executado contra a produção.
