import { describe, it } from 'vitest';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Calibration 5 Sets Exact Positions Test', () => {
  it('draws calibrated sample data onto sumula-5-sets.pdf', async () => {
    const filePath = join(process.cwd(), 'src/document-engine/templates/sumula-5-sets.pdf');
    const buffer = readFileSync(filePath);
    const bytes = new Uint8Array(buffer);
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const height = page.getHeight(); // 841

    // Helper: draw text at top-origin
    const draw = (text: string, x: number, yTop: number, size = 9.0, isBold = false) => {
      const baselineY = height - (yTop + size * 0.85);
      page.drawText(text, {
        x,
        y: baselineY,
        size,
        font: isBold ? boldFont : font,
        color: rgb(0, 0, 0.7),
      });
    };

    // 1. Header Left
    draw('SUPERLIGA MASCULINA DE VOLEIBOL 2026 - FINAL', 135, 68.0, 9.5, true);
    draw('CURITIBA', 75, 87.0, 8.5, false);
    draw('FINAL', 315, 87.0, 8.5, false);
    draw('01', 450, 87.0, 9.5, true);
    draw('GINÁSIO DO TARUMÃ - QUADRA 1', 80, 105.0, 8.5, false);
    draw('X', 118, 124.0, 9.5, true); // MASC
    draw('ADULTO / PRINCIPAL', 260, 124.0, 8.5, false);

    // 2. Header Center (Data / Horário / Equipes)
    draw('26/08/2026', 485, 74.0, 9.5, true);
    draw('19:30', 675, 74.0, 9.5, true);
    draw('MINAS TÊNIS CLUBE', 480, 105.0, 9.5, true);
    draw('SADA CRUZEIRO VOLEI', 645, 105.0, 9.5, true);

    // 3. Tabela EQUIPES (Linha 3 - ao lado do Set 5 x: 740-1160, y: 470-600)
    // 12 Jogadores da Equipe A e Equipe B
    const rowYs5 = [
      480.0, 490.5, 501.0, 511.5, 522.0, 532.5,
      543.0, 553.5, 564.0, 574.5, 585.0, 595.5
    ];

    rowYs5.forEach((y, idx) => {
      // Equipe A
      draw(String(idx + 1).padStart(2, '0'), 745, y, 7.0, true);
      draw(`Jogador A ${idx + 1}${idx === 0 ? ' (C)' : ''}`, 763, y, 7.0, idx === 0);

      // Equipe B
      draw(String(idx + 1).padStart(2, '0'), 953, y, 7.0, true);
      draw(`Jogador B ${idx + 1}${idx === 0 ? ' (C)' : ''}`, 971, y, 7.0, idx === 0);
    });

    // Comissão Técnica (Linha Inferior Direita y: 645-740)
    draw('Técnico Equipe A', 875, 646.0, 7.5, false);
    draw('Técnico Equipe B', 1025, 646.0, 7.5, false);

    // Árbitros / Aprovação (Centro Inferior y: 696-720)
    draw('Árbitro Principal CBV', 300, 696.0, 7.5, false);
    draw('Segundo Árbitro CBV', 300, 706.0, 7.5, false);
    draw('Apontador Oficial', 300, 716.0, 7.5, false);

    const outBytes = await doc.save();
    writeFileSync('/home/diego-martins/docker/tmp/opencode/fase2/calibrated-sample-5sets.pdf', outBytes);
  });
});
