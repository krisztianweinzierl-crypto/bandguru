import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Save, Plus } from "lucide-react";

export default function SongForm({ song, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(song || {
    titel: "",
    kuenstler_original: "",
    tonart: "",
    bpm: "",
    laenge: "",
    tags: [],
    lead_sheet_url: "",
    audio_demo_url: "",
    notizen: ""
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
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      handleChange('tags', [...(formData.tags || []), tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (index) => {
    handleChange('tags', formData.tags.filter((_, i) => i !== index));
  };

  return (
    <Card className="border-none shadow-lg mb-6">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>{song ? "Song bearbeiten" : "Neuer Song"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titel & Künstler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="titel">Titel *</Label>
              <Input
                id="titel"
                value={formData.titel}
                onChange={(e) => handleChange('titel', e.target.value)}
                placeholder="z.B. Uptown Funk"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kuenstler">Künstler (Original)</Label>
              <Input
                id="kuenstler"
                value={formData.kuenstler_original}
                onChange={(e) => handleChange('kuenstler_original', e.target.value)}
                placeholder="z.B. Mark Ronson ft. Bruno Mars"
              />
            </div>
          </div>

          {/* Tonart, Tempo, Länge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="tonart">Tonart</Label>
              <Input
                id="tonart"
                value={formData.tonart}
                onChange={(e) => handleChange('tonart', e.target.value)}
                placeholder="z.B. Dm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bpm">Tempo (BPM)</Label>
              <Input
                id="bpm"
                type="number"
                value={formData.bpm}
                onChange={(e) => handleChange('bpm', e.target.value ? parseInt(e.target.value) : "")}
                placeholder="z.B. 115"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="laenge">Länge (MM:SS)</Label>
              <Input
                id="laenge"
                value={formData.laenge}
                onChange={(e) => handleChange('laenge', e.target.value)}
                placeholder="z.B. 04:30"
              />
            </div>
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="lead_sheet">Lead Sheet URL</Label>
              <Input
                id="lead_sheet"
                value={formData.lead_sheet_url}
                onChange={(e) => handleChange('lead_sheet_url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audio">YouTube / Audio-Demo URL</Label>
              <Input
                id="audio"
                value={formData.audio_demo_url}
                onChange={(e) => handleChange('audio_demo_url', e.target.value)}
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>

          {/* Tags/Genres */}
          <div className="space-y-2">
            <Label>Genres / Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="z.B. Pop, Funk"
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

          {/* Notizen */}
          <div className="space-y-2">
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea
              id="notizen"
              value={formData.notizen}
              onChange={(e) => handleChange('notizen', e.target.value)}
              placeholder="Zusätzliche Notizen zum Song..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
              <Save className="w-4 h-4 mr-2" />
              {song ? 'Speichern' : 'Song erstellen'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}