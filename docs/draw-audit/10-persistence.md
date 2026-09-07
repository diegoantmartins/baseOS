# 10 — Auditoria da Persistência

## Arquivo Principal: `src/services/dataAccess.ts` (linhas 340-355 para saveDraw, 329-338 para getDraw)

## Tabela de Draws no Supabase

### Schema SQL

```sql
-- supabase/migrations/20260819000001_draws.sql
create table if not exists public.draws (
  id text primary key,
  competition_id text not null references public.competitions (id) on delete cascade,
  config jsonb not null default '{}',
  groups jsonb not null default '[]',
  matches jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_draws_competition on public.draws (competition_id);

alter table public.draws enable row level security;

create policy "draws_public_read" on public.draws for select using (true);
create policy "draws_auth_write" on public.draws for all
  to authenticated using (true) with check (true);
```

### Estrutura do DrawRecord

```typescript
// src/types/draw.ts:61-65
export type DrawRecord = DrawResult & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
```

## Operações de Persistência

### saveDraw(result: DrawResult): Promise<DrawRecord>

```typescript
async saveDraw(result: DrawResult): Promise<DrawRecord> {
  const all = readCollection<DrawRecord>('draws');
  const now = new Date().toISOString();
  const existing = all.find(d => d.competitionId === result.competitionId);
  let record: DrawRecord;
  if (existing) {
    record = { ...existing, ...result, updatedAt: now };
    const idx = all.findIndex(d => d.id === existing.id);
    all[idx] = record;
  } else {
    record = { ...result, id: generateId('draw'), createdAt: now, updatedAt: now };
    all.push(record);
  }
  writeCollection('draws', all);
  return record;
}
```

**Fluxo:**
1. Lê todos os draws do storage
2. Busca draw existente pela competição
3. Se existe: atualiza com novo resultado + updatedAt
4. Se não existe: cria novo com id, createdAt, updatedAt
5. Grava todos os draws de volta
6. Retorna o record

### Observações
- **Upsert por competição** — apenas um draw por competição
- `generateId('draw')` gera ID no formato `draw-XXXXXX`
- Usa `readCollection`/`writeCollection` (abstração LocalStorage/Supabase)
- **NÃO transacionado** — leitura e escrita separadas
- **Sempre sobrescreve** o draw existente (se houver)

### getDrawByCompetition(competitionId: string): Promise<DrawRecord | null>

```typescript
async getDrawByCompetition(competitionId: string): Promise<DrawRecord | null> {
  const all = await this.listDraws();
  return all.find(d => d.competitionId === competitionId) ?? null;
}
```

### listDraws(competitionId?: string): Promise<DrawRecord[]>

```typescript
async listDraws(competitionId?: string): Promise<DrawRecord[]> {
  ensureSeeded();
  const all = readCollection<DrawRecord>('draws');
  return competitionId ? all.filter(d => d.competitionId === competitionId) : all;
}
```

## Fluxo de Persistência na DrawPage

```typescript
// DrawPage.tsx:177-235
const handleSaveDraw = async () => {
  if (!selected || !preview) return;
  setSaving(true);
  try {
    await dataAccess.saveDraw({
      competitionId: selected.id,
      config: { groupsCount, seedingMode, seed, headSeeds: seedingMode === 'seeded' ? headSeeds : [] },
      groups: preview.groups,
      matches: preview.matches,
    });

    // Remove os jogos antigos da fase classificatória
    const oldMatches = matches.filter(
      m => m.competitionId === selected.id && 
      (m.phase === 'classificatória' || m.phase === 'classificatoria'),
    );
    if (oldMatches.length > 0) {
      await dataAccess.deleteMatches(oldMatches.map(m => m.id));
    }

    // Cria novos jogos
    const baseDate = selected.startDate ?? new Date().toISOString().slice(0, 10);
    const venueName = selected.venue ?? 'Ginásio Municipal';
    const savedMatches = preview.matches;
    for (let i = 0; i < savedMatches.length; i++) {
      const proposal = savedMatches[i];
      const teamA = teams.find(t => t.id === proposal.teamAId);
      const teamB = teams.find(t => t.id === proposal.teamBId);
      const hour = 9 + (i % 8);  // Horário artificial: 9h, 10h, 11h...
      await dataAccess.createMatch({
        competitionId: selected.id,
        round: proposal.round,
        matchNumber: proposal.matchNumber,
        teamAId: proposal.teamAId,
        teamBId: proposal.teamBId,
        teamAName: teamA?.name ?? '',
        teamBName: teamB?.name ?? '',
        teamAShortName: teamA?.shortName ?? '',
        teamBShortName: teamB?.shortName ?? '',
        venue: venueName,
        court: undefined,
        phase: proposal.phase,
        groupName: proposal.groupName,
        scheduledTime: `${baseDate}T${String(hour).padStart(2, '0')}:00:00`,
        status: 'scheduled',
        sets: [],
        referees: [],
      });
    }

    setSaving(false);
    toast.success('Sorteio salvo e jogos gerados!');
    await refresh();
  } catch (error) {
    setSaving(false);
    toast.error('Erro ao salvar o sorteio.');
  }
};
```

### Observações sobre a Persistência no Fluxo

1. **Ordem das operações:**
   - Salva draw
   - Deleta jogos antigos da fase classificatória
   - Cria novos jogos (um por um)

2. **Horário dos jogos:**
   - Fórmula: `hour = 9 + (i % 8)`
   - Sequência: 9h, 10h, 11h, 12h, 13h, 14h, 15h, 16h, 9h, 10h...
   - Não considera dias diferentes, horários comerciais, ou quadras disponíveis

3. **Transacionalidade:**
   - Se falhar na criação de um jogo, o draw já foi salvo
   - Se falhar na deleção, jogos antigos permanecem
   - **NÃO é transacional** — estado potencialmente inconsistente

4. **Campos salvos no draw:**
   - `competitionId`
   - `config: { groupsCount, seedingMode, seed, headSeeds }`
   - `groups: DrawGroup[]`
   - `matches: DrawMatchProposal[]`

## O Que é Persistido

### No DrawRecord
- `competitionId` — FK para competição
- `config` — JSONB com:
  - `groupsCount: number`
  - `seedingMode: 'random' | 'seeded'`
  - `seed: number`
  - `headSeeds: string[]`
- `groups` — JSONB com array de:
  - `{ name: string, teams: [{ teamId: string, seed: number }] }`
- `matches` — JSONB com array de:
  - `{ round: number, matchNumber: number, teamAId: string, teamBId: string, groupName: string, phase: string }`
- `createdAt`, `updatedAt`

### O Que NÃO é Persistido
- Ordem de sorteio (sequência de desenho)
- Semente usada para cada passo (apenas uma semente global)
- Metadados de apresentação (LiveDrawModal state)
- Histórico de arrastar e soltar (drag-and-drop)
- Timestamps individuais de criação de cada partida

## O Que Pode Ser Reconstruído

### A partir do draw salvo:
1. **Grupos e equipes** — diretamente em `groups`
2. **Tabela de jogos** — diretamente em `matches`
3. **Configuração do sorteio** — em `config`

### NÃO pode ser reconstruído:
1. **Ordem exata do sorteio** — somente a ordem final por grupo (ordenada por seed)
2. **Semente usada em cada passo** — somente uma semente global
3. **Se houve drag-and-drop após o sorteio** — o draw salvo reflete o estado final, mas não há histórico

## Abstração de Dados: `dataAccess.ts`

### Camada Adapter

O `dataAccess` fornece uma interface unificada para:
- **LocalStorage** (modo demo/desevolvimento)
- **Supabase** (produção)

### Métodos Relevantes

```typescript
// Métodos de sorteio
async listDraws(competitionId?: string): Promise<DrawRecord[]>
async getDrawByCompetition(competitionId: string): Promise<DrawRecord | null>
async saveDraw(result: DrawResult): Promise<DrawRecord>
async deleteMatches(ids: string[]): Promise<void>

// Métodos de partida (usados após salvar draw)
async createMatch(match: Omit<MatchRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<MatchRecord>
async deleteMatches(ids: string[]): Promise<void>
```

### Implementação do Adapter

```typescript
// dataAccess.ts:330-355 (LocalStorage)
// dataAccess.ts:809-834 (Supabase)

async saveDraw(result: DrawResult): Promise<DrawRecord> {
  const all = readCollection<DrawRecord>('draws');
  // ... mesma lógica para ambos os adaptadores
}
```

**Observação:** A lógica é **idêntica** para LocalStorage e Supabase — apenas o mecanismo de leitura/escrita muda.

## Validação de Integridade

### Constraints no Banco
- `id` — primary key
- `competition_id` — foreign key + unique index (um draw por competição)
- NENHUM constraint NOT NULL além do id
- JSONB fields não têm validação de schema

### Validação na Camada de Serviço
**NENHUMA** — `saveDraw` aceita qualquer `DrawResult` válido

## Pontos de Atenção

1. **NÃO transacional** — risco de estado inconsistente se falhar após saveDraw
2. **Horário artificial** — jogos criados com horário sequencial simples
3. **NÃO valida conflitos de horário** — dois jogos podem ter mesmo horário/quadra
4. **NÃO registra metadata** — quem salvou, quando exatamente, versão do algoritmo
5. **Seed armazenada mas não suficiente para reprodutibilidade total** — ordem de grupos pode variar com drag-and-drop
6. **NÃO há versionamento** — sempre sobrescreve o draw anterior

## Comparação com Seed Data

No `seed.ts`, há dois exemplos de draws:

```typescript
{
  id: 'draw-1',
  competitionId: 'comp-toledo-2026',
  config: { groupsCount: 2, seedingMode: 'seeded', seed: 2026, headSeeds: ['team-1', 'team-5'] },
  groups: [ /* ... */ ],
  matches: [ /* 12 jogos */ ],
  createdAt: iso(-1 * DAY),
  updatedAt: iso(-1 * DAY),
},
{
  id: 'draw-2',
  competitionId: 'comp-superliga-2026',
  config: { groupsCount: 1, seedingMode: 'seeded', seed: 2026, headSeeds: ['team-5'] },
  groups: [ /* ... */ ],
  matches: [ /* 6 jogos */ ],
  createdAt: iso(-1 * DAY),
  updatedAt: iso(-1 * DAY),
}
```

**Observação:** O seed demonstra que:
- Um draw por competição
- Configuração salva com precisão
- Jogos gerados correspondem ao Berger Table

## Conclusão

A camada de persistência:
- Implementa corretamente o padrão adapter (LocalStorage/Supabase)
- Garante um draw por competição via unique index
- Salva todos os dados necessários para reconstruir o sorteio
- **Não é transacional** — risco de inconsistência
- **Não persiste metadata** importante para auditoria
- Usa horário artificial simples para jogos

**É suficiente para funcionamento básico**, mas deixa lacunas para recursos avançados como:
- Histórico de sorteios
- Auditoria completa
- Reprodutibilidade garantida
- Validação de conflitos de horário