import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Upload } from "lucide-react";

export default function AusgabeForm({ onSubmit, onCancel, ausgabe = null }) {
  const [formData, setFormData] = useState(ausgabe || {
    titel: "",
    kategorie: "sonstiges",
    betrag: "",
    datum: new Date().toISOString().split('T')[0],
    zahlungsmethode: "überweisung",
    beleg_url: "",
    steuerlich_absetzbar: true,
    notizen: "",
    status: "bezahlt"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>{ausgabe ? "Ausgabe bearbeiten" : "Neue Ausgabe"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="titel">Titel/Beschreibung *</Label>
              <Input
                id="titel"
                value={formData.titel}
                onChange={(e) => handleChange('titel', e.target.value)}
                placeholder="z.B. Hotelübernachtung München"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kategorie">Kategorie *</Label>
              <Select value={formData.kategorie} onValueChange={(value) => handleChange('kategorie', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gage">Gage</SelectItem>
                  <SelectItem value="reisekosten">Reisekosten</SelectItem>
                  <SelectItem value="unterkunft">Unterkunft</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="verwaltung">Verwaltung</SelectItem>
                  <SelectItem value="steuern">Steuern</SelectItem>
                  <SelectItem value="versicherung">Versicherung</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="betrag">Betrag (€) *</Label>
              <Input
                id="betrag"
                type="number"
                value={formData.betrag}
                onChange={(e) => handleChange('betrag', parseFloat(e.target.value))}
                placeholder="0.00"
                step="0.01"
                min="0"
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
              <Label htmlFor="zahlungsmethode">Zahlungsmethode</Label>
              <Select value={formData.zahlungsmethode} onValueChange={(value) => handleChange('zahlungsmethode', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="überweisung">Überweisung</SelectItem>
                  <SelectItem value="kreditkarte">Kreditkarte</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="lastschrift">Lastschrift</SelectItem>
                  <SelectItem value="andere">Andere</SelectItem>
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
                  <SelectItem value="ausstehend">Ausstehend</SelectItem>
                  <SelectItem value="bezahlt">Bezahlt</SelectItem>
                  <SelectItem value="erstattet">Erstattet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Beleg/Quittung</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.beleg_url}
                  onChange={(e) => handleChange('beleg_url', e.target.value)}
                  placeholder="URL zum Beleg"
                  className="flex-1"
                />
                <Button type="button" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Hochladen
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Lade einen Beleg oder eine Quittung hoch (optional)
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="steuerlich_absetzbar"
                  checked={formData.steuerlich_absetzbar}
                  onChange={(e) => handleChange('steuerlich_absetzbar', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="steuerlich_absetzbar" className="cursor-pointer">
                  Steuerlich absetzbar
                </Label>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notizen">Notizen</Label>
              <Textarea
                id="notizen"
                value={formData.notizen}
                onChange={(e) => handleChange('notizen', e.target.value)}
                placeholder="Zusätzliche Informationen..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700">
              <Save className="w-4 h-4 mr-2" />
              Ausgabe speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}