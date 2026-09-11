# BASEOS — WALKTHROUGH OFICIAL DA AUDITORIA (FASE 1)
## Portais, Competições, Relatórios e Fluxos de Navegação

**Sistema:** BaseOS — Sistema SaaS Profissional de Gestão de Competições de Voleibol  
**Ambiente Auditado:** Desenvolvimento / Local (`/home/diego-martins/docker/volei`)  
**Data da Auditoria:** 10/09/2026  
**Classificação Final:** 🟢 **AUDIT PASSED (FASE 1 DE ANÁLISE CONCLUÍDA — ZERO ALTERAÇÕES DE CÓDIGO)**  

---

## 1. RESUMO EXECUTIVO

Esta auditoria técnica e funcional foi executada em caráter **estritamente analítico e não-invasivo**, em conformidade com as regras absolutas de governança da Fase 1:
- ❌ Nenhum arquivo de produção foi modificado;
- ❌ Nenhum arquivo de teste foi modificado;
- ❌ Nenhuma migration foi criada ou executada;
- ❌ Nenhuma tabela ou schema de banco de dados foi alterado;
- ❌ Nenhuma rota, serviço, componente ou estilo CSS foi alterado;
- ❌ Nenhuma refatoração ou correção de bug foi aplicada.

O objetivo foi mapear detalhadamente o estado atual da aplicação, documentando a infraestrutura existente, as lacunas funcionais, as inconsistências visuais e a matriz de impacto para as 10 áreas da próxima evolução do BaseOS.

### 1.1. Status de Integridade da Suíte Automatizada
- **TypeScript Check (`npx tsc -p tsconfig.app.json --noEmit`):** ✅ **Zero erros.**
- **ESLint (`npm run lint`):** ✅ **Zero erros.**
- **Vitest Suite (`npm test`):** ✅ **101/101 arquivos de teste aprovados (898 testes passando com 100% de sucesso).**

---

## 2. DECISÃO ARQUITETURAL FUNDAMENTAL: SEPARAÇÃO ENTRE EQUIPE E COMPETIÇÃO

Ficou consolidada a decisão funcional definitiva que ditará as próximas fases:

```text
┌─────────────────────────────────────────────────────────────┐
│                      DOMÍNIO: EQUIPE                        │
│  - Nome Oficial e Sigla (3 letras)                          │
│  - Escudo / Logo da Equipe (Identidade Própria)             │
│  - Gestor / Responsável, Telefone, E-mail e Credenciais     │
│  - Elenco de Atletas e Comissão Técnica                     │
│  ⛔ ZERO CONCEITO DE PATROCINADORES VINCULADOS À EQUIPE     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    DOMÍNIO: COMPETIÇÃO                      │
│  Competition                                                │
│  ├── Identidade Visual / Logo Oficial do Evento             │
│  └── Apoiadores / Patrocinadores do Evento (1..N)           │
│      ├── Apoiador 1 (Nome, Logo, Cota/Papel, Link)          │
│      ├── Apoiador 2                                         │
│      └── Apoiador N                                         │
│                                                             │
│  Atribuição da Plataforma: "Powered by BaseOS" / "BaseOS"   │
│  ⛔ NUNCA tratada como patrocinador do torneio              │
└─────────────────────────────────────────────────────────────┘
```

Os apoiadores do evento pertencerão estritamente à **Competição** e deverão aparecer no Portal Público, no Portal da Equipe, nos Relatórios HTML e nos PDFs sob demanda.

---

## 3. AUDITORIA DO CADASTRO DE EQUIPE (ESCUDO / LOGO)

### 3.1. Onde a logo é cadastrada e editada?
- **Página de Cadastro e Edição:** [`src/pages/TeamsPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/TeamsPage.tsx#L603-L725) no diálogo operacional `TeamFormDialog`.
- **Acesso:** Restrito a organizadores autenticados (`/equipes`).
- **Portal de Gestão da Equipe ([`TeamRosterRegistrationPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/TeamRosterRegistrationPage.tsx#L303-L313)):** O gestor da agremiação apenas **visualiza** o escudo da equipe no cabeçalho; não possui permissão nem botão para upload ou troca de logo através deste portal.

### 3.2. Mecanismo de Upload, Processamento e Armazenamento
- **Tratamento no Cliente:** Ao selecionar uma imagem (`image/png,image/jpeg,image/webp,image/svg+xml`), o componente chama [`compressImageToDataUrl`](file:///home/diego-martins/docker/volei/src/lib/imageUtils.ts#L19-L59) em [`src/lib/imageUtils.ts`](file:///home/diego-martins/docker/volei/src/lib/imageUtils.ts):
  1. Carrega o arquivo via `FileReader`.
  2. Redimensiona em um `<canvas>` HTML5 para no máximo `MAX_DIMENSION = 256` pixels.
  3. Comprime em JPEG ajustando o parâmetro de qualidade de 0.85 até caber em `< 200 KB`.
  4. Retorna uma string **Base64 Data URI** (`data:image/jpeg;base64,...`).
- **Preview:** Renderizado em `<img src={logoUrl} className="w-12 h-12 rounded-lg object-contain bg-zinc-900..." />`.
- **Remoção:** Botão "Remover escudo" executa `setLogoUrl(undefined)`.

### 3.3. Existência de Supabase Storage e Persistência
- **Supabase Storage:** ❌ **NÃO existe Supabase Storage configurado.**
  - Não há buckets criados no schema nem chamadas à API `supabase.storage`.
  - O cliente [`src/lib/supabaseClient.ts`](file:///home/diego-martins/docker/volei/src/lib/supabaseClient.ts) opera apenas PostgREST sobre tabelas relacionais.
- **Persistência no Banco:** A string Base64 completa é armazenada inline na coluna `teams.logo_url text` (migration `20260819000000_venues_logos_phases.sql`). O adapter [`dataAccess.ts`](file:///home/diego-martins/docker/volei/src/services/dataAccess.ts#L1911) converte `logoUrl` ➔ `logo_url` via `toSnake()`.
- **Persistência no LocalStorage:** Armazenada diretamente dentro do array JSON na chave `voleipro.v1:teams`.

### 3.4. Componentes que Exibem a Logo da Equipe
1. **Listagem de Equipes:** [`src/pages/TeamsPage.tsx:L222`](file:///home/diego-martins/docker/volei/src/pages/TeamsPage.tsx#L222).
2. **Portal de Inscrição da Equipe:** [`src/pages/TeamRosterRegistrationPage.tsx:L303`](file:///home/diego-martins/docker/volei/src/pages/TeamRosterRegistrationPage.tsx#L303).
3. **Portal Público:** [`src/pages/PublicCompetitionPage.tsx:L635,L806`](file:///home/diego-martins/docker/volei/src/pages/PublicCompetitionPage.tsx#L635).
4. **Classificação Oficial:** [`src/pages/StandingsPage.tsx:L403`](file:///home/diego-martins/docker/volei/src/pages/StandingsPage.tsx#L403) e [`StandingsTable.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/StandingsTable.tsx).
5. **PDFs Oficiais:**
   - [`src/lib/pdf/matchSheetPdf.ts:L315`](file:///home/diego-martins/docker/volei/src/lib/pdf/matchSheetPdf.ts#L315): função `drawTeamLogo` (desenha imagem de 5.2mm).
   - [`src/lib/pdf/reportsPdf.ts:L112`](file:///home/diego-martins/docker/volei/src/lib/pdf/reportsPdf.ts#L112): função `safeDrawImage` nos boletins gerais, relações nominais e pódio.

### 3.5. Limitações Atuais e Reutilização
- **Limitação de Performance:** Gravar Base64 inline em colunas texto sobrecarrega consultas de listagem (`select * from teams`), trafegando centenas de kilobytes desnecessariamente.
- **Limitação nos PDFs:** [`safeDrawImage`](file:///home/diego-martins/docker/volei/src/lib/pdf/reportsPdf.ts#L120) só desenha imagens cujo valor inicie com `data:image`. Caso seja fornecida uma URL HTTP remota sem conversão em data URI, o PDF recorre ao monograma em texto.
- **Reutilização:** O pipeline [`compressImageToDataUrl`](file:///home/diego-martins/docker/volei/src/lib/imageUtils.ts#L19) pode ser reutilizado imediatamente para o upload da logo da competição.

---

## 4. AUDITORIA DO CADASTRO / EDIÇÃO DA COMPETIÇÃO

### 4.1. Diagnóstico de Branding e Imagem do Torneio
- **Situação Atual:** A competição **NÃO possui** logo, imagem de capa, cores de identidade visual ou apoiadores.
- **Modelo de Dados ([`src/types/entities.ts:L58-L109`](file:///home/diego-martins/docker/volei/src/types/entities.ts#L58-L109)):** `CompetitionRecord` e a tabela Postgres `competitions` não possuem colunas de branding.
- **Diálogo de Criação ([`CompetitionFormDialog.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/dialogs/CompetitionFormDialog.tsx)):** Possui 4 abas (`Geral`, `Disputa`, `Sets`, `Inscrição`), mas **nenhum** campo para upload de logo ou definição de patrocinadores.
- **Diálogo de Edição ([`CompetitionSettingsEditDialog.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/dialogs/CompetitionSettingsEditDialog.tsx)):** Focado unicamente em formatos de sets por fase (`groupStage`, `playoffs`, `semifinals`, `final`).

### 4.2. Onde Implementar Arquiteturalmente
Para garantir paridade entre LocalStorage e Supabase sem quebras:
1. **No Modelo de Dados (`CompetitionRecord`):**
   ```ts
   export type CompetitionSupporter = {
     id: string;
     name: string;
     logoUrl: string;
     tier?: 'master' | 'official' | 'support' | 'media';
     websiteUrl?: string;
     order?: number;
   };

   // Em CompetitionRecord:
   logoUrl?: string;
   supporters?: CompetitionSupporter[];
   ```
2. **No Banco de Dados:** Adicionar colunas `logo_url text` e `supporters jsonb default '[]'::jsonb` na tabela `competitions`.
3. **No Adapter (`dataAccess.ts`):** Mapeamento transparente via `toSnake` / `toCamel`.

---

## 5. AUDITORIA DO "FORMAT BUILDER E FASES"

### 5.1. Identificação Técnica
- **Acesso na Interface:** Botão *"Format Builder & Fases"* em [`CompetitionConfigTab.tsx:L45`](file:///home/diego-martins/docker/volei/src/components/competition/tabs/CompetitionConfigTab.tsx#L45).
- **Componente Modal:** [`src/components/competition/format-builder/CompetitionFormatBuilder.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/format-builder/CompetitionFormatBuilder.tsx).
- **Hook de Orquestração:** [`src/hooks/useCompetitionFormatBuilder.ts`](file:///home/diego-martins/docker/volei/src/hooks/useCompetitionFormatBuilder.ts).
- **Serviços Envolvidos:**
  - [`competitionFormatBuilder.ts`](file:///home/diego-martins/docker/volei/src/services/competitionFormatBuilder.ts): manipulação e preview do Stage Graph.
  - [`competitionConfigValidator.ts`](file:///home/diego-martins/docker/volei/src/services/competitionConfigValidator.ts): validação puramente matemática em memória.
  - [`competitionRulesService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionRulesService.ts): resolução de regras canônicas e controle de congelamento (`rulesSnapshot`).
  - [`competitionLifecycleService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionLifecycleService.ts): controle de transição de status (`canEditRules`).

### 5.2. Análise Comportamental nos 6 Cenários

| Cenário | Comportamento na UI | Comportamento no Backend / Serviço |
| :--- | :--- | :--- |
| **1. Recém-criada (sem equipes/jogos)** | Edição livre em todas as 5 abas (Templates, Fases, Regras, Validação, Prévia). | `canEditRules` = `true`. Salvamento permitido. |
| **2. Possui equipes inscritas (sorteio pendente)** | Permite alterar formato e fases normalmente. | `canEditRules` = `true`. Não revalida retroativamente equipes que descumpram novos limites. |
| **3. Sorteio pendente** | Permite alterar. | `canEditRules` = `true`. |
| **4. Sorteio já realizado (oficial)** | **Falha de UX:** O modal abre e permite alterar campos; o usuário só descobre o bloqueio ao clicar em "Salvar". | Ao oficializar o sorteio, partidas são geradas (`matches.length > 0`). Em `saveConfig`, [`useCompetitionFormatBuilder.ts:L210`](file:///home/diego-martins/docker/volei/src/hooks/useCompetitionFormatBuilder.ts#L210) rejeita com `toast.error('As regras desta competição estão congeladas...')`. |
| **5. Existem partidas geradas** | Campos não desabilitam preventivamente; bloqueio ocorre no salvamento. | Rejeitado por `canEditRules(comp, compMatches)`. |
| **6. Em andamento / Concluída** | Regras congeladas. A competição possui `rulesSnapshot` selado. | Protegido pelo trigger SQL `20260906000001_protect_rules_snapshot.sql` e pelo LocalStorage adapter. |

### 5.3. Estrutura e Reutilização
O modal está estruturado em 5 abas internas:
1. `Templates`: [`FormatTemplateSelector.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/format-builder/FormatTemplateSelector.tsx) (carrega presets do `CompetitionTemplateService`).
2. `Fases`: [`StageBuilder.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/format-builder/StageBuilder.tsx) (CRUD de fases, ordenação e duplicação).
3. `Regras & Sets`: [`RulesConfigEditor.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/format-builder/RulesConfigEditor.tsx) (sets padrão, parciais por fase, pontuação FIVB, desempate).
4. `Validação`: [`CompetitionValidationPanel.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/format-builder/CompetitionValidationPanel.tsx).
5. `Prévia do Chaveamento`: [`CompetitionPreview.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/format-builder/CompetitionPreview.tsx).

Esses subcomponentes são reutilizáveis para compor uma futura tela unificada de **Configuração da Competição**.

---

## 6. AUDITORIA VISUAL DO MODAL DE CONFIGURAÇÃO

### 6.1. Causa Raiz da Dificuldade de Leitura e Transparência
Ao inspecionar o modal [`CompetitionFormatBuilder.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/format-builder/CompetitionFormatBuilder.tsx#L91-L93) e os componentes filhos [`StageBuilder.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/format-builder/StageBuilder.tsx) e [`RulesConfigEditor.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/format-builder/RulesConfigEditor.tsx), identificou-se a falha arquitetural exata:

```tsx
// Trecho em CompetitionFormatBuilder.tsx:L91
<DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 bg-surface-base border-border rounded-xl overflow-hidden shadow-2xl">

// Trecho em CompetitionFormatBuilder.tsx:L93
<DialogHeader className="p-4 border-b border-border-subtle bg-surface-elevated/40 shrink-0">

// Trecho em StageBuilder.tsx:L109
<div className="flex items-center justify-between p-3.5 rounded-xl border border-border-subtle bg-surface-elevated/70 ...">
```

### 6.2. Diagnóstico Detalhado
1. **Classes Sintéticas Desconhecidas:** Foram utilizadas classes CSS que **não existem** no tema do Tailwind ([`tailwind.config.ts`](file:///home/diego-martins/docker/volei/tailwind.config.ts)) nem em [`src/index.css`](file:///home/diego-martins/docker/volei/src/index.css):
   - `bg-surface-base`
   - `bg-surface-elevated/40` e `bg-surface-elevated/70`
   - `border-border-subtle`
   - `text-text-primary`, `text-text-secondary`, `text-text-muted`
   - `text-state-success`, `text-state-error`, `text-state-warning`
2. **Queda para Transparência:** O compilador do Tailwind não gera regras para essas classes. Como consequência:
   - O corpo do diálogo fica com fundo nulo/transparente sobre o backdrop escuro do Radix UI;
   - Os cards de fases e seletores herdam fundos transparentes, misturando-se com o fundo do diálogo;
   - As fontes perdem cor explícita e sofrem severa perda de contraste;
   - As bordas perdem definição (`currentColor`).

### 6.3. Diretriz de Padronização para a Fase Posterior
Na próxima fase, padronizar com os tokens Enterprise Dark SaaS já existentes no BaseOS:
- `bg-surface-base` ➔ `bg-zinc-950`
- `bg-surface-elevated/*` ➔ `bg-zinc-900` / `bg-card`
- `border-border-subtle` ➔ `border-border` / `border-zinc-800`
- `text-text-primary` ➔ `text-foreground`
- `text-text-secondary` ➔ `text-muted-foreground`

---

## 7. AUDITORIA DE NAVEGAÇÃO DAS COMPETIÇÕES

### 7.1. Diagnóstico do Fluxo de Navegação e Perda de Contexto

Atualmente **não existe um Provedor Global de Contexto da Competição Ativa** (`CompetitionContext`). O comportamento varia de acordo com o ponto de entrada:

#### Fluxo 1: A partir de "Competições Ativas" ([`ActiveCompetitionsPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/ActiveCompetitionsPage.tsx))
```text
LISTA: /competicoes-ativas
  ├── Botão "Ver Jogos"  ➔ navigate('/jogos?competitionId=' + c.id)       [Contexto PRESERVADO via Query Param]
  ├── Botão "Inscrições" ➔ navigate('/competicoes/' + c.id + '/inscricoes') [Contexto PRESERVADO via Path Param]
  ├── Botão "Relatórios" ➔ navigate('/relatorios')                        [Contexto PERDIDO ❌ — abre comps[0]]
  └── Clique no Card     ➔ SEM AÇÃO ❌ (Card não possui onClick para abrir os detalhes do torneio)
```

#### Fluxo 2: A partir do Dashboard ([`Dashboard.tsx`](file:///home/diego-martins/docker/volei/src/components/dashboard/Dashboard.tsx#L507-L555))
```text
LISTA: /dashboard
  ├── Clique no Card     ➔ navigate('/competicoes') [Contexto PERDIDO ❌ — abre comps[0]]
  ├── Botão "Gerenciar"  ➔ navigate('/competicoes') [Contexto PERDIDO ❌ — abre comps[0]]
  └── Botão "Jogos"      ➔ navigate('/jogos')       [Contexto PERDIDO ❌ — abre sem filtro]
```

#### Fluxo 3: Dentro da Gestão de Competições ([`CompetitionsPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/CompetitionsPage.tsx))
- A barra lateral [`CompetitionSidebarList`](file:///home/diego-martins/docker/volei/src/components/competition/CompetitionSidebarList.tsx) altera apenas o estado React local `selectedId`.
- **A URL não é sincronizada** (não executa `setSearchParams({ id: comp.id })`). Ao atualizar a página (F5), o sistema volta a selecionar sempre a primeira competição (`comps[0]`).
- A aba ativa (`overview`, `config`, `teams`, `standings`, etc.) é mantida em estado local volátil `useState('overview')`, impossibilitando links diretos para abas específicas.

---

## 8. AUDITORIA DAS DEMAIS ÁREAS DA PRÓXIMA EVOLUÇÃO

### 8.1. Portal de Gestão da Equipe ([`TeamRosterRegistrationPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/TeamRosterRegistrationPage.tsx))
- **Acesso:** Via rota com token seguro `/equipe/inscricao/:token`. Não exige login nem utiliza `useAuth()`.
- **Lacunas:** Não exibe apoiadores da competição; não possui navegação de retorno ao Portal Público; não possui integração com login por usuário/senha (se o gestor logar em `/login`, é redirecionado para a home geral e não para a sua agremiação).

### 8.2. Portal Público ([`PublicCompetitionPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/PublicCompetitionPage.tsx))
- **Acesso:** Rota pública `/c/:slug`.
- **Capacidades:** Visualização de tabela, jogos, resultados, equipes, QR Code (PNG 1024×1024) e compartilhamento via Web Share API.
- **Lacunas:** Não possui logo oficial da competição (apenas título textual); não exibe seção de apoiadores do evento.

### 8.3. Relatórios HTML vs. PDF
- **Situação Atual:** Todos os relatórios em [`ReportsPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/ReportsPage.tsx) dependem **100% de geração binária jsPDF** ([`reportsPdf.ts`](file:///home/diego-martins/docker/volei/src/lib/pdf/reportsPdf.ts)).
- **Relatórios HTML:** **Inexistentes.** Não há páginas ou rotas HTML com estilização de impressão (`@media print`) para visualização web responsiva sem download de arquivo.

### 8.4. Relatório de Probabilidade de Classificação
- **Situação Atual:** **Inexistente.** Não há serviço matemático de simulação de cenários de classificação no domínio.

### 8.5. Destaque da Partida (MVP) na Homologação da Súmula
- **Situação Atual:**
  - O card de redes sociais ([`MatchSocialCard.tsx`](file:///home/diego-martins/docker/volei/src/components/match/MatchSocialCard.tsx)) possui propriedades visuais para MVP (`mvpName`, `mvpNumber`, `mvpTeam`), mas [`MatchSheetPage.tsx:L454`](file:///home/diego-martins/docker/volei/src/pages/MatchSheetPage.tsx#L454) não passa esses valores.
  - A entidade `MatchRecord` ([`entities.ts`](file:///home/diego-martins/docker/volei/src/types/entities.ts)) e a tabela SQL `matches` **não possuem campos** para salvar o destaque da partida.
  - A homologação em [`MatchesPage.tsx:L277`](file:///home/diego-martins/docker/volei/src/pages/MatchesPage.tsx#L277) oficializa o resultado sem oferecer seletor de atleta destaque.

---

## 9. MATRIZ DE DEPENDÊNCIAS E REQUISITOS PARA A FASE 2

| Área Funcional | Requisito Técnico | Impacto no Schema / Banco | Impacto nos Serviços / UI |
| :--- | :--- | :--- | :--- |
| **Identidade & Apoiadores** | Campo `logoUrl` e array `supporters` na competição. | Migration: `alter table competitions add column logo_url text, add column supporters jsonb`. | `dataAccess.ts`, `CompetitionFormDialog`, `PublicCompetitionPage`, `TeamRosterRegistrationPage`. |
| **Contraste do Modal** | Substituir classes sintéticas inexistentes por tokens dark do BaseOS. | **Nenhum.** | `CompetitionFormatBuilder.tsx`, `StageBuilder.tsx`, `RulesConfigEditor.tsx`. |
| **Navegação Contextual** | Sincronizar parâmetros de rota (`?id=...`, `?tab=...`) e criar `CompetitionContext`. | **Nenhum.** | `CompetitionsPage.tsx`, `Dashboard.tsx`, `ActiveCompetitionsPage.tsx`, `ReportsPage.tsx`. |
| **Destaque da Partida (MVP)** | Registrar o atleta destaque no ato da homologação da partida. | Migration: `alter table matches add column mvp_athlete_id text`. | `MatchRecord`, diálogo de homologação em `MatchesPage.tsx`, `MatchSocialCard.tsx`. |
| **Relatórios HTML** | Criar páginas web responsivas com suporte a impressão nativa. | **Nenhum.** | Criação de rota/visualizador web sob demanda. |
| **Probabilidade de Classificação** | Motor matemático de cálculo de cenários e chances. | **Nenhum.** | Novo serviço puro em `src/services/` com cobertura de testes unitários. |

---

## 10. CONCLUSÃO

A Fase 1 conclui com sucesso a radiografia completa do BaseOS. Todos os pontos críticos foram identificados, mapeados e explicados tecnicamente. O repositório permanece rigorosamente inalterado, com todos os 898 testes unitários passando e pronto para o planejamento detalhado das próximas fases.
