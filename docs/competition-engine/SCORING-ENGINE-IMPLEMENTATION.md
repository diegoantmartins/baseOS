# Motor de Pontuação Configurável — ScoringEngine (Fase 4.3)

**Data:** 05/09/2026  
**Módulo:** `src/services/scoringEngine.ts`  
**Status:** Implementado, homologado e 100% coberto por testes  

---

## 1. Visão Geral e Princípios Arquiteturais

O `ScoringEngine` foi projetado na **Fase 4.3** como uma biblioteca puramente funcional e determinística, responsável por calcular os pontos atribuídos a cada equipe em uma partida com base nas regras configuradas no `CompetitionConfig`.

### Princípios Inegociáveis:
1. **SSOT do Resultado:** O motor consome exclusivamente o `CanonicalMatchResult` gerado pela partida, garantindo que classificação, súmula e estatísticas compartilhem a mesma verdade esportiva sem divergências.
2. **Função Pura e Imutável:** `calculatePoints(result, rules)` não gera efeitos colaterais, não faz I/O e não acessa banco de dados.
3. **Sem Hardcode Esportivo:** Nenhum perfil esportivo é imposto rigidamente pelo BaseOS; os esquemas de pontuação são presets configuráveis ou regras personalizadas (`custom`).
4. **Tratamento Canônico de W.O.:** Vitória por ausência/desistência (W.O.) possui tratamento explícito para pontuação e saldo de sets/pontos concedidos e deduzidos.

---

## 2. Presets Suportados

O `ScoringEngine` disponibiliza a fábrica `createPreset(preset)` para os seguintes padrões:

| Preset | Condição | Pontos Vencedor | Pontos Perdedor | Observações |
| :--- | :--- | :---: | :---: | :--- |
| `fivb-standard` | Vitória 3-0 ou 3-1 | 3 | 0 | Padrão olímpico e mundial FIVB / CBV |
| | Vitória 3-2 | 2 | 1 | Bonificação para jogo decidido no tie-break |
| | Vitória 2-0 (jogos de 3 sets) | 3 | 0 | Proporcional para melhor de 3 sets |
| | Vitória 2-1 (jogos de 3 sets) | 2 | 1 | Proporcional para tie-break de 3 sets |
| `simple-amateur` | Qualquer vitória | 2 | 1 | Padrão comum em ligas amadoras (participação ativa) |
| `win-loss` | Qualquer vitória | 1 | 0 | Padrão clássico de vitórias puras |

Qualquer competição pode ainda definir `pointsPerWin`, `pointsPerLoss`, e bonificações personalizadas via `ScoringRuleConfig`.

---

## 3. Tratamento de W.O. (Walkover / Forfeit)

Quando `result.isWalkover === true`:
- A equipe infratora (`forfeitingTeamId`) recebe a pontuação de W.O. (por padrão `0` pontos, ou configurável via `woPointsForfeited`).
- A equipe beneficiada recebe a pontuação de vitória por W.O. (por padrão `3` pontos no FIVB, ou configurável via `woPointsAwarded`).
- Sets concedidos/deduzidos respeitam as regras configuradas (`woSetsAwarded: 2` ou `3`, `woSetsDeducted: 0`).
- Pontos parciais de W.O. respeitam a pontuação canônica configurada (ex: 25-0 por set).

---

## 4. Assinatura e Tipos

```typescript
export interface ScoringResult {
  winnerPoints: number;
  loserPoints: number;
  winnerTeamId: string;
  loserTeamId: string;
  isWalkover: boolean;
  notes?: string;
}

export class ScoringEngine {
  static calculatePoints(
    result: CanonicalMatchResult,
    rules?: ScoringRuleConfig
  ): ScoringResult;

  static createPreset(preset: ScoringPreset): ScoringRuleConfig;
}
```

---

## 5. Cobertura de Testes Automatizados

O arquivo `src/test/scoringEngine.test.ts` valida exaustivamente:
- Vitórias FIVB 3-0 e 3-1 (3 pts vs 0 pts);
- Vitórias FIVB 3-2 (2 pts vs 1 pt);
- Jogos de 3 sets (2-0 gerando 3-0 pts; 2-1 gerando 2-1 pts);
- Preset `simple-amateur` (2 pts vencedor, 1 pt perdedor);
- Preset `win-loss` (1 pt vencedor, 0 pts perdedor);
- Presets personalizados com pontuação arbitrária;
- Cenários de W.O. com pontuação padrão e customizada.

**Status de Qualidade:** 16/16 testes passando com 100% de asserções atendidas.
