# BASEOS — FASE 4.1: RELATÓRIO E WALKTHROUGH EXECUTIVO DA AUDITORIA

**Data de Realização:** 05/09/2026  
**Modo de Execução:** Auditoria Somente Leitura (Audit Only)  
**Certificação Final:** **AUDITORIA CONCLUÍDA — BLOQUEADORES ARQUITETURAIS IDENTIFICADOS**

---

## 1. RESUMO EXECUTIVO

A auditoria da **Fase 4.1** avaliou profundamente a arquitetura esportiva do **BaseOS**, analisando serviços, entidades, persistência (LocalStorage e Supabase), regras de classificação, sorteio, validação matemática e geração de confrontos.

O sistema possui uma base muito estável e madura para o formato tradicional de voleibol: **Fase de Grupos (1, 2 ou 4 grupos) com avanço direto para Playoffs fixos (Quartas/Semis/Final)**. O cálculo do Resultado Canônico (`CanonicalMatchResult`), as regras de pontuação de sets e tiebreak com vantagem aberta e os limites de elenco via `CompetitionConfig` operam com alta precisão e 100% de aprovação nos testes existentes (638 testes unitários e de integração aprovados).

Entretanto, foram identificados **bloqueadores arquiteturais críticos** para competições amadoras com formatos diferentes:
1. O BaseOS **não possui a entidade nem o conceito de Fases (`Stages`)**: as fases são strings livres em `matches.phase`.
2. O chaveamento eliminatório e o avanço de equipes estão **hardcoded** em `playoffsService.ts` para 2 ou 4 grupos, falhando completamente para 3, 5, 6 ou 8 grupos.
3. Não existe suporte a **ranking unificado inter-grupos** (essencial para formatos com repescagem/play-in, como o Campeonato Voltz).
4. O desempate por **confronto direto (`head-to-head`) opera exclusivamente em comparação binária (2 equipes)**, gerando inconsistências matemáticas em empates triplos.
5. Não há suporte a **ida e volta**, **mata-mata direto com byes**, nem chaveamento sem fase de grupos prévia.

---

## 2. ARQUITETURA ATUAL

O fluxo do sistema hoje é linear e rígido:
$$\text{Competition} \to \text{CompetitionConfig} \to \text{Draw} \to \text{Groups} \to \text{Matches} \to \text{Results} \to \text{Standings} \to \text{Playoffs} \to \text{Podium}$$

- O agregador de dados não conhece fases intermediárias.
- A persistência de partidas é feita em lote via `dataAccess.saveDrawWithMatches`.
- A classificação separa equipes estritamente por grupo (`computeStandingsByGroup`), sem camada de agregação para repescagem.

---

## 3. COMPONENTES AUDITADOS

| Componente | Arquivo Principal | Responsabilidade |
|---|---|---|
| **Contrato Canônico de Configuração** | `src/types/competitionConfig.ts` | SSOT de sets, pontuação, desempate e elenco. |
| **Entidades Persistidas** | `src/types/entities.ts` | Definição de `CompetitionRecord`, `MatchRecord`, `TeamRecord`. |
| **Motor de Regras Esportivas** | `src/services/competitionRulesService.ts` | Normalização, sets, resultado canônico, W.O., validação de placar. |
| **Motor de Classificação e Desempates** | `src/services/standingsService.ts` | Acúmulo de estatísticas, set/pontos average, desempates ordenáveis. |
| **Motor de Chaveamentos** | `src/services/competitionBracketService.ts` | Geração de slots eliminatórios a partir da classificação. |
| **Motor de Playoffs e Avanço** | `src/services/playoffsService.ts` | Estrutura de Quartas/Semis/Final e propagação de vencedores. |
| **Motor de Sorteio (Draw Engine)** | `src/services/drawService.ts` | Sorteio PRNG (mulberry32), distribuição gulosa e Tabela Berger. |
| **Validador de Sorteio** | `src/services/drawValidator.ts` | Regras de capacidade, integridade de cabeças de chave e quórum. |
| **Ciclo de Vida da Competição** | `src/services/competitionLifecycleService.ts` | Máquina de estados (`planning` até `completed`), travas de integridade. |
| **Elegibilidade de Sorteio** | `src/services/competitionDrawEligibilityService.ts` | Validação de quórum mínimo e integridade de elenco por equipe. |
| **Integridade de Inscrições** | `src/services/competitionRegistrationService.ts` | Defesa contra duplicidade de atletas e remoção de equipes com jogos. |
| **Camada de Acesso a Dados (Adapter)** | `src/services/dataAccess.ts` | I/O transparente entre LocalStorage e Supabase. |
| **Emissão de Súmulas Oficiais** | `src/lib/pdf/matchSheetPdf.ts` | Renderização do documento oficial de partida em A4 P&B. |
| **Portal Público** | `src/pages/PublicCompetitionPage.tsx` | Projeção sanitizada sem expor dados privados. |
| **Banco de Dados (PostgreSQL)** | `supabase/migrations/*` | Tabelas, constraints, triggers, RLS e RPCs. |

---

## 4. FORMATOS SUPORTADOS

- **Fase de Grupos (4 grupos) + Playoffs Olímpicos:** 1º e 2º de cada grupo avançam para Quartas, Semis, 3º lugar e Final.
- **Fase de Grupos (2 grupos) + Playoffs:** 1º e 2º de cada grupo avançam para Semis, 3º lugar e Final.
- **Grupo Único (4 equipes) + Playoffs:** 1º e 2º disputam a Final; 3º e 4º disputam o 3º lugar.
- **Disputa de 3º Lugar:** Suportada com encaminhamento automático dos perdedores das semifinais.

---

## 5. FORMATOS PARCIALMENTE SUPORTADOS

- **Pontos Corridos (Turno Único):** A tabela de jogos e a classificação funcionam via Berger de 1 grupo, mas o ciclo de vida do sistema exige a transição para `playoffs` e tenta gerar uma Final em vez de declarar o 1º colocado campeão direto.
- **Melhores Terceiros Colocados:** O cálculo estatístico existe (`computeBestThirds` em `standingsService.ts`), mas a função de geração de confrontos de playoffs **ignora os terceiros colocados** e não os aloca na chave.

---

## 6. FORMATOS NÃO SUPORTADOS

- **Formato Voltz (Grupos + Ranking Geral 5–12 + Repescagem + Quartas):** Impossível de executar no modelo atual.
- **Competições com 3, 5, 6 ou 8 grupos:** O gerador de playoffs retorna lista vazia `[]`.
- **Mata-mata Direto sem Fase de Grupos:** O sorteio da `DrawPage` só suporta divisão em grupos.
- **Mata-mata com Byes:** Inexistente na chave eliminatória.
- **Ida e Volta (Turno e Returno / Confronto Agregado):** Inexistente em grupos e playoffs.
- **Dupla Eliminação (Winners / Losers bracket):** Inexistente.
- **Sistema Suíço:** Inexistente.

---

## 7. MOTOR DE PONTUAÇÃO

- **Estrutura:** Canônica e pura em `CompetitionRulesService.calculateCompetitionPoints`.
- **Valores FIVB Padrão:**
  - Vitória 3x0 ou 3x1 (Melhor de 5) / 2x0 (Melhor de 3): 3 pontos.
  - Vitória 3x2 (Melhor de 5) / 2x1 (Melhor de 3): 2 pontos.
  - Derrota 2x3 (Melhor de 5) / 1x2 (Melhor de 3): 1 ponto.
  - Derrota 0x3 ou 1x3 (Melhor de 5) / 0x2 (Melhor de 3): 0 pontos.
  - Vitória por W.O.: 3 pontos; Derrota por W.O.: 0 pontos.
- **Gap:** Valores existem no contrato `CompetitionConfig.scoring`, mas **não possuem interface gráfica para customização**.

---

## 8. MOTOR DE CLASSIFICAÇÃO

- **Implementação:** `standingsService.ts:accumulateStats`.
- **Indicadores:** Jogos, vitórias, derrotas, sets pró/contra, saldo de sets, quociente de sets (set average), pontos pró/contra, saldo de pontos, quociente de pontos (pontos average), pontos na tabela e flag provisória.
- **Pontos Positivos:** Utiliza o Resultado Canônico oficial, garantindo que partidas incompletas ou inválidas não contaminem as estatísticas.

---

## 9. MOTOR DE DESEMPATE

- **Implementação:** `standingsService.ts:evaluateSingleCriterion`.
- **Critérios Suportados:** Pontos, vitórias, confronto direto, set average, pontos average, saldo de sets, saldo de pontos, sorteio.
- **Ordem:** Totalmente configurável no array `tiebreakCriteriaOrder`.
- **Bloqueador Matemático:** O confronto direto só funciona em comparação bilateral (2 equipes). Em empates com 3 ou mais equipes, o método gera inconsistências no sort (quebra de transitividade) e não constrói a mini-tabela obrigatória pelas regras oficiais da FIVB/CBV.

---

## 10. MOTOR DE FASES

- **Diagnóstico:** **INEXISTENTE**.
- O sistema não possui a abstração `Stage` ou `Phase` no banco ou na arquitetura de serviços. A coluna `phase` na tabela `matches` é apenas uma string descritiva.
- O ciclo de vida global possui apenas dois momentos de disputa: `in-progress` (fase de grupos) e `playoffs` (eliminatórias). Não é possível criar uma terceira fase (ex: Repescagem).

---

## 11. MOTOR DE PROGRESSÃO

- **Diagnóstico:** **HARDCODED E RÍGIDO**.
- Em `playoffsService.ts:advancePlayoffMatches`, o avanço é estático:
  - Quartas 1 e 2 alimentam a Semifinal 1;
  - Quartas 3 e 4 alimentam a Semifinal 2;
  - Semifinalistas vencidos alimentam a Disputa de 3º Lugar;
  - Semifinalistas vencedores alimentam a Grande Final.
- Não existem regras de progressão dinâmicas (como ranqueamento por posição de grupo, repescagem, repescagem invertida ou sementes dinâmicas).

---

## 12. DRAW ENGINE (MOTOR DE SORTEIO)

- **Implementação:** `src/services/drawService.ts`.
- **Algoritmos:** PRNG determinístico mulberry32, distribuição equilibrada de vagas, alocação de cabeças de chave (`headSeeds`) e Tabela Berger para todos contra todos em turno único.
- **Diagnóstico:** O motor é eficiente para grupos, mas **está sobrecarregado**, assumindo a responsabilidade de gerar partidas quando isso deveria ser competência de um motor de formatos de competição.

---

## 13. GERAÇÃO DE PARTIDAS

- **Fluxo:** O sorteio gera propostas (`DrawMatchProposal[]`) que são persistidas em lote em `dataAccess.saveDrawWithMatches`.
- **Playoffs:** Gerados posteriormente na tela de jogos (`MatchesPage.tsx:410`) via `CompetitionBracketService.buildPlayoffMatchRecords`.
- **Gap:** A persistência em `saveDrawWithMatches` limpa o banco usando `.in('phase', ['classificatória', 'classificatoria'])`, demonstrando forte acoplamento com strings literais em português.

---

## 14. MELHOR DE 3 E MELHOR DE 5 SETS

- **Implementação:** `CompetitionRulesService.resolveMatchFormat` e `validateMatchScore`.
- **Suporte Real:** Totalmente suportado via `setsToWin: 2` (melhor de 3) e `setsToWin: 3` (melhor de 5).
- **Sobrescrita:** Funciona perfeitamente por fase (ex: grupos em melhor de 3, semifinais e final em melhor de 5).

---

## 15. W.O. (WALK-OVER)

- **Implementação:** `CompetitionRulesService.getCanonicalMatchResult` e `calculateCompetitionPoints`.
- **Tratamento:** Atribui vitória por $2\times0$ ou $3\times0$, pontuação de $50\times0$ ou $75\times0$, e concede 3 pontos na tabela para o vencedor e 0 para o perdedor.
- **Gap:** Não permite regras customizadas de W.O. (como desclassificação da equipe e anulação dos jogos disputados anteriormente).

---

## 16. IDA E VOLTA

- **Diagnóstico:** **NÃO SUPORTADO**.
- Não há suporte para confrontos em dois jogos (ida e volta) com desempate por saldo de sets/pontos ou Golden Set.

---

## 17. BYE (FOLGA)

- **Em Grupos:** Suportado via token interno `'__BYE__'` na Tabela Berger para número ímpar de equipes.
- **Em Mata-mata:** Não suportado na grade eliminatória.

---

## 18. COMPETITIONCONFIG COMO SSOT

### Matriz de Conformidade:

| Regra Esportiva | Presente no `CompetitionConfig`? | Fonte Atual no Sistema | Status SSOT | Problema / Risco |
|---|:---:|---|:---:|---|
| **Modalidade (Quadra/Praia)** | Não | `CompetitionRecord.modality` | Parcial | Não integra o objeto `config` |
| **Formato de Sets (setsToWin)** | Sim | `config.format.defaultSetsToWin` | **SSOT Real** | Funciona perfeitamente |
| **Sobrescrita de Sets por Fase** | Sim | `config.format.phaseOverrides` | **SSOT Real** | Funciona perfeitamente |
| **Pontos por Set e Tiebreak** | Sim | `config.format.setRules` | **SSOT Real** | Funciona perfeitamente |
| **Vantagem Mínima de Pontos** | Sim | `config.format.setRules.minAdvantage` | **SSOT Real** | Funciona perfeitamente |
| **Pontuação na Tabela (FIVB)** | Sim | `config.scoring` | **SSOT Real** | Não possui formulário na UI |
| **Pontuação de W.O.** | Sim | `config.scoring.pointsWoWin/Loss` | **SSOT Real** | Rígido sem regras de anulação |
| **Ordem dos Desempates** | Sim | `config.standings.tiebreakCriteriaOrder` | **SSOT Real** | Duplicado em `CompetitionRecord` |
| **Classificados por Grupo** | Sim | `config.standings.advancingPerGroup` | **SSOT Real** | Duplicado em `CompetitionRecord` |
| **Melhores Terceiros** | Sim | `config.standings.bestThirds` | Parcial | Ignorado pelo gerador de playoffs |
| **Limites de Elenco (Atletas)** | Sim | `config.registration.min/maxAthletes` | **SSOT Real** | Consumido por RPC e frontend |
| **Capitães e Líberos** | Sim | `config.registration.maxCaptains/Liberos` | **SSOT Real** | Consumido pelo cadastro |
| **Formato Macro da Disputa** | **NÃO** | `CompetitionRecord.format` (string) | **Violado** | Não reside no `config` |
| **Quantidade de Grupos** | **NÃO** | `CompetitionRecord.groupsCount` | **Violado** | Não reside no `config` |
| **Regras de W.O. Específicas** | **NÃO** | `CompetitionRecord.woRules` (texto) | **Violado** | Coluna de texto livre não interpretada |
| **Fases e Cruzamentos** | **NÃO** | Hardcoded em `playoffsService.ts` | **Violado** | Inexistente em configuração |

---

## 19. HARDCODES ENCONTRADOS

1. `playoffsService.ts:46-141`: Cruzamentos de Quartas fixos em 1A x 2B, 1C x 2D, 1B x 2A, 1D x 2C.
2. `playoffsService.ts:148-196`: Cruzamentos de Semifinais fixos em 1A x 2B, 1B x 2A.
3. `competitionBracketService.ts:157-175`: Limitação estrita para 1, 2 ou 4 grupos.
4. `competitionLifecycleService.ts:354`: Transição compulsória de `in-progress` para `playoffs`.
5. `dataAccess.ts:1049`: Exclusão de partidas pré-sorteio amarrada a strings literais `['classificatória', 'classificatoria']`.
6. `TournamentBracket.tsx:51`: Títulos de rodadas no visualizador de chaveamento fixos em `['Quartas de Final', 'Semifinal', 'Final']`.
7. `draw.ts:75-80`: `suggestGroupsCount` sugere 3 grupos para 12 equipes, formato não suportado pelo gerador de playoffs.

---

## 20. CLASSIFICAÇÃO DE PROBLEMAS POR SEVERIDADE

### CRÍTICO
1. **Ausência de Abstração de Fases (`Stages`):** Impede a modelagem de torneios com 3 ou mais fases sequenciais (ex: Grupos $\to$ Repescagem $\to$ Quartas $\to$ Semis $\to$ Final).
2. **Playoffs Hardcoded:** Impossibilidade de gerar chaveamento eliminatório para competições com qualquer quantidade de grupos diferente de 1, 2 ou 4.
3. **Inexistência de Motor de Ranking Inter-Grupos:** Impede a unificação de posições (ex: ranking geral dos 1ºs e ranking dos restantes) para alimentar fases seguintes.

### ALTO
4. **Empate Triplo no Confronto Direto:** Algoritmo bilateral falha em desempates circulares entre 3 equipes.
5. **Formato da Competição Fora do `CompetitionConfig`:** O tipo de disputa é uma string solta sem semântica no motor esportivo.
6. **Segurança Supabase (RLS Aberto):** As políticas em `matches` e `competitions` permitem escrita para qualquer usuário autenticado (`for all to authenticated using true`).

### MÉDIO
7. **Parâmetros de Pontuação e Desempate Inacessíveis na UI:** Configuração existe no TypeScript, mas o organizador não consegue alterá-la pela interface.
8. **Melhores Terceiros Inoperantes no Chaveamento:** Calculados na classificação mas ignorados na geração de jogos.
9. **Impacto Estatístico Distorcido no W.O.:** Atribuição de placar fixo $50\times0$ distorce quocientes de pontos.

### BAIXO
10. **Aviso de ESLint em `DrawArenaCanvas.tsx`:** Hook `useMemo` com dependência ausente.

---

## 21. ANÁLISE DO FORMATO VOLTZ

A auditoria comprovou que o BaseOS consegue representar os seguintes aspectos do Campeonato Voltz:
- 12 equipes;
- 4 grupos de 3 equipes;
- Turno único Berger com 2 jogos por equipe;
- Melhor de 3 sets (25/25/15) com vantagem aberta;
- Elenco de até 14 atletas;
- Classificação interna de cada grupo.

**O que o BaseOS NÃO consegue representar hoje para a Voltz:**
- Ranqueamento dos 4 campeões de grupo de 1 a 4;
- Ranqueamento dos demais 8 times de 5 a 12;
- Geração dos 4 jogos da fase de repescagem (5x12, 6x11, 7x10, 8x9);
- Avanço dos vencedores da repescagem para cruzar com os seeds 1 a 4 nas Quartas.

**Pontos Indefinidos no Regulamento Voltz:**
- O cruzamento exato das Quartas de Final precisa de definição formal da organização.
- O tratamento disciplinar e pontual de W.O. precisa de confirmação.

---

## 22. RISCOS IDENTIFICADOS

- **Risco de Quebra Esportiva:** Se um organizador configurar 3 ou 6 grupos, o sistema gera os grupos normalmente, mas trava na hora de gerar as finais.
- **Risco de Inconsistência de Ranking:** Em caso de empate triplo, a ordenação das equipes na tabela pode ser incorreta e contestada pelas agremiações.
- **Risco de Segurança:** Qualquer usuário autenticado da aplicação pode enviar chamadas diretas ao banco Supabase e modificar o resultado de partidas ou os dados de competições alheias.

---

## 23. RECOMENDAÇÃO DE ARQUITETURA

Evoluir o sistema para um modelo baseado em **Fases (`Stages`)**, onde uma competição é composta por uma ou mais etapas:
1. `Stage`: Entidade persistida com tipo (`round-robin`, `single-elimination`), regras e ciclo de vida.
2. `PairingRule`: Algoritmo desacoplado que gera confrontos (Berger, Bracket por Sementes ou Mapeamento Personalizado).
3. `ProgressionRule`: Conector genérico que consome os resultados de uma fase (posições ou vencedores) e alimenta as vagas da fase seguinte.

---

## 24. O QUE NÃO DEVE SER ALTERADO

- A definição e derivação de `CanonicalMatchResult` em `CompetitionRulesService`.
- A validação matemática de sets e vantagem mínima de 2 pontos.
- O acúmulo canônico de estatísticas em `standingsService.accumulateStats`.
- O congelamento idempotente e imutável de `rulesSnapshot`.
- O layout e o motor de geração de súmulas em PDF (`matchSheetPdf.ts`).

---

## 25. O QUE DEVE SER ALTERADO FUTURAMENTE (FASE 4.2+)

1. Incluir a definição de formato macro dentro de `CompetitionConfig`.
2. Criar a entidade e a tabela `stages` para gerenciar fases com status próprio.
3. Generalizar o `playoffsService` para um motor de chaveamento orientado a sementes (`BracketEngine`).
4. Implementar o agregador de ranking unificado entre grupos (`computeOverallStandings`).
5. Implementar o motor de desempate multi-equipe para confronto direto em empates triplos.
6. Proteger as tabelas `matches` e `competitions` no RLS do Supabase para restringir escrita a organizadores/administradores.
7. Expor os parâmetros de pontuação e critérios de desempate na interface gráfica.

---

## 26. RESPOSTAS ÀS 23 PERGUNTAS DO ESCOPO DA AUDITORIA

1. **O que o BaseOS suporta hoje?** Fase de grupos (1, 2 ou 4 grupos) com avanço direto para mata-mata olímpico tradicional (Quartas/Semis/3º/Final), sets em melhor de 3 ou 5 com vantagem aberta e pontuação padrão FIVB.
2. **O que está hardcoded?** Os cruzamentos de mata-mata (1A x 2B, etc.), a transição do ciclo de vida para playoffs, e a validação de fases por strings literais (`'classificatória'`).
3. **O que já é configurável?** Formato de sets (`setsToWin`), regras de sets (25/15/2), sobrescrita de sets por fase, ordem dos critérios de desempate e limites de elenco.
4. **O que está configurável apenas parcialmente?** Sistema de pontuação na tabela (está no TypeScript, mas sem tela de edição na UI) e quantidade de grupos (aceita qualquer número no sorteio, mas o mata-mata só aceita 1, 2 ou 4).
5. **Como funcionam atualmente pontos e desempates?** Pontos são calculados via `CompetitionRulesService.calculateCompetitionPoints` (3, 2, 1, 0, 3, 0); desempates usam `evaluateSingleCriterion` iterando na ordem de `tiebreakCriteriaOrder`.
6. **Como funcionam grupos?** Equipes são sorteadas por Berger com PRNG mulberry32; grupos são salvos como strings em `matches.group_name` e `draws.groups`.
7. **Como funciona o mata-mata?** Gerado por `CompetitionBracketService.generatePlayoffSlots` a partir dos classificados dos grupos, com avanço automático de vencedores via `advancePlayoffMatches`.
8. **Existe verdadeiro conceito de fases?** Não. A fase é uma coluna de texto livre em `matches.phase`.
9. **Existe verdadeiro conceito de progressão?** Não. Existe apenas propagação hardcoded de Quartas para Semis e de Semis para Final/3º lugar.
10. **Como as partidas são geradas?** Propostas geradas pelo sorteio Berger são persistidas em lote em `dataAccess.saveDrawWithMatches`; partidas de mata-mata são geradas em `MatchesPage` chamando `buildPlayoffMatchRecords`.
11. **Como equipes avançam?** Ao homologar uma partida de playoffs, `advancePlayoffMatches` localiza o próximo confronto com base em índices fixos de slot e atualiza o `teamAId` ou `teamBId`.
12. **Como o ranking é produzido?** Produzido em memória via `computeStandingsByGroup` a partir do histórico de partidas concluídas.
13. **Como o confronto direto é calculado?** `headToHeadWinner` conta vitórias entre 2 times; falha matematicamente em empates com 3 ou mais equipes.
14. **Como W.O. funciona?** Atribui placar padrão ($2\times0$ ou $3\times0$), $50\times0$ ou $75\times0$ em pontos, e 3 pontos na tabela para o vencedor; não anula jogos anteriores.
15. **3 e 5 sets estão realmente suportados?** Sim, perfeitamente integrados com validação de tiebreak e vantagem mínima de 2 pontos sem limite de teto.
16. **O `CompetitionConfig` é realmente SSOT?** Sim para sets, pontuação, desempates e elenco. Não para o formato geral da competição, fases e quantidade de grupos.
17. **Quais regras ainda estão espalhadas?** Cruzamentos eliminatórios em `playoffsService.ts`, transição de status em `competitionLifecycleService.ts` e deleção de jogos por fase literal em `dataAccess.ts`.
18. **O modelo atual consegue representar Voltz?** Não. Faltam o ranking geral unificado (1–4 e 5–12) e a fase preliminar de repescagem.
19. **O que falta para representar Voltz sem código específico?** Entidade `Stage`, agregador de ranking por posições de grupo e motor de emparelhamento por sementes (`PairingRule`).
20. **Quais abstrações precisam existir para suportar outros campeonatos?** `Stage`, `PairingRule` e `ProgressionRule`.
21. **O que deve ser implementado primeiro?** A incorporação do formato da competição no `CompetitionConfig` e o motor de agregação de ranking inter-grupos.
22. **Qual é a arquitetura mínima necessária?** Suporte a fases sequenciais (`stages`) com fontes de dados configuráveis (`feed`).
23. **Quais formatos devemos homologar primeiro?** 
    1. Grupos + Mata-mata Olímpico (atual aperfeiçoado);
    2. Pontos Corridos Puro (turno único e ida e volta);
    3. Campeonato Voltz (Grupos + Repescagem + Playoffs).

---

## 27. CERTIFICAÇÃO FINAL DA FASE 4.1

### **AUDITORIA CONCLUÍDA — BLOQUEADORES ARQUITETURAIS IDENTIFICADOS**

*Conclusão:* A auditoria cumpriu rigorosamente todos os requisitos da Fase 4.1 em modo somente-leitura. O relatório documenta formalmente o estado do código e serve de subsídio para a definição e aprovação da Fase 4.2 de implementação.
