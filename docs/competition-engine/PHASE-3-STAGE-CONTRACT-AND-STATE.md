# BaseOS — Arquitetura de Contrato de Dados e Gestão de Estado: Construtor de Fases
**Documento:** `docs/competition-engine/PHASE-3-STAGE-CONTRACT-AND-STATE.md`  
**Módulo:** Motor de Competições — Construtor Progressivo em Linha do Tempo  
**Papel:** Senior Frontend Engineer (React, TypeScript, Tailwind CSS, shadcn/ui)  
**Data:** 02 de Outubro de 2026  
**Status:** Implementado, Validado e Homologado  

---

## 1. Contexto e Motivação

O backend do **BaseOS** foi consolidado para operar como um **Grafo Acíclico Dirigido (DAG)** de fases esportivas, desacoplado de suposições pré-fabricadas ou cards estáticos de formatos fechados (como "Grupos 2x4", "Mata-mata simples"). 

Para capacitar o organizador do torneio a montar qualquer dinâmica competitiva do mundo real (ex: Chave Ouro/Prata, Fase Classificatória + Play-In + Finais, ou Turno Único com repescagem), a interface de autoria abandona os formulários rígidos e adota um **Construtor Progressivo em Linha do Tempo Vertical**.

Nesta arquitetura, cada fase é um nó do grafo conectado sequencialmente, e o frontend gerencia diretamente a lista canônica de definições de fases.

---

## 2. Contrato de Dados Canônico (`StageDefinition`)

O estado central da interface do organizador é governado estritamente pela seguinte estrutura de tipos TypeScript, declarada e exportada em `@/components/competition/format-builder`:

```typescript
export type StageDefinition = {
  id: string;
  order: number;
  name: string;
  type: 'round-robin' | 'knockout' | 'custom';
  participantsCount: number;
  participantsOrigin: 'global' | 'stage-position' | 'overall-ranking';
  groupsCount?: number;
  advancingCount: number;
};
```

### Especificação Semântica dos Campos

| Campo | Tipo | Obrigatoriedade | Descrição & Regras de Negócio |
| :--- | :--- | :---: | :--- |
| `id` | `string` | **Sim** | Identificador único e estável da fase no frontend/grafo (ex: `'stage-1'`, `'stage-1727891234'`). Usado como chave de reconciliação do React (`key`) e resolução de dependências no DAG. |
| `order` | `number` | **Sim** | Posição sequencial ordinal do nó na linha do tempo (estritamente indexado de `1` a `N`). Recalculado automaticamente em qualquer reordenação ou exclusão. |
| `name` | `string` | **Sim** | Rótulo amigável exibido nos cards e sumários (ex: `"Fase de Grupos"`, `"Eliminatória Ouro"`). |
| `type` | `'round-robin' \| 'knockout' \| 'custom'` | **Sim** | Mecânica da disputa:<br>• `'round-robin'`: Todos contra todos (dentro de chaves ou chave única);<br>• `'knockout'`: Eliminatória simples / mata-mata;<br>• `'custom'`: Formatos especiais ou chaveamento manual. |
| `participantsCount` | `number` | **Sim** | Quantidade total de equipes ou atletas que disputarão esta fase específica (mínimo: 2). |
| `participantsOrigin` | `'global' \| 'stage-position' \| 'overall-ranking'` | **Sim** | Fonte de alimentação dos participantes:<br>• `'global'`: Inscrição geral do campeonato (fase inicial);<br>• `'stage-position'`: Classificados por posição direta da fase anterior (ex: 1º e 2º colocados de cada grupo);<br>• `'overall-ranking'`: Tabela agregada geral da fase precedente (ex: melhores terceiros colocados). |
| `groupsCount` | `number` | *Opcional* | Quantidade de grupos/chaves. Obrigatório se `type === 'round-robin'`. Para chave única, assume `1`. Indefinido (`undefined`) em fases eliminatórias. |
| `advancingCount` | `number` | **Sim** | Quantidade de vagas ou participantes que avançam para a fase seguinte. Em fases finais que decidem o campeão, assume `1`. |

---

## 3. Gestão do Estado no React (`CompetitionStageBuilder`)

### 3.1 Inicialização e Imutabilidade
O componente gerencia a lista de fases por meio do hook `useState<StageDefinition[]>`:

```typescript
export interface CompetitionStageBuilderProps {
  initialStages?: StageDefinition[];
  onChange?: (stages: StageDefinition[]) => void;
  readOnly?: boolean;
  className?: string;
}

export const CompetitionStageBuilder: React.FC<CompetitionStageBuilderProps> = ({
  initialStages = [
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
  ],
  onChange,
  readOnly = false,
  className = '',
}) => {
  const [stages, setStages] = useState<StageDefinition[]>(initialStages);
  // ...
```

### 3.2 Invariante de Ordenação Contínua (`1..N`)
Para garantir que a sequência ordinal de execução nunca possua lacunas ou duplicidades, toda operação de mutação (inserção, edição, exclusão, movimentação ou duplicação) passa pela função `updateStages`:

```typescript
const updateStages = (newStages: StageDefinition[]) => {
  // Reordena o campo order estritamente de 1..N
  const reordered = newStages.map((s, idx) => ({
    ...s,
    order: idx + 1,
  }));
  setStages(reordered);
  onChange?.(reordered);
};
```

### 3.3 Operações de Grafo Suportadas
1. **Adicionar Fase:** Abre o `StageDialog` pré-configurado com a ordem `N + 1` e insere o nó ao final da linha do tempo.
2. **Editar Fase:** Carrega os dados do nó no `StageDialog` (organizado em 3 seções temáticas) e aplica as alterações pontuais mantendo o `id` e a ordem.
3. **Mover para Cima / Baixo (`onMoveUp` / `onMoveDown`):** Realiza a troca posicional de nós vizinhos e reatribui a numeração sequencial.
4. **Duplicar Fase:** Clona os parâmetros do nó selecionado com novo `id` e insere como nova etapa subsequente.
5. **Remover Fase:** Remove o nó e recompacta os índices `order` dos elementos remanescentes.

---

## 4. Utilitário de Diagnóstico: "Debug Payload"

Para facilitar a homologação pelo organizador e a integração com o backend, o cabeçalho do construtor possui um botão dedicado **Debug Payload**:

```typescript
const handleDebugPayload = () => {
  // 1. Log obrigatório no console do desenvolvedor
  console.log('--- [BaseOS Stage Graph Payload (StageDefinition[])] ---');
  console.log(JSON.stringify(stages, null, 2));
  console.log('Direct Object Array:', stages);

  // 2. Feedback adicional amigável copiando para clipboard caso disponível
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(JSON.stringify(stages, null, 2))
      .then(() => {
        setCopiedDebug(true);
        setTimeout(() => setCopiedDebug(false), 2500);
      })
      .catch(() => {});
  }
};
```

Ao clicar:
- Emite no console do navegador o log estruturado do array `StageDefinition[]`;
- Copia o JSON formatado diretamente para a área de transferência;
- Altera visualmente o botão para confirmação ("JSON Copiado!" com ícone de check esmeralda).

---

## 5. Diretrizes Visuais do Design System (BaseOS)

Os componentes respeitam rigorosamente a paleta de cores e tipografia corporativa do BaseOS:
1. **Fundo do Construtor:** `bg-slate-50` com bordas suaves `border-slate-200/90` e cantos amplos `rounded-3xl`.
2. **Cards de Fase:** Brancos puros (`bg-white`), bordas nítidas `border-slate-200/90`, raio `rounded-2xl` e elevação suave `shadow-sm`.
3. **Prefixos Padronizados:** Caixa alta com peso tipográfico forte, ex: `"01 GRUPOS"`, `"02 ELIMINATÓRIA"`.
4. **Tipografia Navy:** Títulos, rótulos e valores em Navy `#0f172a` (evitando pretos puros).
5. **Botões em Pílula:** Elementos interativos utilizam `rounded-full`.
6. **CTA Principal Vibrante:** Botão de confirmação "Salvar Fase" utiliza Laranja vibrante `bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-full`.

---

## 6. Cobertura de Testes Automatizados

A suíte em `src/test/competitionStageBuilder.test.tsx` valida integralmente o contrato e as interações do construtor:
- **Teste 1:** Renderização dos cards com prefixos ordinais padronizados (`"01 GRUPOS"`, `"02 ELIMINATÓRIA"`);
- **Teste 2:** Execução do utilitário "Debug Payload" disparando `console.log` com o array gerado;
- **Teste 3:** Abertura do modal de configuração respeitando as 3 seções obrigatórias (Identificação, Entrada, Saída/Mecânica);
- **Teste 4:** Validação do botão CTA "Salvar Fase" com estilo Laranja da marca e formato pílula;
- **Teste 5:** Adição dinâmica de uma nova fase ao array e verificação do callback `onChange`;
- **Teste 6:** Reordenação de fases via botões "Mover para Cima / Baixo" com reindexação estrita de `order`.
