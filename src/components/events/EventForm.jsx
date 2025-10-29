import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Save } from "lucide-react";

export default function EventForm({ onSubmit, onCancel, kunden, event = null }) {
  const [formData, setFormData] = useState(event || {
    titel: "",
    kunde_id: "",
    status: "entwurf",
    datum_von: "",
    datum_bis: "",
    ort_name: "",
    ort_adresse: "",
    interne_notizen: "",
    oeffentliche_notizen: ""
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
          <CardTitle>{event ? "Event bearbeiten" : "Neues Event"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="titel">Event-Titel *</Label>
              <Input
                id="titel"
                value={formData.titel}
                onChange={(e) => handleChange('titel', e.target.value)}
                placeholder="z.B. Hochzeit Müller"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kunde">Kunde</Label>
              <Select value={formData.kunde_id} onValueChange={(value) => handleChange('kunde_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Kunde auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Kein Kunde</SelectItem>
                  {kunden.map((kunde) => (
                    <SelectItem key={kunde.id} value={kunde.id}>
                      {kunde.firmenname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datum_von">Start-Datum & Zeit *</Label>
              <Input
                id="datum_von"
                type="datetime-local"
                value={formData.datum_von}
                onChange={(e) => handleChange('datum_von', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="datum_bis">End-Datum & Zeit *</Label>
              <Input
                id="datum_bis"
                type="datetime-local"
                value={formData.datum_bis}
                onChange={(e) => handleChange('datum_bis', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entwurf">Entwurf</SelectItem>
                  <SelectItem value="angefragt">Angefragt</SelectItem>
                  <SelectItem value="bestätigt">Bestätigt</SelectItem>
                  <SelectItem value="durchgeführt">Durchgeführt</SelectItem>
                  <SelectItem value="abgerechnet">Abgerechnet</SelectItem>
                  <SelectItem value="storniert">Storniert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ort_name">Veranstaltungsort</Label>
              <Input
                id="ort_name"
                value={formData.ort_name}
                onChange={(e) => handleChange('ort_name', e.target.value)}
                placeholder="z.B. Hotel Adler"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ort_adresse">Adresse</Label>
            <Input
              id="ort_adresse"
              value={formData.ort_adresse}
              onChange={(e) => handleChange('ort_adresse', e.target.value)}
              placeholder="Straße, PLZ Ort"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interne_notizen">Interne Notizen</Label>
            <Textarea
              id="interne_notizen"
              value={formData.interne_notizen}
              onChange={(e) => handleChange('interne_notizen', e.target.value)}
              placeholder="Notizen, die nur für das Team sichtbar sind..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="oeffentliche_notizen">Öffentliche Notizen</Label>
            <Textarea
              id="oeffentliche_notizen"
              value={formData.oeffentliche_notizen}
              onChange={(e) => handleChange('oeffentliche_notizen', e.target.value)}
              placeholder="Notizen, die der Kunde sehen kann..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
              <Save className="w-4 h-4 mr-2" />
              Speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}