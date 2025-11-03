import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, Music, Euro, AlertCircle, Users, Shirt, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function MeineEventsPage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMusiker, setCurrentMusiker] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
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

  const getEventForEventMusiker = (em) => {
    return events.find(e => e.id === em.event_id);
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

  const EventCard = ({ em }) => {
    const event = getEventForEventMusiker(em);
    if (!event) return null;

    const isPast = new Date(event.datum_von) < now;

    return (
      <Card className={`border-l-4 ${isPast ? 'border-l-gray-400 opacity-75' : 'border-l-green-500'} hover:shadow-lg transition-all`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <CardTitle className="text-lg mb-1">{event.titel}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Zugesagt
                </Badge>
                {isPast && (
                  <Badge variant="outline" className="text-gray-600">
                    Vergangen
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(event.datum_von), 'dd. MMMM yyyy', { locale: de })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{format(new Date(event.datum_von), 'HH:mm', { locale: de })} Uhr</span>
            </div>
            {event.ort_name && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{event.ort_name}</span>
              </div>
            )}
            {em.rolle && (
              <div className="flex items-center gap-2 text-gray-600">
                <Music className="w-4 h-4" />
                <span className="font-medium">{em.rolle}</span>
              </div>
            )}
            {em.gage_netto && (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <Euro className="w-4 h-4" />
                <span>€{em.gage_netto.toFixed(2)}</span>
              </div>
            )}
            {em.calltime && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Calltime: {format(new Date(em.calltime), 'HH:mm', { locale: de })}</span>
              </div>
            )}
          </div>

          {(event.event_typ || event.anzahl_gaeste || event.dresscode) && (
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {event.event_typ && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-lg">🎉</span>
                    <span>{event.event_typ}</span>
                  </div>
                )}
                {event.anzahl_gaeste && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{event.anzahl_gaeste} Gäste</span>
                  </div>
                )}
                {event.dresscode && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Shirt className="w-4 h-4" />
                    <span>{event.dresscode}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {event.ort_adresse && (
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Adresse</p>
              <p className="text-sm text-gray-600">{event.ort_adresse}</p>
            </div>
          )}

          {em.notizen && (
            <div className="p-3 bg-blue-50 rounded-lg border-t">
              <p className="text-xs font-semibold text-blue-900 mb-1">Notizen:</p>
              <p className="text-sm text-blue-800">{em.notizen}</p>
            </div>
          )}

          {event.hotel_name && (
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Hotel</p>
              <p className="text-sm text-gray-900 font-medium">{event.hotel_name}</p>
              {event.hotel_adresse && (
                <p className="text-sm text-gray-600">{event.hotel_adresse}</p>
              )}
            </div>
          )}

          {event.technik_hinweise && (
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Technik</p>
              <p className="text-sm text-gray-600">{event.technik_hinweise}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

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

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.map((em) => (
                  <EventCard key={em.id} em={em} />
                ))}
              </div>
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

          <TabsContent value="past" className="space-y-4">
            {pastEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastEvents.map((em) => (
                  <EventCard key={em.id} em={em} />
                ))}
              </div>
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
      </div>
    </div>
  );
}