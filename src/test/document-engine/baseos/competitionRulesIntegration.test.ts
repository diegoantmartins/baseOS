import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  mapMatchRecordToBaseosScoresheet,
  createBlankBaseosScoresheetData,
} from '@/document-engine/baseos/mapper/match.mapper';
import { BaseosResult } from '@/document-engine/baseos/components/BaseosResult';
import type { MatchRecord, CompetitionRecord, TeamRecord } from '@/types/entities';
import type { CompetitionConfig } from '@/types/competitionConfig';
import { DEFAULT_INDOOR_COMPETITION_CONFIG } from '@/types/competitionConfig';

describe('Fase 4.1 — Integração das Regras Esportivas à Súmula Canônica', () => {
  const teamA: TeamRecord = {
    id: 'team-a',
    name: 'Sada Cruzeiro Vôlei',
    shortName: 'CRU',
    modality: 'indoor',
    status: 'confirmed',
  };

  const teamB: TeamRecord = {
    id: 'team-b',
    name: 'Itambé Minas',
    shortName: 'MIN',
    modality: 'indoor',
    status: 'confirmed',
  };

  const baseComp: CompetitionRecord = {
    id: 'comp-rules-test',
    name: 'Superliga Masculina 2026',
    modality: 'indoor',
    format: 'groups-playoffs',
    playerFormat: '6x6',
    setFormat: '5-sets',
    genderCategory: 'male',
    status: 'in-progress',
    config: {
      ...DEFAULT_INDOOR_COMPETITION_CONFIG,
      format: {
        ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
        defaultSetsToWin: 3,
      },
    },
  };

  const baseMatch: MatchRecord = {
    id: 'match-fase4-01',
    competitionId: 'comp-rules-test',
    round: 1,
    matchNumber: 10,
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamAName: teamA.name,
    teamBName: teamB.name,
    teamAShortName: teamA.shortName,
    teamBShortName: teamB.shortName,
    venue: 'Arena UniBH',
    scheduledTime: '2026-09-15T18:00:00Z',
    status: 'completed',
    referees: [],
    sets: [],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  describe('TESTE 1 e 2 — Placar Correto no Quadro de Resultados (BaseosResult)', () => {
    it('TESTE 1 — renderiza 1 : 3 quando a Equipe B vence a partida', () => {
      // Equipe A venceu 1 set, Equipe B venceu 3 sets
      const matchTeamBWin: MatchRecord = {
        ...baseMatch,
        winnerId: 'team-b',
        sets: [
          { setNumber: 1, scoreA: 20, scoreB: 25 },
          { setNumber: 2, scoreA: 25, scoreB: 22 },
          { setNumber: 3, scoreA: 19, scoreB: 25 },
          { setNumber: 4, scoreA: 23, scoreB: 25 },
        ],
      };

      const data = mapMatchRecordToBaseosScoresheet(matchTeamBWin, baseComp, teamA, teamB, [], []);

      expect(data.result).toBeDefined();
      expect(data.result?.winnerSide).toBe('B');
      expect(data.result?.winnerTeamName).toBe(teamB.name);
      expect(data.result?.finalScoreSetsA).toBe(1);
      expect(data.result?.finalScoreSetsB).toBe(3);

      // Renderiza BaseosResult chamando o componente funcional diretamente
      const rendered = BaseosResult({
        result: data.result,
        teamA: data.teams.A,
        teamB: data.teams.B,
        maxSets: 5,
      });

      // Inspeciona os elementos filhos do BaseosResult
      const elementJson = JSON.stringify(rendered);
      expect(elementJson).toContain('1 : 3');
      expect(elementJson).not.toContain('3 : 3');
      expect(elementJson).not.toContain('5 : 3');
    });

    it('TESTE 2 — renderiza 3 : 1 quando a Equipe A vence a partida', () => {
      // Equipe A venceu 3 sets, Equipe B venceu 1 set
      const matchTeamAWin: MatchRecord = {
        ...baseMatch,
        winnerId: 'team-a',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 22, scoreB: 25 },
          { setNumber: 3, scoreA: 25, scoreB: 19 },
          { setNumber: 4, scoreA: 25, scoreB: 23 },
        ],
      };

      const data = mapMatchRecordToBaseosScoresheet(matchTeamAWin, baseComp, teamA, teamB, [], []);

      expect(data.result).toBeDefined();
      expect(data.result?.winnerSide).toBe('A');
      expect(data.result?.winnerTeamName).toBe(teamA.name);
      expect(data.result?.finalScoreSetsA).toBe(3);
      expect(data.result?.finalScoreSetsB).toBe(1);

      const rendered = BaseosResult({
        result: data.result,
        teamA: data.teams.A,
        teamB: data.teams.B,
        maxSets: 5,
      });

      const elementJson = JSON.stringify(rendered);
      expect(elementJson).toContain('3 : 1');
    });

    it('renderiza .. : .. quando a súmula está em branco ou sem resultado', () => {
      const blankData = createBlankBaseosScoresheetData('3-sets');
      const rendered = BaseosResult({
        result: blankData.result,
        teamA: blankData.teams.A,
        teamB: blankData.teams.B,
        maxSets: 3,
      });

      const elementJson = JSON.stringify(rendered);
      expect(elementJson).toContain('.. : ..');
    });
  });

  describe('TESTE 3 e 4 — Formatos de 3 Sets e 5 Sets Canônicos', () => {
    it('TESTE 3 — 3 Sets: setsToWin = 2, maxSets = 3 ativa Set 3 como decisivo e propaga regras', () => {
      const comp3Sets: CompetitionRecord = {
        ...baseComp,
        setFormat: '3-sets',
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 2,
            phaseOverrides: { groupStage: 2 },
          },
        },
      };

      const match = { ...baseMatch, phase: 'groupStage' };
      const data = mapMatchRecordToBaseosScoresheet(match, comp3Sets, teamA, teamB, [], []);

      expect(data.document.format).toBe('3-sets');
      expect(data.rules).toBeDefined();
      expect(data.rules?.setsToWin).toBe(2);
      expect(data.rules?.maxSets).toBe(3);

      expect(data.sets.set1).toBeDefined();
      expect(data.sets.set2).toBeDefined();
      expect(data.sets.set3).toBeDefined();
      expect(data.sets.set4).toBeUndefined();
      expect(data.sets.set5).toBeUndefined();

      // Set 1 e Set 2 não têm troca de lado
      expect(data.sets.set1.sideChange).toBeUndefined();
      expect(data.sets.set2.sideChange).toBeUndefined();

      // Set 3 é decisivo e tem troca de lado aos 8 pontos
      expect(data.sets.set3.sideChange?.required).toBe(true);
      expect(data.sets.set3.sideChange?.atPoint).toBe(8);
      expect(data.sets.set3.targetPoints).toBe(15);
    });

    it('TESTE 4 — 5 Sets: setsToWin = 3, maxSets = 5 ativa Set 5 como decisivo e propaga regras', () => {
      const match = { ...baseMatch, phase: 'final' };
      const data = mapMatchRecordToBaseosScoresheet(match, baseComp, teamA, teamB, [], []);

      expect(data.document.format).toBe('5-sets');
      expect(data.rules).toBeDefined();
      expect(data.rules?.setsToWin).toBe(3);
      expect(data.rules?.maxSets).toBe(5);

      expect(data.sets.set1).toBeDefined();
      expect(data.sets.set2).toBeDefined();
      expect(data.sets.set3).toBeDefined();
      expect(data.sets.set4).toBeDefined();
      expect(data.sets.set5).toBeDefined();

      // Sets 1 a 4 não têm troca de lado
      expect(data.sets.set1.sideChange).toBeUndefined();
      expect(data.sets.set4?.sideChange).toBeUndefined();

      // Set 5 é decisivo e tem troca de lado aos 8 pontos
      expect(data.sets.set5?.sideChange?.required).toBe(true);
      expect(data.sets.set5?.sideChange?.atPoint).toBe(8);
      expect(data.sets.set5?.targetPoints).toBe(15);
    });
  });

  describe('TESTE 5 e 6 — Pontuação e Tie-Break Customizados (Eliminação de Hardcode)', () => {
    it('TESTE 5 — propaga regularSetPoints customizado (21 pontos) para os sets regulares', () => {
      const customComp: CompetitionRecord = {
        ...baseComp,
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 2,
            setRules: {
              regularSetPoints: 21,
              tiebreakPoints: 15,
              minAdvantage: 2,
            },
          },
        },
      };

      const data = mapMatchRecordToBaseosScoresheet(baseMatch, customComp, teamA, teamB, [], []);

      expect(data.rules?.regularSetPoints).toBe(21);
      expect(data.sets.set1.targetPoints).toBe(21);
      expect(data.sets.set2.targetPoints).toBe(21);
      expect(data.sets.set3.targetPoints).toBe(15); // Tie-break preservado
    });

    it('TESTE 6 — propaga tiebreakPoints customizado (21 pontos) e calcula troca de lado em 11', () => {
      const customComp: CompetitionRecord = {
        ...baseComp,
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 2,
            setRules: {
              regularSetPoints: 25,
              tiebreakPoints: 21,
              minAdvantage: 2,
            },
          },
        },
      };

      const data = mapMatchRecordToBaseosScoresheet(baseMatch, customComp, teamA, teamB, [], []);

      expect(data.rules?.tiebreakPoints).toBe(21);
      expect(data.sets.set3.targetPoints).toBe(21);
      // Troca de lado dinâmica: Math.ceil(21 / 2) = 11
      expect(data.sets.set3.sideChange?.atPoint).toBe(11);
    });
  });

  describe('TESTE 7 — Preservação de rulesSnapshot (Regras Congeladas)', () => {
    it('prioriza rulesSnapshot histórico mesmo se a competição tiver config alterado posteriormente', () => {
      const compWithSnapshot: CompetitionRecord = {
        ...baseComp,
        // Config atual alterado para 3 sets
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 2,
          },
        },
        // Snapshot histórico congelado em 5 sets
        rulesSnapshot: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 3,
            phaseOverrides: {},
          },
        } as CompetitionConfig,
      };

      const data = mapMatchRecordToBaseosScoresheet(baseMatch, compWithSnapshot, teamA, teamB, [], []);

      // Deve respeitar o snapshot (5 sets) e não a alteração posterior (3 sets)
      expect(data.document.format).toBe('5-sets');
      expect(data.rules?.setsToWin).toBe(3);
      expect(data.sets.set4).toBeDefined();
      expect(data.sets.set5).toBeDefined();
    });
  });

  describe('TESTE 8 — Partida com W.O. (Walkover)', () => {
    it('integra resultado canônico oficial em caso de vitória por W.O.', () => {
      const comp3Sets: CompetitionRecord = {
        ...baseComp,
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 2,
          },
        },
      };

      const matchWo: MatchRecord = {
        ...baseMatch,
        status: 'wo',
        isWo: true,
        winnerId: 'team-a',
        sets: [], // Sem sets jogados
      };

      const data = mapMatchRecordToBaseosScoresheet(matchWo, comp3Sets, teamA, teamB, [], []);

      expect(data.result).toBeDefined();
      expect(data.result?.winnerSide).toBe('A');
      expect(data.result?.winnerTeamName).toBe(teamA.name);
      // Em W.O. em melhor de 3, placar oficial canônico é 2x0
      expect(data.result?.finalScoreSetsA).toBe(2);
      expect(data.result?.finalScoreSetsB).toBe(0);

      const rendered = BaseosResult({
        result: data.result,
        teamA: data.teams.A,
        teamB: data.teams.B,
        maxSets: 3,
      });

      const elementJson = JSON.stringify(rendered);
      expect(elementJson).toContain('2 : 0');
    });
  });
});
