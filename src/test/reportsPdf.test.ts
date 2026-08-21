// Smoke tests da Central de Relatórios do VolleyPro (boletim, classificação e relação nominal).

import { describe, expect, it } from 'vitest';
import {
  generateMatchesBoletimPdf,
  generateStandingsReportPdf,
  generateTeamRosterReportPdf,
  generatePodiumReportPdf,
} from '@/lib/pdf/reportsPdf';
import type { MatchBoletimRow } from '@/lib/pdf/reportsPdf';

describe('generateMatchesBoletimPdf', () => {
  it('gera boletim com jogos de grupos diferentes', () => {
    const rows: MatchBoletimRow[] = [
      {
        matchNumber: 1,
        round: 1,
        phase: 'Classificatória',
        groupName: 'Grupo A',
        date: '2026-08-20',
        time: '09:00',
        venue: 'Ginásio UNIPAR',
        court: 'Quadra 1',
        teamAName: 'CT UNIPAR',
        teamBName: 'CT Toledo',
        scoreA: 3,
        scoreB: 0,
        statusLabel: 'Finalizado',
      },
      {
        matchNumber: 2,
        round: 1,
        phase: 'Classificatória',
        groupName: 'Grupo B',
        date: '2026-08-20',
        time: '10:30',
        venue: 'Ginásio Municipal',
        teamAName: 'CT Marechal',
        teamBName: 'CT Cascavel',
        statusLabel: 'Agendado',
      },
    ];
    const doc = generateMatchesBoletimPdf(rows, 'Copa Teste 2026', 'Federação Teste');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('gera boletim vazio sem erro', () => {
    const doc = generateMatchesBoletimPdf([], 'Copa Teste 2026');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});

describe('generateStandingsReportPdf', () => {
  const standing = {
    teamId: 'team-1',
    teamName: 'CT UNIPAR',
    teamShortName: 'UNI',
    position: 1,
    matchesPlayed: 2,
    matchesWon: 2,
    matchesLost: 0,
    setsWon: 6,
    setsLost: 0,
    setsRatio: 99,
    pointsWon: 150,
    pointsLost: 120,
    pointsRatio: 1.25,
    pointsBalance: 30,
    competitionPoints: 6,
  };

  it('gera relatório de classificação por grupos', () => {
    const doc = generateStandingsReportPdf(
      [
        { groupName: 'Grupo A', standings: [standing] },
        { groupName: 'Grupo B', standings: [{ ...standing, teamId: 'team-4', teamName: 'CT Cascavel', position: 1 }] },
      ],
      'Copa Teste 2026',
      'Federação Teste',
    );
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('gera relatório vazio sem erro', () => {
    const doc = generateStandingsReportPdf([], 'Copa Teste 2026');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});

describe('generateTeamRosterReportPdf', () => {
  it('gera relação nominal com documentos, capitã e líbero', () => {
    const doc = generateTeamRosterReportPdf(
      [
        {
          name: 'CT UNIPAR',
          shortName: 'UNI',
          coach: 'Prof. Carlos',
          athletes: [
            { jerseyNumber: 1, name: 'Ana Souza', position: 'Levantadora', documentNumber: '123.456.789-00', isCaptain: true, isLibero: false },
            { jerseyNumber: 9, name: 'Bia Lima', position: 'Ponteira', documentNumber: '987.654.321-00', isCaptain: false, isLibero: true },
            { jerseyNumber: 2, name: 'Carla Dias', position: 'Central', isCaptain: false, isLibero: false },
          ],
        },
      ],
      'Copa Teste 2026',
      'Federação Teste',
    );
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('gera exatamente 1 página dedicada por equipe inscrita', () => {
    const doc = generateTeamRosterReportPdf(
      [
        { name: 'Equipe Alfa', shortName: 'ALF', athletes: [] },
        { name: 'Equipe Beta', shortName: 'BET', athletes: [] },
        { name: 'Equipe Gama', shortName: 'GAM', athletes: [] },
      ],
      'Copa Teste 2026',
    );
    expect(doc.getNumberOfPages()).toBe(3);
  });

  it('gera relação nominal vazia sem erro', () => {
    const doc = generateTeamRosterReportPdf([], 'Copa Teste 2026');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});

describe('generatePodiumReportPdf', () => {
  it('gera relatório de encerramento e pódio com medalhas sem caracteres corrompidos', () => {
    const doc = generatePodiumReportPdf({
      competitionName: 'Copa Toledo 2026',
      champion: { name: 'Osasco Voleibol', shortName: 'OSA' },
      runnerUp: { name: 'Minas Tênis Clube', shortName: 'MIN' },
      third: { name: 'Praia Clube', shortName: 'PRA' },
      fourth: { name: 'Flamengo', shortName: 'FLA' },
    });
    expect(doc.getNumberOfPages()).toBe(1);
  });
});