import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  CheckSquare, 
  Circle, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  User,
  Building2,
  Filter,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { de } from "date-fns/locale";

export default function MeineAufgabenPage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [user, setUser] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState("alle");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadData = async () => {
      const orgId = localStorage.getItem('currentOrgId');
      setCurrentOrgId(orgId);
      
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadData();
  }, []);

  const { data: aufgaben = [], isLoading } = useQuery({
    queryKey: ['meine-aufgaben', currentOrgId, user?.id],
    queryFn: () => base44.entities.Aufgabe.filter({ 
      org_id: currentOrgId,
      zugewiesen_an: user?.id
    }, '-faellig_am'),
    enabled: !!currentOrgId && !!user?.id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', currentOrgId],
    queryFn: () => base44.entities.Event.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const { data: kunden = [] } = useQuery({
    queryKey: ['kunden', currentOrgId],
    queryFn: () => base44.entities.Kunde.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const updateAufgabeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Aufgabe.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meine-aufgaben'] });
    },
  });

  const handleStatusChange = (aufgabe, newStatus) => {
    updateAufgabeMutation.mutate({
      id: aufgabe.id,
      data: { status: newStatus }
    });
  };

  const filteredAufgaben = aufgaben.filter(a => {
    if (priorityFilter === "alle") return true;
    return a.prioritaet === priorityFilter;
  });

  const offeneAufgaben = filteredAufgaben.filter(a => a.status === 'offen');
  const inArbeitAufgaben = filteredAufgaben.filter(a => a.status === 'in_arbeit');
  const erledigteAufgaben = filteredAufgaben.filter(a => a.status === 'erledigt');

  const priorityColors = {
    niedrig: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
    normal: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" },
    hoch: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" }
  };

  const statusIcons = {
    offen: <Circle className="w-5 h-5 text-gray-400" />,
    in_arbeit: <Clock className="w-5 h-5 text-blue-500" />,
    erledigt: <CheckCircle2 className="w-5 h-5 text-green-500" />
  };

  const getRelatedInfo = (aufgabe) => {
    if (aufgabe.bezug_typ === 'event' && aufgabe.bezug_id) {
      const event = events.find(e => e.id === aufgabe.bezug_id);
      return { type: 'event', data: event };
    }
    if (aufgabe.bezug_typ === 'kunde' && aufgabe.bezug_id) {
      const kunde = kunden.find(k => k.id === aufgabe.bezug_id);
      return { type: 'kunde', data: kunde };
    }
    return null;
  };

  const getDueDateBadge = (faelligAm) => {
    if (!faelligAm) return null;
    
    const date = new Date(faelligAm);
    const isOverdue = isPast(date) && !isToday(date);
    
    if (isOverdue) {
      return (
        <Badge className="bg-red-100 text-red-800 border border-red-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          Überfällig
        </Badge>
      );
    }
    
    if (isToday(date)) {
      return (
        <Badge className="bg-orange-100 text-orange-800 border border-orange-300">
          <Clock className="w-3 h-3 mr-1" />
          Heute
        </Badge>
      );
    }
    
    if (isTomorrow(date)) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          Morgen
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="text-xs">
        <Calendar className="w-3 h-3 mr-1" />
        {format(date, 'dd. MMM', { locale: de })}
      </Badge>
    );
  };

  const AufgabeCard = ({ aufgabe }) => {
    const relatedInfo = getRelatedInfo(aufgabe);
    const priorityStyle = priorityColors[aufgabe.prioritaet] || priorityColors.normal;

    return (
      <Card className={`hover:shadow-lg transition-all duration-200 border-l-4 ${
        aufgabe.prioritaet === 'hoch' ? 'border-l-red-500' :
        aufgabe.prioritaet === 'normal' ? 'border-l-gray-400' :
        'border-l-blue-400'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => {
                const newStatus = aufgabe.status === 'erledigt' ? 'offen' : 
                                aufgabe.status === 'offen' ? 'in_arbeit' : 'erledigt';
                handleStatusChange(aufgabe, newStatus);
              }}
              className="mt-1 hover:opacity-70 transition-opacity"
            >
              {statusIcons[aufgabe.status]}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className={`font-semibold text-lg ${aufgabe.status === 'erledigt' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {aufgabe.titel}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {aufgabe.faellig_am && getDueDateBadge(aufgabe.faellig_am)}
                  <Badge className={`${priorityStyle.bg} ${priorityStyle.text} border ${priorityStyle.border}`}>
                    {aufgabe.prioritaet}
                  </Badge>
                </div>
              </div>

              {aufgabe.beschreibung && (
                <p className="text-gray-600 text-sm mb-3">{aufgabe.beschreibung}</p>
              )}

              {relatedInfo && (
                <div className="flex items-center gap-2 text-sm">
                  {relatedInfo.type === 'event' && relatedInfo.data && (
                    <Link 
                      to={createPageUrl(`EventDetail?id=${relatedInfo.data.id}`)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{relatedInfo.data.titel}</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                  {relatedInfo.type === 'kunde' && relatedInfo.data && (
                    <Link 
                      to={createPageUrl(`KundenDetail?id=${relatedInfo.data.id}`)}
                      className="flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>{relatedInfo.data.firmenname}</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade Aufgaben...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Meine Aufgaben</h1>
          <p className="text-gray-600">Verwalte deine zugewiesenen Aufgaben</p>
        </div>

        {/* Statistik-Kacheln */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">Offen</CardTitle>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Circle className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{offeneAufgaben.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">In Arbeit</CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{inArbeitAufgaben.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-gray-600">Erledigt</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{erledigteAufgaben.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card className="mb-6 border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="alle">Alle Prioritäten</option>
                <option value="hoch">Hoch</option>
                <option value="normal">Normal</option>
                <option value="niedrig">Niedrig</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Aufgaben Tabs */}
        <Tabs defaultValue="offen" className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="offen">
              Offen ({offeneAufgaben.length})
            </TabsTrigger>
            <TabsTrigger value="in_arbeit">
              In Arbeit ({inArbeitAufgaben.length})
            </TabsTrigger>
            <TabsTrigger value="erledigt">
              Erledigt ({erledigteAufgaben.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="offen" className="space-y-4">
            {offeneAufgaben.length > 0 ? (
              offeneAufgaben.map(aufgabe => (
                <AufgabeCard key={aufgabe.id} aufgabe={aufgabe} />
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">Keine offenen Aufgaben</h3>
                  <p className="text-gray-500">Super! Du hast keine offenen Aufgaben.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="in_arbeit" className="space-y-4">
            {inArbeitAufgaben.length > 0 ? (
              inArbeitAufgaben.map(aufgabe => (
                <AufgabeCard key={aufgabe.id} aufgabe={aufgabe} />
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">Keine Aufgaben in Arbeit</h3>
                  <p className="text-gray-500">Starte mit einer offenen Aufgabe!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="erledigt" className="space-y-4">
            {erledigteAufgaben.length > 0 ? (
              erledigteAufgaben.map(aufgabe => (
                <AufgabeCard key={aufgabe.id} aufgabe={aufgabe} />
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">Keine erledigten Aufgaben</h3>
                  <p className="text-gray-500">Erledige deine ersten Aufgaben!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}