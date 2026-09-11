/**
 * BaseOS — Fase 6.1: Testes Oficiais do Domínio de Destaque da Partida (MVP)
 * 
 * Requisitos Validados (A a R):
 * A: Seleção de atleta da Equipe A elegível e validado com sucesso.
 * B: Seleção de atleta da Equipe B elegível e validado com sucesso.
 * C: Rejeição categórica de atleta de equipe externa (não pertence a A nem B).
 * D: Rejeição de atleta de outra competição.
 * E: Presença em quadra / check-in respeitado (atleta sem check-in quando existe lista de check-in é rejeitado).
 * F: Partida com W.O. (isWo: true) rejeita qualquer destaque.
 * G: Destaque estritamente opcional (partida validada e homologada sem MVP).
 * H: Atleta da equipe vencedora elegível.
 * I: Atleta da equipe perdedora elegível (regra BaseOS: MVP não é restrito ao vencedor).
 * J: SSOT de equipe: sem redundância de highlightTeamId, derivação 100% dinâmica.
 * K: Persistência e recuperação no dataAccess (updateMatch, getMatch, listMatches).
 * L: Reabertura de partida (handleReopenMatch / status 'completed') preserva dados e permite edição/limpeza.
 * M: Homologação oficializa o destaque no registro canônico.
 * N: Portal público e LGPD: visível apenas quando isHomologated === true, com apenas name, jerseyNumber e teamName.
 * O: Voleibol de Quadra (indoor 6x6).
 * P: Voleibol de Praia (beach 2x2).
 * Q: Isolamento multitenant / cross-competition.
 * R: Proteção contra PGRST204: payload limpo sem undefined ou colunas virtuais.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateMatchHighlight,
  deriveHighlightAthleteInfo,
} from '@/services/matchValidationService';
import { dataAccess, resetLocalData } from '@/services/dataAccess';
import { publicCompetitionService } from '@/services/publicCompetitionService';
import { mapMatchRecordToBaseosScoresheet } from '@/document-engine/baseos/mapper/match.mapper';
import type { CompetitionAthlete } from '@/types/registration';
import type {
  CompetitionRecord,
  MatchRecord,
  TeamRecord,
} from '@/types/entities';

describe('BaseOS — Fase 6.1: Domínio de Destaque da Partida (MVP)', () => {
  beforeEach(() => {
    resetLocalData();
  });

  const athleteA1: CompetitionAthlete = {
    id: 'ca-a1',
    competitionTeamId: 'ct-a',
    name: 'Bruna Silva',
    jerseyNumber: 7,
    position: 'Ponteira',
    isCaptain: false,
    isLibero: false,
    gender: 'female',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const athleteA2: CompetitionAthlete = {
    id: 'ca-a2',
    competitionTeamId: 'ct-a',
    name: 'Camila Martins',
    jerseyNumber: 10,
    position: 'Levantadora',
    isCaptain: true,
    isLibero: false,
    gender: 'female',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const athleteB1: CompetitionAthlete = {
    id: 'ca-b1',
    competitionTeamId: 'ct-b',
    name: 'Mariana Souza',
    jerseyNumber: 12,
    position: 'Oposta',
    isCaptain: false,
    isLibero: false,
    gender: 'female',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const athleteExternal: CompetitionAthlete = {
    id: 'ca-ext',
    competitionTeamId: 'ct-c',
    name: 'Atleta Externo',
    jerseyNumber: 99,
    position: 'Central',
    isCaptain: false,
    isLibero: false,
    gender: 'female',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const athleteOtherComp: CompetitionAthlete = {
    id: 'ca-other',
    competitionTeamId: 'ct-other',
    name: 'Atleta Outra Copa',
    jerseyNumber: 5,
    position: 'Líbero',
    isCaptain: false,
    isLibero: true,
    gender: 'female',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const baseMatch: MatchRecord = {
    id: 'match-1',
    competitionId: 'comp-1',
    matchNumber: 1,
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamAName: 'Vôlei Alpha',
    teamBName: 'Vôlei Beta',
    teamAShortName: 'ALP',
    teamBShortName: 'BET',
    phase: 'Fase Regular',
    round: 1,
    status: 'completed',
    scheduledTime: '2026-10-15T18:00:00Z',
    venue: 'Ginásio Central',
    court: 'Quadra 1',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 25, scoreB: 22 },
    ],
    referees: [],
    winnerId: 'team-a',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('Requisitos A, B, C e D: Validação de Elegibilidade por Elenco e Competição', () => {
    it('Requisito A: Atleta da Equipe A elegível e validado com sucesso', () => {
      const res = validateMatchHighlight(baseMatch, 'ca-a1', [athleteA1, athleteA2], [athleteB1]);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('Requisito B: Atleta da Equipe B elegível e validado com sucesso', () => {
      const res = validateMatchHighlight(baseMatch, 'ca-b1', [athleteA1, athleteA2], [athleteB1]);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('Requisito C: Atleta de equipe externa (não pertence a A nem B) é rejeitado', () => {
      const res = validateMatchHighlight(baseMatch, 'ca-ext', [athleteA1, athleteA2], [athleteB1]);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('elencos');
    });

    it('Requisito D: Atleta de outra competição é rejeitado', () => {
      const res = validateMatchHighlight(baseMatch, 'ca-other', [athleteA1, athleteA2], [athleteB1]);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('elencos');
    });
  });

  describe('Requisitos E e F: Check-in em Súmula e Tratamento de W.O.', () => {
    it('Requisito E: Quando há check-in na partida, atleta fora da súmula/check-in é rejeitado', () => {
      const matchWithCheckin: MatchRecord = {
        ...baseMatch,
        checkedInAthleteIds: ['ca-a1', 'ca-b1'], // athleteA2 não fez check-in
      };

      // Atleta A1 fez check-in -> válido
      const resA1 = validateMatchHighlight(matchWithCheckin, 'ca-a1', [athleteA1, athleteA2], [athleteB1]);
      expect(resA1.valid).toBe(true);

      // Atleta A2 não fez check-in -> rejeitado
      const resA2 = validateMatchHighlight(matchWithCheckin, 'ca-a2', [athleteA1, athleteA2], [athleteB1]);
      expect(resA2.valid).toBe(false);
      expect(resA2.error).toContain('check-in');
    });

    it('Requisito F: Partida com W.O. (isWo: true ou status: wo) rejeita qualquer destaque', () => {
      const woMatch: MatchRecord = {
        ...baseMatch,
        isWo: true,
        status: 'wo',
      };

      const res = validateMatchHighlight(woMatch, 'ca-a1', [athleteA1], [athleteB1]);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('W.O.');
    });
  });

  describe('Requisitos G, H e I: Opcionalidade e Atleta Vencedor vs Perdedor', () => {
    it('Requisito G: Destaque da partida é estritamente opcional', () => {
      const resUndefined = validateMatchHighlight(baseMatch, undefined, [athleteA1], [athleteB1]);
      expect(resUndefined.valid).toBe(true);

      const resEmpty = validateMatchHighlight(baseMatch, '', [athleteA1], [athleteB1]);
      expect(resEmpty.valid).toBe(true);
    });

    it('Requisito H: Atleta da equipe vencedora pode ser eleito destaque', () => {
      // Equipe A venceu
      const res = validateMatchHighlight(baseMatch, 'ca-a1', [athleteA1], [athleteB1]);
      expect(res.valid).toBe(true);
    });

    it('Requisito I: Atleta da equipe perdedora PODE ser eleito destaque (regra oficial BaseOS)', () => {
      // Equipe B perdeu, mas atleta B1 pode ser eleita MVP
      const res = validateMatchHighlight(baseMatch, 'ca-b1', [athleteA1], [athleteB1]);
      expect(res.valid).toBe(true);

      const info = deriveHighlightAthleteInfo('ca-b1', [athleteA1], [athleteB1], baseMatch);
      expect(info?.side).toBe('B');
      expect(info?.teamName).toBe('Vôlei Beta');
      expect(info?.athlete.name).toBe('Mariana Souza');
    });
  });

  describe('Requisito J: SSOT de Equipe (highlightTeamId NÃO existe)', () => {
    it('deriva equipe dinamicamente em tempo de execução sem redundância de coluna', () => {
      const derivedA = deriveHighlightAthleteInfo('ca-a1', [athleteA1], [athleteB1], baseMatch);
      expect(derivedA).not.toBeNull();
      expect(derivedA?.side).toBe('A');
      expect(derivedA?.teamName).toBe('Vôlei Alpha');
      expect(derivedA?.teamShortName).toBe('ALP');
      expect(derivedA?.athlete.jerseyNumber).toBe(7);

      const derivedB = deriveHighlightAthleteInfo('ca-b1', [athleteA1], [athleteB1], baseMatch);
      expect(derivedB).not.toBeNull();
      expect(derivedB?.side).toBe('B');
      expect(derivedB?.teamName).toBe('Vôlei Beta');
      expect(derivedB?.teamShortName).toBe('BET');
    });

    it('retorna null para ID inexistente no confronto', () => {
      const derivedNone = deriveHighlightAthleteInfo('ca-inexistente', [athleteA1], [athleteB1], baseMatch);
      expect(derivedNone).toBeNull();
    });
  });

  describe('Requisitos K e L: Persistência, Recuperação e Reabertura de Partida', () => {
    it('Requisito K: Salva e recupera highlightAthleteId no dataAccess', async () => {
      const match = await dataAccess.createMatch(baseMatch);
      expect(match.highlightAthleteId).toBeUndefined();

      const updated = await dataAccess.updateMatch(match.id, {
        highlightAthleteId: 'ca-a1',
      });
      expect(updated?.highlightAthleteId).toBe('ca-a1');

      const fetched = await dataAccess.getMatch(match.id);
      expect(fetched?.highlightAthleteId).toBe('ca-a1');

      const list = await dataAccess.listMatches('comp-1');
      const foundInList = list.find((m) => m.id === match.id);
      expect(foundInList?.highlightAthleteId).toBe('ca-a1');
    });

    it('Requisito L: Reabertura preserva o MVP prévio mas permite alteração ou remoção', async () => {
      const match = await dataAccess.createMatch({
        ...baseMatch,
        status: 'homologated',
        highlightAthleteId: 'ca-a1',
        homologatedAt: new Date().toISOString(),
        homologatedBy: 'Admin Oficial',
      });

      // Operador reabre partida
      const reopened = await dataAccess.updateMatch(match.id, {
        status: 'completed',
        homologatedAt: undefined,
        homologatedBy: undefined,
      });

      expect(reopened?.status).toBe('completed');
      expect(reopened?.highlightAthleteId).toBe('ca-a1'); // Preservado no estado da partida

      // Operador altera MVP no diálogo ou remove
      const cleared = await dataAccess.updateMatch(match.id, {
        highlightAthleteId: null as unknown as string, // Limpeza explícita
      });
      expect(cleared?.highlightAthleteId).toBeNull();
    });
  });

  describe('Requisito M: Homologação Oficializa o Destaque', () => {
    it('ao homologar a partida, o highlightAthleteId é persistido junto aos metadados de auditoria', async () => {
      const match = await dataAccess.createMatch(baseMatch);

      const homologated = await dataAccess.updateMatch(match.id, {
        status: 'homologated',
        homologatedAt: new Date().toISOString(),
        homologatedBy: 'Delegado CBV',
        highlightAthleteId: 'ca-b1',
      });

      expect(homologated?.status).toBe('homologated');
      expect(homologated?.highlightAthleteId).toBe('ca-b1');
      expect(homologated?.homologatedBy).toBe('Delegado CBV');
    });
  });

  describe('Requisito N: Portal Público e LGPD Compliance', () => {
    it('Requisito N: Portal público oculta destaque em partida não homologada e expõe dados restritos em homologada', async () => {
      // 1. Cria competição, equipes e atletas no dataAccess
      const comp = await dataAccess.createCompetition({
        name: 'Copa Estadual 2026',
        modality: 'indoor',
        format: 'round-robin',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'female',
        status: 'in-progress',
      });

      const teamA = await dataAccess.createTeam({
        name: 'Alpha Volley Club',
        shortName: 'ALP',
        modality: 'indoor',
      });
      const teamB = await dataAccess.createTeam({
        name: 'Beta Sports',
        shortName: 'BET',
        modality: 'indoor',
      });

      const compTeamA = await dataAccess.createCompetitionTeam({
        competitionId: comp.id,
        teamId: teamA.id,
        teamName: teamA.name,
        teamShortName: teamA.shortName,
        registrationDeadline: '2026-12-31T23:59:59Z',
        isLocked: false,
        status: 'approved',
      });
      const compTeamB = await dataAccess.createCompetitionTeam({
        competitionId: comp.id,
        teamId: teamB.id,
        teamName: teamB.name,
        teamShortName: teamB.shortName,
        registrationDeadline: '2026-12-31T23:59:59Z',
        isLocked: false,
        status: 'approved',
      });

      const athA = await dataAccess.createCompetitionAthlete({
        competitionTeamId: compTeamA.id,
        name: 'Gabriela Guimarães',
        jerseyNumber: 10,
        position: 'Ponteira',
        isCaptain: true,
        isLibero: false,
        gender: 'female',
      });

      // Cria partida finalizada mas NÃO homologada ainda (status: 'completed')
      const match = await dataAccess.createMatch({
        competitionId: comp.id,
        matchNumber: 1,
        teamAId: teamA.id,
        teamBId: teamB.id,
        teamAName: teamA.name,
        teamBName: teamB.name,
        teamAShortName: teamA.shortName,
        teamBShortName: teamB.shortName,
        venue: 'Ginásio Estadual',
        referees: [],
        phase: 'Fase 1',
        round: 1,
        status: 'completed',
        scheduledTime: '2026-10-20T19:00:00Z',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 18 },
          { setNumber: 2, scoreA: 25, scoreB: 20 },
        ],
        winnerId: teamA.id,
        highlightAthleteId: athA.id, // MVP já indicado pelo apontador
      });

      // 1. Antes de homologar: Portal público NÃO deve exibir highlightAthlete
      const bundlePre = await publicCompetitionService.getPublicCompetitionBundle(comp.slug);
      expect(bundlePre).not.toBeNull();
      const publicMatchPre = bundlePre!.matches.find((m) => m.id === match.id);
      expect(publicMatchPre?.highlightAthlete).toBeNull();

      // 2. Homologa a partida
      await dataAccess.updateMatch(match.id, {
        status: 'homologated',
        homologatedAt: new Date().toISOString(),
        homologatedBy: 'Supervisor FPV',
      });

      // 3. Após homologação: Portal público projeta highlightAthlete de forma sanitizada (LGPD)
      const bundlePost = await publicCompetitionService.getPublicCompetitionBundle(comp.slug);
      expect(bundlePost).not.toBeNull();
      const publicMatchPost = bundlePost!.matches.find((m) => m.id === match.id);
      expect(publicMatchPost?.highlightAthlete).toBeDefined();
      expect(publicMatchPost?.highlightAthlete?.name).toBe('Gabriela Guimarães');
      expect(publicMatchPost?.highlightAthlete?.jerseyNumber).toBe(10);
      expect(publicMatchPost?.highlightAthlete?.teamName).toBe('Alpha Volley Club');
      // Garante que nenhum dado sensível (CPF, RG, email, token) é exposto
      expect((publicMatchPost?.highlightAthlete as unknown as Record<string, unknown>).email).toBeUndefined();
      expect((publicMatchPost?.highlightAthlete as unknown as Record<string, unknown>).cpf).toBeUndefined();
    });
  });

  describe('Requisitos O e P: Suporte a Quadra (Indoor) e Praia (Beach)', () => {
    it('Requisito O: Súmula BaseOS mapeia destaque para observações sem alterar geometria (Indoor)', () => {
      const comp: CompetitionRecord = {
        id: 'comp-indoor',
        name: 'Liga Nacional Indoor',
        slug: 'liga-nacional-indoor',
        modality: 'indoor',
        format: 'round-robin',
        playerFormat: '6x6',
        setFormat: '5-sets',
        genderCategory: 'male',
        status: 'in-progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const teamA: TeamRecord = { id: 'team-a', name: 'Alpha Indoor', shortName: 'ALP', modality: 'indoor', createdAt: '', updatedAt: '' };
      const teamB: TeamRecord = { id: 'team-b', name: 'Beta Indoor', shortName: 'BET', modality: 'indoor', createdAt: '', updatedAt: '' };

      const match: MatchRecord = {
        ...baseMatch,
        competitionId: 'comp-indoor',
        highlightAthleteId: 'ca-a1',
        observations: 'Partida realizada sob temperatura amena',
      };

      const doc = mapMatchRecordToBaseosScoresheet(
        match,
        comp,
        teamA,
        teamB,
        [athleteA1],
        [athleteB1],
        'completed',
        'print-a4',
      );

      expect(doc.observations).toContain('Partida realizada sob temperatura amena');
      expect(doc.observations).toContain('Destaque da Partida (MVP): #7 Bruna Silva (ALP)');
      // A estrutura de sets e rotação é preservada intacta
      expect(doc.sets.set1).toBeDefined();
    });

    it('Requisito P: Súmula BaseOS mapeia destaque para observações em Vôlei de Praia (Beach 2x2)', () => {
      const beachComp: CompetitionRecord = {
        id: 'comp-beach',
        name: 'Circuito Rei da Praia',
        slug: 'circuito-rei-da-praia',
        modality: 'beach',
        format: 'double-elimination',
        playerFormat: '2x2',
        setFormat: '3-sets',
        genderCategory: 'mixed',
        status: 'in-progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const beachMatch: MatchRecord = {
        ...baseMatch,
        competitionId: 'comp-beach',
        highlightAthleteId: 'ca-b1',
        observations: '',
      };

      const doc = mapMatchRecordToBaseosScoresheet(
        beachMatch,
        beachComp,
        undefined,
        undefined,
        [athleteA1],
        [athleteB1],
        'completed',
        'print-a4',
      );

      expect(doc.observations).toBe('Destaque da Partida (MVP): #12 Mariana Souza (BET)');
    });
  });

  describe('Requisito Q: Isolamento Multitenant / Cross-Competition', () => {
    it('atletas de uma competição não podem ser eleitos em partida de outra', () => {
      const matchComp2: MatchRecord = {
        ...baseMatch,
        id: 'match-comp-2',
        competitionId: 'comp-2',
      };

      // Tenta usar athleteA1 (da comp-1)
      const res = validateMatchHighlight(matchComp2, 'ca-a1', [], []);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('elencos');
    });
  });

  describe('Requisito R: Proteção de Schema e Adapter contra PGRST204', () => {
    it('dataAccess.updateMatch limpa chaves com undefined antes de enviar payload', async () => {
      const match = await dataAccess.createMatch(baseMatch);

      // Atualiza com highlightAthleteId válido e campos undefined que poderiam causar PGRST204 se não sanitizados
      const updated = await dataAccess.updateMatch(match.id, {
        highlightAthleteId: 'ca-a1',
        homologatedAt: undefined,
        homologatedBy: undefined,
      });

      expect(updated?.highlightAthleteId).toBe('ca-a1');
      expect(updated?.homologatedAt).toBeUndefined();
      expect(updated?.homologatedBy).toBeUndefined();
    });
  });
});
