import React, { useState } from "react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";

export default function VertragsForm({ vertrag = null, onSubmit, onCancel, kunden = [], events = [], vorlagen = [] }) {
  const [formData, setFormData] = useState(vertrag || {
    titel: "",
    kunde_id: "",
    event_id: "",
    status: "entwurf",
    inhalt: "",
    unterzeichnen_bis: "",
    eventinformationen_anzeigen: true,
    im_kundenportal_sichtbar: true,
    notizen: ""
  });

  const [alsVorlageSpeichern, setAlsVorlageSpeichern] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVorlageSelect = (vorlageId) => {
    if (!vorlageId) return;
    const vorlage = vorlagen.find(v => v.id === vorlageId);
    if (vorlage) {
      handleChange('inhalt', vorlage.inhalt);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'link'
  ];

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>{vertrag ? "Vertrag bearbeiten" : "Neuen Vertrag erstellen"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Als Vorlage speichern */}
          {!vertrag && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="als-vorlage"
                checked={alsVorlageSpeichern}
                onCheckedChange={setAlsVorlageSpeichern}
              />
              <label
                htmlFor="als-vorlage"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Als Vorlage speichern
              </label>
            </div>
          )}

          {/* Vorlage auswählen */}
          {vorlagen.length > 0 && !vertrag && (
            <div className="space-y-2">
              <Label>Vorlage verwenden (optional)</Label>
              <Select onValueChange={handleVorlageSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Vorlage auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {vorlagen.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Vertragstitel */}
          <div className="space-y-2">
            <Label htmlFor="titel">Vertragstitel *</Label>
            <Input
              id="titel"
              value={formData.titel}
              onChange={(e) => handleChange('titel', e.target.value)}
              placeholder="z.B. Event-Vertrag Hochzeit Müller"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kunde */}
            <div className="space-y-2">
              <Label htmlFor="kunde">Kunde *</Label>
              <Select
                value={formData.kunde_id}
                onValueChange={(value) => handleChange('kunde_id', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kunde auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {kunden.map(k => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.firmenname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event */}
            <div className="space-y-2">
              <Label htmlFor="event">Event (optional)</Label>
              <Select
                value={formData.event_id || ""}
                onValueChange={(value) => handleChange('event_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Event auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Kein Event</SelectItem>
                  {events.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.titel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unterzeichnen bis */}
            <div className="space-y-2">
              <Label htmlFor="unterzeichnen_bis">Unterzeichnen bis</Label>
              <Input
                id="unterzeichnen_bis"
                type="date"
                value={formData.unterzeichnen_bis}
                onChange={(e) => handleChange('unterzeichnen_bis', e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entwurf">Entwurf</SelectItem>
                  <SelectItem value="versendet">Versendet</SelectItem>
                  <SelectItem value="unterzeichnet">Unterzeichnet</SelectItem>
                  <SelectItem value="storniert">Storniert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vertragsbedingungen (Rich Text Editor) */}
          <div className="space-y-2">
            <Label>Vertragsbedingungen *</Label>
            <div className="border border-gray-200 rounded-lg">
              <ReactQuill
                theme="snow"
                value={formData.inhalt}
                onChange={(value) => handleChange('inhalt', value)}
                modules={modules}
                formats={formats}
                placeholder="Vertragsbedingungen eingeben..."
                className="min-h-[300px]"
              />
            </div>
          </div>

          {/* Anzeigeoptionen */}
          <div className="space-y-4">
            <h3 className="font-semibold">Anzeigeoptionen</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="event-info"
                checked={formData.eventinformationen_anzeigen}
                onCheckedChange={(checked) => handleChange('eventinformationen_anzeigen', checked)}
              />
              <label
                htmlFor="event-info"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Eventinformationen im Vertrag anzeigen
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="kundenportal"
                checked={formData.im_kundenportal_sichtbar}
                onCheckedChange={(checked) => handleChange('im_kundenportal_sichtbar', checked)}
              />
              <label
                htmlFor="kundenportal"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Im Kundenportal sichtbar
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
              <Save className="w-4 h-4 mr-2" />
              {vertrag ? "Aktualisieren" : "Vertrag erstellen"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}