# WALKTHROUGH — FASE SÚMULA 4.1

## Integração Cirúrgica das Regras Esportivas à Súmula Canônica BaseOS

---

## 1. OBJETIVO DA FASE

A **Fase Súmula 4.1** teve como meta corrigir cirurgicamente os achados diagnosticados na auditoria técnica da **Fase 4**, garantindo que:
1. O quadro de resultados (`BaseosResult`) exiba com exatidão matemática e simétrica o placar real dos sets ganhos por cada equipe, eliminando a corrupção visual quando a Equipe B for a vencedora;
2. As regras de pontuação esportiva resolvidas pelo `CompetitionRulesService` (`regularSetPoints`, `tiebreakPoints`, `sideChangeTriggerPoint`) sejam propagadas do `CompetitionConfig` até os dados dos sets no Document Engine;
3. O resultado oficial da partida seja derivado exclusivamente através do método canônico `CompetitionRulesService.getCanonicalMatchResult(competition, match)`, eliminando duplicações de lógica no mapper;
4. O baseline visual e geométrico homologado na Fase 3 seja preservado em 100%, sem qualquer alteração de layout, fontes ou espaçamentos.

---

## 2. ESTADO ENCONTRADO ANTES DA IMPLEMENTAÇÃO

A auditoria da Fase 4 havia identificado:
* **ACHADO-FASE4-01 (Crítico):** A linha de vencedor no componente `BaseosResult.tsx` continha a expressão hardcodeada `{maxSets === 5 ? '3' : '2'} : {result?.finalScoreSetsB}`, assumindo que a Equipe A sempre vencia e ignorando `finalScoreSetsA`. Em partidas onde a Equipe B vencia por 3x1, o quadro renderizava erroneamente `3 : 3` ou `2 : 3`.
* **ACHADO-FASE4-02 (Alto):** As funções de mapeamento dos sets (`createBlankSetData` e `mapLiveSetData`) não recebiam a configuração resolvida da partida e dependiam estaticamente de `VOLLEYBALL_RULES` em `set.rules.ts`, fixando sets regulares em 25 pontos e tie-break em 15 pontos com troca de lado fixa em 8 pontos.
* **ACHADO-FASE4-03 (Médio):** O contrato raiz `BaseosScoresheetData` não possuía nenhum campo para armazenar a configuração resolvida de regras da partida (`rules`).
* **ACHADO-FASE4-04 (Médio / Arquitetural):** O Document Engine atual foi projetado estruturalmente para vôlei de quadra 6x6 (6 posições de rotação I..VI, líberos, substituições), não comportando a modalidade praia 2x2.

---

## 3. ARQUIVOS ANALISADOS

* `src/document-engine/baseos/components/BaseosResult.tsx`
* `src/document-engine/baseos/domain/set.rules.ts`
* `src/document-engine/baseos/domain/roster.rules.ts`
* `src/document-engine/baseos/domain/rotation.rules.ts`
* `src/document-engine/baseos/types/scoresheet.ts`
* `src/document-engine/baseos/types/set.ts`
* `src/document-engine/baseos/mapper/match.mapper.ts`
* `src/document-engine/baseos/mapper/set.mapper.ts`
* `src/services/competitionRulesService.ts`
* `src/types/competitionConfig.ts`
* `src/test/document-engine/baseos/generateInspectionPdfs.test.ts`
* `src/test/baseosScoresheetConsolidation.test.ts`

---

## 4. ARQUIVOS MODIFICADOS

1. [`src/document-engine/baseos/components/BaseosResult.tsx`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/components/BaseosResult.tsx):
   * Correção da linha `VENCEDOR:` para exibir simetricamente `finalScoreSetsA : finalScoreSetsB` e `.. : ..` em súmulas em branco.
2. [`src/document-engine/baseos/types/scoresheet.ts`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/types/scoresheet.ts):
   * Inclusão do campo opcional `rules?: SetFormatConfig` no contrato canônico `BaseosScoresheetData`.
3. [`src/document-engine/baseos/types/set.ts`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/types/set.ts):
   * Inclusão de `targetPoints?: number` na interface `BaseosSetData`.
4. [`src/document-engine/baseos/domain/set.rules.ts`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/domain/set.rules.ts):
   * Parametrização da função `getSetRuleConfig` para receber `rules?: Partial<Pick<SetFormatConfig, 'regularSetPoints' | 'tiebreakPoints' | 'minAdvantage'>>`.
   * Cálculo determinístico de `sideChangeTriggerPoint = Math.ceil(tiebreakPoints / 2)`.
   * Preservação explícita da capacidade geométrica da grade (`36` regular, `30` tie-break).
5. [`src/document-engine/baseos/mapper/set.mapper.ts`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/mapper/set.mapper.ts):
   * Atualização de `createBlankSetData` e `mapLiveSetData` para aceitar `rules?: SetFormatConfig` e repassar para `getSetRuleConfig`.
6. [`src/document-engine/baseos/mapper/match.mapper.ts`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/mapper/match.mapper.ts):
   * Propagação de `formatConfig` gerado por `CompetitionRulesService.resolveMatchFormat(...)` para todos os sets e para o campo `rules` do documento.
   * Centralização do cálculo do resultado oficial via `CompetitionRulesService.getCanonicalMatchResult(competition, match)`.
   * Reconhecimento de partidas finalizadas por W.O. (`match.status === 'wo' || match.isWo`).
7. [`src/test/document-engine/baseos/generateInspectionPdfs.test.ts`](file:///home/diego-martins/docker/volei/src/test/document-engine/baseos/generateInspectionPdfs.test.ts):
   * Inclusão de cenário de geração de PDF real para vitória da Equipe B (`1 : 3`).
8. [`src/test/document-engine/baseos/competitionRulesIntegration.test.ts`](file:///home/diego-martins/docker/volei/src/test/document-engine/baseos/competitionRulesIntegration.test.ts) **[NOVO]**:
   * Suíte com 9 testes automatizados cobrindo todos os cenários da Fase 4.1.

---

## 5. CORREÇÃO DO PLACAR DO RESULTADO

* **Problema Original:**
  ```tsx
  <Text style={styles.winnerText}>
    {maxSets === 5 ? '3' : '2'} : {result?.finalScoreSetsB !== undefined ? String(result.finalScoreSetsB) : '....'}
  </Text>
  ```
* **Causa:** Suposição incorreta de que a Equipe A sempre vencia a partida.
* **Solução Cirúrgica Aplicada:**
  ```tsx
  <Text style={styles.winnerText}>
    {result?.finalScoreSetsA !== undefined && result?.finalScoreSetsB !== undefined
      ? `${result.finalScoreSetsA} : ${result.finalScoreSetsB}`
      : '.. : ..'}
  </Text>
  ```
* **Comportamento Validado:**
  * Vitória Equipe A (3x1) ➔ `3 : 1`
  * Vitória Equipe B (1x3) ➔ `1 : 3`
  * Vitória Equipe B (0x2) ➔ `0 : 2`
  * Súmula em branco / sem resultado ➔ `.. : ..`

---

## 6. PROPAGAÇÃO DAS REGRAS ESPORTIVAS

A cadeia de dados consolidada agora segue rigorosamente:

```text
CompetitionConfig.format (defaultSetsToWin, phaseOverrides, setRules)
        ↓
CompetitionRulesService.resolveMatchFormat(competition, match.phase, match.customSetFormat)
        ↓
SetFormatConfig (setsToWin, maxSets, regularSetPoints, tiebreakPoints, minAdvantage)
        ↓
match.mapper.ts (mapMatchRecordToBaseosScoresheet)
        ↓
BaseosScoresheetData.rules = formatConfig
        ↓
set.mapper.ts (createBlankSetData / mapLiveSetData)
        ↓
set.rules.ts: getSetRuleConfig(setNumber, format, rules)
        ↓
BaseosSetData (targetPoints, sideChange.atPoint)
        ↓
Renderização do PDF
```

---

## 7. REGRAS HARDCODED REMOVIDAS vs CONSTANTES PRESERVADAS

### Regras Esportivas Parametrizadas (Hardcode Removido)
* `REGULAR_SET_POINTS`: Agora lê `rules?.regularSetPoints` (com fallback para 25 se ausente).
* `DECIDING_SET_POINTS`: Agora lê `rules?.tiebreakPoints` (com fallback para 15 se ausente).
* `sideChangeTriggerPoint`: Agora calculado dinamicamente como `Math.ceil(tiebreakPoints / 2)`. Para 15 pontos, resulta em 8; para 21 pontos, resulta em 11.
* `Placar do Vencedor`: Agora lê dinamicamente `result.finalScoreSetsA` e `result.finalScoreSetsB`.

### Constantes Geométricas Preservadas (Legítimas da Grade)
* `POINTS_RULER_MAX_REGULAR = 36`: Mantida estritamente. É a capacidade física da grade impressa de 3 colunas de 12 células para permitir vantagens de pontos além de 25.
* `POINTS_RULER_MAX_DECIDING = 30`: Mantida estritamente. É a capacidade física da grade de tie-break de 3 colunas de 10 células.
* `ROTATION_POSITIONS = ['I', 'II', 'III', 'IV', 'V', 'VI']`: Mantida como estrutura física da súmula oficial de quadra.

---

## 8. INTEGRAÇÃO COM O RESULTADO CANÔNICO (`getCanonicalMatchResult`)

Em `src/document-engine/baseos/mapper/match.mapper.ts`:
* A lógica duplicada de filtros manuais nos sets (`match.sets.filter(...)`) foi **completamente eliminada**.
* O mapper agora chama diretamente:
  ```ts
  const canonical = CompetitionRulesService.getCanonicalMatchResult(competition, match);
  ```
* O resultado da súmula é preenchido com:
  * `finalScoreSetsA: canonical.setsWonA`
  * `finalScoreSetsB: canonical.setsWonB`
  * `winnerSide: canonical.winnerSide`
  * `winnerTeamName`: derivado a partir de `canonical.winnerSide` e dos nomes das equipes no match.
  * Suporte nativo para encerramento por **W.O.** (`match.status === 'wo' || match.isWo`), onde o placar oficial canônico (ex: 2x0 ou 3x0) é automaticamente transferido para o quadro de resultados.

---

## 9. SUÍTE DE TESTES E CENÁRIOS HOMOLOGADOS

Foi criada a suíte dedicada [`src/test/document-engine/baseos/competitionRulesIntegration.test.ts`](file:///home/diego-martins/docker/volei/src/test/document-engine/baseos/competitionRulesIntegration.test.ts) com 9 testes, todos aprovados com 100% de sucesso:

1. **TESTE 1 — Vitória da Equipe B:** Partida com parciais 20x25, 25x22, 19x25, 23x25 (1x3). Valida que `winnerSide === 'B'`, `winnerTeamName === 'Itambé Minas'`, `finalScoreSetsA === 1`, `finalScoreSetsB === 3` e o componente `BaseosResult` renderiza `1 : 3` (e não `3 : 3`).
2. **TESTE 2 — Vitória da Equipe A:** Partida com vitória de 3x1. Valida `finalScoreSetsA === 3`, `finalScoreSetsB === 1` e renderização de `3 : 1`.
3. **TESTE 2.1 — Súmula em Branco:** Valida que a súmula em branco renderiza `.. : ..` no placar do vencedor.
4. **TESTE 3 — 3 Sets Canônico:** Competição em melhor de 3 (`setsToWin = 2, maxSets = 3`). Valida que Sets 1 e 2 não têm troca de lado, Set 3 é decisivo (`isDecidingSet = true`), `targetPoints = 15` e `sideChange.atPoint = 8`.
5. **TESTE 4 — 5 Sets Canônico:** Competição em melhor de 5 (`setsToWin = 3, maxSets = 5`). Valida que Sets 1 a 4 não têm troca de lado e Set 5 é decisivo com troca aos 8 pontos.
6. **TESTE 5 — Regular Set Points Customizado (21 pontos):** Valida que `scoresheetData.sets.set1.targetPoints === 21` e `set2.targetPoints === 21`, comprovando a eliminação do hardcode de 25 pontos.
7. **TESTE 6 — Tie-break Customizado (21 pontos):** Valida que o set decisivo tem `targetPoints === 21` e a troca de lado é calculada em 11 pontos (`Math.ceil(21 / 2) = 11`), comprovando a eliminação do hardcode de 8 pontos.
8. **TESTE 7 — Preservação de rulesSnapshot:** Competição com config alterado para 3 sets, mas com `rulesSnapshot` congelado em 5 sets. Valida que a súmula prioriza o snapshot e gera o layout de 5 sets.
9. **TESTE 8 — Partida com W.O. (Walkover):** Partida encerrada por W.O. sem parciais jogadas. Valida que o resultado oficial canônico (2x0) é registrado e exibido como `2 : 0` no quadro de resultados.

---

## 10. GERAÇÃO E INSPEÇÃO DE PDFS REAIS

Através do teste `generateInspectionPdfs.test.ts`, foram gerados 7 arquivos PDF vetoriais reais em `dist/pdf-inspection/`:

| Arquivo Gerado | Formato | Tamanho | Cenário Inspecionado |
| :--- | :---: | :---: | :--- |
| `sumula_3sets_blank_a4.pdf` | A4 Paisagem | 53 KB | 3 sets em branco, réguas limpas, placar `.. : ..` |
| `sumula_3sets_preenchida_a4.pdf` | A4 Paisagem | 58 KB | 3 sets finalizado, vitória Equipe A |
| `sumula_5sets_blank_a4.pdf` | A4 Paisagem | 74 KB | 5 sets em branco, layout compacto, respiro inferior |
| `sumula_5sets_preenchida_a4.pdf` | A4 Paisagem | 80 KB | 5 sets finalizado (3x2), vitória Equipe A (placar `3 : 2`) |
| `sumula_5sets_vitoria_time_b_a4.pdf` | A4 Paisagem | 79 KB | **Novo:** 5 sets finalizado (1x3), **vitória Equipe B (placar `1 : 3`)** |
| `sumula_5sets_blank_a3.pdf` | A3 Master | 76 KB | 5 sets em branco, folha mestra de alta legibilidade |
| `sumula_5sets_preenchida_a3.pdf` | A3 Master | 82 KB | 5 sets preenchido, folha mestra oficial |

### Confirmação da Inspeção Visual:
* **Nenhuma alteração geométrica:** As coordenadas dos cards, respiro de 3.5pt no footer, cabeçalho e tabelas permaneceram 100% idênticas ao baseline da Fase 3.
* **Placar do Vencedor:** O PDF `sumula_5sets_vitoria_time_b_a4.pdf` exibe com perfeita clareza `VENCEDOR: MACKENZIE ESPORTE CLUBE   1 : 3`.

---

## 11. RESULTADOS DOS COMANDOS OFICIAIS

Todos os comandos de verificação foram executados e aprovados:

```bash
# 1. Typecheck estrito
npx tsc -p tsconfig.app.json --noEmit
# Resultado: Código 0 (0 erros)

# 2. Linter oficial
npm run lint
# Resultado: Código 0 (0 erros, 1 warning pré-existente no DrawArenaCanvas)

# 3. Vitest (Suíte Completa do Projeto)
npm test -- --run
# Resultado: 97 arquivos de teste aprovados, 859 testes passando (100% PASS)

# 4. Build de produção completo
npm run build
# Resultado: Código 0, artefatos gerados em dist/ em 51.50s
```

---

## 12. REGRESSÕES

* **Nenhuma regressão detectada.**
* Todos os 850 testes anteriores continuam passando inalterados.
* Os 9 novos testes comprovam o correto funcionamento das correções cirúrgicas.

---

## 13. PENDÊNCIAS E LIMITAÇÕES CONHECIDAS

1. **Vôlei de Praia (Beach):**
   * Conforme delimitado nas regras da Fase 4.1, a modalidade praia permanece **fora de escopo**.
   * O motor atual é formalmente o gerador de **Vôlei de Quadra 6x6**.
   * A súmula de praia terá desenvolvimento próprio em fase futura dedicada.
2. **Set Único (`setsToWin = 1`):**
   * Mantido o comportamento padrão do BaseOS: partidas de set único utilizam a folha de 3 sets (com Sets 2 e 3 não preenchidos), preservando a uniformidade física das pranchetas de anotação.

---

## 14. CONCLUSÃO FINAL

> **O `CompetitionConfig` é agora Single Source of Truth para as regras utilizadas pela Súmula Canônica?**

```text
SIM
```

### Justificativa:
As regras de sets (`setsToWin`, `maxSets`), as regras de pontuação (`regularSetPoints`, `tiebreakPoints`), a troca de lado (`sideChangeTriggerPoint`), o congelamento regulamentar (`rulesSnapshot`), as sobrescritas por fase (`phaseOverrides`) e o apuramento oficial de resultados (`getCanonicalMatchResult`) agora fluem **direta e deterministicamente do `CompetitionConfig` para a Súmula Canônica**, sem regras hardcoded arbitrárias no Document Engine.

> **Nuance Arquitetural Importante:**
> 1. **Regra Esportiva vs. Capacidade Gráfica:** A súmula agora separa claramente a regra esportiva (`targetPoints`: 25, 21, 15, etc.) da capacidade gráfica da grade impressa (`maxPointsRuler`: 36 regular / 30 tie-break). A régua física acomoda margens de deuce/vantagem e não deve ser redimensionada pela regra esportiva.
> 2. **Fallbacks Técnicos Defensivos:** Os valores residuais de 25/15 em `set.rules.ts` atuam estritamente como *fallbacks defensivos de tempo de execução* caso uma súmula seja instanciada de forma isolada/avulsa sem contexto de competição. Em todo o ciclo de vida operacional de competições do BaseOS, o fluxo canônico `CompetitionConfig -> CompetitionRulesService -> resolved SetFormatConfig -> Document Engine` é a **Single Source of Truth** absoluta.
