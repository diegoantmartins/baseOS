// =====================================================================
// BaseOS Component - Régua Ponto a Ponto (114pt Exatos)
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { PointGridData } from '../types/set';
import { BASEOS_TOKENS } from '../theme/tokens';
import { generatePointRulerColumns } from '../geometry/grids';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    borderLeftWidth: BASEOS_TOKENS.borders.REGULAR,
    borderLeftColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    height: 114,
  },
  header: {
    height: 10,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderBottomWidth: BASEOS_TOKENS.borders.THIN,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  body: {
    height: 94,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    flexDirection: 'column',
  },
  colDivider: {
    borderRightWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  cell: {
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellSingle8: {
    height: 11.75, // 8 linhas * 11.75 = 94pt
  },
  cellTieBreak10: {
    height: 9.4, // 10 linhas * 9.4 = 94pt
  },
  cellRegular12: {
    height: 7.83, // 12 linhas * 7.83 = ~94pt
  },
  cellText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  markedCell: {
    backgroundColor: BASEOS_TOKENS.colors.GRAY_MEDIUM,
  },
  markedCellText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
  },
  footerT: {
    height: 10,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderTopColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  footerTText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
  },
});

interface BaseosPointGridProps {
  pointGrid: PointGridData;
  maxPoints?: number;
  width?: number;
}

export const BaseosPointGrid: React.FC<BaseosPointGridProps> = ({
  pointGrid,
  maxPoints = 36,
  width,
}) => {
  const grid = generatePointRulerColumns(maxPoints);
  const markedMap = new Set(
    pointGrid.points.filter(p => p.marked).map(p => p.point),
  );

  const calculatedWidth = width || (grid.isSingleCol ? 14 : maxPoints <= 30 ? 24 : 28);
  const cellStyle = grid.isSingleCol
    ? styles.cellSingle8
    : maxPoints <= 30
      ? styles.cellTieBreak10
      : styles.cellRegular12;

  const renderColumn = (pts: number[], hasDivider = true) => (
    <View style={[styles.column, hasDivider ? styles.colDivider : {}]}>
      {pts.map(pt => {
        const isMarked = markedMap.has(pt);
        return (
          <View
            key={`pt-${pt}`}
            style={[styles.cell, cellStyle, isMarked ? styles.markedCell : {}]}
          >
            <Text
              style={[styles.cellText, isMarked ? styles.markedCellText : {}]}
            >
              {pt}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, { width: calculatedWidth }]}>
      <View style={styles.header}>
        <Text style={styles.headerText}>PONTOS</Text>
      </View>
      <View style={styles.body}>
        {grid.isSingleCol ? (
          renderColumn(grid.col1, false)
        ) : (
          <>
            {renderColumn(grid.col1, true)}
            {grid.col2 ? renderColumn(grid.col2, true) : null}
            {grid.col3 ? renderColumn(grid.col3, false) : null}
          </>
        )}
      </View>
      <View style={styles.footerT}>
        <Text style={styles.footerTText}>"T"</Text>
      </View>
    </View>
  );
};
