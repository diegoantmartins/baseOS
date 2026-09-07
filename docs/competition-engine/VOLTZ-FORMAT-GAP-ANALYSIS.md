# BASEOS — ANÁLISE DE GAPS DO FORMATO VOLTZ

**Documento Técnico:** `docs/competition-engine/VOLTZ-FORMAT-GAP-ANALYSIS.md`  
**Fase:** 4.1 (Auditoria Somente Leitura)  
**Objetivo:** Utilizar o regulamento do Campeonato Voltz como **caso real de homologação arquitetural**, identificando exatamente o que o BaseOS suporta hoje e quais capacidades genéricas precisam ser criadas.

---

## 1. REGRA DE OURO DA AUDITORIA VOLTZ

> **É ESTRITAMENTE PROIBIDO criar código específico para a competição Voltz.**  
> O BaseOS não deve ter `if (competition.name === "Voltz")`, `if (format === "voltz")`, `VoltzService`, `VoltzDrawService` ou qualquer tabela/enum acoplada a um campeonato específico.  
> Todas as necessidades levantadas nesta análise devem ser atendidas por **capacidades genéricas e configuráveis do motor de competições**.

---

## 2. ESPECIFICAÇÃO TÉCNICA DO REGULAMENTO VOLTZ

| Item Regulamentar | Regra Voltz | Status no BaseOS Atual | Classificação |
|---|---|---|:---:|
| **Número de Equipes** | 12 equipes | Suportado (inscrição livre) | **Compatível** |
| **Fase Preliminar** | 4 grupos de 3 equipes (A, B, C, D) | Suportado via `DrawPage` e `drawService` | **Compatível** |
| **Jogos da Fase de Grupos** | Turno único: cada equipe joga 2 partidas (3 jogos por grupo, 12 jogos no total) | Suportado via Tabela Berger com folga | **Compatível** |
| **Formato de Sets** | Todas as partidas em melhor de 3 sets (2 sets vencidos) | Suportado (`setsToWin: 2`, `maxSets: 3`) | **Compatível** |
| **Pontuação dos Sets** | Sets 1 e 2 até 25 pontos; Set 3 (Tiebreak) até 15 pontos | Suportado (`regularSetPoints: 25`, `tiebreakPoints: 15`) | **Compatível** |
| **Vantagem de Pontos** | Vantagem mínima de 2 pontos, sem teto máximo | Suportado (`minAdvantage: 2`, sem limite superior) | **Compatível** |
| **Limite de Elenco** | Até 14 atletas por equipe | Suportado (`maxAthletes: 14` via `CompetitionConfig`) | **Compatível** |
| **Classificação dos Grupos** | Apuração dos 1º, 2º e 3º colocados de cada grupo | Suportado via `computeStandingsByGroup` | **Compatível** |
| **Ranking Geral 1–4** | Campeões de grupo unificados em ranking geral de 1 a 4 | **NÃO SUPORTADO** (não há ranking de 1ºs colocados) | **GAP CRÍTICO** |
| **Ranking Geral 5–12** | 2º e 3º colocados (8 equipes) unificados em ranking geral 5 a 12 | **NÃO SUPORTADO** (não há fusão e ranking de remanescentes) | **GAP CRÍTICO** |
| **Repescagem / Play-in** | Cruzamento eliminatório prévio: 5×12, 6×11, 7×10, 8×9 | **NÃO SUPORTADO** (não há suporte a pré-mata-mata) | **GAP CRÍTICO** |
| **Avanço para Quartas** | 4 vencedores da repescagem avançam para as Quartas contra os seeds 1 a 4 | **NÃO SUPORTADO** (cruzamento de playoffs é rígido) | **GAP CRÍTICO** |
| **Quartas → Semis → Final** | Mata-mata eliminatório tradicional | Suportado se as equipes já estiverem nas Quartas | **Parcial** |

---

## 3. PONTOS INDEFINIDOS NO REGULAMENTO QUE EXIGEM DECISÃO DA ORGANIZAÇÃO

Durante a auditoria profunda do regulamento Voltz, foram identificadas indefinições matemáticas e esportivas no texto do torneio. O BaseOS **não deve adivinhar nem inventar** essas regras:

### 3.1. Cruzamento Exato das Quartas de Final
> **STATUS:** **REGRA INDEFINIDA NO REGULAMENTO / NECESSITA DECISÃO DA ORGANIZAÇÃO**

O regulamento Voltz estabelece que os 4 vencedores da fase de repescagem (provenientes dos jogos 5×12, 6×11, 7×10 e 8×9) enfrentam os 4 campeões de grupo (ranqueados de 1 a 4). Contudo, **o regulamento não define qual vencedor enfrenta qual cabeça de chave**.

Existem três modelos esportivos possíveis:
- **Modelo 1 — Chave Fixa Tradicional (Bracket Invertido):**
  - Quartas 1: 1º Geral × Vencedor do jogo 8×9
  - Quartas 2: 4º Geral × Vencedor do jogo 5×12
  - Quartas 3: 2º Geral × Vencedor do jogo 7×10
  - Quartas 4: 3º Geral × Vencedor do jogo 6×11
- **Modelo 2 — Chave Direta Pareada:**
  - Quartas 1: 1º Geral × Vencedor 5×12
  - Quartas 2: 2º Geral × Vencedor 6×11
  - Quartas 3: 3º Geral × Vencedor 7×10
  - Quartas 4: 4º Geral × Vencedor 8×9
- **Modelo 3 — Re-seeding Dinâmico após Repescagem:**
  - Os 4 vencedores da repescagem são reordenados pelos seus seeds originais. O melhor vencedor enfrenta o 4º, o segundo melhor o 3º, e assim por diante.
- **Modelo 4 — Sorteio Dirigido:**
  - Sorteio cego entre os 4 campeões e os 4 classificados da repescagem.

*Conclusão da Auditoria:* O motor de progressão do BaseOS deve permitir que a organização configure formalmente o critério de cruzamento da próxima fase (`PairingRule`).

---

### 3.2. Detalhes de Pontuação e Critérios de W.O.
> **STATUS:** **REGRA INDEFINIDA NO REGULAMENTO / NECESSITA CONFIRMAÇÃO DA ORGANIZAÇÃO**

O regulamento Voltz menciona W.O. mas não define detalhadamente:
- Se a equipe perdedora por W.O. é imediatamente eliminada do torneio ou se pode disputar a repescagem;
- Se os pontos sofridos/marcados no W.O. impactam o quociente de pontos average para o ranking 5–12.

*Conclusão da Auditoria:* Os parâmetros de W.O. devem ser configuráveis no motor sem fixar penalidades rígidas no código.

---

### 3.3. Empate Triplo no Grupo de 3
> **STATUS:** **REGRA INDEFINIDA NO REGULAMENTO / NECESSITA CONFIRMAÇÃO DA ORGANIZAÇÃO**

Em um grupo de 3 equipes onde cada time disputa 2 jogos, é comum ocorrer empate circular:
- Equipe A vence B por 2x1;
- Equipe B vence C por 2x1;
- Equipe C vence A por 2x1.
Todas as 3 equipes terminam com 1 vitória, 1 derrota e 3 pontos.
O confronto direto entre as 3 é circular e nulo. O regulamento oficial necessita confirmar se o primeiro critério de desempate neste caso é:
1. Saldo de sets;
2. Quociente de sets (Set Average);
3. Saldo de pontos;
4. Quociente de pontos (Pontos Average);
5. Sorteio.

---

## 4. GAPS ARQUITETURAIS DO BASEOS PARA ATENDER VOLTZ

Para que o BaseOS execute uma competição com o regulamento Voltz de forma 100% genérica, os seguintes gaps precisam ser sanados:

### GAP 1: Conceito de Fases Múltiplas e Sequenciais (`Stages`)
- **Problema:** O BaseOS atualmente só reconhece 2 momentos: fase de grupos (`in-progress`) e fase eliminatória (`playoffs`).
- **Necessidade para Voltz:** O torneio requer 3 fases sequenciais:
  $$\text{Fase 1: Grupos} \longrightarrow \text{Fase 2: Repescagem (Play-in)} \longrightarrow \text{Fase 3: Playoffs Finais}$$

### GAP 2: Motor de Ranking Geral Inter-Grupos
- **Problema:** O `standingsService` gera classificações isoladas dentro de cada grupo (`computeStandingsByGroup`). Não existe função para calcular um ranking unificado filtrando por posição de grupo (ex: pegar todos os 1ºs e ranquear de 1 a 4; pegar todos os 2ºs e 3ºs e ranquear de 5 a 12).
- **Necessidade para Voltz:** Um agregador genérico `computeOverallRankingsByPosition(groupStandings, positionFilter)`.

### GAP 3: Motor Genérico de Cruzamentos e Emparelhamentos (`Pairing Engine`)
- **Problema:** `playoffsService.ts` contém apenas as funções fixas `generateFourGroupPlayoffs` e `generateTwoGroupPlayoffs`.
- **Necessidade para Voltz:** Um mecanismo genérico que gere confrontos a partir de sementes (`seeds`):
  - Confronto $X$: Seed 5 contra Seed 12
  - Confronto $Y$: Seed 6 contra Seed 11
  - Confronto $Z$: Seed 7 contra Seed 10
  - Confronto $W$: Seed 8 contra Seed 9

### GAP 4: Motor de Progressão Genérico (`Progression Engine`)
- **Problema:** `advancePlayoffMatches` só move vencedores entre `quartas -> semis -> final`.
- **Necessidade para Voltz:** Capacidade de encaminhar os vencedores da Repescagem para alimentar os slots correspondentes nas Quartas de Final.
