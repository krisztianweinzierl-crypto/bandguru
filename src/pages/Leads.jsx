
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Target, Mail, Phone, Calendar, Euro, User, MoreVertical, Edit, Trash2, LayoutGrid, List, TrendingUp, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import LeadForm from "@/components/leads/LeadForm";
import KanbanView from "@/components/leads/KanbanView";
import StageManager from "@/components/leads/StageManager";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";

export default function LeadsPage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [showDropdownId, setShowDropdownId] = useState(null);
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? "grid" : "list");
  const [showStageManager, setShowStageManager] = useState(false);
  const queryClient = useQueryClient();
  const { showConfirm, AlertDialog } = useAlertDialog();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', currentOrgId],
    queryFn: () => base44.entities.Lead.filter({ org_id: currentOrgId }, '-created_date'),
    enabled: !!currentOrgId
  });

  // Lade Lead-Stages
  const { data: stages = [] } = useQuery({
    queryKey: ['leadStages', currentOrgId],
    queryFn: async () => {
      const existingStages = await base44.entities.LeadStage.filter({ org_id: currentOrgId }, 'reihenfolge');
      
      // Falls keine Stages existieren, erstelle Standard-Stages
      if (existingStages.length === 0) {
        const defaultStages = [
          { org_id: currentOrgId, name: 'Neu', farbe: '#6B7280', reihenfolge: 0, ist_standard: true, status_mapping: 'neu' },
          { org_id: currentOrgId, name: 'Kontaktiert', farbe: '#3B82F6', reihenfolge: 1, ist_standard: true, status_mapping: 'kontaktiert' },
          { org_id: currentOrgId, name: 'Qualifiziert', farbe: '#8B5CF6', reihenfolge: 2, ist_standard: true, status_mapping: 'qualifiziert' },
          { org_id: currentOrgId, name: 'Angebot', farbe: '#6366F1', reihenfolge: 3, ist_standard: true, status_mapping: 'angebot' },
          { org_id: currentOrgId, name: 'Verhandlung', farbe: '#F59E0B', reihenfolge: 4, ist_standard: true, status_mapping: 'verhandlung' },
          { org_id: currentOrgId, name: 'Gewonnen', farbe: '#10B981', reihenfolge: 5, ist_standard: true, status_mapping: 'gewonnen' },
          { org_id: currentOrgId, name: 'Verloren', farbe: '#EF4444', reihenfolge: 6, ist_standard: true, status_mapping: 'verloren' }
        ];
        
        const createdStages = await Promise.all(
          defaultStages.map(stage => base44.entities.LeadStage.create(stage))
        );
        return createdStages;
      }
      
      return existingStages;
    },
    enabled: !!currentOrgId
  });

  const { data: mitglieder = [] } = useQuery({
    queryKey: ['mitglieder', currentOrgId],
    queryFn: () => base44.entities.Mitglied.filter({ org_id: currentOrgId, status: "aktiv" }),
    enabled: !!currentOrgId
  });

  const createLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowForm(false);
      setEditingLead(null);
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowForm(false);
      setEditingLead(null);
      setShowDropdownId(null);
    }
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowDropdownId(null);
    }
  });

  const updateLeadStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Lead.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const saveStagesMutation = useMutation({
    mutationFn: async (stagesToSave) => {
      // 1. Finde gelöschte Stages (Stages die vorher existierten, aber nicht mehr im Array sind)
      const existingStageIds = stages.map(s => s.id);
      const newStageIds = stagesToSave.map(s => s.id);
      const deletedStageIds = existingStageIds.filter(id => !newStageIds.includes(id) && !id.startsWith('temp_'));
      
      // 2. Lösche die entfernten Stages
      const deletePromises = deletedStageIds.map(id => base44.entities.LeadStage.delete(id));
      await Promise.all(deletePromises);
      
      // 3. Update/Create die übrigen Stages
      const updates = stagesToSave.map(async (stage) => {
        if (stage.id && typeof stage.id === 'string' && stage.id.startsWith('temp_')) {
          // Neue Stage erstellen
          const { id, ...stageData } = stage; // eslint-disable-line no-unused-vars
          return base44.entities.LeadStage.create({ ...stageData, org_id: currentOrgId });
        } else if (stage.id) {
          // Existierende Stage updaten
          const { id, ...stageData } = stage;
          return base44.entities.LeadStage.update(id, stageData);
        }
        return Promise.resolve(null);
      });
      
      return (await Promise.all(updates)).filter(Boolean);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadStages'] });
      setShowStageManager(false);
    }
  });

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
    l.titel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.firmenname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.kontaktperson?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "alle" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Note: The following variables (offeneLeads, ueberfaelligeLeads, bezahlteLeads)
  // are defined in the outline but not used in the final return JSX structure.
  // They are kept as per the outline's instruction.
  const offeneLeads = filteredLeads.filter((l) =>
  ['versendet', 'teilweise_bezahlt'].includes(l.status)
  );
  const ueberfaelligeLeads = filteredLeads.filter((l) =>
  l.status === 'überfällig' ||
  l.status === 'versendet' && new Date(l.faelligkeitsdatum) < new Date()
  );
  const bezahlteLeads = filteredLeads.filter((l) => l.status === 'bezahlt');

  const statusColors = {
    neu: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-400", borderClass: "border-l-gray-400" },
    kontaktiert: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-400", borderClass: "border-l-blue-400" },
    qualifiziert: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-400", borderClass: "border-l-purple-400" },
    angebot: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-400", borderClass: "border-l-indigo-400" },
    verhandlung: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-400", borderClass: "border-l-yellow-400" },
    gewonnen: { bg: "bg-green-100", text: "text-green-800", border: "border-green-400", borderClass: "border-l-green-500" },
    verloren: { bg: "bg-red-100", text: "text-red-800", border: "border-red-400", borderClass: "border-l-red-400" }
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

  const handleDelete = async (lead) => {
    const confirmed = await showConfirm({
      title: 'Lead löschen',
      message: `Möchtest du den Lead "${lead.titel}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`,
      type: 'warning',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen'
    });
    
    if (confirmed) {
      deleteLeadMutation.mutate(lead.id);
    }
  };

  const handleSubmit = (data) => {
    if (editingLead) {
      updateLeadMutation.mutate({ id: editingLead.id, data });
    } else {
      createLeadMutation.mutate(data);
    }
  };

  const handleLeadUpdate = (leadId, data) => {
    updateLeadStatusMutation.mutate({ id: leadId, ...data });
  };

  const handleSaveStages = (stagesToSave) => {
    saveStagesMutation.mutate(stagesToSave);
  };

  const LeadCard = ({ lead }) => {
    const statusStyle = statusColors[lead.status] || statusColors.neu;
    const assignedMitglied = mitglieder.find((m) => m.user_id === lead.zugewiesen_an);

    return (
      <Card
        className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 ${statusStyle.borderClass}`}
        onClick={() => handleCardClick(lead.id)}>

        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-1 truncate">{lead.titel}</CardTitle>
              {lead.firmenname &&
              <p className="text-sm text-gray-600 truncate">{lead.firmenname}</p>
              }
            </div>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdownId(showDropdownId === lead.id ? null : lead.id);
                }}>

                <MoreVertical className="w-4 h-4" />
              </Button>

              {showDropdownId === lead.id &&
              <>
                  <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdownId(null);
                  }} />

                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-56 overflow-hidden">
                    <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(lead);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">

                      <Edit className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Lead bearbeiten</span>
                    </button>
                    <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(lead);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left text-sm text-red-600 border-t">

                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Lead löschen</span>
                    </button>
                  </div>
                </>
              }
            </div>
          </div>
          <div className="mt-3">
            <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
              {statusLabels[lead.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {lead.kontaktperson &&
          <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4 text-gray-400" />
              <span className="truncate">{lead.kontaktperson}</span>
            </div>
          }
          {lead.email &&
          <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{lead.email}</span>
            </div>
          }
          {lead.telefon &&
          <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{lead.telefon}</span>
            </div>
          }
          {lead.event_datum &&
          <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{format(new Date(lead.event_datum), 'dd. MMM yyyy', { locale: de })}</span>
            </div>
          }
          {lead.erwarteter_umsatz &&
          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <Euro className="w-4 h-4" />
              <span>{lead.erwarteter_umsatz.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            </div>
          }
          {assignedMitglied &&
          <div className="text-xs text-gray-500 mt-2">
              Zugewiesen an: {assignedMitglied.rolle}
            </div>
          }
        </CardContent>
      </Card>);

  };

  const LeadListItem = ({ lead }) => {
    const statusStyle = statusColors[lead.status] || statusColors.neu;
    const assignedMitglied = mitglieder.find((m) => m.user_id === lead.zugewiesen_an);

    return (
      <div
        className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 flex items-center gap-4 cursor-pointer border-l-4 ${statusStyle.borderClass}`}
        onClick={() => handleCardClick(lead.id)}>

        <div className="bg-[#223a5e] text-white font-bold rounded-lg w-12 h-12 from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
          <Target className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 truncate">{lead.titel}</h3>
              {lead.firmenname &&
              <p className="text-sm text-gray-600 truncate">{lead.firmenname}</p>
              }
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
                }}>

                <MoreVertical className="w-4 h-4" />
              </Button>

              {showDropdownId === lead.id &&
              <>
                  <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdownId(null);
                  }} />

                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-56 overflow-hidden">
                    <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(lead);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">

                      <Edit className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Lead bearbeiten</span>
                    </button>
                    <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(lead);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left text-sm text-red-600 border-t">

                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Lead löschen</span>
                    </button>
                  </div>
                </>
              }
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {lead.kontaktperson &&
            <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{lead.kontaktperson}</span>
              </div>
            }
            {lead.email &&
            <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                <span className="truncate">{lead.email}</span>
              </div>
            }
            {lead.event_datum &&
            <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(lead.event_datum), 'dd. MMM yyyy', { locale: de })}</span>
              </div>
            }
            {lead.erwarteter_umsatz &&
            <div className="flex items-center gap-1 font-medium text-green-600">
                <Euro className="w-4 h-4" />
                <span>{lead.erwarteter_umsatz.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            }
          </div>
        </div>
      </div>);

  };

  // Statistiken
  const gesamtUmsatzPotenzial = leads.reduce((sum, l) => sum + (l.erwarteter_umsatz || 0), 0);
  const neueLeads = leads.filter((l) => l.status === 'neu').length;
  const aktiveLeads = leads.filter((l) => ['kontaktiert', 'qualifiziert', 'angebot', 'verhandlung'].includes(l.status)).length;
  const gewonneneLeads = leads.filter((l) => l.status === 'gewonnen').length;

  return (
    <>
      <AlertDialog />
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
              }} className="bg-[#223a5e] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-9 from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">


              <Plus className="w-4 h-4 mr-2" />
              Lead anlegen
            </Button>
          </div>

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
                    <Euro className="w-6 h-6 text-green-600" />
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
                    <Euro className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Umsatzpotenzial</p>
                    <p className="text-xl font-bold">{gesamtUmsatzPotenzial.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
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
                    variant={viewMode === "kanban" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("kanban")}
                    className={viewMode === "kanban" ? "bg-white shadow-sm" : ""}
                  >
                    <Columns3 className="w-4 h-4" />
                  </Button>
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
              <LeadForm
                lead={editingLead}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingLead(null);
                }}
                mitglieder={mitglieder}
              />
            </div>
          )}

          {showStageManager && (
            <div className="mb-6">
              <StageManager
                stages={stages}
                onSave={handleSaveStages}
                onCancel={() => setShowStageManager(false)}
              />
            </div>
          )}

          {filteredLeads.length > 0 ? (
            viewMode === "kanban" ? (
              <KanbanView
                leads={filteredLeads}
                stages={stages}
                onLeadClick={handleCardClick}
                onLeadUpdate={handleLeadUpdate}
                onLeadEdit={handleEdit}
                onStageSettings={() => setShowStageManager(true)}
                showDropdownId={showDropdownId}
                setShowDropdownId={setShowDropdownId}
                onLeadDelete={handleDelete} // Pass delete handler
              />
            ) : viewMode === "grid" ? (
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
    </>
  );
}
