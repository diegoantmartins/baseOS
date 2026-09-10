// =====================================================================
// BaseOS Template - Documento Completo da Ordem de Saque (@react-pdf)
// =====================================================================

import React from 'react';
import { Document, Page, View, StyleSheet } from '@react-pdf/renderer';
import type { BaseosServeOrderData } from '../types/serveOrder';
import { BaseosServeOrderHeader } from '../components/BaseosServeOrderHeader';
import { BaseosServeOrderCard } from '../components/BaseosServeOrderCard';

const styles = StyleSheet.create({
  page: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'column',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardRowSpacing: {
    marginBottom: 6,
  },
});

interface Props {
  data: BaseosServeOrderData;
}

export const BaseosServeOrderDocument: React.FC<Props> = ({ data }) => {
  const isFiveSets = data.rules.format === '5-sets';
  const totalPages = isFiveSets ? 2 : 1;

  const cardsA = data.cards.filter(c => c.teamSide === 'A');
  const cardsB = data.cards.filter(c => c.teamSide === 'B');

  return (
    <Document
      title={`Ordem_de_Saque_BaseOS_${data.match.number || '1'}`}
      author="BaseOS Sports Platform"
      creator="BaseOS Document Engine"
    >
      {/* Página 1: Sets Iniciais ou Todos os Sets (em 1 ou 3 sets) */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <BaseosServeOrderHeader data={data} pageNumber={1} totalPages={totalPages} />

        {/* Linha 1: Equipe A */}
        <View style={[styles.cardRow, styles.cardRowSpacing]}>
          {cardsA.slice(0, 4).map((card, idx) => (
            <BaseosServeOrderCard key={`card-a-p1-${idx}`} card={card} />
          ))}
        </View>

        {/* Linha 2: Equipe B */}
        <View style={styles.cardRow}>
          {cardsB.slice(0, 4).map((card, idx) => (
            <BaseosServeOrderCard key={`card-b-p1-${idx}`} card={card} />
          ))}
        </View>
      </Page>

      {/* Página 2: Apenas para Melhor de 5 Sets (Set 5 Decisivo + Reservas) */}
      {isFiveSets && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <BaseosServeOrderHeader data={data} pageNumber={2} totalPages={totalPages} />

          {/* Linha 1: Equipe A (Set 5 Decisivo + Reservas) */}
          <View style={[styles.cardRow, styles.cardRowSpacing]}>
            {cardsA.slice(4, 8).map((card, idx) => (
              <BaseosServeOrderCard key={`card-a-p2-${idx}`} card={card} />
            ))}
          </View>

          {/* Linha 2: Equipe B (Set 5 Decisivo + Reservas) */}
          <View style={styles.cardRow}>
            {cardsB.slice(4, 8).map((card, idx) => (
              <BaseosServeOrderCard key={`card-b-p2-${idx}`} card={card} />
            ))}
          </View>
        </Page>
      )}
    </Document>
  );
};
