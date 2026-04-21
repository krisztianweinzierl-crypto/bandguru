import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org_id } = await req.json();

    if (!org_id) {
      return Response.json({ error: 'org_id is required' }, { status: 400 });
    }

    const today = new Date();
    const dateStr = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString();
    };
    const dateOnly = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    // ── 1. MUSIKER ──────────────────────────────────────────────────────────
    const musikerData = [
      {
        org_id,
        name: "Sophie Müller",
        instrumente: ["Gesang", "Gitarre"],
        genre: ["Pop", "Jazz", "Soul"],
        sprachen: ["Deutsch", "Englisch"],
        email: "sophie.mueller@example.com",
        telefon: "+49 170 1234567",
        adresse: "Rosenstraße 12, 80331 München",
        tagessatz_netto: 650,
        prioritaet: "A",
        aktiv: true,
        notizen: "Sehr zuverlässig, perfekt für Hochzeiten und Corporate Events"
      },
      {
        org_id,
        name: "Marcus Weber",
        instrumente: ["Klavier", "Keyboard"],
        genre: ["Jazz", "Classical", "Pop"],
        sprachen: ["Deutsch", "Englisch", "Französisch"],
        email: "marcus.weber@example.com",
        telefon: "+49 171 2345678",
        adresse: "Beethovenallee 5, 53173 Bonn",
        tagessatz_netto: 700,
        prioritaet: "A",
        aktiv: true,
        notizen: "Klassisch ausgebildet, auch für Hintergrundmusik ideal"
      },
      {
        org_id,
        name: "Lukas Braun",
        instrumente: ["Schlagzeug", "Percussion"],
        genre: ["Rock", "Pop", "Funk"],
        sprachen: ["Deutsch"],
        email: "lukas.braun@example.com",
        telefon: "+49 172 3456789",
        adresse: "Hauptstraße 88, 10827 Berlin",
        tagessatz_netto: 500,
        prioritaet: "B",
        aktiv: true,
        notizen: "Sehr energiegeladen, ideal für Partys und Festivals"
      },
      {
        org_id,
        name: "Anna Schmidt",
        instrumente: ["Violine", "Viola"],
        genre: ["Classical", "Jazz", "Pop"],
        sprachen: ["Deutsch", "Englisch", "Russisch"],
        email: "anna.schmidt@example.com",
        telefon: "+49 173 4567890",
        adresse: "Mozartstraße 3, 60313 Frankfurt",
        tagessatz_netto: 580,
        prioritaet: "A",
        aktiv: true,
        notizen: "Ausgezeichnete Kammermusikerin, auch für Solostücke geeignet"
      },
      {
        org_id,
        name: "Tom Fischer",
        instrumente: ["Bass", "E-Gitarre"],
        genre: ["Rock", "Blues", "Funk"],
        sprachen: ["Deutsch", "Englisch"],
        email: "tom.fischer@example.com",
        telefon: "+49 174 5678901",
        adresse: "Schillerstraße 22, 70173 Stuttgart",
        tagessatz_netto: 450,
        prioritaet: "B",
        aktiv: true,
        notizen: "Groove-oriented, perfekt für Tanzveranstaltungen"
      },
      {
        org_id,
        name: "Elena Kovač",
        instrumente: ["Trompete", "Flügelhorn"],
        genre: ["Jazz", "Pop", "Latin"],
        sprachen: ["Deutsch", "Englisch", "Kroatisch"],
        email: "elena.kovac@example.com",
        telefon: "+49 175 6789012",
        adresse: "Gartenweg 7, 20099 Hamburg",
        tagessatz_netto: 520,
        prioritaet: "B",
        aktiv: true,
        notizen: "Hervorragende Improvisationskünstlerin"
      }
    ];

    const musiker = await base44.asServiceRole.entities.Musiker.bulkCreate(musikerData);
    const m = musiker; // shorthand

    // ── 2. KUNDEN ──────────────────────────────────────────────────────────
    const kundenData = [
      {
        org_id,
        firmenname: "Hotel Kaiserhof GmbH",
        ansprechpartner: "Herr Klaus Berger",
        email: "events@kaiserhof.de",
        telefon: "+49 89 98765432",
        adresse: "Maximilianstraße 20, 80539 München",
        zahlungsziel_tage: 14,
        notizen: "Langjähriger Partner, monatliche Veranstaltungen",
        tags: ["Hotel", "Corporate", "Stammkunde"]
      },
      {
        org_id,
        firmenname: "Weingut Sonnenberg",
        ansprechpartner: "Frau Petra Sonnenberg",
        email: "petra@sonnenberg-wein.de",
        telefon: "+49 6321 123456",
        adresse: "Weinbergstraße 15, 67098 Bad Dürkheim",
        zahlungsziel_tage: 30,
        notizen: "Sommerfeste und Weinproben, bevorzugt Jazz",
        tags: ["Event", "Outdoor", "Jazz"]
      },
      {
        org_id,
        firmenname: "Tech Solutions AG",
        ansprechpartner: "Dr. Michael Bauer",
        email: "m.bauer@techsolutions.de",
        telefon: "+49 30 55443322",
        adresse: "Unter den Linden 10, 10117 Berlin",
        zahlungsziel_tage: 14,
        notizen: "Jährliche Firmenfeiern und Produktlaunches",
        tags: ["Corporate", "Premium", "Neukunde"]
      },
      {
        org_id,
        firmenname: "Familie Richter",
        ansprechpartner: "Sabine Richter",
        email: "sabine.richter@gmail.com",
        telefon: "+49 221 9988776",
        adresse: "Lindenallee 8, 50667 Köln",
        zahlungsziel_tage: 7,
        notizen: "Hochzeitsplanung, sehr detailorientiert",
        tags: ["Hochzeit", "Privat"]
      }
    ];

    const kunden = await base44.asServiceRole.entities.Kunde.bulkCreate(kundenData);

    // ── 3. EVENTS ──────────────────────────────────────────────────────────
    const eventsData = [
      {
        org_id,
        titel: "Gala-Abend Hotel Kaiserhof",
        kunde_id: kunden[0].id,
        status: "bestätigt",
        datum_von: dateStr(14),
        datum_bis: dateStr(14),
        ort_name: "Hotel Kaiserhof",
        ort_adresse: "Maximilianstraße 20, 80539 München",
        event_typ: "Corporate Event",
        anzahl_gaeste: 120,
        dresscode: "Black Tie",
        get_in_zeit: "17:00",
        soundcheck_zeit: "18:30",
        technik_hinweise: "PA-Anlage vorhanden, Bühnenlicht wird gestellt",
        finanz_status: "teilweise",
        besetzung_anforderung: { "Gesang": 1, "Klavier": 1, "Violine": 1 },
        interne_notizen: "Kunde erwartet Repertoire mit Jazz-Standards",
        musiker_notizen: "Dresscode strikt einhalten! Ankunft bis 17:30 Uhr."
      },
      {
        org_id,
        titel: "Hochzeit Richter",
        kunde_id: kunden[3].id,
        status: "bestätigt",
        datum_von: dateStr(28),
        datum_bis: dateStr(28),
        ort_name: "Schloss Ehreshoven",
        ort_adresse: "Ehreshoven 2, 51766 Engelskirchen",
        event_typ: "Hochzeit",
        anzahl_gaeste: 80,
        dresscode: "Elegant chic",
        get_in_zeit: "13:00",
        soundcheck_zeit: "15:00",
        hotel_name: "Hotel Zur Post",
        hotel_adresse: "Marktplatz 1, 51766 Engelskirchen",
        technik_hinweise: "Eigene PA mitbringen",
        finanz_status: "offen",
        besetzung_anforderung: { "Gesang": 1, "Klavier": 1, "Gitarre": 1 },
        interne_notizen: "Brautpaar wünscht Ed Sheeran Songs und klassische Stücke",
        musiker_notizen: "Bitte eigenes Mikrofonstativ mitbringen."
      },
      {
        org_id,
        titel: "Weinfest Sonnenberg",
        kunde_id: kunden[1].id,
        status: "angebot_angenommen",
        datum_von: dateStr(45),
        datum_bis: dateStr(45),
        ort_name: "Weingut Sonnenberg Terrasse",
        ort_adresse: "Weinbergstraße 15, 67098 Bad Dürkheim",
        event_typ: "Private Feier",
        anzahl_gaeste: 60,
        dresscode: "Smart Casual",
        get_in_zeit: "15:00",
        soundcheck_zeit: "16:00",
        technik_hinweise: "Outdoor-Setup, Sonnenstrom vorhanden",
        finanz_status: "offen",
        besetzung_anforderung: { "Gesang": 1, "Gitarre": 1, "Trompete": 1 },
        interne_notizen: "Jazz-Trio bevorzugt, lateinamerikanische Stücke willkommen"
      },
      {
        org_id,
        titel: "Tech Solutions Produktlaunch",
        kunde_id: kunden[2].id,
        status: "anfrage",
        datum_von: dateStr(60),
        datum_bis: dateStr(60),
        ort_name: "Berliner Philharmonie Foyer",
        ort_adresse: "Herbert-von-Karajan-Str. 1, 10785 Berlin",
        event_typ: "Corporate Event",
        anzahl_gaeste: 200,
        dresscode: "Business",
        get_in_zeit: "14:00",
        soundcheck_zeit: "16:00",
        finanz_status: "offen",
        besetzung_anforderung: { "Streichquartett": 1 },
        interne_notizen: "Großes Budget, Premium-Besetzung gewünscht"
      },
      {
        org_id,
        titel: "Silvesterparty Hotel Kaiserhof",
        kunde_id: kunden[0].id,
        status: "bestätigt",
        datum_von: dateStr(-120),
        datum_bis: dateStr(-119),
        ort_name: "Hotel Kaiserhof Ballsaal",
        ort_adresse: "Maximilianstraße 20, 80539 München",
        event_typ: "Private Feier",
        anzahl_gaeste: 250,
        dresscode: "Black Tie",
        finanz_status: "bezahlt",
        besetzung_anforderung: { "Gesang": 1, "Schlagzeug": 1, "Bass": 1, "Klavier": 1 },
        interne_notizen: "Sehr erfolgreich, Kunde war begeistert"
      }
    ];

    const events = await base44.asServiceRole.entities.Event.bulkCreate(eventsData);

    // ── 4. EVENT-MUSIKER ZUWEISUNGEN ────────────────────────────────────────
    const eventMusikerData = [
      // Gala-Abend
      { event_id: events[0].id, musiker_id: m[0].id, rolle: "Gesang", gage_netto: 650, status: "zugesagt", mwst_satz: 19, distanz_km: 15, fahrtkosten_pro_km: 0.30 },
      { event_id: events[0].id, musiker_id: m[1].id, rolle: "Klavier", gage_netto: 700, status: "zugesagt", mwst_satz: 19, distanz_km: 5, fahrtkosten_pro_km: 0.30 },
      { event_id: events[0].id, musiker_id: m[3].id, rolle: "Violine", gage_netto: 580, status: "angefragt", mwst_satz: 19, distanz_km: 350, fahrtkosten_pro_km: 0.30 },
      // Hochzeit
      { event_id: events[1].id, musiker_id: m[0].id, rolle: "Gesang & Gitarre", gage_netto: 700, status: "zugesagt", mwst_satz: 19, distanz_km: 50, fahrtkosten_pro_km: 0.30 },
      { event_id: events[1].id, musiker_id: m[1].id, rolle: "Klavier", gage_netto: 700, status: "zugesagt", mwst_satz: 19, distanz_km: 60, fahrtkosten_pro_km: 0.30 },
      // Weinfest
      { event_id: events[2].id, musiker_id: m[0].id, rolle: "Gesang", gage_netto: 600, status: "angefragt", mwst_satz: 19, distanz_km: 80, fahrtkosten_pro_km: 0.30 },
      { event_id: events[2].id, musiker_id: m[5].id, rolle: "Trompete", gage_netto: 520, status: "angefragt", mwst_satz: 19, distanz_km: 200, fahrtkosten_pro_km: 0.30 },
      // Silvester (abgeschlossen)
      { event_id: events[4].id, musiker_id: m[0].id, rolle: "Gesang", gage_netto: 800, status: "zugesagt", mwst_satz: 19, distanz_km: 10, fahrtkosten_pro_km: 0.30 },
      { event_id: events[4].id, musiker_id: m[2].id, rolle: "Schlagzeug", gage_netto: 600, status: "zugesagt", mwst_satz: 19, distanz_km: 25, fahrtkosten_pro_km: 0.30 },
      { event_id: events[4].id, musiker_id: m[4].id, rolle: "Bass", gage_netto: 500, status: "zugesagt", mwst_satz: 19, distanz_km: 30, fahrtkosten_pro_km: 0.30 },
      { event_id: events[4].id, musiker_id: m[1].id, rolle: "Klavier", gage_netto: 700, status: "zugesagt", mwst_satz: 19, distanz_km: 5, fahrtkosten_pro_km: 0.30 },
    ];

    await base44.asServiceRole.entities.EventMusiker.bulkCreate(eventMusikerData);

    // ── 5. SONGS ────────────────────────────────────────────────────────────
    const songsData = [
      { org_id, titel: "Fly Me to the Moon", kuenstler_original: "Frank Sinatra", tonart: "C-Dur", bpm: 120, laenge: "03:10", tags: ["Jazz", "Standard", "Hochzeit"] },
      { org_id, titel: "All of Me", kuenstler_original: "John Legend", tonart: "A-Moll", bpm: 63, laenge: "04:29", tags: ["Pop", "Romantisch", "Hochzeit"] },
      { org_id, titel: "La Vie en Rose", kuenstler_original: "Édith Piaf", tonart: "G-Dur", bpm: 72, laenge: "03:28", tags: ["Jazz", "Chanson", "Classic"] },
      { org_id, titel: "Can't Help Falling in Love", kuenstler_original: "Elvis Presley", tonart: "D-Dur", bpm: 68, laenge: "03:00", tags: ["Pop", "Hochzeit", "Classic"] },
      { org_id, titel: "Autumn Leaves", kuenstler_original: "Nat King Cole", tonart: "G-Moll", bpm: 90, laenge: "03:22", tags: ["Jazz", "Standard", "Herbst"] },
      { org_id, titel: "Perfect", kuenstler_original: "Ed Sheeran", tonart: "Ab-Dur", bpm: 95, laenge: "04:23", tags: ["Pop", "Hochzeit", "Romantisch"] },
      { org_id, titel: "Cheek to Cheek", kuenstler_original: "Fred Astaire", tonart: "C-Dur", bpm: 110, laenge: "04:00", tags: ["Jazz", "Swing", "Standard"] },
      { org_id, titel: "What a Wonderful World", kuenstler_original: "Louis Armstrong", tonart: "F-Dur", bpm: 65, laenge: "02:21", tags: ["Jazz", "Classic", "Positive"] },
      { org_id, titel: "The Way You Look Tonight", kuenstler_original: "Frank Sinatra", tonart: "C-Dur", bpm: 120, laenge: "03:15", tags: ["Jazz", "Standard", "Hochzeit"] },
      { org_id, titel: "Thinking Out Loud", kuenstler_original: "Ed Sheeran", tonart: "D-Dur", bpm: 79, laenge: "04:41", tags: ["Pop", "Romantisch", "Hochzeit"] },
    ];

    const songs = await base44.asServiceRole.entities.Song.bulkCreate(songsData);

    // ── 6. SETLISTE ─────────────────────────────────────────────────────────
    await base44.asServiceRole.entities.Setliste.bulkCreate([
      {
        org_id,
        name: "Jazz-Cocktail Set",
        beschreibung: "Klassisches Jazz-Repertoire für Empfänge und Dinner",
        event_id: events[0].id,
        gesamtdauer: 90,
        tags: ["Jazz", "Cocktail", "Dinner"],
        songs: songs.slice(0, 5).map((s, i) => ({ song_id: s.id, reihenfolge: i + 1 }))
      },
      {
        org_id,
        name: "Hochzeits-Favoriten",
        beschreibung: "Romantisches Set für Hochzeiten und besondere Anlässe",
        event_id: events[1].id,
        gesamtdauer: 120,
        tags: ["Hochzeit", "Romantisch", "Pop"],
        songs: [songs[1], songs[3], songs[5], songs[9], songs[0]].map((s, i) => ({ song_id: s.id, reihenfolge: i + 1 }))
      }
    ]);

    // ── 7. RECHNUNGEN ───────────────────────────────────────────────────────
    const rechnungenData = [
      {
        org_id,
        rechnungsnummer: "RG-2026-001",
        kunde_id: kunden[0].id,
        event_id: events[4].id,
        rechnungsdatum: dateOnly(-110),
        faelligkeitsdatum: dateOnly(-96),
        status: "bezahlt",
        positionen: [
          { beschreibung: "Gesang – Silvesterparty 31.12.", menge: 1, einheit: "Auftritt", einzelpreis: 800, steuersatz: 19 },
          { beschreibung: "Schlagzeug – Silvesterparty 31.12.", menge: 1, einheit: "Auftritt", einzelpreis: 600, steuersatz: 19 },
          { beschreibung: "Bass – Silvesterparty 31.12.", menge: 1, einheit: "Auftritt", einzelpreis: 500, steuersatz: 19 },
          { beschreibung: "Klavier – Silvesterparty 31.12.", menge: 1, einheit: "Auftritt", einzelpreis: 700, steuersatz: 19 },
        ],
        netto_betrag: 2600,
        steuer_betrag: 494,
        brutto_betrag: 3094,
        bezahlt_betrag: 3094,
        waehrung: "EUR",
        bezahlt_am: dateStr(-95)
      },
      {
        org_id,
        rechnungsnummer: "RG-2026-002",
        kunde_id: kunden[0].id,
        event_id: events[0].id,
        rechnungsdatum: dateOnly(-5),
        faelligkeitsdatum: dateOnly(9),
        status: "versendet",
        positionen: [
          { beschreibung: "Gesang – Gala-Abend", menge: 1, einheit: "Auftritt", einzelpreis: 650, steuersatz: 19 },
          { beschreibung: "Klavier – Gala-Abend", menge: 1, einheit: "Auftritt", einzelpreis: 700, steuersatz: 19 },
          { beschreibung: "Violine – Gala-Abend", menge: 1, einheit: "Auftritt", einzelpreis: 580, steuersatz: 19 },
        ],
        netto_betrag: 1930,
        steuer_betrag: 366.70,
        brutto_betrag: 2296.70,
        bezahlt_betrag: 0,
        waehrung: "EUR"
      }
    ];

    await base44.asServiceRole.entities.Rechnung.bulkCreate(rechnungenData);

    // ── 8. AUFGABEN ─────────────────────────────────────────────────────────
    await base44.asServiceRole.entities.Aufgabe.bulkCreate([
      { org_id, titel: "Technik-Anforderungen für Gala-Abend bestätigen", status: "offen", prioritaet: "hoch", faellig_am: dateStr(7), bezug_typ: "event", bezug_id: events[0].id },
      { org_id, titel: "Ablaufplan Hochzeit Richter erstellen", status: "in_arbeit", prioritaet: "hoch", faellig_am: dateStr(10), bezug_typ: "event", bezug_id: events[1].id },
      { org_id, titel: "Vertrag Hotel Kaiserhof erneuern", status: "offen", prioritaet: "normal", faellig_am: dateStr(20), bezug_typ: "kunde", bezug_id: kunden[0].id },
      { org_id, titel: "Rückmeldung Anna Schmidt für Gala-Abend einholen", status: "offen", prioritaet: "hoch", faellig_am: dateStr(3), bezug_typ: "musiker", bezug_id: m[3].id },
      { org_id, titel: "Angebot Weingut Sonnenberg nachfassen", status: "erledigt", prioritaet: "normal", faellig_am: dateStr(-5), bezug_typ: "kunde", bezug_id: kunden[1].id },
      { org_id, titel: "Setliste für Hochzeit mit Brautpaar abstimmen", status: "in_arbeit", prioritaet: "normal", faellig_am: dateStr(15), bezug_typ: "event", bezug_id: events[1].id },
    ]);

    // ── 9. LEADS ────────────────────────────────────────────────────────────
    await base44.asServiceRole.entities.Lead.bulkCreate([
      {
        org_id,
        titel: "Geburtstagsparty Müller – 50. Geburtstag",
        kontaktperson: "Hans Müller",
        email: "hans.mueller@web.de",
        telefon: "+49 89 44332211",
        status: "qualifiziert",
        erwarteter_umsatz: 1800,
        event_datum: dateOnly(35),
        event_ort: "Restaurant Zum Goldenen Löwen, München",
        event_typ: "Geburtstag",
        anzahl_gaeste: 40,
        quelle: "Empfehlung",
        prioritaet: "normal",
        naechstes_followup: dateOnly(2)
      },
      {
        org_id,
        titel: "Firmenfeier Autohaus König",
        kontaktperson: "Birgit König",
        email: "b.koenig@autohaus-koenig.de",
        telefon: "+49 711 6655443",
        status: "kontaktiert",
        erwarteter_umsatz: 3500,
        event_datum: dateOnly(55),
        event_ort: "Autohaus König, Stuttgart",
        event_typ: "Corporate Event",
        anzahl_gaeste: 150,
        quelle: "Webseite",
        prioritaet: "hoch",
        naechstes_followup: dateOnly(1)
      },
      {
        org_id,
        titel: "Hochzeit Schmitz – Sommer",
        kontaktperson: "Laura Schmitz",
        email: "laura.schmitz@gmail.com",
        telefon: "+49 221 7766554",
        status: "angebot",
        erwarteter_umsatz: 2800,
        event_datum: dateOnly(80),
        event_ort: "Gut Wollenberg, Köln",
        event_typ: "Hochzeit",
        anzahl_gaeste: 100,
        quelle: "Instagram",
        prioritaet: "hoch",
        budget: "2.500 – 3.500 EUR",
        naechstes_followup: dateOnly(5)
      },
      {
        org_id,
        titel: "Jazz-Abend Weinbar Rothenberg",
        kontaktperson: "Felix Rothenberg",
        email: "info@weinbar-rothenberg.de",
        telefon: "+49 40 99887766",
        status: "neu",
        erwarteter_umsatz: 900,
        event_datum: dateOnly(25),
        event_ort: "Weinbar Rothenberg, Hamburg",
        event_typ: "Konzert",
        anzahl_gaeste: 30,
        quelle: "Kaltakquise",
        prioritaet: "niedrig",
        naechstes_followup: dateOnly(3)
      }
    ]);

    return Response.json({
      success: true,
      message: "Demo-Daten erfolgreich erstellt!",
      created: {
        musiker: musikerData.length,
        kunden: kundenData.length,
        events: eventsData.length,
        songs: songsData.length,
        setlisten: 2,
        rechnungen: rechnungenData.length,
        aufgaben: 6,
        leads: 4
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});