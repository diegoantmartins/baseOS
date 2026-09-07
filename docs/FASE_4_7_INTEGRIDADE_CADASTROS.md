# BASEOS — FASE 4.7: INTEGRIDADE DO DOMÍNIO DE COMPETIÇÃO, EQUIPES, ATLETAS E INSCRIÇÕES

## 1. Resumo Executivo

A Fase 4.7 consolidou a integridade esportiva e documental dos participantes no BaseOS. O sistema agora é matematicamente e conceitualmente incapaz de produzir estados competitivos inconsistentes entre:
```text
Competição → Inscrição → Equipe → Roster → Atletas → Partidas → Histórico
```

Foi criado o serviço canônico:
[`src/services/competitionRegistrationService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionRegistrationService.ts)
que centraliza todas as regras de inscrição, composição de elencos, bloqueios de prazo, unicidade de atletas no torneio e blindagem do histórico de partidas jogadas.

---

## 2. Estado Anterior e Diagnóstico

Antes desta fase:
1. **Bypass de Regras em `AthletesPage.tsx`**:
   - `handleRegister` gravava atletas diretamente em `dataAccess.createCompetitionAthlete` sem validar limites de elenco, capitães, líberos ou unicidade de camisa.
   - `handleTransfer` migrava atletas entre equipes sem checar se a equipe de destino tinha vagas ou conflitos.
2. **Exclusão Insegura de Equipes em `TeamsPage.tsx`**:
   - Uma agremiação podia ser excluída mesmo possuindo partidas agendadas ou já disputadas em competições ativas/históricas, quebrando a integridade referencial.
3. **Ausência de Unicidade de Atleta na Mesma Competição**:
   - O sistema permitia que um mesmo atleta fosse inscrito por duas equipes distintas na mesma competição (ausência de checagem inter-equipes).
4. **Desconexão do Ciclo de Vida**:
   - `registrationService.ts` validava apenas prazo (`registrationDeadline`) e flag `isLocked`, mas não consultava o status global da competição (`completed`, `cancelled`) nem impedia adulterações em competições encerradas.
5. **Parâmetro de Regras Omitido**:
   - `addAthlete` recorria a limites estáticos genéricos por não repassar a `CompetitionRecord` para o motor canônico de regras esportivas.

---

## 3. Arquitetura Nova

```text
┌──────────────────────────────┐
│      CompetitionConfig       │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│   CompetitionRulesService    │
│  (getRosterLimits, Sets)     │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│CompetitionRegistrationService│
│  - canRegisterTeam           │
│  - canRemoveRegistration     │
│  - canDeleteTeam             │
│  - validateAthlete           │
│  - canRemoveAthleteFromRoster│
│  - canTransferAthlete        │
│  - validateRosterMinimum     │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ CompetitionLifecycleService  │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  Páginas & Consumidores:     │
│  - TeamsPage                 │
│  - AthletesPage              │
│  - CompetitionRegistrations  │
│  - TeamRosterRegistration    │
└──────────────────────────────┘
```

---

## 4. Regras Canônicas Implementadas

### 4.1 Inscrição de Equipes (`canRegisterTeam`)
- Competição em status `completed` ou `cancelled` rejeita novas inscrições.
- Bloqueio estrito de duplicidade: uma equipe não pode ser inscrita mais de uma vez na mesma competição (`unique competition_id + team_id`).

### 4.2 Desinscrição e Exclusão (`canRemoveRegistration` e `canDeleteTeam`)
- Uma inscrição não pode ser removida se a equipe já possuir partidas associadas (agendadas ou jogadas) naquela competição.
- Uma agremiação global (`TeamRecord`) não pode ser excluída do sistema se já possuir partidas disputadas em seu histórico esportivo ou inscrições ativas em competições.

### 4.3 Composição do Elenco e Atletas (`validateAthleteRegistration`)
- **Unicidade de Atleta no Torneio**: Bloqueio de inscrição de um atleta se seu documento (ou nome completo) já estiver inscrito por outra equipe na mesma competição.
- **Unicidade de Camisa na Equipe**: Números entre 1 e 99 (opcional até o dia do jogo); se informado, deve ser exclusivo dentro daquela equipe.
- **Limites Canônicos**: Máximo de 14 atletas (indoor 6x6) ou 4 atletas (praia 2x2).
- **Líberos**: Máximo de 2 líberos para vôlei de quadra; 0 líberos para vôlei de praia.
- **Capitães**: Máximo de 1 capitão por equipe.

### 4.4 Preservação Histórica (`canRemoveAthleteFromRoster`)
- Um atleta que já conste como relacionado, escalado (`lineups`) ou checado em súmula (`checkedInAthleteIds`) em partida oficial já disputada **não pode ser removido do elenco**, garantindo a imutabilidade do registro esportivo histórico.

---

## 5. Banco de Dados e Migrations

- Mapeamento das tabelas existentes:
  - `competitions`: Chave primária `id`, status do ciclo de vida, `config jsonb`, `rules_snapshot jsonb`.
  - `teams`: Chave primária `id`.
  - `competition_teams`: Chaves estrangeiras com `on delete cascade`, `unique (competition_id, team_id)`, `access_token unique`.
  - `competition_athletes`: Chave estrangeira `competition_team_id`, índice único parcial `uq_competition_athletes_jersey (competition_team_id, jersey_number) where jersey_number is not null`.
  - `matches`: Chaves estrangeiras `competition_id`, `team_a_id`, `team_b_id`, `unique (competition_id, match_number)`.
- As garantias de integridade do domínio em `CompetitionRegistrationService` protegem o banco contra violações de integridade referencial antes mesmo que mutations sejam disparadas.

---

## 6. Testes e Validação da Fase 4.7

Foi criada a suíte dedicada:
`src/test/competitionRegistrationIntegrity.test.ts` (12 testes):
1. Bloqueio de inscrição em competição cancelada ou concluída.
2. Bloqueio de inscrição duplicada da mesma equipe na competição.
3. Permissão de inscrição válida.
4. Bloqueio de remoção de inscrição com partidas vinculadas.
5. Bloqueio de exclusão de agremiação com histórico competitivo ou inscrições.
6. Bloqueio de número de camisa duplicado na equipe.
7. Permissão de camisa opcional até o dia do jogo.
8. Bloqueio de mais de 1 capitão por equipe.
9. Bloqueio de líbero em vôlei de praia (limite = 0).
10. Bloqueio de inscrição do mesmo atleta em duas equipes na mesma competição.
11. Bloqueio de remoção de atleta que já disputou partida oficial (preservação histórica).
12. Validação de mínimo de atletas regulamentares para a modalidade.

### Tabela de Verificação Final:
| Verificação | Comando | Resultado |
| :--- | :--- | :--- |
| **TypeScript** | `npx tsc -p tsconfig.app.json --noEmit` | **0 erros** (Exit code 0) |
| **ESLint** | `npm run lint` | **0 erros** (Exit code 0) |
| **Vitest** | `npm test` | **68 arquivos, 544 testes aprovados (100% verde)** |
| **Build de Produção** | `npm run build` | **Sucesso em 57.68s** (dist pronto para produção) |

---

## 7. Riscos Residuais e Próximos Passos (Fase 4.8)

- **Riscos Residuais**: Nenhum risco impeditivo identificado no domínio de participantes.
- **Próxima Fase**: **Fase 4.8 — Integridade de Fases, Chaveamento e Geração de Partidas** (geração e integridade do chaveamento, fases de grupos vs mata-mata, cruzamentos olímpicos e avanço de equipes para playoffs).
