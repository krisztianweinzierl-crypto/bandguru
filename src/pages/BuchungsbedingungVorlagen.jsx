
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, Edit, Trash2, Copy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Keep Textarea if it's used elsewhere, though not for 'inhalt'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function BuchungsbedingungVorlagenPage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVorlage, setEditingVorlage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    inhalt: "",
    kategorie: "standard",
    aktiv: true
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: vorlagen = [] } = useQuery({
    queryKey: ['buchungsbedingungVorlagen', currentOrgId],
    queryFn: () => base44.entities.BuchungsbedingungVorlage.filter({ org_id: currentOrgId }, '-created_date'),
    enabled: !!currentOrgId,
  });

  const createVorlageMutation = useMutation({
    mutationFn: (data) => base44.entities.BuchungsbedingungVorlage.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buchungsbedingungVorlagen'] });
      resetForm();
    },
  });

  const updateVorlageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BuchungsbedingungVorlage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buchungsbedingungVorlagen'] });
      resetForm();
    },
  });

  const deleteVorlageMutation = useMutation({
    mutationFn: (id) => base44.entities.BuchungsbedingungVorlage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buchungsbedingungVorlagen'] });
    },
  });

  const duplicateVorlageMutation = useMutation({
    mutationFn: async (vorlage) => {
      const { id, created_date, updated_date, created_by, verwendungen, ...rest } = vorlage;
      return await base44.entities.BuchungsbedingungVorlage.create({
        ...rest,
        name: `${rest.name} (Kopie)`,
        org_id: currentOrgId,
        verwendungen: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buchungsbedingungVorlagen'] });
      alert("✅ Vorlage wurde dupliziert!");
    },
  });

  const filteredVorlagen = vorlagen.filter(v =>
    v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.inhalt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const kategorieColors = {
    standard: { bg: "bg-blue-100", text: "text-blue-800", border: "border-l-blue-400" },
    hochzeit: { bg: "bg-pink-100", text: "text-pink-800", border: "border-l-pink-400" },
    corporate: { bg: "bg-purple-100", text: "text-purple-800", border: "border-l-purple-400" },
    konzert: { bg: "bg-green-100", text: "text-green-800", border: "border-l-green-400" },
    festival: { bg: "bg-orange-100", text: "text-orange-800", border: "border-l-orange-400" },
    sonstiges: { bg: "bg-gray-100", text: "text-gray-800", border: "border-l-gray-400" }
  };

  const kategorieLabels = {
    standard: "Standard",
    hochzeit: "Hochzeit",
    corporate: "Corporate",
    konzert: "Konzert",
    festival: "Festival",
    sonstiges: "Sonstiges"
  };

  const resetForm = () => {
    setFormData({
      name: "",
      inhalt: "",
      kategorie: "standard",
      aktiv: true
    });
    setEditingVorlage(null);
    setShowForm(false);
  };

  const handleEdit = (vorlage) => {
    setEditingVorlage(vorlage);
    setFormData({
      name: vorlage.name,
      inhalt: vorlage.inhalt,
      kategorie: vorlage.kategorie,
      aktiv: vorlage.aktiv
    });
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingVorlage) {
      updateVorlageMutation.mutate({ id: editingVorlage.id, data: formData });
    } else {
      createVorlageMutation.mutate(formData);
    }
  };

  const aktiveVorlagen = vorlagen.filter(v => v.aktiv).length;
  const gesamtVerwendungen = vorlagen.reduce((sum, v) => sum + (v.verwendungen || 0), 0);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl('OrganisationSettings'))}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zu Einstellungen
          </Button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Buchungsbedingung-Vorlagen</h1>
            <p className="text-gray-600">Erstelle wiederverwendbare Vorlagen für Musiker-Buchungen</p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Vorlage erstellen
          </Button>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gesamt Vorlagen</p>
                  <p className="text-2xl font-bold">{vorlagen.length}</p>
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
                  <p className="text-sm text-gray-500">Aktive Vorlagen</p>
                  <p className="text-2xl font-bold">{aktiveVorlagen}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Copy className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gesamt verwendet</p>
                  <p className="text-2xl font-bold">{gesamtVerwendungen}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suchfeld */}
        <Card className="mb-6 border-none shadow-md">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Vorlagen durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Formular */}
        {showForm && (
          <Card className="mb-6 border-none shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle>
                {editingVorlage ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name der Vorlage *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="z.B. Standard Bedingungen"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kategorie">Kategorie</Label>
                    <Select
                      value={formData.kategorie}
                      onValueChange={(value) => setFormData({...formData, kategorie: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(kategorieLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inhalt">Buchungsbedingungen *</Label>
                  <div className="border border-gray-200 rounded-lg">
                    <ReactQuill
                      theme="snow"
                      value={formData.inhalt}
                      onChange={(value) => setFormData({...formData, inhalt: value})}
                      modules={modules}
                      formats={formats}
                      placeholder="z.B. Bitte Smoking mitbringen, Soundcheck um 18:00 Uhr, ..."
                      className="min-h-[200px]"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Diese Bedingungen werden bei der Musiker-Buchung angezeigt und müssen akzeptiert werden
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="aktiv"
                    checked={formData.aktiv}
                    onCheckedChange={(checked) => setFormData({...formData, aktiv: checked})}
                  />
                  <Label htmlFor="aktiv" className="cursor-pointer">
                    Vorlage ist aktiv
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Abbrechen
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                    disabled={createVorlageMutation.isPending || updateVorlageMutation.isPending}
                  >
                    {editingVorlage ? 'Aktualisieren' : 'Erstellen'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Vorlagen Liste */}
        {filteredVorlagen.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVorlagen.map((vorlage) => {
              const kategorieStyle = kategorieColors[vorlage.kategorie] || kategorieColors.standard;
              
              return (
                <Card key={vorlage.id} className={`hover:shadow-lg transition-all duration-200 border-l-4 ${kategorieStyle.border} ${!vorlage.aktiv ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-1 truncate">{vorlage.name}</CardTitle>
                        <div className="flex gap-2 items-center">
                          <Badge className={`${kategorieStyle.bg} ${kategorieStyle.text}`}>
                            {kategorieLabels[vorlage.kategorie]}
                          </Badge>
                          {!vorlage.aktiv && (
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-300">
                              Inaktiv
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {/* Dangerously set inner HTML for content, assuming it's sanitized HTML from ReactQuill */}
                      <div className="text-sm text-gray-700 line-clamp-3 quill-content" dangerouslySetInnerHTML={{ __html: vorlage.inhalt }}></div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>{vorlage.verwendungen || 0}x verwendet</span>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(vorlage)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Bearbeiten
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDuplicate(vorlage)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(vorlage)} 
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Vorlagen gefunden</h3>
              <p className="text-gray-500 mb-4">Erstelle deine erste Buchungsbedingung-Vorlage</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Vorlage erstellen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
