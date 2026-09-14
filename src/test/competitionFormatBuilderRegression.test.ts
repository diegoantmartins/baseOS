/**
 * competitionFormatBuilderRegression.test.ts
 *
 * Testes de regressão oficial para a Fase 8.6.2:
 * 1. Garante que CompetitionRulesService entrega uma CompetitionConfig COMPLETA ao builder;
 * 2. Comprova que competições legadas (config: null) e parciais (ex: {"registration": {"maxTeams": 2}})
 *    recebem a árvore de fases (stages) derivada do template correspondente;
 * 3. Comprova que tanto Indoor quanto Beach geram preview de MatchSlots válido e não vazio;
 * 4. Garante que o estado inicial do builder na ausência de config deriva fases válidas de template.
 */

import { describe, it, expect } from 'vitest';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { CompetitionFormatBuilder } from '@/services/competitionFormatBuilder';
import { CompetitionTemplateService } from '@/services/competitionTemplateService';
import type { CompetitionRecord } from '@/types/entities';
import type { CompetitionConfig } from '@/types/competitionConfig';

describe('CompetitionFormatBuilder — Regressão e SSOT de Formatos (Fase 8.6.2)', () => {
  it('1. Competição legada com config nulo recebe árvore de fases válida derivada do template', () => {
    const legacyComp: CompetitionRecord = {
      id: 'comp-legacy-round-robin',
      name: 'Copa Legada Sem Config',
      modality: 'indoor',
      format: 'round-robin',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      status: 'planning',
    };

    const resolvedConfig = CompetitionRulesService.getConfig(legacyComp);

    // Deve possuir o nó format completo
    expect(resolvedConfig.format).toBeDefined();
    expect(resolvedConfig.format.defaultSetsToWin).toBe(2);
    expect(resolvedConfig.format.setRules.regularSetPoints).toBe(25);

    // Deve possuir a árvore de fases instanciada pelo template de Round Robin (não vazia!)
    expect(resolvedConfig.format.stages).toBeDefined();
    expect(resolvedConfig.format.stages!.length).toBeGreaterThan(0);
    expect(resolvedConfig.format.stages![0].id).toBe('fase-unica');
    expect(resolvedConfig.format.stages![0].type).toBe('round-robin');

    // Geração de Preview de Slots NÃO pode ser vazia
    const preview = CompetitionFormatBuilder.generatePreviewSlots(resolvedConfig);
    expect(preview.stages.length).toBe(1);
    expect(preview.slots.length).toBeGreaterThan(0);
  });

  it('2. Competição com config parcial preserva customizações e completa fases a partir do template', () => {
    // Cenário idêntico ao comp-real-authed-861 que provocou o crash no navegador
    const partialComp: CompetitionRecord = {
      id: 'comp-real-authed-861',
      name: 'Copa Real Homologada 8.6.1',
      modality: 'indoor',
      format: 'round-robin',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      status: 'registration-open',
      config: {
        registration: {
          minAthletes: 6,
          maxAthletes: 14,
          maxCaptains: 1,
          maxLiberos: 2,
          requireJerseyNumberOnRegistration: false,
          maxTeams: 2,
        },
      } as unknown as CompetitionConfig,
    };

    const resolvedConfig = CompetitionRulesService.getConfig(partialComp);

    // Deve preservar a propriedade customizada
    expect(resolvedConfig.registration.maxTeams).toBe(2);

    // Deve ter completado as seções faltantes sem deixá-las undefined
    expect(resolvedConfig.format).toBeDefined();
    expect(resolvedConfig.scoring).toBeDefined();
    expect(resolvedConfig.standings).toBeDefined();

    // Deve possuir stages derivados do formato round-robin
    expect(resolvedConfig.format.stages).toBeDefined();
    expect(resolvedConfig.format.stages!.length).toBe(1);

    // Preview de slots deve rodar perfeitamente sem lançar TypeError
    const preview = CompetitionFormatBuilder.generatePreviewSlots(resolvedConfig);
    expect(preview.slots.length).toBeGreaterThan(0);
  });

  it('3. Competição de Praia (Beach) deriva presets de 21 pontos e fases válidas', () => {
    const beachComp: CompetitionRecord = {
      id: 'comp-beach-test',
      name: 'Circuito de Praia 2026',
      modality: 'beach',
      format: 'groups-knockout',
      playerFormat: '2x2',
      setFormat: '3-sets',
      genderCategory: 'mixed',
      status: 'planning',
    };

    const resolvedConfig = CompetitionRulesService.getConfig(beachComp);

    expect(resolvedConfig.format.setRules.regularSetPoints).toBe(21);
    expect(resolvedConfig.format.setRules.tiebreakPoints).toBe(15);
    expect(resolvedConfig.registration.minAthletes).toBe(2);
    expect(resolvedConfig.registration.maxAthletes).toBe(4);
    expect(resolvedConfig.registration.maxLiberos).toBe(0);

    // Fases de grupos + mata-mata
    expect(resolvedConfig.format.stages!.length).toBe(2);
    expect(resolvedConfig.format.stages![0].id).toBe('fase-grupos');
    expect(resolvedConfig.format.stages![1].id).toBe('playoffs');

    // Preview deve simular os slots de grupos e playoffs
    const preview = CompetitionFormatBuilder.generatePreviewSlots(resolvedConfig);
    expect(preview.stages.length).toBe(2);
    expect(preview.slots.length).toBeGreaterThan(0);
  });

  it('4. CompetitionTemplateService suporta tanto nomes de templates quanto nomes de formatos legados', () => {
    const fromLegacyName = CompetitionTemplateService.createConfigFromTemplate('round-robin', { modality: 'indoor' });
    const fromStandardName = CompetitionTemplateService.createConfigFromTemplate('round-robin-standard', { modality: 'indoor' });

    expect(fromLegacyName.format.stages!.length).toBe(fromStandardName.format.stages!.length);
    expect(fromLegacyName.format.stages![0].id).toBe('fase-unica');

    const fromKnockout = CompetitionTemplateService.createConfigFromTemplate('groups-knockout', { modality: 'beach' });
    expect(fromKnockout.format.stages!.length).toBe(2);
  });

  it('5. Construtor CompetitionFormatBuilder.fromConfig normaliza instâncias com segurança total', () => {
    // Passando objeto vazio
    const builder = CompetitionFormatBuilder.fromConfig({} as unknown as CompetitionConfig);
    const built = builder.build();

    expect(built.format).toBeDefined();
    expect(built.format.stages).toBeDefined();
    expect(built.scoring).toBeDefined();
    expect(built.standings).toBeDefined();
    expect(built.registration).toBeDefined();

    // generatePreviewSlots em config nulo/indefinido não quebra
    expect(() => CompetitionFormatBuilder.generatePreviewSlots(null)).not.toThrow();
    expect(() => CompetitionFormatBuilder.generatePreviewSlots(undefined)).not.toThrow();
    expect(CompetitionFormatBuilder.generatePreviewSlots(null).slots).toEqual([]);
  });
});
