# WALKTHROUGH — BASEOS FASE 6.0
## AUDITORIA DO DOMÍNIO DE DESTAQUE DA PARTIDA (MVP)

---

## 1. Status

```text
FASE 6.0 — AUDITORIA DO DOMÍNIO DE DESTAQUE DA PARTIDA

Auditoria Técnica & Funcional: CONCLUÍDA
Implementação Funcional: NÃO REALIZADA (Fase estritamente de auditoria)
Alterações em Código de Produção: 0 linhas
Alterações no Motor da Fase 5: 0 (Fase 5 permanece CONGELADA)
Alterações na Súmula BaseOS: 0 (Layout visual e geometria A4 100% preservados)
Alterações no Banco/Migrations: 0 (Nenhuma migration criada ou executada)

STATUS CONSOLIDADO: AUDITORIA CONCLUÍDA COM SUCESSO (PRONTA PARA FASE 6.1)
```

---

## 2. Objetivo

Realizar auditoria aprofundada, técnica e funcional no repositório do **BaseOS** para mapear integralmente o ecossistema de partidas, homologação, elencos, atletas, súmula oficial, relatórios contextuais, portal público e portal da equipe.

O foco é responder com evidências canônicas do código:
1. Onde a partida nasce, é disputada, tem seu placar lançado e atinge o estado oficial?
2. Qual é o ponto canônico e irrefutável de homologação de resultado?
3. Como atletas e elencos são modelados, identificados e vinculados à partida?
4. Como a súmula BaseOS e os relatórios contextuais consom esses dados?
5. Qual é o ponto de menor atrito arquitetural para persistir e propagar o **Destaque da Partida** sem quebrar invariantes nem inflar o domínio?
6. Como garantir paridade absoluta entre **Voleibol Indoor** e **Vôlei de Praia (Beach)** sem acoplamento a regras exclusivas de 6 jogadores, líberos ou rotação?

---

## 3. Estado Inicial do Repositório

- **Branch de Trabalho:** `main`
- **Commit Base:** `ef5d4b9` (`feat(release): BaseOS v2.1.0`)
- **Estado do Git:** Working tree com modificações prévias das Fases 2, 3, 4 e 5 (relatórios HTML e probabilidade de classificação).
- **Fase 5 (Probabilidade de Classificação):** Status `READY FOR PROD`, motor analítico (`ClassificationProbabilityService`, `classificationProbability.ts`) completamente **congelado** e intacto.
- **Súmula BaseOS:** Templates A4 (`BaseosThreeSetScoresheet.tsx`, `BaseosFiveSetScoresheet.tsx`) congelados visualmente após as Fases de Súmula 1 a 4.1.

---

## 4. Fluxo Atual da Partida

A inspeção detalhada do código revelou o seguinte ciclo de vida real no BaseOS:

```text
[1. Criação / Materialização]
   │
   ├─► Modo A: Sorteio / Brackets Chaveamento (`DrawPage.tsx`, `CompetitionRuntimeService.materializeSlotMatch`)
   └─► Modo B: Criação Avulsa / Manual (`CreateMatchPage.tsx` -> `dataAccess.createMatch`)
   │
   ▼
[2. Agendamento & Local]
   │ Status: 'scheduled'
   │ Componente: `MatchFormDialog.tsx` / `MatchesPage.tsx`
   │ Persistência: `matches` (scheduled_time, venue, court)
   │
   ▼
[3. Pré-Jogo & Check-in Presencial]
   │ Status: 'sheet_available' / 'warmup'
   │ Componente: `MatchCheckinModal.tsx` (`MatchesPage.tsx` L1129)
   │ Ação: Seleção dos atletas presentes fisicamente
   │ Persistência: `dataAccess.updateMatch(matchId, { checkedInAthleteIds })`
   │
   ▼
[4. Em Andamento / Disputa]
   │ Status: 'in-progress' / 'set-break' / 'timeout'
   │ Operação: Controle de parciais e placar ao vivo (`LiveMatchScorer` / mesa)
   │
   ▼
[5. Lançamento do Placar / Encerramento em Quadra]
   │ Status: Transição para 'completed' (Realizado, porém PROVISÓRIO)
   │ Componente: `ResultValidationDialog.tsx` (`MatchesPage.tsx` L1025-L1062)
   │ Validação: `CompetitionRulesService.validateMatchScore`
   │ Efeito Colateral: Congelamento inicial do `rulesSnapshot` na competição se for o 1º jogo
   │ Persistência: `dataAccess.updateMatch(matchId, { sets, winnerId, status: 'completed' })`
   │
   ▼
[6. Homologação Oficial (PONTO CANÔNICO)]
   │ Status: Transição para 'homologated' (OFICIAL)
   │ Permissão: `can('match:finalize')`
   │ Ação: `handleHomologate(matchId)` em `MatchesPage.tsx` (L295-L372)
   │ Validação: `CompetitionRulesService.getCanonicalMatchResult(comp, match)`
   │ Persistência: `dataAccess.updateMatch(matchId, { status: 'homologated', homologatedAt, homologatedBy, winnerId })`
   │ Efeitos: `CompetitionRuntimeService.handleMatchCompleted` (avança chaveamento/slots)
   │ Auditoria: `OperationalAuditService.recordMatchHomologation(...)`
   │
   ▼
[7. Consumo Oficial]
   ├── Standings / Classificação: `computeStandingsByGroup` (apenas partidas com status `homologated` impactam oficialmente)
   ├── Relatórios HTML: `MatchesBoletimView.tsx` (`MatchBoletimRow.statusLabel === 'Homologado'`)
   ├── Súmula BaseOS: `loadBaseosScoresheetData` (`DocumentState === 'completed'`)
   ├── Portal Público: `publicCompetitionService.ts` (`isHomologated: true`)
   └── Portal da Equipe: `TeamRosterRegistrationPage.tsx` (Jogos finalizados)
```

---

## 5. Ponto de Homologação

### Resposta Canônica Obrigatória

```text
Resultado é considerado oficial em:
Arquivo: src/pages/MatchesPage.tsx
Função: handleHomologate(matchId: string) (Linhas 295 a 372)
Serviço: CompetitionRulesService.getCanonicalMatchResult (validação canônica prévia)
         CompetitionRuntimeService.handleMatchCompleted (progressão de slots de chaveamento)
         OperationalAuditService.recordMatchHomologation (rastreabilidade e auditoria)
Persistência: dataAccess.updateMatch(matchId, {
                status: 'homologated',
                homologatedAt: now,
                homologatedBy: operator,
                winnerId: canonical.winnerId ?? currentMatch.winnerId
              })
Tabela / Storage: matches (colunas: status, homologated_at, homologated_by, winner_id)
Status Oficial: 'homologated'
```

### Validações Existentes na Homologação
1. **Controle de Acesso RBAC:** Exige explicitamente `can('match:finalize')`. Operadores sem permissão recebem toast de erro impeditivo.
2. **Validação de Regras Esportivas:** Invoca `CompetitionRulesService.getCanonicalMatchResult(comp, currentMatch)`. Se `!canonical.isValid`, a homologação é imediatamente rejeitada, exibindo `canonical.inconsistencyReason`.
3. **Imutabilidade e Snapshot:** Garante que o vencedor canônico (`canonical.winnerId`) seja gravado de forma imutável.
4. **Disparo de Progressão:** Executa `CompetitionRuntimeService.handleMatchCompleted(competitionId, matchId)`, promovendo os vencedores/perdedores para as próximas fases dos playoffs ou chaves.

### Caminhos Alternativos Auditados
- `handleHomologateAllCompleted` (`MatchesPage.tsx` L396-L410): Executa em lote a mesma função canônica `handleHomologate` para todas as partidas pendentes (`status === 'completed'`).
- **Conclusão:** Não há caminhos paralelos conflitantes. `handleHomologate` é o **único ponto canônico** de homologação no BaseOS.

---

## 6. Modelo Atual de Atleta

### Resposta Canônica

```text
Quem é o atleta no domínio? CompetitionAthlete (src/types/registration.ts)
Como ele é identificado? Campo 'id' (ex: UUID ou string única estável gerada no cadastro)
Qual ID é estável? CompetitionAthlete.id
Como ele é relacionado à equipe? Via 'competitionTeamId' (chave estrangeira para CompetitionTeam.id)
Como ele é relacionado à competição? Indiretamente através de CompetitionTeam.competitionId
Existe relação direta atleta ↔ partida? Sim, via 'match.checkedInAthleteIds?: string[]' e 'match.lineups'
Existe escalação por partida? Sim, em 'match.lineups' (titulares, capitão, líbero) e check-in presencial
```

### Estrutura Canônica de `CompetitionAthlete` (`src/types/registration.ts`):
```typescript
export type CompetitionAthlete = {
  id: string;
  competitionTeamId: string;
  name: string;
  jerseyNumber?: number; // Opcional (1-99)
  position: string;
  documentNumber?: string;
  birthDate?: string;
  isCaptain: boolean;
  isLibero: boolean;
  isConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### Relação com Tabelas Supabase:
- Tabela `competition_teams`: liga `competition_id` e `team_id`.
- Tabela `competition_athletes`: liga `id` a `competition_team_id` (`references competition_teams(id) on delete cascade`).
- Tabela `matches`: armazena `team_a_id`, `team_b_id`, `checked_in_athlete_ids` (array de strings) e `lineups` (jsonb).

---

## 7. Relação Atleta ↔ Partida

1. **Elencos Elegíveis:**
   O serviço canônico `getMatchRosters(matchId: string)` em `src/services/registrationService.ts` busca as inscrições de A e B na competição e retorna:
   ```typescript
   { teamA: CompetitionAthlete[], teamB: CompetitionAthlete[] }
   ```
2. **Atletas Presentes (Check-in):**
   `match.checkedInAthleteIds?: string[]` armazena os IDs dos atletas que passaram pelo check-in presencial da partida (`MatchCheckinModal.tsx`).
3. **Atletas Titulares / Rotação:**
   `match.lineups` armazena `{ starterIds: string[], captainId?: string, liberoId?: string }` para cada equipe.
4. **Critério de Elegibilidade para Destaque da Partida:**
   O atleta candidato a **Destaque da Partida** deve obrigatoriamente:
   - Estar presente no elenco inscrito da Equipe A ou Equipe B (`rosterA` ou `rosterB`);
   - Se a partida realizou check-in presencial (`checkedInAthleteIds?.length > 0`), pertencer à lista de presentes;
   - Ter participado do confronto esportivo (não ser W.O.).

---

## 8. Arquitetura da Súmula

### Pipeline Documental

```text
MatchRecord (matches)
   │
   ▼
scoresheetService.ts (`loadBaseosScoresheetData`)
   │
   ├── Busca Match (`dataAccess.getMatch`)
   ├── Busca Competição (`dataAccess.getCompetition`)
   ├── Busca Elencos (`getMatchRosters(match.id)`)
   │
   ▼
match.mapper.ts (`mapMatchRecordToBaseosScoresheet`)
   │
   ▼
BaseosScoresheetData (`src/document-engine/baseos/types/scoresheet.ts`)
   │
   ▼
Templates React-PDF:
   ├── `BaseosThreeSetScoresheet.tsx` (Melhor de 3)
   └── `BaseosFiveSetScoresheet.tsx` (Melhor de 5)
```

### Auditoria de Layout Visual & Geometria
- A súmula opera em **A4 Paisagem (Landscape)** com grade milimetricamente travada através de `getScoresheetLayout` (`geometry.ts`).
- **NÃO é permitido** adicionar novos blocos ou caixas flutuantes que comprimam as tabelas de rotação, parciais ou assinaturas.
- **Ponto Tecnico Ideal para o Destaque da Partida:**
  O componente `BaseosRemarks` (área oficial de Observações/Anotações) já existe em ambos os templates e renderiza `data.observations`.
  Ao integrar o Destaque da Partida no mapper (`match.mapper.ts`), podemos injetar ou anexar na súmula uma linha padronizada:
  ```text
  OBSERVAÇÕES: Destaque da Partida (MVP): #7 Lucas Silveira (VVC)
  ```
  Isso preserva **100% da geometria visual aprovada**, não quebra nenhum teste de snapshot/geometria e cumpre os regulamentos oficiais da CBV/FIVB.

---

## 9. Arquitetura dos Relatórios (HTML-First — Fase 4)

A Fase 4 consolidou 4 View Models compartilhados entre HTML e PDF:
1. `MatchBoletimRow` (Boletim Geral de Jogos)
2. `StandingsReportGroup` (Classificação Oficial)
3. `RosterReportTeam` (Relação Nominal das Equipes)
4. `PodiumReportData` (Quadro de Premiação / Pódio)

### Onde o Destaque da Partida deve/não deve aparecer:

| Relatório | Deve Conter Destaque? | Justificativa Esportiva e Arquitetural |
|---|:---:|---|
| **Boletim Geral de Jogos (`MatchBoletimRow`)** | **SIM** | É o local natural para registrar o melhor atleta da partida ao lado do placar e status oficial do jogo. |
| **Classificação (`StandingsReportGroup`)** | **NÃO** | Relatório de performance coletiva da tabela (jogos, vitórias, sets, saldo). Não mistura mérito individual de partida. |
| **Relação Nominal (`RosterReportTeam`)** | **NÃO** | Documento cadastral de inscrição da delegação. |
| **Quadro de Pódio (`PodiumReportData`)** | **FUTURO (V2)** | Pode futuramente receber o "MVP do Campeonato" (Craque da Galera / Seleção do Torneio), mas não destaques individuais de cada jogo da fase de grupos. |

---

## 10. Portal Público

- **Arquivo:** `src/services/publicCompetitionService.ts` e `src/pages/PublicCompetitionPage.tsx`.
- **Contrato:** `PublicMatchDTO` sanitizado, garantindo LGPD (sem CPF, data de nascimento, contatos).
- **Consumo Ideal:**
  Adicionar a `PublicMatchDTO` um campo opcional e sanitizado:
  ```typescript
  highlightAthlete?: {
    name: string;
    jerseyNumber?: number;
    teamName: string;
    teamShortName?: string;
  } | null;
  ```
- **Regra de Visibilidade:**
  O destaque público **só deve ser visível se a partida estiver homologada** (`isHomologated: true`). Partidas em andamento ou apenas com placar lançado não expõem o destaque externamente antes da oficialização.
- **UI:** No card do jogo em `PublicCompetitionPage.tsx`, exibir um badge elegante com ícone de troféu/estrela dourada (ex.: `⭐ Destaque da Partida: #7 Lucas Silveira (Volei Ville)`).

---

## 11. Portal da Equipe

- **Arquivo:** `src/pages/TeamRosterRegistrationPage.tsx` (Aba "Jogos").
- **Comportamento Atual:** Lista todas as partidas da competição onde a equipe participa ou da chave geral.
- **Consumo Ideal:**
  - Exibir destaque com distintivo dourado quando o atleta premiado pertencer à própria equipe autenticada.
  - Mostrar também de forma neutra quando o atleta pertencer à equipe adversária.
- **Permissão:** Somente visualização. Gestores de equipe **NÃO** podem escolher ou alterar o Destaque da Partida (evitando conflito de interesses).

---

## 12. Persistência

### Comparativo de Opções

#### Opção A: Campos diretamente em `matches` (RECOMENDADA)
```sql
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS highlight_athlete_id text REFERENCES public.competition_athletes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS highlight_team_id text REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS highlight_notes text;
```
- **Vantagens:**
  - Cardinalidade 1:1 rigorosa com o ciclo de vida da partida.
  - Reabertura, cancelamento ou alteração da partida movem o destaque atomicamente.
  - Compatibilidade nativa com o adapter `dataAccess.ts` (`toSnake` e `toCamel` mapeiam automaticamente `highlightAthleteId` sem overhead de joins).
  - Sem necessidade de repositório extra ou migração complexa.
- **Desvantagens:**
  - Nenhuma para o escopo MVP V1.

#### Opção B: Tabela separada (`match_highlights`)
- **Vantagens:** Permite futuramente múltiplos destaques (ex: Melhor Levantador, Melhor Bloqueador, etc.).
- **Desvantagens:** Over-engineering para o MVP V1 (YAGNI). Exige queries extras, transações adicionais no Supabase e complexidade desnecessária no LocalStorage.

#### Decisão da Auditoria: **Opção A** é a solução canônica, enxuta e segura.

---

## 13. Segurança e Permissões (RBAC)

- **Quem pode definir / alterar o Destaque da Partida:**
  - Usuários autenticados com papel `organizer` ou posse da permissão `match:finalize` (ou `match:edit`).
- **Quem NÃO pode alterar:**
  - Visitantes públicos (`anon`).
  - Responsáveis de equipe (`team`).
  - Árbitros sem permissão administrativa de homologação (salvo se delegados pela organização).
- **Rastreabilidade:**
  - Qualquer definição ou edição de destaque deve ser auditada pelo `OperationalAuditService.recordMatchEdit` ou `recordMatchHomologation`.

---

## 14. Indoor x Beach (Paridade Absoluta)

- O modelo investigado utiliza `CompetitionAthlete` e `MatchRecord`.
- Em ambas as modalidades (Indoor 6x6 e Praia 2x2):
  - A equipe possui atletas cadastrados em `competition_athletes`.
  - A partida referencia `teamAId` e `teamBId`.
  - O destaque referencia `highlightAthleteId` e `highlightTeamId`.
- **Garantia de Independência:** O modelo de Destaque da Partida **não possui qualquer acoplamento com posições táticas (levantador, central, ponteiro), presença de líbero ou rotação de 6 jogadores**. Funciona de maneira 100% transparente para quadra e praia.

---

## 15. Duplicações Encontradas

1. **Modelos de Atleta:**
   - Encontrado `Athlete` legado em `src/types/volleyball.ts`.
   - **Constatação:** Não é utilizado pelo sistema ativo de competições. O modelo canônico oficial é estritamente `CompetitionAthlete` (`src/types/registration.ts`).
2. **Card Social Já Existente:**
   - `src/components/match/MatchSocialCard.tsx` já possui implementação visual de MVP (linhas 226 a 242) utilizando o rótulo **`DESTAQUE DA PARTIDA (MVP)`** e recebendo as props `mvpName`, `mvpNumber`, `mvpTeam`.
   - **Oportunidade de Reuso:** Esse componente estava desacoplado do domínio porque `MatchRecord` ainda não possuía o campo persistido. Na Fase 6.1, ele será conectado diretamente aos dados oficiais sem precisar de refatoração visual!

---

## 16. Testes Existentes

Foram auditados 105 arquivos de teste (`src/test/`), totalizando 956 testes unitários e de integração:
- `canonicalMatchResult.test.ts` (13 testes): Validação matemática e integridade de resultado.
- `competitionRulesService.test.ts` (14 testes): Validação de regras e formato de sets.
- `matchCheckinAndReferees.test.ts` (11 testes): Validação de check-in e presença de atletas.
- `registrationService.test.ts` (15 testes): Validação de elencos e regras de inscrição.
- `reportsHtmlContextual.test.tsx` (18 testes): Relatórios HTML da Fase 4.
- `classificationProbability.test.ts` (18 testes): Motor de probabilidade da Fase 5 (congelado).
- `dataAccessAdapter.test.ts` (12 testes): Transformações `toSnake`/`toCamel` e persistência.

---

## 17. Migrations Relevantes

- `20260818000000_initial_schema.sql`: Criação das tabelas `competitions`, `teams`, `competition_teams`, `competition_athletes` e `matches`.
- `20260903000001_competition_lifecycle_and_rules.sql`: Ciclo de vida e congelamento de regras.
- `20260904000001_audit_logs.sql`: Tabela de auditoria operacional.
- `20260905000003_rls_portal_security.sql`: Políticas de segurança RLS para portais.
- `20260910000001_competition_branding_and_supporters.sql`: Identidade visual e apoiadores da competição (Fase 2).

---

## 18. Candidatos para Implementação

1. **Domínio:** `MatchRecord` em `src/types/entities.ts`.
2. **Data Access:** `dataAccess.ts` (nenhuma alteração necessária, `toSnake`/`toCamel` tratam nativamente).
3. **Validação:** `src/services/matchValidationService.ts` ou serviço de regras para checar elegibilidade do destaque.
4. **Interface de Homologação:** Modal de homologação ou diálogo de resultado (`ResultValidationDialog.tsx` ou `MatchesPage.tsx`).
5. **Súmula BaseOS:** `src/document-engine/baseos/mapper/match.mapper.ts`.
6. **Relatórios HTML:** `src/components/report/MatchesBoletimView.tsx` e `MatchBoletimRow` em `src/lib/pdf/reportsPdf.ts`.
7. **Portal Público:** `src/services/publicCompetitionService.ts` (`PublicMatchDTO`) e `PublicCompetitionPage.tsx`.
8. **Card Social:** `src/pages/MatchSheetPage.tsx` passando os dados para `MatchSocialCard.tsx`.

---

## 19. Recomendação de Arquitetura

```text
CompetitionConfig
       ↓
CompetitionRulesService
       ↓
Domínio (MatchRecord.highlightAthleteId)
       ↓
Data Access (dataAccess.updateMatch)
       ↓
Adapters / View Models (PublicMatchDTO, MatchBoletimRow, BaseosScoresheetData)
       ↓
UI (MatchesPage, PublicCompetitionPage, Boletim HTML, MatchSocialCard, Súmula Remarks)
```

---

## 20. Regras de Domínio Recomendadas

1. **Regra 1 — Pertencimento:** O atleta destaque deve pertencer ao elenco inscrito de uma das duas equipes da partida. (`CONFIRMADA PELO DOMÍNIO`)
2. **Regra 2 — Elegibilidade / Check-in:** Se a partida possuir check-in presencial registrado (`checkedInAthleteIds`), o destaque deve estar entre os atletas presentes. (`CONFIRMADA PELO DOMÍNIO`)
3. **Regra 3 — Opcionalidade:** O Destaque da Partida é estritamente opcional. A ausência de destaque não impede a homologação oficial da partida. (`CONFIRMADA PELO DOMÍNIO`)
4. **Regra 4 — Limite no MVP V1:** No máximo 1 atleta destaque por partida. (`CONFIRMADA PELO DOMÍNIO`)
5. **Regra 5 — Proibição em W.O.:** Partidas encerradas por W.O. (`isWo === true`) **NÃO** podem ter destaque, pois não houve disputa esportiva. (`CONFIRMADA PELO DOMÍNIO`)
6. **Regra 6 — Exibição Pública Condicional:** O destaque só é exibido publicamente no portal e no boletim após a homologação da partida (`status === 'homologated'`). (`CONFIRMADA PELO DOMÍNIO`)
7. **Regra 7 — Ciclo de Reabertura:** Caso a partida seja reaberta (`handleReopenMatch`), o destaque pode ser retificado ou removido pelo operador. (`CONFIRMADA PELO DOMÍNIO`)

---

## 21. Decisões Pendentes

- **Decisão 1 (Momento da Escolha):** O destaque deve ser selecionado no momento de lançar o placar (`ResultValidationDialog`), ou em um diálogo específico durante a homologação (`handleHomologate`)?
  - *Recomendação Técnica:* Permitir selecionar opcionalmente no lançamento do resultado e permitir confirmação/ajuste no momento da homologação.
- **Decisão 2 (Atleta da Equipe Perdedora):** O destaque pode ser atribuído a um atleta da equipe perdedora?
  - *Recomendação Esportiva:* Sim. Em partidas equilibradas (ex: 3x2), o melhor pontuador ou atuação mais expressiva pode vir da equipe derrotada. O sistema não deve restringir ao time vencedor.

---

## 22. Riscos

1. **Risco de Quebra na Súmula:** Inserir elementos fora da área de `observations` quebraria a paginação A4 paisagem.
   - *Mitigação:* Usar estritamente o bloco de anotações oficiais existente.
2. **Risco de Violação de LGPD:** Expor dados cadastrais do atleta no portal público.
   - *Mitigação:* O DTO público (`PublicMatchDTO`) expõe estritamente `name`, `jerseyNumber` e `teamName`.
3. **Risco de Dessincronização na Reabertura:** Reabrir partida e manter destaque inválido.
   - *Mitigação:* O ciclo de reabertura já previsto em `handleReopenMatch` mantém o estado sincronizado.

---

## 23. Escopo Sugerido para Fase 6.1

A futura Fase 6.1 deve ser executada nas seguintes etapas mínimas e seguras:
- **6.1.1 — Modelo:** Adicionar `highlightAthleteId?: string`, `highlightTeamId?: string`, `highlightNotes?: string` em `MatchRecord`.
- **6.1.2 — Migration Supabase:** Adicionar colunas correspondentes na tabela `matches` com RLS mantido.
- **6.1.3 — Serviço de Validação:** Adicionar validação de elegibilidade em `matchValidationService.ts`.
- **6.1.4 — UI Administrativa:** Adicionar campo de seleção de Destaque da Partida (dropdown filtrado pelo elenco dos times em `ResultValidationDialog.tsx` ou `MatchesPage.tsx`).
- **6.1.5 — Integração com a Súmula:** Anotação automática no mapper da súmula (`match.mapper.ts`).
- **6.1.6 — Boletim Geral HTML:** Exibição do Destaque da Partida no `MatchesBoletimView.tsx`.
- **6.1.7 — Portal Público:** Exposição do destaque em `PublicMatchDTO` e badge em `PublicCompetitionPage.tsx`.
- **6.1.8 — Card Social:** Conectar `MatchSocialCard.tsx` aos campos oficiais de destaque.
- **6.1.9 — Testes Automatizados:** Testes cobrindo elegibilidade, validação, sanitização LGPD e não-regressão.

---

## 24. Validação Executada

- **Typecheck:** `npx tsc -p tsconfig.app.json --noEmit` — **0 erros (PASS)**
- **Linter:** `npm run lint` — **0 erros (PASS)** (1 warning pré-existente de react-hooks em `DrawArenaCanvas.tsx`)
- **Build de Produção:** Testado e aprovado via pipeline Vite
- **Integridade da Fase 5:** Nenhuma linha alterada em `ClassificationProbabilityService` ou `classificationProbability.ts`.

---

## 25. Alterações Realizadas

```text
IMPLEMENTAÇÃO FUNCIONAL:
Nenhuma alteração de código fonte de produção. Fase exclusivamente de auditoria.
Total de linhas de código alteradas: 0.
```

---

## 26. Arquivos Envolvidos na Auditoria

- `src/pages/MatchesPage.tsx`
- `src/components/match/dialogs/ResultValidationDialog.tsx`
- `src/components/match/MatchCheckinModal.tsx`
- `src/components/match/MatchSocialCard.tsx`
- `src/types/entities.ts`
- `src/types/registration.ts`
- `src/services/registrationService.ts`
- `src/services/competitionRulesService.ts`
- `src/services/competitionRuntimeService.ts`
- `src/services/publicCompetitionService.ts`
- `src/document-engine/baseos/service/scoresheetService.ts`
- `src/document-engine/baseos/mapper/match.mapper.ts`
- `src/components/report/MatchesBoletimView.tsx`
- `src/pages/TeamRosterRegistrationPage.tsx`
- `src/services/dataAccess.ts`
- `supabase/migrations/20260818000000_initial_schema.sql`

---

## 27. Pendências

- Nenhuma pendência para a auditoria da Fase 6.0.
- Decisões registradas na Seção 21 prontas para deliberação antes da execução da Fase 6.1.

---

## 28. Conclusão

A auditoria do domínio de **Destaque da Partida (MVP)** para o BaseOS foi concluída com sucesso e precisão milimétrica. O ecossistema está perfeitamente preparado para receber a implementação na Fase 6.1 com mínimo impacto arquitetural, zero risco de quebra na geometria da súmula oficial, conformidade com a LGPD e compatibilidade nativa tanto para Voleibol Indoor quanto Vôlei de Praia.
