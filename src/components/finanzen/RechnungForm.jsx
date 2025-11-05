import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus } from 'lucide-react';

export default function RechnungForm({ rechnung, kunden, events, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    kunde_id: '',
    event_id: '',
    rechnungsnummer: '',
    datum: new Date().toISOString().split('T')[0],
    faelligkeitsdatum: '',
    positionen: [],
    steuersatz: 19,
    notizen: '',
    status: 'entwurf',
    ...rechnung
  });

  const [neuePosition, setNeuePosition] = useState({
    beschreibung: '',
    menge: 1,
    einzelpreis: 0
  });

  const addPosition = () => {
    if (neuePosition.beschreibung && neuePosition.einzelpreis > 0) {
      setFormData(prev => ({
        ...prev,
        positionen: [...prev.positionen, { ...neuePosition }]
      }));
      setNeuePosition({ beschreibung: '', menge: 1, einzelpreis: 0 });
    }
  };

  const removePosition = (index) => {
    setFormData(prev => ({
      ...prev,
      positionen: prev.positionen.filter((_, i) => i !== index)
    }));
  };

  const calculateNetto = () => {
    return formData.positionen.reduce((sum, pos) => sum + (pos.menge * pos.einzelpreis), 0);
  };

  const calculateSteuer = () => {
    return calculateNetto() * (formData.steuersatz / 100);
  };

  const calculateBrutto = () => {
    return calculateNetto() + calculateSteuer();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const completeData = {
      ...formData,
      netto_betrag: calculateNetto(),
      steuer_betrag: calculateSteuer(),
      brutto_betrag: calculateBrutto()
    };
    onSubmit(completeData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{rechnung ? 'Rechnung bearbeiten' : 'Neue Rechnung'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grunddaten */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kunde">Kunde *</Label>
              <Select 
                value={formData.kunde_id} 
                onValueChange={(value) => setFormData({...formData, kunde_id: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kunde auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {kunden.map(kunde => (
                    <SelectItem key={kunde.id} value={kunde.id}>
                      {kunde.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event">Event (optional)</Label>
              <Select 
                value={formData.event_id} 
                onValueChange={(value) => setFormData({...formData, event_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Event auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Kein Event</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.titel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rechnungsnummer">Rechnungsnummer *</Label>
              <Input
                id="rechnungsnummer"
                value={formData.rechnungsnummer}
                onChange={(e) => setFormData({...formData, rechnungsnummer: e.target.value})}
                placeholder="RE-2024-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="datum">Rechnungsdatum *</Label>
              <Input
                id="datum"
                type="date"
                value={formData.datum}
                onChange={(e) => setFormData({...formData, datum: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faelligkeitsdatum">Fälligkeitsdatum *</Label>
              <Input
                id="faelligkeitsdatum"
                type="date"
                value={formData.faelligkeitsdatum}
                onChange={(e) => setFormData({...formData, faelligkeitsdatum: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="steuersatz">Steuersatz (%)</Label>
              <Input
                id="steuersatz"
                type="number"
                value={formData.steuersatz}
                onChange={(e) => setFormData({...formData, steuersatz: parseFloat(e.target.value)})}
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entwurf">Entwurf</SelectItem>
                  <SelectItem value="versendet">Versendet</SelectItem>
                  <SelectItem value="bezahlt">Bezahlt</SelectItem>
                  <SelectItem value="ueberfaellig">Überfällig</SelectItem>
                  <SelectItem value="storniert">Storniert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Positionen */}
          <div className="space-y-4">
            <h3 className="font-semibold">Rechnungspositionen</h3>
            
            {/* Bestehende Positionen */}
            {formData.positionen.length > 0 && (
              <div className="space-y-2">
                {formData.positionen.map((pos, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{pos.beschreibung}</div>
                      <div className="text-sm text-gray-600">
                        {pos.menge} × {pos.einzelpreis.toFixed(2)} € = {(pos.menge * pos.einzelpreis).toFixed(2)} €
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePosition(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Neue Position hinzufügen */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border rounded-lg">
              <Input
                placeholder="Beschreibung"
                value={neuePosition.beschreibung}
                onChange={(e) => setNeuePosition({...neuePosition, beschreibung: e.target.value})}
                className="md:col-span-2"
              />
              <Input
                type="number"
                placeholder="Menge"
                value={neuePosition.menge}
                onChange={(e) => setNeuePosition({...neuePosition, menge: parseInt(e.target.value) || 0})}
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Preis"
                  value={neuePosition.einzelpreis}
                  onChange={(e) => setNeuePosition({...neuePosition, einzelpreis: parseFloat(e.target.value) || 0})}
                  step="0.01"
                />
                <Button type="button" onClick={addPosition} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Zusammenfassung */}
          {formData.positionen.length > 0 && (
            <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between">
                <span>Netto:</span>
                <span className="font-medium">{calculateNetto().toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span>MwSt ({formData.steuersatz}%):</span>
                <span className="font-medium">{calculateSteuer().toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Brutto:</span>
                <span>{calculateBrutto().toFixed(2)} €</span>
              </div>
            </div>
          )}

          {/* Notizen */}
          <div className="space-y-2">
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea
              id="notizen"
              value={formData.notizen}
              onChange={(e) => setFormData({...formData, notizen: e.target.value})}
              placeholder="Zusätzliche Informationen..."
              rows={3}
            />
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
              Rechnung speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}