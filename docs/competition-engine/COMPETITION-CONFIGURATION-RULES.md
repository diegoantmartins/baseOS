# BaseOS — Regras e Governança de Configuração de Competições

**Fase:** 4.10 — Format Builder, Templates, Configuration Authoring & Competition Setup  
**Data:** 2026-09-06  
**Status:** HOMOLOGADO  

---

## 1. O Contrato Canônico `CompetitionConfig`

Definido em `src/types/competitionConfig.ts`, o `CompetitionConfig` é a única **Single Source of Truth (SSOT)** para qualquer formato esportivo no BaseOS.

```typescript
export interface CompetitionConfig {
  version: number;
  format: {
    defaultSetsToWin: 1 | 2 | 3;
    setRules: {
      regularSetPoints: number;
      tiebreakPoints: number;
      minAdvantage: number;
    };
    phaseOverrides?: PhaseFormatOverrides;
    formatType?: CompetitionFormatType;
    stages?: StageDefinition[];
  };
  scoring: ScoringSystemConfig;
  standings: StandingsConfig;
  registration: RegistrationRulesConfig;
}
```

---

## 2. Normalização e Sanatização

Antes de qualquer validação ou persistência, o `CompetitionFormatBuilder` e o `CompetitionRulesService` executam normalização estrutural:

1. **Versionamento:** Garante `version: 1` caso não informado;
2. **Defesa de Sets:** Mapeia `defaultSetsToWin` para valores canônicos (1, 2 ou 3), sincronizando limites mínimos de vantagem (`minAdvantage = 2`);
3. **Fases e Rodadas:**
   - Garante que cada `StageDefinition` possua identificador único (`id` e `stageId`);
   - Garante que `order` seja estritamente crescente;
   - Remove dependências circulares ou referências a estágios inexistentes;
4. **Feeds de Participantes:**
   - Normaliza tipos de feed para os 8 contratos suportados;
   - Não permite strings mágicas;
5. **Critérios de Desempate:**
   - Preenche lacunas com a ordenação padrão internacional (Pontos -> Vitórias -> Razão de Sets -> Razão de Pontos -> Confronto Direto -> Sorteio).

---

## 3. Matriz de Validação: Erros vs. Avisos

O `CompetitionConfigValidator` (em `src/services/competitionConfigValidator.ts`) classifica ocorrências em dois níveis rigorosos:

### 3.1 Erros Bloqueantes (`errors`)
Impedem o salvamento e a publicação da competição:
- **Ciclo no Grafo de Fases (DAG):** Detectado via `StageGraph.validate()`;
- **Dependência Inexistente:** Fase depende de `stageId` que não foi declarado;
- **Referência de Feed Quebrada:** Feed aponta para posição inválida ou estágio anterior incompatível;
- **Incoerência Esportiva de Pontuação:** Exemplo: vitória com diferença menor recebendo mais pontos que vitória clara (`pointsWinNarrow > pointsWinClear`);
- **Incompatibilidade de Elenco:** `minAthletes > maxAthletes` ou `maxLiberos > 2`.

### 3.2 Avisos Informativos (`warnings`)
Alertam o organizador sem bloquear o fluxo operacional:
- **Detecção de BYE Estrutural:** O número de participantes ou feeds gera folgas automáticas;
- **Critério de Sorteio Ausente:** Recomendação de incluir sorteio determinístico como critério final de desempate;
- **Regulamento sem Fase Final Declarada:** Notificação de formato puramente classificatório sem playoffs.

---

## 4. Congelamento de Regras (`rules_snapshot` e Freeze)

O BaseOS adota um modelo estrito de governança contra adulteração de regulamentos esportivos:

```text
Status: 'draft' ou 'planning' (sem snapshot)
  → Permitida edição ampla de fases, sets, pontuação e feeds.

Transição para 'in-progress' ou geração de partidas oficiais:
  → rules_snapshot = config (Cópia profunda e imutável)
  → status = 'in-progress'
  → Congelamento ativado.

Pós-congelamento:
  → CompetitionLifecycleService.canEditRules(comp) retorna false;
  → dataAccess.updateCompetition rejeita alterações na estrutura esportiva;
  → Toda leitura de regras (ScoringEngine, TieBreakEngine, Runtime) consome
    preferencialmente rules_snapshot sobre config.
```

---

## 5. Compatibilidade Legada

Competições criadas antes da Fase 4.10 continuam 100% funcionais graças ao adaptador `normalizeLegacyToConfig` em `src/services/competitionRulesService.ts`:
- Valores legados de `setFormat` (`'3-sets'`, `'5-sets'`) são convertidos para `defaultSetsToWin = 2` e `defaultSetsToWin = 3`;
- Competições que não possuem o array `stages` explícito são enriquecidas em tempo de execução com uma projeção padrão sem mutação forçada de banco de dados histórico.
