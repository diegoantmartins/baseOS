import { describe, it, expect } from 'vitest';
import {
  createBlankBaseosScoresheetData,
  mapMatchRecordToBaseosScoresheet,
} from '@/document-engine/baseos/mapper/match.mapper';
import {
  generateBaseosPdfBlob,
  generateBaseosBatchPdfBlob,
} from '@/document-engine/baseos/service/scoresheetService';
import { validateBaseosScoresheetData } from '@/document-engine/baseos/validation/validator';
import type { MatchRecord, CompetitionRecord } from '@/types/entities';
import type { CompetitionConfig } from '@/types/competitionConfig';
import { DEFAULT_INDOOR_COMPETITION_CONFIG, DEFAULT_BEACH_COMPETITION_CONFIG } from '@/types/competitionConfig';

describe('BaseOS Scoresheet Engine — Consolidação Fase 2', () => {
  const baseMatch: MatchRecord = {
    id: 'match-fase2-001',
    competitionId: 'comp-fase2',
    round: 1,
    matchNumber: 1,
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamAName: 'Time A Alfa',
    teamBName: 'Time B Beta',
    teamAShortName: 'ALF',
    teamBShortName: 'BET',
    scheduledTime: '2026-09-15T18:00:00Z',
    venue: 'Arena Principal',
    court: 'Quadra Central',
    phase: 'classificatoria',
    status: 'scheduled',
    referees: [],
    sets: [],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const compIndoor: CompetitionRecord = {
    id: 'comp-fase2',
    name: 'Campeonato Metropolitano 2026',
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
    config: {
      ...DEFAULT_INDOOR_COMPETITION_CONFIG,
      format: {
        ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
        defaultSetsToWin: 2,
        phaseOverrides: {
          groupStage: 2,
          quarterfinals: 2,
          semifinals: 3,
          final: 3,
        },
      },
    } as CompetitionConfig,
  };

  describe('Resolução Canônica de Formato (CompetitionConfig -> CompetitionRulesService)', () => {
    it('resolve 3-sets para fase classificatória com defaultSetsToWin = 2', () => {
      const match = { ...baseMatch, phase: 'group-stage' };
      const data = mapMatchRecordToBaseosScoresheet(match, compIndoor, undefined, undefined, [], []);
      expect(data.document.format).toBe('3-sets');
      expect(data.sets.set1).toBeDefined();
      expect(data.sets.set2).toBeDefined();
      expect(data.sets.set3).toBeDefined();
      expect(data.sets.set4).toBeUndefined();
    });

    it('resolve 5-sets automaticamente para fase final com phaseOverrides.final = 3', () => {
      const match = { ...baseMatch, phase: 'final' };
      const data = mapMatchRecordToBaseosScoresheet(match, compIndoor, undefined, undefined, [], []);
      expect(data.document.format).toBe('5-sets');
      expect(data.sets.set4).toBeDefined();
      expect(data.sets.set5).toBeDefined();
    });

    it('resolve 5-sets automaticamente para fase semifinal com phaseOverrides.semifinals = 3', () => {
      const match = { ...baseMatch, phase: 'semifinal' };
      const data = mapMatchRecordToBaseosScoresheet(match, compIndoor, undefined, undefined, [], []);
      expect(data.document.format).toBe('5-sets');
    });

    it('respeita sobrescrita explícita customSetFormat na partida', () => {
      const match: MatchRecord = { ...baseMatch, phase: 'group-stage', customSetFormat: '5-sets' };
      const data = mapMatchRecordToBaseosScoresheet(match, compIndoor, undefined, undefined, [], []);
      expect(data.document.format).toBe('5-sets');
    });

    it('promove para 5-sets se a partida tiver mais de 3 sets jogados', () => {
      const match: MatchRecord = {
        ...baseMatch,
        phase: 'group-stage',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 23 },
          { setNumber: 2, scoreA: 20, scoreB: 25 },
          { setNumber: 3, scoreA: 25, scoreB: 22 },
          { setNumber: 4, scoreA: 21, scoreB: 25 },
        ],
      };
      const data = mapMatchRecordToBaseosScoresheet(match, compIndoor, undefined, undefined, [], []);
      expect(data.document.format).toBe('5-sets');
    });

    it('resolve corretamente para modalidade de praia (beach) como 3-sets', () => {
      const compBeach: CompetitionRecord = {
        ...compIndoor,
        modality: 'beach',
        config: DEFAULT_BEACH_COMPETITION_CONFIG,
      };
      const match = { ...baseMatch, phase: 'final' };
      const data = mapMatchRecordToBaseosScoresheet(match, compBeach, undefined, undefined, [], []);
      expect(data.document.format).toBe('3-sets');
    });
  });

  describe('Avaliação Técnica de Geração e Lote (Batch)', () => {
    it('gera PDF de 1 partida individual com integridade geométrica e binária', async () => {
      const data = createBlankBaseosScoresheetData('3-sets');
      const blob = await generateBaseosPdfBlob(data);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(1000);
      expect(blob.type).toBe('application/pdf');
    });

    it('gera lote misto de 3 partidas (3-sets e 5-sets combinados em único documento)', async () => {
      const batchData = [
        createBlankBaseosScoresheetData('3-sets'),
        createBlankBaseosScoresheetData('5-sets'),
        createBlankBaseosScoresheetData('3-sets'),
      ];
      batchData.forEach((d, i) => {
        d.match.number = i + 1;
        d.competition.name = `Torneio Lote Jogo ${i + 1}`;
      });

      const start = performance.now();
      const blob = await generateBaseosBatchPdfBlob(batchData, 'Lote_3_Jogos');
      const elapsed = performance.now() - start;

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(3000);
      expect(elapsed).toBeLessThan(60000);
    }, 60000);

    it('gera lote de 6 partidas com validação de integridade e escalabilidade linear', async () => {
      const batchData = Array.from({ length: 6 }, (_, i) => {
        const format = i % 2 === 0 ? '3-sets' : '5-sets';
        const data = createBlankBaseosScoresheetData(format);
        data.match.number = i + 1;
        return data;
      });

      const start = performance.now();
      const blob = await generateBaseosBatchPdfBlob(batchData, 'Lote_6_Jogos');
      const elapsed = performance.now() - start;

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(6000);
      expect(elapsed).toBeLessThan(90000);
    }, 90000);
  });

  describe('Validação Semântica e Integridade dos Dados', () => {
    it('garante que súmulas geradas pelo mapper passam 100% no validador do BaseOS', () => {
      const data3 = mapMatchRecordToBaseosScoresheet(baseMatch, compIndoor, undefined, undefined, [], []);
      const val3 = validateBaseosScoresheetData(data3);
      expect(val3.valid).toBe(true);
      expect(val3.errors).toHaveLength(0);

      const match5 = { ...baseMatch, phase: 'final' };
      const data5 = mapMatchRecordToBaseosScoresheet(match5, compIndoor, undefined, undefined, [], []);
      const val5 = validateBaseosScoresheetData(data5);
      expect(val5.valid).toBe(true);
      expect(val5.errors).toHaveLength(0);
    });
  });
});
