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
import { X, Save, MapPin, Calendar, Clock, Users, Shirt, Utensils, Hotel, Settings, Plus, Trash2, MessageSquare, File } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function EventForm({ onSubmit, onCancel, onDelete, kunden, event = null }) {
  const [formData, setFormData] = useState(event || {
    titel: "",
    kunde_id: "",
    status: "angefragt",
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
    ablaufplan: "",
    musiker_notizen: "",
    oeffentliche_notizen: ""
  });

  const [showKundeForm, setShowKundeForm] = useState(false);
  const [newKunde, setNewKunde] = useState({
    firmenname: "",
    ansprechpartner: "",
    email: "",
    telefon: "",
    adresse: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Pflichtfelder
    const cleanData = {
      titel: formData.titel,
      datum_von: formData.datum_von,
      datum_bis: formData.datum_bis,
      status: formData.status || "angefragt"
    };
    
    // Optionale Felder (auch leere Strings speichern)
    cleanData.kunde_id = formData.kunde_id || null;
    cleanData.ort_name = formData.ort_name || null;
    cleanData.ort_adresse = formData.ort_adresse || null;
    cleanData.get_in_zeit = formData.get_in_zeit || null;
    cleanData.soundcheck_zeit = formData.soundcheck_zeit || null;
    cleanData.event_typ = formData.event_typ || null;
    cleanData.anzahl_gaeste = formData.anzahl_gaeste || null;
    cleanData.dresscode = formData.dresscode || null;
    cleanData.hotel_name = formData.hotel_name || null;
    cleanData.hotel_adresse = formData.hotel_adresse || null;
    cleanData.technik_hinweise = formData.technik_hinweise || null;
    cleanData.interne_notizen = formData.interne_notizen || null;
    cleanData.ablaufplan = formData.ablaufplan || null;
    cleanData.musiker_notizen = formData.musiker_notizen || null;
    cleanData.oeffentliche_notizen = formData.oeffentliche_notizen || null;
    
    onSubmit(cleanData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateKunde = async () => {
    if (!newKunde.firmenname.trim()) {
      alert('Bitte gib mindestens einen Firmennamen ein');
      return;
    }

    try {
      const orgId = localStorage.getItem('currentOrgId');
      
      const createdKunde = await base44.entities.Kunde.create({
        org_id: orgId,
        firmenname: newKunde.firmenname,
        ansprechpartner: newKunde.ansprechpartner || null,
        email: newKunde.email || null,
        telefon: newKunde.telefon || null,
        adresse: newKunde.adresse || null
      });

      handleChange('kunde_id', createdKunde.id);
      
      setShowKundeForm(false);
      setNewKunde({
        firmenname: "",
        ansprechpartner: "",
        email: "",
        telefon: "",
        adresse: ""
      });

      window.location.reload();
    } catch (error) {
      console.error('Fehler beim Erstellen des Kunden:', error);
      alert('Fehler beim Erstellen des Kunden: ' + error.message);
    }
  };

  const openInGoogleMaps = (address) => {
    if (address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Details */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-white">
          <CardTitle className="text-xl font-bold">Details</CardTitle>
          <p className="text-sm text-gray-500">Grundlegende Informationen zum Event</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6 bg-white">
          {/* Client */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Client
            </Label>
            <div className="flex gap-2">
              <Select value={formData.kunde_id || ""} onValueChange={(value) => handleChange('kunde_id', value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Kunden wählen" />
                </SelectTrigger>
                <SelectContent>
                  {kunden.map((kunde) => (
                    <SelectItem key={kunde.id} value={kunde.id}>
                      {kunde.firmenname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={() => setShowKundeForm(!showKundeForm)}
                title="Neuen Kunden anlegen"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Schnelles Kunden-Formular */}
            {showKundeForm && (
              <Card className="mt-4 border-2 border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">Neuen Kunden anlegen</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowKundeForm(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-firmenname" className="text-sm">Firmenname *</Label>
                    <Input
                      id="new-firmenname"
                      value={newKunde.firmenname}
                      onChange={(e) => setNewKunde({...newKunde, firmenname: e.target.value})}
                      placeholder="z.B. Mustermann GmbH"
                      className="bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="new-ansprechpartner" className="text-sm">Ansprechpartner</Label>
                      <Input
                        id="new-ansprechpartner"
                        value={newKunde.ansprechpartner}
                        onChange={(e) => setNewKunde({...newKunde, ansprechpartner: e.target.value})}
                        placeholder="z.B. Max Mustermann"
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-email" className="text-sm">E-Mail</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newKunde.email}
                        onChange={(e) => setNewKunde({...newKunde, email: e.target.value})}
                        placeholder="z.B. max@mustermann.de"
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-telefon" className="text-sm">Telefon</Label>
                    <Input
                      id="new-telefon"
                      value={newKunde.telefon}
                      onChange={(e) => setNewKunde({...newKunde, telefon: e.target.value})}
                      placeholder="z.B. +49 123 456789"
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-adresse" className="text-sm">Adresse</Label>
                    <Input
                      id="new-adresse"
                      value={newKunde.adresse}
                      onChange={(e) => setNewKunde({...newKunde, adresse: e.target.value})}
                      placeholder="z.B. Musterstraße 123, 12345 Berlin"
                      className="bg-white"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleCreateKunde}
                    className="w-full bg-[#223a5e] hover:opacity-90"
                  >
                    Kunden erstellen und auswählen
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Event-Titel */}
          <div className="space-y-2">
            <Label htmlFor="titel">Event-Titel</Label>
            <Input
              id="titel"
              value={formData.titel}
              onChange={(e) => handleChange('titel', e.target.value)}
              placeholder="z.B. PHD Jahrestagung"
              required
            />
          </div>

          {/* Datum & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="datum">Datum</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="datum"
                  type="date"
                  value={formData.datum_von?.split('T')[0] || ""}
                  onChange={(e) => {
                    const date = e.target.value;
                    handleChange('datum_von', date + 'T20:00:00');
                    handleChange('datum_bis', date + 'T23:59:00');
                  }}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anfrage">Anfrage</SelectItem>
                  <SelectItem value="angebot_erstellt">Angebot erstellt</SelectItem>
                  <SelectItem value="angebot_angenommen">Angebot angenommen</SelectItem>
                  <SelectItem value="wartet_auf_bestaetigung">Wartet auf Bestätigung</SelectItem>
                  <SelectItem value="angefragt">Wartet auf Musiker</SelectItem>
                  <SelectItem value="bestätigt">Bestätigt</SelectItem>
                  <SelectItem value="abgesagt">Abgesagt</SelectItem>
                  <SelectItem value="zurückgezogen">Zurückgezogen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location - Normales Input-Feld */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2" htmlFor="ort_adresse">
              <MapPin className="w-4 h-4" />
              Location / Venue *
            </Label>
            <div className="flex gap-2">
              <Input
                id="ort_adresse"
                value={formData.ort_adresse}
                onChange={(e) => handleChange('ort_adresse', e.target.value)}
                placeholder="z.B. Schwanthalerstraße 13, 80336 München"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                className="gap-2"
                onClick={() => openInGoogleMaps(formData.ort_adresse)}
                disabled={!formData.ort_adresse}
              >
                <MapPin className="w-4 h-4" />
                Maps
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zeitplan & Ablauf */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-white">
          <CardTitle className="text-xl font-bold">Zeitplan & Ablauf</CardTitle>
          <p className="text-sm text-gray-500">Zeitliche Details und Ablauf des Events</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="startzeit">Startzeit</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="startzeit"
                  type="time"
                  value={formData.datum_von?.split('T')[1]?.substring(0, 5) || "20:00"}
                  onChange={(e) => {
                    const date = formData.datum_von?.split('T')[0] || new Date().toISOString().split('T')[0];
                    handleChange('datum_von', date + 'T' + e.target.value + ':00');
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endzeit">Endzeit</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="endzeit"
                  type="time"
                  value={formData.datum_bis?.split('T')[1]?.substring(0, 5) || "00:00"}
                  onChange={(e) => {
                    const date = formData.datum_bis?.split('T')[0] || formData.datum_von?.split('T')[0] || new Date().toISOString().split('T')[0];
                    handleChange('datum_bis', date + 'T' + e.target.value + ':00');
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="getin" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Get-In Zeit
              </Label>
              <Input
                id="getin"
                type="time"
                value={formData.get_in_zeit}
                onChange={(e) => handleChange('get_in_zeit', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="soundcheck" className="flex items-center gap-2">
                <span className="text-yellow-500">🎵</span>
                Soundcheck-Zeit
              </Label>
              <Input
                id="soundcheck"
                type="time"
                value={formData.soundcheck_zeit}
                onChange={(e) => handleChange('soundcheck_zeit', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="abbau" className="flex items-center gap-2">
                <span className="text-purple-500">🎸</span>
                Abbau-Zeit
              </Label>
              <Input
                id="abbau"
                type="time"
                placeholder="--:--"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ablaufplan">Ablaufplan</Label>
            <Textarea
              id="ablaufplan"
              value={formData.ablaufplan}
              onChange={(e) => handleChange('ablaufplan', e.target.value)}
              placeholder="Detaillierter Ablauf des Events..."
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Publikum & Ambiente */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-white">
          <CardTitle className="text-xl font-bold">Publikum & Ambiente</CardTitle>
          <p className="text-sm text-gray-500">Details über die Veranstaltung und das Publikum</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="eventtyp" className="flex items-center gap-2">
                <span className="text-purple-500">🎉</span>
                Event-Typ
              </Label>
              <Select value={formData.event_typ || ""} onValueChange={(value) => handleChange('event_typ', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Firmenveranstaltung">Firmenveranstaltung</SelectItem>
                  <SelectItem value="Hochzeit">Hochzeit</SelectItem>
                  <SelectItem value="Geburtstag">Geburtstag</SelectItem>
                  <SelectItem value="Konzert">Konzert</SelectItem>
                  <SelectItem value="Festival">Festival</SelectItem>
                  <SelectItem value="Private Feier">Private Feier</SelectItem>
                  <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gaeste" className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Anzahl der Gäste
              </Label>
              <Input
                id="gaeste"
                type="number"
                value={formData.anzahl_gaeste}
                onChange={(e) => handleChange('anzahl_gaeste', e.target.value ? parseInt(e.target.value) : "")}
                placeholder="z.B. 300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dresscode" className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-gray-500" />
                Dresscode
              </Label>
              <Input
                id="dresscode"
                value={formData.dresscode}
                onChange={(e) => handleChange('dresscode', e.target.value)}
                placeholder="z.B. Elegant chic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="verpflegung" className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-orange-500" />
                Verpflegung
              </Label>
              <Input
                id="verpflegung"
                placeholder="z.B. Buffet & Getränke inklusive"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hotel-Informationen - Normale Input-Felder */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-white">
          <CardTitle className="text-xl font-bold">Hotel-Informationen</CardTitle>
          <p className="text-sm text-gray-500">Unterkunft für Musiker</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="hotelname" className="flex items-center gap-2">
                <Hotel className="w-4 h-4" />
                Hotel-Name
              </Label>
              <Input
                id="hotelname"
                value={formData.hotel_name}
                onChange={(e) => handleChange('hotel_name', e.target.value)}
                placeholder="z.B. Steigenberger Hotel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hoteladresse" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Hotel-Adresse
              </Label>
              <div className="flex gap-2">
                <Input
                  id="hoteladresse"
                  value={formData.hotel_adresse}
                  onChange={(e) => handleChange('hotel_adresse', e.target.value)}
                  placeholder="z.B. Arnulf-Klett-Platz 7, 70173 Stuttgart"
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => openInGoogleMaps(formData.hotel_adresse)}
                  disabled={!formData.hotel_adresse}
                >
                  <MapPin className="w-4 h-4" />
                  Maps
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zusätzliche Informationen */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-white">
          <CardTitle className="text-xl font-bold">Zusätzliche Informationen</CardTitle>
          <p className="text-sm text-gray-500">Weitere wichtige Details</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6 bg-white">
          <div className="space-y-2">
            <Label htmlFor="technik" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Technische Anforderungen
            </Label>
            <Textarea
              id="technik"
              value={formData.technik_hinweise}
              onChange={(e) => handleChange('technik_hinweise', e.target.value)}
              placeholder="z.B. PA wird vom Veranstalter gestellt"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notizen_musiker" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              Notizen für Musiker
            </Label>
            <p className="text-xs text-gray-500">Diese Notizen sind für alle gebuchten Musiker sichtbar</p>
            <Textarea
              id="notizen_musiker"
              value={formData.oeffentliche_notizen}
              onChange={(e) => handleChange('oeffentliche_notizen', e.target.value)}
              placeholder="z.B. Wichtige Infos für die Musiker..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interne_notizen" className="flex items-center gap-2">
              <File className="w-4 h-4 text-amber-500" />
              Interne Notizen
            </Label>
            <p className="text-xs text-gray-500">Diese Notizen sind nur für Band Manager sichtbar</p>
            <Textarea
              id="interne_notizen"
              value={formData.interne_notizen}
              onChange={(e) => handleChange('interne_notizen', e.target.value)}
              placeholder="Interne Informationen..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        {event && onDelete ? (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onDelete}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Löschen
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" className="bg-gray-900 hover:bg-gray-800 gap-2">
            <Save className="w-4 h-4" />
            {event ? 'Änderungen speichern' : 'Event erstellen'}
          </Button>
        </div>
      </div>
    </form>
  );
}