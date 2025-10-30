import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, FileText, Edit, Trash2, Send, Calendar, User, LayoutGrid, List, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import VertragsForm from "@/components/vertraege/VertragsForm";

export default function VertraegePage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVertrag, setEditingVertrag] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [viewMode, setViewMode] = useState("list");
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: vertraege = [] } = useQuery({
    queryKey: ['vertraege', currentOrgId],
    queryFn: () => base44.entities.Vertrag.filter({ org_id: currentOrgId }, '-created_date'),
    enabled: !!currentOrgId,
  });

  const { data: kunden = [] } = useQuery({
    queryKey: ['kunden', currentOrgId],
    queryFn: () => base44.entities.Kunde.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', currentOrgId],
    queryFn: () => base44.entities.Event.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const { data: vorlagen = [] } = useQuery({
    queryKey: ['vertragsvorlagen', currentOrgId],
    queryFn: () => base44.entities.Vertragsvorlage.filter({ org_id: currentOrgId, aktiv: true }),
    enabled: !!currentOrgId,
  });

  const createVertragMutation = useMutation({
    mutationFn: (data) => base44.entities.Vertrag.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertraege'] });
      setShowForm(false);
      setEditingVertrag(null);
    },
  });

  const updateVertragMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vertrag.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertraege'] });
      setShowForm(false);
      setEditingVertrag(null);
    },
  });

  const deleteVertragMutation = useMutation({
    mutationFn: (id) => base44.entities.Vertrag.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertraege'] });
    },
  });

  const filteredVertraege = vertraege.filter(v => {
    const matchesSearch = 
      v.titel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vertragsnummer?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "alle" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    entwurf: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-400", borderClass: "border-l-gray-400" },
    versendet: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-400", borderClass: "border-l-blue-400" },
    unterzeichnet: { bg: "bg-green-100", text: "text-green-800", border: "border-green-400", borderClass: "border-l-green-500" },
    storniert: { bg: "bg-red-100", text: "text-red-800", border: "border-red-400", borderClass: "border-l-red-400" }
  };

  const statusLabels = {
    entwurf: "Entwurf",
    versendet: "Versendet",
    unterzeichnet: "Unterzeichnet",
    storniert: "Storniert"
  };

  const handleEdit = (vertrag) => {
    setEditingVertrag(vertrag);
    setShowForm(true);
  };

  const handleDelete = (vertrag) => {
    if (confirm(`Möchtest du den Vertrag "${vertrag.titel}" wirklich löschen?`)) {
      deleteVertragMutation.mutate(vertrag.id);
    }
  };

  const handleSubmit = (data) => {
    if (editingVertrag) {
      updateVertragMutation.mutate({ id: editingVertrag.id, data });
    } else {
      createVertragMutation.mutate(data);
    }
  };

  const handleView = (vertrag) => {
    navigate(createPageUrl(`VertragDetail?id=${vertrag.id}`));
  };

  const VertragCard = ({ vertrag }) => {
    const statusStyle = statusColors[vertrag.status] || statusColors.entwurf;
    const kunde = kunden.find(k => k.id === vertrag.kunde_id);
    const event = events.find(e => e.id === vertrag.event_id);

    return (
      <Card className={`hover:shadow-lg transition-all duration-200 border-l-4 ${statusStyle.borderClass}`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-1 truncate">{vertrag.titel}</CardTitle>
              {vertrag.vertragsnummer && (
                <p className="text-sm text-gray-500">{vertrag.vertragsnummer}</p>
              )}
            </div>
            <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
              {statusLabels[vertrag.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {kunde && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4 text-gray-400" />
              <span className="truncate">{kunde.firmenname}</span>
            </div>
          )}
          {event && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="truncate">{event.titel}</span>
            </div>
          )}
          {vertrag.unterzeichnen_bis && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Frist: {format(new Date(vertrag.unterzeichnen_bis), 'dd.MM.yyyy', { locale: de })}</span>
            </div>
          )}
          
          <div className="flex gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => handleView(vertrag)} className="flex-1">
              <Eye className="w-4 h-4 mr-1" />
              Ansehen
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleEdit(vertrag)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDelete(vertrag)} className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const VertragListItem = ({ vertrag }) => {
    const statusStyle = statusColors[vertrag.status] || statusColors.entwurf;
    const kunde = kunden.find(k => k.id === vertrag.kunde_id);
    const event = events.find(e => e.id === vertrag.event_id);

    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 flex items-center gap-4 border-l-4 ${statusStyle.borderClass}`}>
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
          <FileText className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 truncate">{vertrag.titel}</h3>
              {vertrag.vertragsnummer && (
                <p className="text-sm text-gray-500">{vertrag.vertragsnummer}</p>
              )}
            </div>
            <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} flex-shrink-0`}>
              {statusLabels[vertrag.status]}
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {kunde && (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{kunde.firmenname}</span>
              </div>
            )}
            {event && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{event.titel}</span>
              </div>
            )}
            {vertrag.unterzeichnen_bis && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Frist: {format(new Date(vertrag.unterzeichnen_bis), 'dd.MM.yyyy', { locale: de })}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => handleView(vertrag)}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleEdit(vertrag)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(vertrag)} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  const entwuerfe = filteredVertraege.filter(v => v.status === 'entwurf').length;
  const versendet = filteredVertraege.filter(v => v.status === 'versendet').length;
  const unterzeichnet = filteredVertraege.filter(v => v.status === 'unterzeichnet').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Verträge</h1>
            <p className="text-gray-600">Verwalte deine Verträge mit digitaler Unterschrift</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate(createPageUrl('Vertragsvorlagen'))}
            >
              <FileText className="w-4 h-4 mr-2" />
              Vorlagen
            </Button>
            <Button 
              onClick={() => {
                setEditingVertrag(null);
                setShowForm(true);
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Vertrag erstellen
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Entwürfe</p>
                  <p className="text-2xl font-bold">{entwuerfe}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Send className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Versendet</p>
                  <p className="text-2xl font-bold">{versendet}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unterzeichnet</p>
                  <p className="text-2xl font-bold">{unterzeichnet}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Verträge durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Status</SelectItem>
                  <SelectItem value="entwurf">Entwurf</SelectItem>
                  <SelectItem value="versendet">Versendet</SelectItem>
                  <SelectItem value="unterzeichnet">Unterzeichnet</SelectItem>
                  <SelectItem value="storniert">Storniert</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "bg-white shadow-sm" : ""}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-white shadow-sm" : ""}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {showForm && (
          <div className="mb-6">
            <VertragsForm
              vertrag={editingVertrag}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingVertrag(null);
              }}
              kunden={kunden}
              events={events}
              vorlagen={vorlagen}
            />
          </div>
        )}

        {filteredVertraege.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVertraege.map((vertrag) => (
                <VertragCard key={vertrag.id} vertrag={vertrag} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVertraege.map((vertrag) => (
                <VertragListItem key={vertrag.id} vertrag={vertrag} />
              ))}
            </div>
          )
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Verträge gefunden</h3>
              <p className="text-gray-500 mb-4">Erstelle deinen ersten Vertrag</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Vertrag erstellen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}