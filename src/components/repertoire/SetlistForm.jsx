
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Save, Plus, GripVertical, Trash2, Clock, FileText } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function SetlistForm({ setlist, onSubmit, onCancel, events, allSongs }) {
  const [formData, setFormData] = useState(setlist || {
    name: "",
    beschreibung: "",
    event_id: "",
    songs: [],
    gesamtdauer: 0,
    tags: []
  });

  const [selectedSongId, setSelectedSongId] = useState("");
  const [tagInput, setTagInput] = useState("");

  // Automatische Berechnung der Gesamtdauer
  useEffect(() => {
    if (formData.songs.length > 0) {
      const totalMinutes = formData.songs.reduce((sum, songItem) => {
        const song = allSongs.find(s => s.id === songItem.song_id);
        if (song && song.laenge) {
          // Parse MM:SS format
          const parts = song.laenge.split(':');
          if (parts.length === 2) {
            const minutes = parseInt(parts[0]) || 0;
            const seconds = parseInt(parts[1]) || 0;
            return sum + minutes + (seconds / 60);
          }
        }
        return sum;
      }, 0);
      
      // Runde auf ganze Minuten
      setFormData(prev => ({ ...prev, gesamtdauer: Math.round(totalMinutes) }));
    } else {
      setFormData(prev => ({ ...prev, gesamtdauer: 0 }));
    }
  }, [formData.songs, allSongs]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSong = () => {
    if (selectedSongId) {
      const song = allSongs.find(s => s.id === selectedSongId);
      if (song) {
        const newSongs = [...formData.songs, {
          song_id: song.id,
          reihenfolge: formData.songs.length + 1,
          notizen: ""
        }];
        handleChange('songs', newSongs);
        setSelectedSongId("");
      }
    }
  };

  const removeSong = (index) => {
    const newSongs = formData.songs.filter((_, i) => i !== index);
    // Reihenfolge aktualisieren
    const updatedSongs = newSongs.map((s, i) => ({ ...s, reihenfolge: i + 1 }));
    handleChange('songs', updatedSongs);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(formData.songs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Reihenfolge aktualisieren
    const updatedItems = items.map((item, index) => ({
      ...item,
      reihenfolge: index + 1
    }));

    handleChange('songs', updatedItems);
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

  const handleExportPDF = () => {
    // Erstelle eine neue Seite für den Druck
    const printWindow = window.open('', '_blank');
    const event = events.find(e => e.id === formData.event_id);
    
    const songsList = formData.songs.map((songItem, index) => {
      const song = allSongs.find(s => s.id === songItem.song_id);
      if (!song) return '';
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${index + 1}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${song.titel}</div>
            <div style="color: #6b7280; font-size: 14px;">${song.kuenstler_original || '-'}</div>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${song.laenge || '-'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${song.bpm ? song.bpm + ' BPM' : '-'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${song.tonart || '-'}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${formData.name} - Setlist</title>
          <style>
            @media print {
              @page { margin: 2cm; }
              body { margin: 0; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #111827;
              max-width: 1000px;
              margin: 0 auto;
            }
            h1 {
              color: #111827;
              margin-bottom: 8px;
              font-size: 32px;
            }
            .subtitle {
              color: #6b7280;
              margin-bottom: 32px;
              font-size: 16px;
            }
            .info-section {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 32px;
              display: flex;
              gap: 40px;
            }
            .info-item {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              color: #6b7280;
              font-size: 12px;
              text-transform: uppercase;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .info-value {
              color: #111827;
              font-size: 16px;
              font-weight: 600;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
            }
            thead {
              background: #f9fafb;
            }
            th {
              padding: 12px;
              text-align: left;
              font-size: 12px;
              font-weight: 600;
              color: #6b7280;
              text-transform: uppercase;
              border-bottom: 2px solid #e5e7eb;
            }
            .footer {
              margin-top: 48px;
              padding-top: 24px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #9ca3af;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <h1>${formData.name}</h1>
          ${formData.beschreibung ? `<p class="subtitle">${formData.beschreibung}</p>` : ''}
          
          <div class="info-section">
            ${event ? `
              <div class="info-item">
                <div class="info-label">Event</div>
                <div class="info-value">${event.titel}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Datum</div>
                <div class="info-value">${new Date(event.datum_von).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
            ` : ''}
            <div class="info-item">
              <div class="info-label">Anzahl Songs</div>
              <div class="info-value">${formData.songs.length}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Gesamtdauer</div>
              <div class="info-value">${formData.gesamtdauer} Min.</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>Song</th>
                <th style="width: 100px; text-align: center;">Länge</th>
                <th style="width: 100px; text-align: center;">Tempo</th>
                <th style="width: 100px; text-align: center;">Tonart</th>
              </tr>
            </thead>
            <tbody>
              ${songsList}
            </tbody>
          </table>

          <div class="footer">
            Erstellt mit Bandguru • ${new Date().toLocaleDateString('de-DE')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Warte kurz und öffne dann den Druck-Dialog
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const availableSongs = allSongs.filter(s => 
    !formData.songs.some(fs => fs.song_id === s.id)
  );

  return (
    <Card className="border-none shadow-lg mb-6">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>{setlist ? "Setlist bearbeiten" : "Neue Setlist"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name & Event */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name der Setlist *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="z.B. Geburtstagsparty Nico"
                required
                autoFocus
              />
            </div>

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
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.titel} - {new Date(event.datum_von).toLocaleDateString('de-DE')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Beschreibung */}
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Textarea
              id="beschreibung"
              value={formData.beschreibung}
              onChange={(e) => handleChange('beschreibung', e.target.value)}
              placeholder="z.B. Partysetliste Ägypten"
              rows={2}
            />
          </div>

          {/* Songs hinzufügen */}
          <div className="space-y-2">
            <Label>Songs zur Setlist hinzufügen</Label>
            <div className="flex gap-2">
              <Select value={selectedSongId} onValueChange={setSelectedSongId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Song auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {availableSongs.map((song) => (
                    <SelectItem key={song.id} value={song.id}>
                      {song.titel} - {song.kuenstler_original || 'Unbekannt'}
                      {song.laenge && ` (${song.laenge})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                onClick={addSong}
                disabled={!selectedSongId}
                variant="outline"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Songs Liste mit Drag & Drop */}
          {formData.songs.length > 0 && (
            <div className="space-y-2">
              <Label>Songs in der Setlist ({formData.songs.length})</Label>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="songs">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {formData.songs.map((songItem, index) => {
                        const song = allSongs.find(s => s.id === songItem.song_id);
                        if (!song) return null;

                        return (
                          <Draggable key={songItem.song_id} draggableId={songItem.song_id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-3 p-3 bg-white border rounded-lg ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                              >
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                                    <p className="font-medium text-gray-900">{song.titel}</p>
                                  </div>
                                  <p className="text-sm text-gray-500">{song.kuenstler_original}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                  {song.laenge && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {song.laenge}
                                    </Badge>
                                  )}
                                  {song.bpm && (
                                    <Badge variant="outline" className="text-xs">
                                      {song.bpm} BPM
                                    </Badge>
                                  )}
                                  {song.tonart && (
                                    <Badge variant="outline" className="text-xs">
                                      {song.tonart}
                                    </Badge>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeSong(index)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}

          {/* Gesamtdauer (automatisch berechnet) */}
          <div className="space-y-2">
            <Label>Gesamtdauer (automatisch berechnet)</Label>
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-900">{formData.gesamtdauer} Min.</p>
                <p className="text-xs text-blue-700">
                  Basierend auf {formData.songs.length} {formData.songs.length === 1 ? 'Song' : 'Songs'}
                </p>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="z.B. Party, Hochzeit"
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

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              {formData.songs.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportPDF}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Als PDF exportieren
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                Abbrechen
              </Button>
              <Button 
                type="submit" 
                style={{ backgroundColor: '#223a5e' }}
                className="hover:opacity-90"
              >
                <Save className="w-4 h-4 mr-2" />
                {setlist ? 'Speichern' : 'Setlist erstellen'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
