import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, List } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function RechnungForm({ rechnung, onSubmit, onCancel, kunden }) {
  const [currentOrgId, setCurrentOrgId] = useState(null);

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: artikel = [] } = useQuery({
    queryKey: ['artikel', currentOrgId],
    queryFn: () => base44.entities.Artikel.filter({ org_id: currentOrgId, aktiv: true }),
    enabled: !!currentOrgId
  });
  const [formData, setFormData] = useState(rechnung || {
    kunde_id: "",
    rechnungsdatum: new Date().toISOString().split('T')[0],
    faelligkeitsdatum: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    positionen: [{ beschreibung: "", menge: 1, einheit: "Stk", einzelpreis: 0, steuersatz: 19 }],
    zahlungsbedingungen: "Bitte überweisen Sie den Betrag innerhalb von 14 Tagen.",
    kunde_notizen: ""
  });

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
      positionen: [...prev.positionen, { beschreibung: "", menge: 1, einheit: "Stk", einzelpreis: 0, steuersatz: 19 }]
    }));
  };

  const addArtikelPosition = (artikel) => {
    setFormData(prev => ({
      ...prev,
      positionen: [...prev.positionen, { 
        beschreibung: artikel.beschreibung || artikel.bezeichnung, 
        menge: 1, 
        einheit: artikel.einheit, 
        einzelpreis: artikel.einzelpreis, 
        steuersatz: artikel.steuersatz 
      }]
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

  const calculateTotals = () => {
    let netto = 0;
    let steuer = 0;

    formData.positionen.forEach(pos => {
      const posNetto = (pos.menge || 0) * (pos.einzelpreis || 0);
      const posSteuer = posNetto * ((pos.steuersatz || 0) / 100);
      netto += posNetto;
      steuer += posSteuer;
    });

    return {
      netto_betrag: netto,
      steuer_betrag: steuer,
      brutto_betrag: netto + steuer
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const totals = calculateTotals();
    onSubmit({ ...formData, ...totals });
  };

  const totals = calculateTotals();

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <CardTitle>{rechnung ? "Rechnung bearbeiten" : "Neue Rechnung erstellen"}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Kunde & Datum */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kunde">Kunde *</Label>
              <select
                id="kunde"
                value={formData.kunde_id}
                onChange={(e) => handleChange('kunde_id', e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                required
              >
                <option value="">Kunde wählen</option>
                {kunden.map((kunde) => (
                  <option key={kunde.id} value={kunde.id}>
                    {kunde.firmenname}
                  </option>
                ))}
              </select>
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

          {/* Positionen */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <Label className="text-base font-semibold">Rechnungspositionen</Label>
              <div className="flex gap-2">
                {artikel.length > 0 && (
                  <div className="relative group">
                    <Button type="button" variant="outline" size="sm">
                      <List className="w-4 h-4 mr-2" />
                      Aus Artikeln
                    </Button>
                    <div className="hidden group-hover:block absolute top-full right-0 mt-2 w-72 bg-white border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      {artikel.map((art) => (
                        <button
                          key={art.id}
                          type="button"
                          onClick={() => addArtikelPosition(art)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0"
                        >
                          <p className="font-medium text-sm">{art.bezeichnung}</p>
                          <p className="text-xs text-gray-500">
                            {art.einzelpreis.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / {art.einheit}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={addPosition}>
                  <Plus className="w-4 h-4 mr-2" />
                  Neue Position
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {formData.positionen.map((position, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <Label htmlFor={`beschreibung-${index}`} className="text-xs">Beschreibung</Label>
                      <Input
                        id={`beschreibung-${index}`}
                        value={position.beschreibung}
                        onChange={(e) => handlePositionChange(index, 'beschreibung', e.target.value)}
                        placeholder="z.B. Live-Performance"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor={`menge-${index}`} className="text-xs">Menge</Label>
                      <Input
                        id={`menge-${index}`}
                        type="number"
                        value={position.menge}
                        onChange={(e) => handlePositionChange(index, 'menge', parseFloat(e.target.value))}
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Label htmlFor={`einheit-${index}`} className="text-xs">Einheit</Label>
                      <Input
                        id={`einheit-${index}`}
                        value={position.einheit}
                        onChange={(e) => handlePositionChange(index, 'einheit', e.target.value)}
                        placeholder="Stk"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor={`einzelpreis-${index}`} className="text-xs">Einzelpreis (€)</Label>
                      <Input
                        id={`einzelpreis-${index}`}
                        type="number"
                        value={position.einzelpreis}
                        onChange={(e) => handlePositionChange(index, 'einzelpreis', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Label htmlFor={`steuersatz-${index}`} className="text-xs">MwSt. (%)</Label>
                      <Input
                        id={`steuersatz-${index}`}
                        type="number"
                        value={position.steuersatz}
                        onChange={(e) => handlePositionChange(index, 'steuersatz', parseFloat(e.target.value))}
                        min="0"
                        max="100"
                        required
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePosition(index)}
                        disabled={formData.positionen.length === 1}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-right text-sm text-gray-600">
                    Summe: {((position.menge || 0) * (position.einzelpreis || 0)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summen */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Netto:</span>
              <span className="font-medium">{totals.netto_betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">MwSt.:</span>
              <span className="font-medium">{totals.steuer_betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Gesamt (Brutto):</span>
              <span>{totals.brutto_betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            </div>
          </div>

          {/* Notizen & Zahlungsbedingungen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zahlungsbedingungen">Zahlungsbedingungen</Label>
              <Textarea
                id="zahlungsbedingungen"
                value={formData.zahlungsbedingungen}
                onChange={(e) => handleChange('zahlungsbedingungen', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kunde_notizen">Notizen für Kunden</Label>
              <Textarea
                id="kunde_notizen"
                value={formData.kunde_notizen}
                onChange={(e) => handleChange('kunde_notizen', e.target.value)}
                rows={3}
                placeholder="Diese Notizen erscheinen auf der Rechnung"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button 
              type="submit"
              style={{ backgroundColor: '#223a5e' }}
              className="hover:opacity-90"
            >
              <Save className="w-4 h-4 mr-2" />
              {rechnung ? "Rechnung aktualisieren" : "Rechnung speichern"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}