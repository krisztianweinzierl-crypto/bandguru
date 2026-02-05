import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

// Hilfsfunktion für korrekte Darstellung deutscher Sonderzeichen
const fixGermanChars = (text) => {
  if (!text) return text;
  return String(text)
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/€/g, 'EUR');
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id } = await req.json();

    if (!event_id) {
      return Response.json({ error: 'event_id ist erforderlich' }, { status: 400 });
    }

    // Event laden
    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    const event = events[0];

    if (!event) {
      return Response.json({ error: 'Event nicht gefunden' }, { status: 404 });
    }

    // Kunde laden
    let kunde = null;
    if (event.kunde_id) {
      const kunden = await base44.asServiceRole.entities.Kunde.filter({ id: event.kunde_id });
      kunde = kunden[0];
    }

    // Musiker laden
    const eventMusiker = await base44.asServiceRole.entities.EventMusiker.filter({ event_id });
    const musikerIds = eventMusiker.map(em => em.musiker_id);
    let musiker = [];
    if (musikerIds.length > 0) {
      const allMusiker = await base44.asServiceRole.entities.Musiker.filter({ org_id: event.org_id });
      musiker = allMusiker.filter(m => musikerIds.includes(m.id));
    }

    // Organisation laden
    const orgs = await base44.asServiceRole.entities.Organisation.filter({ id: event.org_id });
    const org = orgs[0];

    // PDF erstellen
    const doc = new jsPDF();
    let y = 20;

    // Header mit Organisation
    if (org?.logo_url) {
      try {
        doc.addImage(org.logo_url, 'PNG', 15, y, 30, 30);
        y += 35;
      } catch (e) {
        console.log('Logo konnte nicht geladen werden');
      }
    }

    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text(fixGermanChars(event.titel), 15, y);
    y += 10;

    // Event-Status
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const statusLabels = {
      entwurf: 'Entwurf',
      angefragt: 'Angefragt',
      'bestätigt': 'Bestaetigt',
      'durchgeführt': 'Durchgefuehrt',
      abgerechnet: 'Abgerechnet',
      storniert: 'Storniert'
    };
    const statusText = statusLabels[event.status] || event.status;
    doc.text(`Status: ${statusText}`, 15, y);
    y += 15;

    // Details Section
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Details', 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    // Datum
    const datum = new Date(event.datum_von);
    doc.text(fixGermanChars(`Datum: ${datum.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`), 15, y);
    y += 6;

    // Uhrzeit
    const vonZeit = new Date(event.datum_von).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const bisZeit = new Date(event.datum_bis).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Uhrzeit: ${vonZeit} - ${bisZeit} Uhr`, 15, y);
    y += 6;

    // Veranstaltungsort
    if (event.ort_name || event.ort_adresse) {
      doc.text(fixGermanChars(`Ort: ${event.ort_name || ''}`), 15, y);
      y += 6;
      if (event.ort_adresse) {
        doc.text(fixGermanChars(`     ${event.ort_adresse}`), 15, y);
        y += 6;
      }
    }

    // Kunde
    if (kunde) {
      y += 3;
      doc.text(fixGermanChars(`Kunde: ${kunde.firmenname}`), 15, y);
      y += 6;
      if (kunde.ansprechpartner) {
        doc.text(fixGermanChars(`Ansprechpartner: ${kunde.ansprechpartner}`), 15, y);
        y += 6;
      }
    }

    y += 5;

    // Zeitplan
    if (event.get_in_zeit || event.soundcheck_zeit) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Zeitplan', 15, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      if (event.get_in_zeit) {
        doc.text(`Get-In: ${event.get_in_zeit} Uhr`, 15, y);
        y += 6;
      }
      if (event.soundcheck_zeit) {
        doc.text(`Soundcheck: ${event.soundcheck_zeit} Uhr`, 15, y);
        y += 6;
      }

      y += 5;
    }

    // Event-Details
    if (event.event_typ || event.anzahl_gaeste || event.dresscode) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Weitere Informationen', 15, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      if (event.event_typ) {
        doc.text(fixGermanChars(`Event-Typ: ${event.event_typ}`), 15, y);
        y += 6;
      }
      if (event.anzahl_gaeste) {
        doc.text(fixGermanChars(`Anzahl Gaeste: ${event.anzahl_gaeste}`), 15, y);
        y += 6;
      }
      if (event.dresscode) {
        doc.text(fixGermanChars(`Dresscode: ${event.dresscode}`), 15, y);
        y += 6;
      }

      y += 5;
    }

    // Musiker
    if (eventMusiker.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Musiker', 15, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      const zugesagteMusiker = eventMusiker.filter(em => em.status === 'zugesagt');
      
      zugesagteMusiker.forEach((em) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        const musikerData = musiker.find(m => m.id === em.musiker_id);
        if (musikerData) {
          doc.setFont(undefined, 'bold');
          doc.text(fixGermanChars(`${musikerData.name}`), 15, y);
          doc.setFont(undefined, 'normal');
          y += 5;
          
          if (em.rolle) {
            doc.text(fixGermanChars(`  Rolle: ${em.rolle}`), 15, y);
            y += 5;
          }
          
          if (em.gage_netto) {
            const mwstSatz = em.mwst_satz || 19;
            const gageBrutto = em.gage_netto * (1 + mwstSatz / 100);
            doc.text(`  Gage: ${em.gage_netto.toFixed(2)} EUR (netto) / ${gageBrutto.toFixed(2)} EUR (brutto, ${mwstSatz}% MwSt.)`, 15, y);
            y += 5;
          }

          y += 3;
        }
      });

      y += 5;
    }

    // Hotel
    if (event.hotel_name || event.hotel_adresse) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Hotel', 15, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      if (event.hotel_name) {
        doc.text(fixGermanChars(event.hotel_name), 15, y);
        y += 6;
      }
      if (event.hotel_adresse) {
        doc.text(fixGermanChars(event.hotel_adresse), 15, y);
        y += 6;
      }

      y += 5;
    }

    // Ablaufplan
    if (event.oeffentliche_notizen) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Ablaufplan', 15, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      const lines = doc.splitTextToSize(fixGermanChars(event.oeffentliche_notizen), 180);
      lines.forEach(line => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 15, y);
        y += 5;
      });

      y += 5;
    }

    // Notizen
    if (event.interne_notizen) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Interne Notizen', 15, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      const lines = doc.splitTextToSize(fixGermanChars(event.interne_notizen), 180);
      lines.forEach(line => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 15, y);
        y += 5;
      });
    }

    // Footer auf allen Seiten
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Seite ${i} von ${pageCount}`, 105, 290, { align: 'center' });
      doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')}`, 15, 290);
      if (org?.name) {
        doc.text(fixGermanChars(org.name), 195, 290, { align: 'right' });
      }
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Event_${event.titel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF-Generierung fehlgeschlagen:', error);
    return Response.json({ 
      error: 'PDF konnte nicht erstellt werden', 
      details: error.message 
    }, { status: 500 });
  }
});