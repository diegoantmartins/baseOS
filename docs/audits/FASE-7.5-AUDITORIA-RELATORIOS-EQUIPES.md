# BASEOS — FASE 7.5: AUDITORIA COMPLETA DE RELATÓRIOS, IDENTIDADE BASEOS E GESTÃO EQUIPE → ATLETAS

**Data da Auditoria:** 12 de Setembro de 2026  
**Modo de Execução:** AUDIT-ONLY (Auditoria Estrita — Zero Alterações em Código de Produção)  
**Ambiente Auditado:** DEV Local (`supabase-db` PostgreSQL 15, Vite React 18, TypeScript)  
**Ambiente de Produção (VOLTZ):** **TOTALMENTE CONGELADO / NÃO ACESSADO / NÃO MODIFICADO**  
**Status da Auditoria:** **GO** (Diagnóstico completo e conclusivo para autorização da fase de implementação)

---

## 1. RESUMO EXECUTIVO

A presente auditoria técnica profunda investigou detalhadamente duas áreas centrais da experiência operacional do BaseOS:
1. **Relatórios e Identidade Institucional:** A consolidação dos motores de geração de PDF, mapeamento de relatórios em operação vs. ausentes, rastreamento global de ocorrências residuais da nomenclatura legada "VolleyPro" e padronização da identidade visual Dark Tech / Esportiva Profissional do BaseOS.
2. **Gestão de Equipes → Atletas:** O fluxo de visualização e navegação de agremiações no menu `/equipes`, o modelo de dados subjacente (`teams`, `competition_teams`, `competition_athletes`, `persons`), a barreira atual que impede a visualização dos atletas inscritos ao abrir os detalhes de uma equipe e o roteiro de arquitetura para resolver essa lacuna sem retrabalho ou duplicação de dados.

### Principais Conclusões:
- **Relatórios:** A aplicação possui atualmente **8 mecanismos/documentos** distribuídos em **3 bibliotecas concorrentes** (`@react-pdf/renderer`, `jsPDF`, `pdf-lib`). O motor moderno e canônico para súmulas é o `@react-pdf/renderer` (`src/document-engine/baseos/`), enquanto os relatórios administrativos da Central de Relatórios (`src/lib/pdf/reportsPdf.ts`) utilizam `jsPDF` procedural e apresentam a string estática `"VOLLEYPRO"` hardcoded no topo de todas as páginas geradas.
- **Branding "VolleyPro":** Foram mapeadas **36 ocorrências ativas** em código de frontend/relatórios (`src/` e `public/`), divididas entre títulos de relatórios, cards sociais, mensagens de compartilhamento no WhatsApp, fallbacks de organização e metadados PWA.
- **Dois Relatórios Prioritários Identificados:**
  1. *Escala Oficial de Arbitragem e Oficiais de Mesa* (indispensável para designação e controle de árbitros em quadra).
  2. *Programação Diária / Ordem dos Jogos por Quadra* (agenda operacional logística afixada em ginásios e usada pela coordenação de quadra).
- **Equipes → Atletas:** No menu `/equipes`, o modal atual (`TeamDetailsDialog`) exibe apenas um contador numérico (ex: `"12 atletas no elenco"`), **sem listar nenhum atleta**. No entanto, a consulta `dataAccess.listCompetitionAthletes()` **já carrega todos os atletas com camisas, posições, capitão, líbero e documentos no estado em memória**. A solução exige apenas a expansão da visualização do elenco dentro do detalhamento da equipe, sem necessidade de novas tabelas ou migrações.

---

## 2. ESTADO DO REPOSITÓRIO

- **Branch Ativa:** `main`
- **Commit Base:** `0509406` (*fix(dataAccess): gerar id canonico em createCompetitionTeam, createCompetitionAthlete e createPerson no supabaseAdapter*)
- **Estado do Worktree:** Preservadas rigorosamente as correções contratuais consolidadas na Fase 7.4 (`src/services/dataAccess.ts`, `src/services/registrationService.ts`, `src/test/dataAccessAdapter.test.ts`, `supabase/migrations/20260912000001_match_lifecycle_enum_sync.sql`).
- **Verificação de Compilação:** `npx tsc -p tsconfig.app.json --noEmit` executado com **0 erros**.
- **Linter:** `npm run lint` executado com **0 erros** (1 warning pré-existente de dependência useMemo em `DrawArenaCanvas.tsx`).
- **Build de Produção:** `npm run build` executado com **exit code 0** (bundle gerado com sucesso em 3m 11s).
- **Ambiente de Produção VOLTZ:** Nenhuma conexão estabelecida, nenhum container tocado, zero deploy.

---

## 3. INVENTÁRIO COMPLETO DE RELATÓRIOS

O ecossistema BaseOS possui hoje 8 documentos ou relatórios estruturados:

| # | Nome Funcional | Rota / Ponto de Acesso | Componente UI | Motor / Arquivo | Biblioteca | Formato | Orientação | Identidade Atual |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: | :-: | :--- |
| **R1** | **Boletim Geral de Jogos e Confrontos** | `/relatorios?report=boletim` | `MatchesBoletimView.tsx` | `src/lib/pdf/reportsPdf.ts` | `jsPDF` | HTML / PDF / CSV | Retrato (A4) | 🔴 Header "VOLLEYPRO" hardcoded |
| **R2** | **Classificação Oficial e Grupos** | `/relatorios?report=standings` | `StandingsReportView.tsx` | `src/lib/pdf/reportsPdf.ts` | `jsPDF` | HTML / PDF | Retrato (A4) | 🔴 Header "VOLLEYPRO" hardcoded |
| **R3** | **Relação Nominal das Equipes (Elencos)** | `/relatorios?report=roster` e `/atletas` | `TeamRostersReportView.tsx` | `src/lib/pdf/reportsPdf.ts` | `jsPDF` | HTML / PDF | Retrato (A4, 1 pág/time) | 🔴 Header "VOLLEYPRO" hardcoded |
| **R4** | **Quadro de Honra e Pódio Final** | `/relatorios?report=podium` | `PodiumReportView.tsx` | `src/lib/pdf/reportsPdf.ts` | `jsPDF` | HTML / PDF | Retrato (A4) | 🔴 Header "VOLLEYPRO" hardcoded |
| **R5** | **Súmula Oficial de Partida (3/5 sets)** | `/sumulas/:matchId`, `/jogos`, `/competicoes/:id/inscricoes` | `MatchSheetEmitDialog.tsx` | `src/document-engine/baseos/` | `@react-pdf/renderer` | PDF | Paisagem (A4) | 🟢 BaseOS Oficial (vetorial P&B) |
| **R6** | **Súmula Oficial em Branco** | `/sumulas`, `/relatorios` | `BlankSheetEmitDialog.tsx` | `src/document-engine/baseos/` | `@react-pdf/renderer` | PDF | Paisagem (A4) | 🟢 BaseOS Oficial (vetorial P&B) |
| **R7** | **Ficha de Posição / Ordem de Saque** | `BlankSheetEmitDialog.tsx`, `MatchSheetEmitDialog.tsx` | `BaseosServeOrderDocument.tsx` | `src/document-engine/baseos/` | `@react-pdf/renderer` | PDF | Retrato (A4, cartões) | 🟢 BaseOS Oficial |
| **R8** | **Documento Editável / Template Custom** | `/documentos/editor/:matchId` | `DocumentEditorPage.tsx` | `src/document-engine/generators/` | `pdf-lib` | PDF sobreposto | Paisagem (A4) | 🟡 Fallback `orgName = 'VolleyPro'` |

---

## 4. INVENTÁRIO DE ENGINES PDF

O projeto possui **3 bibliotecas ativas** e **4 caminhos de implementação** de PDF:

| Engine | Tecnologia | Finalidade Primária | Documentos Gerados | Estado / Uso em Produção | Avaliação Técnica & Duplicidade | Recomendação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Engine A: BaseOS Scoresheet Engine** | `@react-pdf/renderer` v4.8.1 | Emissão canônica de súmulas oficiais homologadas FIVB/CBV e fichas de saque | Súmulas 3 Sets, 5 Sets, Lote Batch, Fichas de Ordem de Saque | **Ativo e Oficial (SSOT)** na UI de jogos e súmulas | Componentes declarativos React, tipografia matemática, P&B econômico, zero dependência de browser canvas. | **MANTER COMO PADRÃO CANÔNICO DO BASEOS** |
| **Engine B: Reports Engine** | `jsPDF` v4.0.0 | Central de relatórios operacionais em PDF (Fase 4 HTML-first) | Boletim de Jogos, Classificação, Relação Nominal, Pódio | **Ativo na UI** (`/relatorios`) | Procedural manual (`doc.rect`, `doc.text`). Contém `VOLLEYPRO` hardcoded e paleta Navy Blue fixa. | **CORRIGIR BRANDING IMEDIATO (P1) E PLANEJAR MIGRAÇÃO FUTURA** |
| **Engine C: Template Overlayer** | `pdf-lib` v1.17.1 | Desenho de coordenadas manuais sobre PDFs estáticos pré-renderizados | Súmulas 3/5 sets e ordem de saque com override de coordenadas | **Ativo apenas em `/documentos/editor`** | Duplica a responsabilidade do Engine A. Depende de PDFs binários estáticos em `src/document-engine/templates/`. | **MANTER RESTRITO AO EDITOR DE TEMPLATES COMO FERRAMENTA ADMIN** |
| **Engine D: Legado Linear / Referência** | `jsPDF` v4.0.0 | Geradores legados descontinuados (`matchSheetPdf.ts`, `officialMatchSheetPdf.ts`) | Súmulas legadas sem rotação ou em jsPDF puro | **Marcados como `@deprecated`** | Não são mais chamados pela interface principal do usuário (substituídos pelo Engine A). | **PRESERVAR APENAS PARA COMPATIBILIDADE DE TESTES HISTÓRICOS** |

---

## 5. OCORRÊNCIAS DE "VOLLEYPRO" NO CÓDIGO

Uma busca global refinada em `src/` e `public/` localizou as seguintes ocorrências:

### Categoria A — Deve ser Removida Imediatamente (Visível ao Usuário Final)
1. `src/lib/pdf/reportsPdf.ts:164`: `doc.text('VOLLEYPRO', MARGIN + 4, MARGIN + (isSubsequentPage ? 5.5 : 7));`  
   *Impacto:* Imprime `"VOLLEYPRO"` em caixa alta no topo de cada página de Boletim, Classificação, Relação Nominal e Pódio gerados em PDF.
2. `src/lib/pdf/officialMatchSheetPdf.ts:989 e 1009`: `tx(d, 'VolleyPro · Fichas de Posição / Ordem de Saque ...')`  
   *Impacto:* Rodapé das fichas de ordem de saque geradas pelo motor jsPDF de referência.
3. `src/lib/pdf/matchSheetPdf.ts:688`: `doc.text('VolleyPro - Sistema de Gestão de Competições', ...)`  
   *Impacto:* Rodapé da súmula legada linear.
4. `src/components/match/MatchSocialCard.tsx:263`: `<span>VolleyPro</span>`  
   *Impacto:* Marca d'água no rodapé do card gerado para redes sociais (Instagram/WhatsApp).
5. `src/components/registration/TeamCreatedShareDialog.tsx:21`: `return '🏐 *VOLLEYPRO — ACESSO DA EQUIPE* 🏐...'`  
   *Impacto:* Mensagem formatada enviada ao gestor da equipe via WhatsApp ao cadastrar time.
6. `src/components/pwa/PwaInstallButton.tsx:38, 50, 60, 74`: Toasts `"VolleyPro instalado com sucesso!"`, `"Instalar VolleyPro..."`.  
   *Impacto:* Notificações de instalação do PWA no navegador.
7. `public/manifest.webmanifest:2, 3`: `"name": "VolleyPro — Gestão de Competições de Voleibol"`, `"short_name": "VolleyPro"`.  
   *Impacto:* Nome do aplicativo exibido no launcher do celular / PWA instalado.

### Categoria B — Histórico / Documentação (Preservar)
- Ocorrências em `docs/`, `backups/`, comentários de changelog e referências de migrações anteriores: representam o histórico de evolução do software e não impactam o runtime.

### Categoria C — Código Ativo / Fallbacks (Requer Correção Segura)
1. `src/document-engine/generators/sumula3.generator.ts:86`: `orgName = 'VolleyPro'` (fallback de parâmetro).
2. `src/document-engine/generators/sumula5.generator.ts:73`: `orgName = 'VolleyPro'` (fallback de parâmetro).
3. `src/lib/pdf/matchSheetDataBuilder.ts:143`: `orgName: 'VolleyPro'`.
4. `src/services/dataAccess.ts:191`: `orgName: 'VolleyPro'` no objeto de configuração padrão (`DEFAULT_SETTINGS`).
5. `src/pages/SettingsPage.tsx:356`: `orgName: orgName.trim() || 'VolleyPro'`.
6. `src/components/match/LiveScoreboardModal.tsx:40`: `{competition?.name || 'VolleyPro'}`.
7. `src/pages/StandingsPage.tsx:200`: Título compartilhado `'VolleyPro / BaseOS'`.

### Categoria D — Risco Técnico / Storage (Tratar com Cuidado)
1. `public/sw.js:3`: `const CACHE_NAME = 'volleypro-v1';`  
   *Risco:* Renomear sem estratégia pode causar cache órfão em clientes PWA ativos.
2. `src/services/notificationService.ts:16`: `const STORAGE_KEY = 'volleypro_notifications_history';`  
   *Risco:* Chave interna de localStorage. Renomear diretamente zera o histórico de notificações locais dos usuários demo.

---

## 6. AUDITORIA DA IDENTIDADE BASEOS

### 6.1 Recursos Gráficos Existentes
- **Diretório `public/`:**
  - `public/logo-dark.png` (Logo institucional horizontal para tema escuro)
  - `public/logo-light.png` (Logo institucional horizontal para tema claro)
  - `public/logo-icon-dark.png` e `public/logo-icon-light.png` (Ícone isolado)
  - `public/baseos-logo.png` e `public/baseos-icon.png` (Versões de apoio)
  - `public/favicon.svg`, `public/pwa-192x192.svg`, `public/pwa-512x512.svg`
- **Componente Oficial:** `src/components/common/BaseOsLogo.tsx`  
  - Suporta variantes `'system'` (Dark Zinc) e `'document'` (Light).
  - Controla dinamicamente tamanhos (`sm`, `md`, `lg`, `xl`) e exibição de ícone ou logotipo completo.

### 6.2 Identidade no Motor de Súmulas (`@react-pdf/renderer`)
- Em `src/document-engine/baseos/components/BaseosHeader.tsx`:
  - Utiliza um **símbolo vetorial nativo** em SVG/View (`logoBars` com 3 barras horizontais, sendo a central em Âmbar `#F59E0B` e as laterais em Slate `#CBD5E1`).
  - Imprime a tipografia canônica: `BASEOS` em bold 9.2pt acompanhado de `SPORTS INTELLIGENCE`.
  - **Vantagem crítica:** Não depende de carregamento assíncrono de imagens, `data:image` em base64 ou chamadas de rede. É 100% à prova de falhas na geração do PDF.

### 6.3 Fragilidade na Central de Relatórios (`reportsPdf.ts`)
- O motor `reportsPdf.ts` **não utiliza a logo oficial do BaseOS nem o símbolo vetorial**.
- A função `safeDrawImage` aceita apenas `data:image/png` e `data:image/jpeg` em base64 puro. Se receber URL comum (`/logo-dark.png` ou link HTTPS de storage) ou SVG, cai silenciosamente em um monograma quadrado genérico (`NAVY_LIGHT`).

---

## 7. PROBLEMAS DE BRANDING

| ID | Localização | Problema de Branding | Efeito no Usuário | Severidade |
| :-: | :--- | :--- | :--- | :-: |
| **BR-01** | `src/lib/pdf/reportsPdf.ts:164` | Header estático com texto `'VOLLEYPRO'` | Todos os PDFs administrativos exportados pelo organizador saem com a marca antiga no cabeçalho | **P1** |
| **BR-02** | `src/components/registration/TeamCreatedShareDialog.tsx:21` | Mensagem WhatsApp com `'VOLLEYPRO — ACESSO DA EQUIPE'` | Gestores de times convidados recebem mensagem com a marca legada | **P1** |
| **BR-03** | `public/manifest.webmanifest:2-3` | `"name": "VolleyPro..."` | O PWA instalado no smartphone ou desktop é nomeado "VolleyPro" | **P2** |
| **BR-04** | `src/components/match/MatchSocialCard.tsx:263` | Rodapé do card social com `'VolleyPro'` | Imagens exportadas para redes sociais exibem o nome legado | **P2** |
| **BR-05** | `src/components/pwa/PwaInstallButton.tsx` | Toasts e tooltips com menções a 'VolleyPro' | Mensagens de interface desconectadas da marca BaseOS | **P3** |
| **BR-06** | `src/services/dataAccess.ts:191` e `SettingsPage.tsx:356` | Fallback de `orgName` com default `'VolleyPro'` | Se o organizador não preencher o nome da liga, o sistema assume VolleyPro | **P2** |

---

## 8. RELATÓRIOS EXISTENTES — ANÁLISE DE MATURIDADE

1. **Boletim de Jogos (`MatchesBoletimView.tsx` / `reportsPdf.ts`):**
   - *Maturidade:* **Alta**. Exibe número do jogo, fase, grupo, data/hora, local/quadra, confrontos com placar de sets e status homologado/finalizado.
   - *Limitação:* Lista corrida sequencial. Não agrupa partidas por dia ou por quadra, o que dificulta o trabalho operacional da mesa no ginásio.
2. **Classificação Oficial (`StandingsReportView.tsx` / `reportsPdf.ts`):**
   - *Maturidade:* **Excelente**. Alinhada às regras FIVB/CBV com critérios de desempate ordenados, sets average, pontos average e seção de probabilidades da Fase 5.
3. **Relação Nominal das Equipes (`TeamRostersReportView.tsx` / `reportsPdf.ts`):**
   - *Maturidade:* **Média-Alta**. Gera 1 página A4 dedicada para cada equipe, com comissão técnica e relação tabular de atletas.
   - *Limitação:* O PDF usa cores Navy/Azul fixas e cabeçalho "VOLLEYPRO".
4. **Quadro de Honra e Pódio (`PodiumReportView.tsx` / `reportsPdf.ts`):**
   - *Maturidade:* **Boa**. Calcula Campeão, Vice, 3º e 4º colocados com base na árvore de playoffs e exibe os escudos.

---

## 9. RELATÓRIOS AUSENTES IDENTIFICADOS NO DOMÍNIO

Avaliando o domínio esportivo e as necessidades reais de gestores de ligas e torneios de voleibol, foram identificados os seguintes relatórios ausentes:

1. **Escala Oficial de Arbitragem e Oficiais de Mesa:** Documento consolidado contendo a designação de 1º árbitro, 2º árbitro, apontador e cronometrista por jogo, rodada e data.
2. **Programação Diária / Ordem dos Jogos por Quadra (Order of Play):** Agenda operacional diária dos ginásios, separando partidas por quadra com horários de início, aquecimento e intervalo de descanso.
3. **Relatório Disciplinar e Controle de Cartões/Sanções:** Extrato de advertências (amarelo), penalidades (vermelho), expulsões e desqualificações acumuladas na competição.
4. **Galeria de MVPs e Destaques da Competição:** Resumo consolidado de todos os atletas eleitos "Destaque da Partida" (`highlight_athlete_id`), agrupados por equipe e rodada.
5. **Ficha de Credenciamento da Delegação / Termo de Responsabilidade:** Documento administrativo por agremiação contendo termos de responsabilidade médica e assinaturas de atletas e comissão técnica.
6. **Relatório Estatístico de Sets e Duração:** Análise agregada de tempo médio de partidas, sets mais disputados e pontuações máximas/mínimas.

---

## 10. DOIS RELATÓRIOS PRIORITÁRIOS RECOMENDADOS

Para a próxima fase de desenvolvimento, recomendamos a implementação dos **dois relatórios operacionais mais críticos**:

### Relatório Prioritário 1: **Escala Oficial de Arbitragem (Referees Schedule)**
- **Objetivo:** Fornecer à coordenação de arbitragem, delegados e equipes a escala formal dos juízes e oficiais de mesa designados para cada partida da rodada ou da competição inteira.
- **Usuário-alvo:** Coordenador de Arbitragem, Delegado Técnico, Árbitros e Organizador.
- **Dados Necessários:**
  - Competição (`name`, `category`, `genderCategory`, `venue`);
  - Partidas (`matchNumber`, `scheduledTime`, `venue`, `court`, `phase`, `teamAName`, `teamBName`);
  - Árbitros designados (`referees: { role: string; name: string }[]`, categoria/nível do árbitro da tabela `referees`).
- **Origem dos Dados:** `dataAccess.listMatches()`, `dataAccess.listReferees()`, `dataAccess.getCompetition()`.
- **Rota / Tela Ideal:** Nova aba `"Arbitragem"` em `/relatorios?competitionId=:id&report=arbitragem` + botão de exportação rápida na tela `/arbitros`.
- **Formato:** HTML-first na tela com exportação sob demanda em PDF A4 Retrato.
- **Engine Recomendado:** Padrão institucional BaseOS (Dark Tech na tela, P&B limpo no PDF).
- **Nível de Esforço:** **Baixo a Médio** (os dados de árbitros já existem nas partidas e na tabela `referees`).
- **Prioridade:** **P1** (Alta).

### Relatório Prioritário 2: **Programação Diária / Ordem dos Jogos por Quadra (Daily Schedule)**
- **Objetivo:** Gerar uma agenda operacional limpa, dividida por **Data e Quadra**, ordenando cronologicamente os confrontos do dia (Jogo 1, Jogo 2, Jogo 3...), com horários previstos de aquecimento e intervalo de descanso. Documento ideal para afixar nos murais dos ginásios e orientar os gandulas, mesários e capitães.
- **Usuário-alvo:** Coordenador de Quadra, Mesa de Apontamento, Técnicos e Público no Ginásio.
- **Dados Necessários:**
  - Partidas filtradas por data (`scheduledTime`);
  - Quadras e Locais (`venues`, `court`);
  - Equipes (`name`, `shortName`, `logoUrl`);
  - Categoria e Fase (`genderCategory`, `phase`).
- **Origem dos Dados:** `dataAccess.listMatches()`, `dataAccess.listVenues()`, `dataAccess.listTeams()`.
- **Rota / Tela Ideal:** Nova aba `"Programação"` em `/relatorios?competitionId=:id&report=programacao` + atalho em `/jogos`.
- **Formato:** HTML-first na tela com exportação em PDF A4 Retrato ou Paisagem.
- **Engine Recomendado:** Padrão institucional BaseOS.
- **Nível de Esforço:** **Médio**.
- **Prioridade:** **P1** (Alta).

---

## 11. AUDITORIA DA ÁREA EQUIPES (`/equipes`)

### 11.1 Componente e Rota
- **Arquivo Principal:** `src/pages/TeamsPage.tsx` (997 linhas).
- **Rota:** `/equipes` (com alias `/teams`).
- **Acesso:** Restrito a usuários com papel `organizer` (`<RequireAuth roles={['organizer']}>`).
- **Métricas Apresentadas:**
  - Total de Equipes cadastradas;
  - Equipes de Vôlei de Quadra;
  - Equipes de Vôlei de Praia;
  - Atletas Cadastrados (somatório geral).

### 11.2 Ações Existentes na Tabela de Equipes
Na coluna de ações de cada linha (`DataTable`), o menu dropdown oferece 4 opções:
1. `Ver Detalhes` (`setViewing(team)`)
2. `Editar Equipe` (`setEditing(team)`)
3. `Acesso / Compartilhar` (`setShareTeam(team)`)
4. `Excluir` (`setDeleting(team)`)

---

## 12. FLUXO EQUIPE → ATLETAS: DIAGNÓSTICO DO BLOQUEIO

### 12.1 Como o Fluxo Funciona Hoje
```
Menu Lateral → Clica em "Equipes"
    ↓
Abre a tela /equipes (lista tabular com todas as equipes)
    ↓
Usuário clica em "Ver Detalhes" (ou ícone do olho)
    ↓
Abre o modal TeamDetailsDialog
    ↓
O modal exibe 12 linhas de texto:
  - Nome, Sigla, Modalidade, Cidade/UF, Técnico, Gestor, Telefone, E-mail, Senha
  - "Atletas no Elenco: 12"
  - "Partidas: 4 | Vitórias: 2"
  - Badges de competições vinculadas
    ↓
[FIM DO FLUXO - BLOQUEIO]
Nenhum atleta é listado!
```

### 12.2 A Descoberta Crítica
No arquivo `src/pages/TeamsPage.tsx`, no hook `refresh()` (linhas 107-118):
```ts
const [allTeams, matches, competitionTeams, athletes, competitions] = await Promise.all([
  dataAccess.listTeams(),
  dataAccess.listMatches(),
  dataAccess.listCompetitionTeams(),
  dataAccess.listCompetitionAthletes(),
  dataAccess.listCompetitions(),
]);

const ctForTeam = (teamId: string) => competitionTeams.filter((ct) => ct.teamId === teamId);
const athletesForTeam = (teamId: string) =>
  athletes.filter((a) => ctForTeam(teamId).some((ct) => ct.id === a.competitionTeamId));
```
**Evidência irrefutável:**
1. O método `dataAccess.listCompetitionAthletes()` **já é executado no carregamento da página**!
2. A função `athletesForTeam(team.id)` **já localiza perfeitamente todos os atletas vinculados à equipe**!
3. O código atual **descarta a lista de atletas**, extraindo apenas a propriedade `.length` para alimentar o campo numérico `athletes: athletesForTeam(team.id).length` no objeto `TeamView`!
4. Portanto, **todos os dados de atletas (nomes, camisas, posições, capitão, líbero, documentos) já estão disponíveis na memória da página**. Eles simplesmente não são repassados ao componente de visualização!

---

## 13. MODELO DE DADOS ENVOLVIDO

O relacionamento entre Agremiações e Atletas no BaseOS opera em duas camadas canônicas:

```
┌─────────────────────────┐
│       teams (T)         │  (Cadastro institucional permanente da agremiação)
│  id: 'team-...'         │
│  name, short_name       │
│  coach_name, manager... │
└────────────┬────────────┘
             │ 1
             │
             │ N
┌────────────┴────────────┐
│ competition_teams (CT)  │  (Inscrição da agremiação em uma competição específica)
│  id: 'ct-...'           │
│  competition_id         │
│  team_id ───────────────┘
│  access_token, status...│
└────────────┬────────────┘
             │ 1
             │
             │ N
┌────────────┴────────────┐
│competition_athletes(CA) │  (Atleta inscrito no elenco daquela competição)
│  id: 'ath-...'          │
│  competition_team_id    │
│  name, jersey_number    │
│  position, is_captain   │
│  is_libero, birth_date  │
│  document_number, gender│
└─────────────────────────┘
```

### Distinção Conceitual Essencial:
- `TeamRecord` (`teams`): Agremiação perene (ex: "Minas Tênis Clube", "Osasco Voleibol").
- `CompetitionTeam` (`competition_teams`): A participação do time em um torneio específico (ex: Minas no "Campeonato Mineiro 2026").
- `CompetitionAthlete` (`competition_athletes`): O atleta escalado e inscrito para aquela competição (com sua camisa, se é capitão ou líbero naquele campeonato).
- `PersonRecord` (`persons`): Cadastro genérico de pessoas (técnicos, árbitros, atletas globais) em LocalStorage, atualmente sem tabela relacional. **Não deve ser misturado com `CompetitionAthlete`**.

---

## 14. ROTAS EXISTENTES E NAVEGAÇÃO

| Rota | Descrição | Componente | Papel Mínimo | Relação com Equipes/Atletas |
| :--- | :--- | :--- | :---: | :--- |
| `/equipes` | Lista e gestão de equipes | `TeamsPage` | `organizer` | Central de equipes. Falta listar os atletas dentro de cada equipe. |
| `/atletas` | Lista geral de atletas | `AthletesPage` | `organizer` | Lista todos os atletas de todas as competições. Permite filtrar por equipe. |
| `/pessoas` | Cadastro geral de pessoas | `PeoplePage` | `organizer` | Cadastro genérico (LocalStorage). Sobreposição conceitual com atletas. |
| `/competicoes/:id/inscricoes` | Gestão de inscrições da competição | `CompetitionRegistrationsPage` | `organizer` | Mostra os elencos inscritos especificamente naquela competição. |
| `/equipe/inscricao/:token` | Portal público da equipe | `TeamRosterRegistrationPage` | `public` | Gestor da equipe cadastra seus próprios atletas via link/token. |
| `/relatorios` | Central de relatórios | `ReportsPage` | `public` / `organizer` | Exibe a aba de Elencos Nominais (`report=roster`). |

---

## 15. AUDITORIA DE PERMISSÕES E POLÍTICAS DE ACESSO

| Perfil | Ver Equipe | Editar Equipe | Ver Elenco / Atletas | Editar Atletas no Elenco | Inscrever Atleta via Token |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Admin / Organizador** | ✅ Sim | ✅ Sim | ✅ Sim (atualmente bloqueado por falta de UI) | ✅ Sim (via `/atletas` ou `/competicoes/:id/inscricoes`) | ✅ Sim |
| **Gestor da Equipe (Logado)** | ✅ Sim | ⚠️ Somente seu time | ✅ Sim (seu time) | ✅ Sim (se dentro do prazo de inscrição) | N/A |
| **Gestor via Link Público (`:token`)**| ❌ Não acessa admin | ❌ Não | ✅ Sim (seu elenco) | ✅ Sim (via RPC `register_athlete`) | ✅ Sim |
| **Público Geral** | ⚠️ Portal público `/c/:slug` | ❌ Não | ⚠️ No portal público | ❌ Não | ❌ Não |

---

## 16. AUDITORIA DE UX (DESKTOP / TABLET / MOBILE)

### Desktop (> 1024px):
- A tabela de equipes possui excelente densidade e tipografia mono tabular.
- O clique em "Ver Detalhes" abre um modal estreito (`sm:max-w-md`) que desperdiça a tela e não mostra o elenco.
- **Oportunidade de UX:** Expandir o modal para `sm:max-w-3xl` ou `sm:max-w-4xl`, dividindo em Abas:
  - **Aba 1: "Visão Geral"** (Dados cadastrais, escudo, comissão técnica, contato e credenciais do gestor);
  - **Aba 2: "Elenco de Atletas"** (Tabela completa com número de camisa destacado em badge mono, nome, posição, badges de Capitão e Líbero, idade/documento e filtro por competição).

### Tablet (768px - 1024px):
- A tabela possui rolagem horizontal controlada.
- O modal expansível com abas comporta-se de maneira responsiva sem quebrar o layout.

### Mobile (< 768px):
- A tabela converte-se em cards compactos.
- O modal deve abrir em tela cheia (`max-h-[90vh]` com scroll interno nos atletas) para permitir leitura confortável do elenco em smartphones.

---

## 17. TESTES EXISTENTES E COBERTURA

- `src/test/teamsPage.test.tsx` (Testes da página de equipes: criação, edição, filtros, listagem).
- `src/test/teamRegistrationFlow.test.ts` (Fluxo de auto-inscrição e geração de tokens).
- `src/test/registrationService.test.ts` (18 testes de regras de elenco: camisas 1-99, 1 capitão, 2 líberos, prazos).
- `src/test/reportsPage.test.tsx` e `reportsPdf.test.ts` (Central de relatórios e exportação PDF).
- `src/test/baseosScoresheetConsolidation.test.ts` (Geração e validação de súmulas).

### Diagnóstico de Execução dos Testes na Auditoria:
- **Total de Testes do Projeto:** 1.005 testes em 107 arquivos.
- **Testes Aprovados:** 999 testes (99,4% de aprovação).
- **Testes com Timeout por Concorrência:** 6 testes em 4 arquivos falharam exclusivamente quando a suíte completa de 107 arquivos foi disparada simultaneamente sem limitação de workers, devido à saturação de CPU na renderização de canvas de PDF e jsdom (`generateInspectionPdfs.test.ts`, `baseosScoresheetConsolidation.test.ts` com thresholds de 15s/25s ultrapassados em carga máxima).

---

## 18. MATRIZ DE PROBLEMAS IDENTIFICADOS

| ID | Área | Problema Encontrado | Evidência Técnica | Severidade | Arquivo / Linha | Recomendação |
| :-: | :--- | :--- | :--- | :-: | :--- | :--- |
| **P-01** | **Equipes** | Equipe não lista atletas ao abrir detalhes | `TeamDetailsDialog` exibe apenas `value: String(team.athletes)` sem renderizar a lista | **P0** | `src/pages/TeamsPage.tsx:935-995` | Expandir `TeamDetailsDialog` com aba/seção de elenco exibindo atletas carregados |
| **P-02** | **Relatórios** | Cabeçalho do PDF com `"VOLLEYPRO"` hardcoded | `doc.text('VOLLEYPRO', MARGIN + 4, ...)` | **P1** | `src/lib/pdf/reportsPdf.ts:164` | Substituir por `'BASEOS'` e integrar identidade visual institucional |
| **P-03** | **Relatórios** | Mensagem de WhatsApp com nome legado | `return '🏐 *VOLLEYPRO — ACESSO DA EQUIPE* 🏐...'` | **P1** | `src/components/registration/TeamCreatedShareDialog.tsx:21` | Atualizar template de mensagem para `BaseOS` |
| **P-04** | **Relatórios** | Relatórios operacionais ausentes | Inexistência de Escala de Arbitragem e Programação Diária por Quadra | **P1** | Central de Relatórios (`ReportsPage.tsx`) | Implementar os 2 relatórios prioritários recomendados |
| **P-05** | **Branding** | Fallback de organização assume `'VolleyPro'` | `orgName: 'VolleyPro'` no default | **P2** | `src/services/dataAccess.ts:191`, `SettingsPage.tsx:356` | Alterar fallback para `'BaseOS'` ou vazio |
| **P-06** | **Branding** | Metadados do PWA com nome legado | `"name": "VolleyPro — Gestão..."` | **P2** | `public/manifest.webmanifest:2-3` | Atualizar manifesto para `"BaseOS — Gestão Esportiva"` |
| **P-07** | **Branding** | Card para redes sociais com marca antiga | `<span>VolleyPro</span>` no rodapé | **P2** | `src/components/match/MatchSocialCard.tsx:263` | Substituir por `BaseOS` |
| **P-08** | **Engines** | Múltiplos motores concorrentes de PDF | 3 bibliotecas (`@react-pdf/renderer`, `jsPDF`, `pdf-lib`) | **P2** | `src/document-engine/` vs `src/lib/pdf/` | Padronizar novos relatórios e planejar convergência para `@react-pdf/renderer` |

---

## 19. MATRIZ DE PRIORIDADES

- **P0 (Bloqueante / Crítico de UX do Negócio):**
  - **P-01:** Exibição do elenco de atletas detalhado dentro de cada equipe no menu `/equipes`.
- **P1 (Alta Prioridade — Identidade e Documentação Esportiva):**
  - **P-02:** Remoção de `"VOLLEYPRO"` do cabeçalho de todos os relatórios PDF em `reportsPdf.ts`.
  - **P-03:** Atualização do texto de compartilhamento de acesso de equipe via WhatsApp.
  - **P-04:** Criação dos 2 Relatórios Prioritários (Escala de Arbitragem e Programação Diária por Quadra).
- **P2 (Média Prioridade — Consistência de Plataforma):**
  - **P-05:** Alinhamento de fallbacks de `orgName` de `VolleyPro` para `BaseOS`.
  - **P-06:** Atualização do `manifest.webmanifest` do PWA.
  - **P-07:** Marca d'água do `MatchSocialCard`.
  - **P-08:** Planejamento de unificação dos motores PDF.
- **P3 (Melhoria Contínua):**
  - Toasts residuais em `PwaInstallButton.tsx`.

---

## 20. RECOMENDAÇÕES ARQUITETURAIS

### 20.1 Para Relatórios e Motores PDF:
1. **Motor Canônico:** O motor oficial e preferencial de documentos de alta fidelidade do BaseOS é o `@react-pdf/renderer` (`src/document-engine/baseos/`). Ele é declarativo, matematicamente testado e possui componentes gráficos padronizados.
2. **Correção Imediata da Central de Relatórios:** Manter temporariamente o `jsPDF` em `reportsPdf.ts` para não quebrar os 4 relatórios existentes, mas **substituir imediatamente o texto estático `'VOLLEYPRO'` por `'BASEOS'`**, aplicando a cor Slate/Âmbar ou preto para impressão limpa.
3. **Identidade Centralizada:** Utilizar o vetor oficial do BaseOS (`BASEOS SPORTS INTELLIGENCE` com barras horizontais) nos cabeçalhos, garantindo que o relatório nunca dependa de imagens externas que possam falhar.

### 20.2 Para a Área de Equipes (Equipe → Atletas):
1. **Padrão de Interface:** **Recomendamos expandir o modal existente `TeamDetailsDialog` para um Modal Rico em Abas (`Dialog` com `Tabs`)**:
   - *Aba 1: "Dados da Agremiação"* (Escudo, Sigla, Cidade/Estado, Técnico, Gestor, Contatos, Acesso e Senha);
   - *Aba 2: "Elenco de Atletas"* (Tabela rica com Camisa, Nome, Posição, Badges de Capitão e Líbero, Documento, Idade e Competição Vinculada).
   - *Justificativa Técnica:* Não requer adicionar novas rotas complexas em `App.tsx`, aproveita 100% os dados já carregados no `refresh()` de `TeamsPage.tsx`, oferece resposta instantânea em 0ms (sem loading adicional) e preserva os filtros e o estado da listagem de equipes.
2. **Evitar Duplicação com `/atletas`:**
   - A tela `/atletas` continua como a visão macro transversal (todos os atletas de todas as equipes e competições, com busca global e transferências).
   - A visão em `/equipes` foca exclusivamente no elenco da agremiação selecionada, permitindo ao gestor ou organizador conferir a composição do time com um único clique.

---

## 21. ESCOPO RECOMENDADO PARA A PRÓXIMA EXECUÇÃO (PROMPT 2)

Com a aprovação desta auditoria, a próxima etapa de implementação deverá focar em:

1. **Implementação do Elenco em Equipes (`TeamsPage.tsx`):**
   - Repassar a lista de atletas vinculados (`athletesForTeam(team.id)`) para o `TeamDetailsDialog`.
   - Adicionar as abas "Dados da Equipe" e "Elenco de Atletas".
   - Renderizar a tabela de atletas com números de camisa em destaque, posições e badges de Capitão/Líbero.
2. **Saneamento Cirúrgico da Marca VolleyPro (P1):**
   - Corrigir o cabeçalho em `src/lib/pdf/reportsPdf.ts` (substituir `'VOLLEYPRO'` por `'BASEOS'`).
   - Corrigir o texto de compartilhamento no WhatsApp (`TeamCreatedShareDialog.tsx`).
   - Atualizar o manifesto PWA (`public/manifest.webmanifest`).
   - Atualizar o rodapé do card social (`MatchSocialCard.tsx`).
   - Corrigir fallbacks de organização em `dataAccess.ts` e `SettingsPage.tsx`.
3. **Implementação dos 2 Relatórios Prioritários na Central de Relatórios:**
   - Relatório 1: *Escala Oficial de Arbitragem* (HTML-first em `ReportsPage.tsx` + exportação em PDF).
   - Relatório 2: *Programação Diária de Jogos por Quadra* (HTML-first em `ReportsPage.tsx` + exportação em PDF).
4. **Validação e Homologação:**
   - Execução de testes de regressão, typecheck e build.

---

## 22. STATUS FINAL DA AUDITORIA

### Classificação: **GO**

A auditoria forneceu um mapa completo, exato e comprovado por evidências de código de todas as dependências, motores, branding e modelos de dados, respaldando integralmente o planejamento cirúrgico da implementação.
