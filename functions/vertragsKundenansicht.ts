import { createClient } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // Parse URL und Query-Parameter
    const url = new URL(req.url);
    const vertragId = url.searchParams.get('vertragId');
    
    if (!vertragId) {
      return Response.json({ error: 'Keine Vertrags-ID angegeben' }, { status: 400 });
    }

    // Base44 Client als Service Role (Admin-Rechte)
    const base44 = createClient(
      Deno.env.get("BASE44_APP_ID"),
      Deno.env.get("BASE44_SERVICE_ROLE_KEY")
    );

    // Methode aus der URL ermitteln
    const method = req.method;

    // GET: Vertrag und zugehörige Daten abrufen
    if (method === 'GET') {
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

      // Kunde laden (falls vorhanden)
      let kunde = null;
      if (vertrag.kunde_id) {
        const kunden = await base44.entities.Kunde.filter({ id: vertrag.kunde_id });
        kunde = kunden[0] || null;
      }

      // Event laden (falls vorhanden)
      let event = null;
      if (vertrag.event_id) {
        const events = await base44.entities.Event.filter({ id: vertrag.event_id });
        event = events[0] || null;
      }

      // Organisation laden
      let organisation = null;
      if (vertrag.org_id) {
        const orgs = await base44.entities.Organisation.filter({ id: vertrag.org_id });
        organisation = orgs[0] || null;
      }

      return Response.json({
        vertrag,
        kunde,
        event,
        organisation
      });
    }

    // PATCH: Unterschrift speichern
    if (method === 'PATCH') {
      const body = await req.json();
      
      // Vertrag abrufen und prüfen
      const vertraege = await base44.entities.Vertrag.filter({ id: vertragId });
      const vertrag = vertraege[0];

      if (!vertrag) {
        return Response.json({ error: 'Vertrag nicht gefunden' }, { status: 404 });
      }

      if (!vertrag.im_kundenportal_sichtbar) {
        return Response.json({ error: 'Vertrag nicht verfügbar' }, { status: 403 });
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

    return Response.json({ error: 'Methode nicht erlaubt' }, { status: 405 });

  } catch (error) {
    console.error('Fehler in vertragsKundenansicht:', error);
    return Response.json({ 
      error: 'Interner Serverfehler',
      message: error.message 
    }, { status: 500 });
  }
});