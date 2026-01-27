# Schema do Banco de Dados - VolleyPro

Este documento descreve o schema planejado para o banco de dados PostgreSQL via Supabase.

---

## Diagrama ER Simplificado

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

1. Habilitar Lovable Cloud/Supabase
2. Executar migrations na ordem correta
3. Configurar RLS para cada tabela
4. Testar com dados de exemplo
5. Integrar frontend com as tabelas
