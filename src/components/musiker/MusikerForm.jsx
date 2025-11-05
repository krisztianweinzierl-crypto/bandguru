import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Save, Plus } from "lucide-react";

export default function MusikerForm({ onSubmit, onCancel, musiker = null }) {
  const [formData, setFormData] = useState(musiker || {
    name: "",
    instrumente: [],
    genre: [],
    sprachen: [],
    buchungsbedingungen: "",
    tagessatz_netto: "",
    reisespesen_regeln: "",
    email: "",
    telefon: "",
    notfallkontakt: "",
    notizen: "",
    aktiv: true
  });

  const [instrumentInput, setInstrumentInput] = useState("");
  const [genreInput, setGenreInput] = useState("");
  const [spracheInput, setSpracheInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addItem = (field, value, setter) => {
    if (value.trim()) {
      handleChange(field, [...(formData[field] || []), value.trim()]);
      setter("");
    }
  };

  const removeItem = (field, index) => {
    handleChange(field, formData[field].filter((_, i) => i !== index));
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>{musiker ? "Musiker bearbeiten" : "Neuer Musiker"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name / Künstlername *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="z.B. Max Mustermann"
                required />

            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="max@example.com" />

            </div>

            <div className="space-y-2">
              <Label htmlFor="telefon">Telefon</Label>
              <Input
                id="telefon"
                value={formData.telefon}
                onChange={(e) => handleChange('telefon', e.target.value)}
                placeholder="+49 123 456789" />

            </div>

            <div className="space-y-2">
              <Label htmlFor="tagessatz">Tagessatz (netto)</Label>
              <Input
                id="tagessatz"
                type="number"
                value={formData.tagessatz_netto}
                onChange={(e) => handleChange('tagessatz_netto', parseFloat(e.target.value))}
                placeholder="500" />

            </div>
          </div>

          <div className="space-y-2">
            <Label>Instrumente</Label>
            <div className="flex gap-2">
              <Input
                value={instrumentInput}
                onChange={(e) => setInstrumentInput(e.target.value)}
                placeholder="z.B. Gitarre"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('instrumente', instrumentInput, setInstrumentInput))} />

              <Button
                type="button"
                onClick={() => addItem('instrumente', instrumentInput, setInstrumentInput)}
                variant="outline">

                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.instrumente.map((instrument, i) =>
              <Badge key={i} variant="secondary" className="text-sm">
                  {instrument}
                  <button
                  type="button"
                  onClick={() => removeItem('instrumente', i)}
                  className="ml-2 hover:text-red-500">

                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Genres</Label>
            <div className="flex gap-2">
              <Input
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                placeholder="z.B. Jazz"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('genre', genreInput, setGenreInput))} />

              <Button
                type="button"
                onClick={() => addItem('genre', genreInput, setGenreInput)}
                variant="outline">

                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.genre.map((g, i) =>
              <Badge key={i} variant="secondary" className="text-sm">
                  {g}
                  <button
                  type="button"
                  onClick={() => removeItem('genre', i)}
                  className="ml-2 hover:text-red-500">

                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sprachen</Label>
            <div className="flex gap-2">
              <Input
                value={spracheInput}
                onChange={(e) => setSpracheInput(e.target.value)}
                placeholder="z.B. Deutsch"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('sprachen', spracheInput, setSpracheInput))} />

              <Button
                type="button"
                onClick={() => addItem('sprachen', spracheInput, setSpracheInput)}
                variant="outline">

                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.sprachen.map((s, i) =>
              <Badge key={i} variant="secondary" className="text-sm">
                  {s}
                  <button
                  type="button"
                  onClick={() => removeItem('sprachen', i)}
                  className="ml-2 hover:text-red-500">

                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buchungsbedingungen">Buchungsbedingungen</Label>
            <Textarea
              id="buchungsbedingungen"
              value={formData.buchungsbedingungen}
              onChange={(e) => handleChange('buchungsbedingungen', e.target.value)}
              placeholder="z.B. Mindestvorlauf 2 Wochen, Anreise ab 50km extra..."
              rows={3} />

          </div>

          <div className="space-y-2">
            <Label htmlFor="reisespesen">Reisespesen-Regeln</Label>
            <Textarea
              id="reisespesen"
              value={formData.reisespesen_regeln}
              onChange={(e) => handleChange('reisespesen_regeln', e.target.value)}
              placeholder="z.B. 0,30€/km ab 50km..."
              rows={2} />

          </div>

          <div className="space-y-2">
            <Label htmlFor="notfallkontakt">Notfallkontakt</Label>
            <Input
              id="notfallkontakt"
              value={formData.notfallkontakt}
              onChange={(e) => handleChange('notfallkontakt', e.target.value)}
              placeholder="Name und Telefon" />

          </div>

          <div className="space-y-2">
            <Label htmlFor="notizen">Interne Notizen</Label>
            <Textarea
              id="notizen"
              value={formData.notizen}
              onChange={(e) => handleChange('notizen', e.target.value)}
              placeholder="Interne Notizen..."
              rows={3} />

          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-[#223a5e] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-9 from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
              <Save className="w-4 h-4 mr-2" />
              Speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>);

}