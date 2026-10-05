# BaseOS — Integração do Construtor de Fases no Assistente de Criação
**Documento:** `docs/competition-engine/PHASE-3-FORM-DIALOG-INTEGRATION.md`  
**Módulo:** Motor de Competições — Assistente de Criação (`CompetitionFormDialog.tsx`)  
**Papel:** Principal Frontend Engineer (React, TypeScript, Tailwind CSS, shadcn/ui)  
**Data:** 02 de Outubro de 2026  
**Status:** Implementado, Integrado e Homologado  

---

## 1. Resumo Executivo & Objetivo
aa
O assistente de criação de competições do BaseOS (`CompetitionFormDialog.tsx`) dependia historicamente de templates estáticos (`CompetitionTemplateService.listTemplates()`) e campos manuais limitados para fases de grupos ("Nº de Grupos", "Classificados por Grupo", "Melhores 3ºs"). Esse formato impedia a criação de torneios flexíveis orientados a grafos (DAG).

Com a conclusão dos componentes `CompetitionStageBuilder` e `StageDialog`, o assistente foi totalmente refatorado:
1. **Eliminação dos Cards Estáticos:** Removido o seletor de modelos de disputa e a parametrização engessada;
2. **Injeção da Linha do Tempo:** O componente `CompetitionStageBuilder` agora governa a aba "Disputa";
3. **Binding do Estado Canônico:** O formulário mantém e serializa o array `stages: StageDefinition[]`;
4. **Anexação ao Payload de API:** No momento da submissão (`handleSubmit`), o array de fases é serializado em `canonicalConfig.format.stages`, preservando retrocompatibilidade com campos herdados (`groupsCount`, `advancingPerGroup`, `format`).

---

## 2. Arquitetura da Refatoração (`CompetitionFormDialog.tsx`)

### 2.1 Presets Iniciais por Modalidade
Ao inicializar ou alternar a modalidade entre Quadra e Praia, o formulário agora alimenta dinamicamente o estado de fases com nós pré-configurados do grafo:

```typescript
const DEFAULT_INDOOR_STAGES: StageDefinition[] = [
  {
    id: 'stage-1',
    order: 1,
    name: 'Fase de Grupos',
    type: 'round-robin',
    participantsCount: 8,
    participantsOrigin: 'global',
    groupsCount: 2,
    advancingCount: 4,
  },
  {
    id: 'stage-2',
    order: 2,
    name: 'Eliminatória Ouro',
    type: 'knockout',
    participantsCount: 4,
    participantsOrigin: 'stage-position',
    advancingCount: 1,
  },
];

const DEFAULT_BEACH_STAGES: StageDefinition[] = [
  {
    id: 'stage-1',
    order: 1,
    name: 'Fase Preliminar',
    type: 'round-robin',
    participantsCount: 4,
    participantsOrigin: 'global',
    groupsCount: 1,
    advancingCount: 2,
  },
  {
    id: 'stage-2',
    order: 2,
    name: 'Final',
    type: 'knockout',
    participantsCount: 2,
    participantsOrigin: 'stage-position',
    advancingCount: 1,
  },
];
```

### 2.2 Gerenciamento do Estado Reativo
O estado local de templates estáticos foi substituído pelo estado unificado de fases:

```typescript
// Aba 2 — Sistema de Disputa (Grafo Progressivo de Fases em Linha do Tempo)
const [stages, setStages] = useState<StageDefinition[]>(DEFAULT_INDOOR_STAGES);
```

### 2.3 Substituição da Interface na Aba "Disputa"
O conteúdo da aba `disputa` foi simplificado e potencializado:

```tsx
{/* ABA 2 — SISTEMA DE DISPUTA */}
<TabsContent value="disputa" className="space-y-4 mt-0">
  <CompetitionStageBuilder
    stages={stages}
    onChange={setStages}
  />
</TabsContent>
```

---

## 3. Submissão e Anexação ao Payload (`handleSubmit`)

No envio do formulário, as etapas do organizador são convertidas e injetadas no contrato `canonicalConfig.format`:

```typescript
// Determina o formato macro da competição baseado nos tipos de fases presentes no grafo
const hasRoundRobin = stages.some((s) => s.type === 'round-robin');
const hasKnockout = stages.some((s) => s.type === 'knockout');
const derivedFormat = hasRoundRobin && hasKnockout
  ? 'groups-knockout'
  : hasRoundRobin
  ? 'round-robin'
  : hasKnockout
  ? 'knockout'
  : 'custom';

// Extrai parâmetros da primeira fase de grupos para manter retrocompatibilidade
const firstGroupStage = stages.find((s) => s.type === 'round-robin');
const resolvedGroupsCount = firstGroupStage?.groupsCount ?? 1;
const totalAdvancingFromGroups = firstGroupStage?.advancingCount ?? 2;
const resolvedAdvancingPerGroup = Math.max(1, Math.round(totalAdvancingFromGroups / resolvedGroupsCount));

canonicalConfig.format.formatType = derivedFormat as any;
canonicalConfig.format.defaultSetsToWin = setsToWin;
canonicalConfig.format.setRules = {
  regularSetPoints,
  tiebreakPoints,
  minAdvantage,
};

// Serializa o array canônico de fases no formato estrutural de Grafo (DAG)
canonicalConfig.format.stages = stages.map((s) => ({
  id: s.id,
  stageId: s.id,
  order: s.order,
  name: s.name,
  type: s.type === 'round-robin' ? 'group-stage' : s.type === 'knockout' ? 'knockout' : 'custom',
  groupConfig: s.type === 'round-robin' ? {
    groupsCount: s.groupsCount ?? 1,
    teamsPerGroup: Math.max(2, Math.ceil(s.participantsCount / (s.groupsCount ?? 1))),
    rounds: 'single' as const,
  } : undefined,
  eliminationConfig: s.type === 'knockout' ? {
    bracketSize: s.participantsCount,
    seriesType: 'single-match' as const,
    hasThirdPlaceMatch: false,
  } : undefined,
  pairingConfig: s.type === 'round-robin' ? {
    type: 'round-robin' as const,
    rounds: 'single' as const,
  } : {
    type: 'bracket-by-seed' as const,
    bracketSize: s.participantsCount,
  },
})) as any;
```

---

## 4. Matriz de Testes Automatizados

Dois testes de ponta a ponta em `src/test/competitionFormDialog.test.tsx` garantem a não regressão:
- **Teste 1:** Renderização e alternância para a aba "Disputa", confirmando presença da Linha do Tempo e ausência dos controles estáticos de templates;
- **Teste 2:** Preenchimento e submissão com asserção estrita de que `config.format.stages` foi emitido com o grafo de 2 fases (`group-stage` e `knockout`), acompanhado das flags de compatibilidade legada.

Ambos os testes passam com 100% de sucesso.
