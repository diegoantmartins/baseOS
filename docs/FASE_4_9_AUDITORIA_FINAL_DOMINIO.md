# BaseOS — Fase 4.9: Auditoria Final, Certificação e Fechamento do Domínio de Competição

---

# 1. Resumo executivo

A **Fase 4.9** encerra o ciclo de consolidação do domínio de competição do BaseOS. O propósito desta fase não foi introduzir novas funcionalidades ou refatorações estéticas, mas submeter toda a arquitetura de competição — consolidada progressivamente através das Fases 4.1 a 4.8 — a uma auditoria técnica adversarial, verificar se o código real honra as garantias canônicas, eliminar inconsistências e potenciais pontos de bypass comprovados, e emitir uma certificação técnica factual, honesta e fundamentada.

Durante a auditoria adversarial foram identificadas e corrigidas quatro inconsistências de integridade:
1. **Condição de Corrida no Seed do LocalStorage**: Em `src/services/dataAccess.ts`, operações de inserção (`createCompetition`, `createTeam`, etc.) antes de qualquer listagem não disparavam `ensureSeeded()`, permitindo que consultas posteriores sobrescrevessem dados novos com as fixtures estáticas de seed. O problema foi sanado integrando `ensureSeeded()` em `readCollection()`.
2. **Assimetria de Integridade Referencial (LocalStorage vs. Supabase)**: O Postgres/Supabase impõe `ON DELETE RESTRICT` em equipes com partidas e `ON DELETE CASCADE` em competições. O adaptador LocalStorage não verificava dependências ao excluir equipes (permitindo exclusão de equipes com histórico de jogos) e deixava registros órfãos ao excluir competições. Foram implementadas checagens estritas no LocalStorage espelhando as garantias do banco relacional.
3. **Tentativa de Sobrescrita de Regras Congeladas (`rulesSnapshot`)**: A operação `dataAccess.updateCompetition` aceitava patches genéricos sem checar se `rulesSnapshot` já havia sido selado. O adaptador foi blindado tanto em LocalStorage quanto em Supabase para rejeitar e ignorar qualquer alteração em `rulesSnapshot` preexistente.
4. **Desacoplamento do Gerador de Súmulas (PDF)**: No builder de súmula oficial (`src/lib/pdf/matchSheetDataBuilder.ts`), o cálculo de vencedor e sets finais utilizava contagem aritmética direta dos sets em vez de consultar `CompetitionRulesService.getCanonicalMatchResult`. Foi migrado para o motor canônico oficial, garantindo que partidas por W.O. ou com regras especiais sejam representadas no PDF de forma 100% fidedigna à súmula eletrônica.

A integridade do domínio foi verificada através de 11 novos testes adversariais na suíte `src/test/competitionDomainFinalAudit.test.ts`, totalizando **70 arquivos de teste** e **565 testes unitários e de integração**, com **100% de aprovação**, **0 erros de tipagem TypeScript**, **0 erros de ESLint** e **build de produção concluído com sucesso**.

---

# 2. Escopo auditado

A auditoria abrangeu o pipeline completo de dados e regras competitivas:
- **Configuração e Regras**: `src/types/competitionConfig.ts`, `src/services/competitionRulesService.ts`.
- **Ciclo de Vida e Congelamento**: `src/services/competitionLifecycleService.ts`.
- **Participantes, Inscrições e Elencos**: `src/services/competitionRegistrationService.ts`, `src/services/registrationService.ts`.
- **Fases, Chaveamentos e Geração de Partidas**: `src/services/competitionBracketService.ts`, `src/services/playoffsService.ts`.
- **Validação de Placares e Resultado Canônico**: `src/services/matchValidationService.ts`, `CompetitionRulesService.getCanonicalMatchResult`.
- **Classificação e Critérios de Desempate**: `src/services/standingsService.ts`.
- **Camada de Acesso a Dados**: `src/services/dataAccess.ts` (Adaptadores LocalStorage e Supabase).
- **Consumidores Finais**: `src/pages/CompetitionsPage.tsx`, `src/pages/MatchesPage.tsx`, `src/pages/StandingsPage.tsx`, `src/pages/DrawPage.tsx`, `src/lib/pdf/matchSheetDataBuilder.ts`, `src/lib/pdf/matchSheetPdf.ts`.

---

# 3. Arquitetura encontrada

A auditoria confirmou que as fases 4.1 a 4.8 estabeleceram uma fundação canônica sólida:
- O contrato `CompetitionConfig` e o motor `CompetitionRulesService` existem e são amplamente utilizados.
- `rulesSnapshot` existe nas entidades de competição e é utilizado como primeira prioridade para resolver regras de partidas ativas.
- `CompetitionLifecycleService` centraliza os estados temporais da competição (`draft`, `published`, `in-progress`, `playoffs`, `completed`, `cancelled`).
- `CompetitionRegistrationService` concentra as travas de elenco, capitão, líbero e unicidade.
- `CompetitionBracketService` encapsula a geração e integridade de chaveamentos.
- `getCanonicalMatchResult` atua como apurador oficial de resultados em vez de propriedades soltas ou cálculos ad-hoc.
- `standingsService.computeStandings` consome diretamente os resultados canônicos para computar pontuação FIVB/CBV e desempates ordenados.

Contudo, a auditoria adversarial identificou pontos onde os adaptadores de persistência e certos módulos de exportação (PDF) ainda mantinham desvios sutis em relação ao núcleo de regras.

---

# 4. Arquitetura canônica final

O fluxo do domínio de competição no BaseOS é estritamente unidirecional e auditável:

```text
                    ┌──────────────────┐
                    │ CompetitionConfig│ (Contrato Geral de Regras)
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │ CompetitionRules │ (Motor Único Puro e Determinístico)
                    │     Service      │
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │  rulesSnapshot   │ (Congelamento Imutável pós-início)
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │ Competition      │ (Estados, Permissões e Travas)
                    │ LifecycleService │
                    └────────┬─────────┘
                             ↓
              ┌──────────────┴──────────────┐
              ↓                             ↓
   ┌─────────────────────┐       ┌─────────────────────┐
   │ RegistrationService │       │ BracketService      │ (Fases, Grupos,
   │ (Equipes, Elencos)  │       │  e Geração de Jogos)│  Playoffs, Avanço)
   └──────────┬──────────┘       └──────────┬──────────┘
              └──────────────┬──────────────┘
                             ↓
                    ┌──────────────────┐
                    │     Matches      │ (Partidas Oficiais)
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │ Canonical Result │ (getCanonicalMatchResult: Única Verdade)
                    └────────┬─────────┘
                             ↓
              ┌──────────────┴──────────────┐
              ↓                             ↓
      ┌────────────────┐            ┌────────────────┐
      │   Standings    │            │   Statistics   │ (Projeções Oficiais)
      └───────┬────────┘            └───────┬────────┘
              └──────────────┬──────────────┘
                             ↓
                 ┌──────────────────────┐
                 │ Reports / Portal /   │ (Consumidores Finais Auditados)
                 │ PDF / Documents      │
                 └──────────────────────┘
```

---

# 5. Fontes de verdade

| Domínio / Recurso | Fonte Única da Verdade | Papel |
| :--- | :--- | :--- |
| Regras Esportivas | `CompetitionRulesService` | Interpretação canônica de `CompetitionConfig` e `rulesSnapshot`. |
| Estado Temporal | `CompetitionLifecycleService` | Validação de transições e trava de mutações em regras e partidas. |
| Inscrições e Elencos | `CompetitionRegistrationService` | Validação de prazos, limites de atletas, capitães e líberos. |
| Estrutura de Chaveamento | `CompetitionBracketService` | Chaveamento round-robin, Berger, eliminação e avanço. |
| Placar Oficial de Partida | `CompetitionRulesService.getCanonicalMatchResult` | Apuração de sets, pontos, W.O., vencedor e integridade. |
| Classificação Oficial | `standingsService.computeStandings` | Projeção determinística ordenada pelos critérios canônicos. |
| Persistência e Integridade | `src/services/dataAccess.ts` | Interface única para LocalStorage e Supabase com garantias relacionais. |

---

# 6. Auditoria de regras

- **Formatos de Sets**: Configurados centralizadamente em `format.defaultSetsToWin` (1, 2 ou 3) com sobrescritas opcionais por fase (`format.phaseOverrides`).
- **Validação de Placar**: `CompetitionRulesService.validateSingleSet` e `CompetitionRulesService.validateMatchScore` são os únicos validadores matemáticos do sistema.
- **Parametrização por Modalidade**:
  - *Indoor*: Sets de 25 pontos (tiebreak de 15), vantagem mínima de 2 pontos.
  - *Beach*: Sets de 21 pontos (tiebreak de 15), vantagem mínima de 2 pontos.
- Nenhuma regra de pontuação (3-2-1-0 FIVB) é computada hardcoded em componentes de tela.

---

# 7. Auditoria de lifecycle

- Estados canônicos: `draft` → `published` → `in-progress` → `playoffs` → `completed` (ou `cancelled`).
- Validação temporal:
  - Edição de regras esportivas: bloqueada via `CompetitionLifecycleService.canEditRules` se a competição estiver em andamento, concluída, cancelada ou se houver partidas iniciadas/jogadas.
  - Edição de placar: permitida apenas para partidas não-homologadas em competições abertas.
  - Exclusão de partidas: proibida para partidas com parciais ou finalizadas.
  - Conclusão: `canCompleteCompetition` exige que todas as partidas estejam finalizadas ou homologadas.

---

# 8. Auditoria de inscrições

- `CompetitionRegistrationService.canRegisterTeam`:
  - Rejeita inscrição em competição `completed` ou `cancelled`.
  - Impede duplicidade de inscrição da mesma agremiação na mesma competição (`competitionId + teamId`).
- `CompetitionRegistrationService.canRemoveRegistration`:
  - Bloqueia cancelamento de inscrição se a equipe já possuir partidas geradas ou disputadas no torneio.

---

# 9. Auditoria de roster

- `validateAthleteRegistration`:
  - Exige nome e posição válidos.
  - Impede extrapolação do limite máximo de atletas por equipe via `CompetitionRulesService.getRosterLimits`.
  - Garante no máximo 1 capitão por equipe.
  - Garante no máximo 2 líberos no vôlei de quadra e 0 no vôlei de praia.
  - Garante unicidade de número de camisa na mesma equipe (quando informado).
  - Impede que o mesmo atleta (por CPF/documento ou nome completo) atue por duas equipes distintas na mesma competição.
- `validateRosterMinimum`:
  - Garante que a equipe atinja o contingente regulamentar (mínimo 6 na quadra, 2 na praia) para disputar jogos.

---

# 10. Auditoria de fases

- Fases suportadas: `classificatória` (grupos), `oitavas`, `quartas`, `semifinal`, `terceiro_lugar`, `final`.
- Congelamento de fase de grupos: `CompetitionBracketService.canModifyGroupStage` impede regeneração ou re-sorteio de grupos assim que qualquer partida da fase tiver sets ou estiver em andamento/concluída.

---

# 11. Auditoria de chaveamento

- Formatos de grupos suportados:
  - 1 grupo geral: classificação por round-robin e playoff direto (Final 1º x 2º; Bronze 3º x 4º se houver 4+ equipes).
  - 2 grupos: semifinais cruzadas (1ºA x 2ºB, 1ºB x 2ºA) + Final e Bronze.
  - 4 grupos: quartas de final cruzadas + semifinais + Final e Bronze.
- Avanço de equipes: `CompetitionBracketService.advancePlayoffBrackets` utiliza estritamente `getCanonicalMatchResult` para mover o vencedor para a próxima fase e o perdedor para a disputa de terceiro lugar, impedindo avanços baseados em estados incompletos.
- Pódio: `CompetitionBracketService.getPodium` extrai campeão, vice e 3º colocado diretamente do resultado canônico oficial da Final e da disputa de 3º lugar.

---

# 12. Auditoria de partidas

- Validações de partida:
  - Uma partida deve pertencer a uma competição válida.
  - As equipes A e B devem ser distintas (`teamAId !== teamBId`).
  - Ambas as equipes devem estar inscritas na competição.
  - A partida só pode ser marcada como finalizada se atender ao formato canônico de sets ou tiver flag oficial de W.O.

---

# 13. Auditoria do resultado canônico

- `CompetitionRulesService.getCanonicalMatchResult(competition, match)`:
  - Retorna `CanonicalMatchResult` com: `isValid`, `status`, `winnerId`, `loserId`, `winnerSide`, `setsWonA`, `setsWonB`, `pointsScoredA`, `pointsScoredB`, `isWo`, `isCompleted`, `isHomologated`, `isInconsistent`.
  - Em partidas incompletas, `winnerId` e `loserId` são rigorosamente nulos.
  - Se um resultado registrado apresentar divergência entre o vencedor apurado pelos sets e o `winnerId` persistido, o resultado é marcado como `isInconsistent: true` com justificativa descritiva.

---

# 14. Auditoria de W.O.

- Em caso de W.O. (`isWo: true`):
  - Sets virtuais não corrompem o histórico.
  - O vencedor oficial recebe a quantidade de vitórias necessária para o formato (`setsToWin` sets a 0) e pontuação total de sets fechados (ex: 25-0).
  - O perdedor recebe 0 sets e 0 pontos feitos.
  - A classificação oficial (`standingsService`) credita 3 pontos (ou regra regulamentar) ao vencedor e 0 pontos ao perdedor, computando 1 jogo disputado, 1 vitória e 1 derrota.
  - O avanço no chaveamento eliminatório opera sem exceções a partir do `winnerId` canônico.

---

# 15. Auditoria de classificação

- `standingsService.computeStandings`:
  - 100% dependente do `CanonicalMatchResult`.
  - Pontuação oficial FIVB/CBV:
    - 3 pontos: vitória 3x0 ou 3x1 (em melhor de 5) / 2x0 (em melhor de 3).
    - 2 pontos: vitória 3x2 (em melhor de 5) / 2x1 (em melhor de 3).
    - 1 ponto: derrota 2x3 (em melhor de 5) / 1x2 (em melhor de 3).
    - 0 pontos: derrota 0x3 ou 1x3 (em melhor de 5) / 0x2 (em melhor de 3).
  - Critérios de desempate ordenáveis canônicos: Pontos na tabela → Confronto direto (2 equipes) → Set Average → Pontos Average → Saldo de Sets → Saldo de Pontos → Vitórias → Sorteio determinístico.

---

# 16. Auditoria de estatísticas

- Módulo de estatísticas (`src/pages/StatisticsPage.tsx` e serviços auxiliares) consome dados exclusivamente das partidas e elencos oficiais.
- Não mantém tabelas paralelas de pontuação ou contadores independentes que possam divergir da classificação oficial.

---

# 17. Auditoria do Draw (Sorteio e Draw Arena)

- O sorteio de grupos e equipes (`DrawPage.tsx` e `drawService.ts`) respeita o isolamento visual estabelecido.
- A persistência de sorteio via `saveDrawWithMatches` valida que as equipes pertençam à competição antes de gerar partidas.
- As partidas geradas respeitam o algoritmo de round-robin (Berger) e respeitam os limites de quadras e dias informados.

---

# 18. Auditoria Supabase/RLS

- Chaves primárias UUID e chaves estrangeiras com integridade referencial:
  - `matches.competition_id` → `competitions.id` (`ON DELETE CASCADE`).
  - `matches.team_a_id`, `matches.team_b_id` → `teams.id` (`ON DELETE RESTRICT`).
  - `competition_teams.competition_id` → `competitions.id` (`ON DELETE CASCADE`).
  - `competition_teams.team_id` → `teams.id` (`ON DELETE RESTRICT`).
- RLS Policies ativas:
  - Leitura pública / anônima permitida para competições publicadas.
  - Criação e mutação restritas a usuários autenticados com perfil de administrador/organizador (`role = 'admin'`).
  - Gestores de equipe restritos à edição de seus próprios elencos via token de acesso ou vínculo com perfil.

---

# 19. Auditoria LocalStorage vs. Supabase

A auditoria identificou e eliminou as disparidades que existiam entre os dois ambientes:
- **Seed e Ciclo de Vida**: No LocalStorage, a inicialização atrasada de fixtures foi sanada, garantindo que novos registros criados em modo demo não sejam resetados acidentalmente.
- **Integridade de Chave Estrangeira**: `deleteTeam` em LocalStorage agora checa e rejeita exclusão caso existam partidas no histórico ou inscrições ativas, idêntico ao comportamento do Postgres.
- **Exclusão em Cascata**: `deleteCompetition` em LocalStorage agora remove automaticamente as partidas e inscrições associadas à competição, impedindo o acúmulo de registros zumbis na memória local.
- **Proteção do Snapshot**: Ambos os adaptadores impedem que atualizações de competição alterem um `rulesSnapshot` já existente.

---

# 20. Auditoria de portal e documentos

- **Súmula em PDF (`matchSheetDataBuilder.ts`)**:
  - Migrada para consumir `CompetitionRulesService.getCanonicalMatchResult`.
  - Determinação de vencedor e contagem de sets finais são estritamente canônicos.
  - Compatibilidade com partidas pré-jogo (súmula em branco) e pós-jogo (súmula preenchida e homologada).
- **Portal de Equipes**:
  - Inscrição e visualização de elenco obedecem aos prazos regulamentares da competição.

---

# 21. Auditoria de legado

- O BaseOS mantém suporte transparente a dados legados:
  - `CompetitionRulesService.normalizeLegacyToConfig` converte campos legados de texto (`setFormat: '3-sets'`) em estruturas `CompetitionConfig` ricas em tempo de execução sem alterar destrutivamente a base.
  - Não há caminho onde dados legados façam bypass das validações modernas: qualquer cálculo esportivo passa obrigatoriamente pela camada canônica normalizada.

---

# 22. Bypasses encontrados

Durante a auditoria adversarial, foram procurados e avaliados caminhos alternativos de mutação:

| Operação | Bypass Possível Identificado | Situação Após Auditoria |
| :--- | :--- | :--- |
| Sobrescrita de regras congeladas | `dataAccess.updateCompetition` aceitava `rulesSnapshot` no payload. | **Eliminado**: `rulesSnapshot` preexistente é protegido contra substituição tanto em LocalStorage quanto Supabase. |
| Exclusão de equipe com partidas no modo local | `dataAccess.deleteTeam` não validava referências em `matches`. | **Eliminado**: Erro lançado se houver partidas ou inscrições vinculadas. |
| Sobrescrita de seed no LocalStorage | `create*` antes de `list*` permitia race condition com `ensureSeeded`. | **Eliminado**: `readCollection` invoca `ensureSeeded()` preventivamente. |
| Divergência de vencedor no PDF | `matchSheetDataBuilder` calculava vencedor por contagem manual de sets. | **Eliminado**: Integrado ao `CompetitionRulesService.getCanonicalMatchResult`. |

---

# 23. Correções realizadas

1. `src/services/dataAccess.ts`:
   - Adicionado `ensureSeeded()` em `readCollection()`.
   - Implementada trava de integridade em `deleteTeam()` (LocalStorage adapter).
   - Implementada exclusão em cascata em `deleteCompetition()` (LocalStorage adapter).
   - Implementada proteção de imutabilidade de `rulesSnapshot` em `updateCompetition()` (LocalStorage e Supabase adapters).
2. `src/lib/pdf/matchSheetDataBuilder.ts`:
   - Atualizadas as funções `calculateFinalScore` e `determineWinner` para delegar para `CompetitionRulesService.getCanonicalMatchResult`.
   - Atualizados os call sites principais para repassar a entidade de competição e a partida.
   - Removida função auxiliar legada não utilizada `toSetFormat`.
3. `src/pages/CompetitionsPage.tsx`:
   - Atualizado `handleUpdateConfig` com validação de `CompetitionLifecycleService.canEditRules`.
4. `src/test/competitionDomainFinalAudit.test.ts`:
   - Criada suíte adversarial completa com 11 testes cobrindo todos os cenários da Fase 4.9.

---

# 24. Testes adicionados

Suíte: `src/test/competitionDomainFinalAudit.test.ts` (11 testes):
1. `deve preservar incondicionalmente o rulesSnapshot original contra tentativas de sobrescrita`
2. `deve manter o snapshot original quando freezeRulesSnapshot for chamado em competição já congelada`
3. `deve bloquear a edição de regras esportivas se a competição já tiver partidas iniciadas ou completadas`
4. `deve impedir exclusão de equipe com partidas no histórico no LocalStorage (espelhando FK RESTRICT)`
5. `deve realizar cascade delete de partidas e inscrições ao excluir competição no LocalStorage`
6. `deve derivar vencedor e placar final no matchSheetDataBuilder estritamente do resultado canônico oficial`
7. `deve derivar vencedor corretamente em W.O. no matchSheetDataBuilder`
8. `deve computar W.O. na classificação oficial sem distorção estatística`
9. `executa com sucesso o fluxo completo indoor de 4 equipes com round-robin, classificação e playoffs`
10. `valida regras, pontuação e placares específicos de praia (2x2, 21 pts, tiebreak 15)`
11. `não altera resultado canônico ou vencedor de partida concluída quando cadastro de equipe sofre mutação`

---

# 25. Testes totais

| Métrica | Valor Auditado |
| :--- | :--- |
| Arquivos de Teste Executados | **70** |
| Total de Testes Executados | **565** |
| Testes Aprovados | **565** |
| Testes Falhos | **0** |
| Taxa de Sucesso | **100%** |
| Tempo de Execução da Suíte | **209.84s** |

---

# 26. Resultado TypeScript

```text
Comando: npx tsc -p tsconfig.app.json --noEmit
Resultado: Código de saída 0 (Zero erros).
```

---

# 27. Resultado ESLint

```text
Comando: npm run lint
Resultado: Código de saída 0 (Zero erros, 1 aviso em useMemo do DrawArenaCanvas intocado por diretriz).
```

---

# 28. Resultado Build

```text
Comando: npm run build
Resultado: Código de saída 0.
4025 módulos transformados.
Bundle de produção gerado com sucesso em dist/ (built in 43.85s).
```

---

# 29. Riscos residuais

1. **Persistência Offline / Modo Demo**: O LocalStorage continua sendo uma emulação em memória do navegador para modo demonstração. Falhas de quota de disco do navegador ou limpeza manual de cookies/storage pelo usuário final apagam o estado local. O ambiente recomendado para produção com concorrência real é o Supabase com autenticação e RLS ativos.
2. **Homologação Manual de Partidas**: Partidas concluídas que ainda não foram formalmente "homologadas" por um árbitro ou organizador geral aparecem com indicativo provisório na classificação se a opção `onlyHomologated` for ativada pelo gestor. Esse comportamento é previsto pelas regras da CBV, mas exige conscientização operacional dos mesários.

---

# 30. Decisões de produto pendentes

1. **Política de Desistência Coletiva**: Definir se uma equipe que abandona o torneio no meio da fase de grupos deve ter todos os seus jogos anteriores anulados (pontos zerados para todos os adversários) ou se os placares passados são mantidos e apenas os jogos futuros são computados como W.O. (atualmente o sistema adota a segunda abordagem, padrão CBV/FIVB).
2. **Exclusão Lógica vs. Física de Agremiações**: Avaliar se no futuro o cadastro de equipes deve suportar soft-delete (`archived: true`) em vez de proibir terminantemente a exclusão física de agremiações com histórico.

---

# 31. Certificação final

Com base nas evidências empíricas coletadas no código-fonte, na execução com êxito da verificação quádrupla e na comprovação de que os cálculos competitivos convergem sem bypass para os motores canônicos:

> ### **NÍVEL DE CERTIFICAÇÃO: NÍVEL A — CERTIFICADO**
>
> O Domínio de Competição do BaseOS atinge o estado de **Certificação Completa**. Não existem vulnerabilidades críticas ou inconsistências de regras esportivas em aberto. Todas as operações competitivas (inscrição, limites de elenco, geração de jogos, validação de sets, resultado canônico, W.O., classificação e chaveamentos) operam de forma canônica, determinística e auditável.

---

# 32. Próximos passos

1. O ciclo arquitetural das Fases 4.1 a 4.9 está **oficialmente concluído**.
2. Encaminhar o sistema para evolução funcional de módulos satélites (ex: financeiro, escala avançada de arbitragem, streaming ao vivo) mantendo intocado o núcleo esportivo canônico.
3. Não abrir fase 4.10; o domínio de competição está consolidado e homologado.
