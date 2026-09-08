# BaseOS — Auditoria do Sorteio de Grupos e Chaveamento (Fase 4.PRE)

**Arquivo Auditado:** `src/services/drawService.ts`, `src/pages/DrawPage.tsx`, `src/services/dataAccess.ts`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. Algoritmo de Sorteio e Determinismo

O motor `drawService.ts` implementa geração de sorteios auditável e reproduzível:

- **PRNG Determinístico (mulberry32):**
  - Garante que a mesma semente (`seed: number`) com a mesma lista de equipes produza exatamente a mesma distribuição de grupos e ordem de confrontos.
  - Elimina variações arbitrárias de `Math.random()` durante reavaliações e auditorias esportivas.
- **Distribuição Balanceada por Capacidade (`buildBalancedCapacities`):**
  - Divide o total de equipes $N$ pelo número de grupos $G$. Se houver resto $R$, distribui 1 vaga extra sequencialmente aos primeiros $R$ grupos.
  - Preenchimento guloso garante que nenhum grupo fique com disparidade de mais de 1 participante em relação aos demais.

---

## 2. Cabeças de Chave (Head Seeds) vs. Sorteio Aleatório

- **Modo Seeded (`seedingMode = 'seeded'`):**
  - As equipes marcadas em `headSeeds` são isoladas prioritariamente e alocadas exatamente uma em cada grupo (Grupo A, Grupo B, etc.) na ordem de prioridade definida.
  - As vagas remanescentes de cada grupo são preenchidas com as equipes sorteadas pelo PRNG mulberry32.
- **Modo Random (`seedingMode = 'random'`):**
  - Todas as equipes participam do sorteio geral sem privilégio posicional.

---

## 3. Geração de Partidas (Tabela de Berger / Método do Círculo)

- O algoritmo `generateGroupRoundRobin` implementa o método canônico do círculo:
  - Todas as equipes de um grupo jogam entre si em turno único.
  - Em grupos com número ímpar de participantes, insere o participante neutro `__BYE__`, gerando folgas automáticas sem criar partidas fictícias no banco de dados.

---

## 4. Concorrência e Proteção contra Double-Click

Em `DrawPage.tsx`:
- Estado de operação unificado: `operationState: 'idle' | 'running' | 'saving'`.
- Ao acionar o botão de salvar:
  - Se `operationState !== 'idle'`, a execução é sumariamente ignorada.
  - O estado muda para `'saving'`, desabilitando os botões de ação na interface.
  - O bloco `try ... finally` garante restauração de `operationState = 'idle'`.

---

## 5. Persistência Atômica e Avanço de Ciclo de Vida

- **Transação:** `dataAccess.saveDrawWithMatches` apaga partidas pré-existentes da fase de grupos e insere as novas partidas e a configuração do sorteio atomicamente.
- **Guarda de Integridade:** Valida confirmação de que ao menos 1 partida foi persistida antes de disparar `advanceToGroupsDefinedAfterDraw`.
- **Auditoria Operacional:** Dispara `OperationalAuditService.recordDrawExecution` registrando operador, data, modo e contagem de jogos.
