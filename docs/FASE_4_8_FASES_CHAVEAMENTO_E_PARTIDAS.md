# BASEOS — FASE 4.8: FASES, GRUPOS, CHAVEAMENTOS E GERAÇÃO DE PARTIDAS

## 1. Resumo Executivo

A Fase 4.8 consolidou a camada que transforma **participantes válidos em estrutura esportiva oficial e partidas** (fase de grupos e playoffs). O sistema agora garante matematicamente e arquiteturalmente:
- A geração de grupos via tabela Berger (round-robin) sem duplicações e com tratamento limpo de folgas (`__BYE__`).
- Proteção estrita contra a destruição ou re-sorteio de fases que já possuam partidas iniciadas ou concluídas.
- Chaveamentos eliminatórios (playoffs) automáticos para 1 grupo único (final direta ou 3º lugar), 2 grupos e 4 grupos (cruzamentos olímpicos 1A x 2B, etc.).
- **Avanço Automático Canônico**: A propagação de vencedores para as fases seguintes e perdedores para a disputa de 3º lugar passa a ser derivada exclusivamente de `CompetitionRulesService.getCanonicalMatchResult(competition, match)`.
- Apuração oficial do pódio (Campeão, Vice-campeão, 3º e 4º lugares) integrada ao resultado canônico.

---

## 2. Diagnóstico da Auditoria Anterior

1. **Risco de Destruição de Histórico em `dataAccess.saveDrawWithMatches`**:
   - O método limpava todas as partidas da fase classificatória (`delete() where phase in ('classificatória')`), apagando até mesmo partidas que já haviam sido jogadas ou homologadas.
2. **Avanço de Vencedor por Campo Bruto**:
   - Em `playoffsService.advancePlayoffMatches`, o código lia `match.winnerId` diretamente. Qualquer inconsistência ou W.O. sem preenchimento correto de `winnerId` causava avanço incorreto ou travamento do chaveamento.
3. **Ausência de Suporte a 1 Grupo Único**:
   - O gerador de playoffs só aceitava 2 ou 4 grupos. Torneios em turno único de todos contra todos ficavam sem geração de final e disputa de 3º lugar.
4. **Formato de Sets Fixo nos Playoffs**:
   - A função `buildPlayoffMatches` forçava ternário rígido, ignorando `CompetitionRulesService.resolveMatchFormat` e eventuais formatos de 1 set ou melhor de 3 na fase eliminatória.

---

## 3. Arquitetura Implementada

```text
┌──────────────────────────────┐
│      CompetitionConfig       │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│   CompetitionRulesService    │
│ (resolveMatchFormat, Canon)  │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│CompetitionRegistrationService│
│    (Roster & Inscrições)     │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ CompetitionLifecycleService  │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  CompetitionBracketService   │
│  - canModifyGroupStage       │
│  - canModifyPlayoffs         │
│  - generatePlayoffSlots      │
│  - buildPlayoffMatchRecords  │
│  - advancePlayoffBrackets    │
│  - getPodium                 │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│       Geração & Partidas     │
│   (Berger, Playoffs, Matches)│
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│    Resultado Canônico        │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  Classificação & Estatísticas│
└──────────────────────────────┘
```

---

## 4. Componentes e Entregas

### 4.1 `CompetitionBracketService`
Criado em [`src/services/competitionBracketService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionBracketService.ts):
- `canModifyGroupStage(competition, matches)`: Rejeita alterações na fase de grupos caso existam partidas em andamento, concluídas ou homologadas.
- `canModifyPlayoffs(competition, matches)`: Rejeita regeneração dos playoffs se qualquer partida eliminatória já tiver sido jogada.
- `generatePlayoffSlots(competition, groupStandings, overallStandings)`: Gera os confrontos para 1 grupo, 2 grupos ou 4 grupos.
- `buildPlayoffMatchRecords`: Constrói as partidas utilizando os formatos canônicos por fase de `CompetitionRulesService.resolveMatchFormat`.
- `advancePlayoffBrackets`: Propaga equipes no chaveamento derivando vencedor e perdedor do Resultado Canônico.
- `getPodium`: Apura o pódio oficial da competição.

### 4.2 Blindagem em `dataAccess.ts`
- Tanto a camada LocalStorage quanto a camada Supabase de `saveDrawWithMatches` agora verificam se existem partidas iniciadas ou finalizadas na fase classificatória antes de qualquer exclusão, disparando erro e protegendo o histórico do torneio.

### 4.3 Integração em `MatchesPage.tsx` e `DrawPage.tsx`
- `MatchesPage.tsx`:
  - `handleGeneratePlayoffs` agora valida `CompetitionBracketService.canModifyPlayoffs` antes de agir e suporta 1, 2 ou 4 grupos.
  - Homologação de partida agora avança os playoffs automaticamente utilizando `CompetitionBracketService.advancePlayoffBrackets`.
- `DrawPage.tsx`:
  - `handleSaveDraw` valida `CompetitionBracketService.canModifyGroupStage` antes de salvar.

---

## 5. Testes e Validação

Criada a suíte dedicada:
[`src/test/competitionBracket.test.ts`](file:///home/diego-martins/docker/volei/src/test/competitionBracket.test.ts) com 10 testes cobrindo:
1. Geração Berger de turno único com número par de equipes (6 jogos, 3 rodadas sem repetição).
2. Geração Berger com número ímpar de equipes (folga BYE limpa sem criar partidas fantasma).
3. Bloqueio de alteração da fase de grupos com partidas iniciadas ou finalizadas.
4. Permissão de alteração quando partidas estão apenas agendadas.
5. Chaveamento olímpico para 2 grupos (Semis 1A x 2B, 1B x 2A, 3º Lugar e Final).
6. Chaveamento para 1 grupo único (Final direta 1º x 2º).
7. Aplicação do formato de sets canônico por fase (`5-sets` na semi).
8. Avanço de vencedores para a final e perdedores para 3º lugar derivado do Resultado Canônico Oficial.
9. Apuração de pódio com precisão esportiva (Campeão, Vice, 3º e 4º Lugar).
10. Blindagem de `dataAccess.saveDrawWithMatches` contra substituição de partidas jogadas.

### Tabela de Verificação:
| Verificação | Comando | Resultado |
| :--- | :--- | :--- |
| **TypeScript** | `npx tsc -p tsconfig.app.json --noEmit` | **0 erros** (Exit code 0) |
| **ESLint** | `npm run lint` | **0 erros** (Exit code 0) |
| **Vitest** | `npm test` | **69 arquivos, 554 testes aprovados (100% verde)** |
| **Build de Produção** | `npm run build` | **Sucesso em 24.77s** (dist pronto para produção) |

---

## 6. Próxima Fase (Fase 4.9)

A Fase 4.8 fecha com chave de ouro toda a engrenagem intermediária do BaseOS (Configuração → Regras → Cadastro → Ciclo de Vida → Fases/Chaveamento → Partidas → Resultado Canônico → Classificação).

A **Fase 4.9 — Auditoria Final do Domínio de Competição** será a consolidação final com auditoria de ponta a ponta e emissão do laudo arquitetural completo.
