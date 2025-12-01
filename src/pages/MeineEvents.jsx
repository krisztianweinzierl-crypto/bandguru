import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, Music, Euro, AlertCircle, Users, Shirt, CheckCircle2, ChevronRight, Hotel, ExternalLink, FileText, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function MeineEventsPage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMusiker, setCurrentMusiker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedEventMusiker, setSelectedEventMusiker] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        const orgId = localStorage.getItem('currentOrgId');
        setCurrentOrgId(orgId);
        
        const user = await base44.auth.me();
        setCurrentUser(user);

        // Lade alle Musiker der Organisation
        const alleMusiker = await base44.entities.Musiker.filter({ 
          org_id: orgId
        });

        // Finde Musiker über E-Mail
        const gefundenerMusiker = alleMusiker.find(m => 
          m.email?.toLowerCase().trim() === user.email.toLowerCase().trim() && 
          m.aktiv === true
        );

        if (gefundenerMusiker) {
          setCurrentMusiker(gefundenerMusiker);
        }
      } catch (error) {
        console.error("Fehler beim Laden:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const { data: eventMusiker = [] } = useQuery({
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

  const { data: events = [] } = useQuery({
    queryKey: ['events', eventMusiker],
    queryFn: async () => {
      const eventIds = [...new Set(eventMusiker.map(em => em.event_id))];
      const eventsPromises = eventIds.map(id => 
        base44.entities.Event.filter({ id }).then(res => res[0])
      );
      const result = await Promise.all(eventsPromises);
      return result.filter(e => e);
    },
    enabled: eventMusiker.length > 0,
  });

  // Lade Dokumente für Events
  const { data: eventDateien = [] } = useQuery({
    queryKey: ['eventDateien', events],
    queryFn: async () => {
      const eventIds = events.map(e => e.id);
      const allDateien = await base44.entities.Datei.filter({ 
        org_id: currentOrgId,
        bezug_typ: 'event'
      });
      return allDateien.filter(d => eventIds.includes(d.bezug_id));
    },
    enabled: events.length > 0 && !!currentOrgId,
  });

  const getDateienForEvent = (eventId) => {
    return eventDateien.filter(d => d.bezug_id === eventId);
  };

  const openGoogleMaps = (address) => {
    if (!address) return;
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const getEventForEventMusiker = (em) => {
    return events.find(e => e.id === em.event_id);
  };

  const handleOpenDetailsDialog = (em) => {
    setSelectedEventMusiker(em);
    setShowDetailsDialog(true);
  };

  const sortedEventMusiker = [...eventMusiker].sort((a, b) => {
    const eventA = getEventForEventMusiker(a);
    const eventB = getEventForEventMusiker(b);
    if (!eventA || !eventB) return 0;
    return new Date(eventA.datum_von) - new Date(eventB.datum_von);
  });

  const now = new Date();
  const upcomingEvents = sortedEventMusiker.filter(em => {
    const event = getEventForEventMusiker(em);
    return event && new Date(event.datum_von) >= now;
  });

  const pastEvents = sortedEventMusiker.filter(em => {
    const event = getEventForEventMusiker(em);
    return event && new Date(event.datum_von) < now;
  });

  const EventListItem = ({ em }) => {
    const event = getEventForEventMusiker(em);
    if (!event) return null;

    const isPast = new Date(event.datum_von) < now;

    return (
      <div
        onClick={() => handleOpenDetailsDialog(em)}
        className={`group flex items-center gap-4 p-4 border-l-4 ${
          isPast ? 'border-l-gray-400' : 'border-l-green-500'
        } bg-white hover:bg-gray-50 transition-all cursor-pointer rounded-lg ${
          isPast ? 'opacity-75' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg text-gray-900 truncate">{event.titel}</h3>
            <Badge className="bg-green-100 text-green-800 flex-shrink-0">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Zugesagt
            </Badge>
            {isPast && (
              <Badge variant="outline" className="text-gray-600 flex-shrink-0">
                Vergangen
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(event.datum_von), 'dd. MMM yyyy', { locale: de })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{format(new Date(event.datum_von), 'HH:mm', { locale: de })} Uhr</span>
            </div>
            {event.ort_name && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[200px]">{event.ort_name}</span>
              </div>
            )}
            {em.rolle && (
              <div className="flex items-center gap-1.5">
                <Music className="w-4 h-4" />
                <span className="font-medium">{em.rolle}</span>
              </div>
            )}
            {em.gage_netto && (
              <div className="flex items-center gap-1.5 font-semibold text-green-600">
                <Euro className="w-4 h-4" />
                <span>€{em.gage_netto.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Music className="w-16 h-16 mx-auto mb-4 text-purple-500 animate-pulse" />
            <h3 className="text-lg font-semibold mb-2">Lade Events...</h3>
            <p className="text-sm text-gray-500">Bitte warten</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentMusiker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h3 className="text-lg font-semibold mb-2">Kein Musiker-Profil gefunden</h3>
            <p className="text-sm text-gray-600">
              Bitte kontaktiere deinen Band Manager, um ein Musiker-Profil zu erstellen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Meine Events 🎵
          </h1>
          <p className="text-gray-600">Alle Events, bei denen du zugesagt hast</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Kommende Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-600">{upcomingEvents.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Gesamt zugesagt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-blue-600">{eventMusiker.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Vergangene Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-purple-600">{pastEvents.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="upcoming">
              Kommend ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Vergangen ({pastEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-3">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((em) => (
                <EventListItem key={em.id} em={em} />
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">Keine kommenden Events</h3>
                  <p className="text-gray-500">Du hast aktuell keine bestätigten Events</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3">
            {pastEvents.length > 0 ? (
              pastEvents.map((em) => (
                <EventListItem key={em.id} em={em} />
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">Keine vergangenen Events</h3>
                  <p className="text-gray-500">Du hast noch keine abgeschlossenen Events</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedEventMusiker && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <DialogTitle className="text-2xl mb-2">
                        {getEventForEventMusiker(selectedEventMusiker)?.titel}
                      </DialogTitle>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Zugesagt
                      </Badge>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {(() => {
                    const event = getEventForEventMusiker(selectedEventMusiker);
                    const dateien = getDateienForEvent(event?.id);
                    
                    return (
                      <>
                        {/* Event Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-5 h-5 flex-shrink-0" />
                            <span>{format(new Date(event.datum_von), 'dd. MMMM yyyy', { locale: de })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-5 h-5 flex-shrink-0" />
                            <span>{format(new Date(event.datum_von), 'HH:mm', { locale: de })} Uhr</span>
                          </div>
                          {selectedEventMusiker.rolle && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Music className="w-5 h-5 flex-shrink-0" />
                              <span className="font-medium">{selectedEventMusiker.rolle}</span>
                            </div>
                          )}
                          {selectedEventMusiker.gage_netto && (
                            <div className="flex items-center gap-2 text-green-600 font-semibold">
                              <Euro className="w-5 h-5 flex-shrink-0" />
                              <span>€{selectedEventMusiker.gage_netto.toFixed(2)}</span>
                              {selectedEventMusiker.spesen > 0 && (
                                <span className="text-gray-500 font-normal text-sm">
                                  (+ €{selectedEventMusiker.spesen.toFixed(2)} Reisekosten)
                                </span>
                              )}
                            </div>
                          )}
                          {selectedEventMusiker.calltime && (
                            <div className="flex items-center gap-2 text-orange-600">
                              <Clock className="w-5 h-5 flex-shrink-0" />
                              <span className="font-medium">Calltime: {format(new Date(selectedEventMusiker.calltime), 'HH:mm', { locale: de })} Uhr</span>
                            </div>
                          )}
                        </div>

                        {/* Location mit Google Maps */}
                        {(event.ort_name || event.ort_adresse) && (
                          <div className="pt-4 border-t">
                            <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Location</p>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              {event.ort_name && (
                                <p className="font-semibold text-gray-900">{event.ort_name}</p>
                              )}
                              {event.ort_adresse && (
                                <p className="text-gray-600 mt-1">{event.ort_adresse}</p>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openGoogleMaps(event.ort_adresse || event.ort_name)}
                                className="mt-3 gap-2"
                              >
                                <MapPin className="w-4 h-4" />
                                In Google Maps öffnen
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Ablaufplan / Schedule */}
                        {(event.get_in_zeit || event.soundcheck_zeit) && (
                          <div className="pt-4 border-t">
                            <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Ablaufplan</p>
                            <div className="space-y-2">
                              {event.get_in_zeit && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                  <Clock className="w-5 h-5 text-gray-500" />
                                  <div>
                                    <p className="text-sm text-gray-500">Get-In</p>
                                    <p className="font-semibold">{event.get_in_zeit} Uhr</p>
                                  </div>
                                </div>
                              )}
                              {event.soundcheck_zeit && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                  <Wrench className="w-5 h-5 text-gray-500" />
                                  <div>
                                    <p className="text-sm text-gray-500">Soundcheck</p>
                                    <p className="font-semibold">{event.soundcheck_zeit} Uhr</p>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <Music className="w-5 h-5 text-green-600" />
                                <div>
                                  <p className="text-sm text-green-600">Showbeginn</p>
                                  <p className="font-semibold text-green-700">{format(new Date(event.datum_von), 'HH:mm', { locale: de })} Uhr</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Publikum & Ambiente */}
                        {(event.event_typ || event.anzahl_gaeste || event.dresscode) && (
                          <div className="pt-4 border-t">
                            <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Details</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {event.event_typ && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <span className="text-xl">🎉</span>
                                  <span>{event.event_typ}</span>
                                </div>
                              )}
                              {event.anzahl_gaeste && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Users className="w-5 h-5" />
                                  <span>{event.anzahl_gaeste} Gäste</span>
                                </div>
                              )}
                              {event.dresscode && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Shirt className="w-5 h-5" />
                                  <span>{event.dresscode}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Notizen */}
                        {selectedEventMusiker.notizen && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm font-semibold text-blue-900 mb-2">Notizen:</p>
                            <p className="text-sm text-blue-700">{selectedEventMusiker.notizen}</p>
                          </div>
                        )}

                        {/* Hotel mit Google Maps */}
                        {event.hotel_name && (
                          <div className="pt-4 border-t">
                            <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Hotel</p>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <Hotel className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">{event.hotel_name}</p>
                                  {event.hotel_adresse && (
                                    <p className="text-gray-600 mt-1">{event.hotel_adresse}</p>
                                  )}
                                </div>
                              </div>
                              {event.hotel_adresse && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openGoogleMaps(event.hotel_adresse)}
                                  className="mt-3 gap-2"
                                >
                                  <MapPin className="w-4 h-4" />
                                  In Google Maps öffnen
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Technik */}
                        {event.technik_hinweise && (
                          <div className="pt-4 border-t">
                            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Technik</p>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-gray-700 whitespace-pre-wrap">{event.technik_hinweise}</p>
                            </div>
                          </div>
                        )}

                        {/* Dokumente */}
                        {dateien.length > 0 && (
                          <div className="pt-4 border-t">
                            <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Dokumente</p>
                            <div className="space-y-2">
                              {dateien.map((datei) => (
                                <a
                                  key={datei.id}
                                  href={datei.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <FileText className="w-5 h-5 text-blue-600" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{datei.file_name}</p>
                                    {datei.beschreibung && (
                                      <p className="text-sm text-gray-500 truncate">{datei.beschreibung}</p>
                                    )}
                                  </div>
                                  <ExternalLink className="w-4 h-4 text-gray-400" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}