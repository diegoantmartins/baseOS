import { describe, expect, it } from 'vitest';
import { generateOfficialScoresheetPdfBlob, OfficialScoresheetDocument } from '@/lib/pdf/officialScoresheetPdf';
import type { MatchSheetData } from '@/lib/pdf/matchSheetPdf';

function createMockData(overrides: Partial<MatchSheetData> = {}): MatchSheetData {
  return {
    competition: 'Superliga Nacional 2026',
    category: 'Adulto',
    genderCategory: 'male',
    modality: 'indoor',
    format: '5-sets',
    playerFormat: '6x6',
    date: '2026-08-24',
    time: '19:30',
    venue: 'Ginásio do Ibirapuera',
    court: 'Quadra Central',
    city: 'São Paulo - SP',
    phase: 'Semifinal',
    round: 1,
    matchNumber: 101,
    teamA: {
      name: 'Vôlei Renata Campinas',
      shortName: 'REN',
      athletes: [
        { jerseyNumber: 1, name: 'Bruninho', position: 'Levantador', captain: true },
        { jerseyNumber: 10, name: 'Lucão', position: 'Central' },
        { jerseyNumber: 14, name: 'Maurício Borges', position: 'Ponteiro' },
        { jerseyNumber: 18, name: 'Adriano', position: 'Ponteiro' },
        { jerseyNumber: 4, name: 'Felipe Roque', position: 'Oposto' },
        { jerseyNumber: 7, name: 'Judson', position: 'Central' },
        { jerseyNumber: 17, name: 'Maique', position: 'Líbero', libero: true },
      ],
      coach: 'Horacio Dileo',
    },
    teamB: {
      name: 'Sada Cruzeiro',
      shortName: 'CRU',
      athletes: [
        { jerseyNumber: 8, name: 'Wallace', position: 'Oposto', captain: true },
        { jerseyNumber: 5, name: 'Uriarte', position: 'Levantador' },
        { jerseyNumber: 12, name: 'López', position: 'Ponteiro' },
        { jerseyNumber: 16, name: 'Lucão', position: 'Central' },
        { jerseyNumber: 19, name: 'Cledenilson', position: 'Central' },
        { jerseyNumber: 2, name: 'Rodriguinho', position: 'Ponteiro' },
        { jerseyNumber: 9, name: 'Alê', position: 'Líbero', libero: true },
      ],
      coach: 'Filipe Ferraz',
    },
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 23 },
      { setNumber: 2, scoreA: 22, scoreB: 25 },
      { setNumber: 3, scoreA: 25, scoreB: 20 },
      { setNumber: 4, scoreA: 20, scoreB: 25 },
      { setNumber: 5, scoreA: 15, scoreB: 13 },
    ],
    finalScoreA: 3,
    finalScoreB: 2,
    winner: 'A',
    referees: [
      { role: '1º Árbitro', name: 'Anderson Caçador' },
      { role: '2º Árbitro', name: 'Silvio Silveira' },
      { role: 'Apontador', name: 'Juliana Silva' },
    ],
    timeouts: [
      { team: 'B', set: 1, score: '21:23' },
      { team: 'A', set: 5, score: '13:13' },
    ],
    substitutions: [
      { team: 'A', set: 2, playerIn: 8, playerOut: 4, score: '18:20' },
    ],
    sanctions: [
      { team: 'B', player: 'Wallace', type: 'Cartão Amarelo', set: 3 },
    ],
    observations: 'Partida realizada em conformidade com as regras da CBV e FIVB.',
    orgName: 'Confederação Brasileira de Voleibol - CBV',
    sheetMode: 'post',
    ...overrides,
  };
}

describe('OfficialScoresheetDocument (@react-pdf/renderer)', () => {
  it('renderiza o componente React da Súmula Oficial sem erros', () => {
    const data = createMockData();
    const docElement = <OfficialScoresheetDocument data={data} />;
    expect(docElement).toBeDefined();
    expect(docElement.props.data.competition).toBe('Superliga Nacional 2026');
  });

  it('gera Blob de PDF válido para partida de 5 sets', async () => {
    const data = createMockData();
    const blob = await generateOfficialScoresheetPdfBlob(data);
    expect(blob).toBeDefined();
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('gera Blob de PDF para partida de 3 sets e modo pré-jogo', async () => {
    const data = createMockData({
      format: '3-sets',
      sets: [
        { setNumber: 1, scoreA: 0, scoreB: 0 },
        { setNumber: 2, scoreA: 0, scoreB: 0 },
        { setNumber: 3, scoreA: 0, scoreB: 0 },
      ],
      finalScoreA: 0,
      finalScoreB: 0,
      winner: undefined,
      sanctions: [],
      observations: '',
    });
    const blob = await generateOfficialScoresheetPdfBlob(data);
    expect(blob).toBeDefined();
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(1000);
  });
});
