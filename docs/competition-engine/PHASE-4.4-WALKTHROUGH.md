# Walkthrough e Relatório Arquitetural Definitivo — Fase 4.4

**Data:** 05/09/2026  
**Fase:** 4.4 — Ajustes Obrigatórios Pós-Auditoria  
**Modo:** Somente Leitura (Design Arquitetural e Contratos)  
**Status da Certificação:** **`FASE 4.4 — ARQUITETURA REVISADA E APROVADA PARA IMPLEMENTAÇÃO`**  
**Workspace:** `/home/diego-martins/docker/volei`  

---

## 1. Visão Geral da Revisão Arquitetural

Após a identificação dos 8 bloqueadores na auditoria inicial, a arquitetura do **Competition Format Engine** foi rigorosamente revisada para eliminar ambiguidades conceituais e garantir que a camada de domínio seja concebida com total independência do banco de dados relacional.

Nenhum código de produção foi alterado, nenhuma migration foi executada e nenhum componente de tela foi modificado nesta etapa.

---

## 2. DECISÕES ARQUITETURAIS APÓS REVISÃO

1. **Participante pendente não é equipe fictícia:** É terminantemente proibido cadastrar equipes como `TBD-A-1`, `Winner-QF1` ou `BYE` na tabela `teams`. Participantes pendentes são representados por contratos de referência (`ParticipantReference`).
2. **MatchSlot é diferente de Match persistido:** O `MatchSlot` é uma abstração pura de domínio que representa o lugar e a intenção esportiva de uma partida na chave; o `MatchRecord` é a entidade operacional agendada no banco de dados.
3. **Stage possui identidade estável:** Cada estágio possui um `stageId` único, imutável e auditável.
4. **Round possui identidade estável:** Cada rodada dentro de um estágio possui um `roundId` estável.
5. **Progression utiliza referências declarativas:** A progressão de equipes mapeia partidas para `targetSlotId`, nunca dependendo de posições de array (`array[0]`) ou da ordem física de queries SQL.
6. **Progression é um DAG validável:** A cadeia de dependências entre estágios e slots forma um Grafo Direcionado Acíclico testado formalmente contra ciclos diretos, indiretos e complexos via DFS.
7. **Competition Lifecycle é diferente de Stage Runtime:** O status global da competição (`in-progress`, `completed`) opera no plano macro; os estágios operam no plano micro (`pending`, `ready`, `in-progress`, `completed`, `blocked`).
8. **`group_name` não deve carregar sozinho Stage/Round/Group:** Desacopla-se a sobrecarga da coluna `group_name`, separando fase, rodada e chave de grupo.
9. **Pairing não decide vencedor:** O motor de emparelhamento é uma função pura que apenas combina participantes recebidos em confrontos.
10. **Progression não recalcula resultado:** O avanço de equipes consome exclusivamente o `CanonicalMatchResult` oficial homologado.
11. **BYE não é equipe:** É um estado estrutural da chave que aciona avanço automático imediato para o adversário, sem gerar partidas fantasmas no banco.
12. **Nenhum formato específico de campeonato será embutido:** A arquitetura interpreta declarações genéricas universais, mantendo o sistema agnóstico em relação a qualquer torneio específico.

---

## 3. DECISÕES E LIMITES DA FASE 4.4

### Decisões
- **Ordem de Implementação:** Primeiro os contratos de domínio e os motores puros em memória (Fase 4.4.x); depois a persistência, migrations e integração com o banco (Fase 4.5).
- **Consumo do Resultado Canônico:** O `CanonicalMatchResult` continua sendo a única fonte oficial de verdade esportiva.
- **Estrutura Hierárquica Universal:** Todo formato esportivo é representado pela composição $\text{Stage} \to \text{Round} \to \text{MatchSlot} + \text{ProgressionRoute}$.

### Limitações
- Na Fase 4.4 não há suporte a persistência antecipada de partidas pendentes no PostgreSQL, pois as colunas `team_a_id` e `team_b_id` permanecem `NOT NULL REFERENCES teams(id)`.
- A geração visual da árvore de chaveamento em tempo real permanece na camada de domínio/serviço (in-memory), até a reformulação do componente visual `TournamentBracket`.
- Operações de sorteio em lote continuam utilizando `saveDrawWithMatches` sem transação relacional atômica até a introdução de RPC dedicada na Fase 4.5.

### O Que Permanece para a Fase 4.5
- Criação e execução de migrations no banco de dados PostgreSQL / Supabase;
- Tornar colunas `team_a_id` e `team_b_id` em `matches` anuláveis (`NULL`), ou criar tabela dedicada de slots relacionais;
- Introdução de RPC transacional atômica para salvamento de sorteios e tabelas;
- Persistência física do estado dos estágios (`stages`);
- Implementação de políticas de Row Level Security (RLS) para as novas superfícies de escrita de estágios e progressões.

### O Que Permanece para as Fases 4.6+
- **Fase 4.6:** Interface visual do Construtor de Formatos e telas de configuração de regras na UI do organizador;
- **Fase 4.7:** Biblioteca de templates prontos de formatos esportivos (Copa Amadora, Padrão Olímpico, Liga Municipal, Mata-mata Duplo);
- **Fase 4.8:** Homologação E2E completa e integração operacional final.

---

## 4. Matriz de Bloqueadores e Soluções Arquiteturais

| ID | Bloqueador | Severidade | Solução Arquitetural Aprovada | Fase de Resolução |
| :--- | :--- | :---: | :--- | :---: |
| **BLK-01** | `team_a_id` NOT NULL impede pré-criação de partidas | **CRITICAL** | O domínio desacopla `MatchSlot` de `MatchRecord`. Na Fase 4.4, os slots operam em memória com resolução Just-in-Time. Na Fase 4.5, as colunas do banco serão flexibilizadas. | 4.4 / 4.5 |
| **BLK-02** | Chaveamento restrito a 1, 2 ou 4 grupos | **HIGH** | `PairingEngine` genérico baseado em feeds configurados, suportando qualquer quantidade de grupos e participantes. | 4.4 |
| **BLK-03** | Cruzamentos eliminatórios fixos em código | **HIGH** | Configuração declarativa via `PairingConfig` (`high-low`, `same-position-cross`, `seeded-bracket`). | 4.4 |
| **BLK-04** | Avanço de equipes acoplado à tela `MatchesPage.tsx` | **HIGH** | Mover orquestração para um serviço central desacoplado de telas e acionado em qualquer homologação de súmula. | 4.4 |
| **BLK-05** | Propagação dependente de arrays imperativos | **MEDIUM** | Mapeamento explícito de `sourceSlotId` para `targetSlotId`. | 4.4 |
| **BLK-06** | Inexistência de Byes em mata-mata | **MEDIUM** | Tratamento nativo de `feed: { type: 'bye' }` com avanço automático imediato. | 4.4 |
| **BLK-07** | `saveDrawWithMatches` sem transação atômica | **MEDIUM** | Documentado como limitação arquitetural; criação de RPC transacional agendada para Fase 4.5. | 4.5 |
| **BLK-08** | Sobrecarga conceitual em `matches.group_name` | **LOW** | Separação em domínio de `stage`, `round`, `group` e rótulo de slot. | 4.5 |

---

## 5. Respostas Definitivas às 31 Perguntas Objetivas

1. **O que é Stage no BaseOS?**  
   É uma unidade autônoma de disputa com identidade estável (`stageId`), ordem sequencial, dependências no grafo (DAG), feeds declarativos de participantes, método de emparelhamento e regras esportivas próprias.
2. **Stage deve ser persistido?**  
   Sua definição estrutural reside no `CompetitionConfig` (SSOT). Seu estado de execução é derivado sob demanda na Fase 4.4 e opcionalmente persistido na Fase 4.5.
3. **Stage deve existir dentro de CompetitionConfig?**  
   Sim. O `CompetitionConfig` continua sendo a SSOT inegociável do sistema.
4. **O que é um Participant Feed?**  
   É uma declaração formal da origem esportiva dos competidores (`group-position`, `overall-ranking`, `match-winner`, `match-loser`, `seed`, `bye`).
5. **Como um participante futuro é representado?**  
   Como uma `ParticipantReference` com `resolvedTeamId = null` e um rótulo legível de exibição (ex: *"Vencedor Play-In 1"*).
6. **Como funciona Pairing?**  
   É uma função pura $f(\text{participantes}, \text{regras}) \to \text{MatchSlot}[]$ puramente matemática, sem acesso a banco ou UI.
7. **Como funciona Bracket?**  
   É a hierarquia `Stage -> Round -> MatchSlot` conectada por rotas de progressão.
8. **Como funciona Progression?**  
   É o roteamento automático de resultados oficiais homologados para slots de destino pré-declarados.
9. **Como representar winner/loser?**  
   Via feeds genéricos `{ type: 'match-winner', sourceStageId, targetSlotId }` e `{ type: 'match-loser', sourceStageId, targetSlotId }`.
10. **Como representar ranking position?**  
    Via feed `{ type: 'overall-ranking', stageId, position: N }` ou faixa contínua `rankRange: [start, end]`.
11. **Como representar group position?**  
    Via feed `{ type: 'group-position', stageId, groupName, position: N }`.
12. **Como representar bye?**  
    Via feed `{ type: 'bye' }`, concedendo avanço automático imediato ao adversário sem criar partida fantasma no banco.
13. **Como representar third-place?**  
    Como um `MatchSlot` cujos feeds de mandante e visitante são os perdedores (`match-loser`) das duas semifinais.
14. **Como gerar partidas sem conhecer participantes?**  
    No domínio gera-se o `MatchSlot`. No banco relacional, os registros de partida são gravados Just-in-Time à medida que os times são resolvidos (Fase 4.4) ou via colunas `NULL` (Fase 4.5).
15. **Como resolver participantes posteriormente?**  
    O `ProgressionEngine` é disparado na homologação de cada partida, atualizando os slots subsequentes de forma idempotente.
16. **Como impedir ciclos de progressão?**  
    Através do validador `validateStageGraph()`, que executa busca DFS no grafo de dependências e rejeita qualquer ciclo.
17. **Como detectar configuração inválida?**  
    Através de validação estática de divisibilidade de participantes, referências a estágios inexistentes e consistência de regras.
18. **Como preservar compatibilidade?**  
    Mantendo os contratos legados (`format.type`, `computeStandings`) funcionando e delegando aos novos motores quando `stages` estiver configurado.
19. **Quais tabelas precisam mudar?**  
    Nenhuma tabela na Fase 4.4. Na Fase 4.5, a tabela `matches` será adaptada.
20. **Quais campos precisam mudar?**  
    Na Fase 4.5, `team_a_id` e `team_b_id` em `matches` deverão admitir `NULL`.
21. **Quais serviços atuais devem ser preservados?**  
    `CanonicalMatchResult`, `ScoringEngine`, `TieBreakEngine`, `OverallStandingsEngine`, `StandingsService`, `CompetitionConfig`, `DrawService`, `CompetitionRulesService`.
22. **Quais serviços atuais serão substituídos?**  
    `playoffsService.ts` será substituído pelo `ProgressionEngine` e `BracketEngine`. `CompetitionBracketService` atuará como fachada compatível.
23. **Quais hardcodes precisam ser removidos?**  
    A restrição a 1, 2 ou 4 grupos; os cruzamentos fixos $1ºA \times 2ºB$; as strings literais `'quartas'/'semis'`; e os IDs falsos `TBD-A-1`.
24. **Como o formato `groups-play-in-knockout` será representado?**  
    Com estágios encadeados por DAG: Grupos $\to$ Ranking Geral $\to$ Play-in $\to$ Quartas $\to$ Semis $\to$ Final.
25. **Como o cenário de 6 equipes será representado?**  
    2 grupos de 3 $\to$ Top 2 direto para semis, 3º ao 6º no play-in $\to$ Semifinais $\to$ Final.
26. **A arquitetura suporta 3, 5, 6 e 8 grupos?**  
    Sim. O `OverallStandingsEngine` agrega qualquer quantidade de grupos e o `PairingEngine` monta os confrontos sem restrição de grupos.
27. **Suporta direct knockout?**  
    Sim. Basta configurar um estágio único com feed `direct-entry` e pairing `seeded-bracket`.
28. **Suporta bye?**  
    Sim, nativamente, sem partidas artificiais.
29. **Suporta third-place?**  
    Sim, via rota `match-loser` das semifinais.
30. **Suporta home-and-away futuramente?**  
    Sim. O contrato já inclui `seriesType: 'two-legged'`, bastando plugar a regra de placar agregado no `ScoringEngine`.
31. **Quais limitações permanecem?**  
    A gravação antecipada no PostgreSQL de partidas pendentes depende da migração de `NULL` na Fase 4.5.

---

## 6. Certificação Oficial da Revisão Arquitetural

> ### **FASE 4.4 — ARQUITETURA REVISADA E APROVADA PARA IMPLEMENTAÇÃO**
> Todas as inconsistências e bloqueadores foram sanados no design. A separação entre domínio e banco de dados está formalizada, os contratos de `MatchSlot`, `ParticipantReference`, `StageEngine`, `PairingEngine` e `ProgressionEngine` estão consolidados e o sistema está tecnicamente pronto para a implementação dos motores puros de domínio.
