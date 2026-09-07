# BaseOS — Arquitetura de Templates de Competição

**Fase:** 4.10 — Format Builder, Templates, Configuration Authoring & Competition Setup  
**Data:** 2026-09-06  
**Status:** HOMOLOGADO  

---

## 1. O que é um Template no BaseOS?

No BaseOS, um **Template** é estritamente:

> **Um preset inicial que produz uma instância declarativa de `CompetitionConfig`.**

Um template:
- **NÃO é um motor de competição;**
- **NÃO é um tipo estrutural em banco de dados;**
- **NÃO é referenciado pelo runtime durante a execução dos jogos;**
- **NÃO gera acoplamento futuro com a competição.**

Uma vez que o template instancia o `CompetitionConfig`, ele cumpre integralmente seu ciclo de vida. A competição segue governada exclusivamente pela Single Source of Truth (`CompetitionConfig`).

---

## 2. Catálogo Canônico de Templates Genéricos

Localizado em `src/services/competitionTemplateService.ts`, o serviço oferece presets exclusivamente genéricos (sem nomes proprietários ou torneios específicos):

### 2.1 `round-robin-standard` (Todos Contra Todos)
- **Fases:** 1 fase única (`type: 'round-robin'`);
- **Entrada:** Todas as equipes inscritas (`all-teams`);
- **Rodadas:** Geradas de acordo com a quantidade de participantes;
- **Classificação:** Tabela única ordenada pelos critérios canônicos de desempate.

### 2.2 `groups-knockout-standard` (Grupos Classificatórios + Mata-Mata)
- **Fase 1:** Grupos (`type: 'group-stage'`, 2 ou 4 grupos);
- **Fase 2:** Mata-mata (`type: 'knockout'`), dependente da Fase 1;
- **Feeds:** Cruzamento olímpico de posições dos grupos (`group-position`, ex: 1º Grupo A vs. 2º Grupo B);
- **Eliminatória:** Semifinais e Final (com disputa opcional de 3º lugar).

### 2.3 `groups-play-in-knockout-standard` (Grupos + Play-In + Mata-Mata)
- **Fase 1:** 4 grupos (`type: 'group-stage'`);
- **Fase 2:** Play-In (`type: 'play-in'`), dependente da Fase 1;
  - Feeds: Equipes intermediárias do ranking geral (`overall-ranking`, posições 5º a 12º);
- **Fase 3:** Quartas de Final / Mata-Mata (`type: 'knockout'`), dependente da Fase 1 e Fase 2;
  - Feeds: 1º a 4º do ranking geral (classificados diretos para QF) + 4 vencedores dos confrontos de Play-In (`match-winner`);
- **Semis e Final:** Progressão normal até a decisão do título.
- **Caso Notável:** Este template é a prova de generalização do formato Voltz, sem que nenhuma linha de código específico precise existir no sistema.

### 2.4 `knockout-standard` (Mata-Mata Direto)
- **Fases:** 1 fase eliminatória (`type: 'knockout'`, chave de 4, 8 ou 16);
- **Feeds:** Distribuição por chave de ranqueamento (`seed`, 1 a N) ou `resolved-team`;
- **Suporte a BYE:** Se o número de inscritos for inferior à potência de 2, os slots excedentes recebem a referência estrutural legítima `{ type: 'bye' }`.

---

## 3. Fluxo de Vida: Do Template à Execução

```text
1. Organizador seleciona Template (ex: Groups -> Play-In -> Knockout)
      ↓
2. CompetitionTemplateService.createConfigFromTemplate(id, options)
      ↓
3. Instância pura de CompetitionConfig gerada em memória
      ↓
4. Usuário customiza fases, feeds, pontuação e sets no Builder
      ↓
5. CompetitionConfigValidator.validate(config)
      ↓
6. dataAccess.updateCompetition(competitionId, { config })
      ↓
7. Persistência em competitions.config (JSONB)
      ↓
8. Execução: CompetitionRuntimeService consome apenas competitions.config
   (O template original é 100% irrelevante para a execução esportiva)
```

---

## 4. Por que Templates Não Interferem no Runtime?

Se amanhã um desenvolvedor apagar todos os templates do arquivo `competitionTemplateService.ts`, **todas as competições criadas continuarão funcionando perfeitamente**.

Isso ocorre porque:
1. A tabela `competitions` armazena o regulamento esportivo completo na coluna `config` (JSONB) e, após congelamento, em `rules_snapshot` (JSONB);
2. Nenhuma tabela possui chave estrangeira para `template_id`;
3. O `StageGraph`, o `GenericPairingEngine` e o `CompetitionRuntimeService` desconhecem a palavra "template". Eles operam exclusivamente sobre nós de estágios, rodadas e referências de participantes declaradas no `CompetitionConfig`.
