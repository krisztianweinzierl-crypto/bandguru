import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};
const formats = ["header", "bold", "italic", "underline", "list", "bullet"];

export default function MusikerHinzufuegenForm({
  musiker,
  vorlagen,
  selectedMusikerId, setSelectedMusikerId,
  musikerRolle, setMusikerRolle,
  musikerGage, setMusikerGage,
  musikerDistanz, setMusikerDistanz,
  musikerFahrtkostenProKm, setMusikerFahrtkostenProKm,
  musikerNotizen, setMusikerNotizen,
  buchungsbedingungen, setBuchungsbedingungen,
  selectedVorlageId, setSelectedVorlageId,
  onAdd,
  onCancel,
  isPending,
}) {
  return (
    <Card className="mb-6 bg-blue-50 border-blue-200">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Musiker hinzufügen</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Musiker auswählen <span className="text-red-500">*</span></Label>
            <Select value={selectedMusikerId} onValueChange={(value) => {
              setSelectedMusikerId(value);
              const m = musiker.find(mus => mus.id === value);
              if (m) {
                setMusikerRolle(m.instrumente?.[0] || "");
                setMusikerGage(m.tagessatz_netto?.toString() || "");
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Musiker wählen..." /></SelectTrigger>
              <SelectContent>
                {musiker.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} {m.instrumente?.length > 0 && `(${m.instrumente.join(", ")})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rolle/Instrument <span className="text-red-500">*</span></Label>
              <Input value={musikerRolle} onChange={(e) => setMusikerRolle(e.target.value)} placeholder="z.B. Gitarre, Gesang" />
            </div>
            <div>
              <Label>Gage (netto)</Label>
              <Input type="number" value={musikerGage} onChange={(e) => setMusikerGage(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Entfernung (km, einfach)</Label>
              <Input type="number" value={musikerDistanz} onChange={(e) => setMusikerDistanz(e.target.value)} placeholder="z.B. 50" />
            </div>
            <div>
              <Label>€/km</Label>
              <Input type="number" step="0.01" value={musikerFahrtkostenProKm} onChange={(e) => setMusikerFahrtkostenProKm(e.target.value)} placeholder="0.30" />
            </div>
            <div>
              <Label>Fahrtkosten (berechnet)</Label>
              <div className="h-10 px-3 py-2 bg-gray-100 border rounded-md flex items-center text-sm font-medium">
                {((parseFloat(musikerDistanz) || 0) * 2 * (parseFloat(musikerFahrtkostenProKm) || 0.30)).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
              </div>
            </div>
          </div>

          <div>
            <Label>Notizen</Label>
            <Textarea value={musikerNotizen} onChange={(e) => setMusikerNotizen(e.target.value)} placeholder="Zusätzliche Informationen..." rows={2} />
          </div>

          <div className="space-y-3">
            <Label>Buchungsbedingungen (sichtbar für Musiker)</Label>
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Vorlage auswählen (optional)</Label>
              <Select value={selectedVorlageId} onValueChange={(value) => {
                setSelectedVorlageId(value);
                if (value === "keine") {
                  setBuchungsbedingungen("");
                } else {
                  const vorlage = vorlagen.find(v => v.id === value);
                  if (vorlage) setBuchungsbedingungen(vorlage.inhalt);
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Vorlage wählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keine">-- Keine Vorlage --</SelectItem>
                  {vorlagen.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name} ({v.kategorie})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vorlagen.length === 0 && (
                <p className="text-xs text-amber-600">Noch keine Vorlagen vorhanden. Erstelle Vorlagen unter Einstellungen → Buchungsbedingungen</p>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg">
              <ReactQuill theme="snow" value={buchungsbedingungen} onChange={setBuchungsbedingungen} modules={modules} formats={formats} placeholder="z.B. Bitte Smoking mitbringen..." className="min-h-[150px]" />
            </div>
            <p className="text-xs text-gray-500">Diese Bedingungen muss der Musiker bei Zusage akzeptieren</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
            <Button onClick={onAdd} disabled={!selectedMusikerId || isPending} className="text-white" style={{ backgroundColor: "#223a5e" }}>
              Musiker hinzufügen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}