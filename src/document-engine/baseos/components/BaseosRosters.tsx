// =====================================================================
// BaseOS Component - Tabela de Elencos e Oficiais (420pt Exatos)
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BaseosTeamData } from '../types/team';
import { BASEOS_TOKENS } from '../theme/tokens';
import { ROSTER_CAPACITY } from '../domain/roster.rules';

const styles = StyleSheet.create({
  container: {
    height: 420,
    borderWidth: BASEOS_TOKENS.borders.REGULAR,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'column',
  },
  mainHeader: {
    height: 12,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderBottomWidth: BASEOS_TOKENS.borders.THIN,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  mainHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    letterSpacing: 1.0,
  },
  columnsWrapper: {
    flexDirection: 'row',
    height: 408,
  },
  teamColumn: {
    flex: 1,
    height: 408,
    flexDirection: 'column',
  },
  dividerRight: {
    borderRightWidth: BASEOS_TOKENS.borders.REGULAR,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  tableSubHeader: {
    height: 10,
    flexDirection: 'row',
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
  },
  colNumberHeader: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  colNameHeader: {
    flex: 1,
    paddingLeft: 3,
  },
  headerLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
  },
  athletesBlock: {
    height: 224,
    flexDirection: 'column',
  },
  row: {
    height: 16,
    flexDirection: 'row',
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
  },
  cellNumber: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  cellName: {
    flex: 1,
    paddingLeft: 3,
    justifyContent: 'center',
  },
  cellText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5.5,
  },
  sectionDivider: {
    height: 12,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderTopWidth: BASEOS_TOKENS.borders.THIN,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionDividerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
  },
  liberosBlock: {
    height: 30,
    flexDirection: 'column',
  },
  liberoRow: {
    height: 15,
    flexDirection: 'row',
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
  },
  staffBlock: {
    height: 60,
    flexDirection: 'column',
  },
  staffRow: {
    height: 15,
    flexDirection: 'row',
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
  },
  signaturesBlock: {
    height: 60,
    flexDirection: 'column',
    borderTopWidth: BASEOS_TOKENS.borders.THIN,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    padding: 3,
    justifyContent: 'space-around',
  },
  signatureLine: {
    flexDirection: 'column',
  },
  signatureLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    marginBottom: 2,
  },
});

interface BaseosRostersProps {
  teamA: BaseosTeamData;
  teamB: BaseosTeamData;
}

export const BaseosRosters: React.FC<BaseosRostersProps> = ({ teamA, teamB }) => {
  const staffRolesList: Array<{ code: 'T' | 'AT1' | 'AT2' | 'PF' | 'M/F'; label: string }> = [
    { code: 'T', label: 'Técnico' },
    { code: 'AT1', label: 'Assistente Técnico' },
    { code: 'PF', label: 'Preparador Físico' },
    { code: 'M/F', label: 'Médico' },
  ];

  const renderTeamRoster = (team: BaseosTeamData, isFirst: boolean, sideLetter: 'A' | 'B') => {
    const regularRows = Array.from(
      { length: ROSTER_CAPACITY.MAX_REGULAR_ATHLETES },
      (_, i) => team.athletes[i],
    );

    const liberoRows = Array.from(
      { length: ROSTER_CAPACITY.MAX_LIBEROS },
      (_, i) => team.liberos[i],
    );

    const staffMap = new Map(team.staff.map(s => [s.roleCode, s.name]));

    return (
      <View style={[styles.teamColumn, isFirst ? styles.dividerRight : {}]}>
        {/* Sub-header (Nº / NOME DOS JOGADORES) */}
        <View style={styles.tableSubHeader}>
          <View style={styles.colNumberHeader}>
            <Text style={styles.headerLabel}>Nº</Text>
          </View>
          <View style={styles.colNameHeader}>
            <Text style={styles.headerLabel}>
              {team.name ? team.name.toUpperCase() : `EQUIPE (${sideLetter})`}
            </Text>
          </View>
        </View>

        {/* 14 Linhas de Atletas Regulares */}
        <View style={styles.athletesBlock}>
          {regularRows.map((ath, idx) => (
            <View key={`reg-${idx}`} style={styles.row}>
              <View style={styles.cellNumber}>
                <Text style={styles.cellText}>
                  {ath?.jerseyNumber !== undefined ? String(ath.jerseyNumber) : ''}
                </Text>
              </View>
              <View style={styles.cellName}>
                <Text style={styles.cellText}>
                  {ath ? `${ath.name}${ath.isCaptain ? ' (C)' : ''}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Seção de Líberos */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionDividerText}>JOGADORES LÍBEROS ("L")</Text>
        </View>

        <View style={styles.liberosBlock}>
          {liberoRows.map((lib, idx) => (
            <View key={`lib-${idx}`} style={styles.liberoRow}>
              <View style={styles.cellNumber}>
                <Text style={styles.cellText}>
                  {lib?.jerseyNumber !== undefined ? String(lib.jerseyNumber) : `L${idx + 1}`}
                </Text>
              </View>
              <View style={styles.cellName}>
                <Text style={styles.cellText}>
                  {lib ? `${lib.name} [L]` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Seção de Comissão Técnica */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionDividerText}>COMISSÃO TÉCNICA</Text>
        </View>

        <View style={styles.staffBlock}>
          {staffRolesList.map(role => (
            <View key={`stf-${role.code}`} style={styles.staffRow}>
              <View style={styles.cellNumber}>
                <Text style={styles.cellText}>{role.code}</Text>
              </View>
              <View style={styles.cellName}>
                <Text style={styles.cellText}>
                  {staffMap.get(role.code) || ''}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Assinaturas */}
        <View style={styles.signaturesBlock}>
          <View style={styles.signatureLine}>
            <Text style={styles.signatureLabel}>CAPITÃO {sideLetter}: ____________________________</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text style={styles.signatureLabel}>TÉCNICO {sideLetter}: ____________________________</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainHeader}>
        <Text style={styles.mainHeaderText}>EQUIPES</Text>
        <Text style={styles.mainHeaderText}>( A )   VS   ( B )</Text>
      </View>
      <View style={styles.columnsWrapper}>
        {renderTeamRoster(teamA, true, 'A')}
        {renderTeamRoster(teamB, false, 'B')}
      </View>
    </View>
  );
};
