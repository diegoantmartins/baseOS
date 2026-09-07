# BASEOS — FASE 4.5: RESULTADO CANÔNICO DA PARTIDA

## 1. Visão Geral e Objetivo

A Fase 4.5 consolidou a representação canônica oficial e inequívoca do resultado esportivo no BaseOS, garantindo que:
- Exista uma **única verdade** para o resultado de qualquer partida de voleibol no sistema.
- O vencedor (`winnerId`, `winnerSide`), perdedor (`loserId`), sets ganhos (`setsWonA`, `setsWonB`), pontos marcados (`pointsScoredA`, `pointsScoredB`) e W.O. sejam derivados estritamente da regra esportiva oficial.
- Discrepâncias entre `winnerId` e placar de sets sejam detectadas proativamente (`isInconsistent: true`).
- A homologação oficial de resultados registre `homologatedAt` e `homologatedBy` e bloqueie resultados inconsistentes.

---

## 2. Estado Anterior e Diagnóstico

### 2.1 Fragmentação de Cálculos
Antes desta fase:
- O vencedor e perdedor eram calculados repetidamente em componentes e serviços via condicionais ad-hoc (`setsA > setsB ? teamA.id : teamB.id`, `setsWonA > setsWonB`).
- Em `standingsService.ts`, `accumulateStats` extraía sets diretamente de filtros manuais em `match.sets`.
- Em caso de W.O. com sets não preenchidos no banco, a equipe vencedora recebia pontos de tabela, mas não computava os sets regulamentares (ex: 3x0 ou 2x0) nem os pontos correspondentes na classificação geral.

### 2.2 Ciclo de Homologação Incompleto
- A homologação em `MatchesPage.tsx` mudava o status para `'homologated'`, mas deixava vazios os campos de auditoria oficial `homologatedAt` e `homologatedBy`.
- A reabertura de partida não limpava os metadados de homologação anterior.

---

## 3. Modelo Canônico: `CanonicalMatchResult`

Definido formalmente em `src/types/competitionConfig.ts`:

```ts
export interface CanonicalMatchResult {
  isValid: boolean;
  status: MatchLifecycleStatus;
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

Implementado no motor canônico em:
```ts
CompetitionRulesService.getCanonicalMatchResult(
  competition?: CompetitionRecord | null,
  match?: MatchRecord | null
): CanonicalMatchResult
```

### 3.1 Regras de Derivação
1. **Resultado de Partida Normal**:
   - Sets válidos e concluídos determinam o vencedor.
   - Sets e pontos de cada lado são apurados e consolidados.
   - Se o registro possuir um `winnerId` inconsistente com o placar de sets, `isInconsistent` é marcado como `true`, e o vencedor derivado prevalece.
2. **Resultado de W.O. (`isWo: true` ou `status: 'wo'`)**:
   - Aplica o placar canônico regulamentar FIVB/CBV:
     - Formato melhor de 5 (Indoor): 3x0 sets, 75x0 pontos para o vencedor.
     - Formato melhor de 3 (Praia/Indoor): 2x0 sets, 42x0 (praia) ou 50x0 (indoor) pontos para o vencedor.
   - Garante que a classificação não fique distorcida mesmo se os sets físicos não tiverem sido digitados.
3. **Inferência Inteligente na Ausência de Configuração**:
   - Quando `competition` não for fornecida (ex.: chamadas isoladas em testes ou widgets externos), o motor infere o formato a partir dos sets reais da partida (identificando partidas de 5 sets se houver parciais acima do 3º set).

---

## 4. Consumidores Migrados

1. **`standingsService.ts`**:
   - `matchWinner(match, competition)` consome `CompetitionRulesService.getCanonicalMatchResult`.
   - `accumulateStats(matches, teamId, onlyHomologated, competition)` consome `CanonicalMatchResult` para derivar vitórias, derrotas, sets ganhos/perdidos e pontos pró/contra.
2. **`MatchesPage.tsx`**:
   - `handleHomologate`: Valida se o resultado é canonicamente válido (`canonical.isValid`). Se houver inconsistência matemática, impede a homologação com mensagem explicativa.
   - Preenche `homologatedAt: new Date().toISOString()` e `homologatedBy: operatorName`.
   - `handleReopenMatch`: Limpa `homologatedAt` e `homologatedBy` ao retornar a partida para status `completed`.

---

## 5. Testes e Validação da Fase 4.5

Foi criada a suíte dedicada:
`src/test/canonicalMatchResult.test.ts` (11 testes), cobrindo:
1. Partida sem resultado / agendada: `isValid: false`, `isCompleted: false`.
2. Vitória 3x0 (limpa).
3. Vitória 3x1.
4. Vitória 3x2 (tiebreak 15 pontos).
5. Derrota 2x3 (Time B vencedor).
6. W.O. regulamentar com sets vazios (atribuição automática de 3x0 e 75x0).
7. W.O. no vôlei de praia (atribuição automática de 2x0 e 42x0).
8. Resultado incompleto (menos sets que o necessário para vencer).
9. Resultado inválido (sem vantagem mínima de 2 pontos).
10. Vencedor inconsistente (detecção e autocorreção se `winnerId` divergir dos sets).
11. Partida homologada com metadados oficiais e bloqueio por ciclo de vida.

### Resultados Oficiais:
- **Testes Vitest**: 66 arquivos de teste, **528 testes aprovados (100% verde)**.
- **TypeScript**: 0 erros (`tsc` sem erros).
- **ESLint**: 0 erros.
- **Build de Produção**: Sucesso em 57.70s.
