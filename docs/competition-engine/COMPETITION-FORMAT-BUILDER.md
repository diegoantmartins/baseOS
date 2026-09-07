# BaseOS — Manual de Autoria: Competition Format Builder

**Fase:** 4.10 — Format Builder, Templates, Configuration Authoring & Competition Setup  
**Data:** 2026-09-06  
**Status:** HOMOLOGADO  

---

## 1. Introdução

O **Competition Format Builder** é o ambiente unificado do BaseOS para concepção, parametrização, validação e visualização prévia de estruturas esportivas completas.

Ele substitui diálogos legados monolíticos por uma experiência reativa, modular e tipada, em que organizadores podem configurar competições partindo de templates pré-existentes ou desenhando grafos de fases totalmente customizados.

---

## 2. O Serviço Central: `CompetitionFormatBuilder`

Localizado em `src/services/competitionFormatBuilder.ts`, o serviço atua como uma fábrica mutável e determinística que produz instâncias imutáveis e canônicas de `CompetitionConfig`.

### 2.1 Principais Métodos

```typescript
// Instanciação
const builder = new CompetitionFormatBuilder(initialConfig);
const fromExisting = CompetitionFormatBuilder.fromConfig(compConfig);

// Manipulação de Estrutura de Fases
builder.addStage(stageDefinition);
builder.updateStage(stageId, partialStage);
builder.removeStage(stageId);
builder.reorderStages(stageIdsInOrder);

// Parametrização de Sets e Partidas
builder.setDefaultSetsToWin(2); // 1 = set único, 2 = best of 3, 3 = best of 5
builder.setPhaseOverrides({ semifinals: 3, final: 3 });
builder.setSetRules({ regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 });

// Parametrização de Pontuação
builder.setScoring({
  pointsWinClear: 3,
  pointsWinNarrow: 2,
  pointsLossNarrow: 1,
  pointsLossClear: 0,
});

// Parametrização de Classificação e Desempate
builder.setStandings({
  tiebreakCriteriaOrder: ['points', 'wins', 'set-ratio', 'point-ratio', 'head-to-head', 'draw'],
  advancingPerGroup: 2,
  aggregationStrategy: 'by-group-position-first',
});

// Parametrização de Regras de Inscrição de Elenco
builder.setRegistration({
  minAthletes: 6,
  maxAthletes: 14,
  maxCaptains: 1,
  maxLiberos: 2,
  requireJerseyNumberOnRegistration: false,
});

// Fechamento e Geração do CompetitionConfig
const config = builder.build();
```

### 2.2 Geração Determinística de Slots em Memória para Prévia

Para permitir a visualização do chaveamento sem poluir o banco de dados:

```typescript
const { stages, slots } = CompetitionFormatBuilder.generatePreviewSlots(config);
```

- Cada estágio com `rounds` declarados tem seus slots virtuais instanciados em memória;
- Slots de mata-mata utilizam as referências configuradas em `participantFeeds` (ou referências padrão derivadas de rankings e cruzamentos);
- Slots são retornados com status `'unresolved'` ou `'bye'` — **zero `TBD-A-1` ou equipes fictícias**.

---

## 3. O Hook Reativo: `useCompetitionFormatBuilder`

Localizado em `src/hooks/useCompetitionFormatBuilder.ts`, encapsula a máquina de estados da autoria:

- `draftConfig`: Estado local da configuração em edição;
- `validationResult`: Resultado reativo imediato do `CompetitionConfigValidator`;
- `isDirty`: Flag indicador de alterações pendentes de salvamento;
- `isSaving`: Estado de transação com a camada de persistência;
- `previewData`: Estrutura de slots e fases computadas em memória;
- `saveConfig(competitionId)`: Despacha para `dataAccess.updateCompetition` após validação de integridade e verificação de congelamento.

---

## 4. Componentes Visuais e Arquitetura UI

A interface foi implementada com alta fidelidade visual (Dark SaaS, Tailwind CSS e shadcn/ui) em `src/components/competition/format-builder/`:

1. **`CompetitionFormatBuilder.tsx`:** Modal principal orquestrador com navegação por etapas numeradas e badges de validação em tempo real.
2. **`FormatTemplateSelector.tsx`:** Catálogo de presets que permite escolher entre *Round Robin*, *Grupos + Mata-Mata*, *Grupos + Play-In + Mata-Mata* ou *Mata-Mata Direto*.
3. **`StageBuilder.tsx`:** Painel de listagem e ordenação de fases, permitindo adicionar, editar, remover e reordenar estágios.
4. **`StageEditorDialog.tsx`:** Editor minucioso de uma fase específica (tipo de estágio, dependências de DAG, configuração de grupos, rodadas, feeds de participantes, estratégia de pareamento e rotas de progressão).
5. **`RulesConfigEditor.tsx`:** Configuração de sets (Best of 3 vs. Best of 5, pontuações de set e tiebreak, overrides por fase), sistema de pontuação na tabela (FIVB padrão vs. customizado), critérios de desempate e limites de inscrição de atletas e comissão técnica.
6. **`CompetitionValidationPanel.tsx`:** Painel auditável que discrimina erros impeditivos (vermelho) de avisos operacionais (amarelo) com referências exatas aos campos afetados.
7. **`CompetitionPreview.tsx`:** Prévia visual em tempo real integrada ao `GenericTournamentBracket` da Fase 4.9.

---

## 5. Responsividade e Acessibilidade (A11y)

- **Breakpoints Suportados:** 1440px (Desktop amplo), 1024px (Tablet horizontal / Laptop), 768px (Tablet vertical), 375px (Mobile).
- **Semântica HTML:** Uso estrito de `<button>`, `<input>`, `<select>`, `<label>`, `<fieldset>`, `<legend>`.
- **Navegação por Teclado:** Foco gerenciado em diálogos modais (`Tab`, `Shift+Tab`, `Esc`).
- **Feedback Auditivo / Leitor de Tela:** Badges com `aria-live="polite"` e descrições claras para status de validação e dirty state.
