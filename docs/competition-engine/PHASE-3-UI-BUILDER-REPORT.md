# BaseOS — Relatório Técnico: Construtor Progressivo de Fases (UI Builder)
**Documento:** `docs/competition-engine/PHASE-3-UI-BUILDER-REPORT.md`  
**Módulo:** Motor de Competições — Linha do Tempo e Autoria de Fases  
**Papel:** Principal Frontend Engineer (React, TypeScript, Tailwind CSS, shadcn/ui)  
**Data:** 02 de Outubro de 2026  
**Status:** Aprovado para Implementação e Homologação  

---

## 1. Resumo Executivo & Motivação

O BaseOS concluiu a estabilização de seu backend de torneios (PostgreSQL, RLS e `CompetitionRulesService` / `CompetitionLifecycleService`), migrando de um modelo legado de mono-campeonatos rígidos para uma **Máquina de Estados Orientada a Grafos de Fases (DAG)**.

Para permitir que organizadores de eventos esportivos modelem qualquer estrutura de disputa — desde um simples Turno Único até formatos híbridos como "Grupos + Repescagem + Playoffs" ou "Fase Preliminar + Chave Ouro/Prata" —, a interface de usuário substitui os antigos cartões estáticos de formatos fechados por um **Construtor Progressivo de Fases em Linha do Tempo (Progressive Timeline Builder)**.

Este relatório documenta a arquitetura dos dois novos componentes:
1. `CompetitionStageBuilder.tsx` (Componente Container / Linha do Tempo);
2. `StageDialog.tsx` (Modal de Configuração de Nó / 3 Seções).

---

## 2. Contrato de Dados Canônico (`StageDefinition[]`)

O construtor gera e consome um array tipado e ordenado de `StageDefinition`, que serve como ponte direta entre a autoria visual e os serviços de resolução do motor:

```typescript
export type StageDefinition = {
  /** Identificador único e estável da fase (ex: 'stage-1', 'grupos-a-b') */
  id: string;
  /** Ordem sequencial no grafo do torneio (1, 2, 3...) */
  order: number;
  /** Nome amigável de exibição (ex: 'Fase de Grupos', 'Playoffs Ouro') */
  name: string;
  /** Tipo estrutural da mecânica de disputa */
  type: 'round-robin' | 'knockout' | 'custom';
  /** Quantidade total de participantes admitidos no nó */
  participantsCount: number;
  /** Origem dos participantes no fluxo do torneio */
  participantsOrigin: 'global' | 'stage-position' | 'overall-ranking';
  /** Quantidade de chaves/grupos (quando type === 'round-robin') */
  groupsCount?: number;
  /** Quantidade de equipes que avançam deste nó para fases subsequentes */
  advancingCount: number;
};
```

---

## 3. Arquitetura dos Componentes de Interface

```
┌────────────────────────────────────────────────────────────────────────┐
│                      CompetitionStageBuilder                           │
│  (bg-slate-50, Timeline Conectora, Cards Brancos, Debug Payload)      │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │ [01 GRUPOS] Card Branco                                      │    │
│   │ 8 Times • Origem: Inscrição Global • 4 Vagas de Avanço       │    │
│   │ [Ações: Mover, Duplicar, Editar, Excluir]                    │    │
│   └──────────────────────────────────────────────────────────────┘    │
│                                 │ (Timeline Connector)                 │
│                                 ▼                                      │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │ [02 ELIMINATÓRIA] Card Branco                                │    │
│   │ 4 Times • Origem: Posição na Fase • 1 Campeão                │    │
│   │ [Ações: Mover, Duplicar, Editar, Excluir]                    │    │
│   └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│   [+ Adicionar Fase] (Botão largo, rounded-full)                       │
└────────────────────────────────────────────────────────────────────────┘
                                    │ (Abre ao criar/editar)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             StageDialog                                │
│   (Modal Radix UI, Títulos e Rótulos Navy #0f172a)                    │
│                                                                        │
│   ├── SEÇÃO 1: Identificação (Nome da Fase, Tipo de Disputa)           │
│   ├── SEÇÃO 2: Entrada (Qtd Participantes, Origem, Qtd Grupos)         │
│   └── SEÇÃO 3: Saída / Mecânica (Vagas de Avanço, Regra de Cruzamento) │
│                                                                        │
│   [Cancelar]                    [Salvar Fase (bg-[#f59e0b] rounded-full)]
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 `CompetitionStageBuilder.tsx` (Componente Pai)
- **Fundo da Linha do Tempo:** `bg-slate-50` com espaçamento ergonômico e conector visual de timeline (linha vertical tracejada/suave entre os nós).
- **Cards de Fases:**
  - Fundo branco puro (`bg-white`), bordas `border-slate-200/80`, raio de borda `rounded-2xl` e elevação sutil `shadow-sm`.
  - Cabeçalho padronizado com prefixo numérico em caixa alta (ex: `"01 GRUPOS"`, `"02 ELIMINATÓRIA"`, `"03 DISPUTA DE 3º LUGAR"`).
  - Badges semânticas indicando o tipo da fase, total de equipes, origem dos participantes e contagem de vagas.
- **Botão Utilitário de Topo ("Debug Payload"):**
  - Botão secundário de alta visibilidade para desenvolvedores e organizadores que executa `console.log('Current stages payload:', stages)` e copia o JSON para o clipboard via toast de confirmação.
- **Botão Rodapé ("+ Adicionar Fase"):**
  - Botão de largura completa ou de destaque central no rodapé da lista, com geometria de pílula (`rounded-full`), disparando o modal em modo de inserção.
- **Gestão de Estados:**
  - Permite reordenar fases (`onMoveUp` / `onMoveDown`), duplicar configurações, editar e remover nós mantendo a integridade da sequência `order`.

### 3.2 `StageDialog.tsx` (Componente Filho — Modal de Configuração)
Estruturado estritamente em **3 seções temáticas operacionais**:

1. **Seção 1: Identificação**
   - Nome amigável da fase (`name`, ex: "Fase de Grupos Classificatória", "Semifinais e Final").
   - Tipo de mecânica (`type`):
     - `round-robin` (Pontos Corridos / Grupos);
     - `knockout` (Mata-Mata Eliminatório);
     - `custom` (Personalizado / Misto).

2. **Seção 2: Entrada de Participantes**
   - Quantidade de participantes admitidos (`participantsCount`).
   - Origem dos participantes (`participantsOrigin`):
     - `global` — Entrada direta da inscrição geral do torneio.
     - `stage-position` — Classificados por colocação em fase anterior (ex: 1º e 2º colocados).
     - `overall-ranking` — Classificação geral acumulada (ranking intergrupos).
   - Quantidade de grupos (`groupsCount`), exibida dinamicamente quando `type === 'round-robin'`, com cálculo instantâneo de times por chave.

3. **Seção 3: Saída e Mecânica de Avanço**
   - Vagas de avanço (`advancingCount`): Quantidade de equipes que passam para o próximo estágio.
   - Cruzamentos / Guia de Mecânica: Card informativo contextual resumindo a transição matemática (ex: "De 8 participantes, 4 avançam e 4 encerram a participação").

---

## 4. Conformidade Rigorosa com o BaseOS Design System

| Princípio de Design | Diretriz BaseOS | Implementação no Construtor |
|---|---|---|
| **Regra 60%** (Superfície Base) | 60% Neutro / Fundo | Fundo geral `bg-slate-50`, cards das fases `bg-white` |
| **Regra 30%** (Estrutura e Tipografia) | 30% Estrutural Neutro Escuro | Rótulos, títulos e textos em Azul Escuro (`text-[#0f172a]`), bordas `border-slate-200`, subtítulos `text-slate-600`. **Proibido uso de preto puro (`#000000`).** |
| **Regra 10%** (Acento Vibrante) | 10% Ação e Conversão | Reservado exclusivamente para o CTA primário: botão "Salvar Fase" em Laranja da marca (`bg-[#f59e0b] hover:bg-[#d97706] text-white`) |
| **Geometria de Controles** | Botões Pílula | Botão "+ Adicionar Fase" e botão "Salvar Fase" utilizam `rounded-full` |
| **Acessibilidade (a11y)** | WCAG 2.1 AA | Rótulos associados por `htmlFor`, diálogos com `DialogTitle` e `DialogDescription`, foco visível `ring-2 ring-offset-2` |
| **Micro-interações** | Feedback Operacional | Toasts de cópia de payload, transições suaves de hover e badges com números monoespaçados (`tabular-nums`) |

---

## 5. Próximos Passos de Integração

1. Criação dos arquivos React/TypeScript:
   - `src/components/competition/format-builder/StageDialog.tsx`
   - `src/components/competition/format-builder/CompetitionStageBuilder.tsx`
2. Exportação unificada no índice do módulo `src/components/competition/format-builder/index.ts`.
3. Verificação com a suíte de ferramentas do projeto: `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint` e testes unitários com Vitest.
