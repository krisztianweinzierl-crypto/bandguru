import { createClient } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // Parse Request Body
    const body = await req.json();
    const vertragId = body.vertragId;
    const kundenEmail = body.kundenEmail; // E-Mail zur Verifizierung
    
    if (!vertragId) {
      return Response.json({ error: 'Keine Vertrags-ID angegeben' }, { status: 400 });
    }

    // Base44 Client als Service Role (Admin-Rechte)
    const base44 = createClient(
      Deno.env.get("BASE44_APP_ID"),
      Deno.env.get("BASE44_SERVICE_ROLE_KEY")
    );

    // Methode aus dem Body ermitteln
    const isUpdateRequest = body.unterschrift_kunde !== undefined;

    // Update: Unterschrift speichern
    if (isUpdateRequest) {
      // E-Mail-Verifizierung ist erforderlich
      if (!kundenEmail) {
        return Response.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
      }

      // Vertrag abrufen und prüfen
      const vertraege = await base44.entities.Vertrag.filter({ id: vertragId });
      const vertrag = vertraege[0];

      if (!vertrag) {
        return Response.json({ error: 'Vertrag nicht gefunden' }, { status: 404 });
      }

      if (!vertrag.im_kundenportal_sichtbar) {
        return Response.json({ error: 'Vertrag nicht verfügbar' }, { status: 403 });
      }

      // Kunde laden und E-Mail prüfen
      let kunde = null;
      if (vertrag.kunde_id) {
        const kunden = await base44.entities.Kunde.filter({ id: vertrag.kunde_id });
        kunde = kunden[0];
      }

      // E-Mail-Verifizierung: Prüfe ob eingegebene E-Mail mit Kunden-E-Mail übereinstimmt
      if (!kunde || kunde.email?.toLowerCase().trim() !== kundenEmail.toLowerCase().trim()) {
        return Response.json({ error: 'E-Mail-Adresse stimmt nicht überein' }, { status: 403 });
      }

      // Nur Kunden-Unterschrift darf über diese Funktion gesetzt werden
      const updateData = {
        unterschrift_kunde: body.unterschrift_kunde,
        unterschrift_kunde_name: body.unterschrift_kunde_name,
        unterschrift_kunde_datum: body.unterschrift_kunde_datum
      };

      // Status auf 'unterzeichnet' setzen, wenn beide Unterschriften vorhanden
      if (vertrag.unterschrift_organisation && body.unterschrift_kunde) {
        updateData.status = 'unterzeichnet';
      }

      // Vertrag aktualisieren
      const updatedVertrag = await base44.entities.Vertrag.update(vertragId, updateData);

      return Response.json({ 
        success: true, 
        vertrag: updatedVertrag 
      });
    }

    // GET: Vertrag und zugehörige Daten abrufen
    // E-Mail-Verifizierung ist erforderlich
    if (!kundenEmail) {
      return Response.json({ error: 'E-Mail-Adresse erforderlich', needsEmail: true }, { status: 400 });
    }

    // Vertrag abrufen
    const vertraege = await base44.entities.Vertrag.filter({ id: vertragId });
    const vertrag = vertraege[0];

    if (!vertrag) {
      return Response.json({ error: 'Vertrag nicht gefunden' }, { status: 404 });
    }

    // Prüfen ob Vertrag im Kundenportal sichtbar ist
    if (!vertrag.im_kundenportal_sichtbar) {
      return Response.json({ error: 'Vertrag nicht verfügbar' }, { status: 403 });
    }

    // Kunde laden
    let kunde = null;
    if (vertrag.kunde_id) {
      try {
        const kunden = await base44.entities.Kunde.filter({ id: vertrag.kunde_id });
        kunde = kunden[0] || null;
      } catch (error) {
        console.error('Fehler beim Laden des Kunden:', error);
      }
    }

    // E-Mail-Verifizierung: Prüfe ob eingegebene E-Mail mit Kunden-E-Mail übereinstimmt
    if (!kunde || kunde.email?.toLowerCase().trim() !== kundenEmail.toLowerCase().trim()) {
      return Response.json({ error: 'E-Mail-Adresse stimmt nicht überein' }, { status: 403 });
    }

    // Event laden (falls vorhanden)
    let event = null;
    if (vertrag.event_id) {
      try {
        const events = await base44.entities.Event.filter({ id: vertrag.event_id });
        event = events[0] || null;
      } catch (error) {
        console.error('Fehler beim Laden des Events:', error);
      }
    }

    // Organisation laden
    let organisation = null;
    if (vertrag.org_id) {
      try {
        const orgs = await base44.entities.Organisation.filter({ id: vertrag.org_id });
        organisation = orgs[0] || null;
      } catch (error) {
        console.error('Fehler beim Laden der Organisation:', error);
      }
    }

    return Response.json({
      success: true,
      vertrag,
      kunde,
      event,
      organisation
    });

  } catch (error) {
    console.error('Fehler in vertragsKundenansicht:', error);
    return Response.json({ 
      error: 'Interner Serverfehler',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});