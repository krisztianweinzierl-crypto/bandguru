import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FolderOpen, Link2, FileText, Loader2, X, Check, Trash2, AlertCircle } from "lucide-react";

function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/\.(pdf|jpg|jpeg|png)$/i, "")
    .replace(/[_\-]+/g, " ")
    .replace(/[^a-z0-9 ]/gi, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchScore(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const tokensA = new Set(a.split(" "));
  const tokensB = new Set(b.split(" "));
  const overlap = [...tokensA].filter((t) => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return union ? overlap / union : 0;
}

function bestMatch(candidateTitle, songs) {
  const normCandidate = normalize(candidateTitle);
  let best = null;
  let bestScore = 0;
  for (const song of songs) {
    const score = matchScore(normCandidate, normalize(song.titel));
    if (score > bestScore) {
      bestScore = score;
      best = song;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

function filenameFromUrl(url) {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const last = path.split("/").filter(Boolean).pop() || url;
    return last;
  } catch {
    return url;
  }
}

let uid = 0;
const nextId = () => `row-${++uid}-${Date.now()}`;

export default function BulkNotenUpload({ songs, onClose, onSuccess }) {
  const [queue, setQueue] = useState([]);
  const [linkInput, setLinkInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (files.length === 0) return;
    const rows = files.map((file) => {
      const title = file.name.replace(/\.pdf$/i, "");
      const match = bestMatch(title, songs);
      return { id: nextId(), source: "file", file, label: file.name, guessedTitle: title, songId: match?.id || "" };
    });
    setQueue((prev) => [...prev, ...rows]);
  };

  const addLinks = () => {
    const lines = linkInput.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const rows = lines.map((line) => {
      let title, url;
      if (line.includes("|")) {
        const [t, u] = line.split("|").map((s) => s.trim());
        title = t;
        url = u;
      } else {
        url = line;
        title = filenameFromUrl(line).replace(/\.pdf$/i, "");
      }
      const match = bestMatch(title, songs);
      return { id: nextId(), source: "link", url, label: filenameFromUrl(url), guessedTitle: title, songId: match?.id || "" };
    });
    setQueue((prev) => [...prev, ...rows]);
    setLinkInput("");
  };

  const updateRowSong = (id, songId) => {
    setQueue((prev) => prev.map((r) => (r.id === id ? { ...r, songId } : r)));
  };

  const removeRow = (id) => {
    setQueue((prev) => prev.filter((r) => r.id !== id));
  };

  const matchedCount = queue.filter((r) => r.songId).length;

  const handleApply = async () => {
    const rowsToApply = queue.filter((r) => r.songId);
    if (rowsToApply.length === 0) return;

    setApplying(true);
    setProgress({ done: 0, total: rowsToApply.length });

    let successCount = 0;
    let failCount = 0;
    const updatedNotenBySong = {};

    for (const row of rowsToApply) {
      try {
        let fileEntry;
        if (row.source === "file") {
          const uploadResult = await base44.integrations.Core.UploadFile({ file: row.file });
          if (!uploadResult?.file_url) throw new Error("Kein Upload-URL erhalten");
          fileEntry = { name: row.file.name, url: uploadResult.file_url };
        } else {
          fileEntry = { name: row.label, url: row.url };
        }

        const song = songs.find((s) => s.id === row.songId);
        const currentFiles = updatedNotenBySong[row.songId] || song?.noten_dateien || [];
        const newFiles = [...currentFiles, fileEntry];
        await base44.entities.Song.update(row.songId, { noten_dateien: newFiles });
        updatedNotenBySong[row.songId] = newFiles;

        successCount++;
      } catch (error) {
        console.error("Fehler beim Zuordnen:", row.label, error);
        failCount++;
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setApplying(false);
    setResult({ success: successCount, failed: failCount });
    onSuccess?.();
  };

  if (result) {
    return (
      <Card className="border-none shadow-lg mb-6">
        <CardContent className="p-8 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--status-confirmed-bg)" }}>
            <Check className="w-7 h-7" style={{ color: "var(--status-confirmed-text)" }} />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {result.success} {result.success === 1 ? "Notenblatt" : "Notenblätter"} zugeordnet
          </h3>
          {result.failed > 0 && (
            <p className="text-sm text-destructive mb-4">{result.failed} fehlgeschlagen (siehe Konsole).</p>
          )}
          <Button onClick={onClose} style={{ backgroundColor: "#FF6A4D" }} className="hover:opacity-90 text-white">
            Fertig
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg mb-6">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Noten mehreren Songs zuordnen</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              PDFs hochladen oder Cloud-Links einfügen &mdash; die Zuordnung erfolgt automatisch anhand des Dateinamens/Titels.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Input-Bereich */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 border-dashed border-border rounded-lg p-4 space-y-3">
            <Label label="Lokale Dateien" icon={FolderOpen} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                PDFs auswählen
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Ordner auswählen
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Dateiname wird als Titel verwendet, z.B. &bdquo;Uptown Funk.pdf&ldquo;.</p>
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <input ref={folderInputRef} type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-4 space-y-3">
            <Label label="Cloud-Links (Dropbox, Drive, …)" icon={Link2} />
            <Textarea
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder={"Ein Link pro Zeile, z.B.:\nhttps://dropbox.com/s/.../Uptown Funk.pdf\nMein Song Titel | https://drive.google.com/..."}
              rows={4}
              className="text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={addLinks} disabled={!linkInput.trim()}>
              <Link2 className="w-4 h-4 mr-2" />
              Links hinzufügen
            </Button>
            <p className="text-xs text-muted-foreground">
              Wenn der Link keinen Titel im Namen trägt (z.B. Google Drive), einfach als <code>Titel | Link</code> einfügen.
            </p>
          </div>
        </div>

        {/* Review-Tabelle */}
        {queue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {queue.length} {queue.length === 1 ? "Eintrag" : "Einträge"} &middot; {matchedCount} zugeordnet
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setQueue([])} className="text-muted-foreground">
                Liste leeren
              </Button>
            </div>
            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              {queue.map((row) => (
                <div key={row.id} className="flex items-center gap-3 p-3">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{row.label}</p>
                    <p className="text-xs text-muted-foreground truncate">Erkannt: &bdquo;{row.guessedTitle}&ldquo;</p>
                  </div>
                  <Select value={row.songId} onValueChange={(v) => updateRowSong(row.id, v)}>
                    <SelectTrigger className="w-56 flex-shrink-0">
                      <SelectValue placeholder="Keinen Song zuordnen" />
                    </SelectTrigger>
                    <SelectContent>
                      {songs.map((song) => (
                        <SelectItem key={song.id} value={song.id}>
                          {song.titel}{song.kuenstler_original ? ` – ${song.kuenstler_original}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {row.songId ? (
                    <Badge className="status-green border-transparent flex-shrink-0">
                      <Check className="w-3 h-3 mr-1" />Treffer
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground flex-shrink-0">
                      <AlertCircle className="w-3 h-3 mr-1" />Kein Treffer
                    </Badge>
                  )}
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row.id)} className="flex-shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end items-center gap-3 pt-4 border-t">
          {applying && (
            <span className="text-sm text-muted-foreground mr-auto">
              {progress.done} / {progress.total} verarbeitet…
            </span>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={applying}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={applying || matchedCount === 0}
            style={{ backgroundColor: "#FF6A4D" }}
            className="hover:opacity-90 text-white"
          >
            {applying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {matchedCount > 0 ? `${matchedCount} Noten zuordnen` : "Noten zuordnen"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Label({ label, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
      <Icon className="w-4 h-4 text-muted-foreground" />
      {label}
    </div>
  );
}
