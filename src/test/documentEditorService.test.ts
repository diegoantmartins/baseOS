// Testes do Editor de Documentos (administrador):
// - persistência de edições (document_edits) e layouts (template_layouts)
//   via dataAccess (adaptador LocalStorage)
// - mapeamento MatchRecord -> MatchDocument (buildMatchDocument)
// - conversão de data URI de logo (dataUriToBytes)
// - overrides de conteúdo/layout nos geradores (resolveFieldValue,
//   mergeFieldOverrides e geração com valueOverrides/layoutOverrides)

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabaseClient', () => ({
  isSupabaseConfigured: () => false,
  getSupabaseClient: async () => null,
  SUPABASE_TABLES: {
    competitions: 'competitions',
    teams: 'teams',
    referees: 'referees',
    matches: 'matches',
    competitionTeams: 'competition_teams',
    competitionAthletes: 'competition_athletes',
    venues: 'venues',
    draws: 'draws',
    appSettings: 'app_settings',
    documentEdits: 'document_edits',
    templateLayouts: 'template_layouts',
  },
}));

import { PDFDocument } from 'pdf-lib';
import { dataAccess, resetLocalData } from '@/services/dataAccess';
import { buildMatchDocument, dataUriToBytes } from '@/services/documentEditorService';
import type { MatchContext } from '@/services/documentEditorService';
import { generateThreeSetScoresheet } from '@/document-engine/generators/sumula3.generator';
import { buildSumulaData } from '@/document-engine/generators';
import { mergeFieldOverrides, resolveFieldValue } from '@/document-engine/generators/render';
import { SUMULA3_GEOMETRY } from '@/document-engine/coordinates/sumula3.coordinates';
import type { MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';

const NOW = '2026-08-20T12:00:00.000Z';

function athlete(id: string, name: string, jerseyNumber: number, opts: Partial<CompetitionAthlete> = {}): CompetitionAthlete {
  return {
    id,
    competitionTeamId: id.startsWith('a') ? 'ct-a' : 'ct-b',
    name,
    jerseyNumber,
    position: 'Ponteiro',
    isCaptain: false,
    isLibero: false,
    gender: 'male',
    createdAt: NOW,
    updatedAt: NOW,
    ...opts,
  };
}

function competitionTeam(id: string, teamId: string, teamName: string): CompetitionTeam {
  return {
    id,
    competitionId: 'comp-1',
    teamId,
    teamName,
    teamShortName: teamName.slice(0, 3).toUpperCase(),
    accessToken: `token-${id}`,
    registrationDeadline: '2026-12-31T00:00:00.000Z',
    isLocked: false,
    status: 'approved',
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeMatchRecord(overrides: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id: 'm-1',
    competitionId: 'comp-1',
    round: 1,
    matchNumber: 7,
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamAName: 'EQUIPE AZUL',
    teamBName: 'EQUIPE VERMELHA',
    teamAShortName: 'AZUL',
    teamBShortName: 'VERM',
    venue: 'GINÁSIO TESTE',
    court: '1',
    phase: 'Classificatória',
    groupName: 'Grupo A',
    scheduledTime: '2026-08-20T19:00:00.000Z',
    status: 'completed',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 21 },
      { setNumber: 2, scoreA: 23, scoreB: 25 },
      { setNumber: 3, scoreA: 25, scoreB: 19 },
    ],
    referees: [
      { role: '1º Árbitro', name: 'Carlos Silva' },
      { role: '2º Árbitro', name: 'Ana Santos' },
      { role: 'Apontador', name: 'Pedro Oliveira' },
    ],
    lineups: {
      teamA: { starterIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], liberoId: 'a7' },
      teamB: { starterIds: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'], liberoId: 'b7' },
    },
    observations: 'Jogo válido pela fase classificatória.',
    winnerId: 'team-a',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeContext(overrides: Partial<MatchRecord> = {}): MatchContext {
  const match = makeMatchRecord(overrides);
  const teamA: TeamRecord = { id: 'team-a', name: 'EQUIPE AZUL', shortName: 'AZUL', modality: 'indoor', coachName: 'Técnico A' };
  const teamB: TeamRecord = { id: 'team-b', name: 'EQUIPE VERMELHA', shortName: 'VERM', modality: 'indoor', coachName: 'Técnico B' };
  return {
    match,
    competitionName: 'CAMPEONATO TESTE',
    competitionCategory: '6x6',
    gender: 'male',
    teamA,
    teamB,
    rosterA: [1, 2, 3, 4, 5, 6, 7].map(n => athlete(`a${n}`, `Jogador A${n}`, n, n === 7 ? { isLibero: true } : {})),
    rosterB: [1, 2, 3, 4, 5, 6, 7].map(n => athlete(`b${n}`, `Jogador B${n}`, n, n === 7 ? { isLibero: true } : {})),
    competitionTeamA: competitionTeam('ct-a', 'team-a', 'EQUIPE AZUL'),
    competitionTeamB: competitionTeam('ct-b', 'team-b', 'EQUIPE VERMELHA'),
    orgName: 'VOLLEYPRO',
    documentLogo: undefined,
  };
}

beforeEach(() => {
  resetLocalData();
});

describe('dataAccess: document_edits (LocalStorage)', () => {
  it('cria uma edição de documento', async () => {
    const edit = await dataAccess.saveDocumentEdit({
      matchId: 'm-1',
      documentType: 'SUMMULA_3',
      values: { competitionName: 'CAMPEONATO EDITADO' },
    });
    expect(edit.id).toMatch(/^dcedit-/);
    expect(edit.matchId).toBe('m-1');
    expect(edit.createdAt).toBe(edit.updatedAt);
    expect((await dataAccess.listDocumentEdits()).length).toBe(1);
  });

  it('faz upsert pela chave partida + tipo de documento', async () => {
    await dataAccess.saveDocumentEdit({ matchId: 'm-1', documentType: 'SUMMULA_3', values: { competitionName: 'A' } });
    const updated = await dataAccess.saveDocumentEdit({ matchId: 'm-1', documentType: 'SUMMULA_3', values: { competitionName: 'B', phase: 'Final' } });
    const all = await dataAccess.listDocumentEdits('m-1');
    expect(all.length).toBe(1);
    expect(updated.values).toEqual({ competitionName: 'B', phase: 'Final' });
  });

  it('lista edições filtrando pela partida', async () => {
    await dataAccess.saveDocumentEdit({ matchId: 'm-1', documentType: 'SUMMULA_3', values: { phase: 'A' } });
    await dataAccess.saveDocumentEdit({ matchId: 'm-2', documentType: 'SUMMULA_5', values: { phase: 'B' } });
    expect((await dataAccess.listDocumentEdits('m-1')).length).toBe(1);
    expect((await dataAccess.listDocumentEdits()).length).toBe(2);
  });

  it('busca por chave e retorna null quando não existe', async () => {
    expect(await dataAccess.getDocumentEdit({ matchId: 'm-1', documentType: 'SUMMULA_3' })).toBeNull();
    await dataAccess.saveDocumentEdit({ matchId: 'm-1', documentType: 'SUMMULA_3', values: {} });
    expect(await dataAccess.getDocumentEdit({ matchId: 'm-1', documentType: 'SUMMULA_3' })).not.toBeNull();
  });

  it('remove uma edição', async () => {
    const edit = await dataAccess.saveDocumentEdit({ matchId: 'm-1', documentType: 'SUMMULA_3', values: {} });
    await dataAccess.deleteDocumentEdit(edit.id);
    expect(await dataAccess.getDocumentEdit({ matchId: 'm-1', documentType: 'SUMMULA_3' })).toBeNull();
  });
});

describe('dataAccess: template_layouts (LocalStorage)', () => {
  it('cria um layout com id igual ao templateKind', async () => {
    const layout = await dataAccess.saveTemplateLayout({ templateKind: 'sumula3', fields: { pointsA: { y: 200 } } });
    expect(layout.id).toBe('sumula3');
    expect(layout.templateKind).toBe('sumula3');
    expect(layout.fields.pointsA).toEqual({ y: 200 });
  });

  it('mescla campos parciais ao salvar novamente', async () => {
    await dataAccess.saveTemplateLayout({ templateKind: 'sumula3', fields: { pointsA: { y: 200 } } });
    const merged = await dataAccess.saveTemplateLayout({ templateKind: 'sumula3', fields: { teamAName: { x: 120, fontSize: 10 } } });
    expect(merged.fields.pointsA).toEqual({ y: 200 });
    expect(merged.fields.teamAName).toEqual({ x: 120, fontSize: 10 });
    expect((await dataAccess.listDocumentEdits()).length).toBe(0);
  });

  it('busca por templateKind e retorna null quando não existe', async () => {
    expect(await dataAccess.getTemplateLayout('sumula5')).toBeNull();
    await dataAccess.saveTemplateLayout({ templateKind: 'sumula5', fields: {} });
    expect(await dataAccess.getTemplateLayout('sumula5')).not.toBeNull();
  });
});

describe('buildMatchDocument (mapeamento MatchRecord -> MatchDocument)', () => {
  it('mapeia cabeçalho, oficiais, data, horário e resultado', () => {
    const doc = buildMatchDocument(makeContext());
    expect(doc.competitionName).toBe('CAMPEONATO TESTE');
    expect(doc.categoryName).toBe('6x6');
    expect(doc.gender).toBe('male');
    expect(doc.date).toBe('2026-08-20');
    expect(doc.startTime).toBe('19:00');
    expect(doc.venue).toBe('GINÁSIO TESTE');
    expect(doc.court).toBe('1');
    expect(doc.format).toBe('3-sets');
    expect(doc.status).toBe('FINISHED');
    expect(doc.officials).toEqual({ referee1: 'Carlos Silva', referee2: 'Ana Santos', scorer: 'Pedro Oliveira' });
    expect(doc.result).toEqual({ winnerTeamId: 'team-a', teamASets: 2, teamBSets: 1, totalSets: 3 });
    expect(doc.observations).toBe('Jogo válido pela fase classificatória.');
  });

  it('constrói elencos e líberos das duas equipes', () => {
    const doc = buildMatchDocument(makeContext());
    expect(doc.teamA.players).toHaveLength(7);
    expect(doc.teamB.players).toHaveLength(7);
    expect(doc.teamA.liberoPlayers.map(p => p.id)).toEqual(['a7']);
    expect(doc.teamB.liberoPlayers.map(p => p.id)).toEqual(['b7']);
    expect(doc.teamA.coach).toBe('Técnico A');
    expect(doc.teamB.coach).toBe('Técnico B');
  });

  it('mapeia os sets com lineups DISTINTOS para A e B (regressão lineupB)', () => {
    const doc = buildMatchDocument(makeContext());
    expect(doc.sets).toHaveLength(3);
    expect(doc.lineups).toHaveLength(6);
    const set1A = doc.sets[0].lineupA;
    const set1B = doc.sets[0].lineupB;
    expect(set1A).toBeDefined();
    expect(set1B).toBeDefined();
    expect(set1A!.positions.I).toBe('a1');
    expect(set1B!.positions.I).toBe('b1');
    expect(set1A!.positions.VI).toBe('a6');
    expect(set1B!.positions.VI).toBe('b6');
    expect(set1A!.liberoPlayerId).toBe('a7');
    expect(set1B!.liberoPlayerId).toBe('b7');
    expect(set1A!.teamId).toBe('team-a');
    expect(set1B!.teamId).toBe('team-b');
    expect(doc.sets[2].pointsA).toBe(25);
    expect(doc.sets[2].pointsB).toBe(19);
  });

  it('não quebra sem escalações registradas', () => {
    const ctx = makeContext({ lineups: undefined });
    const doc = buildMatchDocument(ctx);
    expect(doc.lineups).toEqual([]);
    expect(doc.sets[0].lineupA).toBeUndefined();
    expect(doc.sets[0].lineupB).toBeUndefined();
  });

  it('define formato 5-sets e status correto para partida maior', () => {
    const ctx = makeContext({
      status: 'in-progress',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 21, scoreB: 25 },
        { setNumber: 3, scoreA: 25, scoreB: 22 },
        { setNumber: 4, scoreA: 19, scoreB: 25 },
        { setNumber: 5, scoreA: 15, scoreB: 12 },
      ],
      winnerId: undefined,
    });
    const doc = buildMatchDocument(ctx);
    expect(doc.format).toBe('5-sets');
    expect(doc.status).toBe('IN_PROGRESS');
    expect(doc.lineups).toHaveLength(10);
  });
});

describe('dataUriToBytes', () => {
  it('converte data URI base64 em bytes', () => {
    const bytes = dataUriToBytes('data:image/png;base64,iVBORw0KGgo=');
    expect(bytes).toBeDefined();
    expect(bytes!.length).toBeGreaterThan(0);
  });

  it('retorna undefined para entrada vazia ou inválida', () => {
    expect(dataUriToBytes('')).toBeUndefined();
    expect(dataUriToBytes('data:image/png;base64,')).toBeUndefined();
    expect(dataUriToBytes('nao-eh-data-uri')).toBeUndefined();
    expect(dataUriToBytes('data:image/png;base64,%%%invalido%%%')).toBeUndefined();
  });
});

describe('overrides de conteúdo e layout (Editor de Documentos)', () => {
  it('resolveFieldValue: override manual tem precedência sobre fallback', () => {
    expect(resolveFieldValue({ competitionName: 'X' }, 'competitionName', 'FALLBACK')).toBe('X');
    expect(resolveFieldValue(undefined, 'competitionName', 'FALLBACK')).toBe('FALLBACK');
    expect(resolveFieldValue({}, 'matchNumber', 7)).toBe('7');
    expect(resolveFieldValue({ phase: '' }, 'phase', 'FASE')).toBe('');
  });

  it('mergeFieldOverrides: mescla ajustes parciais sobre a geometria base', () => {
    const merged = mergeFieldOverrides(SUMULA3_GEOMETRY.fields, { pointsA: { y: 200 } });
    expect(merged.pointsA.y).toBe(200);
    expect(merged.pointsA.x).toBe(SUMULA3_GEOMETRY.fields.pointsA.x);
    const full = mergeFieldOverrides(SUMULA3_GEOMETRY.fields, { novaChave: { x: 10, y: 20, width: 100, height: 10, fontSize: 8, align: 'left' } });
    expect(full.novaChave).toBeDefined();
    expect(mergeFieldOverrides(SUMULA3_GEOMETRY.fields, undefined)).toBe(SUMULA3_GEOMETRY.fields);
  });

  it('gera a súmula 3 sets com valueOverrides e layoutOverrides sem erro', async () => {
    const match = buildMatchDocument(makeContext());
    const bytes = await generateThreeSetScoresheet(buildSumulaData(match), {
      valueOverrides: { competitionName: 'CAMPEONATO EDITADO', pointsA: '99', phase: '' },
      layoutOverrides: { pointsA: { y: 200 }, teamAName: { fontSize: 12 } },
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(992, 1);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(566, 1);
  });

  it('gera com override para o número do set (setNumber)', async () => {
    const match = buildMatchDocument(makeContext());
    const bytes = await generateThreeSetScoresheet(buildSumulaData(match), {
      valueOverrides: { setNumber: '7' },
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});
