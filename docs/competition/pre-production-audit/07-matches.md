# BaseOS — Auditoria de Partidas, Validação e Resultado Canônico (Fase 4.PRE)

**Arquivo Auditado:** `src/services/competitionRulesService.ts`, `src/services/matchValidationService.ts`, `src/services/competitionRuntimeService.ts`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. O Resultado Canônico Oficial (`getCanonicalMatchResult`)

Toda a apuração de resultados de partidas no BaseOS converge para `CompetitionRulesService.getCanonicalMatchResult(competition, match)`. Este método puro analisa o estado do jogo e emite o objeto oficial `CanonicalMatchResult`:

```typescript
export interface CanonicalMatchResult {
  isValid: boolean;
  status: MatchStatus;
  winnerId: string | null;
  loserId: string | null;
  winnerSide: 'A' | 'B' | null;
  setsWonA: number;
  setsWonB: number;
  pointsScoredA: number;
  pointsScoredB: number;
  setScores: SetScoreRecord[];
  isWo: boolean;
  isCompleted: boolean;
  isHomologated: boolean;
  isInconsistent: boolean;
  inconsistencyReason?: string;
  homologatedAt?: string;
  homologatedBy?: string;
}
```

---

## 2. Validação Matemática de Sets e Placares

A validação de partidas ocorre por meio de `CompetitionRulesService.validateMatchScore`:

1. **Condição de Vitória:** Uma partida só é considerada encerrada quando uma das equipes atinge o número de vitórias de sets estipulado pelo formato (`setsToWin = 2` para Melhor de 3; `setsToWin = 3` para Melhor de 5).
2. **Número Máximo de Sets:** Sets adicionais jogados após a definição matemática do vencedor são rejeitados como erro.
3. **Detecção de W.O.:**
   - Caso `isWo = true`, atribui automaticamente sets vencidos iguais a `requiredWins` (ex: 2x0 ou 3x0) e pontos equivalentes a `requiredWins * regularSetPoints` (ex: 50x0 ou 75x0 na quadra; 42x0 na praia).
4. **Consistência de Identidade:**
   - Se o campo `match.winnerId` divergir do vencedor matematicamente apurado pelos sets, o resultado é marcado como `isInconsistent: true` com justificativa explícita, bloqueando avanço e classificação.

---

## 3. Homologação e Imutabilidade de Partida Concluída

- Partidas com status `completed` ou `homologated` não sofrem alteração de vencedor ou pontuação mesmo se cadastros externos de equipes forem editados (cenário comprovado no teste de Histórico Imutável em `competitionDomainFinalAudit.test.ts`).
- Uma vez homologada (`match.status === 'homologated'`), o resultado é selado com carimbo de tempo (`homologatedAt`) e identificador do operador (`homologatedBy`).
