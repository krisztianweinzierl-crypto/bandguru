import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, X, ChevronDown, Send } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};
const formats = ["header", "bold", "italic", "underline", "list", "bullet"];

export function EditMusikerDialog({ open, onOpenChange, editMusikerData, setEditMusikerData, musiker, editingEventMusiker, onSave, isSaving }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Musiker bearbeiten</DialogTitle>
          <DialogDescription>{musiker?.find(m => m.id === editingEventMusiker?.musiker_id)?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Rolle/Instrument</Label>
            <Input value={editMusikerData.rolle} onChange={(e) => setEditMusikerData({ ...editMusikerData, rolle: e.target.value })} placeholder="z.B. Gitarre, Gesang" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Gage (netto)</Label>
              <Input type="number" value={editMusikerData.gage_netto} onChange={(e) => setEditMusikerData({ ...editMusikerData, gage_netto: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>MwSt.-Satz (%)</Label>
              <Input type="number" value={editMusikerData.mwst_satz} onChange={(e) => setEditMusikerData({ ...editMusikerData, mwst_satz: e.target.value })} placeholder="19" />
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Gage (netto):</span>
              <span className="font-medium">{(parseFloat(editMusikerData.gage_netto) || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">MwSt. ({editMusikerData.mwst_satz}%):</span>
              <span className="font-medium">{((parseFloat(editMusikerData.gage_netto) || 0) * (parseFloat(editMusikerData.mwst_satz) || 0) / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span>Gage (brutto):</span>
              <span>{((parseFloat(editMusikerData.gage_netto) || 0) * (1 + (parseFloat(editMusikerData.mwst_satz) || 0) / 100)).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Entfernung (km)</Label>
              <Input type="number" value={editMusikerData.distanz_km} onChange={(e) => setEditMusikerData({ ...editMusikerData, distanz_km: e.target.value })} placeholder="z.B. 50" />
            </div>
            <div>
              <Label>€/km</Label>
              <Input type="number" step="0.01" value={editMusikerData.fahrtkosten_pro_km} onChange={(e) => setEditMusikerData({ ...editMusikerData, fahrtkosten_pro_km: e.target.value })} placeholder="0.30" />
            </div>
            <div>
              <Label>Fahrtkosten</Label>
              <div className="h-10 px-3 py-2 bg-gray-100 border rounded-md flex items-center text-sm font-medium">
                {((parseFloat(editMusikerData.distanz_km) || 0) * 2 * (parseFloat(editMusikerData.fahrtkosten_pro_km) || 0.30)).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Weitere Kosten</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditMusikerData({ ...editMusikerData, weitere_kosten: [...(editMusikerData.weitere_kosten || []), { beschreibung: "", betrag: 0 }] })}>
                <Plus className="w-4 h-4 mr-1" /> Kosten hinzufügen
              </Button>
            </div>
            {editMusikerData.weitere_kosten?.length > 0 && (
              <div className="space-y-2">
                {editMusikerData.weitere_kosten.map((kosten, index) => (
                  <div key={index} className="flex gap-2">
                    <Input placeholder="Beschreibung" value={kosten.beschreibung} onChange={(e) => { const u = [...editMusikerData.weitere_kosten]; u[index].beschreibung = e.target.value; setEditMusikerData({ ...editMusikerData, weitere_kosten: u }); }} className="flex-1" />
                    <Input type="number" step="0.01" placeholder="Betrag" value={kosten.betrag} onChange={(e) => { const u = [...editMusikerData.weitere_kosten]; u[index].betrag = parseFloat(e.target.value) || 0; setEditMusikerData({ ...editMusikerData, weitere_kosten: u }); }} className="w-28" />
                    <Button type="button" size="icon" variant="ghost" onClick={() => { const u = editMusikerData.weitere_kosten.filter((_, i) => i !== index); setEditMusikerData({ ...editMusikerData, weitere_kosten: u }); }} className="text-red-600"><X className="w-4 h-4" /></Button>
                  </div>
                ))}
                <div className="text-sm text-gray-600 pt-2 border-t">Summe: {(editMusikerData.weitere_kosten.reduce((s, k) => s + (k.betrag || 0), 0)).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
              </div>
            )}
          </div>
          <div>
            <Label>Notizen</Label>
            <Textarea value={editMusikerData.notizen} onChange={(e) => setEditMusikerData({ ...editMusikerData, notizen: e.target.value })} placeholder="Zusätzliche Informationen..." rows={2} />
          </div>
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-sm">Buchungsbedingungen</span>
              <ChevronDown className="w-4 h-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="border border-gray-200 rounded-lg">
                <ReactQuill theme="snow" value={editMusikerData.buchungsbedingungen} onChange={(v) => setEditMusikerData({ ...editMusikerData, buchungsbedingungen: v })} modules={modules} formats={formats} placeholder="Buchungsbedingungen..." className="min-h-[150px]" />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={onSave} disabled={isSaving} className="text-white" style={{ backgroundColor: "#223a5e" }}>
            {isSaving ? "Wird gespeichert..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EinladungDialog({ open, onOpenChange, einladungMusiker, einladungText, setEinladungText, event, onSend, isSending }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Einladung an {einladungMusiker?.name}</DialogTitle>
          <DialogDescription>Sende eine Event-Einladung an {einladungMusiker?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg text-sm space-y-2">
            <p><strong>Event:</strong> {event?.titel}</p>
            <p><strong>Datum:</strong> {event?.datum_von && format(new Date(event.datum_von), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr</p>
            <p><strong>Ort:</strong> {event?.ort_name || event?.ort_adresse || "Nicht angegeben"}</p>
          </div>
          <div>
            <Label>Persönliche Nachricht (optional)</Label>
            <Textarea value={einladungText} onChange={(e) => setEinladungText(e.target.value)} placeholder="z.B. Freue mich auf dich!..." rows={4} />
            <p className="text-xs text-gray-500 mt-1">Diese Nachricht wird in der E-Mail angezeigt</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={onSend} disabled={isSending} className="text-white" style={{ backgroundColor: "#223a5e" }}>
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "Wird gesendet..." : "Einladung senden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KontaktDialog({ open, onOpenChange, kunde, emailSubject, setEmailSubject, emailBody, setEmailBody, onSend, isSending }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kunde kontaktieren</DialogTitle>
          <DialogDescription>E-Mail an {kunde?.firmenname} ({kunde?.email}) senden</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Betreff</Label>
            <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Betreff der E-Mail" />
          </div>
          <div>
            <Label>Nachricht</Label>
            <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Ihre Nachricht..." rows={10} className="font-mono text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={onSend} disabled={isSending || !emailSubject || !emailBody} className="text-white" style={{ backgroundColor: "#223a5e" }}>
            {isSending ? "Wird gesendet..." : "E-Mail senden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}