// =====================================================================
// BaseOS Component - Cabeçalho Oficial da Súmula 3 Sets Torneio
// Dimensões: 821.89 x 42 pt
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import type { BaseosCompetitionData, BaseosMatchInfo } from '../types/competition';
import { BASEOS_TOKENS } from '../theme/tokens';
import { BASEOS_LOGO_LIGHT_PNG } from '../assets/baseosLogos';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderWidth: 1.2,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  leftBrand: {
    width: 140,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    borderRightWidth: 1,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  brandLogo: {
    width: 86,
    height: 22,
    objectFit: 'contain',
  },
  centerMatch: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  competitionTitle: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.5,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  teamCircleText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  teamBox: {
    borderBottomWidth: 1,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    paddingHorizontal: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  teamBoxText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 8.5,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  vsText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 8.0,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
    marginHorizontal: 6,
  },
  centerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  centerMetaText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
  },
  rightMeta: {
    width: 230,
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 3,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
  },
  metaGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
    marginRight: 2,
  },
  metaValue: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  badgePadrao: {
    backgroundColor: BASEOS_TOKENS.colors.BLACK,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  badgePadraoText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
    color: BASEOS_TOKENS.colors.WHITE,
  },
});

interface BaseosThreeSetHeaderProps {
  competition: BaseosCompetitionData;
  match: BaseosMatchInfo;
  teamAName: string;
  teamBName: string;
}

export const BaseosThreeSetHeader: React.FC<BaseosThreeSetHeaderProps> = ({
  competition,
  match,
  teamAName,
  teamBName,
}) => {
  return (
    <View style={styles.container}>
      {/* Bloco Institucional Esquerda */}
      <View style={styles.leftBrand}>
        <Image src={{ uri: BASEOS_LOGO_LIGHT_PNG }} style={styles.brandLogo} />
      </View>

      {/* Bloco Central do Confronto */}
      <View style={styles.centerMatch}>
        <Text style={styles.competitionTitle}>{competition.name || 'CAMPEONATO OFICIAL'}</Text>
        <View style={styles.matchupRow}>
          <View style={styles.teamCircle}>
            <Text style={styles.teamCircleText}>A</Text>
          </View>
          <View style={styles.teamBox}>
            <Text style={styles.teamBoxText}>{teamAName || 'EQUIPE A'}</Text>
          </View>
          <Text style={styles.vsText}>×</Text>
          <View style={styles.teamBox}>
            <Text style={styles.teamBoxText}>{teamBName || 'EQUIPE B'}</Text>
          </View>
          <View style={styles.teamCircle}>
            <Text style={styles.teamCircleText}>B</Text>
          </View>
        </View>
        <View style={styles.centerMetaRow}>
          <Text style={styles.centerMetaText}>Local: {competition.location || 'Ginásio Oficial'}</Text>
          <Text style={styles.centerMetaText}>Cidade: {competition.city || 'Principal'}</Text>
        </View>
      </View>

      {/* Bloco de Metadados Direita */}
      <View style={styles.rightMeta}>
        <View style={styles.metaGridRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>DATA:</Text>
            <Text style={styles.metaValue}>{competition.date || '__/__/____'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>HORA:</Text>
            <Text style={styles.metaValue}>{match.scheduledTime || '__:__'}</Text>
          </View>
          <View style={styles.badgePadrao}>
            <Text style={styles.badgePadraoText}>PADRÃO OFICIAL</Text>
          </View>
        </View>
        <View style={styles.metaGridRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>FASE:</Text>
            <Text style={styles.metaValue}>{competition.phase || 'Classificatória'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>JOGO Nº:</Text>
            <Text style={[styles.metaValue, { fontFamily: BASEOS_TOKENS.fonts.BOLD }]}>{match.number || '01'}</Text>
          </View>
        </View>
        <View style={styles.metaGridRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>NAIPE:</Text>
            <Text style={styles.metaValue}>
              {match.gender === 'male' ? 'MASCULINO' : match.gender === 'female' ? 'FEMININO' : 'MISTO'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>QUADRA:</Text>
            <Text style={styles.metaValue}>{competition.court || '1'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};
