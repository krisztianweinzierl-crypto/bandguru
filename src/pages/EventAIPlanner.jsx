import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Guitar
} from "lucide-react";

export default function EventAIPlanner() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(null);
  const [saved, setSaved] = useState(false);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
  const [allMusiker, setAllMusiker] = useState([]);
  const [suggestedMusiker, setSuggestedMusiker] = useState([]);

  const currentOrgId = localStorage.getItem("currentOrgId");

  useEffect(() => {
    if (currentOrgId) {
      base44.entities.Musiker.filter({ org_id: currentOrgId, aktiv: true }).then(setAllMusiker);
    }
  }, [currentOrgId]);

  // Synonyme für Instrument-Matching
  const instrumentSynonyme = {
    "keyboard": ["keyboard", "keys", "piano", "klavier", "synthesizer", "synth", "organ", "orgel"],
    "gesang": ["gesang", "vocals", "vocal", "singen", "stimme", "singer", "voice"],
    "schlagzeug": ["schlagzeug", "drums", "drum", "percussion", "beats"],
    "bass": ["bass", "bassgitarre", "e-bass", "kontrabass"],
    "gitarre": ["gitarre", "guitar", "e-gitarre", "akustikgitarre", "acoustic guitar"],
    "trompete": ["trompete", "trumpet", "horn", "blechbläser"],
    "saxophon": ["saxophon", "saxophone", "sax"],
    "geige": ["geige", "violine", "violin", "fiddle"],
    "dj": ["dj", "disc jockey", "turntable"],
  };

  const getAliases = (rolle) => {
    const rolleLower = rolle.toLowerCase();
    for (const [key, aliases] of Object.entries(instrumentSynonyme)) {
      if (aliases.includes(rolleLower) || rolleLower.includes(key)) return aliases;
    }
    return [rolleLower];
  };

  const matchMusikerFromList = (musiker, besetzungAnforderung, genreAnforderung) => {
    if (!besetzungAnforderung || Object.keys(besetzungAnforderung).length === 0) return [];

    // Schritt 1: Für jede Rolle die besten Kandidaten ermitteln (ohne usedIds-Sperre)
    const rollenMitKandidaten = Object.entries(besetzungAnforderung).map(([rolle, anzahl]) => {
      const aliases = getAliases(rolle);

      let kandidaten = musiker
        .map(m => {
          const instrumente = (m.instrumente || []);
          const primaer = instrumente[0]?.toLowerCase() || "";
          const sekundaer = instrumente.slice(1).map(i => i.toLowerCase());

          const primaerMatch = aliases.some(a => primaer.includes(a) || a.includes(primaer));
          const sekundaerMatch = sekundaer.some(inst => aliases.some(a => inst.includes(a) || a.includes(inst)));

          let score = 0;
          if (primaerMatch) score = 2;
          else if (sekundaerMatch) score = 1;
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

      return { rolle, anzahl, kandidaten };
    });

    // Schritt 2: Greedy-Zuweisung – jede Rolle bekommt ihren besten noch nicht genutzten Musiker
    const usedIds = new Set();
    const matched = [];

    rollenMitKandidaten.forEach(({ rolle, anzahl, kandidaten }) => {
      let zugewiesen = 0;
      for (const m of kandidaten) {
        if (zugewiesen >= anzahl) break;
        if (!usedIds.has(m.id)) {
          usedIds.add(m.id);
          matched.push({ ...m, _rolle: rolle });
          zugewiesen++;
        }
      }
      // Kein Fallback – nur echte Instrument-Treffer verwenden
    });

    return matched;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setPlan(null);
    setSaved(false);
    setSuggestedMusiker([]);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein professioneller Event-Planer für Musikbands. Erstelle einen detaillierten Eventplan basierend auf folgender Beschreibung: "${prompt}".
      
      Heute ist der ${new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" })}.
      
      Gib mir einen vollständigen Plan mit allen wichtigen Details. Wenn ein Datum oder eine Uhrzeit nicht explizit genannt wurde, schlage ein passendes vor.
      Alle Datumsfelder müssen im ISO 8601 Format sein (z.B. 2025-06-15T18:00:00).
      
      Schlage außerdem genau 3 verschiedene passende Location-Vorschläge vor (unterschiedliche Stile/Preisklassen).
      
      Ermittle außerdem die benötigte Besetzung/Band für dieses Event. Gib diese als JSON-Objekt im Feld 'besetzung_anforderung' aus.
      WICHTIGE REGELN für die Besetzung:
      1. Die Summe aller Werte im JSON muss EXAKT der angefragten Bandgröße entsprechen (z.B. bei "6er Band" muss die Summe genau 6 ergeben).
      2. Eine Standard Live-Band hat immer mindestens: Schlagzeug (1x), Bass (1x), Keyboard (1x), Gitarre (1x) als Basis-Besetzung. Weitere Slots werden dann mit Gesang, weiteren Instrumenten etc. aufgefüllt.
      3. Wenn keine explizite Bandgröße genannt wird, schlage eine sinnvolle Größe vor (4-7 Personen typisch).
      4. Beispiel 6er Band: {"Schlagzeug": 1, "Bass": 1, "Keyboard": 1, "Gitarre": 1, "Gesang": 1, "Trompete": 1} – Summe = 6.
      5. Doppelte Instrumenten-Einträge (z.B. "Gitarre": 2) zählen als 2 Personen.
      Falls im Prompt Musikgenres erwähnt oder impliziert werden, gib diese im Feld 'genre_anforderung' als Array aus.`,
      response_json_schema: {
        type: "object",
        properties: {
          titel: { type: "string", description: "Event-Titel" },
          event_typ: {
            type: "string",
            enum: ["Hochzeit", "Corporate Event", "Geburtstag", "Konzert", "Festival", "Private Feier", "Sonstiges"]
          },
          datum_von: { type: "string", description: "Start-Datum und Zeit im ISO 8601 Format" },
          datum_bis: { type: "string", description: "End-Datum und Zeit im ISO 8601 Format" },
          get_in_zeit: { type: "string", description: "Get-In Zeit im Format HH:mm" },
          soundcheck_zeit: { type: "string", description: "Soundcheck Zeit im Format HH:mm" },
          location_vorschlaege: {
            type: "array",
            description: "Genau 3 verschiedene Location-Vorschläge",
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
          ablaufplan: { type: "string", description: "Detaillierter Ablaufplan des Events" },
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
        required: ["titel", "datum_von", "datum_bis"]
      }
    });
    setSelectedLocationIndex(0);
    setPlan(result);

    // Musiker frisch laden (falls seit Seitenaufruf neue hinzugekommen)
    const freshMusiker = await base44.entities.Musiker.filter({ org_id: currentOrgId, aktiv: true });
    setAllMusiker(freshMusiker);
    setSuggestedMusiker(matchMusikerFromList(freshMusiker, result.besetzung_anforderung, result.genre_anforderung));
    setLoading(false);
  };

  const handleSave = async () => {
    if (!plan || !currentOrgId) return;
    setSaving(true);

    const selectedLocation = plan.location_vorschlaege?.[selectedLocationIndex];
    await base44.entities.Event.create({
      org_id: currentOrgId,
      titel: plan.titel,
      event_typ: plan.event_typ,
      datum_von: plan.datum_von,
      datum_bis: plan.datum_bis,
      get_in_zeit: plan.get_in_zeit,
      soundcheck_zeit: plan.soundcheck_zeit,
      ort_name: selectedLocation?.name || "",
      ort_adresse: selectedLocation?.adresse || "",
      anzahl_gaeste: plan.anzahl_gaeste,
      dresscode: plan.dresscode,
      ablaufplan: plan.ablaufplan,
      technik_hinweise: plan.technik_hinweise,
      musiker_notizen: plan.musiker_notizen,
      interne_notizen: plan.interne_notizen,
      status: "anfrage",
      finanz_status: "offen"
    });

    setSaving(false);
    setSaved(true);
  };

  const formatDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const examplePrompts = [
    "Plane ein Hochzeitskonzert am nächsten Samstag in München für ca. 120 Gäste, Abendveranstaltung mit Dinner und Tanzteil",
    "Corporate Event für ein Tech-Unternehmen, Sommerfest mit Live-Musik, 200 Personen, Rooftop-Location in Berlin",
    "Geburtstagsparty für 50 Personen, elegantes Ambiente, Jazz-Trio, private Villa Hamburg"
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Event-Planer</h1>
          <p className="text-sm text-gray-500">Beschreibe dein Event – die KI erstellt einen vollständigen Plan</p>
        </div>
      </div>

      {/* Prompt Input */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 space-y-4">
          <Textarea
            placeholder="Beschreibe dein Event... z.B. 'Plane eine Hochzeitsfeier im Juni in München für 150 Gäste mit Dinner und Tanzabend'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] text-base resize-none border-gray-200 focus:border-purple-400"
          />

          {/* Example Prompts */}
          {!plan && !loading && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Beispiele:
              </p>
              <div className="flex flex-col gap-2">
                {examplePrompts.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(ex)}
                    className="text-left text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg px-3 py-2 border border-purple-100 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 h-11"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                KI plant dein Event...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Eventplan generieren
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Plan */}
      {plan && (
        <div className="space-y-4">
          {/* Summary + Save */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-100 text-purple-700 border-0">{plan.event_typ || "Event"}</Badge>
                    {saved && <Badge className="bg-green-100 text-green-700 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Gespeichert</Badge>}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{plan.titel}</h2>
                  {plan.zusammenfassung && (
                    <p className="text-gray-600 text-sm">{plan.zusammenfassung}</p>
                  )}
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="bg-green-600 hover:bg-green-700 shrink-0"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Speichern...</>
                  ) : saved ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" />Gespeichert</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Als Event speichern</>
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
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" /> Datum & Zeit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Beginn</span>
                  <span className="font-medium">{formatDateTime(plan.datum_von)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ende</span>
                  <span className="font-medium">{formatDateTime(plan.datum_bis)}</span>
                </div>
                {plan.get_in_zeit && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Get-In</span>
                    <span className="font-medium">{plan.get_in_zeit}</span>
                  </div>
                )}
                {plan.soundcheck_zeit && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Soundcheck</span>
                    <span className="font-medium">{plan.soundcheck_zeit}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Vorschläge */}
            {plan.location_vorschlaege?.length > 0 && (
              <Card className="border-0 shadow-sm md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-500" /> Location-Vorschläge
                    <span className="text-xs text-gray-400 font-normal ml-1">– wähle eine aus</span>
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
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-purple-300 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-sm text-gray-900">{loc.name}</span>
                          <Badge className={`text-xs shrink-0 border-0 ${
                            selectedLocationIndex === i ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-600"
                          }`}>
                            {loc.preisklasse}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">{loc.adresse}</p>
                        <p className="text-xs text-gray-600">{loc.beschreibung}</p>
                        {loc.kapazitaet && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {loc.kapazitaet}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                  {plan.anzahl_gaeste && (
                    <div className="flex justify-between text-sm pt-1 border-t">
                      <span className="text-gray-500">Erwartete Gäste</span>
                      <span className="font-medium">{plan.anzahl_gaeste}</span>
                    </div>
                  )}
                  {plan.dresscode && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Dresscode</span>
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
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" /> Ablaufplan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{plan.ablaufplan}</p>
                </CardContent>
              </Card>
            )}

            {/* Technik */}
            {plan.technik_hinweise && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" /> Technik
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{plan.technik_hinweise}</p>
                </CardContent>
              </Card>
            )}

            {/* Notizen */}
            {(plan.musiker_notizen || plan.interne_notizen) && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" /> Notizen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {plan.musiker_notizen && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Für Musiker</p>
                      <p className="text-gray-700 whitespace-pre-line">{plan.musiker_notizen}</p>
                    </div>
                  )}
                  {plan.interne_notizen && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Intern</p>
                      <p className="text-gray-700 whitespace-pre-line">{plan.interne_notizen}</p>
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
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Guitar className="w-4 h-4 text-purple-500" /> Empfohlene Besetzung
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
                    <Badge key={rolle} className="bg-purple-100 text-purple-700 border-0 text-sm px-3 py-1">
                      {anzahl}x {rolle}
                    </Badge>
                  ))}
                </div>

                {/* Passende Musiker aus dem Pool */}
                {suggestedMusiker.length > 0 ? (
                  <div>
                    <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                      <Music className="w-3 h-3" /> Passende Musiker aus deinem Pool:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {suggestedMusiker.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-purple-50 hover:border-purple-200 transition-colors">
                          <Avatar className="w-10 h-10 shrink-0">
                            <AvatarImage src={m.profilbild_url} alt={m.name} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-indigo-500 text-white text-xs font-bold">
                              {m.name?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{m.name}</p>
                            <p className="text-xs text-purple-600 font-medium truncate">{m._rolle}</p>
                            {m.instrumente?.length > 0 && (
                              <p className="text-xs text-gray-500 truncate">{m.instrumente.join(", ")}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Keine passenden Musiker im Pool gefunden für diese Besetzung.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* New Plan Button */}
          <Button
            variant="outline"
            onClick={() => { setPlan(null); setPrompt(""); setSaved(false); setSuggestedMusiker([]); }}
            className="w-full"
          >
            Neuen Plan erstellen
          </Button>
        </div>
      )}
    </div>
  );
}