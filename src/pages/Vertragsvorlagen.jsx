import React, { useState, useEffect } from "react";
import { safeHtml } from "@/utils/sanitize";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, FileText, Edit, Trash2, Copy, Eye, ArrowLeft, LayoutGrid, List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VorlagenForm from "@/components/vertraege/VorlagenForm";

export default function VertragsvorlagenPage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVorlage, setEditingVorlage] = useState(null);
  const [previewVorlage, setPreviewVorlage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [kategorieFilter, setKategorieFilter] = useState("alle");
  const [viewMode, setViewMode] = useState("grid");
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: vorlagen = [] } = useQuery({
    queryKey: ['vertragsvorlagen', currentOrgId],
    queryFn: () => base44.entities.Vertragsvorlage.filter({ org_id: currentOrgId }, '-created_date'),
    enabled: !!currentOrgId,
  });

  const createVorlageMutation = useMutation({
    mutationFn: (data) => base44.entities.Vertragsvorlage.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertragsvorlagen'] });
      setShowForm(false);
      setEditingVorlage(null);
    },
  });

  const updateVorlageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vertragsvorlage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertragsvorlagen'] });
      setShowForm(false);
      setEditingVorlage(null);
    },
  });

  const deleteVorlageMutation = useMutation({
    mutationFn: (id) => base44.entities.Vertragsvorlage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertragsvorlagen'] });
    },
  });

  const duplicateVorlageMutation = useMutation({
    mutationFn: async (vorlage) => {
      const { id, created_date, updated_date, created_by, verwendungen, ...rest } = vorlage;
      return await base44.entities.Vertragsvorlage.create({
        ...rest,
        name: `${rest.name} (Kopie)`,
        org_id: currentOrgId,
        verwendungen: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vertragsvorlagen'] });
      alert("✅ Vorlage wurde dupliziert!");
    },
  });

  const filteredVorlagen = vorlagen.filter(v => {
    const matchesSearch = 
      v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.beschreibung?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKategorie = kategorieFilter === "alle" || v.kategorie === kategorieFilter;
    return matchesSearch && matchesKategorie;
  });

  const kategorieColors = {
    event: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-400", borderClass: "border-l-blue-400" },
    allgemein: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-400", borderClass: "border-l-gray-400" },
    abo: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-400", borderClass: "border-l-purple-400" },
    dienstleistung: { bg: "bg-green-100", text: "text-green-800", border: "border-green-400", borderClass: "border-l-green-400" },
    sonstiges: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-400", borderClass: "border-l-orange-400" }
  };

  const kategorieLabels = {
    event: "Event",
    allgemein: "Allgemein",
    abo: "Abo",
    dienstleistung: "Dienstleistung",
    sonstiges: "Sonstiges"
  };

  const handleEdit = (vorlage) => {
    setEditingVorlage(vorlage);
    setShowForm(true);
  };

  const handleDelete = (vorlage) => {
    if (confirm(`Möchtest du die Vorlage "${vorlage.name}" wirklich löschen?`)) {
      deleteVorlageMutation.mutate(vorlage.id);
    }
  };

  const handleDuplicate = (vorlage) => {
    duplicateVorlageMutation.mutate(vorlage);
  };

  const handleSubmit = (data) => {
    if (editingVorlage) {
      updateVorlageMutation.mutate({ id: editingVorlage.id, data });
    } else {
      createVorlageMutation.mutate(data);
    }
  };

  const handlePreview = (vorlage) => {
    setPreviewVorlage(vorlage);
  };

  const VorlageCard = ({ vorlage }) => {
    const kategorieStyle = kategorieColors[vorlage.kategorie] || kategorieColors.allgemein;

    return (
      <Card className={`hover:shadow-lg transition-all duration-200 border-l-4 ${kategorieStyle.borderClass} ${!vorlage.aktiv ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-1 truncate">{vorlage.name}</CardTitle>
              {vorlage.beschreibung && (
                <p className="text-sm text-gray-500 line-clamp-2">{vorlage.beschreibung}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge className={`${kategorieStyle.bg} ${kategorieStyle.text} border ${kategorieStyle.border}`}>
                {kategorieLabels[vorlage.kategorie]}
              </Badge>
              {!vorlage.aktiv && (
                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-300">
                  Inaktiv
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4 text-gray-400" />
            <span>{vorlage.verwendungen || 0}x verwendet</span>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePreview(vorlage)} className="flex-1">
              <Eye className="w-4 h-4 mr-1" />
              Vorschau
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleEdit(vorlage)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDuplicate(vorlage)}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDelete(vorlage)} className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const VorlageListItem = ({ vorlage }) => {
    const kategorieStyle = kategorieColors[vorlage.kategorie] || kategorieColors.allgemein;

    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 flex items-center gap-4 border-l-4 ${kategorieStyle.borderClass} ${!vorlage.aktiv ? 'opacity-60' : ''}`}>
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
          <FileText className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 truncate">{vorlage.name}</h3>
              {vorlage.beschreibung && (
                <p className="text-sm text-gray-500 line-clamp-1">{vorlage.beschreibung}</p>
              )}
            </div>
            <div className="flex gap-2 items-center flex-shrink-0">
              <Badge className={`${kategorieStyle.bg} ${kategorieStyle.text} border ${kategorieStyle.border}`}>
                {kategorieLabels[vorlage.kategorie]}
              </Badge>
              {!vorlage.aktiv && (
                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-300">
                  Inaktiv
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4 text-gray-400" />
            <span>{vorlage.verwendungen || 0}x verwendet</span>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => handlePreview(vorlage)}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleEdit(vorlage)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDuplicate(vorlage)}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(vorlage)} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  const aktiveVorlagen = filteredVorlagen.filter(v => v.aktiv).length;
  const inaktiveVorlagen = filteredVorlagen.filter(v => !v.aktiv).length;
  const gesamtVerwendungen = vorlagen.reduce((sum, v) => sum + (v.verwendungen || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl('Vertraege'))}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zu Verträge
          </Button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Vertragsvorlagen</h1>
            <p className="text-gray-600">Erstelle und verwalte wiederverwendbare Vertragsvorlagen</p>
          </div>
          <Button 
            onClick={() => {
              setEditingVorlage(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Vorlage erstellen
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Aktive Vorlagen</p>
                  <p className="text-2xl font-bold">{aktiveVorlagen}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Inaktive Vorlagen</p>
                  <p className="text-2xl font-bold">{inaktiveVorlagen}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Copy className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gesamt verwendet</p>
                  <p className="text-2xl font-bold">{gesamtVerwendungen}</p>
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
                  placeholder="Vorlagen durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={kategorieFilter} onValueChange={setKategorieFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Kategorien</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="allgemein">Allgemein</SelectItem>
                  <SelectItem value="abo">Abo</SelectItem>
                  <SelectItem value="dienstleistung">Dienstleistung</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
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
            <VorlagenForm
              vorlage={editingVorlage}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingVorlage(null);
              }}
            />
          </div>
        )}

        {filteredVorlagen.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVorlagen.map((vorlage) => (
                <VorlageCard key={vorlage.id} vorlage={vorlage} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVorlagen.map((vorlage) => (
                <VorlageListItem key={vorlage.id} vorlage={vorlage} />
              ))}
            </div>
          )
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Vorlagen gefunden</h3>
              <p className="text-gray-500 mb-4">Erstelle deine erste Vertragsvorlage</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Vorlage erstellen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Vorschau Modal */}
      {previewVorlage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{previewVorlage.name}</CardTitle>
                  {previewVorlage.beschreibung && (
                    <p className="text-sm text-gray-500 mt-1">{previewVorlage.beschreibung}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewVorlage(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div 
                className="prose max-w-none"
                {...safeHtml(previewVorlage.inhalt)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
