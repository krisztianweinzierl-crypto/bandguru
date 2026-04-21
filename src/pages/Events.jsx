import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Calendar, Search, Filter, MapPin, Clock, User, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import EventForm from "@/components/events/EventForm";

export default function EventsPage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMusiker, setCurrentMusiker] = useState(null);
  const [isManager, setIsManager] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? "grid" : "list");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUserData = async () => {
      const orgId = localStorage.getItem('currentOrgId');
      setCurrentOrgId(orgId);

      const user = await base44.auth.me();
      setCurrentUser(user);

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
        const musikerProfil = alleMusiker.find((m) =>
        m.email?.toLowerCase().trim() === user.email.toLowerCase().trim() && m.aktiv === true
        );
        setCurrentMusiker(musikerProfil);
      }
    };
    loadUserData();
  }, []);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', currentOrgId],
    queryFn: () => base44.entities.Event.filter({ org_id: currentOrgId }, '-datum_von'),
    enabled: !!currentOrgId
  });

  const { data: kunden = [] } = useQuery({
    queryKey: ['kunden', currentOrgId],
    queryFn: () => base44.entities.Kunde.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId
  });

  // Lade EventMusiker wenn Musiker
  const { data: eventMusiker = [] } = useQuery({
    queryKey: ['eventMusiker', currentMusiker?.id],
    queryFn: async () => {
      const result = await base44.entities.EventMusiker.filter({
        musiker_id: currentMusiker.id,
        status: 'zugesagt'
      });
      return result;
    },
    enabled: !!currentMusiker?.id
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      if (!currentOrgId) {
        throw new Error("Keine Organisation ausgewählt. Bitte lade die Seite neu.");
      }

      const dataToSend = { ...eventData, org_id: currentOrgId };
      return await base44.entities.Event.create(dataToSend);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
    },
    onError: (error) => {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern des Events: " + (error.message || "Unbekannter Fehler"));
    }
  });

  // Filter Events basierend auf Rolle
  const visibleEvents = isManager ?
  events :
  events.filter((event) => {
    // Musiker sieht nur Events bei denen er teilnimmt
    return eventMusiker.some((em) => em.event_id === event.id);
  });

  const filteredEvents = visibleEvents.filter((event) => {
    const matchesSearch = event.titel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.ort_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "alle" || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const upcomingEvents = filteredEvents.filter((e) => new Date(e.datum_von) > new Date());
  const pastEvents = filteredEvents.filter((e) => new Date(e.datum_von) <= new Date());

  const statusColors = {
    anfrage: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-400", borderClass: "border-l-gray-400", label: "Anfrage" },
    angebot_erstellt: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-400", borderClass: "border-l-blue-400", label: "Angebot erstellt" },
    angebot_angenommen: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-400", borderClass: "border-l-indigo-400", label: "Angebot angenommen" },
    wartet_auf_bestaetigung: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-400", borderClass: "border-l-yellow-400", label: "Wartet auf Bestätigung" },
    angefragt: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-400", borderClass: "border-l-orange-400", label: "Wartet auf Musiker" },
    bestätigt: { bg: "bg-green-100", text: "text-green-800", border: "border-green-400", borderClass: "border-l-green-500", label: "Bestätigt" },
    abgesagt: { bg: "bg-red-100", text: "text-red-800", border: "border-red-400", borderClass: "border-l-red-400", label: "Abgesagt" },
    zurückgezogen: { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-400", borderClass: "border-l-slate-400", label: "Zurückgezogen" },
    durchgeführt: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-400", borderClass: "border-l-blue-400", label: "Durchgeführt" },
    abgerechnet: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-400", borderClass: "border-l-purple-400", label: "Abgerechnet" }
  };

  const handleSubmit = (data) => {
    createEventMutation.mutate(data);
  };

  const EventCard = ({ event }) => {
    const kunde = kunden.find((k) => k.id === event.kunde_id);
    const statusStyle = statusColors[event.status] || statusColors.anfrage;

    return (
      <Link to={createPageUrl(`EventDetail?id=${event.id}`)}>
        <Card className={`hover:shadow-lg transition-all duration-200 border-l-4 ${statusStyle.borderClass}`}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg mb-1 truncate">{event.titel}</CardTitle>
                <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(event.datum_von), 'dd. MMM yyyy', { locale: de })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(event.datum_von), 'HH:mm')} Uhr
                  </div>
                </div>
              </div>
              <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                {statusStyle.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {event.ort_name &&
              <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{event.ort_name}</span>
                </div>
              }
              {kunde &&
              <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{kunde.firmenname}</span>
                </div>
              }
            </div>
          </CardContent>
        </Card>
      </Link>);

  };

  const EventListItem = ({ event }) => {
    const kunde = kunden.find((k) => k.id === event.kunde_id);
    const statusStyle = statusColors[event.status] || statusColors.anfrage;

    return (
      <Link to={createPageUrl(`EventDetail?id=${event.id}`)}>
        <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 flex items-center gap-4 border-l-4 ${statusStyle.borderClass}`}>
          <div className="flex-shrink-0">
            <div className="bg-[#223a5e] text-white rounded-lg ] w-16 h-16 from-blue-500 to-indigo-600 flex flex-col items-center justify-center">
              <span className="text-xs font-medium">
                {format(new Date(event.datum_von), 'MMM', { locale: de }).toUpperCase()}
              </span>
              <span className="text-2xl font-bold">
                {format(new Date(event.datum_von), 'd')}
              </span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h3 className="font-semibold text-lg text-gray-900 truncate">{event.titel}</h3>
              <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} flex-shrink-0`}>
                {statusStyle.label}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {format(new Date(event.datum_von), 'HH:mm')} Uhr
              </div>
              {event.ort_name &&
              <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{event.ort_name}</span>
                </div>
              }
              {kunde &&
              <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span className="truncate">{kunde.firmenname}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </Link>);

  };

  if (!currentOrgId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Lade Organisation...</p>
          </CardContent>
        </Card>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3 md:p-8 overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Events</h1>
            <p className="text-gray-600">
              {isManager ? 'Verwalte alle deine Veranstaltungen' : 'Deine zugesagten Events'}
            </p>
          </div>
          {isManager &&
          <Button
            onClick={() => setShowForm(true)}
            className="text-white"
            style={{ backgroundColor: '#223a5e' }}>

              <Plus className="w-4 h-4 mr-2" />
              Event erstellen
            </Button>
          }
        </div>

        <Card className="mb-6 border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Events durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10" />

              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Status</SelectItem>
                  <SelectItem value="anfrage">Anfrage</SelectItem>
                  <SelectItem value="angebot_erstellt">Angebot erstellt</SelectItem>
                  <SelectItem value="angebot_angenommen">Angebot angenommen</SelectItem>
                  <SelectItem value="wartet_auf_bestaetigung">Wartet auf Bestätigung</SelectItem>
                  <SelectItem value="angefragt">Wartet auf Musiker</SelectItem>
                  <SelectItem value="bestätigt">Bestätigt</SelectItem>
                  <SelectItem value="abgesagt">Abgesagt</SelectItem>
                  <SelectItem value="zurückgezogen">Zurückgezogen</SelectItem>
                  <SelectItem value="durchgeführt">Durchgeführt</SelectItem>
                  <SelectItem value="abgerechnet">Abgerechnet</SelectItem>
                </SelectContent>
              </Select>
              
              {/* View Mode Toggle */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "bg-white shadow-sm" : ""}>

                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-white shadow-sm" : ""}>

                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {showForm && isManager &&
        <div className="mb-6">
            <EventForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            kunden={kunden} />

          </div>
        }

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger
              value="upcoming"
              className="data-[state=active]:text-white"
              style={{
                '--active-bg': '#223a5e'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.getAttribute('data-state').includes('active')) {
                  e.currentTarget.style.backgroundColor = 'rgba(34, 58, 94, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.getAttribute('data-state').includes('active')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              data-active-style="background-color: #223a5e">

              Anstehend ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger
              value="past"
              className="data-[state=active]:text-white"
              style={{
                '--active-bg': '#223a5e'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.getAttribute('data-state').includes('active')) {
                  e.currentTarget.style.backgroundColor = 'rgba(34, 58, 94, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.getAttribute('data-state').includes('active')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              data-active-style="background-color: #223a5e">

              Vergangen ({pastEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingEvents.length > 0 ?
            viewMode === "grid" ?
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingEvents.map((event) =>
              <EventCard key={event.id} event={event} />
              )}
                </div> :

            <div className="space-y-3">
                  {upcomingEvents.map((event) =>
              <EventListItem key={event.id} event={event} />
              )}
                </div> :


            <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">Keine anstehenden Events</h3>
                  <p className="text-gray-500 mb-4">
                    {isManager ? 'Erstelle dein erstes Event' : 'Du hast aktuell keine zugesagten Events'}
                  </p>
                  {isManager &&
                <Button onClick={() => setShowForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Event erstellen
                    </Button>
                }
                </CardContent>
              </Card>
            }
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastEvents.length > 0 ?
            viewMode === "grid" ?
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastEvents.map((event) =>
              <EventCard key={event.id} event={event} />
              )}
                </div> :

            <div className="space-y-3">
                  {pastEvents.map((event) =>
              <EventListItem key={event.id} event={event} />
              )}
                </div> :


            <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Keine vergangenen Events</p>
                </CardContent>
              </Card>
            }
          </TabsContent>
        </Tabs>
      </div>

      <style>{`
        [data-state="active"][data-active-style] {
          background-color: #223a5e !important;
        }
      `}</style>
    </div>);

}