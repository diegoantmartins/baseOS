# BaseOS — Auditoria de Ciclo de Vida e Congelamento de Regras (Fase 4.PRE)

**Arquivo Auditado:** `src/services/competitionLifecycleService.ts`, `src/services/competitionRulesService.ts`, `src/components/competition/dialogs/CompetitionSettingsEditDialog.tsx`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. Máquina de Estados do Ciclo de Vida

O ciclo de vida de uma competição no BaseOS é gerenciado exclusivamente por `CompetitionLifecycleService`:

```text
planning (Planejamento)
    ↓
registration-open (Inscrições Abertas)
    ↓
registration-closed (Inscrições Encerradas)
    ↓
groups-defined (Grupos e Jogos Gerados pelo Sorteio)
    ↓
in-progress (Competição em Andamento / Partidas Iniciadas)
    ↓
playoffs (Fase Final / Mata-Mata)
    ↓
completed (Competição Finalizada e Homologada)
```

---

## 2. Congelamento Imutável de Regras (`rulesSnapshot`)

A proteção de regras opera em três camadas de defesa intransponíveis:

### Camada 1 — Domínio (`CompetitionRulesService.areRulesLocked`)
- As regras são consideradas travadas se:
  1. Já existir um `rulesSnapshot` persistido;
  2. A contagem de partidas jogadas/homologadas for $> 0$;
  3. O status for `in-progress`, `playoffs`, `completed` ou `cancelled`.
- Se as regras estiverem travadas, qualquer tentativa de alteração estrutural no regulamento é rejeitada.

### Camada 2 — Camada de Acesso a Dados (`dataAccess.updateCompetition`)
- Tanto o adaptador LocalStorage quanto o Supabase verificam se o registro existente já possui `rulesSnapshot`. Em caso positivo, o valor do snapshot é preservado incondicionalmente, ignorando qualquer tentativa de sobrescrita no payload de atualização.

### Camada 3 — Banco de Dados Físico (`trg_protect_competition_rules_snapshot`)
- Trigger no PostgreSQL dispara exceção com `RAISE EXCEPTION` caso uma instrução `UPDATE` tente alterar o valor de `rules_snapshot` quando este já for diferente de `NULL`.

---

## 3. Preservação na Edição Rápida (`CompetitionSettingsEditDialog`)

Ao editar os sets de uma competição em fase de planejamento (`planning`):
- O diálogo realiza atualização imutável e parcial **estritamente sobre** `format.defaultSetsToWin` e `format.phaseOverrides`.
- As seções `scoring`, `standings`, `registration` e `stages` existentes no `CompetitionConfig` permanecem 100% intactas.
- A chamada destrutiva anterior a `normalizeLegacyToConfig` foi completamente eliminada para competições com config canônico.
