# BASEOS — FASE 4.2: RESUMO EXECUTIVO E DECISÕES ARQUITETURAIS (WALKTHROUGH)

**Data:** 05/09/2026  
**Documento:** Relatório Executivo e Resolução das 25 Decisões Estruturais da Fase 4.2  
**Status da Fase:** **ARQUITETURA DEFINIDA — SEM BLOQUEADORES**  
**Modo:** Arquitetura e Design Técnico Controlado (Sem alteração de código de produção)  
**Autor:** Antigravity AI / Equipe de Engenharia BaseOS

---

## 1. RESUMO EXECUTIVO DA FASE 4.2

A Fase 4.2 transformou os bloqueadores estruturais identificados na auditoria 4.1 em uma **arquitetura definitiva, robusta e modular** para o motor esportivo do BaseOS: o **Competition Format Engine**.

Durante esta fase, foram criados 6 documentos técnicos aprofundados na pasta `docs/competition-engine/`:
1. `PHASE-4.2-ARCHITECTURE.md`: Master design com os 6 pilares arquiteturais e o mapa evolutivo dos serviços existentes.
2. `STAGE-MODEL.md`: Especificação técnica de fases (`StageDefinition` vs `StageRecord`), ciclo de vida em grafo acíclico (DAG) e eliminação definitiva de strings literais em `matches.phase`.
3. `PAIRING-AND-PROGRESSION.md`: Algoritmos de emparelhamento (Berger, Chaveamento Olímpico, Custom Mappings), tratamento limpo de Byes sem equipes fictícias e conectores dinâmicos de progressão (`ParticipantFeed`).
4. `STANDINGS-AND-TIEBREAK-ARCHITECTURE.md`: Motor de ranking intergrupos (`computeOverallStandings`), algoritmo canônico da Mini-Tabela para desempates de 3+ equipes (H2H multi-equipe) e preservação das métricas de voleibol (Set Ratio e Point Ratio).
5. `SCORING-AND-MATCH-RULES.md`: Perfis de pontuação configuráveis (FIVB vs. Amador 2/1/0), cascata de herança de regras de partida (`Competition` $\to$ `Stage` $\to$ `Match`), opções configuráveis de W.O. e modelagem de confrontos em duas pernas (Ida e Volta com Golden Set).
6. `FORMAT-COMPATIBILITY-MATRIX.md`: Matriz de cobertura para 12 formatos esportivos (desde pontos corridos até Dupla Eliminação e Suíço).
7. `VOLTZ-ARCHITECTURAL-PROOF.md`: Prova técnica matemática comprovando que o regulamento do Campeonato Voltz é 100% instanciável em JSON com **ZERO linhas de código específico**.

Nenhuma linha de código de produção (`src/`) ou migration foi alterada nesta fase, cumprindo rigorosamente a **Regra Absoluta da Fase 4.2**.

---

## 2. AS 25 DECISÕES ARQUITETURAIS OBRIGATÓRIAS (SEÇÃO 30)

Abaixo estão as respostas técnicas formais e definitivas para as 25 questões formuladas:

### 1. `Stage` deve ser entidade persistida?
**Sim, em modelo híbrido.** A definição estrutural (`StageDefinition`) reside imutavelmente dentro do `CompetitionConfigV2.format.stages` (congelada no `rulesSnapshot`). O estado de execução em tempo de execução (`StageRecord`) é uma entidade persistida (`competition_stages` no Supabase e na chave `volleyscore_competition_stages` no LocalStorage), rastreando status (`pending`, `ready`, `in-progress`, `completed`), datas de início/fim e auditoria.

### 2. `Stage` deve ficar dentro do `CompetitionConfig` ou separado?
**A definição fica dentro do `CompetitionConfig` (SSOT), enquanto a execução fica em tabela relacional associada.** Isso preserva o `rulesSnapshot` como cópia fiel e imutável de todo o regulamento da competição em um único documento JSON.

### 3. `CompetitionFormat` deve ser entidade, enum, objeto ou combinação?
**Combinação (Objeto tipado com Preset Enum).** A interface define uma propriedade `formatType` (enum/preset para facilitar a seleção na UI: `'round-robin'`, `'groups-playoffs'`, `'groups-repechage-playoffs'`, `'custom'`) associada a um array de `stages: StageDefinition[]`. Isso une a simplicidade de templates prontos para o organizador com a flexibilidade de personalização total.

### 4. Como representar uma fase?
Através do contrato formal `StageDefinition`, possuindo `id` estável (slug sem acentos), `order`, `name` (label de apresentação), `type` (`StageType`), `dependsOnStageIds` (dependências do grafo), regras de emparelhamento e lista de `participantFeeds`.

### 5. Como representar grupos?
Como uma configuração de fase (`groupConfig` dentro de `StageDefinition`), contendo `groupsCount` e `teamsPerGroup`. As equipes são distribuídas nos grupos pelo sorteio (`drawService.ts`) e identificadas deterministicamente por `groupIndex` (0 = A, 1 = B, etc.) nas partidas.

### 6. Como representar ranking intergrupos?
Através da função de domínio `computeOverallStandings(groupStandings, options)`. Ela consolida os standings individuais dos grupos e aplica o método configurado (ex: Padrão Olímpico `by-group-position-first`, que compara 1ºs contra 1ºs, 2ºs contra 2ºs, etc.), gerando uma lista unificada de Seeds 1..N.

### 7. Como representar seeds?
Como índices numéricos estáveis (1..N). Na fase inicial, são definidos pelo sorteio de potes ou ranking de entrada. Nas fases subsequentes, são preenchidos dinamicamente pelo `ProgressionEngine` com base nas colocações dos grupos ou do ranking geral.

### 8. Como representar pairing?
Através do `PairingEngine`, um motor desacoplado com 3 geradores principais:
- Gerador de Berger (Round-Robin);
- Gerador de Chaveamento Olímpico (Seeded Elimination Bracket);
- Mapeamento Declarativo por Posições (`custom-pairing`).

### 9. Como representar progressão?
Através de conectores declarativos (`ParticipantFeedDefinition`): `group-position` (ex: 1º Grupo A), `overall-rank` (ex: 5º Geral), `match-result` (ex: vencedor ou perdedor da partida X), `seed` ou `bye`. O `ProgressionEngine` resolve essas referências assim que a fase precedente atinge o status `completed`.

### 10. Como representar bye?
**Como propriedade de slot de emparelhamento (`isBye: true`), NUNCA como equipe falsa (`"__BYE__"`).** O motor eliminatório detecta o slot com Bye e aciona uma transição imediata `bye_advance`, avançando o adversário sem disputar partida nem distorcer estatísticas.

### 11. Como representar ida e volta?
Através do agregado `TieSeriesRecord`, vinculando `match1` (ida) e `match2` (volta). O avanço na chave é determinado pelo número de vitórias na série (2–0), seguido por pontos da partida ou pela disputa obrigatória de um **Golden Set** de 15 pontos em caso de empate (1–1).

### 12. Como representar terceiro lugar?
Como um `StageDefinition` independente do tipo `third-place`, cuja lista de `participantFeeds` consome `{ type: 'match-result', matchId: 'SF-1', outcome: 'loser' }` e `{ type: 'match-result', matchId: 'SF-2', outcome: 'loser' }`.

### 13. Como representar pontuação configurável?
Através de `ScoringRulesConfig` no `CompetitionConfigV2`, permitindo selecionar perfis pré-definidos (`fivb-standard` 3/2/1/0, `simple-amateur` 2/1/0) ou uma tabela customizada de pontos por placar em sets (ex: 2×0, 2×1, 1×2, 0×2).

### 14. Como representar desempate configurável?
Através do array declarativo `tieBreakCriteriaOrder[]` no `CompetitionConfigV2`. Cada campeonato pode escolher e ordenar critérios: `points`, `wins`, `head_to_head_mini_table`, `set_ratio`, `point_ratio`, `set_differential`, `point_differential`, `deterministic_draw`.

### 15. Como resolver confronto direto multi-equipe?
Através do **Algoritmo da Mini-Tabela**: para 3 ou mais equipes empatadas, o sistema extrai exclusivamente as partidas disputadas entre elas e recalcula pontos, vitórias, set ratio e point ratio restritos a esse subconjunto. Se houver desempate parcial, reavalia-se recursivamente entre as remanescentes. Se o empate for circular irredutível, recorre-se aos critérios globais de toda a fase.

### 16. Como representar W.O. configurável?
Através de `WalkoverRulesConfig` no `CompetitionConfigV2`, definindo: placar em sets ao vencedor (2×0 ou 3×0), placar das parciais (25×0), pontos na tabela para vencedor e perdedor (incluindo opção de -1 pt de penalidade) e tratamento estatístico (`include-scores` vs `exclude-from-averages`).

### 17. Como preservar `CanonicalMatchResult`?
Mantendo intactas as funções de validação em `competitionRulesService.ts` (`validateSingleSet`, `validateMatchScore`, `getCanonicalMatchResult`). O novo motor apenas consome a saída canônica já existente e alimenta o `ScoringEngine` e o `StandingsService`.

### 18. Como preservar `rulesSnapshot`?
O `rulesSnapshot` continua congelando o `CompetitionConfig` serializado integralmente no momento da publicação da competição. Como o novo formato reside dentro do `CompetitionConfigV2`, ele é imutabilizado automaticamente sem alterações na infraestrutura de snapshots.

### 19. Como migrar formatos existentes?
Através de um **Adapter de Normalização em Memória**: competições antigas que não possuem o campo `stages` são sintetizadas em tempo de execução gerando as fases padrão equivalentes. Partidas antigas com `phase = 'classificatória'` são mapeadas para o `stageId` da fase de grupos correspondente, sem necessidade de migrations de banco destrutivas.

### 20. Como evitar duplicação entre `drawService`, `playoffsService` e o futuro motor?
Delimitando estritamente as responsabilidades:
- `drawService.ts`: Foca exclusivamente no sorteio (PRNG mulberry32, potes, restrições);
- `playoffsService.ts`: Mantido para compatibilidade das chaves legadas, com novas chaves sendo geradas pelo `BracketEngine`/`PairingEngine`;
- O novo motor atua como orquestrador, delegando a geração matemática de confrontos para submódulos puros.

### 21. Como manter compatibilidade LocalStorage/Supabase?
O `dataAccess.ts` permanece como a única camada de I/O da aplicação. As novas operações de fases (`getStages`, `updateStageStatus`, `createStagesBatch`) são implementadas com paridade rigorosa no LocalStorage e no Supabase.

### 22. Como permitir formatos futuros sem reescrever o motor?
Através da arquitetura orientada a capacidades em Grafo (DAG) e da união discriminada de `ParticipantFeedDefinition`. Novos formatos (como Dupla Eliminação ou repescagens complexas) são criados simplesmente combinando fases e conectando feeds, sem alterar o código dos motores de cálculo.

### 23. Como representar Voltz sem código específico?
Conforme provado matematicamente em `VOLTZ-ARCHITECTURAL-PROOF.md`: definindo 3 fases (`stage-groups`, `stage-repechage`, `stage-quarterfinals`), conectadas por `overall-ranking` e `match-result`, com regras de melhor de 3 e pontuação FIVB. O sistema executa todo o torneio sem um único `if (name === 'Voltz')`.

### 24. Qual é a menor arquitetura necessária para resolver os bloqueadores?
A adição de:
1. `stages: StageDefinition[]` em `CompetitionConfigV2`;
2. Identificadores estáveis `matches.stageId`;
3. A função `computeOverallStandings` no `standingsService.ts`;
4. O algoritmo de Mini-Tabela no `standingsService.ts`;
5. O `ProgressionEngine` com resolução de `ParticipantFeeds`.

### 25. Qual deve ser a ordem das próximas implementações?
- **Fase 4.3 — Domínio Puro e Algoritmos:** Implementar os tipos TypeScript `CompetitionConfigV2`, `computeOverallStandings` e o desempate com Mini-Tabela com 100% de cobertura de testes unitários (TDD).
- **Fase 4.4 — Motores de Pairing e Progressão:** Implementar `PairingEngine` e `ProgressionEngine`, conectando as fases e suportando Byes e repescagem.
- **Fase 4.5 — Persistência e Adapter:** Adicionar a tabela `competition_stages` no Supabase e a coleção correspondente no LocalStorage via `dataAccess.ts`.
- **Fase 4.6 — Interface do Usuário (UI):** Construtor visual de fases no formulário de criação/edição de competição, visualização de repescagem nas partidas e atualização da árvore de playoffs.
- **Fase 4.7 — Homologação End-to-End:** Criação, sorteio, execução de jogos e apuração completa de um torneio teste do Campeonato Voltz em ambiente isolado.

---

## 3. CERTIFICAÇÃO DA FASE 4.2

Com base nas análises minuciosas do código fonte existente, na elaboração dos modelos matemáticos, nas especificações conceituais e na prova de expressividade sem código acoplado:

### **ARQUITETURA DEFINIDA — SEM BLOQUEADORES**

A arquitetura do **Competition Format Engine** está completamente desenhada, justificada pelo código real do BaseOS e pronta para ser implementada a partir da Fase 4.3, preservando integralmente todas as funcionalidades e homologações anteriores.
