import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Upload, FileText, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SongImport({ onClose, onSuccess, orgId }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
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
        
        switch(header) {
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
            song.tags = value ? value.split(';').map(t => t.trim()).filter(t => t) : [];
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

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const songs = parseCSV(text);

      if (songs.length === 0) {
        setResult({
          success: false,
          message: "Keine Songs gefunden. Bitte überprüfe das CSV-Format."
        });
        setImporting(false);
        return;
      }

      // Songs mit org_id ergänzen und importieren
      const songsWithOrg = songs.map(song => ({ ...song, org_id: orgId }));
      await base44.entities.Song.bulkCreate(songsWithOrg);

      setResult({
        success: true,
        message: `${songs.length} Songs erfolgreich importiert!`,
        count: songs.length
      });

      // Nach erfolg warten und dann schließen
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error) {
      console.error("Import-Fehler:", error);
      setResult({
        success: false,
        message: "Fehler beim Importieren: " + (error.message || "Unbekannter Fehler")
      });
    } finally {
      setImporting(false);
    }
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
        <div className="space-y-6">
          {/* Anleitung */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              CSV-Format
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              Lade eine CSV-Datei mit deinen Songs hoch. Die erste Zeile sollte die Spaltenüberschriften enthalten.
            </p>
            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Unterstützte Spalten:</strong></p>
              <p>• Titel* (Pflichtfeld)</p>
              <p>• Künstler, Tonart, BPM, Länge (MM:SS)</p>
              <p>• Genre (mehrere mit Semikolon trennen: "Pop;Funk")</p>
              <p>• Noten (URL), YouTube (URL), Notizen</p>
            </div>
          </div>

          {/* Template Download */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              CSV-Vorlage herunterladen
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">CSV-Datei auswählen</Label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="file-upload"
                className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {file ? file.name : 'Datei auswählen oder hierher ziehen'}
                </span>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-4 flex items-start gap-3 ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
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
                {result.success && result.count && (
                  <p className="text-sm text-green-700 mt-1">
                    Die Songs erscheinen jetzt in deiner Bibliothek.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Importiere...' : 'Jetzt importieren'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}