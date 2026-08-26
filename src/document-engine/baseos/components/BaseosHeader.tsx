// =====================================================================
// BaseOS Component - Cabeçalho Oficial (Padrão Homologado CBV / FIVB)
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
    height: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 140,
  },
  logoBars: {
    width: 13,
    height: 13,
    justifyContent: 'space-between',
    marginRight: 4,
  },
  logoBarTop: {
    height: 2.2,
    width: 10,
    backgroundColor: '#1E293B',
    borderRadius: 0.5,
  },
  logoBarMid: {
    height: 2.2,
    width: 13,
    marginLeft: 2.5,
    backgroundColor: '#F59E0B',
    borderRadius: 0.5,
  },
  logoBarBot: {
    height: 2.2,
    width: 10,
    backgroundColor: '#334155',
    borderRadius: 0.5,
  },
  brandName: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 9.0,
    color: '#000000',
    letterSpacing: 0.5,
  },
  brandNameAccent: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    color: '#F59E0B',
  },
  brandSubtitle: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
    color: '#666666',
    letterSpacing: 0.2,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  docTitle: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.8,
    color: '#333333',
    textTransform: 'uppercase',
  },
  confrontationTitle: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 8.5,
    color: '#000000',
    textTransform: 'uppercase',
    marginTop: 0.5,
  },
  rightSection: {
    width: 110,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sealBox: {
    borderWidth: 0.6,
    borderColor: '#000000',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    alignItems: 'center',
    borderRadius: 1,
  },
  sealStandard: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
    color: '#555555',
    textTransform: 'uppercase',
  },
  sealMatchNum: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7.5,
    color: '#000000',
    textTransform: 'uppercase',
  },
  metaBar: {
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  metaCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRightWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderRightColor: '#DCDCDC',
    height: '100%',
  },
  metaLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: '#555555',
    marginRight: 2,
  },
  metaValue: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.8,
    color: '#000000',
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
  const compName = competition.name ? competition.name.toUpperCase() : 'TORNEIO OFICIAL';
  const nameA = teamAName ? teamAName.toUpperCase() : 'EQUIPE A';
  const nameB = teamBName ? teamBName.toUpperCase() : 'EQUIPE B';

  return (
    <View style={styles.container}>
      {/* Linha Superior: Branding BaseOS + Súmula Oficial + Confronto + Selo */}
      <View style={styles.topRow}>
        {/* Esquerda: Branding BaseOS */}
        <View style={styles.brandSection}>
          <View style={styles.logoBars}>
            <View style={styles.logoBarTop} />
            <View style={styles.logoBarMid} />
            <View style={styles.logoBarBot} />
          </View>
          <View>
            <Text style={styles.brandName}>
              Base<Text style={styles.brandNameAccent}>OS</Text>
            </Text>
            <Text style={styles.brandSubtitle}>GESTÃO DE COMPETIÇÕES</Text>
          </View>
        </View>

        {/* Centro: Título do Documento e Confronto */}
        <View style={styles.centerSection}>
          <Text style={styles.docTitle}>SÚMULA OFICIAL • {compName}</Text>
          <Text style={styles.confrontationTitle}>{nameA}   ×   {nameB}</Text>
        </View>

        {/* Direita: Selo Padrão CBV / FIVB */}
        <View style={styles.rightSection}>
          <View style={styles.sealBox}>
            <Text style={styles.sealStandard}>PADRÃO CBV / FIVB</Text>
            <Text style={styles.sealMatchNum}>JOGO Nº {match.number || '01'}</Text>
          </View>
        </View>
      </View>

      {/* Faixa de Metadados em Linha Única */}
      <View style={styles.metaBar}>
        <View style={[styles.metaCell, { flex: 2.2 }]}>
          <Text style={styles.metaLabel}>LOCAL:</Text>
          <Text style={styles.metaValue}>
            {competition.location || competition.city || 'Ginásio Principal'}
          </Text>
        </View>

        <View style={[styles.metaCell, { flex: 1.1 }]}>
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

        <View style={[styles.metaCell, { flex: 0.9 }]}>
          <Text style={styles.metaLabel}>NAIPE:</Text>
          <Text style={styles.metaValue}>{genderLabel}</Text>
        </View>

        <View style={[styles.metaCell, { flex: 1.1 }]}>
          <Text style={styles.metaLabel}>FASE / GRUPO:</Text>
          <Text style={styles.metaValue}>{competition.phase || 'Classificatória'}</Text>
        </View>

        <View style={[styles.metaCell, { flex: 0.8, borderRightWidth: 0 }]}>
          <Text style={styles.metaLabel}>QUADRA:</Text>
          <Text style={styles.metaValue}>{competition.court || '1'}</Text>
        </View>
      </View>
    </View>
  );
};
