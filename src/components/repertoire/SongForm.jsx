import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Save, Plus, Upload, FileText, Loader2, Trash2 } from "lucide-react";

export default function SongForm({ song, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(song || {
    titel: "",
    kuenstler_original: "",
    tonart: "",
    bpm: "",
    laenge: "",
    tags: [],
    lead_sheet_url: "",
    noten_dateien: [],
    audio_demo_url: "",
    notizen: ""
  });

  const [tagInput, setTagInput] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validierung
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Bitte wähle eine PDF- oder Bilddatei aus');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Die Datei darf maximal 5MB groß sein');
      e.target.value = '';
      return;
    }

    setUploadingFile(true);
    try {
      // Verwende direkt die UploadFile Integration ohne Timeout
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      if (!uploadResult?.file_url) {
        throw new Error('Keine Upload-URL erhalten');
      }
      
      const newFile = {
        name: file.name,
        url: uploadResult.file_url
      };
      
      handleChange('noten_dateien', [...(formData.noten_dateien || []), newFile]);
      e.target.value = '';
    } catch (error) {
      console.error('Upload-Fehler:', error);
      const errorMsg = error?.message || error?.toString() || 'Unbekannter Fehler';
      alert(`Datei-Upload fehlgeschlagen: ${errorMsg}\n\nBitte versuche es mit einer kleineren Datei oder kontaktiere den Support.`);
      e.target.value = '';
    } finally {
      setUploadingFile(false);
    }
  };

  const removeFile = (index) => {
    handleChange('noten_dateien', formData.noten_dateien.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.titel?.trim()) {
      alert('Bitte gib einen Titel ein');
      return;
    }
    
    await onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
                autoFocus />

            </div>

            <div className="space-y-2">
              <Label htmlFor="kuenstler">Künstler (Original)</Label>
              <Input
                id="kuenstler"
                value={formData.kuenstler_original}
                onChange={(e) => handleChange('kuenstler_original', e.target.value)}
                placeholder="z.B. Mark Ronson ft. Bruno Mars" />

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
                placeholder="z.B. Dm" />

            </div>

            <div className="space-y-2">
              <Label htmlFor="bpm">Tempo (BPM)</Label>
              <Input
                id="bpm"
                type="number"
                value={formData.bpm || ""}
                onChange={(e) => handleChange('bpm', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="z.B. 115" />

            </div>

            <div className="space-y-2">
              <Label htmlFor="laenge">Länge (MM:SS)</Label>
              <Input
                id="laenge"
                value={formData.laenge}
                onChange={(e) => handleChange('laenge', e.target.value)}
                placeholder="z.B. 04:30" />

            </div>
          </div>

          {/* Noten-Upload */}
          <div className="space-y-3">
            <Label>Noten / Dokumente</Label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
                  {uploadingFile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {uploadingFile ? 'Wird hochgeladen...' : 'Datei hochladen'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                </label>
                <span className="text-sm text-gray-500">PDF oder Bilder, max. 10MB</span>
              </div>
              
              {/* Hochgeladene Dateien */}
              {formData.noten_dateien && formData.noten_dateien.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formData.noten_dateien.map((datei, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <a 
                          href={datei.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline truncate max-w-xs"
                        >
                          {datei.name}
                        </a>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="lead_sheet">Lead Sheet URL (extern)</Label>
              <Input
                id="lead_sheet"
                value={formData.lead_sheet_url}
                onChange={(e) => handleChange('lead_sheet_url', e.target.value)}
                placeholder="https://..." />

            </div>

            <div className="space-y-2">
              <Label htmlFor="audio">YouTube / Audio-Demo URL</Label>
              <Input
                id="audio"
                value={formData.audio_demo_url}
                onChange={(e) => handleChange('audio_demo_url', e.target.value)}
                placeholder="https://youtube.com/..." />

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
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />

              <Button
                type="button"
                onClick={addTag}
                variant="outline">

                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag, i) =>
              <Badge key={i} variant="secondary" className="text-sm">
                  {tag}
                  <button
                  type="button"
                  onClick={() => removeTag(i)}
                  className="ml-2 hover:text-red-500">

                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
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
              rows={3} />

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
              <Save className="w-4 h-4 mr-2" />
              {song ? 'Speichern' : 'Song erstellen'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}