
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  Calendar,
  MapPin,
  User,
  Building2,
  Euro, // Changed from DollarSign to Euro
  FileText,
  CheckCircle,
  Plus,
  Send,
  Activity,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function LeadDetailPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState("");

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const result = await base44.entities.Lead.filter({ id: leadId });
      return result[0];
    },
    enabled: !!leadId,
  });

  const { data: notizen = [] } = useQuery({
    queryKey: ['leadNotizen', leadId],
    queryFn: () => base44.entities.LeadNotiz.filter({ lead_id: leadId }, '-created_date'),
    enabled: !!leadId,
  });

  const { data: mitglieder = [] } = useQuery({
    queryKey: ['mitglieder', lead?.org_id],
    queryFn: () => base44.entities.Mitglied.filter({ org_id: lead.org_id, status: "aktiv" }),
    enabled: !!lead?.org_id,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const createNotizMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadNotiz.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadNotizen', leadId] });
      setNewNote("");
    },
  });

  const handleStatusChange = (newStatus) => {
    updateLeadMutation.mutate({ ...lead, status: newStatus });
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      createNotizMutation.mutate({
        org_id: lead.org_id,
        lead_id: leadId,
        inhalt: newNote,
        erstellt_von: currentUser?.id
      });
    }
  };

  const handleConvertToEvent = () => {
    // Später: Lead in Event konvertieren
    alert("Lead wird in Event konvertiert (Feature kommt später)");
  };

  if (isLoading || !lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade Lead...</p>
      </div>
    );
  }

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

  const statusStyle = statusColors[lead.status] || statusColors.neu;
  const assignedMitglied = mitglieder.find(m => m.user_id === lead.zugewiesen_an);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl('Leads'))}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zu Leads
            </Button>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{lead.titel}</h1>
              {lead.firmenname && (
                <p className="text-lg text-gray-600">{lead.firmenname}</p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleConvertToEvent}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                Lead konvertieren
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Lead
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Lead Fokus */}
            <Card className="border-l-4 border-l-yellow-400 bg-yellow-50">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-yellow-600" />
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold">Lead Fokus</CardTitle>
                    <p className="text-xs text-gray-600">Schnellübersicht</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-gray-600 mb-2 block">Status</label>
                  <Select value={lead.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className={`${statusStyle.bg} ${statusStyle.text} border-none`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neu">Neu</SelectItem>
                      <SelectItem value="kontaktiert">Kontaktiert</SelectItem>
                      <SelectItem value="qualifiziert">Qualifiziert</SelectItem>
                      <SelectItem value="angebot">Angebot</SelectItem>
                      <SelectItem value="verhandlung">Verhandlung</SelectItem>
                      <SelectItem value="gewonnen">Gewonnen</SelectItem>
                      <SelectItem value="verloren">Verloren</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Lead-Details */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">Lead-Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {lead.event_datum && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 uppercase">Event-Datum</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="font-semibold text-gray-900">
                        {format(new Date(lead.event_datum), 'dd.MM.yyyy', { locale: de })}
                      </p>
                    </div>
                  </div>
                )}

                {lead.event_ort && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{lead.event_ort}</span>
                    </div>
                  </div>
                )}

                {lead.event_typ && (
                  <div>
                    <Badge variant="outline">{lead.event_typ}</Badge>
                  </div>
                )}

                {lead.kontaktperson && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Kontaktperson</p>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{lead.kontaktperson}</span>
                    </div>
                  </div>
                )}

                {lead.email && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">E-Mail</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline truncate">
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}

                {lead.telefon && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Telefon</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${lead.telefon}`} className="text-gray-900 hover:underline">
                        {lead.telefon}
                      </a>
                    </div>
                  </div>
                )}

                {lead.firmenname && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Unternehmen</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{lead.firmenname}</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                    {statusLabels[lead.status]}
                  </Badge>
                </div>

                {lead.erwarteter_umsatz && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Erwarteter Umsatz</p>
                    <div className="flex items-center gap-2">
                      <Euro className="w-5 h-5 text-green-600" /> {/* Changed icon here */}
                      <span className="text-xl font-bold text-green-600">
                        {lead.erwarteter_umsatz.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                  </div>
                )}

                {lead.quelle && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Quelle</p>
                    <p className="text-sm font-medium">{lead.quelle}</p>
                  </div>
                )}

                {assignedMitglied && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Zugewiesen an</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {assignedMitglied.rolle?.[0]}
                      </div>
                      <span className="text-sm font-medium">{assignedMitglied.rolle}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Letzte Notiz */}
            {notizen.length > 0 && (
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b">
                  <CardTitle className="text-sm font-bold">Letzte Notiz</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="text-xs text-gray-500 mb-2">
                    {format(new Date(notizen[0].created_date), 'dd.MM.yyyy • HH:mm', { locale: de })}
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">{notizen[0].inhalt}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Angebote Placeholder */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <CardTitle>Angebote</CardTitle>
                  </div>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Angebot erstellen
                  </Button>
                </div>
                <p className="text-sm text-gray-500">Verknüpfte Angebote für diesen Lead</p>
              </CardHeader>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Noch keine Angebote</h3>
                <p className="text-gray-500 mb-4">Erstellen Sie ein Angebot für diesen Lead</p>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Erstes Angebot erstellen
                </Button>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="notizen" className="space-y-6">
              <TabsList className="bg-white border shadow-sm">
                <TabsTrigger value="notizen">Notizen</TabsTrigger>
                <TabsTrigger value="aufgaben">Aufgaben</TabsTrigger>
                <TabsTrigger value="emails">E-Mails</TabsTrigger>
                <TabsTrigger value="dateien">Dateien</TabsTrigger>
                <TabsTrigger value="verlauf">Verlauf</TabsTrigger>
              </TabsList>

              <TabsContent value="notizen">
                <Card className="border-none shadow-lg">
                  <CardHeader className="border-b">
                    <CardTitle>Neue Notiz hinzufügen</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <Textarea
                      placeholder="Notiz hier eingeben..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={4}
                      className="mb-4"
                    />
                    <Button 
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || createNotizMutation.isPending}
                      className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {createNotizMutation.isPending ? "Speichert..." : "Notiz hinzufügen"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Notizen-Verlauf */}
                <Card className="border-none shadow-lg mt-6">
                  <CardHeader className="border-b">
                    <CardTitle>Notizen-Verlauf</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {notizen.length > 0 ? (
                      <div className="space-y-4">
                        {notizen.map((notiz) => (
                          <div key={notiz.id} className="bg-yellow-50 rounded-lg p-4 border-l-4 border-l-yellow-400">
                            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {format(new Date(notiz.created_date), 'dd.MM.yyyy, HH:mm', { locale: de })}
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{notiz.inhalt}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">Noch keine Notizen vorhanden</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="aufgaben">
                <Card className="border-none shadow-lg">
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-500">Aufgaben-Feature kommt bald...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="emails">
                <Card className="border-none shadow-lg">
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-500">E-Mail-Feature kommt bald...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dateien">
                <Card className="border-none shadow-lg">
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-500">Dateien-Feature kommt bald...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="verlauf">
                <Card className="border-none shadow-lg">
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-500">Verlaufs-Feature kommt bald...</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
