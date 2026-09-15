import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import {
  Sparkles,
  Save,
  Loader2,
  Calendar,
  MapPin,
  Clock,
  Users,
  FileText,
  CheckCircle2,
  Lightbulb,
  Music,
  Guitar,
  Send,
  Mail,
  Bot,
  Hammer
} from "lucide-react";

export default function EventAIPlanner() {
  const [messages, setMessages] = useState([]); // { role: "user" | "assistant", content: string }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(null);
  const [saved, setSaved] = useState(false);
  const [savedEventId, setSavedEventId] = useState(null);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
  const [allMusiker, setAllMusiker] = useState([]);
  const [roleSlots, setRoleSlots] = useState([]); // [{ rolle, slotIndex, candidates: [musiker...] }]
  const [selectedBySlot, setSelectedBySlot] = useState({}); // "rolle__slotIndex" -> musikerId
  const [maxAlternatives, setMaxAlternatives] = useState(2); // 1-3, steuert Anzahl Vorschläge pro Rolle
  const [requestingMusiker, setRequestingMusiker] = useState({});
  const [requestedMusikerIds, setRequestedMusikerIds] = useState([]);
  const [eventMusikerMap, setEventMusikerMap] = useState({});

  const chatEndRef = useRef(null);
  const currentOrgId = localStorage.getItem("currentOrgId");

  const MAX_FOLLOWUP_ROUNDS = 3; // max. Anzahl Nutzer-Nachrichten, bevor der Plan spätestens erzwungen wird

  const prioritaetColors = { A: "bg-emerald-100 text-emerald-700", B: "bg-blue-100 text-blue-700", C: "bg-yellow-100 text-yellow-700", D: "bg-orange-100 text-orange-700", E: "bg-red-100 text-red-700" };

  useEffect(() => {
    if (currentOrgId) {
      base44.entities.Musiker.filter({ org_id: currentOrgId, aktiv: true }).then(setAllMusiker);
    }
  }, [currentOrgId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Synonyme für Instrument-Matching
  const instrumentSynonyme = {
    "keyboard": ["keyboard", "keys", "piano", "klavier", "synthesizer", "synth", "organ", "orgel", "keyboarder", "pianist", "pianistin"],
    "gesang": ["gesang", "vocals", "vocal", "singen", "stimme", "singer", "voice", "sänger", "sängerin", "saenger", "saengerin", "vocalist"],
    "schlagzeug": ["schlagzeug", "drums", "drum", "percussion", "beats", "schlagzeuger", "schlagzeugerin", "drummer"],
    "bass": ["bass", "bassgitarre", "e-bass", "kontrabass", "bassist", "bassistin"],
    "gitarre": ["gitarre", "guitar", "e-gitarre", "akustikgitarre", "acoustic guitar", "gitarrist", "gitarristin"],
    "trompete": ["trompete", "trumpet", "horn", "blechbläser", "trompeter"],
    "saxophon": ["saxophon", "saxophone", "sax", "saxophonist"],
    "geige": ["geige", "violine", "violin", "fiddle", "geiger", "geigerin", "violinist"],
    "dj": ["dj", "disc jockey", "turntable"],
  };

  // Wortgrenzen-bewusster "enthält"-Check: verhindert, dass z.B. "Gitarre" fälschlich als Treffer
  // für "Bassgitarre" zählt, nur weil der Text zufällig als Substring enthalten ist.
  const containsAsWord = (haystack, needle) => {
    if (!haystack || !needle) return false;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const boundary = "[^a-zäöüß]";
    return new RegExp(`(^|${boundary})${escaped}(${boundary}|$)`, "i").test(haystack);
  };

  const getAliases = (rolle) => {
    const rolleLower = rolle.toLowerCase().trim();
    // Pass 1: exakter Treffer hat immer Vorrang (verhindert Gruppen-Verwechslung durch Substrings)
    for (const aliases of Object.values(instrumentSynonyme)) {
      if (aliases.includes(rolleLower)) return aliases;
    }
    // Pass 2: Rolle enthält einen Alias als eigenständiges Wort (z.B. "E-Gitarre" -> "gitarre")
    for (const aliases of Object.values(instrumentSynonyme)) {
      if (aliases.some(a => containsAsWord(rolleLower, a))) return aliases;
    }
    return [rolleLower];
  };

  const getCandidatesForRole = (musiker, rolle, genreAnforderung) => {
    const aliases = getAliases(rolle);

    let kandidaten = musiker
      .map(m => {
        const instrumente = (m.instrumente || []);
        const primaer = instrumente[0]?.toLowerCase() || "";
        const sekundaer = instrumente.slice(1).map(i => i.toLowerCase());

        const primaerMatch = aliases.some(a => primaer === a || containsAsWord(primaer, a) || containsAsWord(a, primaer));
        const sekundaerMatch = sekundaer.some(inst => aliases.some(a => inst === a || containsAsWord(inst, a) || containsAsWord(a, inst)));

        let score = 0;
        if (primaerMatch) score = 2;
        else if (sekundaerMatch) score = 1;
        // Priorität als Tie-Breaker: A=5, B=4, C=3, D=2, E=1, keine=0 (als Dezimalanteil)
        const prioritaetBonus = { A: 0.5, B: 0.4, C: 0.3, D: 0.2, E: 0.1 };
        if (score > 0) score += (prioritaetBonus[m.prioritaet] || 0);
        return { ...m, _matchScore: score };
      })
      .filter(m => m._matchScore > 0)
      .sort((a, b) => b._matchScore - a._matchScore);

    // Genre-Filter optional
    if (genreAnforderung?.length > 0 && kandidaten.length > 1) {
      const genreFiltered = kandidaten.filter(m => {
        const mGenres = (m.genre || []).map(g => g.toLowerCase());
        return genreAnforderung.some(g =>
          mGenres.some(mg => mg.includes(g.toLowerCase()) || g.toLowerCase().includes(mg))
        );
      });
      if (genreFiltered.length > 0) kandidaten = genreFiltered;
    }

    return kandidaten;
  };

  // Baut pro benötigtem Instrument-"Slot" (z.B. 1x Gitarre = 1 Slot) eine Liste von bis zu maxAlt Kandidaten.
  // Der jeweils beste Kandidat eines Slots wird für nachfolgende Slots gesperrt, damit die Standard-Zuweisung
  // niemand doppelt bucht; als Alternative kann derselbe Musiker trotzdem in einem anderen Slot auftauchen.
  const computeRoleSlots = (musiker, besetzungAnforderung, genreAnforderung, maxAlt) => {
    if (!besetzungAnforderung || Object.keys(besetzungAnforderung).length === 0) return [];

    const usedAsDefault = new Set();
    const slots = [];

    Object.entries(besetzungAnforderung).forEach(([rolle, anzahl]) => {
      const kandidaten = getCandidatesForRole(musiker, rolle, genreAnforderung);
      for (let i = 0; i < anzahl; i++) {
        const verfuegbar = kandidaten.filter(m => !usedAsDefault.has(m.id) || kandidaten.length <= 1);
        const pool = verfuegbar.length > 0 ? verfuegbar : kandidaten;
        const candidates = pool.slice(0, maxAlt);
        if (candidates.length > 0) usedAsDefault.add(candidates[0].id);
        slots.push({ rolle, slotIndex: i, candidates });
      }
    });

    return slots;
  };

  const buildConversationText = (msgs) =>
    msgs.map(m => `${m.role === "user" ? "Nutzer" : "Planer"}: ${m.content}`).join("\n");

  const DEFAULT_BESETZUNG = { Gesang: 1, Gitarre: 1, Keyboard: 1, Schlagzeug: 1, Bass: 1 };

  const slotKey = (rolle, slotIndex) => `${rolle}__${slotIndex}`;

  const defaultSelectionForSlots = (slots) => {
    const selection = {};
    slots.forEach(slot => {
      if (slot.candidates.length > 0) selection[slotKey(slot.rolle, slot.slotIndex)] = slot.candidates[0].id;
    });
    return selection;
  };

  const finalizePlanFromResult = async (result) => {
    setSelectedLocationIndex(0);

    // Fallback: falls die KI die Besetzung vergessen hat, Standard-Besetzung setzen statt leer zu lassen
    const besetzung = (result.besetzung_anforderung && Object.keys(result.besetzung_anforderung).length > 0)
      ? result.besetzung_anforderung
      : DEFAULT_BESETZUNG;
    const finalPlan = { ...result, besetzung_anforderung: besetzung };
    setPlan(finalPlan);

    const freshMusiker = await base44.entities.Musiker.filter({ org_id: currentOrgId, aktiv: true });
    setAllMusiker(freshMusiker);

    const slots = computeRoleSlots(freshMusiker, besetzung, result.genre_anforderung, maxAlternatives);
    setRoleSlots(slots);
    setSelectedBySlot(defaultSelectionForSlots(slots));
  };

  // Slider-Änderung: Kandidatenlisten neu berechnen, bestehende Auswahl möglichst beibehalten
  useEffect(() => {
    if (!plan || saved || allMusiker.length === 0) return;
    const slots = computeRoleSlots(allMusiker, plan.besetzung_anforderung, plan.genre_anforderung, maxAlternatives);
    setRoleSlots(slots);
    setSelectedBySlot(prev => {
      const next = {};
      slots.forEach(slot => {
        const key = slotKey(slot.rolle, slot.slotIndex);
        const stillValid = slot.candidates.some(c => c.id === prev[key]);
        next[key] = stillValid ? prev[key] : slot.candidates[0]?.id;
      });
      return next;
    });
  }, [maxAlternatives]);

  const handleSelectCandidate = (rolle, slotIndex, musikerId) => {
    if (saved) return;
    setSelectedBySlot(prev => ({ ...prev, [slotKey(rolle, slotIndex)]: musikerId }));
  };

  const suggestedMusiker = useMemo(() => {
    return roleSlots
      .map(slot => {
        const selectedId = selectedBySlot[slotKey(slot.rolle, slot.slotIndex)];
        const candidate = slot.candidates.find(c => c.id === selectedId) || slot.candidates[0];
        return candidate ? { ...candidate, _rolle: slot.rolle } : null;
      })
      .filter(Boolean);
  }, [roleSlots, selectedBySlot]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const userTurns = newMessages.filter(m => m.role === "user").length;
    const isLastAllowedRound = userTurns >= MAX_FOLLOWUP_ROUNDS;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein professioneller Event-Planer-Chatbot für eine Musikband/Bandagentur. Du führst mit dem Nutzer ein Gespräch, um Schritt für Schritt alle wichtigen Informationen für ein Event zu sammeln, und erstellst danach einen vollständigen, professionellen Eventplan.

Heute ist der ${new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" })}.

Bisheriger Gesprächsverlauf (Nutzer = Kunde/Manager, Planer = du):
${buildConversationText(newMessages)}

DEINE AUFGABE IN DIESER RUNDE:
1. Lies den GESAMTEN Gesprächsverlauf und extrahiere alle bekannten Event-Informationen (Datum/Zeitraum, Event-Name/Anlass, Location, gewünschte Besetzung/Band, Gästezahl, Event-Typ, sonstige Wünsche).
2. Entscheide, ob genug Informationen für einen sinnvollen, vollständigen Plan vorhanden sind. Wichtig sind vor allem: ein Datum (oder zumindest ein grober Zeitraum), ein erkennbarer Anlass/Titel, und entweder eine Location oder die Bereitschaft des Nutzers, dass du Vorschläge machst. Details wie exakte Uhrzeiten, Technik-Anforderungen oder Dresscode musst du NICHT abfragen – die leitest du selbst professionell ab.
3. Wenn wichtige Angaben fehlen oder unklar sind UND dies nicht die letzte erlaubte Runde ist: setze "ready" auf false und formuliere in "follow_up_message" GENAU EINE kurze, freundliche Nachricht auf Deutsch, die alle offenen Punkte in maximal 2-3 knappen Fragen bündelt. Wiederhole nicht, was der Nutzer schon gesagt hat.
4. Wenn genug Informationen vorhanden sind, ODER dies die letzte erlaubte Runde ist (siehe Hinweis unten): setze "ready" auf true und fülle ALLE Plan-Felder wie unten beschrieben vollständig aus. Fehlende Details ergänzt du dann mit plausiblen, professionellen Annahmen.
${isLastAllowedRound ? '\nWICHTIG: Dies ist die letzte erlaubte Gesprächsrunde. Du MUSST jetzt "ready": true setzen und einen vollständigen Plan erstellen, auch wenn noch kleinere Details fehlen – triff dafür plausible Annahmen.' : ""}

FALLS ready=true, GILT FÜR DEN PLAN:
Alle Datumsfelder müssen im ISO 8601 Format sein (z.B. 2025-06-15T18:00:00).
Schlage genau 3 verschiedene passende Location-Vorschläge vor (unterschiedliche Stile/Preisklassen) – außer der Nutzer hat bereits eine konkrete Location genannt, dann übernimm diese als einzigen bzw. ersten Vorschlag und ergänze ggf. 2 Alternativen.

SET-STRUKTUR & PAUSEN (basierend auf echten Ablaufplänen realer Gigs):
- Eine Band spielt in Sets von je ca. 45-50 Minuten Länge (reine Jazz-/Hintergrund-Sets auch bis zu 60 Minuten).
- Zwischen den Sets liegt IMMER eine Pause von ca. 15-20 Minuten (Faustregel: 15 Minuten bei 2-3 Sets, bis zu 20 Minuten bei 4 Sets).
- Die Anzahl der Sets richtet sich nach der gewünschten Gesamt-Spieldauer: Gesamtdauer = Summe aller Set-Längen + Summe aller Pausen. Beispiel: 3 Stunden Spielzeit → meist 3x50 Minuten mit 2x15 Minuten Pause.
- datum_von = Beginn des ERSTEN Sets, datum_bis = Ende des LETZTEN Sets. Setze IMMER beide Werte konkret und explizit – die Band-Endzeit darf niemals offen/unklar bleiben. Wenn der Nutzer keine Spieldauer nennt, triff eine plausible Standard-Annahme (z.B. 3x50 Minuten mit 15 Minuten Pausen).
- Trage die konkrete Set-Aufteilung mit Uhrzeiten in "ablaufplan" ein (z.B. "22:30–23:20 Uhr Set 1, 23:20–23:35 Uhr Pause, 23:35–00:25 Uhr Set 2, 00:25–00:40 Uhr Pause, 00:40–01:30 Uhr Set 3").

ZEITPLANUNG (Get-In, Aufbau, Soundcheck, Abbau):
- get_in_zeit: Ankunft/Load-In von Band & Crew am Venue, üblicherweise 90-120 Minuten vor datum_von (Standard bei Hochzeiten/Partyband-Gigs: 120 Minuten / 2 Stunden) (HH:mm)
- aufbau_zeit: Beginn des Bühnen-/Technik-Aufbaus, direkt im Anschluss an get_in_zeit (HH:mm)
- soundcheck_zeit: MUSS mindestens 60 Minuten vor datum_von abgeschlossen sein – plane hier lieber grosszügig (60-90 Minuten vor Beginn), NIEMALS knapper als 60 Minuten. Ein zu später Soundcheck ist der häufigste Planungsfehler – lieber zu früh als zu spät ansetzen (HH:mm)
- Erwähne in "technik_hinweise" oder "ablaufplan", dass der Abbau direkt im Anschluss an den letzten Set erfolgt (kein zusätzlicher Zeitpuffer nötig).
Diese Zeiten müssen logisch aufeinanderfolgend VOR datum_von liegen: get_in_zeit ist am frühesten, dann aufbau_zeit, dann soundcheck_zeit (mit mind. 60 Minuten Abstand zu datum_von).

BESETZUNG – ermittle die benötigte Band/Besetzung für dieses Event und gib sie als JSON-Objekt im Feld 'besetzung_anforderung' aus.
WICHTIGE REGELN für die Besetzung:
1. HÖCHSTE PRIORITÄT: Wenn im Gespräch explizit bestimmte Instrumente oder Rollen genannt werden (z.B. "DJ", "DJ & Vocals"), dann übernimm diese EXAKT – füge KEINE weiteren Instrumente hinzu.
2. ENSEMBLE-BEGRIFFE müssen IMMER in einzelne Instrumente/Rollen aufgelöst werden – niemals als Ensemble-Name ins JSON schreiben:
   - "Jazz-Trio" → {"Bass": 1, "Piano": 1, "Gesang": 1} (3 Personen)
   - "Jazz-Quartett" → {"Bass": 1, "Piano": 1, "Gesang": 1, "Saxophon": 1} (4 Personen)
   - "Streichquartett" → {"Violine": 2, "Viola": 1, "Cello": 1} (4 Personen)
   - "Duo" → 2 passende Instrumente je nach Genre
   - "Trio" → 3 passende Instrumente je nach Genre
   - NIEMALS: {"Jazz-Trio": 3} oder {"Quartett": 1} – das ist FALSCH
3. Wenn eine Bandgröße genannt wird (z.B. "6er Band"), muss die Summe aller Werte im JSON EXAKT dieser Größe entsprechen.
4. Nur wenn KEINE explizite Besetzung oder Ensemblegröße genannt wird, schlage eine sinnvolle Standard-Besetzung vor. Für Hochzeiten und klassische Partyband-Gigs hat sich eine 5er-Besetzung bewährt: {"Gesang": 1, "Gitarre": 1, "Keyboard": 1, "Schlagzeug": 1, "Bass": 1}. Für andere Event-Typen ohne genannte Besetzung: 4-7 Personen passend zum Anlass.
5. Beispiel: "DJ & Live-Vocals" → {"DJ": 1, "Gesang": 1} – nur diese zwei.
Falls Musikgenres erwähnt oder impliziert werden, gib diese im Feld 'genre_anforderung' als Array aus.`,
      response_json_schema: {
        type: "object",
        properties: {
          ready: { type: "boolean", description: "true, wenn genug Informationen für einen vollständigen Plan vorhanden sind" },
          follow_up_message: { type: "string", description: "Kurze, gebündelte Rückfrage an den Nutzer (nur relevant wenn ready=false)" },
          titel: { type: "string", description: "Event-Titel" },
          event_typ: {
            type: "string",
            enum: ["Hochzeit", "Corporate Event", "Geburtstag", "Konzert", "Festival", "Private Feier", "Sonstiges"]
          },
          datum_von: { type: "string", description: "Start-Datum und Zeit im ISO 8601 Format" },
          datum_bis: { type: "string", description: "End-Datum und Zeit im ISO 8601 Format" },
          get_in_zeit: { type: "string", description: "Get-In Zeit im Format HH:mm" },
          aufbau_zeit: { type: "string", description: "Aufbau-Beginn / Setup-Zeit im Format HH:mm" },
          soundcheck_zeit: { type: "string", description: "Soundcheck Zeit im Format HH:mm" },
          location_vorschlaege: {
            type: "array",
            description: "Bis zu 3 verschiedene Location-Vorschläge",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Name der Location" },
                adresse: { type: "string", description: "Adresse der Location" },
                beschreibung: { type: "string", description: "Kurze Beschreibung, Stil und Besonderheiten" },
                kapazitaet: { type: "string", description: "Kapazität z.B. bis 200 Personen" },
                preisklasse: { type: "string", description: "Preisklasse z.B. €, €€, €€€" }
              }
            }
          },
          anzahl_gaeste: { type: "number", description: "Erwartete Anzahl der Gäste" },
          dresscode: { type: "string", description: "Dresscode für Musiker" },
          ablaufplan: { type: "string", description: "Detaillierter Ablaufplan des Events inkl. konkreter Set-Zeiten mit Pausen (z.B. '22:30–23:20 Set 1, 23:20–23:35 Pause, ...')" },
          technik_hinweise: { type: "string", description: "Technische Hinweise" },
          musiker_notizen: { type: "string", description: "Wichtige Hinweise für Musiker" },
          interne_notizen: { type: "string", description: "Interne Planungsnotizen" },
          zusammenfassung: { type: "string", description: "Kurze Zusammenfassung des Events in 2-3 Sätzen" },
          besetzung_anforderung: {
            type: "object",
            description: "Benötigte Besetzung als JSON-Objekt z.B. {'Gitarre': 1, 'Gesang': 1}",
            additionalProperties: { type: "number" }
          },
          genre_anforderung: {
            type: "array",
            items: { type: "string" },
            description: "Vorgeschlagene Musikgenres für das Event"
          }
        },
        required: ["ready", "besetzung_anforderung"]
      }
    });

    if (result.ready || isLastAllowedRound) {
      const summaryMsg = result.zusammenfassung
        ? `Alles klar! Ich habe deinen Eventplan erstellt: „${result.titel || "Event"}“. ${result.zusammenfassung}`
        : `Alles klar! Ich habe deinen Eventplan erstellt: „${result.titel || "Event"}“.`;
      setMessages(prev => [...prev, { role: "assistant", content: summaryMsg }]);
      await finalizePlanFromResult(result);
    } else {
      setMessages(prev => [...prev, { role: "assistant", content: result.follow_up_message || "Magst du mir noch ein paar Details zu deinem Event nennen?" }]);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!plan || !currentOrgId) return;
    setSaving(true);

    const selectedLocation = plan.location_vorschlaege?.[selectedLocationIndex];
    const createdEvent = await base44.entities.Event.create({
      org_id: currentOrgId,
      titel: plan.titel,
      event_typ: plan.event_typ,
      datum_von: plan.datum_von,
      datum_bis: plan.datum_bis,
      get_in_zeit: plan.get_in_zeit,
      aufbau_zeit: plan.aufbau_zeit,
      soundcheck_zeit: plan.soundcheck_zeit,
      ort_name: selectedLocation?.name || "",
      ort_adresse: selectedLocation?.adresse || "",
      anzahl_gaeste: plan.anzahl_gaeste,
      dresscode: plan.dresscode,
      ablaufplan: plan.ablaufplan,
      technik_hinweise: plan.technik_hinweise,
      musiker_notizen: plan.musiker_notizen,
      interne_notizen: plan.interne_notizen,
      besetzung_anforderung: plan.besetzung_anforderung,
      status: "anfrage",
      finanz_status: "offen"
    });

    // Musiker zum Event hinzufügen (Status: "optional" – noch nicht angefragt)
    const eventMusikerMap = {};
    for (const m of suggestedMusiker) {
      const em = await base44.entities.EventMusiker.create({
        event_id: createdEvent.id,
        musiker_id: m.id,
        rolle: m._rolle,
        gage_netto: m.tagessatz_netto || 0,
        status: "optional"
      });
      eventMusikerMap[m.id] = em.id;
    }

    setSaved(true);
    setSavedEventId(createdEvent.id);
    setEventMusikerMap(eventMusikerMap);
    setSaving(false);
  };

  const handleRequestSingleMusiker = async (m) => {
    if (!savedEventId) return;
    setRequestingMusiker(prev => ({ ...prev, [m.id]: true }));

    const emId = eventMusikerMap[m.id];
    if (emId) {
      await base44.entities.EventMusiker.update(emId, { status: "angefragt" });
    }

    if (m.email) {
      const eventDatum = plan.datum_von
        ? new Date(plan.datum_von).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "–";
      const selectedLocation = plan.location_vorschlaege?.[selectedLocationIndex];
      await base44.functions.invoke("sendEmail", {
        to: m.email,
        subject: `Anfrage: ${plan.titel}`,
        body: `Hallo ${m.name},\n\nwir würden dich gerne für folgendes Event anfragen:\n\nEvent: ${plan.titel}\nDatum: ${eventDatum}\nOrt: ${selectedLocation?.name || "–"}\nRolle: ${m._rolle}\n\n${plan.musiker_notizen ? `Hinweise:\n${plan.musiker_notizen}\n\n` : ""}Bitte melde dich bei uns, um die Anfrage zu bestätigen.\n\nViele Grüße`
      });
    }

    setRequestedMusikerIds(prev => [...prev, m.id]);
    setRequestingMusiker(prev => ({ ...prev, [m.id]: false }));
  };

  const formatDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
    setPlan(null);
    setSaved(false);
    setRoleSlots([]);
    setSelectedBySlot({});
    setMaxAlternatives(2);
    setSavedEventId(null);
    setRequestedMusikerIds([]);
    setEventMusikerMap({});
    setRequestingMusiker({});
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const examplePrompts = [
    "Hochzeitsfeier am nächsten Samstag in München, ca. 120 Gäste",
    "Sommerfest für ein Tech-Unternehmen, Live-Musik, Rooftop-Location in Berlin",
    "Geburtstagsparty für 50 Personen, Jazz-Trio, private Villa Hamburg"
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#2E7D69] flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display font-medium text-2xl text-foreground">AI Event-Planer</h1>
          <p className="text-sm text-muted-foreground">Erzähl mir von deinem Event – ich frage nach, was noch fehlt, und plane danach alles im Detail.</p>
        </div>
      </div>

      {/* Chat */}
      {!plan && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Beispiele zum Starten:
                </p>
                <div className="flex flex-col gap-2">
                  {examplePrompts.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(ex)}
                      className="text-left text-xs text-[#2E7D69] hover:text-[#B8543A] hover:bg-[#2E7D69]/5 rounded-lg px-3 py-2 border border-[#2E7D69]/10 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {messages.map((m, i) => (
                  <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-[#2E7D69] flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm max-w-[80%] whitespace-pre-line ${
                        m.role === "user"
                          ? "bg-[#2E7D69] text-white rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-end gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-[#2E7D69] flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-muted text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> denkt nach...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            <div className="flex items-end gap-2 pt-2 border-t border-border">
              <Textarea
                placeholder="Beschreibe dein Event... z.B. 'Hochzeitsfeier im Juni in München für 150 Gäste mit Dinner und Tanzabend'"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[52px] max-h-[160px] text-base resize-none border-border focus:border-[#2E7D69]"
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-[#2E7D69] hover:bg-[#256B59] h-[52px] px-4 shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Plan */}
      {plan && (
        <div className="space-y-4">
          {/* Summary + Save */}
          <Card className="border-0 shadow-md bg-background">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-[#2E7D69]/10 text-[#2E7D69] border-0">{plan.event_typ || "Event"}</Badge>
                    {saved && <Badge className="bg-[#2E7D69]/10 text-[#2E7D69] border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Gespeichert</Badge>}
                  </div>
                  <h2 className="font-display font-medium text-xl text-foreground mb-2">{plan.titel}</h2>
                  {plan.zusammenfassung && (
                    <p className="text-muted-foreground text-sm">{plan.zusammenfassung}</p>
                  )}
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="bg-[#2E7D69] hover:bg-[#256B59] shrink-0"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Speichern...</>
                  ) : saved ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" />Gespeichert</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />{suggestedMusiker.length > 0 ? "Speichern & Musiker hinzufügen" : "Als Event speichern"}</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Datum & Zeit */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#2E7D69]" /> Datum & Zeit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Beginn</span>
                  <span className="font-medium">{formatDateTime(plan.datum_von)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ende</span>
                  <span className="font-medium">{formatDateTime(plan.datum_bis)}</span>
                </div>
                {plan.get_in_zeit && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Get-In</span>
                    <span className="font-medium">{plan.get_in_zeit}</span>
                  </div>
                )}
                {plan.aufbau_zeit && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Hammer className="w-3 h-3" /> Aufbau</span>
                    <span className="font-medium">{plan.aufbau_zeit}</span>
                  </div>
                )}
                {plan.soundcheck_zeit && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Soundcheck</span>
                    <span className="font-medium">{plan.soundcheck_zeit}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Vorschläge */}
            {plan.location_vorschlaege?.length > 0 && (
              <Card className="border-0 shadow-sm md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#2E7D69]" /> Location-Vorschläge
                    <span className="text-xs text-muted-foreground font-normal ml-1">– wähle eine aus</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {plan.location_vorschlaege.map((loc, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedLocationIndex(i)}
                        className={`text-left rounded-xl border-2 p-4 transition-all space-y-2 ${
                          selectedLocationIndex === i
                            ? "border-[#2E7D69] bg-[#2E7D69]/5"
                            : "border-border hover:border-[#2E7D69]/40 bg-card"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-sm text-foreground">{loc.name}</span>
                          <Badge className={`text-xs shrink-0 border-0 ${
                            selectedLocationIndex === i ? "bg-[#2E7D69]/50 text-white" : "bg-muted text-muted-foreground"
                          }`}>
                            {loc.preisklasse}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{loc.adresse}</p>
                        <p className="text-xs text-muted-foreground">{loc.beschreibung}</p>
                        {loc.kapazitaet && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> {loc.kapazitaet}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                  {plan.anzahl_gaeste && (
                    <div className="flex justify-between text-sm pt-1 border-t">
                      <span className="text-muted-foreground">Erwartete Gäste</span>
                      <span className="font-medium">{plan.anzahl_gaeste}</span>
                    </div>
                  )}
                  {plan.dresscode && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dresscode</span>
                      <span className="font-medium">{plan.dresscode}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ablaufplan */}
            {plan.ablaufplan && (
              <Card className="border-0 shadow-sm md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#2E7D69]" /> Ablaufplan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-line">{plan.ablaufplan}</p>
                </CardContent>
              </Card>
            )}

            {/* Technik */}
            {plan.technik_hinweise && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2E7D69]" /> Technik
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-line">{plan.technik_hinweise}</p>
                </CardContent>
              </Card>
            )}

            {/* Notizen */}
            {(plan.musiker_notizen || plan.interne_notizen) && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#2E7D69]" /> Notizen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {plan.musiker_notizen && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Für Musiker</p>
                      <p className="text-foreground whitespace-pre-line">{plan.musiker_notizen}</p>
                    </div>
                  )}
                  {plan.interne_notizen && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Intern</p>
                      <p className="text-foreground whitespace-pre-line">{plan.interne_notizen}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Besetzungsvorschlag */}
          {plan.besetzung_anforderung && Object.keys(plan.besetzung_anforderung).length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Guitar className="w-4 h-4 text-[#2E7D69]" /> Empfohlene Besetzung
                  {plan.genre_anforderung?.length > 0 && (
                    <div className="flex gap-1 ml-auto">
                      {plan.genre_anforderung.map((g, i) => (
                        <Badge key={i} className="text-xs bg-indigo-100 text-indigo-700 border-0">{g}</Badge>
                      ))}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Benötigte Rollen */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(plan.besetzung_anforderung).map(([rolle, anzahl]) => (
                    <Badge key={rolle} className="bg-[#2E7D69]/10 text-[#2E7D69] border-0 text-sm px-3 py-1">
                      {anzahl}x {rolle}
                    </Badge>
                  ))}
                </div>

                {/* Slider: Anzahl Vorschläge pro Rolle */}
                {!saved && roleSlots.length > 0 && (
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-muted">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Vorschläge pro Rolle</span>
                    <Slider
                      value={[maxAlternatives]}
                      onValueChange={([v]) => setMaxAlternatives(v)}
                      min={1}
                      max={3}
                      step={1}
                      className="flex-1 max-w-[160px]"
                    />
                    <Badge className="bg-[#2E7D69]/10 text-[#2E7D69] border-0 shrink-0">{maxAlternatives}</Badge>
                  </div>
                )}

                {/* Passende Musiker aus dem Pool, gruppiert pro Rolle */}
                {roleSlots.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Music className="w-3 h-3" /> Passende Musiker aus deinem Pool:
                      </p>
                      {saved && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <Send className="w-3 h-3" /> Klicke <Send className="w-3 h-3 inline" /> um einen Musiker anzufragen
                        </p>
                      )}
                    </div>
                    <div className="space-y-4">
                      {roleSlots.map((slot) => {
                        const key = slotKey(slot.rolle, slot.slotIndex);
                        const selectedId = selectedBySlot[key];
                        // Nach dem Speichern nur noch die getroffene Auswahl zeigen, nicht mehr alle Alternativen
                        const candidatesToShow = saved ? slot.candidates.filter(c => c.id === selectedId) : slot.candidates;
                        if (candidatesToShow.length === 0) {
                          return (
                            <div key={key}>
                              <p className="text-xs font-medium text-foreground mb-1">{slot.rolle}{slot.slotIndex > 0 ? ` #${slot.slotIndex + 1}` : ""}</p>
                              <p className="text-sm text-muted-foreground italic">Keine passenden Musiker im Pool gefunden.</p>
                            </div>
                          );
                        }
                        return (
                          <div key={key}>
                            <p className="text-xs font-medium text-foreground mb-1.5">{slot.rolle}{slot.slotIndex > 0 ? ` #${slot.slotIndex + 1}` : ""}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {candidatesToShow.map((m) => {
                                const isSelected = m.id === selectedId;
                                const isRequested = requestedMusikerIds.includes(m.id);
                                const isLoading = requestingMusiker[m.id];
                                return (
                                  <div
                                    key={m.id}
                                    onClick={() => handleSelectCandidate(slot.rolle, slot.slotIndex, m.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${!saved ? "cursor-pointer" : ""} ${
                                      isRequested ? "border-[#2E7D69]/40 bg-[#2E7D69]/5" :
                                      isSelected ? "border-[#2E7D69]/60 bg-[#2E7D69]/5" : "border-border bg-muted opacity-70 hover:opacity-100"
                                    }`}
                                  >
                                    <Avatar className="w-10 h-10 shrink-0">
                                      <AvatarImage src={m.profilbild_url} alt={m.name} />
                                      <AvatarFallback className="bg-[#2E7D69] text-white text-xs font-bold">
                                        {m.name?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm text-foreground truncate">{m.name}</p>
                                        {m.prioritaet && (
                                          <Badge className={`text-xs font-bold border-0 shrink-0 ${prioritaetColors[m.prioritaet]}`}>
                                            {m.prioritaet}
                                          </Badge>
                                        )}
                                        {isSelected && !saved && (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D69] shrink-0" />
                                        )}
                                      </div>
                                      {m.instrumente?.length > 0 && (
                                        <p className="text-xs text-muted-foreground truncate">{m.instrumente.join(", ")}</p>
                                      )}
                                      {isRequested ? (
                                        <p className="text-xs text-[#2E7D69] font-medium flex items-center gap-1 mt-0.5">
                                          <CheckCircle2 className="w-3 h-3" /> Angefragt{m.email ? " + E-Mail" : ""}
                                        </p>
                                      ) : m.email ? (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                          <Mail className="w-3 h-3" /> {m.email}
                                        </p>
                                      ) : null}
                                    </div>
                                    {saved && isSelected && !isRequested && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => { e.stopPropagation(); handleRequestSingleMusiker(m); }}
                                        disabled={isLoading}
                                        className="shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs px-2 py-1 h-auto"
                                      >
                                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Keine passenden Musiker im Pool gefunden für diese Besetzung.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* New Plan Button */}
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full"
          >
            Neuen Plan erstellen
          </Button>
        </div>
      )}
    </div>
  );
}