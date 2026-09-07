# MIGRATION-STRATEGY: Estratégia de Migração da Persistência Sem Big-Bang

**Projeto:** BaseOS  
**Fase:** 4.5 — Auditoria e Arquitetura da Persistência do Competition Format Engine  
**Data:** 05/09/2026  
**Status:** ESTRATÉGIA APROVADA — SEM ALTERAÇÃO DE CÓDIGO NESTA FASE  
**Workspace:** `/home/diego-martins/docker/volei`  

---

## 1. PRINCÍPIO FUNDAMENTAL: ZERO BIG-BANG

O BaseOS já possui competições criadas, partidas em andamento, inscrições homologadas e súmulas arquivadas em produção. Qualquer estratégia de migração que exija uma parada completa do sistema (*downtime*) ou reescrita destrutiva de tabelas existentes é **inaceitável**.

### Comparação das Opções de Migração:

| Estratégia | Abordagem | Risco | Veredito |
|---|---|---|---|
| **Opção 1 — Big-Bang** | Recriar todas as tabelas e migrar tudo de uma vez. | **Catastrófico**. Qualquer erro quebra a app e invalida competições ativas. | **REJEITADA** |
| **Opção 2 — Modelos Paralelos (`matches_v2`)** | Manter schema legado e criar schema paralelo novo para novas competições. | **Alto**. Duplica código de UI, relatórios, PDFs e cria débitos perpétuos. | **REJEITADA** |
| **Opção 3 — Migração Incremental Não-Destrutiva (Recomendada)** | Adicionar extensões e tabelas de runtime gradualmente, mantendo compatibilidade retroativa total com torneios legados. | **Mínimo**. Torneios antigos continuam funcionando sem alteração; novos usam as tabelas de estágios. | **APROVADA** |

---

## 2. ETAPAS DO ROLLOUT INCREMENTAL (FUTURAS FASES 4.6+)

A migração será implementada de forma estritamente controlada ao longo das próximas fases:

```text
[Fase 1: Schema Ext] ──► [Fase 2: Nullable-First] ──► [Fase 3: Backfill Legado]
                                                              │
[Fase 6: Aposentadoria] ◄── [Fase 5: Dual-Read/Write] ◄───────┘
```

---

### Etapa 1: DDL Não-Destrutivo (Tabelas de Runtime de Fases)
- **Ação:** Criação das tabelas `competition_stages`, `competition_rounds` e `competition_match_slots` sem alterar nenhuma coluna das tabelas existentes (`competitions`, `matches`, `teams`).
- **Impacto em Produção:** Zero. Nenhuma query existente é afetada.

---

### Etapa 2: Nullable-First em `public.matches`
- **Ação:** Tornar `team_a_id` e `team_b_id` opcionais na tabela `matches` para suportar partidas pré-agendadas com participantes ainda desconhecidos:
  ```sql
  ALTER TABLE public.matches ALTER COLUMN team_a_id DROP NOT NULL;
  ALTER TABLE public.matches ALTER COLUMN team_b_id DROP NOT NULL;
  ```
- **Compatibilidade:** Partidas existentes continuam 100% preenchidas. Partidas novas de playoffs podem ser persistidas antecipadamente com segurança.

---

### Etapa 3: Backfill Determinístico para Competições Legadas
- **Ação:** Script idempotente que varre as competições existentes e cria automaticamente suas representações de estágios e rodadas no novo modelo:
  - Para torneios com `format = 'round-robin'` ou `groups`:
    Cria um registro em `competition_stages` com `stage_id = 'groups'` e `name = 'Fase Classificatória'`, e vincula as partidas existentes a esse estágio.
  - Para torneios com playoffs gerados no modelo antigo:
    Cria um registro em `competition_stages` com `stage_id = 'knockout'` e `name = 'Fase Eliminatória'`.
- **Garantia:** Nenhum histórico de jogo é modificado. Nenhuma súmula é alterada.

---

### Etapa 4: RPC Atômica de Sorteio (`save_stage_draw_and_slots`)
- **Ação:** Substitui as 3 chamadas REST desconexas de `dataAccess.saveDrawWithMatches` (identificadas como blocker `PERSIST-002`) por uma função PostgreSQL atômica (`SECURITY DEFINER`).
- **Garantia:** Se ocorrer qualquer falha durante a geração dos confrontos, o PostgreSQL desfaz toda a operação automaticamente (*automatic rollback*).

---

### Etapa 5: Camada de Compatibilidade em `dataAccess.ts`
- **Ação:** O `dataAccess` passa a ler primariamente das tabelas de estágios e slots quando presentes (`competition_stages`), e faz fallback gracioso para o formato legado quando a competição for antiga e não tiver sido migrada.
- **Resultado:** A interface do usuário (UI), a página de súmulas e o portal público funcionam perfeitamente para qualquer torneio, antigo ou novo.

---

### Etapa 6: Aposentadoria Gradual do Código Legado
- **Ação:** Após homologação completa e estabilização de todos os torneios no novo modelo, as heurísticas legadas de `playoffsService.ts` e campos de string solta (`matches.phase`) são descontinuados.

---

## 3. PLANO DE CONTINGÊNCIA E ROLLBACK

Se durante o rollout de qualquer migration em fases futuras houver alguma anomalia, o plano de rollback garante recuperação imediata sem perda de dados:

1. **Reversão de Nullable-First:** `matches` pode voltar a exigir NOT NULL caso nenhuma partida nova com nulos tenha sido gravada.
2. **Reversão das Tabelas de Runtime:** `DROP TABLE competition_match_slots`, `DROP TABLE competition_rounds`, `DROP TABLE competition_stages` não afeta a tabela `matches`, pois nenhuma coluna de `matches` depende de FKs dessas tabelas no sentido inverso.
3. **Persistência de Segurança:** Todas as migrações serão executadas com backup prévio de snapshot via Supabase CLI / pg_dump.
