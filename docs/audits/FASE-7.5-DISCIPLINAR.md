# BASEOS — FASE 7.5 — RELATÓRIO DE AUDITORIA TÉCNICA

## RELATÓRIO DISCIPLINAR / CARTÕES / SANÇÕES

**Projeto:** BaseOS — Sports Intelligence  
**Data:** 12 de Setembro de 2026  
**Ambiente:** DEV Local exclusivamente  
**Produção VOLTZ:** (`https://voltz.baseos.online`) — TOTALMENTE CONGELADA / INTOCADA  
**Decisão da Auditoria:** **CAMINHO B — DOMÍNIO INEXISTENTE / DADOS ESTRUTURADOS INSUFICIENTES**  
**Status:** **BLOCKED / FUTURE DOMAIN WORK**  

---

## 1. OBJETIVO DA AUDITORIA

Auditar com profundidade arquitetural e técnica se o **BaseOS — Sports Intelligence** possui atualmente dados reais estruturados e contratos de persistência suficientes para sustentar a emissão de um relatório operacional:

> **"DISCIPLINAR / CARTÕES / SANÇÕES"**  
> *(Quais advertências, cartões amarelos, cartões vermelhos, expulsões ou sanções disciplinares foram registradas durante a competição e a quem estão associadas?)*

---

## 2. METODOLOGIA DE INVESTIGAÇÃO EXAUSTIVA

Foi realizada varredura completa em todo o ecossistema do repositório, inspecionando:

1. **Termos de Busca:**
   - `sanction`, `sanctions`, `card`, `cards`, `yellow`, `red`, `warning`, `penalty`, `disciplinary`, `discipline`, `punishment`, `misconduct`
   - `advertência`, `advertencia`, `cartão`, `cartao`, `cartões`, `sanção`, `sancao`, `punição`, `punicao`, `conduta`
   - `MatchEvent`, `MatchAction`, `MatchIncident`, `MatchPenalty`, `observations`, `remarks`

2. **Camadas Inspecionadas:**
   - Contratos TypeScript (`src/types/entities.ts`, `src/types/volleyball.ts`, `src/types/registration.ts`)
   - Camada de Acesso a Dados (`src/services/dataAccess.ts`)
   - Serviços de Domínio (`src/services/*`)
   - Telas de Gestão de Jogos e Súmula (`src/pages/MatchesPage.tsx`, `src/pages/MatchSheetPage.tsx`, `src/pages/CreateMatchPage.tsx`, `src/pages/ReportsPage.tsx`)
   - Motor de Documentos e Súmula (`src/document-engine/`)
   - Base de Dados e Migrações PostgreSQL (`supabase/migrations/`)
   - Dados de Demonstração e Testes (`src/data/seed.ts`, `src/test/*`)

---

## 3. DIAGNÓSTICO DETALHADO POR CAMADA

### 3.1 Entidades Principais de Domínio (`src/types/entities.ts`)

A entidade central da partida no BaseOS é `MatchRecord`:
```typescript
export type MatchRecord = {
  id: string;
  competitionId: string;
  round: number;
  matchNumber: number;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  scheduledTime: string;
  status: MatchLifecycleStatus;
  sets: SetScoreRecord[];
  referees: MatchRefereeRecord[];
  lineups?: { teamA: MatchLineup; teamB: MatchLineup };
  checkedInAthleteIds?: string[];
  observations?: string;
  winnerId?: string;
  highlightAthleteId?: string;
  homologatedAt?: string;
  homologatedBy?: string;
  auditLog?: MatchAuditEntry[];
  createdAt: string;
  updatedAt: string;
};
```
**Constatação:**
- `MatchRecord` **não possui** campo para sanções, cartões, advertências ou penalidades.
- A estrutura de sets (`SetScoreRecord`) possui exclusivamente:
  ```typescript
  export type SetScoreRecord = {
    setNumber: number;
    scoreA: number;
    scoreB: number;
  };
  ```
  Não há registro de pontuação parcial no momento de sanções, tampouco histórico de infrações por set.
- O campo `observations` é uma string livre opcional, utilizada apenas para anotações gerais da partida ou para carimbo automático do destaque da partida (`"Destaque da Partida (MVP): #7 Bruna Silva (ALP)"`). Não é um dado estruturado.

---

### 3.2 Banco de Dados e Migrações (`supabase/migrations/`)

A tabela `public.matches` definida em `20260818000000_initial_schema.sql` e estendida em migrações subsequentes contém:
- `id`, `competition_id`, `round`, `match_number`, `team_a_id`, `team_b_id`, `team_a_name`, `team_b_name`, `venue`, `court`, `scheduled_time`, `status`, `sets jsonb`, `referees jsonb`, `observations text`, `winner_id text`, `highlight_athlete_id text`.

**Constatação:**
- **Inexistência de tabela disciplinar:** Não existe tabela `match_sanctions`, `disciplinary_cards`, `infractions` ou equivalente no PostgreSQL.
- **Inexistência de colunas JSONB:** Nem `matches`, nem `competitions`, nem `competition_athletes` armazenam qualquer vetor de cartões ou penalidades.
- **Inexistência de RLS/RPCs:** Não há políticas nem procedures no banco para registrar ou consultar eventos disciplinares.

---

### 3.3 Porta de Acesso a Dados (`src/services/dataAccess.ts`)

A porta canônica `dataAccess` (com seus dois adapters: `localStorageAdapter` e `supabaseAdapter`) suporta:
- Competições, Equipes, Atletas, Inscrições (`CompetitionTeam`, `CompetitionAthlete`), Partidas, Locais, Árbitros, Designações e Logs de Auditoria Operacional.

**Constatação:**
- Há **zero métodos** de leitura, inserção ou atualização de cartões ou sanções.
- O adapter LocalStorage não armazena nenhuma chave de eventos disciplinares.

---

### 3.4 Motor de Documentos e Súmula (`src/document-engine/`)

Esta é a distinção mais importante exigida pela Seção 32 do prompt:
> *"Não confundir: 'o sistema possui espaço visual na súmula' com 'o sistema possui dados estruturados de disciplina'."*

**O que existe no motor de documentos:**
1. **Tipagem isolada de layout:**
   - Em `src/document-engine/schemas/match.schema.ts`, existe a declaração de tipos conceituais:
     ```typescript
     export type SanctionType = 'warning' | 'penalty' | 'expulsion' | 'disqualification';
     export type Sanction = {
       setNumber: number;
       teamId: string;
       targetType: SanctionTarget;
       playerId?: string;
       type: SanctionType;
       scoreA: number;
       scoreB: number;
       timestamp: string;
     };
     ```
2. **Componente de renderização gráfica:**
   - Em `src/document-engine/baseos/components/BaseosSanctions.tsx`, existe o componente React-PDF que desenha a grade física de sanções padronizada pela FIVB/CBV no rodapé da folha de súmula A4.
3. **Mapeamento real (`src/document-engine/baseos/mapper/match.mapper.ts`):**
   - Ao converter um `MatchRecord` real do sistema em dados para renderizar a súmula, o mapper faz:
     ```typescript
     sanctions: [],
     improperRequests: { teamA: false, teamB: false },
     ```
   - Ou seja, a grade é desenhada **sempre em branco**, pronta para ser preenchida à caneta pelo apontador na quadra.

---

### 3.5 Interface do Usuário e Operação de Partidas (`MatchesPage.tsx`, `MatchSheetPage.tsx`)

Na interface operacional:
- A tela de partidas permite criar jogos, definir horários, alterar status do ciclo de vida, registrar placares finais por set, registrar árbitros e escolher o MVP.
- **Não existe nenhuma interface, modal, botão ou formulário** para o apontador, árbitro ou coordenador registrar uma advertência, cartão amarelo, cartão vermelho ou penalidade.
- Os dados do seed (`src/data/seed.ts`) contêm centenas de partidas e atletas, mas **zero sanções ou cartões**.

---

## 4. MATRIZ DE REQUISITOS vs. REALIDADE DO BASEOS

| Requisito do Relatório Disciplinar | Suporte Atual no BaseOS | Evidência Técnica |
| :--- | :---: | :--- |
| **Tipo de Cartão / Sanção** (Amarelo, Vermelho, Expulsão, Desqualificação) | ❌ Inexistente no domínio | Declarado apenas em schema estático de PDF; sem persistência. |
| **Pessoa / Atleta Envolvido** | ❌ Inexistente | Nenhum vínculo partida ↔ atleta para ocorrências. |
| **Equipe Penalizada** | ❌ Inexistente | Sem associação no modelo de dados. |
| **Partida e Set da Ocorrência** | ❌ Inexistente | `SetScoreRecord` só armazena pontos totais (`scoreA`, `scoreB`). |
| **Momento / Placar da Sanção** | ❌ Inexistente | Sem registro de pontuação no momento do cartão. |
| **Árbitro Responsável** | ❌ Inexistente | Árbitros são vinculados à partida globalmente, sem ligação com sanções. |
| **Motivo / Observação** | ❌ Inexistente | `MatchRecord.observations` é texto livre para notas gerais / MVP. |
| **Consequência / Punição / Suspensão** | ❌ Inexistente | Nenhuma lógica de pontuação extra ou suspensão automática. |

---

## 5. DECISÃO TÉCNICA OBRIGATÓRIA: CAMINHO B

Diante das evidências irrefutáveis obtidas na auditoria, e em estrito cumprimento às seções **4, 5, 18 e 32** do prompt:

> **NÃO CRIAR UM SISTEMA DISCIPLINAR ARTIFICIAL.**  
> Criar uma tela vazia, ou inventar dados fictícios, ou criar migrations/tabelas fora de hora representaria grave quebra de escopo e dívida estrutural no BaseOS.

Portanto:
1. **Nenhuma migration, tabela ou RPC foi criada.**
2. **Nenhum patch no `dataAccess` foi executado.**
3. **Nenhuma interface enganosa foi adicionada à Central de Relatórios.**
4. A funcionalidade é classificada formalmente como:
   $$\mathbf{BLOCKED\ /\ FUTURE\ DOMAIN\ WORK}$$

---

## 6. BLUEPRINT PARA FUTURA IMPLEMENTAÇÃO DO DOMÍNIO DISCIPLINAR

Para que o BaseOS venha a suportar o Relatório Disciplinar em uma fase futura, será necessário implementar um ciclo de vida de **Match Events & Sanctions**:

### 6.1 Modelo de Dados Recomendado (Futuro)
```sql
create table public.match_sanctions (
  id text primary key,
  match_id text not null references public.matches(id) on delete cascade,
  competition_id text not null references public.competitions(id) on delete cascade,
  set_number integer not null,
  team_id text not null references public.teams(id),
  target_type text not null check (target_type in ('player', 'coach', 'assistant', 'medical', 'team')),
  athlete_id text references public.athletes(id),
  sanction_type text not null check (sanction_type in ('warning', 'penalty', 'expulsion', 'disqualification')),
  score_team_a integer not null default 0,
  score_team_b integer not null default 0,
  referee_role text,
  reason text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

### 6.2 Interface de Apontamento em Tempo Real (Futuro)
- No painel da mesa/apontador (`MatchSheetPage.tsx` ou futuro Placar ao Vivo), disponibilizar a ação rápida:
  `Registrar Cartão / Advertência` com seleção de: Set $\rightarrow$ Equipe $\rightarrow$ Camisa $\rightarrow$ Tipo de Cartão $\rightarrow$ Placar.

### 6.3 Relatório Operacional (Futuro)
- Uma vez persistidos os dados reais acima, o relatório em `ReportsPage.tsx` consumirá `dataAccess.listMatchSanctions(competitionId)` com ordenação cronológica e agrupamento por equipe/cartão.

---

## 7. PARECER CONCLUSIVO

A auditoria técnica cumpriu seu papel de proteção arquitetural: comprovou que o BaseOS possui desenho visual na súmula, mas **não possui persistência nem modelo estruturado de disciplina**. Seguir o Caminho B preserva a integridade do sistema, sem gerar código falso ou dívida técnica.

**Status Final da Auditoria:** **BLOCKED (CAMINHO B — DOMÍNIO INSUFICIENTE)**
