import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

export default function AusgabeForm({ ausgabe, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(ausgabe || {
    titel: "",
    kategorie: "sonstiges",
    betrag: 0,
    datum: new Date().toISOString().split('T')[0],
    zahlungsmethode: "überweisung",
    steuerlich_absetzbar: true,
    status: "bezahlt",
    notizen: ""
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <CardTitle>{ausgabe ? "Ausgabe bearbeiten" : "Neue Ausgabe erfassen"}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="titel">Titel *</Label>
              <Input
                id="titel"
                value={formData.titel}
                onChange={(e) => handleChange('titel', e.target.value)}
                placeholder="z.B. Reisekosten Event XY"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kategorie">Kategorie *</Label>
              <select
                id="kategorie"
                value={formData.kategorie}
                onChange={(e) => handleChange('kategorie', e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                required
              >
                <option value="gage">Gage</option>
                <option value="reisekosten">Reisekosten</option>
                <option value="unterkunft">Unterkunft</option>
                <option value="equipment">Equipment</option>
                <option value="marketing">Marketing</option>
                <option value="verwaltung">Verwaltung</option>
                <option value="steuern">Steuern</option>
                <option value="versicherung">Versicherung</option>
                <option value="studio">Studio</option>
                <option value="software">Software</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="betrag">Betrag (€) *</Label>
              <Input
                id="betrag"
                type="number"
                step="0.01"
                value={formData.betrag}
                onChange={(e) => handleChange('betrag', parseFloat(e.target.value))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="datum">Datum *</Label>
              <Input
                id="datum"
                type="date"
                value={formData.datum}
                onChange={(e) => handleChange('datum', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zahlungsmethode">Zahlungsmethode *</Label>
              <select
                id="zahlungsmethode"
                value={formData.zahlungsmethode}
                onChange={(e) => handleChange('zahlungsmethode', e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                required
              >
                <option value="überweisung">Überweisung</option>
                <option value="kreditkarte">Kreditkarte</option>
                <option value="paypal">PayPal</option>
                <option value="bar">Bar</option>
                <option value="lastschrift">Lastschrift</option>
                <option value="andere">Andere</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                required
              >
                <option value="ausstehend">Ausstehend</option>
                <option value="bezahlt">Bezahlt</option>
                <option value="erstattet">Erstattet</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea
              id="notizen"
              value={formData.notizen}
              onChange={(e) => handleChange('notizen', e.target.value)}
              rows={3}
              placeholder="Zusätzliche Notizen zur Ausgabe..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="steuerlich_absetzbar"
              checked={formData.steuerlich_absetzbar}
              onChange={(e) => handleChange('steuerlich_absetzbar', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="steuerlich_absetzbar" className="cursor-pointer">
              Steuerlich absetzbar
            </Label>
          </div>

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
              {ausgabe ? "Ausgabe aktualisieren" : "Ausgabe speichern"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}