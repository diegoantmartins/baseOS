# Schema do Banco de Dados - VolleyPro

Este documento descreve o schema do banco de dados PostgreSQL via Supabase.

> **ATENÇÃO:** o schema **implementado** está em `supabase/migrations/` e é a fonte da verdade. A seção abaixo reflete o banco real; o restante do documento é o schema **planejado/original** (referência para evolução futura).

---

## ✅ Schema Implementado (Supabase)

Migrações em `supabase/migrations/20260818000000_initial_schema.sql` (schema) e `20260818000001_seed.sql` (dados de demonstração).

### Convenções

- **Colunas em `snake_case`**; a aplicação usa camelCase e faz a conversão no adaptador (`src/services/dataAccess.ts`, helpers `toSnake`/`toCamel`).
- **Colunas JSONB** (`competition_teams.registration_info`, `matches.sets`, `matches.referees`) guardam as chaves **em camelCase**, espelhando os tipos TS (`RegistrationInfo`, `SetMatchRecord`, `MatchReferee`).
- IDs são `text` (formato `comp-1`, `ct-2`, `ath-101`...) para espelhar os seeds do frontend, em vez de UUID.

### Tabelas

| Tabela | Colunas principais | Observações |
|--------|-------------------|-------------|
| `profiles` | id (ref `auth.users`), email, full_name, role (`organizer`/`referee`/`team`), competition_team_id | Criada por trigger `handle_new_user` ao cadastrar; consultada para login/autorização |
| `competitions` | name, description, modality, format, player_format, set_format, start_date, end_date, venue, status, registration_deadline, rules JSONB, config JSONB, rules_snapshot JSONB | Suporta motor de regras canônicas (Fase 4.2/4.4) e snapshot imutável |
| `teams` | name, short_name, logo_url, coach_name | |
| `referees` | full_name, level | |
| `competition_teams` | competition_id, team_id, access_token (convite), registration_status (`not_started`/`in_progress`/`completed`), is_locked, registration_info JSONB (capitão, líbero 1, líbero 2, observações), created_at, updated_at | UNIQUE (competition_id, team_id) e UNIQUE access_token |
| `competition_athletes` | competition_team_id, name, jersey_number (opcional, UNIQUE parcial por equipe quando presente), position, document_number, birth_date, gender, is_captain, is_libero, created_at | Máx. 14 por equipe (validado na RPC `register_athlete`) |
| `matches` | competition_id, round, match_number, team_a_id, team_b_id, scheduled_time, status, score_a, score_b, winner_id, sets JSONB, referees JSONB, phase, bracket_stage | Equipes referenciadas via `competition_teams.id` |
| `draws` | id, competition_id, phase_id, groups JSONB, brackets JSONB, schedule JSONB, status (`preview`/`official`/`locked`), created_at, updated_at | Gerenciamento e bloqueio de sorteios (Fases 4.8/4.9) |

### Enums

`user_role`, `competition_status`, `modality`, `gender_category`, `registration_status`, `match_status`, `draw_status` (`preview`, `official`, `locked`).

### Row Level Security

- Leitura **pública** (SELECT) em todas as tabelas — o app expõe jogos/classificação sem login.
- Escrita apenas para usuários autenticados (`authenticated`).
- `profiles`: usuário pode ler/atualizar apenas o próprio perfil.

### RPC `register_athlete`

Função `SECURITY DEFINER` que inscreve um atleta **sem exigir login** (fluxo de inscrição por link): valida token de convite, prazo de inscrição, limite de 14 atletas, duplicidade de camisa, capitão (1) e líberos (2), e atualiza o status da inscrição para `in_progress`.

### Trigger `handle_new_user`

Cria automaticamente o `profiles` quando um usuário se cadastra no Supabase Auth.

---

## Diagrama ER (Schema Planejado)

```
organizations ──┬── competitions ──┬── matches ──┬── sets
                │                  │             ├── match_events
                │                  │             └── match_sheets
                │                  │
                │                  ├── competition_teams ──── teams ──── team_athletes ──── athletes
                │                  │
                │                  └── competition_referees ── referees
                │
                ├── users
                └── categories
```

---

## Tabelas

### organizations
Suporte multi-tenant para diferentes federações/ligas.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### users
Usuários do sistema com perfis de acesso.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'organizer', 'referee', 'coach', 'athlete', 'viewer')),
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### categories
Categorias de competição (idade, sexo, nível).

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  age_group TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'mixed')),
  level TEXT CHECK (level IN ('amateur', 'professional', 'youth', 'masters')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### competitions
Competições/torneios.

```sql
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  modality TEXT NOT NULL CHECK (modality IN ('indoor', 'beach')),
  format TEXT NOT NULL CHECK (format IN ('round-robin', 'single-elimination', 'double-elimination', 'olympic-bracket', 'swiss-system', 'group-stage-knockout')),
  player_format TEXT NOT NULL CHECK (player_format IN ('6x6', '4x4', '2x2', '3x3')),
  set_format TEXT NOT NULL CHECK (set_format IN ('1-set', '2-sets', '3-sets', '5-sets')),
  start_date DATE,
  end_date DATE,
  venue TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'registration', 'in-progress', 'completed', 'cancelled')),
  rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### teams
Equipes cadastradas.

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  coach_name TEXT,
  stats JSONB DEFAULT '{"matches_played": 0, "matches_won": 0, "matches_lost": 0}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### athletes
Atletas cadastrados.

```sql
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  full_name TEXT NOT NULL,
  document_id TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  photo_url TEXT,
  position TEXT,
  stats JSONB DEFAULT '{"matches_played": 0, "points_scored": 0, "aces": 0, "blocks": 0, "kills": 0}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### team_athletes
Relacionamento atletas-equipes com número da camisa.

```sql
CREATE TABLE team_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  jersey_number INTEGER NOT NULL,
  is_captain BOOLEAN DEFAULT false,
  is_libero BOOLEAN DEFAULT false,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, athlete_id),
  UNIQUE(team_id, jersey_number)
);
```

### referees
Árbitros cadastrados.

```sql
CREATE TABLE referees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  full_name TEXT NOT NULL,
  document_id TEXT,
  photo_url TEXT,
  certification_level TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### competition_teams
Equipes inscritas em competições.

```sql
CREATE TABLE competition_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  seed INTEGER,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competition_id, team_id)
);
```

### matches
Partidas agendadas ou realizadas.

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  team_a_id UUID REFERENCES teams(id),
  team_b_id UUID REFERENCES teams(id),
  venue TEXT,
  court TEXT,
  scheduled_time TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'warmup', 'in-progress', 'timeout', 'set-break', 'completed', 'postponed', 'cancelled')),
  score_a INTEGER DEFAULT 0,
  score_b INTEGER DEFAULT 0,
  winner_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### match_referees
Árbitros escalados para partidas.

```sql
CREATE TABLE match_referees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  referee_id UUID REFERENCES referees(id),
  role TEXT CHECK (role IN ('referee-1', 'referee-2', 'scorer', 'line-judge')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### sets
Sets de cada partida.

```sql
CREATE TABLE sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  score_a INTEGER DEFAULT 0,
  score_b INTEGER DEFAULT 0,
  winner TEXT CHECK (winner IN ('A', 'B')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  serve_order JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, set_number)
);
```

### match_events
Eventos durante a partida (pontos, substituições, sanções, etc).

```sql
CREATE TABLE match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  set_id UUID REFERENCES sets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('point', 'timeout', 'substitution', 'sanction', 'challenge')),
  team TEXT CHECK (team IN ('A', 'B')),
  data JSONB NOT NULL,
  score_at JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);
```

### match_sheets
Súmulas digitais.

```sql
CREATE TABLE match_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('indoor-3-sets', 'indoor-5-sets', 'beach-1-set', 'beach-2-sets')),
  lineup_a JSONB DEFAULT '{}',
  lineup_b JSONB DEFAULT '{}',
  sanctions JSONB DEFAULT '[]',
  observations TEXT,
  signatures JSONB DEFAULT '[]',
  is_locked BOOLEAN DEFAULT false,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### standings
Classificação calculada (pode ser view materializada).

```sql
CREATE TABLE standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  position INTEGER,
  group_name TEXT,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,
  sets_won INTEGER DEFAULT 0,
  sets_lost INTEGER DEFAULT 0,
  points_won INTEGER DEFAULT 0,
  points_lost INTEGER DEFAULT 0,
  competition_points INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competition_id, team_id)
);
```

---

## Índices Recomendados

```sql
-- Performance de queries
CREATE INDEX idx_matches_competition ON matches(competition_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_scheduled ON matches(scheduled_time);
CREATE INDEX idx_match_events_match ON match_events(match_id);
CREATE INDEX idx_team_athletes_team ON team_athletes(team_id);
CREATE INDEX idx_standings_competition ON standings(competition_id);
```

---

## Row Level Security (RLS)

Exemplo de políticas básicas:

```sql
-- Habilitar RLS
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

-- Admins podem tudo
CREATE POLICY "Admins full access" ON competitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Organizadores podem gerenciar suas competições
CREATE POLICY "Organizers manage own competitions" ON competitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'organizer'
      AND users.organization_id = competitions.organization_id
    )
  );

-- Visualização pública de competições ativas
CREATE POLICY "Public view active competitions" ON competitions
  FOR SELECT USING (status IN ('registration', 'in-progress', 'completed'));
```

---

## Triggers Úteis

```sql
-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Atualizar classificação após partida
CREATE OR REPLACE FUNCTION update_standings_after_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Lógica para recalcular standings
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalc_standings
  AFTER UPDATE OF status ON matches
  FOR EACH ROW 
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_standings_after_match();
```

---

## Próximos Passos

1. ✅ Executar as migrations (schema + seed) no projeto Supabase
2. ✅ Habilitar Supabase Auth e definir a senha dos usuários do seed
3. ✅ Configurar RLS para cada tabela
4. ✅ Testar com dados de exemplo
5. ✅ Integrar frontend (adapter com mapeamento camelCase ↔ snake_case)
6. Evoluir o schema planejado acima conforme novas funcionalidades (organizations, categories, match_events, match_sheets, standings)
