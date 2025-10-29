import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Plus, Trash2 } from "lucide-react";

export default function RechnungForm({ onSubmit, onCancel, kunden, rechnung = null }) {
  const [formData, setFormData] = useState(rechnung || {
    kunde_id: "",
    event_id: "",
    rechnungsdatum: new Date().toISOString().split('T')[0],
    faelligkeitsdatum: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "entwurf",
    positionen: [
      { beschreibung: "", menge: 1, einheit: "Stück", einzelpreis: 0, steuersatz: 19 }
    ],
    kunde_notizen: "",
    zahlungsbedingungen: "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
    notizen: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Beträge berechnen
    let netto_betrag = 0;
    let steuer_betrag = 0;
    
    formData.positionen.forEach(pos => {
      const posNetto = (pos.menge || 0) * (pos.einzelpreis || 0);
      const posSteuer = posNetto * ((pos.steuersatz || 0) / 100);
      netto_betrag += posNetto;
      steuer_betrag += posSteuer;
    });

    const brutto_betrag = netto_betrag + steuer_betrag;

    const dataToSubmit = {
      ...formData,
      netto_betrag,
      steuer_betrag,
      brutto_betrag,
      bezahlt_betrag: 0
    };

    onSubmit(dataToSubmit);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePositionChange = (index, field, value) => {
    const newPositionen = [...formData.positionen];
    newPositionen[index] = { ...newPositionen[index], [field]: value };
    setFormData(prev => ({ ...prev, positionen: newPositionen }));
  };

  const addPosition = () => {
    setFormData(prev => ({
      ...prev,
      positionen: [...prev.positionen, { beschreibung: "", menge: 1, einheit: "Stück", einzelpreis: 0, steuersatz: 19 }]
    }));
  };

  const removePosition = (index) => {
    if (formData.positionen.length > 1) {
      setFormData(prev => ({
        ...prev,
        positionen: prev.positionen.filter((_, i) => i !== index)
      }));
    }
  };

  // Beträge berechnen für Vorschau
  let nettoBetrag = 0;
  let steuerBetrag = 0;
  formData.positionen.forEach(pos => {
    const posNetto = (pos.menge || 0) * (pos.einzelpreis || 0);
    const posSteuer = posNetto * ((pos.steuersatz || 0) / 100);
    nettoBetrag += posNetto;
    steuerBetrag += posSteuer;
  });
  const bruttoBetrag = nettoBetrag + steuerBetrag;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>{rechnung ? "Rechnung bearbeiten" : "Neue Rechnung"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Kunde & Datum */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="kunde">Kunde *</Label>
              <Select value={formData.kunde_id} onValueChange={(value) => handleChange('kunde_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Kunde wählen" />
                </SelectTrigger>
                <SelectContent>
                  {kunden.map((kunde) => (
                    <SelectItem key={kunde.id} value={kunde.id}>
                      {kunde.firmenname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entwurf">Entwurf</SelectItem>
                  <SelectItem value="versendet">Versendet</SelectItem>
                  <SelectItem value="teilweise_bezahlt">Teilweise bezahlt</SelectItem>
                  <SelectItem value="bezahlt">Bezahlt</SelectItem>
                  <SelectItem value="überfällig">Überfällig</SelectItem>
                  <SelectItem value="storniert">Storniert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rechnungsdatum">Rechnungsdatum *</Label>
              <Input
                id="rechnungsdatum"
                type="date"
                value={formData.rechnungsdatum}
                onChange={(e) => handleChange('rechnungsdatum', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faelligkeitsdatum">Fälligkeitsdatum *</Label>
              <Input
                id="faelligkeitsdatum"
                type="date"
                value={formData.faelligkeitsdatum}
                onChange={(e) => handleChange('faelligkeitsdatum', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Rechnungspositionen */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">Rechnungspositionen</Label>
              <Button type="button" onClick={addPosition} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Position hinzufügen
              </Button>
            </div>

            <div className="space-y-3">
              {formData.positionen.map((position, index) => (
                <Card key={index} className="p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4 space-y-2">
                      <Label className="text-xs">Beschreibung</Label>
                      <Input
                        value={position.beschreibung}
                        onChange={(e) => handlePositionChange(index, 'beschreibung', e.target.value)}
                        placeholder="z.B. Live-Performance"
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-xs">Menge</Label>
                      <Input
                        type="number"
                        value={position.menge}
                        onChange={(e) => handlePositionChange(index, 'menge', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-xs">Einheit</Label>
                      <Input
                        value={position.einheit}
                        onChange={(e) => handlePositionChange(index, 'einheit', e.target.value)}
                        placeholder="Stück"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-xs">Einzelpreis (€)</Label>
                      <Input
                        type="number"
                        value={position.einzelpreis}
                        onChange={(e) => handlePositionChange(index, 'einzelpreis', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div className="md:col-span-1 space-y-2">
                      <Label className="text-xs">MwSt %</Label>
                      <Input
                        type="number"
                        value={position.steuersatz}
                        onChange={(e) => handlePositionChange(index, 'steuersatz', parseFloat(e.target.value))}
                        min="0"
                        max="100"
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePosition(index)}
                        disabled={formData.positionen.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    Gesamt: {((position.menge || 0) * (position.einzelpreis || 0) * (1 + (position.steuersatz || 0) / 100)).toFixed(2)} €
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Summen Vorschau */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Nettobetrag:</span>
                  <span className="font-medium">{nettoBetrag.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>MwSt:</span>
                  <span className="font-medium">{steuerBetrag.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-blue-300 pt-2">
                  <span>Gesamtbetrag:</span>
                  <span>{bruttoBetrag.toFixed(2)} €</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notizen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="kunde_notizen">Notizen für Kunde (auf Rechnung sichtbar)</Label>
              <Textarea
                id="kunde_notizen"
                value={formData.kunde_notizen}
                onChange={(e) => handleChange('kunde_notizen', e.target.value)}
                placeholder="z.B. Vielen Dank für Ihren Auftrag!"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notizen">Interne Notizen</Label>
              <Textarea
                id="notizen"
                value={formData.notizen}
                onChange={(e) => handleChange('notizen', e.target.value)}
                placeholder="Interne Notizen..."
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zahlungsbedingungen">Zahlungsbedingungen</Label>
            <Textarea
              id="zahlungsbedingungen"
              value={formData.zahlungsbedingungen}
              onChange={(e) => handleChange('zahlungsbedingungen', e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
              <Save className="w-4 h-4 mr-2" />
              Rechnung speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}