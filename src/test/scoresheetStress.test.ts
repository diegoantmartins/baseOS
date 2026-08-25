import { describe, it, expect } from 'vitest';
import { mapMatchRecordToBaseosScoresheet } from '@/document-engine/baseos/mapper/match.mapper';
import { validateBaseosScoresheetData } from '@/document-engine/baseos/validation/validator';
import { generateBlankBaseosScoresheetData } from '@/document-engine/baseos/service/scoresheetService';
import type { MatchRecord, CompetitionRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

describe('Fase 20 — Estresse e Integridade do Motor de Súmula BaseOS', () => {
  const dummyCompetition: CompetitionRecord = {
    id: 'comp-stress',
    name: 'Superliga Nacional de Voleibol Masculino e Feminino da Federação Brasileira de Desportos Universitários e Escolares',
    modality: 'indoor',
    format: 'groups-playoffs',
    playerFormat: '6x6',
    setFormat: '5-sets',
    genderCategory: 'male',
    status: 'in-progress',
  };

  const teamA: TeamRecord = {
    id: 'team-a',
    name: 'Associação Esportiva e Recreativa Minas Tênis Clube de Belo Horizonte',
    shortName: 'MINAS',
    modality: 'indoor',
  };

  const teamB: TeamRecord = {
    id: 'team-b',
    name: 'Sada Cruzeiro Vôlei Associação Social Esportiva e Cultural de Betim',
    shortName: 'SADA',
    modality: 'indoor',
  };

  const match5Sets: MatchRecord = {
    id: 'match-5s',
    competitionId: 'comp-stress',
    round: 1,
    matchNumber: 99,
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamAName: teamA.name,
    teamBName: teamB.name,
    teamAShortName: teamA.shortName,
    teamBShortName: teamB.shortName,
    venue: 'Ginásio Poliesportivo Presidente Tancredo Neves - Arena Sabiazinho',
    scheduledTime: '2026-10-15T21:30:00Z',
    status: 'completed',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 23 },
      { setNumber: 2, scoreA: 22, scoreB: 25 },
      { setNumber: 3, scoreA: 25, scoreB: 19 },
      { setNumber: 4, scoreA: 20, scoreB: 25 },
      { setNumber: 5, scoreA: 15, scoreB: 13 },
    ],
    referees: [],
    winnerId: 'team-a',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createRoster = (count: number, liberosCount: number): CompetitionAthlete[] => {
    const list: CompetitionAthlete[] = [];
    for (let i = 1; i <= count; i++) {
      list.push({
        id: `ath-${i}`,
        competitionTeamId: 'ct-1',
        name: `Atleta Profissional com Nome Extremamente Longo e Composto Nº ${i}`,
        jerseyNumber: i,
        position: i <= 6 ? 'Titular' : 'Reserva',
        isCaptain: i === 1,
        isLibero: false,
        gender: 'male',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    for (let l = 1; l <= liberosCount; l++) {
      list.push({
        id: `lib-${l}`,
        competitionTeamId: 'ct-1',
        name: `Líbero Especialista de Defesa Nº ${l}`,
        jerseyNumber: 20 + l,
        position: 'Líbero',
        isCaptain: false,
        isLibero: true,
        gender: 'male',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return list;
  };

  it('deve gerar e validar súmula em branco (Blank State) para 3 e 5 sets', () => {
    const blank3 = generateBlankBaseosScoresheetData('3-sets');
    expect(blank3.document.state).toBe('blank');
    expect(blank3.document.format).toBe('3-sets');
    expect(blank3.sets.set1.setNumber).toBe(1);
    expect(validateBaseosScoresheetData(blank3).valid).toBe(true);

    const blank5 = generateBlankBaseosScoresheetData('5-sets');
    expect(blank5.document.state).toBe('blank');
    expect(blank5.document.format).toBe('5-sets');
    expect(blank5.sets.set4).toBeDefined();
    expect(blank5.sets.set5).toBeDefined();
    expect(validateBaseosScoresheetData(blank5).valid).toBe(true);
  });

  it('deve processar elencos com variações de 0 a 14 atletas + 2 líberos com integridade', () => {
    const rosterVariants = [
      { count: 0, lib: 0 },
      { count: 6, lib: 0 },
      { count: 9, lib: 1 },
      { count: 12, lib: 2 },
      { count: 14, lib: 2 },
    ];

    for (const v of rosterVariants) {
      const rosterA = createRoster(v.count, v.lib);
      const rosterB = createRoster(v.count, v.lib);

      const doc = mapMatchRecordToBaseosScoresheet(
        match5Sets,
        dummyCompetition,
        teamA,
        teamB,
        rosterA,
        rosterB,
      );

      expect(doc.teams.A.athletes.length).toBeLessThanOrEqual(14);
      expect(doc.teams.A.liberos.length).toBeLessThanOrEqual(2);
      expect(doc.document.format).toBe('5-sets');
      expect(validateBaseosScoresheetData(doc).valid).toBe(true);
    }
  });

  it('deve suportar textos e observações de tamanho extremo sem corrupção de layout', () => {
    const rosterExtremo = createRoster(14, 2);
    const doc = mapMatchRecordToBaseosScoresheet(
      match5Sets,
      dummyCompetition,
      teamA,
      teamB,
      rosterExtremo,
      rosterExtremo,
      'completed',
    );

    doc.observations = 'Obs: '.repeat(50);
    expect(doc.observations.length).toBeGreaterThan(200);
    expect(validateBaseosScoresheetData(doc).valid).toBe(true);
  });
});
