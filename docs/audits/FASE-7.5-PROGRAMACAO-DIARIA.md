# BASEOS — FASE 7.5 — AUDITORIA TÉCNICA E DIAGNÓSTICO
## PROGRAMAÇÃO DIÁRIA / ORDEM DOS JOGOS

**Data:** 12 de Setembro de 2026  
**Sistema:** BaseOS — Sports Intelligence  
**Ambiente:** DEV Local exclusivamente  
**Produção (VOLTZ):** `https://voltz.baseos.online` — **TOTALMENTE CONGELADA / INTOCADA**  
**Escopo:** Somente o Relatório "Programação Diária / Ordem dos Jogos"

---

## 1. OBJETIVO DA AUDITORIA

Diagnosticar e mapear os contratos de dados, regras de negócio de ordenação e estruturas de visualização para a implementação do relatório operacional prioritário:

> **PROGRAMAÇÃO DIÁRIA / ORDEM DOS JOGOS** (`/relatorios?competitionId=:id&report=programacao`)

Este relatório atende às necessidades operacionais imediatas da coordenação de competição, coordenação de quadra, mesa de apontamento, árbitros, equipes e público, respondendo deterministicamente à pergunta:

> *"Onde, quando e quais equipes jogam?"*

---

## 2. MAPEAMENTO DOS CONTRATOS REAIS

A inspeção detalhada do código ativo do BaseOS revelou:

### 2.1 Entidade `MatchRecord` (`src/types/entities.ts`)
* `id: string` — Identificador universal da partida.
* `competitionId: string` — Vínculo de competição (SSOT).
* `matchNumber: number` — Número sequencial e oficial do confronto.
* `scheduledTime: string` — Timestamp ISO 8601 (ex: `2026-09-12T09:00:00Z`).
* `venue: string` — Ginásio / Local de jogo (string livre, ex: `'Ginásio Costa Cavalcanti'`).
* `court?: string` — Quadra / Espaço de jogo (ex: `'Quadra 1'`).
* `phase?: string` — Fase esportiva (`'classificatória'`, `'quartas'`, `'semifinal'`, `'final'`).
* `groupName?: string` — Nome do grupo/chave (ex: `'Grupo A'`).
* `round?: number` — Rodada da fase.
* `teamAId: string` e `teamBId: string` — Chaves estrangeiras para `TeamRecord`.
* `teamAName: string` e `teamBName: string` — Nomes textuais denormalizados.
* `teamAShortName?: string` e `teamBShortName?: string` — Siglas das equipes.
* `status: MatchRecord['status']` — Estado canônico (`'scheduled'`, `'in-progress'`, `'completed'`, `'homologated'`, `'cancelled'`).
* `sets: MatchSetRecord[]` — Parciais disputadas.

### 2.2 Entidades de Locais e Equipes
* `VenueRecord` possui `id`, `name`, `courts: string[]`, `address`, `city`. Porém, em `MatchRecord`, o campo `venue` é gravado diretamente como o nome do local ou texto livre, e `court` como texto livre.
* Portanto, **não há necessidade de lookup síncrono adicional N+1 para venues**, uma vez que `m.venue` e `m.court` residem diretamente na entidade da partida.
* Para equipes (`TeamRecord`), a resolução é feita em memória através de `teams.find(t => t.id === m.teamAId)`, garantindo acesso a logos oficiais (`logoUrl`) e siglas refinadas (`shortName`).

---

## 3. REGRAS DE ORDENAÇÃO OFICIAL OPERACIONAL

Para garantir que a ordem de leitura corresponda ao fluxo real dos jogos na quadra, a ordenação oficial e determinística estabelecida segue 5 critérios em cascata:

1. **Data e Horário cronológico (`scheduledTime`):** `new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()`. Partidas sem horário vão para o final (`time: 0`).
2. **Ginásio / Local (`venue`):** Ordem alfabética lexicográfica `(a.venue || '').localeCompare(b.venue || '')`.
3. **Quadra (`court`):** Ordem alfabética lexicográfica `(a.court || '').localeCompare(b.court || '')`.
4. **Número oficial do jogo (`matchNumber`):** `a.matchNumber - b.matchNumber`.

Esta regra é determinística e compartilhada rigorosamente entre HTML, PDF e CSV.

---

## 4. CONFLITOS DE HORÁRIO E DETECÇÃO PREDITIVA

A Fase 7.1 identificou a ausência de conflict detection no formulário de criação de partidas. Na Programação Diária:
* O relatório **não deve tentar alterar, mascarar ou resolver magicamente** dados conflitantes.
* Uma detecção determinística em memória é executada:
  * Agrupamento por `scheduledTime + venue + court` (em partidas não canceladas).
  * Se `count > 1`, a partida recebe a sinalização `hasConflict: true` e a mensagem `'Possível sobreposição de horário na mesma quadra/local'`.
  * Um aviso operacional amarelo discreto é exibido no topo da tela informando a quantidade de partidas sobrepostas, e um badge inline é exibido nas linhas afetadas.
* Isso garante transparência operacional sem violar contratos nem criar regras artificiais.

---

## 5. EXPERIÊNCIA DE USUÁRIO E FILTROS OPERACIONAIS

* **Filtro Diário:** Como o relatório tem forte vocação diária, é implementado um seletor em abas/pills de datas (`Todas as Datas`, `DD/MM/AAAA (N)`), atualizando sincronizadamente o parâmetro `date` na URL (`searchParams`).
* **Filtro de Status:** Toolbar operacional rápida (`Todos`, `Agendados`, `Ao Vivo`, `Concluídos`).
* **Métricas do Resumo:**
  * Total Programado / Jogos do Dia;
  * Locais Utilizados (contagem de locais distintos);
  * Quadras em Atividade (contagem de quadras distintas);
  * Jogos Concluídos (com parciais ao vivo).
* **Layout Adaptativo Responsivo:**
  * **Desktop / Tablet (>= 768px):** Tabela monoestilizada de alta densidade informativa com linhas zebra e cabeçalhos claros.
  * **Mobile (< 768px):** Cards operacionais verticais dedicados com destaque do horário, quadra/local, confronto com logos/siglas e badge de status.

---

## 6. MOTOR DE EXPORTAÇÃO PDF & CSV

* **PDF:** Formato A4 Retrato via `jsPDF`, utilizando 6 colunas proporcionais cobrindo a largura útil de 186mm (Margens de 12mm). Cabeçalho e rodapé institucionais BaseOS (`SPORTS INTELLIGENCE`).
* **CSV:** Geração sob demanda com colunas operacionais padronizadas (`Jogo`, `Data`, `Horário`, `Local`, `Quadra`, `Equipe A`, `Equipe B`, `Fase`, `Grupo`, `Rodada`, `Status`, `Conflito`), respeitando a data selecionada ou exportando a programação completa.

---

## 7. DECLARAÇÃO DE ISOLAMENTO DE PRODUÇÃO

> **A PRODUÇÃO VOLTZ (`https://voltz.baseos.online`) PERMANECEU 100% CONGELADA, SEM QUALQUER ACESSO, CONSULTA OU MODIFICAÇÃO.**
