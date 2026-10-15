// =====================================================================
// BaseOS Tests — v2.5.3: Impressão de Quadra no Cabeçalho A4 & Lote por Quadra
// =====================================================================

import { describe, it, expect, vi } from 'vitest';
import {
  mapMatchRecordToBaseosScoresheet,
  createBlankBaseosScoresheetData,
} from '@/document-engine/baseos/mapper/match.mapper';
import {
  formatCourtDisplay,
  formatHeaderDate,
  isMatchOnCourt,
  generateBatchScoresheetFileName,
} from '@/document-engine/baseos/domain/court.rules';
import {
  resolveBatchScoresheetsData,
} from '@/document-engine/baseos/service/scoresheetService';
import { sortScheduleMatches } from '@/services/scheduleService';
import { validateScoresheetLayout } from '@/document-engine/baseos/geometry/layoutValidator';
import {
  THREE_SET_A4_LAYOUT,
  FIVE_SET_A4_LAYOUT,
} from '@/document-engine/baseos/geometry/layouts';
import type { MatchRecord, CompetitionRecord } from '@/types/entities';

describe('BaseOS v2.5.3 — Impressão de Quadra no Cabeçalho A4 e Lote por Quadra', () => {
  const dummyComp: CompetitionRecord = {
    id: 'comp-voltz',
    name: 'Superliga Open 2026',
    modality: 'indoor',
    format: 'groups',
    genderCategory: 'male',
    playerFormat: '6x6',
    setFormat: '3-sets',
    status: 'in-progress',
    startDate: '2026-10-20',
    endDate: '2026-10-25',
    venue: 'Ginásio Central Voltz',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const createDummyMatch = (overrides: Partial<MatchRecord> = {}): MatchRecord => ({
    id: 'm-1',
    competitionId: 'comp-voltz',
    round: 1,
    matchNumber: 1,
    teamAId: 'team-alpha',
    teamBId: 'team-beta',
    teamAName: 'Alpha Volley',
    teamBName: 'Beta Stars',
    teamAShortName: 'ALP',
    teamBShortName: 'BET',
    scheduledTime: '2026-10-20T09:00:00Z',
    venue: 'Ginásio Central Voltz',
    court: 'Quadra 1',
    phase: 'Classificatória',
    groupName: 'Grupo A',
    status: 'scheduled',
    referees: [],
    sets: [],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  });

  describe('1. Formatação e Helpers de Quadra e Data (court.rules.ts)', () => {
    it('normaliza identificações de quadra para exibição destacada', () => {
      expect(formatCourtDisplay('1')).toBe('QUADRA 1');
      expect(formatCourtDisplay('2')).toBe('QUADRA 2');
      expect(formatCourtDisplay('Quadra 1')).toBe('QUADRA 1');
      expect(formatCourtDisplay('quadra 2')).toBe('QUADRA 2');
      expect(formatCourtDisplay('QUADRA 1')).toBe('QUADRA 1');
      expect(formatCourtDisplay('Quadra Central')).toBe('QUADRA CENTRAL');
      expect(formatCourtDisplay(undefined)).toBe('QUADRA 1');
      expect(formatCourtDisplay(null)).toBe('QUADRA 1');
      expect(formatCourtDisplay('')).toBe('QUADRA 1');
    });

    it('formata datas determinísticas em DD/MM/AAAA para o cabeçalho oficial', () => {
      expect(formatHeaderDate('2026-10-20')).toBe('20/10/2026');
      expect(formatHeaderDate('2026-10-20T09:00:00Z')).toBe('20/10/2026');
      expect(formatHeaderDate('20/10/2026')).toBe('20/10/2026');
      expect(formatHeaderDate(undefined)).toBe('__/__/____');
      expect(formatHeaderDate(null)).toBe('__/__/____');
    });

    it('identifica corretamente a quadra da partida sem falsos positivos', () => {
      expect(isMatchOnCourt('Quadra 1', 1)).toBe(true);
      expect(isMatchOnCourt('Quadra 1', 2)).toBe(false);
      expect(isMatchOnCourt('quadra 2', 2)).toBe(true);
      expect(isMatchOnCourt('quadra 2', 1)).toBe(false);
      expect(isMatchOnCourt('1', 1)).toBe(true);
      expect(isMatchOnCourt('2', 2)).toBe(true);
      expect(isMatchOnCourt('Q1', 1)).toBe(true);
      expect(isMatchOnCourt('Q2', 2)).toBe(true);
      // Evita colisão com Quadra 10 ao procurar Quadra 1
      expect(isMatchOnCourt('Quadra 10', 1)).toBe(false);
      expect(isMatchOnCourt(undefined, 1)).toBe(false);
    });

    it('gera nomes de arquivo semânticos para o lote de súmulas', () => {
      expect(generateBatchScoresheetFileName('quadra-1', 'Classificatória')).toBe('sumulas-quadra-1-classificatoria.pdf');
      expect(generateBatchScoresheetFileName('quadra-2', 'Mata-Mata')).toBe('sumulas-quadra-2-mata-mata.pdf');
      expect(generateBatchScoresheetFileName('todas', 'Fase 1')).toBe('sumulas-todas-fase-1.pdf');
    });
  });

  describe('2. Mapeamento da Partida para o Document Engine (match.mapper.ts)', () => {
    it('mapeia Quadra 1 e Quadra 2 com precisão no payload de súmula', () => {
      const matchQ1 = createDummyMatch({ court: 'Quadra 1', matchNumber: 12 });
      const dataQ1 = mapMatchRecordToBaseosScoresheet(matchQ1, dummyComp, undefined, undefined, [], []);

      expect(dataQ1.competition.court).toBe('QUADRA 1');
      expect(dataQ1.competition.location).toBe('Ginásio Central Voltz');
      expect(dataQ1.match.number).toBe(12);
      expect(dataQ1.match.scheduledTime).toBe('09:00');
      expect(dataQ1.competition.date).toBe('2026-10-20');

      const matchQ2 = createDummyMatch({ court: '2', matchNumber: 13, scheduledTime: '2026-10-20T10:30:00Z' });
      const dataQ2 = mapMatchRecordToBaseosScoresheet(matchQ2, dummyComp, undefined, undefined, [], []);

      expect(dataQ2.competition.court).toBe('QUADRA 2');
      expect(dataQ2.match.number).toBe(13);
      expect(dataQ2.match.scheduledTime).toBe('10:30');
    });

    it('aceita fallback de venueName customizado sem perda', () => {
      const matchWithVenue = createDummyMatch({
        venue: 'Arena Poliesportiva',
        court: 'Quadra 2',
      });
      const data = mapMatchRecordToBaseosScoresheet(matchWithVenue, dummyComp, undefined, undefined, [], []);

      expect(data.competition.location).toBe('Arena Poliesportiva');
      expect(data.competition.court).toBe('QUADRA 2');
    });
  });

  describe('3. Ordenação Cronológica e Separação por Quadra', () => {
    it('ordena partidas alocadas na Quadra 1 em estrita ordem cronológica', () => {
      const m1 = createDummyMatch({ id: 'm1', matchNumber: 1, scheduledTime: '2026-10-20T11:00:00Z', court: 'Quadra 1' });
      const m2 = createDummyMatch({ id: 'm2', matchNumber: 2, scheduledTime: '2026-10-20T08:30:00Z', court: 'Quadra 1' });
      const m3 = createDummyMatch({ id: 'm3', matchNumber: 3, scheduledTime: '2026-10-20T14:00:00Z', court: 'Quadra 2' });
      const m4 = createDummyMatch({ id: 'm4', matchNumber: 4, scheduledTime: '2026-10-20T09:45:00Z', court: 'Quadra 1' });

      const allMatches = [m1, m2, m3, m4];

      // Filtrar apenas Quadra 1
      const q1Matches = allMatches.filter((m) => isMatchOnCourt(m.court, 1));
      expect(q1Matches).toHaveLength(3);

      // Ordenar cronologicamente
      const sortedQ1 = sortScheduleMatches(q1Matches);
      expect(sortedQ1.map((m) => m.matchNumber)).toEqual([2, 4, 1]);
      expect(sortedQ1.map((m) => m.scheduledTime)).toEqual([
        '2026-10-20T08:30:00Z',
        '2026-10-20T09:45:00Z',
        '2026-10-20T11:00:00Z',
      ]);
    });

    it('ordena partidas da fase completa por Horário -> Quadra', () => {
      const mQ2_early = createDummyMatch({ id: 'm1', matchNumber: 1, scheduledTime: '2026-10-20T08:30:00Z', court: 'Quadra 2' });
      const mQ1_early = createDummyMatch({ id: 'm2', matchNumber: 2, scheduledTime: '2026-10-20T08:30:00Z', court: 'Quadra 1' });
      const mQ1_late = createDummyMatch({ id: 'm3', matchNumber: 3, scheduledTime: '2026-10-20T10:00:00Z', court: 'Quadra 1' });

      const sorted = sortScheduleMatches([mQ1_late, mQ2_early, mQ1_early]);
      expect(sorted[0].id).toBe('m2'); // 08:30, Quadra 1
      expect(sorted[1].id).toBe('m1'); // 08:30, Quadra 2
      expect(sorted[2].id).toBe('m3'); // 10:00, Quadra 1
    });
  });

  describe('4. Resolução em Lote de Súmulas (resolveBatchScoresheetsData)', () => {
    it('notifica o progresso a cada partida processada', async () => {
      const m1 = createDummyMatch({ id: 'm1', court: 'Quadra 1' });
      const m2 = createDummyMatch({ id: 'm2', court: 'Quadra 2' });

      const data1 = mapMatchRecordToBaseosScoresheet(m1, dummyComp, undefined, undefined, [], []);
      const data2 = mapMatchRecordToBaseosScoresheet(m2, dummyComp, undefined, undefined, [], []);

      const progressCallback = vi.fn();
      const resolved = await resolveBatchScoresheetsData([data1, data2], progressCallback);

      expect(resolved).toHaveLength(2);
      expect(progressCallback).toHaveBeenCalledWith(1, 2);
      expect(progressCallback).toHaveBeenCalledWith(2, 2);
    });
  });

  describe('5. Blindagem Geométrica Anti-Colisão (layoutValidator.ts)', () => {
    it('mantém 0 colisões no layout de 3 sets (THREE_SET_A4_LAYOUT)', () => {
      const val = validateScoresheetLayout(THREE_SET_A4_LAYOUT);
      expect(val.valid).toBe(true);
      expect(val.errors).toHaveLength(0);
    });

    it('mantém 0 colisões no layout de 5 sets (FIVE_SET_A4_LAYOUT)', () => {
      const val = validateScoresheetLayout(FIVE_SET_A4_LAYOUT);
      expect(val.valid).toBe(true);
      expect(val.errors).toHaveLength(0);
    });
  });
});
