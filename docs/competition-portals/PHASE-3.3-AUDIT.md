# BASEOS — FASE 3.3: AUDITORIA TÉCNICA READ-ONLY

**Data:** 05/09/2026  
**Sistema:** BaseOS  
**Fase:** 3.3 — Portal Público da Competição, QR Code e Experiência do Espectador  
**Status da Auditoria:** **CONCLUÍDA E REVISADA (READ-ONLY)**

---

## 1. Objetivo da Auditoria

Identificar de forma factual e comprovada no repositório como o **BaseOS** representa competições, equipes, inscrições, atletas, partidas, resultados, classificação, grupos, fases, lifecycle, slugs, URLs, rotas, autenticação, RLS, serviços e componentes reutilizáveis, antes de iniciar o projeto de arquitetura e implementação do Portal Público e do QR Code da Competição.

---

## 2. Rotas Existentes (`src/App.tsx`)

| Rota | Público | Autenticado | Função |
|---|---|---|---|
| `/` | Sim | Não | Vitrine geral de competições ativas (`ActiveCompetitionsPage`) |
| `/competicoes-ativas` | Sim | Não | Alias da vitrine de competições ativas |
| `/dashboard` | Sim | Não | Visão geral do sistema com métricas (`Index`) |
| `/jogos` | Sim | Não | Listagem global de partidas e resultados (`MatchesPage`) |
| `/classificacao` | Sim | Não | Classificação oficial por grupos e melhores terceiros (`StandingsPage`) |
| `/standings` | Sim | Não | Alias da classificação |
| `/sumulas` | Sim | Não | Consulta de súmulas digitais emitidas (`MatchSheetPage`) |
| `/sumulas/:matchId` | Sim | Não | Visualização de súmula de partida específica |
| `/equipe/inscricao/:token` | Sim (via token) | Não (acesso com token de equipe) | Portal privado de agremiação para autogestão de elenco |
| `/login` | Sim | Não | Autenticação por e-mail/senha ou seletor demo |
| `/ajuda` / `/help` | Sim | Não | Central de artigos de ajuda e FAQs |
| `/jogos/novo` | Não | Sim (`organizer`) | Agendamento e criação de partidas |
| `/competicoes` | Não | Sim (`organizer`) | Gestão de competições (planejamento, regras, lifecycle) |
| `/competicoes/:id/inscricoes` | Não | Sim (`organizer`) | Gestão administrativa de inscrições e convites |
| `/equipes` | Não | Sim (`organizer`) | Cadastro mestre de equipes |
| `/modalidades` | Não | Sim (`organizer`) | Gestão de modalidades (Quadra/Praia) |
| `/pessoas` | Não | Sim (`organizer`) | Cadastro central de pessoas |
| `/locais` / `/venues` | Não | Sim (`organizer`) | Gestão de ginásios e quadras esportivas |
| `/atletas` / `/athletes` | Não | Sim (`organizer`) | Gestão de atletas |
| `/arbitros` / `/arbitragem` | Não | Sim (`organizer`) | Gestão de quadro de arbitragem |
| `/estatisticas` | Não | Sim (`organizer`) | Métricas e estatísticas consolidadas |
| `/relatorios` / `/reports` | Não | Sim (`organizer`) | Emissão de boletins e relatórios oficiais |
| `/sorteio` / `/sorteio/:competitionId` | Não | Sim (`organizer`) | Sorteio oficial de chaves e arena 3D |
| `/configuracoes` / `/settings` | Não | Sim (`organizer`) | Configurações do sistema |
| `/documentos/editor` / `/:matchId` | Não | Sim (`organizer`) | Editor e homologação de documentos esportivos |
| `*` | Sim | Não | Página 404 (`NotFound`) |

### Constatações de Roteamento:
1. **Não existe rota pública dedicada por competição:** Atualmente há `/competicoes-ativas` (catálogo geral) e `/jogos?competitionId=...`, mas não há uma página dedicada focada no espectador para uma competição específica.
2. **Rota `/c/:slug`:** Está completamente livre. Não colide com nenhuma rota existente e oferece formato semântico limpo, ideal para QR Code impresso e compartilhamento mobile.
3. **Rejeição de ID interno na URL:** A URL pública deve ser estritamente `/c/:slug`. O ID interno da competição (ex: `comp-1`, `comp-d88c...`) não deve ser exposto nem aceito como rota pública oficial.

---

## 3. Entidades Existentes e Fontes de Verdade

| Entidade | Tabela PostgreSQL | Fonte de Verdade no Código |
|---|---|---|
| **Competição** | `public.competitions` | `dataAccess` (`getCompetition`, `listCompetitions`), `CompetitionConfig` (JSONB `config` e `rules_snapshot`) |
| **Equipe Mestre** | `public.teams` | `dataAccess` (`getTeam`, `listTeams`) |
| **Inscrição de Equipe** | `public.competition_teams` | `dataAccess` (`listCompetitionTeams(competitionId)`), vincula equipe à competição |
| **Atleta do Elenco** | `public.competition_athletes` | `dataAccess` (`listCompetitionAthletes(competitionTeamId)`) |
| **Partida Esportiva** | `public.matches` | `dataAccess` (`listMatches(competitionId)`) |
| **Sorteio / Chaves** | `public.draws` | `dataAccess` (`getDrawByCompetition(competitionId)`) |
| **Locais / Quadras** | `public.venues` | `dataAccess` (`listVenues()`) |
| **Resultado Canônico** | *Derivado em runtime* | `CompetitionRulesService.getCanonicalMatchResult(competition, match)` |
| **Classificação Oficial** | *Derivado em runtime* | `standingsService.computeStandingsByGroup` e `computeStandings` |

---

## 4. Dados Públicos Disponíveis

| Informação | Fonte Atual | Pode ser Pública? | Observação |
|---|---|---|---|
| Nome do torneio | `competitions.name` | **Sim** | Identificador principal da competição |
| Slug da competição | `competitions.slug` | **Sim** | Identificador semântico público na URL `/c/:slug` |
| Modalidade e Gênero | `competitions.modality`, `genderCategory` | **Sim** | Quadra / Praia; Masculino, Feminino, Misto |
| Status do Lifecycle | `competitions.status` | **Sim** | Informa em que fase o torneio se encontra |
| Formato de disputa | `competitions.config.format` | **Sim** | Sets para vitória, pontos por set |
| Datas e Local principal | `competitions.startDate`, `endDate`, `venue` | **Sim** | Calendário do evento |
| Equipes participantes | `competition_teams` + `teams` | **Sim** | Nome, nome curto e escudo (sem dados privados) |
| Chaves e Grupos | `draws.groups` | **Sim** | Composição oficial após sorteio |
| Tabela de jogos | `matches` | **Sim** | Rodada, número, data, hora, local, quadra, fase e grupo |
| Placares e parciais | `matches.sets`, `matches.status` | **Sim** | Pontuação conforme persistência atual |
| Vencedor da partida | `getCanonicalMatchResult` | **Sim** | Resultado homologado |
| Tabela de classificação | `computeStandingsByGroup` | **Sim** | Pontos, jogos, vitórias, derrotas, saldo, sets/pontos average |
| Atletas individuais | `competition_athletes` | **NÃO no MVP** | Preserva privacidade; prioridade esportiva é da equipe |

---

## 5. Dados Sensíveis e Restrições de Privacidade (LGPD)

A auditoria identificou os seguintes dados que **NUNCA** devem ser expostos no Portal Público:

1. **`competition_teams.access_token`:**
   - *Severidade:* **CRÍTICA**.
   - *Risco:* Se vazado, qualquer visitante pode acessar o portal privado da agremiação, alterar elenco ou travar inscrições.
2. **`competition_teams.registration_deadline`:**
   - *Severidade:* Baixa/Média (dado administrativo de gestão de prazos internos).
3. **`competition_athletes.document_number` (CPF/RG):**
   - *Severidade:* **CRÍTICA**.
   - *Risco:* Violação de privacidade e LGPD.
4. **`competition_athletes.birth_date`:**
   - *Severidade:* **ALTA**.
   - *Risco:* Dado pessoal sensível, com especial proteção para menores de idade.
5. **`profiles` (E-mails, nomes completos de operadores, roles, vínculos):**
   - *Severidade:* **ALTA**.
   - *Risco:* Mapeamento de contas de administradores e gestores.
6. **`audit_logs`:**
   - *Severidade:* **ALTA**.
   - *Risco:* Histórico de IPs, operadores e logs de mutações de sistema.

---

## 6. Classificação e Resultados Canônicos

- **Classificação:**
  - Fonte única oficial: [`src/services/standingsService.ts`](file:///home/diego-martins/docker/volei/src/services/standingsService.ts).
  - Funções a reutilizar: `computeStandingsByGroup` e `computeStandings`.
  - Critérios suportados: Pontos na tabela, vitórias, saldo de sets, saldo de pontos, confronto direto, set average, pontos average, sorteio determinístico.
  - **Diretriz:** Proibido criar qualquer motor de cálculo paralelo (`publicStandingsService`).
- **Resultados:**
  - Fonte única oficial: [`src/services/competitionRulesService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionRulesService.ts) através do método `getCanonicalMatchResult(competition, match)`.
  - Fornece vencedor oficial, perdedor, parciais validadas, status de WO e validação de consistência.

---

## 7. Lifecycle no Portal Público

Comportamento do Portal Público orientado pelos estados reais da competição:

| Estado Real (`status`) | O que o visitante vê | Tratamento UX |
|---|---|---|
| `planning` / `draft` | Informações gerais, regulamento básico, datas previstas | Mensagem: "Competição em fase de planejamento" |
| `registration-open` | Informações, equipes inscritas até o momento | Mensagem: "Inscrições abertas para as agremiações" |
| `registration-closed` | Rol definitivo de equipes confirmadas | Mensagem: "Inscrições encerradas. Aguardando sorteio de chaves" |
| `draw-pending` | Equipes confirmadas, regulamento | Mensagem: "Sorteio oficial de grupos em preparação" |
| `groups-defined` | Chaves/grupos oficiais, tabela de jogos, classificação zerada | Apresenta abas: Grupos, Jogos, Classificação |
| `in-progress` | Próximos jogos, resultados recentes, classificação atualizada | Experiência ativa de acompanhamento |
| `playoffs` | Chaveamento eliminatório, confrontos de mata-mata, classificação | Destaque para confrontos decisivos |
| `completed` | Pódio final (Campeão, Vice, 3º lugar), classificação consolidada | Selo de "Competição Finalizada" |
| `cancelled` | Comunicado de cancelamento e justificativa | Banner informativo de cancelamento |

---

## 8. Segurança, RLS e Views Públicas

### Diagnóstico do PostgreSQL Atual:
- Em `20260818000000_initial_schema.sql`, foi definido:
  ```sql
  create policy "competition_teams_public_read" on public.competition_teams for select using (true);
  ```
- **Vulnerabilidade comprovada:** Um cliente anônimo que execute `supabase.from('competition_teams').select('*')` receberia o `access_token`.
- **Solução Arquitetural:**
  1. Criação de **View Pública** no PostgreSQL (`public.public_competitions` e `public.public_competition_teams`) que projeta exclusivamente as colunas públicas, omitindo fisicamente `access_token`, `registration_deadline`, etc.
  2. Ajuste de RLS em `competition_teams`: apenas organizadores ou o portador autenticado do time podem ler a tabela base com `access_token`. O público consome a view ou DTOs estritos.

---

## 9. Auditoria Detalhada de Geração e Estabilidade de Slug

1. **Tratamento de acentos:** Decomposição Unicode NFD removendo marcas diacríticas (`.normalize("NFD").replace(/[\u0300-\u036f]/g, "")`).
2. **Espaços e caracteres especiais:** Convertidos em hífens (`-`), minúsculas (`.toLowerCase()`), removendo caracteres fora de `[a-z0-9-]` e colapsando hífens repetidos (`--` $\rightarrow$ `-`).
3. **Nomes vazios:** Se o nome for vazio ou contiver apenas símbolos/emojis, adotar o fallback determinístico `competicao`.
4. **Nomes duplicados / Colisões:** Se o slug `copa-cidade-2026` já existir para outra competição, aplicar sufixo numérico semântico (`copa-cidade-2026-2`, `copa-cidade-2026-3`), sem usar hashes ou IDs truncados.
5. **Preservação e Imutabilidade:** O slug gerado é gravado na criação da competição e **nunca é recalculado automaticamente** se o nome da competição for alterado posteriormente pelo organizador. Isso garante que links compartilhados e QR Codes impressos continuem funcionando ininterruptamente.
6. **Migração de Registros Legados:** A migration `20260905000005_competition_slug.sql` gerará slugs limpos e únicos para todas as competições existentes no banco.

---

## 10. Auditoria de Realtime

- **Resultado da busca:** 0 ocorrências de Supabase Realtime, canais ou websockets no frontend do BaseOS.
- **Diretriz Técnica:** Não criar websockets nem polling agressivo.
- **Linguagem Oficial:** "Dados oficiais atualizados conforme a persistência atual do BaseOS", com botão de atualização sob demanda na interface.

---

## 11. Auditoria de Visibilidade Pública

- **Resultado da busca:** Não existe `isPublic` ou `visibility` nas tabelas do sistema.
- **Diretriz Técnica:** Não inventar coluna de visibilidade desnecessária. Qualquer competição cadastrada e dotada de slug é acessível por sua URL `/c/:slug`. Se cancelada, exibe o banner oficial de cancelamento.

---

## 12. Dependências de QR Code

- Nenhuma dependência de QR Code está atualmente instalada em `package.json`.
- A geração client-side será feita com gerador vetorial SVG leve, sem chamadas a APIs externas, garantindo total privacidade e funcionamento offline.
