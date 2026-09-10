# WALKTHROUGH — FASE SÚMULA 4

## Auditoria de Integração da Súmula com o CompetitionConfig

---

## 1. RESUMO EXECUTIVO

### Pergunta Central da Auditoria
> **"A Súmula gerada pelo BaseOS representa exatamente as regras e configurações da competição da qual a partida pertence, utilizando o `CompetitionConfig` como Single Source of Truth?"**

### Resposta Oficial
```text
SIM, COM RESSALVAS
```

### Síntese do Diagnóstico
1. **O que está integrado ao `CompetitionConfig` (PASS):**
   * A resolução do formato macro da partida (`3-sets` vs `5-sets`) consome corretamente o `CompetitionRulesService.resolveMatchFormat(competition, match.phase, match.customSetFormat)`, o qual respeita:
     * `CompetitionConfig.format.defaultSetsToWin`;
     * `CompetitionConfig.format.phaseOverrides` (ex: semis/finais em melhor de 5, classificatórias em melhor de 3);
     * Congelamento imutável de regras via `competition.rulesSnapshot`;
     * Sobrescrita individual por partida em `match.customSetFormat`.
   * As equipes, elencos, números de camisa, capitães e líberos são extraídos dos registros canônicos de inscrição e partidas.

2. **O que NÃO consome o `CompetitionConfig` e opera com regras hardcoded (RESSALVAS):**
   * **Regras de Pontuação dos Sets e Tie-Break:** O motor de súmula (`src/document-engine/baseos/domain/set.rules.ts`) hardcodeia internamente `REGULAR_SET_POINTS: 25`, `DECIDING_SET_POINTS: 15`, `TIE_BREAK_SIDE_CHANGE_POINT: 8`, réguas de pontos de `36` e `30`, ignorando `CompetitionConfig.format.setRules` (`regularSetPoints`, `tiebreakPoints`, `minAdvantage`).
   * **Inversão e Hardcode no Placar do Vencedor:** Em `src/document-engine/baseos/components/BaseosResult.tsx` (linha 289), o placar de sets do vencedor está hardcodeado como `{maxSets === 5 ? '3' : '2'} : {result?.finalScoreSetsB}`. Isso assume incorretamente que a Equipe A sempre vence com 3 (ou 2) sets e ignora `finalScoreSetsA`, corrompendo a exibição caso a Equipe B seja a vencedora ou em caso de placares atípicos.
   * **Redução Binária e Perda de `setsToWin: 1`:** O contrato `BaseosScoresheetData` só aceita `'3-sets' | '5-sets'`. Se uma competição for configurada para "Set Único" (`setsToWin = 1`), a súmula é forçada para o layout de 3 sets.
   * **Modalidade Praia (Beach) Incompatível:** `CompetitionConfig` suporta modalidade praia (`DEFAULT_BEACH_COMPETITION_CONFIG`), mas o motor de súmula é estruturalmente exclusivo para vôlei de quadra 6x6 (com 6 posições de rotação I..VI, 2 líberos e 14 atletas).
   * **Ausência do Contrato de Regras no `BaseosScoresheetData`:** O objeto raiz da súmula não armazena a configuração de regras esportivas resolvida, forçando os componentes a recorrerem a constantes estáticas locais.

---

## 2. FLUXO REAL DE DADOS

O rastreamento completo de ponta a ponta revelou o seguinte fluxo:

```text
CompetitionConfig (src/types/competitionConfig.ts)
        ↓
CompetitionRecord (competition.config || competition.rulesSnapshot)
        ↓
MatchRecord (match.id, match.phase, match.customSetFormat, match.sets)
        ↓
scoresheetService.loadBaseosScoresheetData(matchId)
        ↓
match.mapper.ts (mapMatchRecordToBaseosScoresheet)
        ├── CompetitionRulesService.resolveMatchFormat(...)
        │       ↳ Avalia defaultSetsToWin, phaseOverrides, customSetFormat
        │       ↳ Retorna SetFormatConfig (setsToWin, maxSets, regularSetPoints, tiebreakPoints)
        ├── Conversão binária: is5Sets = (setsToWin === 3 || maxSets === 5 || sets.length > 3)
        │       ↳ format = is5Sets ? '5-sets' : '3-sets'  [setsToWin e setRules são descartados aqui!]
        ├── set.mapper.ts (createBlankSetData / mapLiveSetData)
        │       ↳ getSetRuleConfig(setNumber, format) [src/document-engine/baseos/domain/set.rules.ts]
        │       ↳ REGULAR_SET_POINTS: 25 / DECIDING_SET_POINTS: 15 / SIDE_CHANGE: 8 (Hardcoded!)
        └── team.mapper.ts / roster.mapper.ts
                ↳ ROSTER_CAPACITY (14 atletas, 2 líberos) [src/document-engine/baseos/domain/roster.rules.ts]
        ↓
BaseosScoresheetData (Objeto canônico de renderização)
        ↓
createBaseosDocumentElement(data)
        ├── BaseosThreeSetScoresheet (se format === '3-sets')
        │       ↳ BaseosSetBlock (Sets 1, 2, 3 [isDecidingSet=true])
        │       ↳ BaseosResult (maxSets={3})
        └── BaseosFiveSetScoresheet (se format === '5-sets')
                ↳ BaseosSetBlock (Sets 1, 2, 3, 4, 5 [isDecidingSet=true])
                ↳ BaseosResult (maxSets={5})
        ↓
@react-pdf/renderer (Geração de PDF Vetorial A4)
```

---

## 3. TABELA DE RASTREAMENTO DA ORIGEM DA CONFIGURAÇÃO

| Informação | Origem Canônica | Transformação no Pipeline | Destino na Súmula | Status SSOT |
| :--- | :--- | :--- | :--- | :--- |
| **setsToWin** | `CompetitionConfig.format.defaultSetsToWin` / `phaseOverrides` | `CompetitionRulesService.resolveMatchFormat` em `match.mapper.ts:76` | Reduzido a booleano `is5Sets` e convertido para `'3-sets' \| '5-sets'` em `document.format`. O número exato (1, 2 ou 3) é descartado. | **PARCIAL** (Funciona para 2 e 3; descarta 1) |
| **maxSets** | `deriveMaxSets(setsToWin)` (1, 3 ou 5) | Determina se ativa template de 3 ou 5 sets. Passado como prop JSX fixa (`maxSets={3}` ou `maxSets={5}`) em `BaseosThreeSetScoresheet:78` e `BaseosFiveSetScoresheet:90`. | Linhas da tabela de resultado (`BaseosResult.tsx`). | **PASS** (Limitado a 3 ou 5) |
| **Formato / Categoria** | `competition.playerFormat` ('6x6', '4x4', etc.) | `match.mapper.ts:181`: `category: competition?.playerFormat \|\| '6x6'` | Exibido no cabeçalho da súmula (`BaseosHeader.tsx`). | **PASS** |
| **Modalidade (Indoor/Beach)** | `competition.modality` ('indoor' \| 'beach') | **Não propagado**. `BaseosCompetitionData` não possui o campo `modality`. | O Document Engine assume exclusivamente Quadra 6x6. | **FAIL** (Ignorado pelo Document Engine) |
| **Pontos de Set Regular** | `CompetitionConfig.format.setRules.regularSetPoints` (25 quadra, 21 praia) | **Ignorado**. `set.mapper.ts:11` chama `getSetRuleConfig()`, que lê `VOLLEYBALL_RULES.REGULAR_SET_POINTS = 25`. | Régua de pontos de 36 posições (`BaseosPointGrid.tsx`). | **FAIL** (Hardcoded em 25) |
| **Pontos de Tie-Break** | `CompetitionConfig.format.setRules.tiebreakPoints` (15) | **Ignorado**. `set.mapper.ts:11` lê `VOLLEYBALL_RULES.DECIDING_SET_POINTS = 15`. | Régua de 30 pontos e troca de lado em 8 (`BaseosSetBlock.tsx:430`). | **FAIL** (Hardcoded em 15 / 8) |
| **Vantagem Mínima** | `CompetitionConfig.format.setRules.minAdvantage` (2) | Validado no backend (`CompetitionRulesService`), não renderizado explicitamente na folha. | N/A (Regra esportiva implícita na súmula). | **PASS** |
| **Equipes** | `TeamRecord` via `dataAccess.listTeams()` | `team.mapper.ts:mapTeam` | `BaseosScoresheetData.teams.A/B` (`BaseosHeader`, `BaseosRosters`, `BaseosResult`). | **PASS** |
| **Elencos e Camisas** | `getMatchRosters(match.id)` via `registrationService.ts` | `roster.mapper.ts:mapRoster` (separa até 14 atletas e 2 líberos). | `BaseosRosters.tsx` (tabela de elenco das equipes A e B). | **PASS** |
| **Capitães e Líberos** | Flags `isCaptain`, `isLibero` em `CompetitionAthlete` | Mapeado em `roster.mapper.ts` e `team.mapper.ts`. | Círculo no nº do capitão; campo dedicado para líbero na rotação e no elenco. | **PASS** |
| **Árbitros** | `match.referees` (`role`, `name`) | `match.mapper.ts:192-196` filtra `referee1`, `referee2`, `scorer`. | `BaseosSignatures.tsx` (quadro de arbitragem). | **PASS** |
| **Placares dos Sets** | `match.sets` (`SetScoreRecord[]`) | `set.mapper.ts:mapLiveSetData` marca pontos na régua e registra placar final. | `BaseosSetBlock.tsx` e `BaseosResult.tsx`. | **PASS** |
| **Resultado da Partida** | `match.winnerId`, `match.sets` | `match.mapper.ts:131-158` deriva `winnerSide`, sets vencidos e resumo. | `BaseosResult.tsx`. | **PARCIAL** (Bug na renderização do placar do vencedor) |
| **Observações / Remarks** | `match.observations` | Mapeado diretamente em `match.mapper.ts:199`. | `BaseosRemarks.tsx` e `BaseosSignatures.tsx`. | **PASS** |

---

## 4. AUDITORIA DE REGRAS HARDCODED

Classificação rigorosa de todas as ocorrências numéricas encontradas na cadeia do Document Engine:

| Valor / Expressão | Arquivo / Linha | Classificação | Análise Técnica |
| :--- | :--- | :--- | :--- |
| `REGULAR_SET_POINTS: 25` | `src/document-engine/baseos/domain/set.rules.ts:6` | **PROBLEMÁTICA** | Deveria ser lido de `CompetitionConfig.format.setRules.regularSetPoints`. Impede competições com sets de 21 (Beach) ou regulamentos de categorias de base. |
| `DECIDING_SET_POINTS: 15` | `src/document-engine/baseos/domain/set.rules.ts:7` | **PROBLEMÁTICA** | Deveria ser lido de `CompetitionConfig.format.setRules.tiebreakPoints`. |
| `TIE_BREAK_SIDE_CHANGE_POINT: 8` | `src/document-engine/baseos/domain/set.rules.ts:12` | **PROBLEMÁTICA** | Hardcoded em 8 pontos (regra de quadra). Na praia a troca ocorre a cada 7 pontos (sets normais) e 5 pontos (tie-break). |
| `{maxSets === 5 ? '3' : '2'} : {result?.finalScoreSetsB}` | `src/document-engine/baseos/components/BaseosResult.tsx:289` | **PROBLEMÁTICA** | Corrompe o placar do vencedor. Assume que a Equipe A sempre venceu e ignora `finalScoreSetsA`. |
| `MAX_REGULAR_ATHLETES: 14` | `src/document-engine/baseos/domain/roster.rules.ts:6` | **DUPLICADA** | Duplica `DEFAULT_INDOOR_COMPETITION_CONFIG.registration.maxAthletes`. |
| `MAX_LIBEROS: 2` | `src/document-engine/baseos/domain/roster.rules.ts:7` | **DUPLICADA** | Duplica `DEFAULT_INDOOR_COMPETITION_CONFIG.registration.maxLiberos`. |
| `if ((match.sets?.length \|\| 0) > 3) is5Sets = true;` | `src/document-engine/baseos/mapper/match.mapper.ts:85` | **INFORMATIVA** | Fallback de segurança legítimo: se houver 4º set preenchido, protege contra corte visual forçando layout de 5 sets. |
| `ROTATION_POSITIONS = ['I', 'II', 'III', 'IV', 'V', 'VI']` | `src/document-engine/baseos/domain/rotation.rules.ts:5` | **LEGÍTIMA** | Geometria documental canônica da súmula oficial de vôlei de quadra FIVB/CBV. |
| `POINTS_RULER_MAX_REGULAR: 36` | `src/document-engine/baseos/domain/set.rules.ts:13` | **LEGÍTIMA** | Constante visual da grade impressa (3 colunas de 12 células = 1 a 36) para absorver vantagens além de 25. |
| `POINTS_RULER_MAX_DECIDING: 30` | `src/document-engine/baseos/domain/set.rules.ts:14` | **LEGÍTIMA** | Constante visual da grade do tie-break (3 colunas de 10 células = 1 a 30). |
| `height: 138`, `width: 841.89` | `src/document-engine/baseos/geometry/dimensions.ts` | **LEGÍTIMA** | Dimensões físicas e geométricas da folha A4 em pontos tipográficos PostScript. |

---

## 5. AUDITORIA DO DOCUMENT ENGINE E DOS TEMPLATES

### O Document Engine toma decisões de negócio?
* **Sim, pontualmente e indevidamente.**
* O papel correto do Document Engine é ser um **motor de apresentação determinístico**.
* **Violação encontrada:**
  1. `src/document-engine/baseos/domain/set.rules.ts` decide autonomamente que todo set decisivo vale 15 pontos e tem troca aos 8 pontos.
  2. `src/document-engine/baseos/mapper/match.mapper.ts` descarta a informação de `setsToWin` (se é 1, 2 ou 3) e projeta apenas `'3-sets' | '5-sets'`.
  3. `src/document-engine/baseos/components/BaseosResult.tsx` toma a decisão arbitrária de fixar o placar do vencedor em `3` ou `2`.

### templates: `BaseosThreeSetScoresheet.tsx` e `BaseosFiveSetScoresheet.tsx`
* Os templates em si são **limpos e geométricos** (quase 100% livres de regras de negócio).
* Eles recebem `data: BaseosScoresheetData` e delegam o posicionamento aos componentes via coordenadas absolutas calculadas em `src/document-engine/baseos/geometry/layouts.ts`.
* A única decisão no template é marcar `isDecidingSet` no Set 3 (em 3 sets) ou no Set 5 (em 5 sets), o que é compatível com o layout de cada documento.

---

## 6. AUDITORIA DO MATCHSHEET E DADOS DA PARTIDA

### De onde a Súmula recebe a configuração?
* Em `scoresheetService.loadBaseosScoresheetData(matchId)`:
  * Carrega `match` via `dataAccess.getMatch(matchId)`.
  * Carrega `competition` via `dataAccess.getCompetition(match.competitionId)`.
  * Passa `competition` para `mapMatchRecordToBaseosScoresheet(...)`.

### Cenário de Alteração de Configuração / Congelamento (`rulesSnapshot`)
* Se a competição possui `competition.rulesSnapshot` (gerado quando a competição inicia ou homologa partidas), o `CompetitionRulesService.getConfig(competition)` respeita o snapshot:
  ```ts
  // src/services/competitionRulesService.ts:47
  if (competition.rulesSnapshot) {
    return competition.rulesSnapshot;
  }
  ```
* **Comportamento observado:** A súmula utiliza a **configuração congelada histórica** caso exista o snapshot, preservando a integridade regulamentar da partida.
* **Risco identificado:** Se o torneio nunca foi iniciado formalmente (não gerou `rulesSnapshot`) e um organizador alterar a regra da competição posteriormente, partidas anteriores abertas na súmula refletirão a nova regra, pois a partida não guarda snapshot individual próprio.

---

## 7. AUDITORIA DE 3 SETS, 5 SETS E SET DECISIVO

### 3 Sets (`setsToWin = 2`, `maxSets = 3`)
* **Fluxo:** Perfeito. O Document Engine ativa `BaseosThreeSetScoresheet`.
* **Sets:** Renderiza Set 1, Set 2 e Set 3.
* **Set Decisivo:** Set 3 recebe `isDecidingSet = true`.
  * Renderiza: Quadrante esquerdo antes da troca (`maxPoints = 8`), Quadrante direito completo (`maxPoints = 30`), Faixa "TROCA DE LADO" e Quadrante esquerdo após a troca (`maxPoints = 30`).
* **Súmula em Branco:** Renderiza todos os 3 sets com grades em branco e tabela de 16 atletas limpa.
* **Súmula Preenchida:** Marca os pontos assinalados e apresenta totais de T, S, V e Pontos no quadro de resultados.

### 5 Sets (`setsToWin = 3`, `maxSets = 5`)
* **Fluxo:** Perfeito. O Document Engine ativa `BaseosFiveSetScoresheet`.
* **Sets:** Renderiza Set 1, Set 2, Set 3, Set 4 e Set 5.
* **Set Decisivo:** Set 5 recebe `isDecidingSet = true` (com a mesma estrutura de troca de lado aos 8 pontos).
* **Quadro de Resultados:** 5 linhas de sets + linha de totais acumulados.

---

## 8. AUDITORIA BEACH / INDOOR (READINESS)

* O sistema BaseOS define `DEFAULT_BEACH_COMPETITION_CONFIG` com:
  * `regularSetPoints: 21`
  * `tiebreakPoints: 15`
  * `minAthletes: 2`, `maxAthletes: 4`
  * `maxLiberos: 0`
* **Realidade do Document Engine Atual:**
  * O motor de súmula foi construído com base na súmula oficial da CBV/FIVB para **Vôlei de Quadra** (Indoor).
  * Se gerada para uma partida de Vôlei de Praia:
    * A súmula gerada terá 6 posições de rotação (I..VI), enquanto vôlei de praia possui apenas 2 atletas em quadra e não utiliza posições de rotação 6x6.
    * Conterá campos de Líbero (inexistente na praia).
    * Terá régua de pontos com meta de 25 em vez de 21.
    * Terá troca de quadra aos 8 pontos no tie-break, em vez de a cada 7 pontos (sets normais) e 5 pontos (tie-break).
* **Conclusão:** A arquitetura atual do Document Engine **NÃO está preparada para Vôlei de Praia**. Uma súmula de praia exigirá um template visual e regras geométricas dedicadas (`BaseosBeachScoresheet`).

---

## 9. AUDITORIA DE LEGACY / FALLBACK

* `parseLegacySetFormat(raw?: string | null)` em `src/types/competitionConfig.ts:503`:
  * Converte strings legadas (`'5-sets'`, `'best-of-5'`, `'best_of_5'`, `'5'`) para `3` (`setsToWin = 3`).
  * Converte (`'1-set'`, `'best-of-1'`, `'1'`) para `1`.
  * Fallback padrão: `2` (Melhor de 3).
* É invocado por `CompetitionRulesService.normalizeLegacyToConfig` e `resolveMatchFormat`.
* **Avaliação de Risco:** Baixo. O parser é determinístico, puramente funcional e não muta dados do banco.

---

## 10. CLASSIFICAÇÃO DOS ACHADOS

### ACHADO 1 — Corrupção do Placar do Vencedor no Quadro de Resultados
* **ID:** `ACHADO-FASE4-01`
* **Severidade:** `CRÍTICO`
* **Arquivo:** `src/document-engine/baseos/components/BaseosResult.tsx`
* **Linha:** `289`
* **Problema:** A linha do vencedor renderiza `{maxSets === 5 ? '3' : '2'} : {result?.finalScoreSetsB !== undefined ? String(result.finalScoreSetsB) : '....'}`.
* **Causa:** O desenvolvedor assumiu que a Equipe A é sempre a vencedora com placar de 3x... ou 2x..., ignorando `result.finalScoreSetsA`.
* **Impacto:** Se a Equipe B vencer (ex: Equipe A 1 x 3 Equipe B), o texto exibe `3 : 3` ou `2 : 3`, corrompendo visualmente o documento oficial.
* **Recomendação:** Corrigir a expressão para exibir `${result?.finalScoreSetsA ?? '..'} : ${result?.finalScoreSetsB ?? '..'}` ou `${vencedorSets} : ${perdedorSets}` de acordo com o lado do vencedor.

---

### ACHADO 2 — Desconexão das Regras de Pontuação com o `CompetitionConfig`
* **ID:** `ACHADO-FASE4-02`
* **Severidade:** `ALTO`
* **Arquivo:** `src/document-engine/baseos/domain/set.rules.ts`
* **Linhas:** `5-15`, `27-38`
* **Problema:** `REGULAR_SET_POINTS: 25` e `DECIDING_SET_POINTS: 15` são estáticos e hardcoded no domínio do documento.
* **Causa:** `getSetRuleConfig` não recebe a configuração de regras da competição (`SetFormatConfig` ou `CompetitionConfig.format.setRules`).
* **Impacto:** Se uma competição customizar os pontos do set (ex: 21 pontos ou tie-break de 21), a súmula ignora o regulamento e opera nos moldes de 25/15.
* **Recomendação:** Passar `setRules?: CompetitionConfig['format']['setRules']` para `createBlankSetData` e `mapLiveSetData`, parametrizando `targetPoints` e `sideChangeTriggerPoint`.

---

### ACHADO 3 — Ausência de Propagação do Objeto de Regras no `BaseosScoresheetData`
* **ID:** `ACHADO-FASE4-03`
* **Severidade:** `MÉDIO`
* **Arquivo:** `src/document-engine/baseos/types/scoresheet.ts`
* **Linhas:** `36-68`
* **Problema:** O contrato `BaseosScoresheetData` transporta apenas metadados cosméticos de texto (`name`, `phase`, `date`) e não preserva a configuração de regras resolvida da competição.
* **Causa:** Modelagem orientada estritamente aos textos impressos no layout.
* **Impacto:** Impede que componentes filhos validem ou adaptem comportamentos dinamicamente sem recorrer a imports globais hardcoded.
* **Recomendação:** Adicionar campo opcional `rules?: { regularSetPoints: number; tiebreakPoints: number; minAdvantage: number; modality: 'indoor' | 'beach' }` em `BaseosScoresheetData`.

---

### ACHADO 4 — Incompatibilidade Estrutural com Vôlei de Praia (Beach)
* **ID:** `ACHADO-FASE4-04`
* **Severidade:** `MÉDIO`
* **Arquivo:** `src/document-engine/baseos/domain/roster.rules.ts` e `rotation.rules.ts`
* **Linhas:** `5-15`
* **Problema:** Todo o layout pressupõe 6 posições de rotação (I..VI), 14 atletas e 2 líberos.
* **Causa:** O gerador foi concebido exclusivamente para quadra (indoor).
* **Impacto:** Partidas de vôlei de praia geram uma súmula conceitualmente incorreta.
* **Recomendação:** Registrar formalmente que o motor BaseOS atual é o motor de Vôlei de Quadra (`BASEOS_VOLLEYBALL_INDOOR_SCORESHEET`), planejando motor específico para Beach quando o escopo de praia for homologado.

---

### ACHADO 5 — Descarte de `setsToWin: 1` (Set Único)
* **ID:** `ACHADO-FASE4-05`
* **Severidade:** `BAIXO`
* **Arquivo:** `src/document-engine/baseos/mapper/match.mapper.ts`
* **Linha:** `88`
* **Problema:** Se `setsToWin === 1`, o mapper converte para `'3-sets'`.
* **Causa:** Existem apenas dois templates gráficos (`BaseosThreeSetScoresheet` e `BaseosFiveSetScoresheet`).
* **Impacto:** Partidas de set único utilizam folha de 3 sets (com Sets 2 e 3 em branco).
* **Recomendação:** Documentar como comportamento projetado (Set Único é disputado na folha padrão de 3 sets com os demais sets não jogados) ou criar template compacto no futuro.

---

## 11. MATRIZ FINAL DE CONFORMIDADE

| Área | Status | Evidência | Risco |
| :--- | :---: | :--- | :--- |
| **CompetitionConfig como fonte** | **PASS, COM RESSALVAS** | `match.mapper.ts:76` consome `CompetitionRulesService.resolveMatchFormat`, mas descarta `setRules` | Médio |
| **3 sets** | **PASS** | `BaseosThreeSetScoresheet.tsx`, `match.mapper.ts:88` | Nenhum |
| **5 sets** | **PASS** | `BaseosFiveSetScoresheet.tsx`, `match.mapper.ts:88` | Nenhum |
| **Set decisivo** | **PASS, COM RESSALVAS** | Visual e geometria perfeitos (Set 3 ou 5 com troca de lado), mas pontos (15 e 8) hardcoded em `set.rules.ts` | Médio |
| **Match → Súmula** | **PASS** | `scoresheetService.ts:loadBaseosScoresheetData` | Nenhum |
| **Hardcoded rules** | **FAIL** | `set.rules.ts:6-12` (25, 15, 8); `BaseosResult.tsx:289` (`3 : finalScoreSetsB`) | Alto |
| **Legacy fallback** | **PASS** | `competitionConfig.ts:503` (`parseLegacySetFormat`), `competitionRulesService.ts:59` | Nenhum |
| **Indoor** | **PASS** | 100% suportado e calibrado com excelência visual aprovada na Fase 3 | Nenhum |
| **Beach readiness** | **FAIL (Arquitetural)** | Motor assume rotações I..VI, 14 atletas e 2 líberos; não consome regras de praia | Baixo (Fora do escopo atual) |
| **Testes de Integração de Regras** | **PASS, COM RESSALVAS** | 96 suites / 850 testes passando; testam formato 3/5 sets, mas faltam testes de scoring customizado | Baixo |
| **Document Engine** | **PASS** | Arquitetura isolada, tipada, sem vazamentos para o restante da aplicação | Nenhum |

---

## 12. AUDITORIA DE TESTES E GAPS IDENTIFICADOS

### Testes Existentes Auditados
1. `src/test/baseosScoresheetConsolidation.test.ts` (186 linhas):
   * Prova que `CompetitionRulesService.resolveMatchFormat` determina corretamente `'3-sets'` na classificatória e `'5-sets'` nas finais conforme `phaseOverrides`.
   * Prova que `customSetFormat` na partida é respeitado.
   * Prova geração de PDFs individuais e em lote (Batch).
2. `src/test/document-engine/baseos/three-set.test.ts` e `five-set.test.ts`:
   * Provam integridade dos templates e renderização via `@react-pdf/renderer`.
3. `src/test/document-engine/baseos/geometry.test.ts` e `phase3Refinements.test.tsx`:
   * Provam exatidão das coordenadas geométricas, ausência de sobreposição e respiro de rodapé.

### Gaps de Teste Identificados
1. **Teste ausente para vitória da Equipe B:** Nenhum teste existente gerou súmula finalizada onde a Equipe B foi a vencedora para validar o texto da linha `VENCEDOR:` no quadro de resultados (o que teria exposto o `ACHADO-FASE4-01`).
2. **Teste ausente para `setRules` customizado:** Não há teste verificando se a súmula reage a uma competição com `regularSetPoints != 25`.
3. **Teste ausente para partida com W.O. na súmula:** Não há validação da renderização do resultado oficial quando a partida termina por desistência/W.O.

---

## 13. COMANDOS DE VERIFICAÇÃO EXECUTADOS

Todos os comandos de auditoria foram executados no ambiente com sucesso absoluto e sem alterações de código:

```bash
# 1. Typecheck estrito
npx tsc -p tsconfig.app.json --noEmit
# Resultado: Código 0 (0 erros)

# 2. Linting oficial
npm run lint
# Resultado: Código 0 (0 erros, 1 warning pré-existente no DrawArenaCanvas)

# 3. Suíte de testes unitários e de integração
npm test -- --run
# Resultado: 96 arquivos de teste aprovados, 850 testes executados, 100% PASS

# 4. Build de produção completo
npm run build
# Resultado: Código 0, artefatos gerados em dist/ em 50.40s
```

---

## 14. RECOMENDAÇÃO OBJETIVA PARA A PRÓXIMA FASE

A presente auditoria concluiu que o sistema **NÃO necessita de um redesenho**, pois o layout e a geometria da Fase 3 são excelentes e robustos.

Entretanto, para que o `CompetitionConfig` seja **100% Single Source of Truth**, recomenda-se a abertura da:

### **FASE 4.1 — Integração Cirúrgica das Regras Esportivas à Súmula Canônica**

#### Escopo Proposto para a Fase 4.1:
1. **Correção Cirúrgica do Placar do Vencedor:**
   * Corrigir `src/document-engine/baseos/components/BaseosResult.tsx:289` para renderizar o placar real dos sets ganhos por cada equipe, eliminando a string hardcodeada `{maxSets === 5 ? '3' : '2'}`.
2. **Propagação de `setRules` para os Sets:**
   * No `match.mapper.ts`, repassar `formatConfig.regularSetPoints` e `formatConfig.tiebreakPoints` para `createBlankSetData` e `mapLiveSetData`.
3. **Consumo de `getCanonicalMatchResult`:**
   * Conectar `match.mapper.ts` diretamente a `CompetitionRulesService.getCanonicalMatchResult(competition, match)` para derivar vencedor e parciais sem duplicação de lógica.
4. **Criação de Testes de Homologação de Regras:**
   * Adicionar testes unitários específicos cobrindo:
     * Partida vencida pela Equipe B;
     * Competição com regras congeladas por `rulesSnapshot`;
     * Partida com resultado homologado e W.O.

---

## 15. CONCLUSÃO FINAL

A Fase Súmula 4 foi executada de forma **estritamente não destrutiva**, sem qualquer alteração de código ou regressão no baseline aprovado da Fase 3.

A integração entre `CompetitionConfig` e o gerador de Súmula Canônica está **ativa e funcional para a seleção de formato macro (3 vs 5 sets)**, mas apresenta **desconexões nas regras internas de pontuação e um erro pontual no card de resultados que requerem o ajuste cirúrgico recomendado para a Fase 4.1**.
