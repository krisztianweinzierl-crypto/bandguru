import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Plus, Trash2 } from "lucide-react";

export default function AufgabeForm({ aufgabe, onSubmit, onCancel, mitglieder, hauptAufgaben }) {
  const [formData, setFormData] = useState(aufgabe || {
    titel: "",
    beschreibung: "",
    status: "offen",
    prioritaet: "normal",
    faellig_am: "",
    zugewiesen_an: "",
    parent_task_id: "",
    bezug_typ: "frei",
    bezug_id: ""
  });

  const [unteraufgaben, setUnteraufgaben] = useState([]);
  const [showUnteraufgaben, setShowUnteraufgaben] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Hauptaufgabe erstellen/updaten
    await onSubmit(formData);
    
    // Unteraufgaben erstellen (nur bei neuen Aufgaben)
    if (!aufgabe && unteraufgaben.length > 0) {
      // TODO: Nach Hauptaufgabe erstellen, Unteraufgaben mit parent_task_id erstellen
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addUnteraufgabe = () => {
    setUnteraufgaben(prev => [...prev, { titel: "", prioritaet: "normal" }]);
  };

  const updateUnteraufgabe = (index, field, value) => {
    const newUnteraufgaben = [...unteraufgaben];
    newUnteraufgaben[index] = { ...newUnteraufgaben[index], [field]: value };
    setUnteraufgaben(newUnteraufgaben);
  };

  const removeUnteraufgabe = (index) => {
    setUnteraufgaben(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>{aufgabe ? "Aufgabe bearbeiten" : "Neue Aufgabe"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titel */}
          <div className="space-y-2">
            <Label htmlFor="titel">Aufgabentitel *</Label>
            <Input
              id="titel"
              value={formData.titel}
              onChange={(e) => handleChange('titel', e.target.value)}
              placeholder="z.B. Rechnung für Event erstellen"
              required
              autoFocus
            />
          </div>

          {/* Beschreibung */}
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Textarea
              id="beschreibung"
              value={formData.beschreibung}
              onChange={(e) => handleChange('beschreibung', e.target.value)}
              placeholder="Weitere Details zur Aufgabe..."
              rows={3}
            />
          </div>

          {/* Grid: Status, Priorität, Fällig am */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offen">Offen</SelectItem>
                  <SelectItem value="in_arbeit">In Arbeit</SelectItem>
                  <SelectItem value="erledigt">Erledigt</SelectItem>
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

            <div className="space-y-2">
              <Label htmlFor="faellig_am">Fälligkeitsdatum</Label>
              <Input
                id="faellig_am"
                type="date"
                value={formData.faellig_am}
                onChange={(e) => handleChange('faellig_am', e.target.value)}
              />
            </div>
          </div>

          {/* Zuweisung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
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

            {/* Parent Task (falls Unteraufgabe) */}
            {hauptAufgaben && hauptAufgaben.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="parent_task_id">Übergeordnete Aufgabe</Label>
                <Select value={formData.parent_task_id} onValueChange={(value) => handleChange('parent_task_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Keine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Keine (Hauptaufgabe)</SelectItem>
                    {hauptAufgaben
                      .filter(a => a.id !== aufgabe?.id) // Nicht sich selbst als Parent
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.titel}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Unteraufgaben (nur für neue Hauptaufgaben) */}
          {!aufgabe && !formData.parent_task_id && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Unteraufgaben</Label>
                {!showUnteraufgaben && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUnteraufgaben(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Unteraufgaben hinzufügen
                  </Button>
                )}
              </div>

              {showUnteraufgaben && (
                <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                  {unteraufgaben.map((unteraufgabe, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={unteraufgabe.titel}
                        onChange={(e) => updateUnteraufgabe(index, 'titel', e.target.value)}
                        placeholder="Unteraufgabe..."
                        className="flex-1"
                      />
                      <Select 
                        value={unteraufgabe.prioritaet} 
                        onValueChange={(value) => updateUnteraufgabe(index, 'prioritaet', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="niedrig">Niedrig</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="hoch">Hoch</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUnteraufgabe(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addUnteraufgabe}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Weitere Unteraufgabe
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700">
              <Save className="w-4 h-4 mr-2" />
              {aufgabe ? 'Speichern' : 'Aufgabe erstellen'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}