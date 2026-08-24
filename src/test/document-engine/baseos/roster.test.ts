import { describe, it, expect } from 'vitest';
import { mapRoster } from '@/document-engine/baseos/mapper/roster.mapper';
import type { CompetitionAthlete } from '@/types/registration';

describe('BaseOS Document Engine - Roster Rules (Sem atletas fictícios)', () => {
  it('separa corretamente atletas regulares de líberos e não inventa atletas', () => {
    const raw: CompetitionAthlete[] = [
      { id: '1', competitionTeamId: 'c1', name: 'Atleta 1', jerseyNumber: 5, position: 'Central', isCaptain: false, isLibero: false, gender: 'male', createdAt: '', updatedAt: '' },
      { id: '2', competitionTeamId: 'c1', name: 'Atleta 2', jerseyNumber: 1, position: 'Ponta', isCaptain: true, isLibero: false, gender: 'male', createdAt: '', updatedAt: '' },
      { id: '3', competitionTeamId: 'c1', name: 'Libero 1', jerseyNumber: 18, position: 'Líbero', isCaptain: false, isLibero: true, gender: 'male', createdAt: '', updatedAt: '' },
    ];

    const { athletes, liberos } = mapRoster(raw);

    // Deve ter exatamente 2 atletas regulares ordenados por camisa (1, 5)
    expect(athletes).toHaveLength(2);
    expect(athletes[0].jerseyNumber).toBe(1);
    expect(athletes[1].jerseyNumber).toBe(5);

    // Deve ter exatamente 1 líbero
    expect(liberos).toHaveLength(1);
    expect(liberos[0].jerseyNumber).toBe(18);
  });

  it('respeita capacidade máxima sem estourar a grade', () => {
    const raw: CompetitionAthlete[] = Array.from({ length: 20 }, (_, i) => ({
      id: `a-${i}`,
      competitionTeamId: 'c1',
      name: `Jogador ${i + 1}`,
      jerseyNumber: i + 1,
      position: 'Ponteiro',
      isCaptain: i === 0,
      isLibero: i >= 18,
      gender: 'male',
      createdAt: '',
      updatedAt: '',
    }));

    const { athletes, liberos } = mapRoster(raw);
    expect(athletes.length).toBeLessThanOrEqual(14);
    expect(liberos.length).toBeLessThanOrEqual(2);
  });
});
