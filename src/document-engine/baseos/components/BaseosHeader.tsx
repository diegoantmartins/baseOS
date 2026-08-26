// =====================================================================
// BaseOS Component - Cabeçalho Oficial (Fiel ao Modelo Regional CBV)
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BaseosCompetitionData, BaseosMatchInfo } from '../types/competition';
import { BASEOS_TOKENS } from '../theme/tokens';

const styles = StyleSheet.create({
  container: {
    height: 42,
    borderWidth: BASEOS_TOKENS.borders.STRONG,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    marginBottom: 3,
    flexDirection: 'column',
  },
  topRow: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: BASEOS_TOKENS.borders.STRONG,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.BRAND_PRIMARY,
    paddingHorizontal: 6,
  },
  logoTitleBox: {
    width: 150,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  competitionTitle: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7.5,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  competitionSub: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  confrontationBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  teamName: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7.5,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  vsText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 8.0,
    marginHorizontal: 6,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  headerRightBox: {
    width: 90,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerBadge: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7.0,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  metaBar: {
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  metaCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRightWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  metaLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
    marginRight: 2,
  },
  metaValue: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
});

interface BaseosHeaderProps {
  competition: BaseosCompetitionData;
  match: BaseosMatchInfo;
  teamAName?: string;
  teamBName?: string;
}

export const BaseosHeader: React.FC<BaseosHeaderProps> = ({
  competition,
  match,
  teamAName,
  teamBName,
}) => {
  const genderLabel = match.gender === 'female' ? 'Feminino' : (match.gender === 'mixed' ? 'Misto' : 'Masculino');

  return (
    <View style={styles.container}>
      {/* Topo: Nome do Torneio, Confronto em Destaque e Número do Jogo */}
      <View style={styles.topRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ backgroundColor: BASEOS_TOKENS.colors.WHITE, paddingVertical: 2, paddingHorizontal: 4, borderRadius: 2, marginRight: 6 }}>
            <Text style={{ color: BASEOS_TOKENS.colors.BLACK, fontFamily: BASEOS_TOKENS.fonts.BOLD, fontSize: 8 }}>BaseOS</Text>
          </View>
          <View style={styles.logoTitleBox}>
            <Text style={styles.competitionTitle}>
              {competition.name ? competition.name.toUpperCase() : 'TORNEIO OFICIAL DE VOLEIBOL'}
            </Text>
            <Text style={styles.competitionSub}>SÚMULA OFICIAL</Text>
          </View>
        </View>

        <View style={styles.confrontationBox}>
          <Text style={styles.teamName}>
            {teamAName ? teamAName.toUpperCase() : 'EQUIPE A'}
          </Text>
          <Text style={styles.vsText}>X</Text>
          <Text style={styles.teamName}>
            {teamBName ? teamBName.toUpperCase() : 'EQUIPE B'}
          </Text>
        </View>

        <View style={styles.headerRightBox}>
          <Text style={styles.headerBadge}>JOGO Nº {match.number || '____'}</Text>
        </View>
      </View>

      {/* Faixa de Metadados em Linha Única */}
      <View style={styles.metaBar}>
        <View style={[styles.metaCell, { flex: 2 }]}>
          <Text style={styles.metaLabel}>LOCAL:</Text>
          <Text style={styles.metaValue}>
            {competition.location || competition.city || 'Ginásio Principal'}
          </Text>
        </View>

        <View style={[styles.metaCell, { flex: 1 }]}>
          <Text style={styles.metaLabel}>DATA:</Text>
          <Text style={styles.metaValue}>
            {competition.date 
              ? new Date(competition.date + 'T00:00:00').toLocaleDateString('pt-BR') 
              : '__/__/____'}
          </Text>
        </View>

        <View style={[styles.metaCell, { flex: 0.9 }]}>
          <Text style={styles.metaLabel}>HORA:</Text>
          <Text style={styles.metaValue}>{match.scheduledTime || '__:__'}</Text>
        </View>

        <View style={[styles.metaCell, { flex: 0.7 }]}>
          <Text style={styles.metaLabel}>NAIPE:</Text>
          <Text style={styles.metaValue}>{genderLabel}</Text>
        </View>

        <View style={[styles.metaCell, { flex: 1 }]}>
          <Text style={styles.metaLabel}>GRUPO:</Text>
          <Text style={styles.metaValue}>{competition.phase || 'A'}</Text>
        </View>

        <View style={[styles.metaCell, { flex: 1, borderRightWidth: 0 }]}>
          <Text style={styles.metaLabel}>QUADRA:</Text>
          <Text style={styles.metaValue}>{competition.court || '1'}</Text>
        </View>
      </View>
    </View>
  );
};
