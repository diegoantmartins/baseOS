# BASEOS v2.4.4 — RELATÓRIO DE REDESIGN COMPLETO DA DRAW ARENA (PADRÃO BROADCAST STUDIO)

**Data:** 14 de Outubro de 2026  
**Responsável Técnico:** Principal Broadcast UI/UX Designer & React/Framer-Motion Engineer  
**Status do Deploy:** Concluído com Sucesso e Validado em Produção  
**Ambiente:** VPS Produção BaseOS (`baseos-frontend`, `voltz.baseos.online`)

---

## 1. RESUMO EXECUTIVO

Em atendimento direto à demanda de refinamento e alinhamento visual de classe mundial para a **Draw Arena** do BaseOS v2.4.4, foi executada a substituição da experiência anterior por uma **Arquitetura de Transmissão Esportiva Televisiva de Gala (Padrão UEFA TV / FIVB World Gala / CBV)**.

O novo design elimina completamente a poluição visual anterior (onde meias-esferas 3D gigantes cortadas colidiam no centro do palco e os grupos ficavam fragmentados com um vão central) e estabelece um estúdio limpo, elegante, simétrico e 100% orientado aos **Escudos Reais das Equipes** e à **Clareza do Chaveamento**.

---

## 2. PROBLEMAS DIAGNOSTICADOS E CORREÇÕES EXECUTADAS

| Item | Problema Anterior (Produção) | Solução Implementada (Broadcast Studio) |
| :--- | :--- | :--- |
| **Escudos das Equipes** | Apenas caixas cinzas com iniciais em texto (`SNK`, `ADU`), sem exibir os logotipos reais cadastrados no PostgreSQL. | Componente universal `TeamCrest` (`src/components/ui/TeamCrest.tsx`) renderizando a imagem real (`logoUrl` / `logo_url`) com moldura nobre, ou fallback determinístico em **SVG Athletic Shield** com gradientes esportivos e tipografia bold calculados pelo nome do clube. |
| **Topologia dos Grupos** | Disposição fragmentada (Grupos A e B na ala esquerda, buraco gigante no centro e Grupo C isolado na direita). | **Grade Simétrica Centralizada Lado a Lado** (`grid-cols-1 lg:grid-cols-3 gap-5 max-w-6xl mx-auto w-full`). Todos os grupos recebem destaque nobre e proporcional. |
| **Linhas das Vagas** | Linhas compactas sem escudos e sem destaque visual da vaga a ser preenchida. | Vagas com altura generosa (`h-16`), escudo em destaque (`44x44px`), número (`01`, `02`), nome completo da equipe, cidade/categoria e badge de cabeça de chave. |
| **Indicador da Próxima Vaga** | O espectador não sabia qual grupo ou vaga receberia a próxima bola sorteada. | A vaga exata que vai receber a bola atual ganha **borda tracejada âmbar pulsante** (`border-amber-500/80 bg-amber-500/10`), ícone animado e o texto `"Sorteando agora..."`. |
| **Visibilidade do Pote** | Espectador não tinha visibilidade de quais equipes ainda estavam no pote aguardando sorteio. | Faixa **"POTE DO SORTEIO (EQUIPES)"** no topo do palco com chips compactos de todas as equipes. Durante o estado `DRAWING`, um feixe de luz em âmbar percorre os escudos em efeito roleta de 1.2s antes de travar no clube sorteado. Equipes sorteadas recebem opacidade reduzida (`opacity-35`), check verde e badge do grupo (`GA`, `GB`, `GC`). |
| **Cena 3D e Fundo** | Esferas 3D gigantes cortadas em primeiro plano colidindo com o card central. | **Câmera de Estúdio Recuada** (`z: 6.8 - 7.2`), mantendo a Urna de Cristal e o pedestal escultural no fundo como elemento cenográfico majestoso, com gradiente escuro de transmissão (`#070b14` -> `#0f172a`), linhas sutis de quadra/telemetria e esferas contidas harmoniosamente dentro da urna. |
| **Spotlight Hero Reveal** | Card estático que obstruía a visão geral. | **Spotlight Broadcast Card** com escudo gigante da equipe (`96x96px` a `112x112px`), studio glow dourado, nome oficial do clube e pílula de destino (`➔ ALOCADO NO GRUPO B • 1ª VAGA`), avançando automaticamente ou com clique manual. |

---

## 3. ARQUITETURA DO COMPONENTE UNIVERSAL DE ESCUDOS (`TeamCrest`)

Criado em `src/components/ui/TeamCrest.tsx`:
- Suporta propriedades flexíveis: `team`, `logoUrl`, `name`, `shortName`, `size` (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `custom`).
- Tratamento de erro automático com `onError`: se uma URL quebrar ou falhar, o componente transiciona instantaneamente para o brasão vetorial SVG sem quebrar o layout.
- Paleta determinística de 10 gradientes atléticos de alta definição (Royal Blue/Cyan, Amber/Gold, Crimson/Rose, Forest/Emerald, Indigo/Violet, Teal, Burnt Orange, Navy, Titanium).
- Utilizado em:
  - `DrawArenaHUD.tsx` (Pote, Grade de Grupos `44x44px`, Hero Reveal `112x112px`, Gaveta e Apoteose Final);
  - `DrawScene3D.tsx` (Fallback 2D/CSS);
  - `DrawPage.tsx` (Linhas arrastáveis do sorteio);
  - `TeamsPage.tsx` (Tabela de gestão de agremiações);
  - `TeamPortalPage.tsx` e `EditTeamModal.tsx` (Portal do dirigente e pré-visualização de escudo).

---

## 4. AUDITORIA DE INTEGRIDADE DO POSTGRESQL E MAPEAMENTO

1. **Equipes do Campeonato Ativo:**
   Inspecionadas e 100% preservadas no banco de dados `supabase_db_baseOs-voltz` (`comp-9008fe63-7a10-46bc-bf69-9a7dbb00865f`). Todas as 9 equipes possuem dados de imagem válidos gravados na coluna `teams.logo_url` (`AAADU Preguiça`, `SNK'S CORE`, `OVERZONE`, `AVQI`, etc.).
2. **Mapeamento de Dados (`dataAccess.ts` & `teamMapper.ts`):**
   - Leitura: `row.logo_url` -> `domain.logoUrl`.
   - Escrita: `domain.logoUrl` -> `payload.logo_url`.
   - Preservado tanto no sorteio oficial quanto no Modo Simulação (onde a 10ª equipe sintetizada também herda brasão vetorial de alta definição).

---

## 5. QUALITY GATES E VALIDAÇÕES TÉCNICAS

- **TypeScript Compilation:**
  ```bash
  npx tsc -p tsconfig.app.json --noEmit
  # Resultado: 0 erros
  ```
- **Linting de Código:**
  ```bash
  npm run lint
  # Resultado: 0 erros (apenas warnings de Fast Refresh em TenantContext)
  ```
- **Testes Unitários:**
  - `src/test/teamCrest.test.tsx` -> **4/4 PASS**
  - `src/test/drawScene3D.test.tsx` -> **5/5 PASS**
  - `src/test/drawArenaDecouplingPhaseB.test.tsx` -> **6/6 PASS**
  - `src/test/drawPage.test.tsx` -> **1/1 PASS**
  - `src/test/drawService.test.tsx` -> **PASS**
- **Build de Produção:**
  - Vite Production Bundle compilado e container `baseos-frontend` atualizado em produção.
  - Endpoints `https://voltz.baseos.online` e `https://www.baseos.online` operacionais com HTTP 200 OK.
