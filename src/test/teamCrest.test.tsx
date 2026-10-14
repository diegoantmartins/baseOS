import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamCrest } from '@/components/ui/TeamCrest';

describe('TeamCrest (Brasão e Escudo Universal)', () => {
  it('renderiza a imagem real da equipe quando logoUrl estiver presente', () => {
    const { container } = render(
      <TeamCrest
        name="SNK Voleibol"
        shortName="SNK"
        logoUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        size="md"
      />
    );

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('src')).toContain('data:image/png;base64');
  });

  it('renderiza o Brasão Vetorial Esportivo (SVG Shield) com iniciais quando logoUrl for nula', () => {
    const { container } = render(
      <TeamCrest
        name="AAADU Preguiça"
        shortName="ADU"
        logoUrl={null}
        size="md"
      />
    );

    expect(container.querySelector('img')).toBeNull();
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector('text')?.textContent).toBe('ADU');
  });

  it('faz fallback gracioso para o SVG Shield quando a imagem falha no carregamento (onError)', () => {
    const { container } = render(
      <TeamCrest
        name="Overzone Vôlei"
        shortName="OVZ"
        logoUrl="https://invalid-domain-404.com/broken-logo.png"
        size="lg"
      />
    );

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();

    // Dispara erro no carregamento da imagem
    fireEvent.error(img!);

    // Agora o SVG Shield deve ser renderizado no lugar
    expect(container.querySelector('img')).toBeNull();
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector('text')?.textContent).toBe('OVZ');
  });

  it('aplica corretamente as dimensões de acordo com o tamanho selecionado', () => {
    const { container: c1 } = render(<TeamCrest name="Time 1" size="xs" />);
    expect(c1.firstElementChild?.className).toContain('h-5');

    const { container: c2 } = render(<TeamCrest name="Time 2" size="md" />);
    expect(c2.firstElementChild?.className).toContain('h-11');

    const { container: c3 } = render(<TeamCrest name="Time 3" size="xl" />);
    expect(c3.firstElementChild?.className).toContain('h-24');
  });
});
