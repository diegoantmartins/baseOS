# BASEOS — AUDITORIA DE FORMATOS DE COMPETIÇÃO

**Documento Técnico:** `docs/competition-engine/COMPETITION-FORMAT-AUDIT.md`  
**Fase:** 4.1 (Auditoria Somente Leitura)  
**Status:** **AUDITORIA CONCLUÍDA — BLOQUEADORES ARQUITETURAIS IDENTIFICADOS**

---

## 1. OBJETIVO

Mapear a capacidade real do BaseOS para suportar diferentes formatos e estruturas de competição esportiva amadora, comprovando o que funciona, o que funciona parcialmente e o que não é suportado pelo código atual.

---

## 2. MATRIZ CONSOLIDADA DE FORMATOS

| Formato | Suportado Hoje | Parcial | Não Suportado | Hardcoded | Configurável | Evidência no Código |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **Grupos + Playoffs (4 grupos)** | **SIM** | | | Sim | Parcial | `playoffsService.ts:46`, `competitionBracketService.ts:157` |
| **Grupos + Playoffs (2 grupos)** | **SIM** | | | Sim | Parcial | `playoffsService.ts:148`, `competitionBracketService.ts:161` |
| **Grupos + Playoffs (1 grupo / 4 equipes)** | **SIM** | | | Sim | Parcial | `competitionBracketService.ts:34-66` |
| **Pontos Corridos (Turno Único)** | | **SIM** | | Parcial | Parcial | `drawService.ts:120`, `competitionLifecycleService.ts:354` |
| **Pontos Corridos (Ida e Volta)** | | | **SIM** | Sim | Não | Inexistente em `drawService.ts` e `dataAccess.ts` |
| **Grupos (3, 5, 6 ou 8 grupos)** | | | **SIM** | Sim | Não | `competitionBracketService.ts:174`, `MatchesPage.tsx:406` |
| **Mata-mata Direto (sem fase de grupos)** | | | **SIM** | Sim | Não | `DrawPage.tsx` força sorteio de grupos |
| **Mata-mata com Oitavas de Final (16 equipes)** | | | **SIM** | Sim | Não | Não há gerador de oitavas em `playoffsService.ts` |
| **Mata-mata com Bye (ex: 10 equipes)** | | | **SIM** | Sim | Não | `playoffsService.ts` só aceita 4 ou 2 grupos |
| **Disputa de 3º Lugar** | **SIM** | | | Sim | Parcial | `playoffsService.ts:123`, `playoffsService.ts:182` |
| **Grupos + Melhores Terceiros (Repescagem)** | | **SIM** | | Sim | Parcial | `standingsService.ts:359` (calcula), mas ignorado em `playoffsService.ts:46` |
| **Formato Voltz (Grupos + Ranking Geral + Repescagem + Playoffs)** | | | **SIM** | Sim | Não | Não há ranking unificado nem repescagem no motor |
| **Liga + Playoffs** | | **SIM** | | Sim | Parcial | 1 grupo gera Final (1º x 2º) e 3º lugar (3º x 4º) |
| **Dupla Eliminação (Winners / Losers bracket)** | | | **SIM** | Sim | Não | Inexistente no modelo de dados e serviços |
| **Sistema Suíço** | | | **SIM** | Sim | Não | Inexistente no modelo de dados e serviços |

---

## 3. AUDITORIA DETALHADA POR FAMÍLIA DE FORMATOS

### 3.1. Pontos Corridos (Round-Robin Geral)

#### Capacidades Comprovadas:
- O motor de sorteio (`src/services/drawService.ts:120-141`) implementa a **Tabela Berger (método do círculo)**.
- Se configurado 1 grupo único (`groupsCount = 1`), gera todos os confrontos em turno único ($N \times (N-1) / 2$).
- Suporta número ímpar de equipes inserindo `'__BYE__'` nas rodadas (`drawService.ts:124`), garantindo folga programada por rodada sem gerar partidas fantasmas.
- A classificação geral (`standingsService.ts:272-319`) calcula todos os indicadores oficiais e ordena as equipes perfeitamente.

#### Limitações e Bloqueadores:
1. **Sem suporte a Ida e Volta:** O algoritmo de Berger gera apenas o primeiro turno. Não existe opção para gerar returno com mando invertido.
2. **Ciclo de vida amarrado a Playoffs:** O `CompetitionLifecycleService.getNextRecommendedStatus` (`competitionLifecycleService.ts:354`) transita incondicionalmente de `in-progress` para `playoffs`. Em um campeonato puramente de pontos corridos onde o 1º colocado é campeão direto, o sistema induz o organizador a gerar playoffs.
3. **Chaveamento compulsório:** Ao gerar playoffs com 1 grupo único, `CompetitionBracketService.generateSingleGroupPlayoffs` cria automaticamente uma Final entre o 1º e o 2º colocado, descaracterizando o formato de pontos corridos puro caso o regulamento preveja campeão direto por pontos.

---

### 3.2. Fase de Grupos

#### Capacidades Comprovadas:
- Distribuição gulosa balanceada por capacidade de grupos (`drawService.ts:49-53`).
- Suporte a modo `random` (sorteio puro) e `seeded` (cabeças de chave distribuídos 1 por grupo) (`drawService.ts:63-113`).
- Grupos podem ter quantidades ligeiramente distintas se o total de equipes não for múltiplo exato (ex: 7 equipes em 2 grupos resulta em um grupo de 4 e um de 3).
- Todos contra todos dentro de cada grupo em turno único.
- Classificação individual calculada por grupo via `computeStandingsByGroup` (`standingsService.ts:329-348`).

#### Limitações e Bloqueadores:
1. **Equipes de grupos diferentes não se enfrentam na fase inicial:** Não há suporte para confrontos inter-grupos (ex: Chave A enfrenta Chave B).
2. **Não há entidade persistente de Grupos:** Grupos não existem no banco de dados como registros independentes. São apenas strings (`"Grupo A"`, `"Grupo B"`) salvas na coluna `matches.group_name` e na tabela `draws.groups`.

---

### 3.3. Mata-Mata (Playoffs Eliminatórios)

#### Capacidades Comprovadas:
- Chaveamento para 4 grupos (8 classificados: 1º e 2º de A, B, C, D) gerando Quartas de Final, Semifinais, Disputa de 3º Lugar e Final (`playoffsService.ts:46-141`).
- Chaveamento para 2 grupos (4 classificados: 1º e 2º de A e B) gerando Semifinais, Disputa de 3º Lugar e Final (`playoffsService.ts:148-196`).
- Chaveamento para 1 grupo (4 classificados gerando 3º lugar e Final; 2 classificados gerando Final direta) (`competitionBracketService.ts:34-66`).
- Avanço automático de vencedores (e perdedores da semifinal para o 3º lugar) ao homologar partidas (`playoffsService.ts:245-377`).
- Apuração do pódio final (`computePodium` em `playoffsService.ts:383-413`).

#### Limitações e Bloqueadores (CRÍTICOS):
1. **Falha total para 3, 5, 6 ou 8 grupos:**
   - Em `CompetitionBracketService.generatePlayoffSlots` (`competitionBracketService.ts:150-175`), a lógica é:
     ```ts
     if (groupsCount >= 4) return generateFourGroupPlayoffs(groupStandings);
     if (groupsCount === 2) return generateTwoGroupPlayoffs(groupStandings);
     if (groupsCount === 1) return generateSingleGroupPlayoffs(...);
     return [];
     ```
   - Se houver 3 grupos: retorna `[]`.
   - Se houver 6 ou 8 grupos: cai em `>= 4`, mas `generateFourGroupPlayoffs` procura explicitamente as letras `'A'`, `'B'`, `'C'`, `'D'` e ignora sumariamente qualquer grupo subsequente!
   - Na UI (`MatchesPage.tsx:406`), existe a trava explícita:
     `toast.info("Geração automática disponível para 1, 2 ou 4 grupos. Torneio configurado com ${comp.groupsCount} grupos.");`
2. **Inexistência de Oitavas de Final:** Embora exista o tipo `'oitavas'` em `PlayoffPhase`, não há nenhuma função geradora de oitavas de final no sistema.
3. **Inexistência de Byes nos Playoffs:** Não há suporte para chaves assimétricas onde equipes folgam na primeira rodada eliminatória.
4. **Cruzamentos Estáticos e Rígidos:** Os cruzamentos são fixos: Quartas 1 (1A x 2B), Quartas 2 (1C x 2D), Quartas 3 (1B x 2A), Quartas 4 (1D x 2C). Não é possível configurar cruzamentos alternativos (ex: sorteio entre os 1º colocados, ou 1A x 2D).

---

### 3.4. Formatos Híbridos (Grupos + Repescagem / Play-in + Playoffs)

#### Situação Atual: **NÃO SUPORTADO**
- **Cenário:** 4 grupos de 3 equipes. Os 4 campeões de grupo avançam para as Quartas. As demais 8 equipes são re-classificadas em um ranking geral (5º ao 12º) para disputar repescagem (5x12, 6x11, 7x10, 8x9), com os vencedores avançando para as Quartas.
- **Auditoria no Código:**
  1. O sistema não tem como fundir os 2º e 3º colocados de todos os grupos em um ranking geral único normalizado.
  2. O sistema não suporta uma fase eliminatória preliminar ("repescagem" ou "pré-quartas") antes das quartas.
  3. O `advancePlayoffMatches` só conhece a cadeia fixa: `quartas -> semifinal -> final/terceiro_lugar`. Não há suporte para `repescagem -> quartas`.

---

## 4. CONCLUSÃO DA AUDITORIA DE FORMATOS

O BaseOS opera com sucesso apenas no formato canônico padrão:
$$\text{Fase de Grupos (1, 2 ou 4 grupos)} \longrightarrow \text{Playoffs Fixos (Quartas/Semis/Final)}$$

Qualquer formato que fuja desse desenho — como pontos corridos puro, mata-mata puro, repescagem, fases intermediárias ou campeonatos com 3, 5, 6 ou mais grupos — é bloqueado pela arquitetura atual.
