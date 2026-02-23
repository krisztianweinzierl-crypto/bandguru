import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import ReactQuill from "react-quill";

export default function ArtikelVerwaltungPage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingArtikel, setEditingArtikel] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    bezeichnung: "",
    beschreibung: "",
    einheit: "Stk",
    einzelpreis: 0,
    steuersatz: 19,
    kategorie: "",
    aktiv: true
  });

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: artikel = [] } = useQuery({
    queryKey: ['artikel', currentOrgId],
    queryFn: () => base44.entities.Artikel.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId
  });

  const createArtikelMutation = useMutation({
    mutationFn: (data) => base44.entities.Artikel.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artikel'] });
      setShowForm(false);
      resetForm();
    }
  });

  const updateArtikelMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Artikel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artikel'] });
      setShowForm(false);
      setEditingArtikel(null);
      resetForm();
    }
  });

  const deleteArtikelMutation = useMutation({
    mutationFn: (id) => base44.entities.Artikel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artikel'] });
    }
  });

  const resetForm = () => {
    setFormData({
      bezeichnung: "",
      beschreibung: "",
      einheit: "Stk",
      einzelpreis: 0,
      steuersatz: 19,
      kategorie: "",
      aktiv: true
    });
    setEditingArtikel(null);
  };

  const handleEdit = (artikel) => {
    setEditingArtikel(artikel);
    setFormData({
      bezeichnung: artikel.bezeichnung,
      beschreibung: artikel.beschreibung || "",
      einheit: artikel.einheit,
      einzelpreis: artikel.einzelpreis,
      steuersatz: artikel.steuersatz,
      kategorie: artikel.kategorie || "",
      aktiv: artikel.aktiv
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingArtikel) {
      updateArtikelMutation.mutate({ id: editingArtikel.id, data: formData });
    } else {
      createArtikelMutation.mutate(formData);
    }
  };

  const handleDelete = (artikel) => {
    if (confirm(`Artikel "${artikel.bezeichnung}" wirklich löschen?`)) {
      deleteArtikelMutation.mutate(artikel.id);
    }
  };

  const filteredArtikel = artikel
    .filter(a => a.org_id === currentOrgId)
    .filter(a =>
      a.bezeichnung?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.kategorie?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Artikel & Positionen</h1>
          <p className="text-gray-600">Verwalte wiederverwendbare Artikel für Angebote und Rechnungen</p>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="border-none shadow-lg mb-6">
            <CardHeader className="border-b">
              <CardTitle>{editingArtikel ? "Artikel bearbeiten" : "Neuer Artikel"}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bezeichnung">Bezeichnung *</Label>
                    <Input
                      id="bezeichnung"
                      value={formData.bezeichnung}
                      onChange={(e) => setFormData({ ...formData, bezeichnung: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kategorie">Kategorie</Label>
                    <Input
                      id="kategorie"
                      value={formData.kategorie}
                      onChange={(e) => setFormData({ ...formData, kategorie: e.target.value })}
                      placeholder="z.B. Dienstleistung, Material"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beschreibung">Beschreibung</Label>
                  <ReactQuill
                    value={formData.beschreibung}
                    onChange={(value) => setFormData({ ...formData, beschreibung: value })}
                    modules={{
                      toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['clean']
                      ]
                    }}
                    className="bg-white rounded-md"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="einzelpreis">Einzelpreis (€) *</Label>
                    <Input
                      id="einzelpreis"
                      type="number"
                      step="0.01"
                      value={formData.einzelpreis}
                      onChange={(e) => setFormData({ ...formData, einzelpreis: parseFloat(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="einheit">Einheit</Label>
                    <Input
                      id="einheit"
                      value={formData.einheit}
                      onChange={(e) => setFormData({ ...formData, einheit: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="steuersatz">MwSt. (%)</Label>
                    <Input
                      id="steuersatz"
                      type="number"
                      value={formData.steuersatz}
                      onChange={(e) => setFormData({ ...formData, steuersatz: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Abbrechen
                  </Button>
                  <Button type="submit" style={{ backgroundColor: '#223a5e' }} className="hover:opacity-90">
                    <Save className="w-4 h-4 mr-2" />
                    Speichern
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search & Add */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Artikel durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            style={{ backgroundColor: '#223a5e' }}
            className="hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neuer Artikel
          </Button>
        </div>

        {/* Artikel Liste */}
        <Card className="border-none shadow-lg">
          <CardContent className="p-0">
            {filteredArtikel.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-700">Bezeichnung</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Kategorie</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Einheit</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Preis</th>
                      <th className="text-left p-4 font-semibold text-gray-700">MwSt.</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredArtikel.map((artikel) => (
                      <tr key={artikel.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <p className="font-medium text-gray-900">{artikel.bezeichnung}</p>
                          {artikel.beschreibung && (
                            <div 
                              className="text-sm text-gray-500 line-clamp-1" 
                              dangerouslySetInnerHTML={{ __html: artikel.beschreibung }}
                            />
                          )}
                        </td>
                        <td className="p-4">
                          {artikel.kategorie && (
                            <Badge variant="outline">{artikel.kategorie}</Badge>
                          )}
                        </td>
                        <td className="p-4 text-gray-600">{artikel.einheit}</td>
                        <td className="p-4 font-medium text-gray-900">
                          {artikel.einzelpreis.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td className="p-4 text-gray-600">{artikel.steuersatz}%</td>
                        <td className="p-4">
                          <Badge className={artikel.aktiv ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {artikel.aktiv ? "Aktiv" : "Inaktiv"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(artikel)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(artikel)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <Plus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Keine Artikel gefunden</h3>
                <p className="text-gray-500 mb-4">Erstelle deinen ersten Artikel</p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Neuer Artikel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}