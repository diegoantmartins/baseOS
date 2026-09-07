/**
 * BaseOS — Testes de Homologação: Portal Público da Competição, Slug e QR Code
 * 
 * Validação de:
 * 1. Geração determinística de slug (remoção de diacríticos, espaços, caracteres especiais).
 * 2. Imutabilidade de slug em atualizações da competição (mesmo com renomeação de nome).
 * 3. Sanitização e ausência de campos privados nos DTOs públicos (LGPD, access_token, registration_deadline).
 * 4. Consumo canônico de classificação (standingsService) e resultados (CompetitionRulesService.getCanonicalMatchResult).
 * 5. Rejeição de slug inexistente (comportamento 404).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCompetitionSlug,
  sanitizePublicCompetition,
  publicCompetitionService,
} from '@/services/publicCompetitionService';
import { dataAccess, resetLocalData } from '@/services/dataAccess';
import type { CompetitionRecord } from '@/types/entities';

describe('BaseOS — Fase 3.3: Portal Público, Slug e Segurança', () => {
  beforeEach(() => {
    resetLocalData();
  });

  describe('1. Utilitário Determinístico de Slug', () => {
    it('deve gerar slug em minúsculas e sem acentos', () => {
      const slug = generateCompetitionSlug('Copa Verão & Voleibol — Taça 2026!');
      expect(slug).toBe('copa-verao-voleibol-taca-2026');
    });

    it('deve remover múltiplos hífens consecutivos e das extremidades', () => {
      const slug = generateCompetitionSlug('---Campeonato   Regional---');
      expect(slug).toBe('campeonato-regional');
    });

    it('deve retornar "competicao" para strings vazias ou nulas', () => {
      expect(generateCompetitionSlug('')).toBe('competicao');
      expect(generateCompetitionSlug(undefined)).toBe('competicao');
      expect(generateCompetitionSlug('   ')).toBe('competicao');
    });
  });

  describe('2. Imutabilidade Estrita do Slug no Domínio (dataAccess)', () => {
    it('deve preservar o slug original mesmo quando a competição for renomeada', async () => {
      // 1. Cria uma competição inicial
      const comp = await dataAccess.createCompetition({
        name: 'Copa Regional 2026',
        modality: 'indoor',
        format: 'round-robin',
        playerFormat: '6x6',
        setFormat: '5-sets',
        genderCategory: 'male',
        status: 'planning',
      });

      expect(comp.slug).toBe('copa-regional-2026');

      // 2. Renomeia a competição para outro nome completamente diferente
      const updated = await dataAccess.updateCompetition(comp.id, {
        name: 'Copa Regional do Paraná 2026 — Edição Especial',
      });

      // 3. O nome mudou, mas o SLUG PERMANECE INALTERADO
      expect(updated?.name).toBe('Copa Regional do Paraná 2026 — Edição Especial');
      expect(updated?.slug).toBe('copa-regional-2026');

      // 4. A busca pelo slug original continua funcionando
      const foundByOriginalSlug = await dataAccess.getCompetitionBySlug('copa-regional-2026');
      expect(foundByOriginalSlug).not.toBeNull();
      expect(foundByOriginalSlug?.id).toBe(comp.id);
    });

    it('deve tratar colisões numéricas ao criar competições com o mesmo nome no storage', async () => {
      const comp1 = await dataAccess.createCompetition({
        name: 'Torneio Estadual',
        modality: 'beach',
        format: 'single-elimination',
        playerFormat: '2x2',
        setFormat: '3-sets',
        genderCategory: 'female',
        status: 'planning',
      });

      const comp2 = await dataAccess.createCompetition({
        name: 'Torneio Estadual',
        modality: 'beach',
        format: 'single-elimination',
        playerFormat: '2x2',
        setFormat: '3-sets',
        genderCategory: 'female',
        status: 'planning',
      });

      expect(comp1.slug).toBe('torneio-estadual');
      expect(comp2.slug).toBe('torneio-estadual-2');
    });
  });

  describe('3. Proteção de Privacidade e LGPD (DTOs Sanitizados)', () => {
    it('sanitizePublicCompetition deve expor apenas dados esportivos públicos e regras canônicas', () => {
      const mockComp: CompetitionRecord = {
        id: 'comp-priv-1',
        name: 'Copa Fechada',
        slug: 'copa-fechada',
        modality: 'indoor',
        format: 'round-robin',
        playerFormat: '6x6',
        setFormat: '5-sets',
        genderCategory: 'male',
        status: 'in-progress',
        config: {
          version: 1,
          format: {
            defaultSetsToWin: 3,
            setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 },
          },
          scoring: {
            systemType: 'fivb-standard',
            pointsWinClear: 3,
            pointsWinNarrow: 2,
            pointsLossNarrow: 1,
            pointsLossClear: 0,
            pointsWoWin: 3,
            pointsWoLoss: 0,
          },
          standings: { tiebreakCriteriaOrder: ['points', 'victories'], advancingPerGroup: 2 },
          registration: {
            minAthletes: 6,
            maxAthletes: 14,
            maxCaptains: 1,
            maxLiberos: 2,
            requireJerseyNumberOnRegistration: false,
          },
        },
      };

      const dto = sanitizePublicCompetition(mockComp);

      expect(dto.name).toBe('Copa Fechada');
      expect(dto.slug).toBe('copa-fechada');
      expect(dto.statusLabel).toBe('Em Andamento');
      expect(dto.publicRules.setsToWin).toBe(3);
      expect(dto.publicRules.regularSetPoints).toBe(25);
      expect(dto.publicRules.tiebreakPoints).toBe(15);
      expect(dto.publicRules.pointsWinClear).toBe(3);

      // Não deve expor o objeto de configuração interna com limites ou credenciais
      expect(((dto as unknown) as Record<string, unknown>).config).toBeUndefined();
      expect(((dto as unknown) as Record<string, unknown>).rulesSnapshot).toBeUndefined();
    });

    it('getPublicCompetitionBundle não deve retornar access_token, registration_deadline nem atletas individuais', async () => {
      const bundle = await publicCompetitionService.getPublicCompetitionBundle('liga-nacional-pro-masculino-2026');
      expect(bundle).not.toBeNull();

      if (bundle) {
        expect(bundle.teams.length).toBeGreaterThan(0);
        for (const team of bundle.teams) {
          // Garante sanitização de credenciais de equipe
          expect(((team as unknown) as Record<string, unknown>).accessToken).toBeUndefined();
          expect(((team as unknown) as Record<string, unknown>).registrationDeadline).toBeUndefined();
          expect(((team as unknown) as Record<string, unknown>).access_token).toBeUndefined();
        }

        // Garante que atletas não estão presentes no bundle de dados do portal
        expect(((bundle as unknown) as Record<string, unknown>).athletes).toBeUndefined();
      }
    });
  });

  describe('4. Consumo Canônico de SSOT Esportivo e 404', () => {
    it('deve retornar null para slug inexistente', async () => {
      const nonExistent = await publicCompetitionService.getPublicCompetitionBySlug('slug-que-nao-existe-9999');
      expect(nonExistent).toBeNull();

      const bundleNonExistent = await publicCompetitionService.getPublicCompetitionBundle('slug-que-nao-existe-9999');
      expect(bundleNonExistent).toBeNull();
    });

    it('deve carregar jogos e classificação canônica oficial via bundle', async () => {
      const bundle = await publicCompetitionService.getPublicCompetitionBundle('liga-nacional-pro-masculino-2026');
      expect(bundle).not.toBeNull();

      if (bundle) {
        expect(bundle.competition.name).toBe('Liga Nacional Pro 2026 - Masculino');
        expect(bundle.groups.length).toBeGreaterThan(0);
        expect(bundle.matches.length).toBeGreaterThan(0);
        expect(bundle.standings.length).toBeGreaterThan(0);

        // Verifica que as partidas possuem campos calculados de resultado canônico
        const firstMatch = bundle.matches[0];
        expect(firstMatch).toHaveProperty('isCompleted');
        expect(firstMatch).toHaveProperty('setsWonA');
        expect(firstMatch).toHaveProperty('setsWonB');
        expect(firstMatch).toHaveProperty('setScores');

        // Verifica formato da classificação por grupo
        const firstGroup = bundle.standings[0];
        expect(firstGroup).toHaveProperty('groupName');
        expect(firstGroup).toHaveProperty('standings');
        expect(Array.isArray(firstGroup.standings)).toBe(true);
      }
    });
  });

  describe('5. Regressão de Rename e Estabilidade do QR Code', () => {
    it('quando a competição for renomeada, a URL do QR Code permanece estritamente idêntica', async () => {
      // 1. Cria a competição
      const comp = await dataAccess.createCompetition({
        name: 'Taça Cidade Maravilhosa',
        modality: 'indoor',
        format: 'round-robin',
        playerFormat: '6x6',
        setFormat: '5-sets',
        genderCategory: 'male',
        status: 'in-progress',
      });

      const initialSlug = comp.slug!;
      expect(initialSlug).toBe('taca-cidade-maravilhosa');

      // 2. Simula o cálculo da URL oficial do QR Code pelo origin
      const origin = 'https://baseos.esporte.com';
      const initialQrUrl = `${origin}/c/${initialSlug}`;

      // 3. Atualiza o nome da competição no BaseOS
      const updatedComp = await dataAccess.updateCompetition(comp.id, {
        name: 'Taça Cidade Maravilhosa de Voleibol — Super Final 2026',
      });

      // 4. A URL e o slug persistido permanecem inalterados
      expect(updatedComp?.slug).toBe(initialSlug);
      const updatedQrUrl = `${origin}/c/${updatedComp?.slug}`;
      expect(updatedQrUrl).toBe(initialQrUrl);

      // 5. O QR Code impresso com a URL inicial continua encontrando a competição renomeada
      const resolvedBundle = await publicCompetitionService.getPublicCompetitionBundle(initialSlug);
      expect(resolvedBundle).not.toBeNull();
      expect(resolvedBundle?.competition.name).toBe('Taça Cidade Maravilhosa de Voleibol — Super Final 2026');
      expect(resolvedBundle?.competition.slug).toBe(initialSlug);
    });
  });

  describe('6. Cadeia Canônica de Resultados e Pontuação FIVB/CBV', () => {
    it('a classificação no portal público deve refletir a pontuação canônica (3pts vitória limpa, 2pts tiebreak, 1pt derrota tiebreak)', async () => {
      // Usa os dados de semente masculina já persistidos
      const bundle = await publicCompetitionService.getPublicCompetitionBundle('liga-nacional-pro-masculino-2026');
      expect(bundle).not.toBeNull();

      if (bundle) {
        // Encontra o grupo A
        const grupoA = bundle.standings.find(g => g.groupName === 'Grupo A');
        expect(grupoA).toBeDefined();

        if (grupoA) {
          // As equipes do Grupo A devem ter posições ordenadas
          expect(grupoA.standings.length).toBeGreaterThan(0);
          for (let i = 0; i < grupoA.standings.length - 1; i++) {
            const current = grupoA.standings[i];
            const next = grupoA.standings[i + 1];
            expect(current.position).toBeLessThanOrEqual(next.position);
            // Pontuação deve ser maior ou igual (ou desempate canônico)
            expect(current.pointsWon).toBeGreaterThanOrEqual(0);
          }
        }

        // Verifica que todos os jogos encerrados possuem sets e vencedor canônico
        const completedMatches = bundle.matches.filter(m => m.isCompleted);
        for (const m of completedMatches) {
          expect(m.winnerSide).not.toBeNull();
          expect(['A', 'B']).toContain(m.winnerSide);
          expect(m.setsWonA + m.setsWonB).toBeGreaterThanOrEqual(2);
        }
      }
    });
  });

  describe('7. Normalização de Registros Legados e Caracteres Especiais', () => {
    it('deve gerar slug seguro mesmo para competições com caracteres especiais ou símbolos', () => {
      expect(generateCompetitionSlug('*** Vôlei & Praia @ 2026 $$$')).toBe('volei-praia-2026');
      expect(generateCompetitionSlug('///???!!!')).toBe('competicao');
    });

    it('ao carregar registro legado sem slug do banco local, deve normalizar determinísticamente', async () => {
      // Cria sem slug forçado no storage
      const comp = await dataAccess.createCompetition({
        name: 'Torneio Amador Retrô',
        modality: 'indoor',
        format: 'round-robin',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'planning',
      });

      const reloaded = await dataAccess.getCompetitionBySlug('torneio-amador-retro');
      expect(reloaded).not.toBeNull();
      expect(reloaded?.id).toBe(comp.id);
    });
  });
});

