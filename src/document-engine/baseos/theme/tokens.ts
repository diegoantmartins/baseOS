// =====================================================================
// BaseOS Theme - Design Tokens Globais
// =====================================================================

import { BASEOS_COLORS } from './colors';
import { BASEOS_FONTS, BASEOS_FONT_SIZES } from './typography';

export const BASEOS_TOKENS = {
  colors: BASEOS_COLORS,
  fonts: BASEOS_FONTS,
  fontSizes: BASEOS_FONT_SIZES,
  borders: {
    HAIRLINE: 0.2, // Grades internas finas
    THIN: 0.5,     // Divisões secundárias
    REGULAR: 1.0,  // Divisões de seção
    STRONG: 1.5,   // Blocos principais
    DIVIDER: 2.0,
  },
  padding: {
    XS: 1.0,
    SM: 2.0,
    MD: 3.0,
    LG: 4.0,
  },
} as const;
