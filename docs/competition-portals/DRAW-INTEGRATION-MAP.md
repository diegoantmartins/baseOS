# BASEOS — INTEGRAÇÃO DO MOTOR DE SORTEIO COM O FLUXO DE INSCRIÇÕES
## Auditoria Técnica do Sorteio, Algoritmos, Elegibilidade de Equipes e Análise de Riscos

**Projeto:** BaseOS (VolleyPro)  
**Data:** 04/09/2026  
**Documento:** `docs/competition-portals/DRAW-INTEGRATION-MAP.md`  

---

## 1. FLUXO ATUAL DO SORTEIO (`DrawPage.tsx`)

### 1.1. De Onde o Sorteio Obtém as Equipes?
Em [`src/pages/DrawPage.tsx:124-157`](file:///home/diego-martins/docker/volei/src/pages/DrawPage.tsx#L124-L157):

```ts
const refresh = useCallback(async () => {
  const [comps, teams, cts, ms, draws] = await Promise.all([
    dataAccess.listCompetitions(),
    dataAccess.listTeams(),
    dataAccess.listCompetitionTeams(),
    dataAccess.listMatches(),
    dataAccess.listDraws(),
  ]);
  // ...
});

const registeredTeams = useMemo(() => {
  if (!selected) return [];
  const cts = competitionTeams.filter(
    ct => ct.competitionId === selected.id && ct.status !== 'rejected'
  );
  return cts
    .map(ct => teams.find(t => t.id === ct.teamId))
    .filter((t): t is TeamRecord => Boolean(t));
}, [selected, competitionTeams, teams]);
```

### 1.2. Execução do Algoritmo (`drawService.ts`)
- O usuário escolhe a quantidade de grupos (`groupsCount`) e o modo de sorteio (`'random'` ou `'seeded'`).
- No modo `'seeded'`, pode selecionar as cabeças de chave (`headSeeds`).
- A função `runDraw(selected, registeredTeams, config)`:
  1. Cria entradas `DrawTeamEntry` com índice `seed: 1..N`.
  2. Distribui equipes nos grupos através de `distributeTeamsIntoGroups`:
     - Utiliza o PRNG determinístico `mulberry32(seed)`.
     - No modo `'seeded'`, posiciona uma cabeça de chave por grupo na ordem de prioridade.
     - As demais equipes são embaralhadas e distribuídas nos grupos com vagas disponíveis (balanceamento guloso).
  3. Gera a tabela de partidas com `generateDrawMatches`:
     - Utiliza o método do círculo (Berger table round-robin).
     - Cada dupla joga uma única vez; se a quantidade de equipes for ímpar, aplica rodada de folga (`__BYE__`).

### 1.3. Persistência do Sorteio e Geração de Partidas
- O organizador clica em "Salvar Sorteio Oficial".
- Invoca `dataAccess.saveDrawWithMatches(result, matchProposals)`:
  - Checa se já existem partidas jogadas ou iniciadas na fase de grupos; se houver, rejeita com erro.
  - Remove partidas antigas não iniciadas da fase classificatória.
  - Insere as novas partidas com status `'scheduled'` e horários calculados.
  - Atualiza o registro em `public.draws` (ou `localStorage.draws`).

---

## 2. ANÁLISE RIGOROSA DE RISCOS DE INTEGRIDADE

### 2.1. Risco: Equipe de Outra Competição Entrar no Sorteio
- **Nível de Risco:** **BAIXO**.
- **Diagnóstico:** O filtro `competitionTeams.filter(ct => ct.competitionId === selected.id)` garante isolamento relacional por competição. Não há evidência de vazamento de equipes entre torneios distintos.

### 2.2. Risco: Equipe Duplicada no Sorteio
- **Nível de Risco:** **BAIXO**.
- **Diagnóstico:** A tabela `public.competition_teams` possui constraint `unique (competition_id, team_id)`, e a camada de serviço `CompetitionRegistrationService.canRegisterTeam` barra inscrições duplicadas da mesma agremiação.

### 2.3. Risco: Equipe Não Confirmada ou sem Elenco Entrar no Sorteio
- **Nível de Risco:** **CRÍTICO / ALTO**.
- **Diagnóstico:** O filtro de equipes aceita qualquer status diferente de `rejected`:
  `ct.status !== 'rejected'`
- Isso permite que:
  - Equipes com status `'invited'` (convite recém-criado, com 0 atletas) entrem no sorteio.
  - Equipes `'in_progress'` que não terminaram o elenco entrem no sorteio.
  - Equipes que descumprem o mínimo de atletas (`minAthletes` da `CompetitionConfig`) gerem partidas oficiais na tabela.
- **Correção Necessária:** O sorteio deve exigir status `'approved'` ou `'submitted'` E validação do elenco mínimo via `CompetitionRegistrationService.validateRosterMinimum`.

### 2.4. Risco: Sorteio Ocorrer Antes do Encerramento das Inscrições
- **Nível de Risco:** **ALTO**.
- **Diagnóstico:** O botão "Realizar Sorteio" na `DrawPage` fica habilitado assim que `registeredTeams.length >= 2`, mesmo que:
  - O prazo de inscrição da competição ainda esteja aberto.
  - A competição esteja com status `'planning'` ou `'registration-open'`.
  - O `CompetitionLifecycleService.validateTransition(comp, 'groups-defined')` exige que as inscrições estejam encerradas, mas a tela `DrawPage` **não invoca** essa validação de transição de status.

### 2.5. Risco: Alteração de Inscrição Após o Sorteio
- **Nível de Risco:** **ALTO**.
- **Diagnóstico:** Salvar o sorteio não altera o status das inscrições para `'locked'` nem o status da competição para `'groups-defined'`. Se o prazo de inscrição (`registrationDeadline`) de alguma equipe ainda não tiver expirado, o gestor pode continuar adicionando ou removendo atletas após os grupos já terem sido oficializados.

### 2.6. Risco: Estado da Competição Após o Sorteio
- **Nível de Risco:** **MÉDIO**.
- **Diagnóstico:** `saveDrawWithMatches` grava o sorteio e gera as partidas, mas **não atualiza a competição pai** de `'registration-closed'` para `'groups-defined'`. O organizador precisa ir manualmente até a `CompetitionsPage` para avançar o status.

---

## 3. ESPECIFICAÇÃO DA REGRA FUNDAMENTAL DE INTEGRAÇÃO

Para o novo fluxo operacional:

```text
1. Uma equipe inscrita com elenco aprovado (>= minAthletes) é ELEGÍVEL.
2. Nenhuma equipe é adicionada manualmente ao sorteio.
3. O sorteio carrega automaticamente 100% das equipes ELEGÍVEIS da competição.
4. O sorteio só pode ser executado se competition.status === 'registration-closed'.
5. Ao oficializar o sorteio:
   - Todas as inscrições são permanentemente congeladas (isLocked = true).
   - O status da competição avança atomicamente para 'groups-defined'.
   - Os confrontos da fase de grupos são persistidos.
```
