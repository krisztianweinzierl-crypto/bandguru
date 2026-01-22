import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rechnungId } = await req.json();

    // Lade Rechnungsdaten
    const rechnungen = await base44.entities.Rechnung.filter({ id: rechnungId });
    const rechnung = rechnungen[0];

    if (!rechnung) {
      return Response.json({ error: 'Rechnung nicht gefunden' }, { status: 404 });
    }

    // Lade Kunde
    const kunden = await base44.entities.Kunde.filter({ id: rechnung.kunde_id });
    const kunde = kunden[0];

    // Lade Organisation
    const orgs = await base44.entities.Organisation.filter({ id: rechnung.org_id });
    const organisation = orgs[0];

    // Erstelle PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header - Organisation
    doc.setFontSize(10);
    doc.setTextColor(100);
    if (organisation?.name) {
      doc.text(organisation.name, 20, yPos);
      yPos += 5;
    }
    if (organisation?.adresse) {
      const adresseLines = doc.splitTextToSize(organisation.adresse, 80);
      doc.text(adresseLines, 20, yPos);
      yPos += adresseLines.length * 5;
    }

    // Rechnungstitel
    yPos = 60;
    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.text('RECHNUNG', 20, yPos);

    // Rechnungsnummer und Datum
    yPos += 15;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Rechnungsnummer: ${rechnung.rechnungsnummer}`, 20, yPos);
    yPos += 7;
    doc.text(`Rechnungsdatum: ${new Date(rechnung.rechnungsdatum).toLocaleDateString('de-DE')}`, 20, yPos);
    yPos += 7;
    doc.text(`Fälligkeitsdatum: ${new Date(rechnung.faelligkeitsdatum).toLocaleDateString('de-DE')}`, 20, yPos);

    // Kunde (rechts)
    doc.setTextColor(0);
    doc.setFontSize(11);
    const kundeX = pageWidth - 80;
    let kundeY = 60;
    if (kunde) {
      doc.text(kunde.firmenname || '', kundeX, kundeY);
      kundeY += 7;
      if (kunde.ansprechpartner) {
        doc.setFontSize(9);
        doc.text(kunde.ansprechpartner, kundeX, kundeY);
        kundeY += 6;
      }
      if (kunde.adresse) {
        doc.setFontSize(9);
        const adresseLines = doc.splitTextToSize(kunde.adresse, 60);
        doc.text(adresseLines, kundeX, kundeY);
        kundeY += adresseLines.length * 5;
      }
    }

    // Positionen Tabelle
    yPos += 20;
    doc.setFontSize(10);
    doc.setTextColor(0);
    
    // Tabellenkopf
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos, pageWidth - 40, 8, 'F');
    doc.text('Beschreibung', 22, yPos + 6);
    doc.text('Menge', pageWidth - 90, yPos + 6);
    doc.text('Einzelpreis', pageWidth - 65, yPos + 6);
    doc.text('Gesamt', pageWidth - 30, yPos + 6, { align: 'right' });

    yPos += 12;

    // Positionen
    if (rechnung.positionen && Array.isArray(rechnung.positionen)) {
      rechnung.positionen.forEach((pos) => {
        const beschreibung = doc.splitTextToSize(pos.beschreibung || '', 80);
        doc.text(beschreibung, 22, yPos);
        
        const menge = `${pos.menge || 0} ${pos.einheit || ''}`;
        doc.text(menge, pageWidth - 90, yPos);
        
        const einzelpreis = (pos.einzelpreis || 0).toFixed(2) + ' €';
        doc.text(einzelpreis, pageWidth - 65, yPos);
        
        const gesamt = ((pos.menge || 0) * (pos.einzelpreis || 0)).toFixed(2) + ' €';
        doc.text(gesamt, pageWidth - 30, yPos, { align: 'right' });
        
        yPos += Math.max(beschreibung.length * 5, 8);
      });
    }

    // Summen
    yPos += 10;
    doc.setDrawColor(200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.text('Nettobetrag:', pageWidth - 80, yPos);
    doc.text((rechnung.netto_betrag || 0).toFixed(2) + ' €', pageWidth - 30, yPos, { align: 'right' });
    yPos += 7;

    doc.text('zzgl. MwSt.:', pageWidth - 80, yPos);
    doc.text((rechnung.steuer_betrag || 0).toFixed(2) + ' €', pageWidth - 30, yPos, { align: 'right' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Gesamtbetrag:', pageWidth - 80, yPos);
    doc.text((rechnung.brutto_betrag || 0).toFixed(2) + ' €', pageWidth - 30, yPos, { align: 'right' });

    // Zahlungsbedingungen
    if (rechnung.zahlungsbedingungen) {
      yPos += 20;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100);
      const bedingungen = doc.splitTextToSize(rechnung.zahlungsbedingungen, pageWidth - 40);
      doc.text(bedingungen, 20, yPos);
    }

    // Notizen für Kunde
    if (rechnung.kunde_notizen) {
      yPos += 15;
      doc.setFontSize(9);
      const notizen = doc.splitTextToSize(rechnung.kunde_notizen, pageWidth - 40);
      doc.text(notizen, 20, yPos);
    }

    // PDF als ArrayBuffer generieren
    const pdfBytes = doc.output('arraybuffer');
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

    // PDF hochladen
    const fileName = `Rechnung_${rechnung.rechnungsnummer.replace(/\//g, '_')}.pdf`;
    const formData = new FormData();
    formData.append('file', pdfBlob, fileName);

    const uploadResponse = await base44.integrations.Core.UploadFile({
      file: pdfBlob
    });

    // Rechnung mit PDF URL aktualisieren
    await base44.asServiceRole.entities.Rechnung.update(rechnungId, {
      pdf_url: uploadResponse.file_url
    });

    return Response.json({
      success: true,
      pdf_url: uploadResponse.file_url
    });

  } catch (error) {
    console.error('PDF Generation Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});