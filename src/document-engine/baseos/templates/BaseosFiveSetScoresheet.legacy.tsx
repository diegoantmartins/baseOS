// =====================================================================
// BaseOS Template - Súmula Oficial de 5 Sets (Backup / Versão Histórica)
// Preservação do Modelo de Engenharia Anterior
// =====================================================================

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BaseosScoresheetData } from '../types/scoresheet';
import type { Rect } from '../geometry/rect';
import { getScoresheetLayout } from '../geometry/layouts';
import { validateScoresheetLayout } from '../geometry/layoutValidator';
import { BaseosThreeSetHeader } from '../components/BaseosThreeSetHeader';
import { BaseosSetBlock } from '../components/BaseosSetBlock';
import { BaseosRosters } from '../components/BaseosRosters';
import { BaseosFiveSetSanctions } from '../components/BaseosFiveSetSanctions';
import { BaseosFiveSetResult } from '../components/BaseosFiveSetResult';
import { BaseosFiveSetSignatures } from '../components/BaseosFiveSetSignatures';
import { createBlankSetData } from '../mapper/set.mapper';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  card: {
    position: 'absolute',
  },
});

function cardStyle(rect: Rect) {
  return [
    styles.card,
    {
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    },
  ];
}

export interface BaseosFiveSetScoresheetLegacyBackupProps {
  data: BaseosScoresheetData;
}

export const BaseosFiveSetPageLegacyBackup: React.FC<BaseosFiveSetScoresheetLegacyBackupProps> = ({ data }) => {
  const layout = getScoresheetLayout('5-sets', data.document.output);

  const layoutValidation = validateScoresheetLayout(layout);
  if (!layoutValidation.valid && process.env.NODE_ENV !== 'production') {
    console.warn('[BaseOS Layout Warning] Colisões detectadas no layout de 5 sets:', layoutValidation.errors);
  }

  const set1 = data.sets.set1 || createBlankSetData(1, '5-sets');
  const set2 = data.sets.set2 || createBlankSetData(2, '5-sets');
  const set3 = data.sets.set3 || createBlankSetData(3, '5-sets');
  const set4 = data.sets.set4 || createBlankSetData(4, '5-sets');
  const set5 = data.sets.set5 || createBlankSetData(5, '5-sets');

  return (
    <Page size={layout.page.name} orientation={layout.page.orientation} style={styles.page}>
      <View style={cardStyle(layout.cards.header)}>
        <BaseosThreeSetHeader
          competition={data.competition}
          match={data.match}
          teamAName={data.teams.A.name}
          teamBName={data.teams.B.name}
        />
      </View>

      <View style={cardStyle(layout.cards.sets[1]!)}>
        <BaseosSetBlock setData={set1} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[1]!.height} />
      </View>
      <View style={cardStyle(layout.cards.sets[2]!)}>
        <BaseosSetBlock setData={set2} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[2]!.height} />
      </View>
      <View style={cardStyle(layout.cards.sets[3]!)}>
        <BaseosSetBlock setData={set3} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[3]!.height} />
      </View>
      <View style={cardStyle(layout.cards.sets[4]!)}>
        <BaseosSetBlock setData={set4} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[4]!.height} />
      </View>
      <View style={cardStyle(layout.cards.sets[5]!)}>
        <BaseosSetBlock setData={set5} teamA={data.teams.A} teamB={data.teams.B} isDecidingSet height={layout.cards.sets[5]!.height} />
      </View>

      <View style={cardStyle(layout.cards.rosters)}>
        <BaseosRosters teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.rosters.height} />
      </View>
      <View style={cardStyle(layout.cards.sanctions)}>
        <BaseosFiveSetSanctions sanctions={data.sanctions} improperRequests={data.improperRequests} height={layout.cards.sanctions.height} />
      </View>
      <View style={cardStyle(layout.cards.signatures)}>
        <BaseosFiveSetSignatures officials={data.officials} signatures={data.signatures} observations={data.observations} height={layout.cards.signatures.height} />
      </View>
      <View style={cardStyle(layout.cards.result)}>
        <BaseosFiveSetResult result={data.result} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.result.height} />
      </View>

      <View style={{ position: 'absolute', bottom: 5, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 4.5, color: '#666' }}>
          Súmula Oficial processada e gerada pelo sistema Base OS
        </Text>
      </View>
    </Page>
  );
};

export const BaseosFiveSetScoresheetLegacyBackup: React.FC<BaseosFiveSetScoresheetLegacyBackupProps> = ({ data }) => {
  const layout = getScoresheetLayout('5-sets', data.document.output);
  return (
    <Document title={`Sumula_Oficial_5Sets_Jogo_${data.match.number || '1'}_${layout.output}`}>
      <BaseosFiveSetPageLegacyBackup data={data} />
    </Document>
  );
};
