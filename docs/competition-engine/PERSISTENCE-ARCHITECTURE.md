# PERSISTENCE-ARCHITECTURE: Arquitetura da Persistência do Competition Format Engine

**Projeto:** BaseOS  
**Fase:** 4.5 — Auditoria e Arquitetura da Persistência do Competition Format Engine  
**Data:** 05/09/2026  
**Status:** ARQUITETURA DEFINIDA — SEM ALTERAÇÃO DE CÓDIGO  
**Workspace:** `/home/diego-martins/docker/volei`  

---

## 1. VISÃO GERAL E MISSÃO ARQUITETURAL

O novo **Competition Format Engine** introduzido nas Fases 4.1 a 4.4.1 provê a capacidade matemática de representar qualquer formato de competição (grupos tradicionais, mata-mata direto, repescagens, chaves com BYEs, e torneios compostos como grupos + play-in + quartas + semis + final).

A missão desta arquitetura de persistência é resolver o dilema fundamental:

> **Como persistir fases, rodadas, confrontos com equipes pendentes, referências abstratas de participantes e regras de progressão no PostgreSQL/Supabase, garantindo integridade referencial, consultas de alta performance e proteção RLS, sem duplicar regras de negócio no banco e sem deformar os contratos canônicos do domínio?**

---

## 2. COMPARAÇÃO DAS ALTERNATIVAS ARQUITETURAIS

Para definir a melhor estratégia de persistência, três alternativas foram exaustivamente comparadas contra 15 critérios técnicos rigorosos:

### 2.1. Alternativa A — Modelo Documental Puro (Tudo em JSONB dentro de `competitions.config`)
Nesta abordagem, todo o Grafo de Fases (`StageGraph`), todas as rodadas, todos os slots e seus estados de resolução seriam persistidos exclusivamente dentro da coluna `competitions.config` (ou em um campo JSONB `competitions.runtime_state`).

- **Vantagens:** Schema do PostgreSQL permanece inalterado; zero migrations estruturais; serialização direta dos objetos TypeScript.
- **Desvantagens Graves:** 
  - Concorrência desastrosa: dois operadores salvando resultados de jogos simultâneos causariam *lost updates* no JSONB monolítico.
  - Consultas analíticas inviáveis: listar todas as partidas de uma quadra ou de uma equipe exigiria varreduras lentas com operadores JSONB profundos (`jsonb_array_elements`).
  - Sem integridade referencial: o banco não valida se uma equipe em um slot realmente existe na tabela `teams`.
  - Sem RLS granular: não é possível conceder permissão de edição em nível de partida ou fase.

### 2.2. Alternativa B — Modelo Puramente Relacional (Normalização Completa)
Nesta abordagem, tudo viraria tabelas relacionais no banco: `competition_stages`, `competition_rounds`, `competition_match_slots`, `competition_participant_references`, `competition_pairing_definitions`, `competition_progression_rules`, `competition_scoring_rules`, etc.

- **Vantagens:** Integridade relacional máxima via chaves estrangeiras (`FOREIGN KEY`); consultas SQL expressivas; constraints em todas as colunas.
- **Desvantagens Graves:**
  - Rigidez excessiva e deformação do domínio: para suportar 8 tipos de `ParticipantReference` em colunas relacionais, seriam necessárias tabelas polimórficas complexas ou dezenas de colunas nulas (`group_index`, `position`, `source_slot_id`, `seed_number`, `filter`, etc.).
  - Complexidade de migração catastrófica: versionar regras esportivas exigiria migrar dezenas de tabelas para cada ajuste de formato.
  - Violaria o princípio de que `CompetitionConfig` é o SSOT canônico, espalhando lógica declarativa por 10 tabelas relacionais.

### 2.3. Alternativa C — Modelo Híbrido (Recomendado)
Separação estrita entre **Configuração Estrutural (Config-Time)** e **Estado Operacional (Runtime)**:
1. **Configuração Estrutural (SSOT):** Permanece declarativa em `competitions.config` (JSONB tipado). Define a estrutura do torneio: fases previstas, estratégias de emparelhamento, rotas de progressão e critérios de desempate. Congelada em `competitions.rules_snapshot` no início do torneio.
2. **Estado Operacional (Runtime Relacional):** Tabelas relacionais enxutas para materializar o estado do torneio:
   - `competition_stages`: Estado de execução da fase (`pending`, `in-progress`, `completed`).
   - `competition_rounds`: Rodadas ativas da fase.
   - `competition_match_slots`: A intenção física do confronto (`slot_id`, `stage_id`, referências dos participantes em JSONB, e referências resolvidas via FKs relacionais `resolved_team_a_id`, `resolved_team_b_id`).
   - `matches`: O evento esportivo agendado (data, hora, quadra, árbitros, súmula, sets e resultado canônico).

---

### 2.4. Matriz Comparativa Detalhada

| Critério Técnico | Alternativa A (JSONB Puro) | Alternativa B (Relacional Puro) | Alternativa C (Modelo Híbrido) |
|---|---|---|---|
| **Consistência** | Baixa (risco de sobrescrita concorrente) | Alta (ACID em nível de coluna) | **Alta** (ACID relacional no runtime + SSOT imutável) |
| **Versionamento** | Fácil (JSON snapshot) | Muito difícil (versionar 8 tabelas) | **Excelente** (`rules_snapshot` congela config) |
| **Mutabilidade Concorrente**| Péssima (lock do registro inteiro) | Boa (locks por linha) | **Excelente** (locks por slot/partida) |
| **Performance de Consulta**| Lenta para agregações | Rápida com índices | **Rápida** (índices em FKs resolvidas) |
| **Consultas do Portal Público**| Complexas (extração JSON) | Simples (JOINs) | **Simples e Otimizadas** (JOINs diretos) |
| **RLS e Permissões** | Impossível por fase/slot | Excessivamente granular | **Ideal** (RLS por estágio, slot e partida) |
| **Auditoria Operacional** | Difícil distinguir alterações | Excessiva (muitas tabelas) | **Precisa** (logs por evento de slot/partida) |
| **Evolução de Novos Formatos**| Alta flexibilidade | Baixa flexibilidade (exige DDL) | **Máxima** (novos formatos sem alterar DDL) |
| **Complexidade de Migração**| Mínima | Altíssima (alto risco de quebra) | **Controlada e Incremental** (zero big-bang) |
| **Compatibilidade Legada** | Difícil mapear | Exige reescrita total | **Perfeita** (legado opera como stage único) |
| **Integridade Referencial** | Nula no banco | Total | **Estratégica** (FKs nas equipes resolvidas) |
| **Debugging e Observabilidade**| Difícil inspecionar diffs | Fácil com SELECT padrão | **Excelente** (SELECT em slots + JSON semântico) |
| **Supabase / PostgREST** | Pouco amigável para realtime | Suporta realtime nativo | **Total suporte a Realtime e Subscriptions** |
| **Atomicidade de Sorteios** | Depende de lock manual | Múltiplas tabelas | **RPC atômica transacional** |
| **Facilidade de Rollback** | Simples mas perde histórico | Complexo | **Segura** (status de fase permite rollback) |

**DECISÃO ARQUITETURAL:** Aprovada unanimemente a **Alternativa C — Modelo Híbrido**.

---

## 3. FRONTEIRA RÍGIDA: CONFIGURAÇÃO VS RUNTIME

Para manter a integridade arquitetural do BaseOS, a fronteira entre o que é **Configuração** e o que é **Runtime** deve ser inviolável:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                      CONFIGURAÇÃO (Config-Time)                           │
│              SSOT: competitions.config / rules_snapshot                   │
│                                                                           │
│  • StageDefinition[] (tipo de fase, grupos/bracket, ordem)                │
│  • PairingDefinition (estratégia: seeded, high-low, round-robin)          │
│  • ParticipantFeedDefinition[] (origens conceituais de participantes)     │
│  • ProgressionRoute[] (mapeamento: Vencedor/Perdedor -> Alvo)             │
│  • ScoringSystemConfig (pontuação de sets e partidas)                     │
│  • StandingsConfig & TiebreakCriteriaOrder (critérios de desempate)       │
│  • RegistrationRulesConfig (regras de elenco e inscrição)                 │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                       Instanciação & Resolução
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         ESTADO (Runtime)                                  │
│              Tabelas Relacionais Operacionais PostgreSQL                  │
│                                                                           │
│  • competition_stages (status: pending, in-progress, completed)           │
│  • competition_rounds (rodadas ativas da fase)                            │
│  • competition_match_slots (intenção esportiva do confronto)              │
│       ├── participant_a: ParticipantSlotState (JSONB)                     │
│       ├── participant_b: ParticipantSlotState (JSONB)                     │
│       ├── resolved_team_a_id: UUID / text (FK teams.id, nullable)         │
│       ├── resolved_team_b_id: UUID / text (FK teams.id, nullable)         │
│       └── match_id: text (FK matches.id, nullable)                        │
│  • matches (o jogo físico agendado com horário, quadra e súmula)          │
│       └── sets: JSONB (parciais oficiais)                                 │
│  • CanonicalMatchResult (resultado canônico imutável do desfecho)        │
│  • Standings / Progression Propagation (avanço para o próximo slot)       │
└───────────────────────────────────────────────────────────────────────────┘
```

### Tabela de Responsabilidades:

| Elemento | Onde Reside | Mutabilidade | Quem Altera |
|---|---|---|---|
| **Formato e Estrutura de Fases** | `competitions.config` | Imutável após início do torneio | Organizador no planejamento |
| **Snapshot de Regras** | `competitions.rules_snapshot` | Estritamente Congelado | Sistema ao iniciar o torneio |
| **Status da Fase** | `competition_stages.status` | Mutável por transição | Sistema / Organizador ao avançar fase |
| **Slots Previstos** | `competition_match_slots` | Gerados na inicialização da fase | Sistema (Pairing Engine) |
| **Resolução de Participantes** | `slots.resolved_team_x_id` | Atualizado conforme jogos encerram | Sistema (Progression Engine) |
| **Partida Agendada** | `matches` | Mutável (horário, local, árbitros) | Organizador / Mesa de arbitragem |
| **Súmula e Sets** | `matches.sets` | Mutável durante o jogo | Árbitro / Operador de mesa |
| **Vencedor Canônico** | Derivado de `matches.sets` | Imutável após homologação | `CompetitionRulesService` |

---

## 4. O PRINCÍPIO DO MATCH SLOT ≠ MATCH

Um dos maiores problemas identificados na auditoria foi a sobrecarga de `matches` para representar ao mesmo tempo a **intenção esportiva de um confronto** e o **evento físico de uma partida**:

### 4.1. Match Slot (Intenção Estrutural)
- Representa um nó na árvore da competição (ex: "Quartas 1: 1º do Grupo A vs 2º do Grupo B").
- Existe desde o momento em que a fase é desenhada.
- Pode ter participantes ainda desconhecidos (`status = 'unresolved'`).
- Pode ser um `BYE` (não gera partida real).
- Possui identidade estável: `comp-1:knockout:qf:slot-1`.

### 4.2. Match (Evento Físico Esportivo)
- Representa a realização esportiva de um confronto: data, hora, ginásio, quadra, árbitros designados, súmula de mesa.
- **Só é gerado/agendado quando ambos os participantes estiverem resolvidos** (ou quando o organizador decide publicar a grade horária com equipes pendentes em modo informativo).
- Produz o `CanonicalMatchResult` ao ser finalizado.

---

## 5. CADEIA DE RESULTADOS E PROPAGAÇÃO DETERMINÍSTICA

A arquitetura preserva a cadeia canônica de resultados sem criar duplicidade de lógica no banco:

```text
Partida Finalizada na Mesa (matches.sets preenchidos)
                 │
                 ▼
dataAccess.recordMatchResult(matchId, sets, observations)
                 │
                 ▼
CompetitionRulesService.getCanonicalMatchResult(competition, match)
                 │
        ┌────────┴────────┐
        ▼                 ▼
Vencedor Válido    Partida Inválida / Empate não resolvido
(canonical.isCompleted)   (alerta emitido, sem propagação)
        │
        ▼
GenericProgressionEngine.propagateOutcome(slotId, canonicalResult)
        │
        ├── Localiza rota: ProgressionRoute(sourceSlotId)
        ├── Identifica alvo: ProgressionTarget(targetStageId, targetRoundId, targetSlotId, targetSide)
        │
        ▼
Transação PostgreSQL (save_progression_resolution):
  1. UPDATE competition_match_slots
     SET resolved_team_id = winner.id, status = 'resolved'
     WHERE slot_id = targetSlotId AND side = targetSide;
  2. Verifica se o targetSlot agora possui ambos os times resolvidos.
  3. Se ambos resolvidos e slot agendável -> Cria ou atualiza o Match correspondente.
```

---

## 6. TRANSAÇÕES E ATOMICIDADE

Para erradicar a vulnerabilidade identificada em `PERSIST-002` (onde `saveDrawWithMatches` executava DELETE $\to$ INSERT $\to$ UPSERT em chamadas HTTP separadas), a arquitetura classifica todas as operações críticas:

### 6.1. Operações Estritamente Transacionais (RPC PostgreSQL Obrigatória)
1. **`save_stage_draw_and_slots`:**
   - Valida se a fase pode ser sorteada (nenhum jogo iniciado).
   - Remove slots e partidas agendadas antigas da fase.
   - Insere novos slots calculados pelo engine.
   - Gera partidas correspondentes aos confrontos já resolvidos.
   - Atualiza status do sorteio e da fase.
   - Executa tudo dentro de um único bloco `BEGIN ... COMMIT` no banco.
2. **`propagate_match_progression`:**
   - Registra homologação do resultado.
   - Propaga vencedor e perdedor para os slots de destino de forma atômica.
   - Impede condições de corrida entre encerramentos simultâneos de jogos.
3. **`advance_stage_lifecycle`:**
   - Verifica conclusão de todos os slots mandatórios do estágio anterior.
   - Consolida classificação oficial intergrupos ou da fase.
   - Inicializa os slots da fase subsequente.

### 6.2. Operações Eventualmente Consistentes
- Sincronização de cache do portal público.
- Emissão de notificações push / webhooks para equipes.
- Registro de logs de auditoria operacional em segundo plano.

---

## 7. MODELAGEM DE SEGURANÇA E RLS

As políticas de Row Level Security (RLS) devem blindar as novas entidades seguindo o princípio do menor privilégio:

```sql
-- 1. Leitura Pública: Transparência esportiva total
CREATE POLICY "stages_public_read" ON public.competition_stages FOR SELECT USING (true);
CREATE POLICY "rounds_public_read" ON public.competition_rounds FOR SELECT USING (true);
CREATE POLICY "slots_public_read" ON public.competition_match_slots FOR SELECT USING (true);

-- 2. Mutação Restrita: Apenas Organizadores e Administradores
CREATE POLICY "stages_organizer_write" ON public.competition_stages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin')));

CREATE POLICY "slots_organizer_write" ON public.competition_match_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin')));
```

---

## 8. DIAGRAMA DA ARQUITETURA ALVO

```text
COMPETITION RECORD
├── id: 'comp-2026-voltz'
├── name: 'Circuito Voltz 2026'
├── status: 'in-progress'
├── config (JSONB - SSOT de Regras)
│     ├── format.stages[]: [
│     │     Stage 1: { id: 'groups', type: 'groups', groupsCount: 4, teamsPerGroup: 3 }
│     │     Stage 2: { id: 'play-in', type: 'play-in', pairing: high-low (5x12, 6x11, 7x10, 8x9) }
│     │     Stage 3: { id: 'knockout', type: 'elimination', bracketSize: 8 }
│     │   ]
│     ├── scoring: { winClear: 3, winNarrow: 2, lossNarrow: 1, lossClear: 0 }
│     └── standings: { tiebreakOrder: ['points', 'wins', 'sets-ratio'], aggregation: 'by-group-position-first' }
└── rules_snapshot (JSONB imutável)

RUNTIME RELACIONAL (PostgreSQL)
│
├── competition_stages
│     ├── { id: 'stg-1', competition_id: 'comp-2026-voltz', stage_id: 'groups', status: 'completed' }
│     ├── { id: 'stg-2', competition_id: 'comp-2026-voltz', stage_id: 'play-in', status: 'in-progress' }
│     └── { id: 'stg-3', competition_id: 'comp-2026-voltz', stage_id: 'knockout', status: 'pending' }
│
├── competition_rounds
│     ├── { id: 'rnd-pi-1', stage_id: 'stg-2', round_id: 'round-1', name: 'Play-in Preliminar' }
│     ├── { id: 'rnd-ko-qf', stage_id: 'stg-3', round_id: 'qf', name: 'Quartas de Final' }
│     ├── { id: 'rnd-ko-sf', stage_id: 'stg-3', round_id: 'sf', name: 'Semifinais' }
│     └── { id: 'rnd-ko-fn', stage_id: 'stg-3', round_id: 'final', name: 'Grande Final' }
│
├── competition_match_slots
│     ├── [Slot QF1]:
│     │     participant_a: { type: 'overall-ranking', position: 1 } -> resolved_team_a_id: 'team-osasco' (RESOLVIDO)
│     │     participant_b: { type: 'match-winner', sourceSlotId: 'PI-4' } -> resolved_team_b_id: NULL (PENDENTE)
│     │     match_id: NULL
│     │
│     └── [Slot QF2]:
│           participant_a: { type: 'overall-ranking', position: 4 } -> resolved_team_a_id: 'team-praia' (RESOLVIDO)
│           participant_b: { type: 'match-winner', sourceSlotId: 'PI-1' } -> resolved_team_b_id: NULL (PENDENTE)
│           match_id: NULL
│
└── matches (Partidas efetivamente disputadas / em andamento)
      ├── [Match PI-1]: Play-in 1 (5º vs 12º) -> Finalizado (Vencedor: team-barueri)
      │     └── CanonicalMatchResult -> Propaga 'team-barueri' para Slot QF2 (participant_b)
      │
      └── [Match QF2]: Criado automaticamente assim que PI-1 encerrou!
            ├── team_a_id: 'team-praia'
            └── team_b_id: 'team-barueri'
```
