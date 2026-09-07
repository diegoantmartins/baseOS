# Walkthrough — Fase 4.3: Domínio e Algoritmos Puros

**Data:** 05/09/2026  
**Status:** IMPLEMENTAÇÃO CONCLUÍDA — DOMÍNIO HOMOLOGADO  
**Módulos Centrais:**  
- `src/types/competitionConfig.ts`
- `src/services/scoringEngine.ts`
- `src/services/tieBreakEngine.ts`
- `src/services/overallStandingsEngine.ts`
- `src/services/standingsService.ts`

---

## 1. Visão Geral da Entrega

A Fase 4.3 teve como foco estrito a **criação do vocabulário matemático e do domínio puro** do novo motor de competições do BaseOS. Ela responde, de forma puramente determinística e isolada de efeitos colaterais:

1. *"Dadas essas equipes, esses resultados e essa configuração de pontuação e desempate, qual é a classificação exata e matematicamente incontestável?"*
2. *"Dada essa classificação e essa configuração de feeds e pareamentos, quais participantes entram no próximo estágio e quais confrontos são montados?"*

Tudo isso foi construído sem que o sistema precise conhecer nomes de campeonatos específicos, mantendo o BaseOS como uma plataforma esportiva universal e configurável.

---

## 2. Destaques da Implementação

### 2.1. SSOT Mantido com Segurança de Tipos
- A evolução do `CompetitionConfig` foi direta e aditiva. Nenhum `CompetitionConfigV2` foi criado.
- A estratégia de agregação intergrupos foi tipada como:
  ```typescript
  type OverallRankingStrategy = 'by-group-position-first' | 'pure-overall-stats' | 'custom';
  ```
  eliminando o escape inseguro de `| string` e garantindo rigor estático no TypeScript.

### 2.2. Mini-Tabela Canônica com Subpartições Recursivas
- Implementação rigorosa do desempate para 2, 3 ou mais equipes.
- Em um empate entre $A, B, C$ onde $A$ se isola ($A > B = C$):
  - $A$ assume a posição superior;
  - O desempate entre $B$ e $C$ é recalculado **estritamente entre $B$ e $C$**, sem voltar a comparar contra $A$.
- Nenhuma ordenação por ordem de inserção ou aleatoriedade implícita: se os critérios configurados se esgotarem sem `'draw'`, o sistema sinaliza:
  ```typescript
  unresolvedTie = true
  ```
  garantindo transparência e integridade para arbitragens e auditorias.

### 2.3. ScoringEngine Consumindo CanonicalMatchResult
- O `ScoringEngine` consome exclusivamente a representação canônica da partida (`CanonicalMatchResult`), unificando pontuação com suporte a presets (`fivb-standard`, `simple-amateur`, `win-loss`, custom points) e W.O. com pontuação concedida/deduzida configurável.

### 2.4. Ranking Geral Intergrupos e Seletores de Feed
- O `OverallStandingsEngine` organiza classificações de múltiplos grupos sob as estratégias configuradas e expõe seletores puros (`getGroupWinners`, `getSecondPlaced`, `getPositionsRange`) para alimentar os estágios subsequentes.

### 2.5. Prova de Domínio do Formato `groups-play-in-knockout`
- O teste `src/test/groupsPlayInKnockout.test.ts` comprova matematicamente a representação completa do formato:
  - 12 equipes $\to$ 4 grupos de 3 $\to$ classificação $\to$ ranking geral $\to$ 1–4 avanço direto, 5–12 play-in $\to$ pareamento high-low (Seed 5 vs Seed 12, Seed 6 vs Seed 11, etc.).
  - Prova adicional com 6 equipes (2 grupos de 3 $\to$ 1–2 avanço direto, 3–6 play-in $\to$ Seed 3 vs Seed 6, Seed 4 vs Seed 5).
  - **Fronteira respeitada:** O teste para exatamente na geração dos pareamentos e definição de participantes, sem executar as rodadas eliminatórias (escopo da Fase 4.4).

---

## 3. DECISÕES E LIMITES DA FASE 4.3

Para resguardar a arquitetura e evitar vazamentos de escopo, as seguintes decisões foram rigorosamente mantidas:

1. **Sem Execução Prematura de Progressão:** O motor de progressão de rodadas, chaveamento eliminatório e avanço de vencedores em tempo real pertence à **Fase 4.4**. Nenhum código de execução prematura foi colocado em produção.
2. **Zero Alterações em Banco de Dados / Migrations:** Nenhuma tabela nova foi adicionada ao Supabase ou ao schema local. A persistência de novos estágios ocorrerá na **Fase 4.5**.
3. **Zero Alterações de Interface Visual:** Nenhuma tela, componente React ou formulário foi alterado na Fase 4.3. Telas e construtores pertencem às Fases 4.6 e 4.7.
4. **Retrocompatibilidade Absoluta com o Legado:** Todos os 638 testes de regressão pré-existentes continuam passando verde sem modificação em seu comportamento esperado.

---

## 4. Verificação e Certificação de Qualidade

```
[Typecheck]  npx tsc -p tsconfig.app.json --noEmit  --> 0 erros
[Linter]     npm run lint                            --> 0 erros
[Vitest]     npm test -- --run                       --> 81 arquivos, 673 testes passando (+35 testes novos)
[Build]      npm run build                           --> Sucesso (dist gerado em 1m 18s)
```

---

## 5. Certificação Oficial

> ### **IMPLEMENTAÇÃO CONCLUÍDA — DOMÍNIO HOMOLOGADO**
> O núcleo de domínio e os algoritmos matemáticos do Competition Format Engine atendem a 100% dos requisitos de pureza funcional, determinismo, configurabilidade e segurança de tipos, estando pronto para servir de alicerce para a **Fase 4.4 (Stages, Pairing, Bracket & Progression Engine)**.
