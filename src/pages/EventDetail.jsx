import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Edit,
  Mail,
  ExternalLink,
  Clock,
  Users as UsersIcon,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import EventForm from "@/components/events/EventForm";

export default function EventDetailPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ id: eventId });
      return events[0];
    },
    enabled: !!eventId,
  });

  const { data: kunde } = useQuery({
    queryKey: ['kunde', event?.kunde_id],
    queryFn: async () => {
      if (!event?.kunde_id) return null;
      const kunden = await base44.entities.Kunde.filter({ id: event.kunde_id });
      return kunden[0];
    },
    enabled: !!event?.kunde_id,
  });

  const { data: kunden = [] } = useQuery({
    queryKey: ['kunden', event?.org_id],
    queryFn: () => base44.entities.Kunde.filter({ org_id: event.org_id }),
    enabled: !!event?.org_id,
  });

  const { data: eventMusiker = [] } = useQuery({
    queryKey: ['eventMusiker', eventId],
    queryFn: () => base44.entities.EventMusiker.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const updateEventMutation = useMutation({
    mutationFn: async (eventData) => {
      console.log("Aktualisiere Event:", eventData);
      return await base44.entities.Event.update(eventId, eventData);
    },
    onSuccess: (data) => {
      console.log("Event erfolgreich aktualisiert:", data);
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error("Fehler beim Aktualisieren:", error);
      alert("Fehler beim Aktualisieren des Events: " + (error.message || "Unbekannter Fehler"));
    }
  });

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade Event...</p>
      </div>
    );
  }

  const statusColors = {
    entwurf: { bg: "bg-gray-100", text: "text-gray-800", label: "Entwurf" },
    angefragt: { bg: "bg-orange-100", text: "text-orange-800", label: "Wartet auf Musiker" },
    bestätigt: { bg: "bg-green-100", text: "text-green-800", label: "Bestätigt" },
    durchgeführt: { bg: "bg-blue-100", text: "text-blue-800", label: "Durchgeführt" },
    abgerechnet: { bg: "bg-purple-100", text: "text-purple-800", label: "Abgerechnet" },
    storniert: { bg: "bg-red-100", text: "text-red-800", label: "Storniert" }
  };

  const statusInfo = statusColors[event.status] || statusColors.entwurf;

  const handleAddToCalendar = () => {
    const startDate = new Date(event.datum_von);
    const endDate = new Date(event.datum_bis);
    
    const formatDateForCalendar = (date) => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, '');
    };

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.titel)}&dates=${formatDateForCalendar(startDate)}/${formatDateForCalendar(endDate)}&details=${encodeURIComponent(event.oeffentliche_notizen || '')}&location=${encodeURIComponent(event.ort_adresse || event.ort_name || '')}`;
    
    window.open(calendarUrl, '_blank');
  };

  const handleContactCustomer = () => {
    if (kunde?.email) {
      window.location.href = `mailto:${kunde.email}?subject=${encodeURIComponent('Event: ' + event.titel)}`;
    }
  };

  const openInMaps = () => {
    const address = event.ort_adresse || event.ort_name;
    if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  const handleUpdateSubmit = (data) => {
    updateEventMutation.mutate(data);
  };

  // Wenn im Bearbeitungsmodus, zeige das Formular
  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="gap-2 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Übersicht
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Event bearbeiten</h1>
            <p className="text-gray-600">{event.titel}</p>
          </div>
          <EventForm
            event={event}
            onSubmit={handleUpdateSubmit}
            onCancel={() => setIsEditing(false)}
            kunden={kunden}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          {/* Back Button & Status */}
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl('Events'))}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            <Badge className={`${statusInfo.bg} ${statusInfo.text} border-none px-3 py-1`}>
              {statusInfo.label}
            </Badge>
          </div>

          {/* Title & Actions */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{event.titel}</h1>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddToCalendar}
                className="gap-2"
              >
                <Calendar className="w-4 h-4" />
                Zu Google Kalender hinzufügen
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2 bg-gray-900 hover:bg-gray-800"
              >
                <Edit className="w-4 h-4" />
                Event bearbeiten
              </Button>
              {kunde && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleContactCustomer}
                  className="gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Kunde per E-Mail kontaktieren
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border-b border-gray-200 p-0 h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
              Übersicht
            </TabsTrigger>
            <TabsTrigger value="musiker" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
              Musiker
            </TabsTrigger>
            <TabsTrigger value="bandbuilder" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
              Band Builder
            </TabsTrigger>
            <TabsTrigger value="aufgaben" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
              Aufgaben
            </TabsTrigger>
            <TabsTrigger value="finanzen" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
              Finanzen
            </TabsTrigger>
            <TabsTrigger value="verwaltung" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
              Verwaltung
            </TabsTrigger>
          </TabsList>

          {/* Übersicht Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Details Card */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b bg-white">
                <CardTitle className="text-xl font-bold">Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Datum */}
                  <div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Datum</p>
                        <p className="font-semibold text-gray-900">
                          {format(new Date(event.datum_von), 'dd. MMMM yyyy', { locale: de })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Veranstaltungsort */}
                  <div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Veranstaltungsort</p>
                        <p className="font-semibold text-gray-900">{event.ort_name || 'Nicht angegeben'}</p>
                        {event.ort_adresse && (
                          <p className="text-sm text-gray-600 mt-0.5">{event.ort_adresse}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Kunde */}
                  <div>
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Kunde</p>
                        <p className="font-semibold text-gray-900">
                          {kunde ? kunde.firmenname : 'No Client Linked'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Location Card */}
            {(event.ort_name || event.ort_adresse) && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="border-b bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-gray-700" />
                      <CardTitle className="text-xl font-bold">Event Location</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openInMaps}
                      className="gap-2 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Maps
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 bg-white">
                  <p className="text-gray-700 mb-4 font-medium">{event.ort_adresse || event.ort_name}</p>
                  
                  {/* Map Placeholder */}
                  <div className="bg-gray-100 rounded-lg p-12 text-center border border-gray-200">
                    <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 font-medium mb-2">{event.ort_adresse || event.ort_name}</p>
                    <button
                      onClick={openInMaps}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      View on Google Maps
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Platzhalter für andere Tabs */}
          <TabsContent value="musiker">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Musiker-Verwaltung</h3>
                <p className="text-gray-500">Diese Funktion wird in Kürze verfügbar sein</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bandbuilder">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Band Builder</h3>
                <p className="text-gray-500">Diese Funktion wird in Kürze verfügbar sein</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aufgaben">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Aufgaben</h3>
                <p className="text-gray-500">Diese Funktion wird in Kürze verfügbar sein</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finanzen">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Finanzen</h3>
                <p className="text-gray-500">Diese Funktion wird in Kürze verfügbar sein</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verwaltung">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Verwaltung</h3>
                <p className="text-gray-500">Diese Funktion wird in Kürze verfügbar sein</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}