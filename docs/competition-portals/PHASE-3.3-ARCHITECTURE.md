# BASEOS — FASE 3.3: ARQUITETURA TÉCNICA DO PORTAL PÚBLICO E QR CODE

**Data:** 05/09/2026  
**Sistema:** BaseOS  
**Fase:** 3.3 — Portal Público da Competição, QR Code e Experiência do Espectador  
**Classificação:** **DOCUMENTO ARQUITETURAL DEFINITIVO (REVISADO PRÉ-IMPLEMENTAÇÃO)**

---

## 1. Visão Arquitetural das Três Superfícies

O **BaseOS** opera com três superfícies conceituais bem definidas e com fronteiras estritas de autorização e privacidade:

```text
                         BASEOS
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
       ADMIN             EQUIPE             PÚBLICO
          │                 │                 │
    Organizador       Gestor da equipe    Espectador
          │                 │                 │
          ▼                 ▼                 ▼
      /competicoes...   /equipe/inscricao/:token    /c/:slug
```

- **ADMIN (`/competicoes`, `/jogos`, etc.):** Restrito a organizadores/administradores autenticados.
- **EQUIPE (`/equipe/inscricao/:token`):** Acessível via token privado para autogestão de elenco até o lock/deadline.
- **PÚBLICO (`/c/:slug`):** Totalmente **READ-ONLY**, sem login, acessível via link direto ou QR Code da competição.

---

## 2. Decisão Definitiva de Rota e Identidade Pública

### 2.1 URL Canônica
```text
/c/:slug
```
**Regras Inegociáveis:**
1. **Identidade Semântica Exclusiva:** A URL pública aceita **apenas o slug** da competição (ex: `/c/copa-cidade-curitiba-2026`).
2. **Rejeição de IDs Internos:** O ID interno da competição (ex: `comp-1`, `comp-d88c6148...`) **NÃO** é aceito como rota pública oficial e **NÃO** é usado como fallback público, evitando exposição de identificadores de banco de dados.
3. **QR Code Conciso:** O QR Code codifica estritamente a URL semântica oficial: `${baseUrl}/c/${slug}`.

---

## 3. Estratégia Canônica de Geração e Estabilidade de Slug

O slug é um identificador público estável, único e legível por humanos.

### 3.1 Algoritmo de Normalização
1. Decomposição Unicode NFD para remoção de acentos:
   `name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")`
2. Conversão para minúsculas: `.toLowerCase()`
3. Substituição de espaços e caracteres especiais por hífens: `.replace(/[^a-z0-9]+/g, "-")`
4. Remoção de hífens nas bordas: `.replace(/^-+|-+$/g, "")`
5. Fallback para nomes sem caracteres alfanuméricos: `'competicao'`

### 3.2 Resolução de Colisões Semânticas
- Caso `copa-cidade-2026` já exista, a próxima competição receberá `copa-cidade-2026-2`, e subsequentemente `copa-cidade-2026-3`.
- **Proibição:** É proibido anexar hashes ou IDs truncados (como `copa-cidade-2026-c1a2`).

### 3.3 Imutabilidade do Slug (Estabilidade de Links e QR Codes)
- O slug é gerado no momento da criação da competição.
- **Regra de Estabilidade:** Uma alteração posterior no nome da competição pelo organizador **NÃO altera o slug**.
- Isso garante que cartazes impressos com QR Code, folders e links compartilhados continuem funcionando durante e após o evento esportivo.

---

## 4. Princípio de Privacidade e Modelo de Dados Público (LGPD)

O modelo de dados público segue o princípio de **exposição mínima necessária para acompanhar a competição**:

### 4.1 Dados Expostos ao Público
1. **Competição:** `id`, `name`, `slug`, `modality`, `format`, `playerFormat`, `setFormat`, `genderCategory`, `status`, `startDate`, `endDate`, `venue`, `config` (regras desportivas).
2. **Equipes Participantes:** `teamId`, `teamName`, `teamShortName`, `logoUrl`, `city`, `state`, `groupName`.
3. **Chaves e Grupos:** Composição de grupos sorteados e confirmados.
4. **Partidas e Confrontos:** `round`, `matchNumber`, equipes envolvidas, data, horário, local, quadra, fase, grupo, parciais de sets e resultado canônico homologado.
5. **Classificação Oficial:** Tabela calculada exclusivamente por `standingsService` (pontos, jogos, vitórias, derrotas, sets vencidos/perdidos, saldo, pontos pró/contra, average).

### 4.2 Dados Omitidos do Público (Proibição Absoluta)
- `access_token` de `competition_teams` (sequestro de equipe).
- `registration_deadline` de `competition_teams`.
- `document_number` (CPF/RG) e `birth_date` de atletas.
- `profiles` (e-mails, logins, dados de gestores e organizadores).
- Logs operacionais de auditoria (`audit_logs`).
- **Atletas no MVP:** O MVP inicial **não expõe elenco de atletas individuais**, mantendo o foco do espectador na disputa esportiva entre as agremiações.

---

## 5. Segurança do Banco e Views Públicas

Para impedir que queries anônimas no Supabase leiam a tabela base `competition_teams` (que contém a coluna sensível `access_token`), a arquitetura adota uma **View Pública Segura**:

```sql
-- View pública de competições
CREATE OR REPLACE VIEW public.public_competitions AS
SELECT
  id, name, slug, modality, format, player_format, set_format,
  gender_category, start_date, end_date, venue, status, config, rules_snapshot
FROM public.competitions;

-- View pública de equipes (SEM access_token e SEM registration_deadline)
CREATE OR REPLACE VIEW public.public_competition_teams AS
SELECT
  ct.id, ct.competition_id, ct.team_id, ct.team_name, ct.team_short_name,
  ct.status as registration_status, ct.is_locked,
  t.city, t.state
FROM public.competition_teams ct
JOIN public.teams t ON t.id = ct.team_id;

GRANT SELECT ON public.public_competitions TO anon, authenticated;
GRANT SELECT ON public.public_competition_teams TO anon, authenticated;
```

---

## 6. Sincronização de Dados e Ausência de Realtime

- **Constatação:** O BaseOS não possui e não utiliza canais de Supabase Realtime nem WebSockets.
- **Definição:** Os dados exibidos no Portal Público são "dados oficiais atualizados conforme a persistência atual do BaseOS".
- A interface pública contará com um botão explícito de recarregamento ("Atualizar dados") para que torcedores e atletas possam atualizar as parciais e classificações sob demanda.

---

## 7. Mapeamento de Lifecycle no Portal Público

O Portal Público respeita rigorosamente os 9 estados canônicos do BaseOS:

| Estado Canônico | Mensagem ao Espectador | Conteúdo Apresentado |
|---|---|---|
| `planning` | "Competição em Planejamento" | Regulamento, formato e datas previstas |
| `registration-open` | "Inscrições Abertas" | Equipes já confirmadas e regulamento |
| `registration-closed` | "Inscrições Encerradas" | Rol oficial das agremiações confirmadas |
| `draw-pending` | "Sorteio Oficial em Preparação" | Informações das equipes, aguardando formação de chaves |
| `groups-defined` | "Grupos e Chaves Definidos" | Grupos sorteados, confrontos gerados e classificação zerada |
| `in-progress` | "Competição em Andamento" | Próximos jogos, placares, classificação e resultados |
| `playoffs` | "Fase Eliminatória / Mata-Mata" | Chaveamento eliminatório e confrontos finais |
| `completed` | "Competição Finalizada" | Campeão, pódio final e classificação consolidada |
| `cancelled` | "Competição Cancelada" | Comunicado e aviso formal de cancelamento |

---

## 8. Arquitetura do QR Code da Competição

1. **Titularidade:** O QR Code pertence exclusivamente à **Competição**. Não há QR Codes de equipes ou atletas.
2. **Destino Único:** Codifica `${baseUrl}/c/${competition.slug}`.
3. **Geração Client-Side:** Renderização vetorial SVG de alta definição, sem dependência de APIs externas de terceiros.
4. **Funcionalidades no Modal:**
   - Visualização com contraste e margem segura (quiet zone).
   - Botão "Copiar Link" com toast sonner.
   - Botão "Baixar QR Code (PNG)" em alta resolução (1024x1024px) para impressão de cartazes de quadra e recepção.
   - Botão "Compartilhar" integrado à Web Share API em dispositivos móveis.

---

## 9. Integração Administrativa Limpa

Acesso ao Portal Público na área administrativa:
- Um ponto de acesso único e elegante no [`CompetitionHeader.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/CompetitionHeader.tsx):
  - Botão "Portal Público" (abre `/c/:slug` em nova aba).
  - Botão "QR Code" (abre o modal oficial de QR Code e compartilhamento).
- Sem poluição visual ou botões redundantes na interface.

---

## 10. Estrutura UX Mobile-First do Portal Público

Navegação em abas táteis para smartphones (375px), tablets (768px) e desktop (1280px):
```text
┌───────────────────────────────────────────────┐
│ Logo BaseOS                 [ Compartilhar/QR ]│
│ Nome da Competição                            │
│ Modalidade · Gênero · Status Oficial          │
└───────────────────────────────────────────────┘
  [ Visão Geral ] [ Classificação ] [ Jogos ] [ Grupos ] [ Equipes ]
```

---

## 11. Lista Exata de Arquivos a Serem Modificados na Fase de Implementação

Nenhum arquivo foi alterado nesta etapa de revisão. A implementação futura envolverá exclusivamente:

### Banco de Dados / Migrations
- `supabase/migrations/20260905000005_competition_slug_and_views.sql`

### Tipos e Dados
- `src/types/entities.ts` (adicionar `slug?: string` a `CompetitionRecord`)
- `src/data/seed.ts` (adicionar slugs às competições do seed)

### Serviços
- `src/services/dataAccess.ts` (adicionar leitura por slug)
- `src/services/publicCompetitionService.ts` (novo serviço público e gerador determinístico de slug)

### Componentes e Telas
- `src/components/public/CompetitionQRCodeModal.tsx` (novo modal de QR Code)
- `src/pages/PublicCompetitionPage.tsx` (nova página do portal público)
- `src/App.tsx` (registro da rota `/c/:slug`)
- `src/components/competition/CompetitionHeader.tsx` (botões de acesso público e QR Code)

### Testes
- `src/test/publicCompetitionPortal.test.ts` (novos testes de integração e segurança)

### Documentação
- `docs/competition-portals/PHASE-3.3-IMPLEMENTATION.md`
- `docs/competition-portals/PUBLIC-PORTAL.md`
- `docs/competition-portals/QR-CODE.md`
- `docs/competition-portals/PHASE-3.3-WALKTHROUGH.md`
