import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BASEOS_TOKENS } from '../theme/tokens';
import type { Rect } from '../geometry/rect';

const styles = StyleSheet.create({
  container: {
    borderWidth: BASEOS_TOKENS.borders.REGULAR,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'column',
  },
  header: {
    height: 10,
    backgroundColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: BASEOS_TOKENS.colors.WHITE,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    padding: 4,
  },
  text: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
  },
});

interface BaseosRemarksProps {
  layout: Rect;
  observations?: string;
}

export const BaseosRemarks: React.FC<BaseosRemarksProps> = ({
  layout,
  observations,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          width: layout.width,
          height: layout.height,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>OBSERVAÇÕES</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>
          {observations || 'Nenhuma observação registrada pela arbitragem.'}
        </Text>
      </View>
    </View>
  );
};
