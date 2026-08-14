import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X, Upload, FileText, Download, AlertCircle, CheckCircle2, ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

let previewIdCounter = 0;
const nextPreviewId = () => `preview_${++previewIdCounter}`;

export default function SongImport({ onClose, onSuccess, orgId }) {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [preview, setPreview] = useState(null); // array of draft songs, once analyzed
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAnalyzeError(null);
      setPreview(null);
      setResult(null);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const songs = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const song = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';

        switch (header) {
          case 'titel':
          case 'title':
            song.titel = value;
            break;
          case 'künstler':
          case 'kuenstler':
          case 'artist':
            song.kuenstler_original = value;
            break;
          case 'tonart':
          case 'key':
            song.tonart = value;
            break;
          case 'bpm':
          case 'tempo':
            song.bpm = value ? parseInt(value) : null;
            break;
          case 'länge':
          case 'laenge':
          case 'length':
          case 'dauer':
            song.laenge = value;
            break;
          case 'genre':
          case 'genres':
          case 'tags':
            song.tagsText = value;
            break;
          case 'noten':
          case 'lead_sheet':
          case 'sheet':
            song.lead_sheet_url = value;
            break;
          case 'youtube':
          case 'audio':
          case 'demo':
            song.audio_demo_url = value;
            break;
          case 'notizen':
          case 'notes':
            song.notizen = value;
            break;
        }
      });

      if (song.titel) {
        songs.push(song);
      }
    }

    return songs;
  };

  const isPdf = (f) => f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf');

  const extractFromPdf = async (f) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Das angehängte PDF ist eine Songliste/Repertoireliste einer Band. Lies das GESAMTE Dokument über alle Seiten hinweg.

Wichtig:
- Das Dokument kann MEHRERE Tabellen oder Abschnitte enthalten (z.B. mit Überschriften wie "LOUNGE", "PARTY", "Optionen", "Option"). Erfasse die Songs aus JEDER Tabelle/JEDEM Abschnitt, nicht nur der ersten.
- Ignoriere reine Abschnitts-Überschriften (z.B. "LOUNGE", "PARTY", "Optionen") und wiederholte Spaltenkopfzeilen ("No.", "Song", "Gesang", "Tonart") sowie die laufende Nummer ("No.") – das sind keine Songs.
- Erfasse WIRKLICH JEDE einzelne Songzeile, auch wenn sie über mehrere Seiten verteilt sind.

Für jede Songzeile extrahiere:
- titel: der Songname, inkl. relevanter Zusatzinfos die Teil des Songnamens/Feldes sind (z.B. "Killing me softly /Rozzi Cover")
- kuenstler_original: falls ein Originalinterpret erkennbar ist (z.B. in Klammern genannt, wie "At Last /Etta James"), sonst leer lassen
- tonart: NUR die eigentliche Tonart (z.B. "Bb", "Dm", "G#m"). Das Wort "Original" das oft davor steht ist KEIN Teil der Tonart und muss weggelassen werden.
- bpm: nur falls ein Tempo in BPM angegeben ist
- laenge: nur falls eine Länge im Format MM:SS angegeben ist
- notizen: falls eine Spalte wie "Gesang" einen Sänger/eine Sängerin nennt, trage das hier ein als "Gesang: <Name>"`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          songs: {
            type: "array",
            description: "Jede einzelne Songzeile aus allen Tabellen/Abschnitten des Dokuments",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                kuenstler_original: { type: "string" },
                tonart: { type: "string" },
                bpm: { type: "number" },
                laenge: { type: "string" },
                notizen: { type: "string" },
              },
              required: ["titel"],
            },
          },
        },
        required: ["songs"],
      },
    });

    return (result?.songs || []).filter((s) => s.titel && s.titel.trim());
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    setAnalyzeError(null);
    setPreview(null);

    try {
      const rawSongs = isPdf(file) ? await extractFromPdf(file) : parseCSV(await file.text());

      if (rawSongs.length === 0) {
        setAnalyzeError(
          isPdf(file)
            ? "Keine Songs im PDF erkannt. Bitte prüfe, ob die Datei eine lesbare Songliste enthält."
            : "Keine Songs gefunden. Bitte überprüfe das CSV-Format."
        );
        setAnalyzing(false);
        return;
      }

      const draftSongs = rawSongs.map((s) => ({
        _id: nextPreviewId(),
        include: true,
        titel: s.titel || '',
        kuenstler_original: s.kuenstler_original || '',
        tonart: s.tonart || '',
        bpm: s.bpm ?? '',
        laenge: s.laenge || '',
        tagsText: s.tagsText || (s.tags ? s.tags.join(', ') : ''),
        notizen: s.notizen || '',
        lead_sheet_url: s.lead_sheet_url || '',
        audio_demo_url: s.audio_demo_url || '',
      }));

      setPreview(draftSongs);
    } catch (error) {
      console.error("Analyse-Fehler:", error);
      setAnalyzeError("Fehler beim Auslesen der Datei: " + (error.message || "Unbekannter Fehler"));
    } finally {
      setAnalyzing(false);
    }
  };

  const updatePreviewRow = (id, key, value) => {
    setPreview((prev) => prev.map((row) => (row._id === id ? { ...row, [key]: value } : row)));
  };

  const removePreviewRow = (id) => {
    setPreview((prev) => prev.filter((row) => row._id !== id));
  };

  const includedCount = preview?.filter((row) => row.include).length || 0;

  const handleConfirmImport = async () => {
    const rowsToImport = preview.filter((row) => row.include && row.titel.trim());
    if (rowsToImport.length === 0) return;

    setImporting(true);
    setResult(null);

    try {
      const songsWithOrg = rowsToImport.map((row) => ({
        org_id: orgId,
        titel: row.titel.trim(),
        kuenstler_original: row.kuenstler_original.trim() || undefined,
        tonart: row.tonart.trim() || undefined,
        bpm: row.bpm !== '' ? parseInt(row.bpm) : undefined,
        laenge: row.laenge.trim() || undefined,
        tags: row.tagsText ? row.tagsText.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        notizen: row.notizen.trim() || undefined,
        lead_sheet_url: row.lead_sheet_url || undefined,
        audio_demo_url: row.audio_demo_url || undefined,
      }));

      await base44.entities.Song.bulkCreate(songsWithOrg);

      setResult({
        success: true,
        message: `${songsWithOrg.length} Songs erfolgreich importiert!`,
        count: songsWithOrg.length,
      });

      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error) {
      console.error("Import-Fehler:", error);
      setResult({
        success: false,
        message: "Fehler beim Importieren: " + (error.message || "Unbekannter Fehler"),
      });
    } finally {
      setImporting(false);
    }
  };

  const handleBackToFileSelect = () => {
    setPreview(null);
    setAnalyzeError(null);
    setResult(null);
  };

  const downloadTemplate = () => {
    const template = `Titel,Künstler,Tonart,BPM,Länge,Genre,Noten,YouTube,Notizen
Uptown Funk,Mark Ronson ft. Bruno Mars,Dm,115,04:30,Pop;Funk,https://...,https://youtube.com/...,Groovy Song
Shape of You,Ed Sheeran,C#m,96,03:53,Pop,,,
Superstition,Stevie Wonder,Ebm,100,04:05,Funk;Soul,,,Classic`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'song-import-vorlage.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-none shadow-lg mb-6">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>Songs importieren</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {!preview ? (
          <div className="space-y-6">
            {/* Anleitung */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                CSV- oder PDF-Datei
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                Lade eine CSV-Datei mit deinen Songs hoch, oder lade direkt ein PDF mit eurer Songliste/Repertoireliste hoch – die Songs werden dann automatisch per KI ausgelesen. Vor dem eigentlichen Import bekommst du eine Vorschau, die du noch anpassen kannst.
              </p>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>CSV – unterstützte Spalten:</strong></p>
                <p>• Titel* (Pflichtfeld)</p>
                <p>• Künstler, Tonart, BPM, Länge (MM:SS)</p>
                <p>• Genre (mehrere mit Semikolon trennen: "Pop;Funk")</p>
                <p>• Noten (URL), YouTube (URL), Notizen</p>
                <p className="pt-2"><strong>PDF:</strong> Egal ob eine oder mehrere Tabellen/Abschnitte – Songzeilen werden über das gesamte Dokument hinweg erkannt.</p>
              </div>
            </div>

            {/* Template Download */}
            <div className="flex justify-center">
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" />
                CSV-Vorlage herunterladen
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">CSV- oder PDF-Datei auswählen</Label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="file-upload"
                  className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {file ? file.name : 'Datei auswählen oder hierher ziehen (CSV oder PDF)'}
                  </span>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Analyze error */}
            {analyzeError && (
              <div className="rounded-lg p-4 flex items-start gap-3 bg-red-50 border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="font-medium text-red-900">{analyzeError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={!file || analyzing}
                className="bg-[#FF6A4D] hover:bg-[#E85A3D]"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isPdf(file || { name: '' }) ? 'PDF wird ausgelesen...' : 'Datei wird gelesen...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Datei auslesen
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!result && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                  {preview.length} Songs erkannt. Bitte kurz prüfen, unpassende Zeilen abwählen oder korrigieren, dann importieren.
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b sticky top-0">
                        <tr>
                          <th className="p-2 w-8"></th>
                          <th className="text-left p-2 font-semibold text-gray-700">Titel</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Künstler</th>
                          <th className="text-left p-2 font-semibold text-gray-700 w-24">Tonart</th>
                          <th className="text-left p-2 font-semibold text-gray-700">Notizen</th>
                          <th className="p-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {preview.map((row) => (
                          <tr key={row._id} className={!row.include ? 'opacity-40' : ''}>
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={row.include}
                                onChange={(e) => updatePreviewRow(row._id, 'include', e.target.checked)}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={row.titel}
                                onChange={(e) => updatePreviewRow(row._id, 'titel', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={row.kuenstler_original}
                                onChange={(e) => updatePreviewRow(row._id, 'kuenstler_original', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={row.tonart}
                                onChange={(e) => updatePreviewRow(row._id, 'tonart', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={row.notizen}
                                onChange={(e) => updatePreviewRow(row._id, 'notizen', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="p-2">
                              <Button size="sm" variant="ghost" onClick={() => removePreviewRow(row._id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Result */}
            {result && (
              <div className={`rounded-lg p-4 flex items-start gap-3 ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.message}
                  </p>
                  {result.success && (
                    <p className="text-sm text-green-700 mt-1">Die Songs erscheinen jetzt in deiner Bibliothek.</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {!result && (
              <div className="flex justify-between gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleBackToFileSelect} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Andere Datei wählen
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={importing || includedCount === 0}
                  className="bg-[#FF6A4D] hover:bg-[#E85A3D]"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {importing ? 'Importiere...' : `${includedCount} Songs importieren`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
