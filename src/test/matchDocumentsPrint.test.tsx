import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MatchDocumentsPrint, type MatchPrintData } from '@/components/match/MatchDocumentsPrint';

const mockData: MatchPrintData = {
  competitionName: 'Copa Toledo 2026',
  category: 'Adulto Especial',
  genderCategory: 'Masculino',
  matchNumber: '01',
  phase: 'Fase de Grupos',
  round: '1',
  date: '22/08/2026',
  time: '14:20',
  venue: 'Ginásio Municipal',
  court: 'Quadra 1',
  city: 'Toledo / PR',
  teamA: {
    name: 'Osasco Voleibol',
    shortName: 'OSA',
    coach: 'Luizomar de Moura',
    assistantCoach: 'Jefferson Arosti',
    players: [
      { number: 1, name: 'Lucas Silva', isCaptain: true },
      { number: 2, name: 'Gabriel Santos' },
      { number: 3, name: 'Rafael Oliveira' },
    ],
    liberos: [{ number: 16, name: 'Maique Nascimento', isLibero: true }],
  },
  teamB: {
    name: 'Minas Tênis Clube',
    shortName: 'MIN',
    coach: 'Nicola Negro',
    assistantCoach: 'Guilherme Novaes',
    players: [
      { number: 7, name: 'Vitor Hugo', isCaptain: true },
      { number: 8, name: 'Caio Rocha' },
      { number: 9, name: 'Rodrigo Nunes' },
    ],
    liberos: [{ number: 17, name: 'Lukinha', isLibero: true }],
  },
  sets: [
    { setNumber: 1, scoreA: 25, scoreB: 22, duration: '24 min' },
    { setNumber: 2, scoreA: 25, scoreB: 20, duration: '26 min' },
  ],
  referees: [
    { role: '1º Árbitro', name: 'Paulo Silva' },
    { role: '2º Árbitro', name: 'Marcos Souza' },
    { role: 'Apontador', name: 'Carlos Mendes' },
  ],
  observations: 'Jogo transmitido ao vivo.',
  winnerName: 'Osasco Voleibol',
};

describe('MatchDocumentsPrint Component', () => {
  it('renderiza os 3 documentos quando documentType="all"', () => {
    const { container } = render(<MatchDocumentsPrint matchData={mockData} documentType="all" />);
    expect(container.querySelectorAll('.page-a4-landscape').length).toBe(3);
  });

  it('renderiza apenas a Súmula de 3 Sets quando solicitado', () => {
    const { container, getByText, getAllByText } = render(<MatchDocumentsPrint matchData={mockData} documentType="sumula-3" />);
    expect(container.querySelectorAll('.page-a4-landscape').length).toBe(1);
    expect(getByText('Formato: 2 de 3 Sets')).toBeDefined();
    expect(getAllByText('Osasco Voleibol').length).toBeGreaterThan(0);
    expect(getAllByText('Minas Tênis Clube').length).toBeGreaterThan(0);
  });

  it('renderiza apenas a Súmula de 5 Sets quando solicitado', () => {
    const { container, getByText } = render(<MatchDocumentsPrint matchData={mockData} documentType="sumula-5" />);
    expect(container.querySelectorAll('.page-a4-landscape').length).toBe(1);
    expect(getByText('Formato: 5 Sets')).toBeDefined();
  });

  it('renderiza apenas as Fichas de Ordem de Saque quando solicitado', () => {
    const { container, getByText } = render(<MatchDocumentsPrint matchData={mockData} documentType="ordem-saque" />);
    expect(container.querySelectorAll('.page-a4-landscape').length).toBe(1);
    expect(getByText('Fichas de Posição Inicial e Ordem de Saque')).toBeDefined();
  });
});
