import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Clock, MapPin, Music, Euro, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function MeineEventsPage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMusiker, setCurrentMusiker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
  const getEventForEventMusiker = (em) => {
    return events.find(e => e.id === em.event_id);
  };

  const handleNavigateToEvent = (eventId) => {
    navigate(createPageUrl(`EventDetail?id=${eventId}`));
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

  const eventStatusColors = {
        entwurf: { bg: "bg-gray-100", text: "text-gray-700", label: "Entwurf" },
        angefragt: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Angefragt" },
        bestätigt: { bg: "bg-green-100", text: "text-green-800", label: "Bestätigt" },
        durchgeführt: { bg: "bg-blue-100", text: "text-blue-800", label: "Durchgeführt" },
        abgerechnet: { bg: "bg-purple-100", text: "text-purple-800", label: "Abgerechnet" },
        storniert: { bg: "bg-red-100", text: "text-red-800", label: "Storniert" }
      };

      const EventListItem = ({ em }) => {
        const event = getEventForEventMusiker(em);
        if (!event) return null;

        const isPast = new Date(event.datum_von) < now;
        const eventStatus = eventStatusColors[event.status] || eventStatusColors.entwurf;

        return (
          <div
            onClick={() => handleNavigateToEvent(event.id)}
            className={`group flex items-center gap-4 p-4 border-l-4 ${
              isPast ? 'border-l-gray-400' : 'border-l-green-500'
            } bg-white hover:bg-gray-50 transition-all cursor-pointer rounded-lg shadow-sm ${
              isPast ? 'opacity-75' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-lg text-gray-900 truncate">{event.titel}</h3>
                <Badge className={`${eventStatus.bg} ${eventStatus.text} flex-shrink-0`}>
                  {eventStatus.label}
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
          </div>
          </div>
          );
          }