// =====================================================================
// BaseOS Component - Cabeçalho da Ordem de Saque (A4 Paisagem)
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import type { BaseosServeOrderData } from '../types/serveOrder';
import { BASEOS_TOKENS } from '../theme/tokens';
import { BASEOS_LOGO_LIGHT_PNG } from '../assets/baseosLogos';

const styles = StyleSheet.create({
  container: {
    height: 36,
    width: '100%',
    borderWidth: BASEOS_TOKENS.borders.REGULAR,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 170,
  },
  brandLogo: {
    width: 78,
    height: 20,
    objectFit: 'contain',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  docTitle: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7.2,
    color: '#333333',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  matchTitle: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 8.8,
    color: '#000000',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  rightSection: {
    width: 220,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  compName: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7.5,
    color: '#000000',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  metaText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5.5,
    color: '#4B5563',
  },
  metaBold: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    color: '#111827',
  },
});

interface Props {
  data: BaseosServeOrderData;
  pageNumber?: number;
  totalPages?: number;
}

export const BaseosServeOrderHeader: React.FC<Props> = ({ data, pageNumber, totalPages }) => {
  const teamAName = data.teams.teamA.name || 'EQUIPE A';
  const teamBName = data.teams.teamB.name || 'EQUIPE B';
  const matchNum = data.match.number ? `JOGO Nº ${data.match.number}` : '';
  const dateStr = data.match.date || '';
  const timeStr = data.match.time ? `${data.match.time}` : '';
  const courtStr = data.match.court ? `QUADRA ${data.match.court}` : '';
  const phaseStr = data.competition.phase ? `${data.competition.phase}` : '';

  return (
    <View style={styles.container}>
      {/* Esquerda: Identidade Canônica BaseOS */}
      <View style={styles.leftSection}>
        <Image src={{ uri: BASEOS_LOGO_LIGHT_PNG }} style={styles.brandLogo} />
      </View>

      {/* Centro: Título do Documento e Confronto */}
      <View style={styles.centerSection}>
        <Text style={styles.docTitle}>ORDEM DE SAQUE / FICHA DE POSIÇÃO INICIAL</Text>
        <Text style={styles.matchTitle}>
          {teamAName} × {teamBName} {matchNum ? `· ${matchNum}` : ''}
        </Text>
      </View>

      {/* Direita: Metadados da Competição e Partida */}
      <View style={styles.rightSection}>
        <Text style={styles.compName}>
          {data.competition.name || 'COMPETIÇÃO OFICIAL'}
        </Text>
        <View style={styles.metaRow}>
          {phaseStr ? <Text style={styles.metaText}>{phaseStr} · </Text> : null}
          {dateStr ? <Text style={styles.metaText}>{dateStr} {timeStr} · </Text> : null}
          {courtStr ? <Text style={styles.metaText}>{courtStr}</Text> : null}
          {totalPages && totalPages > 1 ? (
            <Text style={[styles.metaText, styles.metaBold]}>
              {' '}[Pág {pageNumber}/{totalPages}]
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};
