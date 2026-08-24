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
    HAIRLINE: 0.4,
    THIN: 0.6,
    REGULAR: 0.9,
    STRONG: 1.4,
    DIVIDER: 2.0,
  },
  padding: {
    XS: 1.0,
    SM: 2.0,
    MD: 3.0,
    LG: 4.0,
  },
} as const;
