import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Plus, Search, Music, List, Info, Clock, Calendar, Edit, Trash2, Upload, AlertCircle, Printer } from "lucide-react";
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
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMusiker, setCurrentMusiker] = useState(null);
  const [isManager, setIsManager] = useState(false);
  const [isLoadingAccess, setIsLoadingAccess] = useState(true); // Neuer Loading-State
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
    const loadUserData = async () => {
      setIsLoadingAccess(true); // Start Loading
      
      try {
        const orgId = localStorage.getItem('currentOrgId');
        setCurrentOrgId(orgId);

        const user = await base44.auth.me();
        setCurrentUser(user);

        if (!orgId || !user) {
          setIsLoadingAccess(false);
          return;
        }

        // Prüfe Rolle
        const mitgliedschaften = await base44.entities.Mitglied.filter({ 
          user_id: user.id,
          org_id: orgId,
          status: "aktiv" 
        });
        const mitglied = mitgliedschaften[0];
        setIsManager(mitglied?.rolle === "Band Manager");

        // Wenn Musiker, lade Musiker-Profil
        if (mitglied?.rolle === "Musiker") {
          const alleMusiker = await base44.entities.Musiker.filter({ org_id: orgId });
          const musikerProfil = alleMusiker.find(m => 
            m.email?.toLowerCase().trim() === user.email.toLowerCase().trim() && m.aktiv === true
          );
          setCurrentMusiker(musikerProfil);
        }
      } finally {
        setIsLoadingAccess(false); // Loading beendet
      }
    };
    loadUserData();
  }, []);

  const { data: songs = [] } = useQuery({
    queryKey: ['songs', currentOrgId],
    queryFn: () => base44.entities.Song.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const { data: setlists = [] } = useQuery({
    queryKey: ['setlists', currentOrgId],
    queryFn: () => base44.entities.Setliste.filter({ org_id: currentOrgId }, '-created_date'),
    enabled: !!currentOrgId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', currentOrgId],
    queryFn: () => base44.entities.Event.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  // Lade EventMusiker wenn Musiker
  const { data: eventMusiker = [], isLoading: isLoadingEventMusiker } = useQuery({
    queryKey: ['eventMusiker', currentMusiker?.id],
    queryFn: async () => {
      const result = await base44.entities.EventMusiker.filter({ 
        musiker_id: currentMusiker.id,
        status: 'zugesagt'
      });
      return result;
    },
    enabled: !!currentMusiker?.id,
  });

  const createSongMutation = useMutation({
    mutationFn: async (data) => {
      console.log('🎵 Creating song with data:', data, 'org_id:', currentOrgId);
      const result = await base44.entities.Song.create({ ...data, org_id: currentOrgId });
      console.log('✅ Song created successfully:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setShowSongForm(false);
      setEditingSong(null);
    },
    onError: (error) => {
      console.error('❌ Error creating song:', error);
      alert('Fehler beim Speichern des Songs: ' + error.message);
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
    onSuccess: async (createdSetlist) => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      
      // Wenn Setlist einem Event zugeordnet ist, Musiker benachrichtigen
      if (createdSetlist.event_id) {
        try {
          const zugesagteMusiker = await base44.entities.EventMusiker.filter({ 
            event_id: createdSetlist.event_id, 
            status: 'zugesagt' 
          });
          
          const event = events.find(e => e.id === createdSetlist.event_id);
          
          for (const em of zugesagteMusiker) {
            const mitgliedschaften = await base44.entities.Mitglied.filter({
              org_id: currentOrgId,
              musiker_id: em.musiker_id,
              status: "aktiv"
            });
            
            if (mitgliedschaften.length > 0 && mitgliedschaften[0].user_id) {
              await base44.entities.Benachrichtigung.create({
                org_id: currentOrgId,
                user_id: mitgliedschaften[0].user_id,
                typ: 'setlist_update',
                titel: `🎵 Neue Setlist: ${createdSetlist.name}`,
                nachricht: `Eine neue Setlist "${createdSetlist.name}" wurde für das Event "${event?.titel}" erstellt.`,
                link_url: `${createPageUrl('Repertoire')}`,
                bezug_typ: 'event',
                bezug_id: createdSetlist.event_id,
                icon: 'Music',
                prioritaet: 'normal'
              });
            }
          }
        } catch (error) {
          console.error("Fehler beim Senden der Setlist-Benachrichtigungen:", error);
        }
      }
      
      setShowSetlistForm(false);
      setEditingSetlist(null);
    },
  });

  const updateSetlistMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Setliste.update(id, data),
    onSuccess: async (updatedSetlist, variables) => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      
      // Wenn Setlist einem Event zugeordnet ist, Musiker benachrichtigen
      const setlist = setlists.find(s => s.id === variables.id);
      const eventId = updatedSetlist.event_id || setlist?.event_id;
      
      if (eventId) {
        try {
          const zugesagteMusiker = await base44.entities.EventMusiker.filter({ 
            event_id: eventId, 
            status: 'zugesagt' 
          });
          
          const event = events.find(e => e.id === eventId);
          
          for (const em of zugesagteMusiker) {
            const mitgliedschaften = await base44.entities.Mitglied.filter({
              org_id: currentOrgId,
              musiker_id: em.musiker_id,
              status: "aktiv"
            });
            
            if (mitgliedschaften.length > 0 && mitgliedschaften[0].user_id) {
              await base44.entities.Benachrichtigung.create({
                org_id: currentOrgId,
                user_id: mitgliedschaften[0].user_id,
                typ: 'setlist_update',
                titel: `🎵 Setlist aktualisiert: ${setlist?.name || 'Unbekannt'}`,
                nachricht: `Die Setlist "${setlist?.name}" für das Event "${event?.titel}" wurde aktualisiert.`,
                link_url: `${createPageUrl('Repertoire')}`,
                bezug_typ: 'event',
                bezug_id: eventId,
                icon: 'Music',
                prioritaet: 'normal'
              });
            }
          }
        } catch (error) {
          console.error("Fehler beim Senden der Setlist-Benachrichtigungen:", error);
        }
      }
      
      setShowSetlistForm(false);
      setEditingSetlist(null);
    },
  });

  const deleteSetlistMutation = useMutation({
    mutationFn: async (id) => {
      const setlist = setlists.find(s => s.id === id);
      await base44.entities.Setliste.delete(id);
      return setlist;
    },
    onSuccess: async (deletedSetlist) => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      
      // Wenn Setlist einem Event zugeordnet war, Musiker benachrichtigen
      if (deletedSetlist?.event_id) {
        try {
          const zugesagteMusiker = await base44.entities.EventMusiker.filter({ 
            event_id: deletedSetlist.event_id, 
            status: 'zugesagt' 
          });
          
          const event = events.find(e => e.id === deletedSetlist.event_id);
          
          for (const em of zugesagteMusiker) {
            const mitgliedschaften = await base44.entities.Mitglied.filter({
              org_id: currentOrgId,
              musiker_id: em.musiker_id,
              status: "aktiv"
            });
            
            if (mitgliedschaften.length > 0 && mitgliedschaften[0].user_id) {
              await base44.entities.Benachrichtigung.create({
                org_id: currentOrgId,
                user_id: mitgliedschaften[0].user_id,
                typ: 'setlist_update',
                titel: `🗑️ Setlist entfernt: ${deletedSetlist.name}`,
                nachricht: `Die Setlist "${deletedSetlist.name}" für das Event "${event?.titel}" wurde entfernt.`,
                link_url: `${createPageUrl('Repertoire')}`,
                bezug_typ: 'event',
                bezug_id: deletedSetlist.event_id,
                icon: 'Music',
                prioritaet: 'normal'
              });
            }
          }
        } catch (error) {
          console.error("Fehler beim Senden der Setlist-Benachrichtigungen:", error);
        }
      }
    },
  });

  // Filter Events und Setlisten basierend auf Rolle
  const visibleEvents = isManager 
    ? events 
    : events.filter(event => {
        // Musiker sieht nur Events bei denen er teilnimmt
        return eventMusiker.some(em => em.event_id === event.id);
      });

  const visibleSetlists = isManager
    ? setlists
    : setlists.filter(setlist => {
        // Musiker sieht nur Setlisten von seinen Events
        return visibleEvents.some(e => e.id === setlist.event_id);
      });

  // Musiker sehen das Repertoire NUR wenn eine Setliste einem ihrer zugesagten Events zugewiesen ist
  const hasAccess = isManager || (currentMusiker && visibleSetlists.length > 0);

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

  // Für Musiker: Nur Songs aus ihren zugewiesenen Setlisten
  const visibleSongs = isManager
    ? songs
    : songs.filter(song => {
        // Prüfe ob der Song in einer der sichtbaren Setlisten enthalten ist
        return visibleSetlists.some(setlist => 
          setlist.songs?.some(s => s.song_id === song.id)
        );
      });

  const filteredSongs = visibleSongs.filter(s => {
    const matchesSearch = s.titel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.kuenstler_original?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = genreFilter === "alle" || s.tags?.includes(genreFilter);
    return matchesSearch && matchesGenre;
  });

  const filteredSetlists = visibleSetlists.filter(s => 
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

  const handlePrintSetlist = (setlist) => {
    const event = events.find(e => e.id === setlist.event_id);
    const setlistSongs = setlist.songs?.sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map(s => songs.find(song => song.id === s.song_id))
      .filter(Boolean) || [];

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${setlist.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 28px; margin-bottom: 8px; color: #1a1a1a; }
          .event-info { color: #666; margin-bottom: 24px; font-size: 14px; }
          .meta { display: flex; gap: 24px; margin-bottom: 24px; padding: 12px; background: #f5f5f5; border-radius: 8px; }
          .meta-item { font-size: 13px; color: #555; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #333; font-size: 12px; text-transform: uppercase; color: #666; }
          td { padding: 12px 8px; border-bottom: 1px solid #eee; }
          .num { width: 40px; color: #999; }
          .title { font-weight: 500; }
          .artist { color: #666; font-size: 14px; }
          .key { text-align: center; background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .bpm { text-align: center; color: #666; }
          .duration { text-align: right; color: #666; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>${setlist.name}</h1>
        ${event ? `<div class="event-info">${event.titel} - ${new Date(event.datum_von).toLocaleDateString('de-DE')}</div>` : ''}
        <div class="meta">
          <div class="meta-item"><strong>${setlistSongs.length}</strong> Songs</div>
          <div class="meta-item"><strong>${setlist.gesamtdauer || 0}</strong> Minuten</div>
        </div>
        ${setlist.beschreibung ? `<p style="margin-bottom: 24px; color: #555;">${setlist.beschreibung}</p>` : ''}
        <table>
          <thead>
            <tr>
              <th class="num">#</th>
              <th>Titel</th>
              <th>Künstler</th>
              <th style="text-align: center;">Tonart</th>
              <th style="text-align: center;">BPM</th>
              <th style="text-align: right;">Länge</th>
            </tr>
          </thead>
          <tbody>
            ${setlistSongs.map((song, index) => `
              <tr>
                <td class="num">${index + 1}</td>
                <td class="title">${song.titel}</td>
                <td class="artist">${song.kuenstler_original || '-'}</td>
                <td style="text-align: center;">${song.tonart ? `<span class="key">${song.tonart}</span>` : '-'}</td>
                <td class="bpm">${song.bpm || '-'}</td>
                <td class="duration">${song.laenge || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">Gedruckt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const allGenres = [...new Set(songs.flatMap(s => s.tags || []))];

  // Loading während User-Daten und Berechtigungen geladen werden
  if (isLoadingAccess || (currentMusiker && isLoadingEventMusiker)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade...</p>
      </div>
    );
  }

  // Basic Check: Org und User müssen geladen sein
  if (!currentOrgId || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade...</p>
      </div>
    );
  }

  // Wenn Musiker ohne Zugriff (keine Setliste an zugesagten Events)
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h3 className="text-lg font-semibold mb-2">Kein Zugriff auf Repertoire</h3>
            <p className="text-sm text-gray-600">
              Du siehst das Repertoire, sobald eine Setliste einem deiner zugesagten Events zugewiesen wurde.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Repertoire</h1>
          <p className="text-gray-600">
            {isManager ? 'Verwalte deine Songs und Setlisten' : 'Songs und Setlisten deiner Events'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="bibliothek" className="gap-2">
            <Music className="w-4 h-4" />
            Song-Bibliothek
            <Badge variant="secondary" className="ml-2">{visibleSongs.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="setlists" className="gap-2">
              <List className="w-4 h-4" />
              Setlisten
              <Badge variant="secondary" className="ml-2">{visibleSetlists.length}</Badge>
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
                      : `Du siehst ${visibleSongs.length} Songs aus deinen Setlisten`
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
                    style={{ backgroundColor: '#223a5e' }}
                    className="hover:opacity-90"
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

            {/* Song-Tabelle */}
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
                      <th className="text-left p-4 font-semibold text-gray-700">Dateien</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Aktionen</th>
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
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {song.lead_sheet_url && (
                                <a
                                  href={song.lead_sheet_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Lead Sheet"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  📄
                                </a>
                              )}
                              {song.noten_dateien?.length > 0 && song.noten_dateien.map((datei, i) => (
                                <a
                                  key={i}
                                  href={datei.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={datei.name}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  🎼
                                </a>
                              ))}
                              {!song.lead_sheet_url && (!song.noten_dateien || song.noten_dateien.length === 0) && '-'}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              {isManager && (
                                <>
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
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" className="p-12 text-center">
                          <Music className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-semibold mb-2">Keine Songs gefunden</h3>
                          <p className="text-gray-500 mb-4">
                            {isManager ? "Füge deinen ersten Song hinzu" : "Für dieses Repertoire sind noch keine Songs verfügbar."}
                          </p>
                          {isManager && (
                            <Button onClick={() => setShowSongForm(true)}>
                              <Plus className="w-4 h-4 mr-2" />
                              Song hinzufügen
                            </Button>
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
                      : `Du siehst ${visibleSetlists.length} Setlisten für deine Events`
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
                  style={{ backgroundColor: '#223a5e' }}
                  className="hover:opacity-90"
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

            {/* Setlist Cards */}
            {filteredSetlists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSetlists.map((setlist) => {
                const event = visibleEvents.find(e => e.id === setlist.event_id);
                const songCount = setlist.songs?.length || 0;
                const setlistSongs = setlist.songs?.map(s => songs.find(song => song.id === s.song_id)).filter(Boolean) || [];

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

                    {/* Drucken Button für alle */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintSetlist(setlist)}
                      className="w-full gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Setliste drucken / PDF
                    </Button>

                    {/* Song-Liste für alle sichtbar */}
                    {setlistSongs.length > 0 && (
                      <div className="pt-3 border-t space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Songs in dieser Setliste:</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {setlist.songs?.sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)).map((s, index) => {
                            const songData = songs.find(song => song.id === s.song_id);
                            if (!songData) return null;
                            return (
                              <div key={s.song_id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                                <span className="text-gray-400 w-5 text-center">{index + 1}.</span>
                                <span className="font-medium flex-1">{songData.titel}</span>
                                {songData.tonart && (
                                  <Badge variant="outline" className="text-xs">{songData.tonart}</Badge>
                                )}
                                {songData.lead_sheet_url && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-blue-600"
                                    onClick={() => window.open(songData.lead_sheet_url, '_blank')}
                                  >
                                    Noten
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {isManager && (
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          variant="default"
                          className="flex-1 hover:opacity-90"
                          style={{ backgroundColor: '#223a5e' }}
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
                  <p className="text-gray-500 mb-4">
                    {isManager ? 'Erstelle deine erste Setlist' : 'Keine Setlisten für deine Events'}
                  </p>
                  {isManager && (
                    <Button onClick={() => setShowSetlistForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Neue Setlist
                    </Button>
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