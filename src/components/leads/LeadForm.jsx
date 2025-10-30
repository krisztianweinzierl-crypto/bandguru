import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Plus, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function LeadForm({ lead, onSubmit, onCancel, mitglieder }) {
  const [formData, setFormData] = useState(lead || {
    titel: "",
    firmenname: "",
    kontaktperson: "",
    email: "",
    telefon: "",
    status: "neu",
    erwarteter_umsatz: "",
    event_datum: "",
    event_uhrzeit: "",
    event_ort: "",
    event_typ: "",
    anzahl_gaeste: "",
    quelle: "",
    zugewiesen_an: "",
    beschreibung: "",
    budget: "",
    tags: [],
    prioritaet: "normal",
    naechster_schritt: "",
    naechstes_followup: ""
  });

  const [tagInput, setTagInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Daten bereinigen
    const cleanData = { ...formData };
    
    // Leere Felder entfernen
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === "" || cleanData[key] === null) {
        delete cleanData[key];
      }
    });
    
    // Zahlen konvertieren
    if (cleanData.erwarteter_umsatz) {
      cleanData.erwarteter_umsatz = parseFloat(cleanData.erwarteter_umsatz);
    }
    if (cleanData.anzahl_gaeste) {
      cleanData.anzahl_gaeste = parseInt(cleanData.anzahl_gaeste);
    }
    
    onSubmit(cleanData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      handleChange('tags', [...formData.tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (index) => {
    handleChange('tags', formData.tags.filter((_, i) => i !== index));
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>{lead ? "Lead bearbeiten" : "Neuer Lead"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grundinformationen */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Grundinformationen</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titel">Lead-Titel *</Label>
                <Input
                  id="titel"
                  value={formData.titel}
                  onChange={(e) => handleChange('titel', e.target.value)}
                  placeholder="z.B. Geburtstagsparty Maier"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firmenname">Firmenname</Label>
                <Input
                  id="firmenname"
                  value={formData.firmenname}
                  onChange={(e) => handleChange('firmenname', e.target.value)}
                  placeholder="z.B. Innenarchitektur Meier"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kontaktperson">Kontaktperson</Label>
                <Input
                  id="kontaktperson"
                  value={formData.kontaktperson}
                  onChange={(e) => handleChange('kontaktperson', e.target.value)}
                  placeholder="z.B. Daniela Maier"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="kontakt@beispiel.de"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  value={formData.telefon}
                  onChange={(e) => handleChange('telefon', e.target.value)}
                  placeholder="+49 151 122 88 982"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neu">Neu</SelectItem>
                    <SelectItem value="kontaktiert">Kontaktiert</SelectItem>
                    <SelectItem value="qualifiziert">Qualifiziert</SelectItem>
                    <SelectItem value="angebot">Angebot</SelectItem>
                    <SelectItem value="verhandlung">Verhandlung</SelectItem>
                    <SelectItem value="gewonnen">Gewonnen</SelectItem>
                    <SelectItem value="verloren">Verloren</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Event-Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Event-Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_datum">Event-Datum</Label>
                <Input
                  id="event_datum"
                  type="date"
                  value={formData.event_datum}
                  onChange={(e) => handleChange('event_datum', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_uhrzeit">Event-Uhrzeit</Label>
                <Input
                  id="event_uhrzeit"
                  type="time"
                  value={formData.event_uhrzeit}
                  onChange={(e) => handleChange('event_uhrzeit', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_ort">Veranstaltungsort</Label>
                <Input
                  id="event_ort"
                  value={formData.event_ort}
                  onChange={(e) => handleChange('event_ort', e.target.value)}
                  placeholder="z.B. Trafohaus Birkl, Ingolstadt"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_typ">Event-Typ</Label>
                <Select value={formData.event_typ} onValueChange={(value) => handleChange('event_typ', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Typ auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Private Party">Private Party</SelectItem>
                    <SelectItem value="Hochzeit">Hochzeit</SelectItem>
                    <SelectItem value="Firmenveranstaltung">Firmenveranstaltung</SelectItem>
                    <SelectItem value="Geburtstag">Geburtstag</SelectItem>
                    <SelectItem value="Konzert">Konzert</SelectItem>
                    <SelectItem value="Festival">Festival</SelectItem>
                    <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="anzahl_gaeste">Anzahl Gäste</Label>
                <Input
                  id="anzahl_gaeste"
                  type="number"
                  value={formData.anzahl_gaeste}
                  onChange={(e) => handleChange('anzahl_gaeste', e.target.value)}
                  placeholder="z.B. 150"
                />
              </div>
            </div>
          </div>

          {/* Finanzen & Verwaltung */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Finanzen & Verwaltung</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="erwarteter_umsatz">Erwarteter Umsatz (€)</Label>
                <Input
                  id="erwarteter_umsatz"
                  type="number"
                  step="0.01"
                  value={formData.erwarteter_umsatz}
                  onChange={(e) => handleChange('erwarteter_umsatz', e.target.value)}
                  placeholder="z.B. 4500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget-Vorstellung</Label>
                <Input
                  id="budget"
                  value={formData.budget}
                  onChange={(e) => handleChange('budget', e.target.value)}
                  placeholder="z.B. 3000-5000€"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quelle">Lead-Quelle</Label>
                <Select value={formData.quelle} onValueChange={(value) => handleChange('quelle', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Quelle auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Webseite DeineBand">Webseite DeineBand</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Empfehlung">Empfehlung</SelectItem>
                    <SelectItem value="Event">Event/Messe</SelectItem>
                    <SelectItem value="Telefon">Telefon</SelectItem>
                    <SelectItem value="E-Mail">E-Mail</SelectItem>
                    <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prioritaet">Priorität</Label>
                <Select value={formData.prioritaet} onValueChange={(value) => handleChange('prioritaet', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="niedrig">Niedrig</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="hoch">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="zugewiesen_an">Zugewiesen an</Label>
                <Select value={formData.zugewiesen_an} onValueChange={(value) => handleChange('zugewiesen_an', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Niemand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nicht zugewiesen</SelectItem>
                    {mitglieder.map((mitglied) => (
                      <SelectItem key={mitglied.user_id} value={mitglied.user_id}>
                        {mitglied.rolle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Beschreibung & Notizen */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Beschreibung & Notizen</h3>
            
            <div className="space-y-2">
              <Label htmlFor="beschreibung">Beschreibung/Anfrage</Label>
              <Textarea
                id="beschreibung"
                value={formData.beschreibung}
                onChange={(e) => handleChange('beschreibung', e.target.value)}
                placeholder="Detaillierte Beschreibung der Anfrage..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="naechster_schritt">Nächster Schritt</Label>
              <Input
                id="naechster_schritt"
                value={formData.naechster_schritt}
                onChange={(e) => handleChange('naechster_schritt', e.target.value)}
                placeholder="z.B. Angebot erstellen"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="naechstes_followup">Nächstes Follow-up</Label>
              <Input
                id="naechstes_followup"
                type="date"
                value={formData.naechstes_followup}
                onChange={(e) => handleChange('naechstes_followup', e.target.value)}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Tags</h3>
            
            <div className="space-y-2">
              <Label>Tags hinzufügen</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="z.B. VIP, Stammkunde"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button 
                  type="button" 
                  onClick={addTag}
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-sm">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(i)}
                        className="ml-2 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
              <Save className="w-4 h-4 mr-2" />
              {lead ? 'Änderungen speichern' : 'Lead erstellen'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}