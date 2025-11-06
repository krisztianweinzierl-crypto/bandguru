
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  X,
  Clock,
  MapPin,
  User,
  Users,
  Target,
  List as ListIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameDay, isSameMonth, isToday, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import EventForm from "@/components/events/EventForm";

export default function KalenderPage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMusiker, setCurrentMusiker] = useState(null);
  const [isManager, setIsManager] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // month, week, list
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterMusiker, setFilterMusiker] = useState("alle");
  const [filterLead, setFilterLead] = useState("alle");
  const [filterStatus, setFilterStatus] = useState("alle");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUserData = async () => {
      const orgId = localStorage.getItem('currentOrgId');
      setCurrentOrgId(orgId);

      const user = await base44.auth.me();
      setCurrentUser(user);

      if (!orgId || !user) return;

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
        // If current user is a musician, automatically filter by their events
        if (musikerProfil) {
          setFilterMusiker(musikerProfil.id);
        }
      } else {
        // If not a musician, ensure filterMusiker is 'alle'
        setFilterMusiker("alle");
      }
    };
    loadUserData();
  }, []);

  const { data: events = [] } = useQuery({
    queryKey: ['events', currentOrgId],
    queryFn: () => base44.entities.Event.filter({ org_id: currentOrgId }, '-datum_von'),
    enabled: !!currentOrgId,
  });

  const { data: musiker = [] } = useQuery({
    queryKey: ['musiker', currentOrgId],
    queryFn: () => base44.entities.Musiker.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', currentOrgId],
    queryFn: () => base44.entities.Lead.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const { data: kunden = [] } = useQuery({
    queryKey: ['kunden', currentOrgId],
    queryFn: () => base44.entities.Kunde.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const { data: eventMusiker = [] } = useQuery({
    queryKey: ['eventMusiker', currentOrgId, currentMusiker?.id, events.length > 0], // Depend on events.length to ensure events are fetched
    queryFn: async () => {
      if (!currentOrgId || !events || events.length === 0) return [];
      const allEventMusiker = await base44.entities.EventMusiker.filter({});
      
      // Filter EventMusiker records only for events belonging to this organization
      const orgEventIds = events.map(e => e.id);
      const filteredOrgEventMusiker = allEventMusiker.filter(em => orgEventIds.includes(em.event_id));
      
      // If current user is a musician, further filter to only include their 'zugesagt' events
      if (currentMusiker) {
        return filteredOrgEventMusiker.filter(em => 
          em.musiker_id === currentMusiker.id && em.status === 'zugesagt'
        );
      }
      return filteredOrgEventMusiker;
    },
    enabled: !!currentOrgId && events.length > 0, // Ensure events are loaded before fetching eventMusiker
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['eventMusiker'] }); // Invalidate eventMusiker too
      setShowEventForm(false);
      setSelectedDate(null);
    },
  });

  // Filter Events basierend auf Rolle
  const visibleEvents = isManager 
    ? events 
    : events.filter(event => {
        // Musiker sieht nur Events bei denen er teilnimmt und zugesagt hat
        return eventMusiker.some(em => em.event_id === event.id);
      });

  // Filter Events
  const filteredEvents = visibleEvents.filter(event => {
    // Status Filter
    if (filterStatus !== "alle" && event.status !== filterStatus) return false;

    // Musiker Filter (nur für Manager relevant, oder wenn ein Musiker explizit ausgewählt wurde)
    if (filterMusiker !== "alle") {
      const eventMusikerForEvent = eventMusiker.filter(em => em.event_id === event.id);
      const hasMusikerInEvent = eventMusikerForEvent.some(em => em.musiker_id === filterMusiker);
      if (!hasMusikerInEvent) return false;
    }
    
    // Lead Filter (über Kunde)
    if (filterLead !== "alle") {
      const lead = leads.find(l => l.id === filterLead);
      if (!lead || event.kunde_id !== lead.firmenname) return false; // Assuming kunde_id stores firmenname from lead
    }

    return true;
  });

  const getEventsForDate = (date) => {
    return filteredEvents.filter(event => {
      const eventDate = parseISO(event.datum_von);
      return isSameDay(eventDate, date);
    });
  };

  const getEventsForDateRange = (start, end) => {
    return filteredEvents.filter(event => {
      const eventDate = parseISO(event.datum_von);
      return eventDate >= start && eventDate <= end;
    });
  };

  const handlePrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else if (viewMode === "list") {
      setCurrentDate(subMonths(currentDate, 1)); // For list view, navigate by month
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else if (viewMode === "list") {
      setCurrentDate(addMonths(currentDate, 1)); // For list view, navigate by month
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date) => {
    // Only allow event creation for managers
    if (isManager) {
      setSelectedDate(date);
      setShowEventForm(true);
    } else {
      // Maybe show a message or just do nothing for non-managers
      // console.log("Only managers can create events.");
    }
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    navigate(createPageUrl(`EventDetail?id=${event.id}`));
  };

  const handleEventSubmit = (data) => {
    // Wenn ein Datum ausgewählt wurde, verwende es
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      data.datum_von = dateStr + 'T' + (data.datum_von?.split('T')[1] || '20:00:00');
      data.datum_bis = dateStr + 'T' + (data.datum_bis?.split('T')[1] || '23:59:00');
    }
    createEventMutation.mutate(data);
  };

  const statusColors = {
    entwurf: { bg: "bg-gray-400", text: "text-white" },
    angefragt: { bg: "bg-orange-400", text: "text-white" },
    bestätigt: { bg: "bg-green-500", text: "text-white" },
    durchgeführt: { bg: "bg-blue-400", text: "text-white" },
    abgerechnet: { bg: "bg-purple-400", text: "text-white" },
    storniert: { bg: "bg-red-400", text: "text-white" }
  };

  // Monatsansicht rendern
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayEvents = getEventsForDate(day);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isTodayDate = isToday(day);

        days.push(
          <div
            key={day.toString()}
            onClick={() => handleDateClick(cloneDay)}
            className={`min-h-32 border border-gray-200 p-2 cursor-pointer hover:bg-blue-50 transition-colors ${
              !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
            } ${isTodayDate ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className={`text-sm font-semibold mb-1 ${isTodayDate ? 'text-blue-600' : ''}`}>
              {format(day, 'd')}
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => {
                const statusStyle = statusColors[event.status] || statusColors.entwurf;
                const kunde = kunden.find(k => k.id === event.kunde_id);
                const eventMusikerList = eventMusiker.filter(em => em.event_id === event.id);
                
                return (
                  <div
                    key={event.id}
                    onClick={(e) => handleEventClick(event, e)}
                    className={`${statusStyle.bg} ${statusStyle.text} text-xs px-2 py-1 rounded truncate hover:opacity-90 transition-opacity relative group`}
                  >
                    <span className="truncate block">{format(parseISO(event.datum_von), 'HH:mm')} {event.titel}</span>
                    
                    {/* Hover Tooltip */}
                    <div className="absolute left-0 top-full mt-1 w-64 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none text-left">
                      <div className="space-y-2 text-gray-900">
                        <div className="font-bold text-sm border-b pb-2">{event.titel}</div>
                        
                        <div className="flex items-start gap-2 text-xs">
                          <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div>{format(parseISO(event.datum_von), 'HH:mm')} - {format(parseISO(event.datum_bis), 'HH:mm')} Uhr</div>
                            <div className="text-gray-600">{format(parseISO(event.datum_von), 'dd. MMM yyyy', { locale: de })}</div>
                          </div>
                        </div>
                        
                        {event.ort_name && (
                          <div className="flex items-start gap-2 text-xs">
                            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div>{event.ort_name}</div>
                              {event.ort_adresse && (
                                <div className="text-gray-600">{event.ort_adresse}</div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {kunde && (
                          <div className="flex items-start gap-2 text-xs">
                            <User className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div>{kunde.firmenname}</div>
                              {kunde.ansprechpartner && (
                                <div className="text-gray-600">{kunde.ansprechpartner}</div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {eventMusikerList.length > 0 && (
                          <div className="flex items-start gap-2 text-xs">
                            <Users className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-medium">{eventMusikerList.length} Musiker</div>
                              <div className="text-gray-600">
                                {eventMusikerList.filter(em => em.status === 'zugesagt').length} zugesagt
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2 border-t">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                            Status: {event.status}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 italic pt-1">
                          Klicken für Details →
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500 pl-2">
                  +{dayEvents.length - 3} weitere
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="space-y-0">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-200">
              {day}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  // Wochenansicht rendern
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = [];

    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayEvents = getEventsForDate(day);
      const isTodayDate = isToday(day);

      weekDays.push(
        <div key={day.toString()} className="flex-1 border-r border-gray-200 last:border-r-0">
          <div
            onClick={() => handleDateClick(day)}
            className={`p-3 border-b border-gray-200 text-center cursor-pointer hover:bg-blue-50 ${
              isTodayDate ? 'bg-blue-50 text-blue-600 font-bold' : ''
            }`}
          >
            <div className="text-xs text-gray-500">{format(day, 'EEE', { locale: de })}</div>
            <div className="text-xl">{format(day, 'd')}</div>
          </div>
          <div className="p-2 space-y-2 min-h-96">
            {dayEvents.map((event) => {
              const statusStyle = statusColors[event.status] || statusColors.entwurf;
              return (
                <div
                  key={event.id}
                  onClick={(e) => handleEventClick(event, e)}
                  className={`${statusStyle.bg} ${statusStyle.text} p-2 rounded cursor-pointer hover:opacity-80`}
                >
                  <div className="font-semibold text-sm">{event.titel}</div>
                  <div className="text-xs flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {format(parseISO(event.datum_von), 'HH:mm')}
                  </div>
                  {event.ort_name && (
                    <div className="text-xs flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3" />
                      {event.ort_name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return <div className="flex border border-gray-200 bg-white rounded-lg overflow-hidden">{weekDays}</div>;
  };

  // Listenansicht rendern
  const renderListView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthEvents = getEventsForDateRange(monthStart, monthEnd);

    // Gruppiere Events nach Datum
    const groupedEvents = monthEvents.reduce((acc, event) => {
      const dateKey = format(parseISO(event.datum_von), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    }, {});

    const sortedDates = Object.keys(groupedEvents).sort();

    return (
      <div className="space-y-4">
        {sortedDates.map(dateKey => {
          const date = parseISO(dateKey);
          const dayEvents = groupedEvents[dateKey];
          const isTodayDate = isToday(date);

          return (
            <Card key={dateKey} className={`border-none shadow-md ${isTodayDate ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  {format(date, 'EEEE, d. MMMM yyyy', { locale: de })}
                  {isTodayDate && (
                    <Badge className="bg-blue-500 text-white">Heute</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {dayEvents.map(event => {
                  const statusStyle = statusColors[event.status] || statusColors.entwurf;
                  const kunde = kunden.find(k => k.id === event.kunde_id);
                  const eventMusikerList = eventMusiker.filter(em => em.event_id === event.id);

                  return (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(event, e)}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className={`w-2 h-16 ${statusStyle.bg} rounded-full flex-shrink-0`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900 truncate">{event.titel}</h3>
                          <Badge className={`${statusStyle.bg} ${statusStyle.text} flex-shrink-0`}>
                            {event.status}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(parseISO(event.datum_von), 'HH:mm')} - {format(parseISO(event.datum_bis), 'HH:mm')}
                          </div>
                          {event.ort_name && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.ort_name}
                            </div>
                          )}
                          {kunde && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {kunde.firmenname}
                            </div>
                          )}
                          {eventMusikerList.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {eventMusikerList.length} Musiker
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {sortedDates.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Keine Events in diesem Monat</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Kalender</h1>
              <p className="text-gray-600">Visualisiere alle deine Events</p>
            </div>
            {isManager && ( // Only show create event button for managers
              <Button
                onClick={() => {
                  setSelectedDate(new Date());
                  setShowEventForm(true);
                }}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Event erstellen
              </Button>
            )}
          </div>

          {/* Controls */}
          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrevious}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToday}>
                    Heute
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNext}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <h2 className="text-xl font-bold ml-4">
                    {viewMode === "week" 
                      ? format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd. MMM', { locale: de }) + ' - ' + format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd. MMM yyyy', { locale: de })
                      : format(currentDate, 'MMMM yyyy', { locale: de })
                    }
                  </h2>
                </div>

                {/* View Mode & Filters */}
                <div className="flex items-center gap-2">
                  {isManager && ( // Only show filter button for managers
                    <Button
                      variant={showFilters ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  )}
                  
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === "month" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("month")}
                      className={viewMode === "month" ? "bg-white shadow-sm" : ""}
                    >
                      Monat
                    </Button>
                    <Button
                      variant={viewMode === "week" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("week")}
                      className={viewMode === "week" ? "bg-white shadow-sm" : ""}
                    >
                      Woche
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={viewMode === "list" ? "bg-white shadow-sm" : ""}
                    >
                      <ListIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Filters */}
              {isManager && showFilters && ( // Only show filters for managers
                <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">Alle Status</SelectItem>
                        <SelectItem value="entwurf">Entwurf</SelectItem>
                        <SelectItem value="angefragt">Angefragt</SelectItem>
                        <SelectItem value="bestätigt">Bestätigt</SelectItem>
                        <SelectItem value="durchgeführt">Durchgeführt</SelectItem>
                        <SelectItem value="abgerechnet">Abgerechnet</SelectItem>
                        <SelectItem value="storniert">Storniert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Musiker</Label>
                    <Select value={filterMusiker} onValueChange={setFilterMusiker}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">Alle Musiker</SelectItem>
                        {musiker.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Lead</Label>
                    <Select value={filterLead} onValueChange={setFilterLead}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">Alle Leads</SelectItem>
                        {leads.map(l => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.titel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Calendar Views */}
        <div className="mb-6">
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "list" && renderListView()}
        </div>

        {/* Event Stats */}
        {isManager && ( // Only show stats for managers
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-md">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">{filteredEvents.length}</div>
                <div className="text-sm text-gray-500">Events gesamt</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {filteredEvents.filter(e => e.status === 'bestätigt').length}
                </div>
                <div className="text-sm text-gray-500">Bestätigt</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {filteredEvents.filter(e => e.status === 'angefragt').length}
                </div>
                <div className="text-sm text-gray-500">Angefragt</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredEvents.filter(e => new Date(e.datum_von) > new Date()).length}
                </div>
                <div className="text-sm text-gray-500">Anstehend</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                Event erstellen {selectedDate && `am ${format(selectedDate, 'd. MMMM yyyy', { locale: de })}`}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowEventForm(false);
                  setSelectedDate(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6">
              <EventForm
                onSubmit={handleEventSubmit}
                onCancel={() => {
                  setShowEventForm(false);
                  setSelectedDate(null);
                }}
                kunden={kunden}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
