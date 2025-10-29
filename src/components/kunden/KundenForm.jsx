import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Save, Plus } from "lucide-react";

export default function KundenForm({ onSubmit, onCancel, kunde = null }) {
  const [formData, setFormData] = useState(kunde || {
    firmenname: "",
    ansprechpartner: "",
    email: "",
    telefon: "",
    adresse: "",
    ust_id: "",
    zahlungsziel_tage: 14,
    notizen: "",
    tags: []
  });

  const [tagInput, setTagInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (tagInput.trim()) {
      handleChange('tags', [...(formData.tags || []), tagInput.trim()]);
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
          <CardTitle>{kunde ? "Kunde bearbeiten" : "Neuer Kunde"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firmenname">Firmenname *</Label>
              <Input
                id="firmenname"
                value={formData.firmenname}
                onChange={(e) => handleChange('firmenname', e.target.value)}
                placeholder="z.B. Müller Events GmbH"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ansprechpartner">Ansprechpartner</Label>
              <Input
                id="ansprechpartner"
                value={formData.ansprechpartner}
                onChange={(e) => handleChange('ansprechpartner', e.target.value)}
                placeholder="z.B. Herr Müller"
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
                placeholder="+49 123 456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ust_id">USt-ID</Label>
              <Input
                id="ust_id"
                value={formData.ust_id}
                onChange={(e) => handleChange('ust_id', e.target.value)}
                placeholder="DE123456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zahlungsziel">Zahlungsziel (Tage)</Label>
              <Input
                id="zahlungsziel"
                type="number"
                value={formData.zahlungsziel_tage}
                onChange={(e) => handleChange('zahlungsziel_tage', parseInt(e.target.value))}
                placeholder="14"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Textarea
              id="adresse"
              value={formData.adresse}
              onChange={(e) => handleChange('adresse', e.target.value)}
              placeholder="Straße, PLZ Ort"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="z.B. VIP-Kunde"
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
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-sm">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="notizen">Interne Notizen</Label>
            <Textarea
              id="notizen"
              value={formData.notizen}
              onChange={(e) => handleChange('notizen', e.target.value)}
              placeholder="Interne Notizen zum Kunden..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
              <Save className="w-4 h-4 mr-2" />
              Speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}