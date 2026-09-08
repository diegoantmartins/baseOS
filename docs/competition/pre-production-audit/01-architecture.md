# BaseOS — Auditoria de Arquitetura e Contratos Canônicos (Fase 4.PRE)

**Arquivo Auditado:** `src/types/competitionConfig.ts`, `src/services/competitionRulesService.ts`, `src/services/competitionTemplateService.ts`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. Fonte Única da Verdade (SSOT)

A auditoria forense confirmou que o BaseOS possui uma única fonte canônica da verdade para regras esportivas:
- `CompetitionConfig` (`src/types/competitionConfig.ts`)

### Contratos e Tipos Canônicos Validados:
- **`SetsToWin`**: Tipado estritamente como `1 | 2 | 3`. Não existem valores arbitrários (como 4 ou 5) que violem as regras esportivas de vôlei.
- **`deriveMaxSets(setsToWin)`**: Helper matemático canônico que calcula `setsToWin * 2 - 1`:
  - `1 -> 1 set`
  - `2 -> 3 sets`
  - `3 -> 5 sets`
- **`formatSetsToWinLabel(setsToWin)`**: Formatação amigável unificada:
  - `1 -> 'Set Único'`
  - `2 -> 'Melhor de 3 Sets'`
  - `3 -> 'Melhor de 5 Sets'`
- **`PhaseFormatOverrides`**: Permite sobreposição de sets por fase (`groupStage`, `quarterfinals`, `semifinals`, `final`, `playoffs`, `roundOf16`, `thirdPlace`).
- **`ScoringSystemConfig`**: Presets oficiais suportados:
  - `fivb-standard`: Vitória Clara (3x0/3x1) = 3 pts, Vitória Apertada (3x2/2x1) = 2 pts, Derrota Apertada (2x3/1x2) = 1 pt, Derrota Clara (0x3/1x3) = 0 pts, W.O. = 3/0 pts.
  - `simple`: 2 pts por vitória, 1 pt por derrota, 0 pt por W.O.
  - `win-loss`: 1 pt por vitória, 0 pt por derrota.
- **`StandingsConfig`**: Contrato para ordenação (`tiebreakCriteriaOrder`), classificados por grupo (`advancingPerGroup`) e melhores terceiros colocados (`bestThirds`).
- **`RegistrationRulesConfig`**: Limites canônicos de elenco por modalidade (`minAthletes`, `maxAthletes`, `maxLiberos`, `maxCaptains`, `requireJerseyNumberOnRegistration`).
- **Versionamento**: O campo `version: 1` no `CompetitionConfig` garante versionamento explícito de esquema de dados JSONB.

---

## 2. Separação Arquitetural: Topologia vs. Regras

Confirmou-se que o sistema mantém separação estrita de responsabilidades:

```text
CompetitionTemplate (topologia)
  ├── stages (StageDefinition[])
  ├── rounds (RoundDefinition[])
  ├── slots (MatchSlot[])
  └── progressions (ProgressionRoute[])

CompetitionConfig (regras esportivas)
  ├── format (setsToWin, phaseOverrides, setRules)
  ├── scoring (pointsWinClear, pointsLossNarrow, etc.)
  ├── standings (tiebreakCriteriaOrder, advancingPerGroup)
  └── registration (minAthletes, maxAthletes, liberos, capitães)
```

- O `CompetitionTemplate` não armazena regras esportivas, apenas a topologia da chave e a conectividade de fases.
- O `CompetitionConfig` não recria chaves ou slots, apenas parametriza a lógica de pontuação, sets e validação.
- O campo `CompetitionRecord.format` no banco de dados armazena o identificador do template (`selectedTemplateId`), mantido exclusivamente para retrocompatibilidade sem competir como SSOT de regras.

---

## 3. Ausência de Arquitetura Paralela

Nenhum arquivo ou serviço duplicado foi encontrado no repositório. O acesso a regras ocorre invariavelmente pela cadeia canônica:
`competition.rulesSnapshot ?? competition.config ?? CompetitionRulesService.normalizeLegacyToConfig(competition)`.
