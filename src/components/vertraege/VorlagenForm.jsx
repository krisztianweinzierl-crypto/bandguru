import React, { useState } from "react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Info } from "lucide-react";

export default function VorlagenForm({ vorlage = null, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(vorlage || {
    name: "",
    beschreibung: "",
    inhalt: "",
    kategorie: "allgemein",
    aktiv: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const insertPlaceholder = (placeholder) => {
    const currentInhalt = formData.inhalt || "";
    handleChange('inhalt', currentInhalt + placeholder);
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>{vorlage ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Vorlagenname *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="z.B. Standard Event-Vertrag"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kategorie */}
            <div className="space-y-2">
              <Label htmlFor="kategorie">Kategorie</Label>
              <Select
                value={formData.kategorie}
                onValueChange={(value) => handleChange('kategorie', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="allgemein">Allgemein</SelectItem>
                  <SelectItem value="abo">Abo</SelectItem>
                  <SelectItem value="dienstleistung">Dienstleistung</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Aktiv */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center space-x-2 h-10">
                <Checkbox
                  id="aktiv"
                  checked={formData.aktiv}
                  onCheckedChange={(checked) => handleChange('aktiv', checked)}
                />
                <label
                  htmlFor="aktiv"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Vorlage ist aktiv
                </label>
              </div>
            </div>
          </div>

          {/* Beschreibung */}
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung (optional)</Label>
            <Textarea
              id="beschreibung"
              value={formData.beschreibung}
              onChange={(e) => handleChange('beschreibung', e.target.value)}
              placeholder="Kurze Beschreibung der Vorlage..."
              rows={2}
            />
          </div>

          {/* Platzhalter Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Platzhalter verwenden</h4>
                <p className="text-sm text-blue-800 mb-3">
                  Du kannst folgende Platzhalter in deiner Vorlage verwenden. Diese werden automatisch ersetzt:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertPlaceholder('{{kunde_name}}')}
                    className="text-xs"
                  >
                    {{kunde_name}}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertPlaceholder('{{kunde_adresse}}')}
                    className="text-xs"
                  >
                    {{kunde_adresse}}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertPlaceholder('{{event_titel}}')}
                    className="text-xs"
                  >
                    {{event_titel}}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertPlaceholder('{{event_datum}}')}
                    className="text-xs"
                  >
                    {{event_datum}}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertPlaceholder('{{event_ort}}')}
                    className="text-xs"
                  >
                    {{event_ort}}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertPlaceholder('{{organisation_name}}')}
                    className="text-xs"
                  >
                    {{organisation_name}}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertPlaceholder('{{datum_heute}}')}
                    className="text-xs"
                  >
                    {{datum_heute}}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Vorlageninhalt (Rich Text Editor) */}
          <div className="space-y-2">
            <Label>Vorlageninhalt *</Label>
            <div className="border border-gray-200 rounded-lg">
              <ReactQuill
                theme="snow"
                value={formData.inhalt}
                onChange={(value) => handleChange('inhalt', value)}
                modules={modules}
                formats={formats}
                placeholder="Vertragstext eingeben..."
                className="min-h-[400px]"
              />
            </div>
          </div>

          {/* Beispieltext */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Beispiel-Vertragsvorlage</h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>Vertrag zwischen</strong></p>
              <p>{{organisation_name}} (im Folgenden "Auftragnehmer")</p>
              <p>und</p>
              <p>{{kunde_name}}, {{kunde_adresse}} (im Folgenden "Auftraggeber")</p>
              <p className="mt-4"><strong>§1 Gegenstand des Vertrags</strong></p>
              <p>Der Auftragnehmer verpflichtet sich zur musikalischen Unterhaltung am {{event_datum}} in {{event_ort}}.</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
              <Save className="w-4 h-4 mr-2" />
              {vorlage ? "Aktualisieren" : "Vorlage erstellen"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}