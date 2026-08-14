import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Wand2, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";

const isSongMissingData = (song) => {
  const noArtist = !song.kuenstler_original?.trim();
  const noKey = !song.tonart?.trim();
  const noBpm = song.bpm === null || song.bpm === undefined || song.bpm === '';
  const noLength = !song.laenge?.trim();
  const noTags = !song.tags || song.tags.length === 0;
  return noArtist || noKey || noBpm || noLength || noTags;
};

async function processWithConcurrency(items, worker, concurrency, onProgress) {
  let index = 0;
  let doneCount = 0;
  const results = new Array(items.length);

  async function runNext() {
    while (index < items.length) {
      const current = index++;
      try {
        results[current] = { value: await worker(items[current]) };
      } catch (error) {
        results[current] = { error };
      }
      doneCount++;
      onProgress?.(doneCount, items.length);
    }
  }

  const workerCount = Math.min(concurrency, items.length) || 1;
  await Promise.all(Array.from({ length: workerCount }, runNext));
  return results;
}

const researchSong = async (song) => {
  return base44.integrations.Core.InvokeLLM({
    prompt: `Recherchiere im Internet nach dem Song "${song.titel}"${song.kuenstler_original ? ` (Original-Interpret vermutlich: ${song.kuenstler_original})` : ''}.

Ich brauche Metadaten zur ORIGINAL-Studioaufnahme dieses Songs (nicht zu einer Coverversion):
- kuenstler_original: der Original-Interpret/die Original-Band
- tonart: die Tonart der Originalaufnahme (z.B. "Bb", "Dm", "C-Dur")
- bpm: das Tempo der Originalaufnahme in BPM
- laenge: die Länge der Originalaufnahme im Format MM:SS
- tags: 1-3 treffende Genre-Tags (z.B. "Pop", "Funk", "Soul")

Gib nur Werte zurück, die du wirklich verlässlich recherchieren kannst. Lass ein Feld einfach weg, wenn du nichts Verlässliches findest - rate nicht.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        kuenstler_original: { type: "string" },
        tonart: { type: "string" },
        bpm: { type: "number" },
        laenge: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
    },
  });
};

export default function SongEnrichment({ songs, onClose, onSuccess }) {
  const [phase, setPhase] = useState('scan'); // scan | researching | preview | done
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [proposals, setProposals] = useState([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);

  const candidateSongs = useMemo(() => songs.filter(isSongMissingData), [songs]);

  const handleStartResearch = async () => {
    setPhase('researching');
    setProgress({ done: 0, total: candidateSongs.length });

    const results = await processWithConcurrency(
      candidateSongs,
      researchSong,
      4,
      (done, total) => setProgress({ done, total })
    );

    let failed = 0;
    let skipped = 0;
    const built = [];

    candidateSongs.forEach((song, i) => {
      const outcome = results[i];
      if (outcome.error) {
        failed++;
        return;
      }
      const found = outcome.value || {};

      const proposal = {
        song_id: song.id,
        titel: song.titel,
        include: true,
        kuenstler_original: !song.kuenstler_original?.trim() ? (found.kuenstler_original || '') : '',
        tonart: !song.tonart?.trim() ? (found.tonart || '') : '',
        bpm: (song.bpm === null || song.bpm === undefined || song.bpm === '') && found.bpm != null ? String(found.bpm) : '',
        laenge: !song.laenge?.trim() ? (found.laenge || '') : '',
        tagsText: (!song.tags || song.tags.length === 0) && found.tags?.length ? found.tags.join(', ') : '',
      };

      const hasAnyProposal = !!(proposal.kuenstler_original || proposal.tonart || proposal.bpm || proposal.laenge || proposal.tagsText);

      if (hasAnyProposal) {
        built.push(proposal);
      } else {
        skipped++;
      }
    });

    setProposals(built);
    setSkippedCount(skipped);
    setFailedCount(failed);
    setPhase('preview');
  };

  const updateProposal = (songId, key, value) => {
    setProposals((prev) => prev.map((p) => (p.song_id === songId ? { ...p, [key]: value } : p)));
  };

  const includedCount = proposals.filter((p) => p.include).length;

  const handleConfirm = async () => {
    const toApply = proposals.filter((p) => p.include);
    if (toApply.length === 0) return;

    setCommitting(true);

    let updated = 0;
    for (const p of toApply) {
      const updateData = {};
      if (p.kuenstler_original.trim()) updateData.kuenstler_original = p.kuenstler_original.trim();
      if (p.tonart.trim()) updateData.tonart = p.tonart.trim();
      if (p.bpm !== '' && !Number.isNaN(parseInt(p.bpm))) updateData.bpm = parseInt(p.bpm);
      if (p.laenge.trim()) updateData.laenge = p.laenge.trim();
      if (p.tagsText.trim()) updateData.tags = p.tagsText.split(',').map((t) => t.trim()).filter(Boolean);

      if (Object.keys(updateData).length > 0) {
        try {
          await base44.entities.Song.update(p.song_id, updateData);
          updated++;
        } catch (error) {
          console.error(`Fehler beim Aktualisieren von "${p.titel}":`, error);
        }
      }
    }

    setResult({ count: updated });
    setCommitting(false);
    setPhase('done');

    setTimeout(() => {
      onSuccess();
    }, 1500);
  };

  return (
    <Card className="border-none shadow-lg mb-6">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            Fehlende Daten per Internetsuche ergänzen
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {phase === 'scan' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              {candidateSongs.length === 0 ? (
                <p>Alle Songs in deiner Bibliothek haben bereits vollständige Angaben (Künstler, Tonart, BPM, Länge, Genre). Nichts zu ergänzen.</p>
              ) : (
                <p>
                  <strong>{candidateSongs.length}</strong> von {songs.length} Songs haben mindestens eine Lücke (fehlender Künstler, Tonart, BPM, Länge oder Genre). Für diese wird online nach der Original-Studioaufnahme recherchiert. Bereits ausgefüllte Felder werden dabei nie überschrieben.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button
                onClick={handleStartResearch}
                disabled={candidateSongs.length === 0}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Jetzt recherchieren ({candidateSongs.length})
              </Button>
            </div>
          </div>
        )}

        {phase === 'researching' && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            <p className="text-sm text-gray-600">
              Recherchiere {progress.done} von {progress.total} Songs...
            </p>
          </div>
        )}

        {phase === 'preview' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              Für <strong>{proposals.length}</strong> Songs wurden Ergänzungen gefunden. Bitte kurz prüfen, unpassende Werte korrigieren oder Zeilen abwählen, dann übernehmen.
              {(skippedCount > 0 || failedCount > 0) && (
                <p className="mt-1 text-blue-700">
                  {skippedCount > 0 && `${skippedCount} Song(s) ohne verlässlichen Fund. `}
                  {failedCount > 0 && `${failedCount} Song(s) konnten nicht recherchiert werden (Fehler).`}
                </p>
              )}
            </div>

            {proposals.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="p-2 w-8"></th>
                        <th className="text-left p-2 font-semibold text-gray-700">Titel</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Künstler</th>
                        <th className="text-left p-2 font-semibold text-gray-700 w-20">Tonart</th>
                        <th className="text-left p-2 font-semibold text-gray-700 w-20">BPM</th>
                        <th className="text-left p-2 font-semibold text-gray-700 w-24">Länge</th>
                        <th className="text-left p-2 font-semibold text-gray-700">Genre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {proposals.map((p) => (
                        <tr key={p.song_id} className={!p.include ? 'opacity-40' : ''}>
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={p.include}
                              onChange={(e) => updateProposal(p.song_id, 'include', e.target.checked)}
                            />
                          </td>
                          <td className="p-2 font-medium text-gray-900 whitespace-nowrap">{p.titel}</td>
                          <td className="p-2">
                            <Input value={p.kuenstler_original} onChange={(e) => updateProposal(p.song_id, 'kuenstler_original', e.target.value)} className="h-8 text-sm" placeholder="—" />
                          </td>
                          <td className="p-2">
                            <Input value={p.tonart} onChange={(e) => updateProposal(p.song_id, 'tonart', e.target.value)} className="h-8 text-sm" placeholder="—" />
                          </td>
                          <td className="p-2">
                            <Input value={p.bpm} onChange={(e) => updateProposal(p.song_id, 'bpm', e.target.value)} className="h-8 text-sm" placeholder="—" />
                          </td>
                          <td className="p-2">
                            <Input value={p.laenge} onChange={(e) => updateProposal(p.song_id, 'laenge', e.target.value)} className="h-8 text-sm" placeholder="—" />
                          </td>
                          <td className="p-2">
                            <Input value={p.tagsText} onChange={(e) => updateProposal(p.song_id, 'tagsText', e.target.value)} className="h-8 text-sm" placeholder="—" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Abbrechen
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={committing || includedCount === 0}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                {committing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Übernehme...
                  </>
                ) : (
                  `${includedCount} Songs aktualisieren`
                )}
              </Button>
            </div>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="rounded-lg p-4 flex items-start gap-3 bg-green-50 border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">{result.count} Songs erfolgreich aktualisiert!</p>
              <p className="text-sm text-green-700 mt-1">Die Ergänzungen sind jetzt in deiner Bibliothek sichtbar.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
