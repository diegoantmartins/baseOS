import { describe, it, expect } from 'vitest';
import {
  createBlankBaseosScoresheetData,
  mapMatchRecordToBaseosScoresheet,
} from '@/document-engine/baseos/mapper/match.mapper';
import { validateBaseosScoresheetData } from '@/document-engine/baseos/validation/validator';
import type { MatchRecord, CompetitionRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

describe('BaseOS Document Engine - Match Mapper & Validation', () => {
  it('cria uma súmula em branco perfeitamente válida para 3 sets', () => {
    const blank = createBlankBaseosScoresheetData('3-sets');
    expect(blank.document.type).toBe('BASEOS_VOLLEYBALL_SCORESHEET');
    expect(blank.document.version).toBe('1.0');
    expect(blank.document.state).toBe('blank');
    expect(blank.document.format).toBe('3-sets');
    expect(blank.sets.set1).toBeDefined();
    expect(blank.sets.set2).toBeDefined();
    expect(blank.sets.set3).toBeDefined();
    expect(blank.sets.set4).toBeUndefined();

    const val = validateBaseosScoresheetData(blank);
    expect(val.valid).toBe(true);
    expect(val.errors).toHaveLength(0);
  });

  it('cria uma súmula em branco perfeitamente válida para 5 sets', () => {
    const blank = createBlankBaseosScoresheetData('5-sets');
    expect(blank.document.format).toBe('5-sets');
    expect(blank.sets.set4).toBeDefined();
    expect(blank.sets.set5).toBeDefined();

    const val = validateBaseosScoresheetData(blank);
    expect(val.valid).toBe(true);
    expect(val.errors).toHaveLength(0);
  });

  it('mapeia uma partida real no estado pré-preenchida (prefilled)', () => {
    const mockMatch: MatchRecord = {
      id: 'match-101',
      competitionId: 'comp-1',
      round: 1,
      matchNumber: 15,
      teamAId: 'team-a',
      teamBId: 'team-b',
      teamAName: 'Vôlei Clube A',
      teamBName: 'Vôlei Clube B',
      teamAShortName: 'VCA',
      teamBShortName: 'VCB',
      scheduledTime: '2026-09-10T14:30:00Z',
      venue: 'Ginásio Municipal',
      court: 'Quadra 1',
      phase: 'Quartas de Final',
      groupName: 'Grupo A',
      status: 'scheduled',
      referees: [
        { name: 'Carlos Arbitro', role: '1º Árbitro' },
        { name: 'Ana Arbitra', role: '2º Árbitro' },
      ],
      sets: [],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const mockComp: CompetitionRecord = {
      id: 'comp-1',
      name: 'Campeonato Estadual Adulto 2026',
      modality: 'indoor',
      format: 'groups',
      genderCategory: 'male',
      playerFormat: '6x6',
      setFormat: '3-sets',
      status: 'in-progress',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const rosterA: CompetitionAthlete[] = [
      {
        id: 'ath-1',
        competitionTeamId: 'ct-1',
        name: 'Bruno Rezende',
        jerseyNumber: 1,
        position: 'Levantador',
        isCaptain: true,
        isLibero: false,
        gender: 'male',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'ath-2',
        competitionTeamId: 'ct-1',
        name: 'Thales Hoss',
        jerseyNumber: 10,
        position: 'Líbero',
        isCaptain: false,
        isLibero: true,
        gender: 'male',
        createdAt: '',
        updatedAt: '',
      },
    ];

    const data = mapMatchRecordToBaseosScoresheet(
      mockMatch,
      mockComp,
      undefined,
      undefined,
      rosterA,
      [],
    );

    expect(data.document.state).toBe('prefilled');
    expect(data.competition.name).toBe('Campeonato Estadual Adulto 2026');
    expect(data.match.number).toBe(15);
    expect(data.teams.A.athletes).toHaveLength(1);
    expect(data.teams.A.athletes[0].name).toBe('Bruno Rezende');
    expect(data.teams.A.athletes[0].isCaptain).toBe(true);
    expect(data.teams.A.liberos).toHaveLength(1);
    expect(data.teams.A.liberos[0].name).toBe('Thales Hoss');

    const val = validateBaseosScoresheetData(data);
    expect(val.valid).toBe(true);
  });
});
