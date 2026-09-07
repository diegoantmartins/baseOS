# Auditoria Técnica e Diagnóstico de Acoplamentos — Fase 4.4 (Revisão Definitiva)

**Data:** 05/09/2026  
**Fase:** 4.4 — Ajustes Obrigatórios Pós-Auditoria  
**Status:** AUDITORIA CONCLUÍDA — BLOQUEADORES ARQUITETURAIS IDENTIFICADOS  

---

## 1. O Princípio da Soberania do Domínio sobre o Banco de Dados

A auditoria identificou um conflito severo entre o schema relacional legado e a modelagem do chaveamento eliminatório:
- `matches.team_a_id` e `matches.team_b_id` são declarados como `NOT NULL REFERENCES teams(id)`;
- O código anterior tentava contornar isso gerando strings fictícias como `TBD-A-1`.

> **DIRETRIZ ARQUITETURAL VINCULANTE (Seção 3 do Regulamento):**  
> **A LIMITAÇÃO DO BANCO NÃO PODE DETERMINAR COMO O NOVO DOMÍNIO SERÁ DESENHADO.**  
> O modelo de domínio puro deve ser concebido primeiro, com integridade matemática e segurança de tipos. A adaptação da persistência relacional ocorrerá em fase subsequente dedicada.

### Ordem Oficial de Execução:
```text
Fase 4.4.x
Contratos de domínio (MatchSlot, ParticipantReference, StageDefinition)
        ↓
Engine puro (StageEngine, PairingEngine, ProgressionEngine)
        ↓
Validação e Provas de Domínio (TDD em memória)
        ↓
Fase 4.5
Estratégia de persistência, migrations e integração com banco relacional
```

---

## 2. Destino Arquitetural dos Serviços Legados

A auditoria avaliou os módulos existentes e determinou a classificação de ciclo de vida de cada um:

| Serviço / Módulo Atual | Classificação | Justificativa Técnica | Estratégia de Migração |
| :--- | :---: | :--- | :--- |
| **`CanonicalMatchResult`** | **PRESERVAR** | Fonte única e canônica do resultado oficial da partida. Imutável. | Consumido diretamente pelo novo `ProgressionEngine`. |
| **`ScoringEngine`** | **PRESERVAR** | Motor funcional puro criado e homologado na Fase 4.3. | Continua calculando pontuações e regras de W.O. |
| **`TieBreakEngine`** | **PRESERVAR** | Motor de mini-tabela recursiva e desempates da Fase 4.3. | Continua resolvendo empates nos estágios e ranking geral. |
| **`OverallStandingsEngine`** | **PRESERVAR** | Consolidador de ranking intergrupos da Fase 4.3. | Alimenta feeds do tipo `overall-ranking`. |
| **`CompetitionRulesService`** | **PRESERVAR** | SSOT para normalização de regras, congelamento e validação. | Preservado como fachada de regras. |
| **`DrawService`** | **PRESERVAR** | Gerador do sorteio de grupos e tabela Berger para fase classificatória. | Integrado como executor do estágio do tipo `'group-stage'`. |
| **`CompetitionLifecycleService`** | **ADAPTAR** | Orquestra o status macro da competição. | Mantém o ciclo macro; deixa de tomar decisões sobre fases internas do torneio. |
| **`CompetitionBracketService`** | **ADAPTAR** | Fachada histórica de chaveamento. | Na Fase 4.4, seu interior delega para o `StageEngine` e `PairingEngine`, preservando a API pública para consumidores legados. |
| **`playoffsService.ts`** | **SUBSTITUIR / DEPRECAR** | Contém hardcodes de $1ºA \times 2ºB$, quartas fixas e propagação manual via arrays. | Será completamente substituído pelo `ProgressionEngine` e `BracketEngine`. Mantido apenas como casca de compatibilidade temporária até a Fase 4.5. |

---

## 3. Redefinição de Responsabilidades da `MatchesPage.tsx`

Atualmente, `MatchesPage.tsx` atua indevidamente como o "cérebro" da progressão eliminatória:
- Contém o loop imperativo que cria partidas no banco ao clicar em *"Sincronizar Playoffs"*;
- Contém o loop de `dataAccess.updateMatch` para avançar vencedores de quartas para semifinais ao homologar um jogo.

### O Novo Fluxo Desacoplado:
```text
Interface Visual (MatchesPage / Mobile Referee / API)
                   │
                   ▼ (1. Homologar resultado)
           dataAccess / Service
                   │
                   ▼ (2. Notificar resultado oficial)
         CanonicalMatchResult
                   │
                   ▼ (3. Calcular avanços)
          ProgressionEngine
                   │
                   ▼ (4. Gravar atualizações atômicas)
             dataAccess
```
A página de tela (`MatchesPage.tsx`) passa a ser **exclusivamente uma camada de apresentação**, renderizando o estado produzido pelos motores de domínio.

---

## 4. Auditoria de Segurança e Superfícies de Escrita

Quando integradas na Fase 4.5, as seguintes operações esportivas constituirão **superfícies de escrita protegidas**:
1. **Geração de Estágios (`createStage` / `generateStageSlots`):** Requer permissão de organizador (`competition:edit`);
2. **Geração de Pareamentos (`generatePairings`):** Operação administrativa do comitê técnico;
3. **Resolução de Participantes e Avanço (`advanceProgression`):** Disparado automaticamente na homologação de súmula (permissão `match:homologate`);
4. **Criação e Agendamento de Partidas:** Requer permissão `match:schedule`.

*Regra de Ouro:* A camada de domínio e os motores matemáticos são **100% agnósticos de permissão e autenticação**. A autorização reside exclusivamente na borda (gateways, endpoints e políticas RLS).

---

## 5. DECISÕES ARQUITETURAIS APÓS REVISÃO

1. **Participante pendente não é equipe fictícia:** Proibido cadastrar times falsos no banco.
2. **MatchSlot é diferente de Match persistido:** Slot é conceito do domínio; Match é entidade de agendamento/súmula.
3. **Stage possui identidade estável:** `stageId` único em todo o ciclo de vida.
4. **Round possui identidade estável:** `roundId` único dentro do estágio.
5. **Progression utiliza referências declarativas:** Feeds e rotas apontam para `targetSlotId`.
6. **Progression é um DAG validável:** Grafo direcionado acíclico testado contra ciclos.
7. **Competition Lifecycle é diferente de Stage Runtime:** Status macro e micro operam separadamente.
8. **`group_name` não deve carregar sozinho Stage/Round/Group:** Desacoplamento de conceitos.
9. **Pairing não decide vencedor:** Emparelhamento apenas monta confrontos.
10. **Progression não recalcula resultado:** Consumo canônico de `CanonicalMatchResult`.
11. **BYE não é equipe:** É folga automática resolvida no chaveamento.
12. **Nenhum formato específico de campeonato será embutido:** Universalidade do motor.
