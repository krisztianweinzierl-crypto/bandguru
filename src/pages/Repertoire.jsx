
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Music, List, Info, Clock, Calendar, Edit, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SongForm from "@/components/repertoire/SongForm";
import SetlistForm from "@/components/repertoire/SetlistForm";
import SongImport from "@/components/repertoire/SongImport"; // Added import for SongImport

export default function RepertoirePage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [activeTab, setActiveTab] = useState("bibliothek");
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("alle");
  const [showSongForm, setShowSongForm] = useState(false);
  const [showSetlistForm, setShowSetlistForm] = useState(false);
  const [showImport, setShowImport] = useState(false); // Added showImport state
  const [editingSong, setEditingSong] = useState(null);
  const [editingSetlist, setEditingSetlist] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: mitgliedschaften = [] } = useQuery({
    queryKey: ['mitgliedschaften', currentOrgId, user?.id],
    queryFn: () => base44.entities.Mitglied.filter({ 
      org_id: currentOrgId,
      user_id: user?.id,
      status: "aktiv"
    }),
    enabled: !!currentOrgId && !!user?.id,
  });

  // Prüfe ob der User ein Band Manager ist
  const currentMitglied = mitgliedschaften.find(m => m.org_id === currentOrgId);
  const isManager = currentMitglied?.rolle === "Band Manager";

  // Für Musiker: Lade ihre Events
  const { data: musikerEvents = [] } = useQuery({
    queryKey: ['musikerEvents', currentOrgId, user?.email],
    queryFn: async () => {
      if (!currentOrgId || isManager) return []; // Manager brauchen diese Query nicht
      
      // 1. Finde den Musiker-Datensatz
      const allMusiker = await base44.entities.Musiker.filter({ 
        org_id: currentOrgId,
        email: user?.email 
      });
      
      if (allMusiker.length === 0) return [];
      
      const userMusiker = allMusiker[0];
      
      // 2. Lade EventMusiker-Verknüpfungen
      const allEventMusiker = await base44.entities.EventMusiker.filter({
        musiker_id: userMusiker.id,
        status: { $in: ['zugesagt', 'optional', 'angefragt'] } // Nur relevante Status
      });
      
      // 3. Gebe Event-IDs zurück
      return allEventMusiker.map(em => em.event_id);
    },
    enabled: !!currentOrgId && !!user?.email && !isManager,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['songs', currentOrgId],
    queryFn: () => base44.entities.Song.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const { data: setlists = [] } = useQuery({
    queryKey: ['setlists', currentOrgId, musikerEvents, isManager],
    queryFn: async () => {
      const allSetlists = await base44.entities.Setliste.filter({ org_id: currentOrgId }, '-created_date');
      
      // Manager sehen alle Setlists
      if (isManager) {
        return allSetlists;
      }
      
      // Musiker sehen nur Setlists von Events bei denen sie teilnehmen
      return allSetlists.filter(setlist => {
        // Setlists ohne Event-Zuordnung sind für alle sichtbar
        if (!setlist.event_id) return true;
        
        // Prüfe ob der Musiker bei diesem Event dabei ist
        return musikerEvents.includes(setlist.event_id);
      });
    },
    enabled: !!currentOrgId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', currentOrgId],
    queryFn: () => base44.entities.Event.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const createSongMutation = useMutation({
    mutationFn: (data) => base44.entities.Song.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setShowSongForm(false);
      setEditingSong(null);
    },
  });

  const updateSongMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Song.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setShowSongForm(false);
      setEditingSong(null);
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: (id) => base44.entities.Song.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    },
  });

  const createSetlistMutation = useMutation({
    mutationFn: (data) => base44.entities.Setliste.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      setShowSetlistForm(false);
      setEditingSetlist(null);
    },
  });

  const updateSetlistMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Setliste.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      setShowSetlistForm(false);
      setEditingSetlist(null);
    },
  });

  const deleteSetlistMutation = useMutation({
    mutationFn: (id) => base44.entities.Setliste.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
    },
  });

  const handleSongSubmit = (data) => {
    if (editingSong) {
      updateSongMutation.mutate({ id: editingSong.id, data });
    } else {
      createSongMutation.mutate(data);
    }
  };

  const handleSetlistSubmit = (data) => {
    if (editingSetlist) {
      updateSetlistMutation.mutate({ id: editingSetlist.id, data });
    } else {
      createSetlistMutation.mutate(data);
    }
  };

  // Added handleImportSuccess function
  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['songs'] });
    setShowImport(false);
  };

  const filteredSongs = songs.filter(s => {
    const matchesSearch = s.titel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.kuenstler_original?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = genreFilter === "alle" || s.tags?.includes(genreFilter);
    return matchesSearch && matchesGenre;
  });

  const filteredSetlists = setlists.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteSong = (song) => {
    if (confirm(`Möchtest du "${song.titel}" wirklich löschen?`)) {
      deleteSongMutation.mutate(song.id);
    }
  };

  const handleDeleteSetlist = (setlist) => {
    if (confirm(`Möchtest du die Setlist "${setlist.name}" wirklich löschen?`)) {
      deleteSetlistMutation.mutate(setlist.id);
    }
  };

  const allGenres = [...new Set(songs.flatMap(s => s.tags || []))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Repertoire</h1>
          <p className="text-gray-600">
            {isManager 
              ? 'Verwalte deine Songs und Setlisten' 
              : 'Deine Songs und Setlisten für gebuchte Events'
            }
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="bibliothek" className="gap-2">
              <Music className="w-4 h-4" />
              Song-Bibliothek
              <Badge variant="secondary" className="ml-2">{songs.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="setlists" className="gap-2">
              <List className="w-4 h-4" />
              Setlists
              <Badge variant="secondary" className="ml-2">{setlists.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Song-Bibliothek Tab */}
          <TabsContent value="bibliothek" className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    {isManager 
                      ? `Sie sehen alle ${songs.length} Songs in der Bibliothek`
                      : `Du siehst alle ${songs.length} Songs der Organisation`
                    }
                  </p>
                </div>
              </div>
              {isManager && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setShowImport(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importieren
                  </Button>
                  <Button 
                    onClick={() => {
                      setEditingSong(null);
                      setShowSongForm(true);
                    }}
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Song hinzufügen
                  </Button>
                </div>
              )}
            </div>

            {/* Import Component */}
            {showImport && (
              <SongImport
                onClose={() => setShowImport(false)}
                onSuccess={handleImportSuccess}
                orgId={currentOrgId}
              />
            )}

            {/* Song Form */}
            {showSongForm && (
              <SongForm
                song={editingSong}
                onSubmit={handleSongSubmit}
                onCancel={() => {
                  setShowSongForm(false);
                  setEditingSong(null);
                }}
              />
            )}

            {/* Suche & Filter */}
            <Card className="border-none shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Songs durchsuchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={genreFilter} onValueChange={setGenreFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alle">Alle Genres</SelectItem>
                      {allGenres.map(genre => (
                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Song-Tabelle - Aktionen nur für Manager */}
            <Card className="border-none shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-700">Titel</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Künstler</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Genre</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Tonart</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Tempo</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Noten</th>
                      <th className="text-left p-4 font-semibold text-gray-700">YouTube</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Drive</th>
                      {isManager && (
                        <th className="text-right p-4 font-semibold text-gray-700">Aktionen</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredSongs.length > 0 ? (
                      filteredSongs.map((song) => (
                        <tr key={song.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-medium text-gray-900">{song.titel}</td>
                          <td className="p-4 text-gray-600">{song.kuenstler_original || '-'}</td>
                          <td className="p-4">
                            {song.tags && song.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {song.tags.slice(0, 2).map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="p-4 text-gray-600">{song.tonart || '-'}</td>
                          <td className="p-4 text-gray-600">{song.bpm ? `${song.bpm} BPM` : '-'}</td>
                          <td className="p-4 text-gray-600 text-center">
                            {song.lead_sheet_url ? '1' : '0'}
                          </td>
                          <td className="p-4">
                            {song.audio_demo_url ? (
                              <a 
                                href={song.audio_demo_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Link
                              </a>
                            ) : '-'}
                          </td>
                          <td className="p-4 text-gray-600">-</td>
                          {isManager && (
                            <td className="p-4">
                              <div className="flex justify-end gap-2">
                                {song.lead_sheet_url && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => window.open(song.lead_sheet_url, '_blank')}
                                  >
                                    Noten ansehen
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingSong(song);
                                    setShowSongForm(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteSong(song)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={isManager ? "9" : "8"} className="p-12 text-center">
                          <Music className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-semibold mb-2">Keine Songs gefunden</h3>
                          {isManager && (
                            <>
                              <p className="text-gray-500 mb-4">Füge deinen ersten Song hinzu</p>
                              <Button onClick={() => setShowSongForm(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Song hinzufügen
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Setlists Tab */}
          <TabsContent value="setlists" className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    {isManager 
                      ? 'Du siehst alle Setlists (Owner-Modus)'
                      : 'Du siehst nur Setlists von Events bei denen du teilnimmst'
                    }
                  </p>
                </div>
              </div>
              {isManager && (
                <Button 
                  onClick={() => {
                    setEditingSetlist(null);
                    setShowSetlistForm(true);
                  }}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Neue Setlist
                </Button>
              )}
            </div>

            {showSetlistForm && (
              <SetlistForm
                setlist={editingSetlist}
                onSubmit={handleSetlistSubmit}
                onCancel={() => {
                  setShowSetlistForm(false);
                  setEditingSetlist(null);
                }}
                events={events}
                allSongs={songs}
              />
            )}

            {/* Suche */}
            <Card className="border-none shadow-md">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Setlists durchsuchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Setlist Cards - Aktionen nur für Manager */}
            {filteredSetlists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSetlists.map((setlist) => {
                  const event = events.find(e => e.id === setlist.event_id);
                  const songCount = setlist.songs?.length || 0;
                  
                  return (
                    <Card key={setlist.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-xl">{setlist.name}</CardTitle>
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Bereit
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {event && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{event.titel} - {new Date(event.datum_von).toLocaleDateString('de-DE')}</span>
                          </div>
                        )}

                        {setlist.beschreibung && (
                          <p className="text-sm text-gray-600 line-clamp-2">{setlist.beschreibung}</p>
                        )}

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Gesamtdauer: {setlist.gesamtdauer || 0} Min.</span>
                        </div>

                        <div className="text-sm text-gray-600">
                          <Music className="w-4 h-4 inline mr-2" />
                          {songCount} {songCount === 1 ? 'Song' : 'Songs'}
                        </div>

                        {isManager && (
                          <div className="flex gap-2 pt-4 border-t">
                            <Button
                              variant="default"
                              className="flex-1 bg-gray-900 hover:bg-gray-800"
                              onClick={() => {
                                setEditingSetlist(setlist);
                                setShowSetlistForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Bearbeiten
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteSetlist(setlist)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <List className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">Keine Setlists gefunden</h3>
                  {isManager ? (
                    <>
                      <p className="text-gray-500 mb-4">Erstelle deine erste Setlist</p>
                      <Button onClick={() => setShowSetlistForm(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Neue Setlist
                      </Button>
                    </>
                  ) : (
                    <p className="text-gray-500">Du hast noch keine Setlists für deine Events</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
