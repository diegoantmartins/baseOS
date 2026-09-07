# 02 — Arquitetura do Módulo de Sorteio

## Visão Geral da Arquitetura

O módulo de sorteio do BASEOS é composto por 4 camadas principais:

```
┌─────────────────────────────────────────┐
│         PRESENTATION LAYER              │
│  DrawPage.tsx | LiveDrawModal.tsx       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         SERVICE LAYER                    │
│  drawService.ts                         │
│  - distributeTeamsIntoGroups()          │
│  - generateDrawMatches()                │
│  - runDraw()                            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         DATA ACCESS LAYER                │
│  dataAccess.ts                          │
│  - saveDraw()                           │
│  - getDrawByCompetition()               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         PERSISTENCE LAYER               │
│  Supabase / LocalStorage                │
│  - draws table                          │
│  - matches table                        │
└─────────────────────────────────────────┘
```

## Arquivos Principais

| Arquivo | Tipo | Responsabilidade |
|---------|------|------------------|
| `src/pages/DrawPage.tsx` | Componente React | Página principal do sorteio |
| `src/components/draw/LiveDrawModal.tsx` | Componente React | Modal de apresentação ao vivo |
| `src/services/drawService.ts` | Serviço | Motor de lógica de sorteio |
| `src/types/draw.ts` | Definição de tipos | Contratos TypeScript |
| `src/services/dataAccess.ts` | Repositório | Persistência (linha 340+) |
| `supabase/migrations/20260819000001_draws.sql` | Migração SQL | Schema do banco |

## Fluxo Completo de Execução

### Fluxo 1: Execução do Sorteio

```
1. Usuário acessa /sorteio ou /sorteio/:competitionId
         ↓
2. DrawPage renderiza
   → Carrega competições (dataAccess.listCompetitions())
   → Carrega equipes (dataAccess.listTeams())
   → Carrega equipes da competição (dataAccess.listCompetitionTeams())
   → Carrega sorteios existentes (dataAccess.listDraws())
   → Se competitionId na URL, carrega sorteio existente
         ↓
3. Usuário configura:
   - Número de grupos (groupsCount)
   - Modo de sorteio (seedingMode: 'random' | 'seeded')
   - Cabeças de chave (headSeeds[]) — apenas modo seeded
   - Seed (número para reprodutibilidade)
         ↓
4. Usuário clica "Realizar Sorteio"
   → handleRunDraw()
         ↓
5. Serviço executa:
   → runDraw(competition, teams, config)
      ├── distributeTeamsIntoGroups(entries, groupsCount, config)
      │   ├── mulberry32(seed) → PRNG determinístico
      │   ├── buildBalancedCapacities() → capacidade por grupo
      │   ├── Separa headSeeds do resto
      │   ├── Seeding: coloca heads uma por grupo
      │   ├── Shuffle: embaralha restante com seed
      │   └── Distribui respeitando capacidades
      │
      └── generateDrawMatches(groups)
          ├── Para cada grupo:
          │   └── generateGroupRoundRobin(teamIds)
          │       └── Berger Table algorithm
          │
          └── Retorna DrawResult
         ↓
6. Resultado guardado em state (preview)
         ↓
7. Usuário pode fazer drag-and-drop para ajustar
   → handleGroupDragEnd()
   → generateDrawMatches() regenera tabela
         ↓
8. Usuário clica "Salvar Sorteio e Gerar Jogos"
   → handleSaveDraw()
         ↓
9. Persistência:
   → dataAccess.saveDraw(drawResult)
   → Para cada matchProposal:
      └── dataAccess.createMatch(matchData)
```

### Fluxo 2: Apresentação ao Vivo

```
1. Usuário executa o sorteio (handleRunDraw → runDraw) e/ou clica "Modo Apresentação"
         ↓
2. LiveDrawModal abre (fullscreen, resolve o DrawResult real)
         ↓
3. shouldUseDrawArena3D() decide o visualizador:
   → Draw Arena 3D (principal)  → DrawArenaController
   → fallback                   → DrawScene3D
         ↓
4. Draw Arena 3D → máquina de estados:
   INTRO → READY → DRAWING → REVEAL → GROUP_UPDATE → COMPLETE
   Cada equipe é revelada com ~4–5s (timing centralizado)
         ↓
5. Operador controla o ritmo:
   → Pausar/Reproduzir (autoplay)
   → Avançar (próximo reveal, quando estado permite)
   → Slider de velocidade (modula preparo + holds proporcionais)
         ↓
6. Ao final (COMPLETE):
   → Mostra "Sorteio Concluído"
```

## Dependências Entre Serviços

```typescript
// DrawPage depende de:
import { runDraw, roundRobinMatchCount, roundRobinRoundCount, generateDrawMatches } from '@/services/drawService';
import { suggestGroupsCount } from '@/types/draw';
import { dataAccess } from '@/services/dataAccess';

// drawService depende de:
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { DrawConfig, DrawGroup, DrawMatchProposal, DrawResult, DrawTeamEntry } from '@/types/draw';

// dataAccess depende de:
import type { DrawRecord, DrawResult } from '@/types/draw';
```

## Estados da DrawPage

```typescript
// Estados locais
const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
const [teams, setTeams] = useState<TeamRecord[]>([]);
const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
const [matches, setMatches] = useState<MatchRecord[]>([]);
const [existingDraw, setExistingDraw] = useState<DrawRecord | null>(null);
const [selectedId, setSelectedId] = useState<string>('');
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);

// Configuração do sorteio
const [groupsCount, setGroupsCount] = useState(2);
const [seedingMode, setSeedingMode] = useState<DrawConfig['seedingMode']>('seeded');
const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000));
const [headSeeds, setHeadSeeds] = useState<string[]>([]);

// Preview do sorteio
const [preview, setPreview] = useState<{ groups: DrawGroup[]; matches: DrawMatchProposal[] } | null>(null);
```

## Relacionamento com Outros Módulos

| Módulo | Relação |
|--------|---------|
| Competitions | Fornece competição para sorteio |
| Teams | Fornece equipes inscritas |
| Standings | Consome resultado do sorteio (classificação por grupo) |
| Matches | Gera partidas a partir do sorteio |
| Playoffs | Consome resultado do sorteio para chaveamento |
| CompetitionLifecycle | Controla transição de status `draw-pending` → `groups-defined` |

## Pontos de Extensão Identificados

1. **Motor de Sorteio Alternativo**: `drawService.ts` pode ter algoritmos alternativos
2. **Visualização 3D**: `LiveDrawModal.tsx` preparado para animações
3. **Critérios de Distribuição**: `distributeTeamsIntoGroups` pode receber critérios customizados
4. **Validador de Restrições**: Não existe validação de conflitos antes do sorteio
