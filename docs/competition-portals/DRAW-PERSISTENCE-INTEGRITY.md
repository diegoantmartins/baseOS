# BASEOS — INTEGRIDADE DE PERSISTÊNCIA DO SORTEIO E GRUPOS

**Data:** 05/09/2026  
**Sistema:** BaseOS  
**Módulo:** Sorteio Oficial e Geração de Partidas  

---

## 1. Fluxo Canônico do Sorteio

O ciclo de realização e homologação do sorteio oficial segue a sequência obrigatória:

```text
1. Avaliação de Elegibilidade das Equipes (CompetitionDrawEligibilityService)
       ↓
2. Validação da Restrição Técnica de Chaves (Equipes Elegíveis >= groupsCount * 2)
       ↓
3. Execução do Algoritmo de Sorteio (Gerador de Grupos e Seeds)
       ↓
4. Persistência do Sorteio e Geração de Partidas (saveDrawWithMatches)
       ↓
5. Confirmação Real de Persistência (Verificação de Partidas em dataAccess.listMatches)
       ↓
6. Promoção do Lifecycle para 'groups-defined' (advanceToGroupsDefinedAfterDraw)
```

---

## 2. Guarda de Persistência antes de `groups-defined`

### 2.1 O Problema Anterior
Em versões anteriores, a transição para `groups-defined` era disparada logo após a computação do sorteio em memória ou imediatamente após a chamada de salvamento, sem confirmar se o banco de dados havia de fato gravado as partidas correspondentes. Caso uma falha ocorresse na inserção dos confrontos, a competição avançava para `groups-defined` com tabela de jogos vazia.

### 2.2 Solução Implementada
No método [`advanceToGroupsDefinedAfterDraw`](file:///home/diego-martins/docker/volei/src/services/competitionLifecycleService.ts):
```ts
// Guarda ativa de integridade técnica:
const matches = await dataAccess.listMatches(competitionId);
if (!matches || matches.length === 0) {
  return {
    ok: false,
    from: currentStatus,
    to: 'groups-defined',
    errors: ['Não é possível avançar para grupos definidos sem partidas persistidas para a fase de grupos.'],
  };
}
```
Isso assegura que nenhuma competição transicione de estado sem que as partidas existam de fato na camada de persistência.

---

## 3. Diagnóstico Detalhado de Elegibilidade

O serviço [`CompetitionDrawEligibilityService`](file:///home/diego-martins/docker/volei/src/services/competitionDrawEligibilityService.ts) provê transparência completa ao organizador, retornando um relatório contendo:
- Lista de equipes elegíveis (`eligibleTeams`);
- Lista de equipes inelegíveis (`ineligibleTeams`), com seus respectivos motivos e pendências de elenco (`reasons`, `blockers`);
- Diagnóstico estrutural da competição (`minTeamsForGroups`, `groupsCount`, `isReadyForDraw`).

---

## 4. Limitações Transacionais Conhecidas

- **Operação Sequencial vs. Transação Única:**
  O método `saveDrawWithMatches` grava primeiramente a estrutura do sorteio na tabela de competições/grupos e, subsequentemente, itera na inserção dos registros de partidas da fase de grupos. Embora a integridade de lifecycle seja garantida pela guarda de confirmação posterior (que impede a mudança de estado em caso de falha), as escritas no Supabase ocorrem de forma sequencial, e não sob um único bloco `BEGIN ... COMMIT` atômico via RPC PostgreSQL.
  - **Classificação Formal:** *Operação sequencial com guarda de validação pós-persistência*.
