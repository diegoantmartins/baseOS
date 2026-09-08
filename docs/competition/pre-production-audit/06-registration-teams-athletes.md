# BaseOS — Auditoria de Inscrições, Equipes e Atletas (Fase 4.PRE)

**Arquivo Auditado:** `src/services/competitionRegistrationService.ts`, `src/services/competitionDrawEligibilityService.ts`, `src/services/registrationService.ts`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. Limites Canônicos de Elenco

Todos os limites de atletas são derivados dinamicamente de `CompetitionRulesService.getRosterLimits(competition)`, eliminando números mágicos hardcoded:

| Regra de Elenco | Voleibol de Quadra | Vôlei de Praia | Origem |
| :--- | :---: | :---: | :--- |
| Mínimo de Atletas | 6 | 2 | `config.registration.minAthletes` |
| Máximo de Atletas | 14 | 4 | `config.registration.maxAthletes` |
| Máximo de Líberos | 2 | 0 | `config.registration.maxLiberos` |
| Máximo de Capitães | 1 | 1 | `config.registration.maxCaptains` |
| Camisa na Inscrição | Configurável | Configurável | `config.registration.requireJerseyNumberOnRegistration` |

---

## 2. Validações de Integridade do Atleta (`validateAthleteRegistration`)

O serviço `CompetitionRegistrationService.validateAthleteRegistration` executa as seguintes checagens em cascata:

1. **Ciclo de Vida da Competição:** Se o status for `registration-closed`, `groups-defined`, `in-progress` ou `completed`, qualquer adição ou edição de atleta é bloqueada.
2. **Prazo Individual da Equipe (`isRegistrationLocked`):** Se a equipe tiver prazo específico expirado ou status `'locked'`, as alterações são rejeitadas.
3. **Dados Obrigatórios:** Nome completo e posição esportiva são estritamente requeridos.
4. **Teto de Elenco:** Impede exceder o limite máximo da competição (`limits.max`).
5. **Numeração de Camisa:**
   - Deve ser inteiro entre 1 e 99.
   - Deve ser único dentro da equipe (impede duas camisas iguais).
6. **Controle de Líberos e Capitães:**
   - Impede mais de 1 capitão ativo.
   - Impede mais de 2 líberos na quadra e rejeita líbero no vôlei de praia (máx 0).
7. **Unicidade de Atleta no Torneio:**
   - Impede que o mesmo atleta (comparação por número de documento ou nome normalizado) seja inscrito em duas equipes diferentes na mesma competição.

---

## 3. Elegibilidade para o Sorteio (`CompetitionDrawEligibilityService`)

Antes de realizar o sorteio de grupos, o serviço avalia a elegibilidade de cada equipe:
- Uma equipe só é elegível se seu elenco confirmado possuir número de atletas $\ge \text{minAthletes}$ da competição.
- Equipes incompletas são sinalizadas na interface com badge de pendência e são desabilitadas para seleção de chaveamento até a regularização do elenco.
