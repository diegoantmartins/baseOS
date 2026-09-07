# BASEOS — ESPECIFICAÇÃO DE ELEGIBILIDADE PARA O SORTEIO OFICIAL (FASE 3)

**Documento:** DRAW-ELIGIBILITY.md  
**Projeto:** BaseOS (VolleyPro)  
**Módulo:** `CompetitionDrawEligibilityService`  
**Data:** 04/09/2026  
**Status:** CANÔNICO E VIGENTE  

---

## 1. INTRODUÇÃO E OBJETIVO

O sorteio de grupos e confrontos de uma competição oficial de voleibol (quadra ou praia) exige integridade esportiva estrita. Uma equipe não pode ser colocada nas chaves caso não atenda integralmente aos requisitos regulamentares da competição.

Historicamente, o sistema realizava verificações superficiais no frontend como `ct.status !== 'rejected'`, permitindo que equipes sem elenco, sem mínimo de atletas ou pertencentes a outros campeonatos pudessem inadvertidamente ingressar no motor de sorteio (`drawService.ts`).

A **Fase 3** institui o serviço de domínio canônico:

```text
src/services/competitionDrawEligibilityService.ts
```

como **fonte única e mandatória** para responder à pergunta:

> *"Esta equipe está oficialmente apta a participar do sorteio desta competição?"*

---

## 2. NÍVEIS DE DECISÃO

A arquitetura estabelece dois níveis de decisão claramente desacoplados:

### Nível 1: Elegibilidade da Equipe (`TeamDrawEligibility`)
Avalia se uma agremiação individual vinculada à competição (`CompetitionTeam`) cumpre todos os critérios técnicos, regulamentares e cadastrais para ser sorteada.

### Nível 2: Prontidão da Competição para o Sorteio (`CompetitionDrawEligibilityReport`)
Avalia se a competição como um todo atende aos pré-requisitos esportivos e estruturais para que o sorteio oficial possa ser gerado e salvo pelo organizador.

---

## 3. CRITÉRIOS DE ELEGIBILIDADE DA EQUIPE

Toda avaliação individual de equipe é realizada por:

```ts
evaluateTeamDrawEligibility(
  competition: CompetitionRecord,
  competitionTeam: CompetitionTeam,
  athletes: CompetitionAthlete[],
  options?: { now?: number }
): TeamDrawEligibility
```

A equipe é considerada **Elegível (`eligible: true`)** se, e somente se, **todos** os seguintes requisitos forem satisfeitos:

1. **Vínculo Correto com a Competição:**
   - `competitionTeam.competitionId === competition.id`.
   - Se pertencer a outra competição, é sumariamente bloqueada com blocker explicável.

2. **Status da Inscrição Válido:**
   - Status regulamentares impeditivos (`'rejected'`) bloqueiam a equipe imediatamente.
   - Status válidos: `'submitted'`, `'approved'`, `'in_progress'`, `'invited'` (desde que o elenco cumpra o limite mínimo exigido).

3. **Mínimo Regulamentar de Atletas no Elenco:**
   - O número de atletas é comparado estritamente com os limites regulamentares extraídos do `CompetitionConfig` através do serviço canônico:
     ```ts
     const limits = CompetitionRulesService.getRosterLimits(competition);
     ```
   - **NUNCA há valores numéricos hardcoded** (como 6 ou 14).
   - Para quadra (indoor): default do regulamento (mínimo 6 atletas).
   - Para praia (beach): default do regulamento (mínimo 2 atletas).
   - Para configurações customizadas: respeita o valor exato configurado no `CompetitionConfig.rosterLimits.minAthletes`.
   - Se `athletes.length < limits.minAthletes`, a equipe é bloqueada com o motivo:
     `"Elenco incompleto: X/Y atletas (mínimo regulamentar: Y)."`

4. **Estado da Competição:**
   - A competição não pode estar nos estados terminais `'cancelled'` ou `'completed'`.

---

## 4. PRONTIDÃO GLOBAL DA COMPETIÇÃO (`canExecuteDraw`)

A avaliação global da competição é realizada por:

```ts
evaluateCompetitionDrawEligibility(
  competition: CompetitionRecord,
  competitionTeams: CompetitionTeam[],
  athletes: CompetitionAthlete[],
  options?: { now?: number }
): CompetitionDrawEligibilityReport
```

Para que `canExecuteDraw: true`, a competição deve satisfazer:

1. **Ciclo de Vida Adequado:**
   - O status da competição deve permitir sorteio.
   - O fluxo esportivo canônico exige o encerramento formal das inscrições (`status: 'registration-closed'`) antes da realização do sorteio oficial.
   - Competições em `'cancelled'`, `'completed'` ou `'in-progress'` têm o sorteio bloqueado.
   - Se ainda estiver em `'registration-open'`, o relatório emite o bloqueio indicando a necessidade de encerramento prévio.

2. **Número Mínimo de Equipes Elegíveis:**
   - O número de equipes elegíveis deve atender à capacidade mínima do formato configurado:
     - Formatos com múltiplos grupos (`groups_and_playoffs` ou `groupsCount > 1`): exige no mínimo `groupsCount * 2` equipes para garantir pelo menos 2 equipes por chave.
     - Formato mata-mata direto (`knockout`): exige no mínimo 2 equipes.
     - Formato geral: exige no mínimo 2 equipes elegíveis.
   - Se houver equipes insuficientes, o sorteio é bloqueado com blocker detalhado informando a quantidade atual e a necessária.

---

## 5. INTERFACE DO RELATÓRIO CANÔNICO

```ts
export interface TeamDrawEligibility {
  teamId: string;
  competitionTeamId: string;
  teamName: string;
  teamShortName?: string;
  eligible: boolean;
  reasons: string[];
  blockers: string[];
  athleteCount: number;
  minAthletes: number;
  maxAthletes?: number;
  status: CompetitionTeam['status'];
}

export interface CompetitionDrawEligibilityReport {
  competitionId: string;
  competitionStatus: CompetitionRecord['status'];
  canExecuteDraw: boolean;
  drawBlockers: string[];
  totalTeams: number;
  eligibleCount: number;
  blockedCount: number;
  eligibleTeams: TeamDrawEligibility[];
  ineligibleTeams: TeamDrawEligibility[];
  allEvaluations: TeamDrawEligibility[];
}
```

---

## 6. INTEGRAÇÃO COM O SORTEIO (`drawService.ts` E `DrawPage.tsx`)

O `drawService.ts` é o motor matemático do sorteio (PRNG determinístico, Fisher-Yates, Head Seeds, Tabela de Berger) e **não deve tomar decisões de elegibilidade**.

O pipeline de execução é:

```text
CompetitionConfig (Regras Oficiais)
       ↓
CompetitionRulesService (Interpretação Canônica)
       ↓
CompetitionDrawEligibilityService (Avaliação Canônica)
       ↓
Relatório de Elegibilidade (eligibleTeams vs ineligibleTeams)
       ↓
DrawPage.tsx (Exibição de Diagnóstico + Bloqueio de Ações)
       ↓
DrawService.generateDraw(...) (Recebe ESTRITAMENTE as eligibleTeams)
       ↓
Persistência Oficial (saveDrawWithMatches)
       ↓
CompetitionLifecycleService.advanceToGroupsDefinedAfterDraw(...)
```

---

## 7. PRESERVAÇÃO DE EQUIPES BLOQUEADAS

O fechamento de inscrições e a geração do relatório **jamais excluem ou desvinculam equipes com elenco incompleto**.

Todas as equipes (`allEvaluations`) continuam cadastradas e visíveis no sistema:
- O painel de diagnóstico lista claramente as equipes elegíveis e as bloqueadas.
- O motivo de cada bloqueio é apresentado em texto claro para o operador.
- Isso assegura total transparência esportiva, histórico cadastral e auditabilidade.
