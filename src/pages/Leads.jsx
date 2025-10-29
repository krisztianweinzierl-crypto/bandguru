import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Target, Mail, Phone, Calendar, DollarSign, User, MoreVertical, Edit, Trash2, LayoutGrid, List, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function LeadsPage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [showDropdownId, setShowDropdownId] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', currentOrgId],
    queryFn: () => base44.entities.Lead.filter({ org_id: currentOrgId }, '-created_date'),
    enabled: !!currentOrgId,
  });

  const { data: mitglieder = [] } = useQuery({
    queryKey: ['mitglieder', currentOrgId],
    queryFn: () => base44.entities.Mitglied.filter({ org_id: currentOrgId, status: "aktiv" }),
    enabled: !!currentOrgId,
  });

  const createLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowForm(false);
      setEditingLead(null);
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowForm(false);
      setEditingLead(null);
      setShowDropdownId(null);
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowDropdownId(null);
    },
  });

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.titel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         l.firmenname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         l.kontaktperson?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "alle" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    neu: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" },
    kontaktiert: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
    qualifiziert: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
    angebot: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
    verhandlung: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
    gewonnen: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
    verloren: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" }
  };

  const statusLabels = {
    neu: "Neu",
    kontaktiert: "Kontaktiert",
    qualifiziert: "Qualifiziert",
    angebot: "Angebot",
    verhandlung: "Verhandlung",
    gewonnen: "Gewonnen",
    verloren: "Verloren"
  };

  const handleCardClick = (leadId) => {
    navigate(createPageUrl(`LeadDetail?id=${leadId}`));
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setShowForm(true);
    setShowDropdownId(null);
  };

  const handleDelete = (lead) => {
    if (confirm(`Möchtest du den Lead "${lead.titel}" wirklich löschen?`)) {
      deleteLeadMutation.mutate(lead.id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    if (editingLead) {
      updateLeadMutation.mutate({ id: editingLead.id, data });
    } else {
      createLeadMutation.mutate(data);
    }
  };

  const LeadCard = ({ lead }) => {
    const statusStyle = statusColors[lead.status] || statusColors.neu;
    const assignedMitglied = mitglieder.find(m => m.user_id === lead.zugewiesen_an);

    return (
      <Card 
        className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4"
        style={{ borderLeftColor: statusStyle.border.replace('border-', '#') }}
        onClick={() => handleCardClick(lead.id)}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-1 truncate">{lead.titel}</CardTitle>
              {lead.firmenname && (
                <p className="text-sm text-gray-600 truncate">{lead.firmenname}</p>
              )}
            </div>
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdownId(showDropdownId === lead.id ? null : lead.id);
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>

              {showDropdownId === lead.id && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdownId(null);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-56 overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(lead);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Lead bearbeiten</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(lead);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left text-sm text-red-600 border-t"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Lead löschen</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-3">
            <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
              {statusLabels[lead.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {lead.kontaktperson && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4 text-gray-400" />
              <span className="truncate">{lead.kontaktperson}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.telefon && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{lead.telefon}</span>
            </div>
          )}
          {lead.event_datum && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{format(new Date(lead.event_datum), 'dd. MMM yyyy', { locale: de })}</span>
            </div>
          )}
          {lead.erwarteter_umsatz && (
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <DollarSign className="w-4 h-4" />
              <span>{lead.erwarteter_umsatz.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            </div>
          )}
          {assignedMitglied && (
            <div className="text-xs text-gray-500 mt-2">
              Zugewiesen an: {assignedMitglied.rolle}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const LeadListItem = ({ lead }) => {
    const statusStyle = statusColors[lead.status] || statusColors.neu;
    const assignedMitglied = mitglieder.find(m => m.user_id === lead.zugewiesen_an);

    return (
      <div 
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 flex items-center gap-4 cursor-pointer"
        onClick={() => handleCardClick(lead.id)}
      >
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
          <Target className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 truncate">{lead.titel}</h3>
              {lead.firmenname && (
                <p className="text-sm text-gray-600 truncate">{lead.firmenname}</p>
              )}
            </div>
            <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} flex-shrink-0`}>
              {statusLabels[lead.status]}
            </Badge>
            <div className="relative flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdownId(showDropdownId === lead.id ? null : lead.id);
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>

              {showDropdownId === lead.id && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdownId(null);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-56 overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(lead);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Lead bearbeiten</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(lead);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left text-sm text-red-600 border-t"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Lead löschen</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {lead.kontaktperson && (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{lead.kontaktperson}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {lead.event_datum && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(lead.event_datum), 'dd. MMM yyyy', { locale: de })}</span>
              </div>
            )}
            {lead.erwarteter_umsatz && (
              <div className="flex items-center gap-1 font-medium text-green-600">
                <DollarSign className="w-4 h-4" />
                <span>{lead.erwarteter_umsatz.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Statistiken
  const gesamtUmsatzPotenzial = leads.reduce((sum, l) => sum + (l.erwarteter_umsatz || 0), 0);
  const neueLeads = leads.filter(l => l.status === 'neu').length;
  const aktiveLeads = leads.filter(l => ['kontaktiert', 'qualifiziert', 'angebot', 'verhandlung'].includes(l.status)).length;
  const gewonneneLeads = leads.filter(l => l.status === 'gewonnen').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Leads</h1>
            <p className="text-gray-600">Verwalte deine Verkaufschancen</p>
          </div>
          <Button 
            onClick={() => {
              setEditingLead(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lead anlegen
          </Button>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Neue Leads</p>
                  <p className="text-2xl font-bold">{neueLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Aktive Leads</p>
                  <p className="text-2xl font-bold">{aktiveLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gewonnene</p>
                  <p className="text-2xl font-bold">{gewonneneLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Umsatzpotenzial</p>
                  <p className="text-xl font-bold">{gesamtUmsatzPotenzial.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suche & Filter */}
        <Card className="mb-6 border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Leads durchsuchen..."
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
                  <SelectItem value="neu">Neu</SelectItem>
                  <SelectItem value="kontaktiert">Kontaktiert</SelectItem>
                  <SelectItem value="qualifiziert">Qualifiziert</SelectItem>
                  <SelectItem value="angebot">Angebot</SelectItem>
                  <SelectItem value="verhandlung">Verhandlung</SelectItem>
                  <SelectItem value="gewonnen">Gewonnen</SelectItem>
                  <SelectItem value="verloren">Verloren</SelectItem>
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

        {/* Lead Form - kommt später */}
        {showForm && (
          <Card className="mb-6 border-none shadow-lg">
            <CardHeader className="border-b">
              <CardTitle>{editingLead ? "Lead bearbeiten" : "Neuer Lead"}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-500">Formular wird noch implementiert...</p>
              <Button onClick={() => setShowForm(false)} className="mt-4">
                Schließen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Leads Grid/List */}
        {filteredLeads.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeads.map((lead) => (
                <LeadListItem key={lead.id} lead={lead} />
              ))}
            </div>
          )
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Leads gefunden</h3>
              <p className="text-gray-500 mb-4">Lege deinen ersten Lead an</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Lead anlegen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}