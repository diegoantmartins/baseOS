// =====================================================================
// BaseOS Component - Tabela de Elencos e Oficiais (Modular e Dinâmica)
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BaseosTeamData } from '../types/team';
import { BASEOS_TOKENS } from '../theme/tokens';
import { ROSTER_CAPACITY } from '../domain/roster.rules';

const styles = StyleSheet.create({
  container: {
    borderWidth: BASEOS_TOKENS.borders.STRONG,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'column',
  },
  mainHeader: {
    height: 12,
    backgroundColor: BASEOS_TOKENS.colors.BLACK,
    borderBottomWidth: BASEOS_TOKENS.borders.STRONG,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  mainHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: BASEOS_TOKENS.colors.WHITE,
    letterSpacing: 1.0,
  },
  columnsWrapper: {
    flexDirection: 'row',
    flex: 1,
  },
  teamColumn: {
    flex: 1,
    flexDirection: 'column',
  },
  dividerRight: {
    borderRightWidth: BASEOS_TOKENS.borders.STRONG,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  tableSubHeader: {
    height: 10,
    flexDirection: 'row',
    backgroundColor: BASEOS_TOKENS.colors.BLACK,
    borderBottomWidth: BASEOS_TOKENS.borders.STRONG,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
  },
  colNumberHeader: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: BASEOS_TOKENS.borders.THIN,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  colNameHeader: {
    flex: 1,
    paddingLeft: 3,
  },
  headerLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
    color: BASEOS_TOKENS.colors.WHITE,
  },
  athletesBlock: {
    flex: 1,
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  cellNumber: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: BASEOS_TOKENS.borders.THIN,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  cellName: {
    flex: 1,
    paddingLeft: 3,
    justifyContent: 'center',
  },
  cellText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5.2,
  },
  sectionDivider: {
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderTopWidth: BASEOS_TOKENS.borders.STRONG,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
    borderBottomWidth: BASEOS_TOKENS.borders.STRONG,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionDividerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.0,
  },
  liberosBlock: {
    flexDirection: 'column',
  },
  liberoRow: {
    flexDirection: 'row',
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  staffBlock: {
    flexDirection: 'column',
  },
  staffRow: {
    flexDirection: 'row',
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  signaturesBlock: {
    flexDirection: 'column',
    borderTopWidth: BASEOS_TOKENS.borders.THIN,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    padding: 2,
    justifyContent: 'space-around',
  },
  signatureLine: {
    flexDirection: 'column',
  },
  signatureLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
  },
});

interface BaseosRostersProps {
  teamA: BaseosTeamData;
  teamB: BaseosTeamData;
  height?: number;
  isCompact?: boolean;
}

export const BaseosRosters: React.FC<BaseosRostersProps> = ({
  teamA,
  teamB,
  height = 420,
  isCompact = false,
}) => {
  const staffRolesList: Array<{ code: 'T' | 'AT1' | 'AT2' | 'PF' | 'M/F'; label: string }> = [
    { code: 'T', label: 'Técnico' },
    { code: 'AT1', label: 'Assistente Técnico' },
    { code: 'PF', label: 'Preparador Físico' },
    { code: 'M/F', label: 'Médico' },
  ];

  const availableHeight = height - 12 - 10;
  const dividerHeight = isCompact ? 7 : 10;
  const sigHeight = isCompact ? 16 : Math.max(25, height * 0.12);
  const remainingForRows = availableHeight - (2 * dividerHeight) - sigHeight;
  const rowHeight = remainingForRows / 20;

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
        {/* Sub-header */}
        <View style={styles.tableSubHeader}>
          <View style={styles.colNumberHeader}>
            <Text style={styles.headerLabel}>Nº</Text>
          </View>
          <View style={[styles.colNameHeader, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={styles.headerLabel}>EQUIPE  </Text>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                borderWidth: 1,
                borderColor: BASEOS_TOKENS.colors.WHITE,
                backgroundColor: sideLetter === 'A' ? BASEOS_TOKENS.colors.WHITE : 'transparent',
                marginHorizontal: 2,
              }}
            />
            <Text style={styles.headerLabel}> A  </Text>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                borderWidth: 1,
                borderColor: BASEOS_TOKENS.colors.WHITE,
                backgroundColor: sideLetter === 'B' ? BASEOS_TOKENS.colors.WHITE : 'transparent',
                marginHorizontal: 2,
              }}
            />
            <Text style={styles.headerLabel}> B    {team.name ? team.name.toUpperCase() : ''}{team.shortName ? ` [${team.shortName.toUpperCase()}]` : ''}</Text>
          </View>
        </View>

        {/* 14 Linhas de Atletas Regulares */}
        <View style={styles.athletesBlock}>
          {regularRows.map((ath, idx) => (
            <View key={`reg-${idx}`} style={[styles.row, { height: rowHeight }]}>
              <View style={styles.cellNumber}>
                {ath?.isCaptain ? (
                  <View style={{ width: 9, height: 9, borderRadius: 4.5, borderWidth: 0.8, borderColor: BASEOS_TOKENS.colors.BLACK, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[styles.cellText, { fontSize: 4.8, marginTop: 0.5 }]}>
                      {ath.jerseyNumber !== undefined ? String(ath.jerseyNumber) : ''}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.cellText}>
                    {ath?.jerseyNumber !== undefined ? String(ath.jerseyNumber) : ''}
                  </Text>
                )}
              </View>
              <View style={styles.cellName}>
                <Text style={styles.cellText}>
                  {ath ? ath.name : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Seção de Líberos */}
        <View style={[styles.sectionDivider, { height: dividerHeight }]}>
          <Text style={styles.sectionDividerText}>JOGADORES LÍBEROS ("L")</Text>
        </View>

        <View style={styles.liberosBlock}>
          {liberoRows.map((lib, idx) => (
            <View key={`lib-${idx}`} style={[styles.liberoRow, { height: rowHeight }]}>
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
        <View style={[styles.sectionDivider, { height: dividerHeight }]}>
          <Text style={styles.sectionDividerText}>COMISSÃO TÉCNICA</Text>
        </View>

        <View style={styles.staffBlock}>
          {staffRolesList.map(role => (
            <View key={`stf-${role.code}`} style={[styles.staffRow, { height: rowHeight }]}>
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
        <View style={[styles.signaturesBlock, { height: sigHeight }]}>
          <View style={styles.signatureLine}>
            <Text style={styles.signatureLabel}>CAPITÃO: ____________________________</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text style={styles.signatureLabel}>TÉCNICO: ____________________________</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.mainHeader}>
        <Text style={styles.mainHeaderText}>EQUIPES</Text>
      </View>
      <View style={styles.columnsWrapper}>
        {renderTeamRoster(teamA, true, 'A')}
        {renderTeamRoster(teamB, false, 'B')}
      </View>
    </View>
  );
};
