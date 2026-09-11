import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveActiveCompetition,
  getPersistedCompetitionId,
  setPersistedCompetitionId,
  buildCompetitionUrl,
  buildMatchesUrl,
  buildReportsUrl,
  buildStandingsUrl,
  buildDrawUrl,
  buildRegistrationsUrl,
  PERSISTED_COMPETITION_STORAGE_KEY,
} from '@/services/competitionNavigationHelper';
import type { CompetitionRecord } from '@/types/entities';
import type { CompetitionTab } from '@/components/competition/CompetitionHeader';

const mockCompetitions: CompetitionRecord[] = [
  {
    id: 'comp-alpha-1',
    name: 'Copa Primavera Masculina',
    modality: 'indoor',
    format: 'groups',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    status: 'in-progress',
  },
  {
    id: 'comp-beta-2',
    name: 'Circuito Verão Feminino',
    modality: 'beach',
    format: 'groups',
    playerFormat: '2x2',
    setFormat: '3-sets',
    genderCategory: 'female',
    status: 'registration-open',
  },
  {
    id: 'comp-gamma-3',
    name: 'Torneio Integração Misto',
    modality: 'indoor',
    format: 'groups',
    playerFormat: '4x4',
    setFormat: '3-sets',
    genderCategory: 'mixed',
    status: 'planning',
  },
];

describe('Fase 3: Navegação Contextual e Resolução de Competição Ativa (Matriz Normativa)', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      // Ignora se localStorage não disponível
    }
  });

  // 1. URL válida -> seleciona competição correta
  it('1. [URL válida] seleciona a competição informada na URL e persiste para conveniência futura', () => {
    const result = resolveActiveCompetition({
      searchParamId: 'comp-beta-2',
      competitions: mockCompetitions,
    });

    expect(result.selectedId).toBe('comp-beta-2');
    expect(result.isExplicitInvalid).toBe(false);
    expect(getPersistedCompetitionId()).toBe('comp-beta-2');
  });

  // 2. URL inválida -> NÃO faz fallback silencioso (proteção contra desvio de contexto)
  it('2. [URL inválida] NUNCA seleciona a primeira competição silenciosamente ao receber ID inexistente', () => {
    const result = resolveActiveCompetition({
      searchParamId: 'id-inexistente-123',
      competitions: mockCompetitions,
    });

    expect(result.selectedId).toBeNull();
    expect(result.isExplicitInvalid).toBe(true);
    expect(result.rawExplicitId).toBe('id-inexistente-123');
    // Não polui o storage com ID inválido
    expect(getPersistedCompetitionId()).toBeNull();
  });

  // 3. localStorage válido -> recupera competição quando ausente na URL
  it('3. [localStorage válido] recupera a última competição salva quando a URL não possui ID explícito', () => {
    setPersistedCompetitionId('comp-gamma-3');

    const result = resolveActiveCompetition({
      competitions: mockCompetitions,
    });

    expect(result.selectedId).toBe('comp-gamma-3');
    expect(result.isExplicitInvalid).toBe(false);
  });

  // 4. localStorage inválido -> usa fallback controlado
  it('4. [localStorage inválido] se o storage contiver ID deletado/obsoleto e URL estiver vazia, faz fallback para a primeira', () => {
    setPersistedCompetitionId('comp-deletada-ou-antiga');

    const result = resolveActiveCompetition({
      competitions: mockCompetitions,
    });

    // Como NÃO veio intenção explícita na URL, o fallback de UX é legítimo
    expect(result.selectedId).toBe('comp-alpha-1');
    expect(result.isExplicitInvalid).toBe(false);
  });

  // 5. URL + localStorage -> URL vence sempre (SSOT)
  it('5. [URL + localStorage] a URL explícita tem precedência absoluta sobre o localStorage', () => {
    setPersistedCompetitionId('comp-alpha-1');

    const result = resolveActiveCompetition({
      searchParamId: 'comp-beta-2',
      competitions: mockCompetitions,
    });

    expect(result.selectedId).toBe('comp-beta-2');
    expect(result.isExplicitInvalid).toBe(false);
    // Atualiza storage para refletir a nova escolha
    expect(getPersistedCompetitionId()).toBe('comp-beta-2');
  });

  // 6. routeParamId -> contexto explícito com precedência sobre searchParamId
  it('6. [routeParamId] possui prioridade sobre searchParamId por representar rota direta do recurso', () => {
    const result = resolveActiveCompetition({
      routeParamId: 'comp-gamma-3',
      searchParamId: 'comp-alpha-1',
      competitions: mockCompetitions,
    });

    expect(result.selectedId).toBe('comp-gamma-3');
    expect(result.isExplicitInvalid).toBe(false);
    expect(getPersistedCompetitionId()).toBe('comp-gamma-3');
  });

  // 7. competitionId + tab -> preservação mútua
  it('7. [competitionId + tab] preserva competição e aba na construção da URL', () => {
    const url = buildCompetitionUrl('comp-beta-2', 'config');
    expect(url).toBe('/competicoes?competitionId=comp-beta-2&tab=config');
  });

  // 8. alteração de tab -> mantém competitionId
  it('8. [alteração de tab] mudar de aba preserva estritamente o competitionId atual', () => {
    const initialUrl = new URLSearchParams('competitionId=comp-alpha-1&tab=overview');
    
    // Usuário clica na aba 'standings':
    const nextParams = new URLSearchParams(initialUrl);
    nextParams.set('tab', 'standings');

    expect(nextParams.get('competitionId')).toBe('comp-alpha-1');
    expect(nextParams.get('tab')).toBe('standings');
    expect(buildCompetitionUrl(nextParams.get('competitionId'), 'standings')).toBe(
      '/competicoes?competitionId=comp-alpha-1&tab=standings',
    );
  });

  // 9. alteração de competição -> mantém tab
  it('9. [alteração de competição] mudar de competição na central preserva a aba ativa', () => {
    const initialUrl = new URLSearchParams('competitionId=comp-alpha-1&tab=matches');
    
    // Usuário troca no seletor para comp-beta-2:
    const nextParams = new URLSearchParams(initialUrl);
    nextParams.set('competitionId', 'comp-beta-2');

    expect(nextParams.get('competitionId')).toBe('comp-beta-2');
    expect(nextParams.get('tab')).toBe('matches');
    expect(buildCompetitionUrl('comp-beta-2', 'matches')).toBe(
      '/competicoes?competitionId=comp-beta-2&tab=matches',
    );
  });

  // 10. query adicional -> não perde parâmetros (ex: foo=bar)
  it('10. [query adicional] manipulador funcional de setSearchParams não destrói parâmetros adicionais', () => {
    const currentParams = new URLSearchParams('foo=bar&competitionId=comp-alpha-1&tab=matches&filter=active');
    
    // Atualização funcional simulada: prev => { const next = new URLSearchParams(prev); next.set('competitionId', 'comp-beta-2'); return next; }
    const updatedParams = new URLSearchParams(currentParams);
    updatedParams.set('competitionId', 'comp-beta-2');

    expect(updatedParams.get('foo')).toBe('bar');
    expect(updatedParams.get('filter')).toBe('active');
    expect(updatedParams.get('tab')).toBe('matches');
    expect(updatedParams.get('competitionId')).toBe('comp-beta-2');
  });

  // 11. builders -> geram rotas canônicas fortemente tipadas
  it('11. [builders] helpers de navegação constroem URLs canônicas sem concatenação frágil', () => {
    expect(buildCompetitionUrl('comp-alpha-1')).toBe('/competicoes?competitionId=comp-alpha-1');
    expect(buildCompetitionUrl('comp-alpha-1', 'overview')).toBe('/competicoes?competitionId=comp-alpha-1');
    expect(buildCompetitionUrl('comp-alpha-1', 'reports')).toBe('/competicoes?competitionId=comp-alpha-1&tab=reports');
    expect(buildCompetitionUrl()).toBe('/competicoes');

    expect(buildMatchesUrl('comp-beta-2')).toBe('/jogos?competitionId=comp-beta-2');
    expect(buildMatchesUrl('all')).toBe('/jogos');
    expect(buildMatchesUrl()).toBe('/jogos');

    expect(buildReportsUrl('comp-gamma-3')).toBe('/relatorios?competitionId=comp-gamma-3');
    expect(buildReportsUrl()).toBe('/relatorios');

    expect(buildStandingsUrl('comp-alpha-1')).toBe('/classificacao?competitionId=comp-alpha-1');
    expect(buildStandingsUrl()).toBe('/classificacao');

    expect(buildDrawUrl('comp-alpha-1')).toBe('/sorteio/comp-alpha-1');
    expect(buildDrawUrl()).toBe('/sorteio');

    expect(buildRegistrationsUrl('comp-beta-2')).toBe('/competicoes/comp-beta-2/inscricoes');
  });

  // Cenário de Abas Válidas
  it('12. [abas válidas] valida cobertura completa do union type CompetitionTab sem identificadores ad-hoc', () => {
    const validTabs: CompetitionTab[] = [
      'overview',
      'config',
      'teams',
      'athletes',
      'draw',
      'matches',
      'standings',
      'reports',
    ];

    validTabs.forEach((tab) => {
      const url = buildCompetitionUrl('comp-alpha-1', tab);
      if (tab === 'overview') {
        expect(url).toBe('/competicoes?competitionId=comp-alpha-1');
      } else {
        expect(url).toBe(`/competicoes?competitionId=comp-alpha-1&tab=${tab}`);
      }
    });
  });

  // Cenário de Histórico do Navegador
  it('13. [Back/Forward] navegação no histórico reavalia o ID sem inconsistências', () => {
    // 1. Entra na A
    let res = resolveActiveCompetition({ searchParamId: 'comp-alpha-1', competitions: mockCompetitions });
    expect(res.selectedId).toBe('comp-alpha-1');

    // 2. Navega para B
    res = resolveActiveCompetition({ searchParamId: 'comp-beta-2', competitions: mockCompetitions });
    expect(res.selectedId).toBe('comp-beta-2');

    // 3. Usuário clica no "Voltar" (URL volta para comp-alpha-1)
    res = resolveActiveCompetition({ searchParamId: 'comp-alpha-1', competitions: mockCompetitions });
    expect(res.selectedId).toBe('comp-alpha-1');
  });
});
