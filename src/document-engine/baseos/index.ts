// =====================================================================
// BaseOS Scoresheet Engine - Ponto de Entrada Público
// =====================================================================

export * from './types/scoresheet';
export * from './types/team';
export * from './types/set';
export * from './types/competition';
export * from './types/officials';

export * from './domain/set.rules';
export * from './domain/rotation.rules';
export * from './domain/roster.rules';

export * from './geometry/page';
export * from './geometry/dimensions';
export * from './geometry/grids';
export * from './geometry/rect';
export * from './geometry/layouts';
export * from './geometry/layoutValidator';

export * from './theme/tokens';
export * from './theme/colors';
export * from './theme/typography';

export * from './mapper/match.mapper';
export * from './mapper/team.mapper';
export * from './mapper/roster.mapper';
export * from './mapper/set.mapper';

export * from './validation/validator';

export * from './templates/BaseosThreeSetScoresheet';
export * from './templates/BaseosFiveSetScoresheet';
export * from './templates/BaseosBatchScoresheetDocument';

export * from './service/scoresheetService';

export * from './types/serveOrder';
export * from './templates/BaseosServeOrderDocument';
export * from './components/BaseosServeOrderCard';
export * from './components/BaseosServeOrderHeader';
export * from './service/serveOrderService';
