import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Save, Plus, GripVertical, Trash2 } from "lucide-react";
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

          {/* Gesamtdauer */}
          <div className="space-y-2">
            <Label htmlFor="gesamtdauer">Gesamtdauer (Minuten)</Label>
            <Input
              id="gesamtdauer"
              type="number"
              value={formData.gesamtdauer}
              onChange={(e) => handleChange('gesamtdauer', e.target.value ? parseInt(e.target.value) : 0)}
              placeholder="z.B. 68"
            />
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
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
              <Save className="w-4 h-4 mr-2" />
              {setlist ? 'Speichern' : 'Setlist erstellen'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}