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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EventForm({ onSubmit, onCancel, kunden, event = null }) {
  const [formData, setFormData] = useState(event || {
    titel: "",
    kunde_id: "",
    status: "entwurf",
    datum_von: "",
    datum_bis: "",
    ort_name: "",
    ort_adresse: "",
    get_in_zeit: "",
    soundcheck_zeit: "",
    event_typ: "",
    anzahl_gaeste: "",
    dresscode: "",
    hotel_name: "",
    hotel_adresse: "",
    technik_hinweise: "",
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
          <Tabs defaultValue="grunddaten" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="grunddaten">Grunddaten</TabsTrigger>
              <TabsTrigger value="zeitplan">Zeitplan</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="notizen">Notizen</TabsTrigger>
            </TabsList>

            <TabsContent value="grunddaten" className="space-y-6 mt-6">
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
                  <Label htmlFor="event_typ">Event-Typ</Label>
                  <Select value={formData.event_typ} onValueChange={(value) => handleChange('event_typ', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Typ auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hochzeit">Hochzeit</SelectItem>
                      <SelectItem value="Corporate Event">Corporate Event</SelectItem>
                      <SelectItem value="Geburtstag">Geburtstag</SelectItem>
                      <SelectItem value="Konzert">Konzert</SelectItem>
                      <SelectItem value="Festival">Festival</SelectItem>
                      <SelectItem value="Private Feier">Private Feier</SelectItem>
                      <SelectItem value="Sonstiges">Sonstiges</SelectItem>
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

                <div className="space-y-2">
                  <Label htmlFor="ort_adresse">Ort-Adresse</Label>
                  <Input
                    id="ort_adresse"
                    value={formData.ort_adresse}
                    onChange={(e) => handleChange('ort_adresse', e.target.value)}
                    placeholder="Straße, PLZ Ort"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="zeitplan" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <Label htmlFor="get_in_zeit">Get-In Zeit</Label>
                  <Input
                    id="get_in_zeit"
                    type="time"
                    value={formData.get_in_zeit}
                    onChange={(e) => handleChange('get_in_zeit', e.target.value)}
                    placeholder="HH:mm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="soundcheck_zeit">Soundcheck Zeit</Label>
                  <Input
                    id="soundcheck_zeit"
                    type="time"
                    value={formData.soundcheck_zeit}
                    onChange={(e) => handleChange('soundcheck_zeit', e.target.value)}
                    placeholder="HH:mm"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-4">Publikum & Ambiente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="anzahl_gaeste">Anzahl der Gäste</Label>
                      <Input
                        id="anzahl_gaeste"
                        type="number"
                        value={formData.anzahl_gaeste}
                        onChange={(e) => handleChange('anzahl_gaeste', parseInt(e.target.value))}
                        placeholder="z.B. 150"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dresscode">Dresscode</Label>
                      <Input
                        id="dresscode"
                        value={formData.dresscode}
                        onChange={(e) => handleChange('dresscode', e.target.value)}
                        placeholder="z.B. Elegant chic, Business"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-4">Hotel-Informationen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="hotel_name">Hotel-Name</Label>
                      <Input
                        id="hotel_name"
                        value={formData.hotel_name}
                        onChange={(e) => handleChange('hotel_name', e.target.value)}
                        placeholder="z.B. Steigenberger Hotel"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hotel_adresse">Hotel-Adresse</Label>
                      <Input
                        id="hotel_adresse"
                        value={formData.hotel_adresse}
                        onChange={(e) => handleChange('hotel_adresse', e.target.value)}
                        placeholder="Straße, PLZ Ort"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-4">Technische Informationen</h3>
                  <div className="space-y-2">
                    <Label htmlFor="technik_hinweise">Technik</Label>
                    <Textarea
                      id="technik_hinweise"
                      value={formData.technik_hinweise}
                      onChange={(e) => handleChange('technik_hinweise', e.target.value)}
                      placeholder="z.B. PA wird vom Veranstalter gestellt, Backline vorhanden..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notizen" className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="interne_notizen">Interne Notizen</Label>
                <Textarea
                  id="interne_notizen"
                  value={formData.interne_notizen}
                  onChange={(e) => handleChange('interne_notizen', e.target.value)}
                  placeholder="Notizen, die nur für das Team sichtbar sind..."
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="oeffentliche_notizen">Öffentliche Notizen</Label>
                <Textarea
                  id="oeffentliche_notizen"
                  value={formData.oeffentliche_notizen}
                  onChange={(e) => handleChange('oeffentliche_notizen', e.target.value)}
                  placeholder="Notizen, die der Kunde sehen kann..."
                  rows={5}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
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