
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Building2, Mail, Phone, MapPin, Tag, MoreVertical, Edit, Send, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import KundenForm from "@/components/kunden/KundenForm";

export default function KundenPage() {
  const navigate = useNavigate();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingKunde, setEditingKunde] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdownId, setShowDropdownId] = useState(null);
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? "grid" : "list");
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: kunden = [], isLoading } = useQuery({
    queryKey: ['kunden', currentOrgId],
    queryFn: () => base44.entities.Kunde.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId
  });

  const { data: organisation } = useQuery({
    queryKey: ['organisation', currentOrgId],
    queryFn: async () => {
      const orgs = await base44.entities.Organisation.filter({ id: currentOrgId });
      return orgs[0];
    },
    enabled: !!currentOrgId
  });

  const createKundeMutation = useMutation({
    mutationFn: (data) => base44.entities.Kunde.create({ ...data, org_id: currentOrgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kunden'] });
      setShowForm(false);
      setEditingKunde(null);
    }
  });

  const updateKundeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Kunde.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kunden'] });
      setShowForm(false);
      setEditingKunde(null);
    }
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async (kunde) => {
      if (!kunde.email) {
        throw new Error("Kunde hat keine E-Mail-Adresse");
      }

      await base44.integrations.Core.SendEmail({
        to: kunde.email,
        subject: `Einladung von ${organisation.name}`,
        body: `Hallo ${kunde.ansprechpartner || 'Sehr geehrte Damen und Herren'},\n\nwir freuen uns über die Zusammenarbeit mit ${kunde.firmenname}.\n\nBei Fragen stehen wir Ihnen jederzeit zur Verfügung.\n\nMit freundlichen Grüßen\n${organisation.name}`
      });
    },
    onSuccess: (_, kunde) => {
      alert(`Nachricht wurde an ${kunde.email} versendet!`);
      setShowDropdownId(null);
    },
    onError: (error) => {
      alert("Fehler beim Versenden: " + error.message);
    }
  });

  const filteredKunden = kunden.filter((k) =>
  k.firmenname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  k.ansprechpartner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  k.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (data) => {
    if (editingKunde) {
      updateKundeMutation.mutate({ id: editingKunde.id, data });
    } else {
      createKundeMutation.mutate(data);
    }
  };

  const handleEdit = (kunde) => {
    setEditingKunde(kunde);
    setShowForm(true);
    setShowDropdownId(null);
  };

  const handleSendMessage = (kunde) => {
    if (confirm(`Möchtest du wirklich eine Nachricht an ${kunde.email} senden?`)) {
      sendInvitationMutation.mutate(kunde);
    }
  };

  const handleCardClick = (kundeId) => {
    navigate(createPageUrl(`KundenDetail?id=${kundeId}`));
  };

  const KundeCard = ({ kunde }) => {
    return (
      <Card
        className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500 cursor-pointer"
        onClick={() => handleCardClick(kunde.id)}>

        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {kunde.firmenname?.[0]?.toUpperCase() || 'K'}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-1 truncate">{kunde.firmenname}</CardTitle>
              {kunde.ansprechpartner &&
              <p className="text-sm text-gray-600 truncate">{kunde.ansprechpartner}</p>
              }
            </div>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdownId(showDropdownId === kunde.id ? null : kunde.id);
                }}>

                <MoreVertical className="w-4 h-4" />
              </Button>

              {showDropdownId === kunde.id &&
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
                      handleEdit(kunde);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">

                      <Edit className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Kunde bearbeiten</span>
                    </button>
                    
                    {kunde.email &&
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendMessage(kunde);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100">

                        <Send className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">Nachricht senden</span>
                      </button>
                  }
                  </div>
                </>
              }
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {kunde.email &&
          <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{kunde.email}</span>
            </div>
          }
          {kunde.telefon &&
          <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{kunde.telefon}</span>
            </div>
          }
          {kunde.adresse &&
          <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="truncate">{kunde.adresse}</span>
            </div>
          }
          {kunde.tags && kunde.tags.length > 0 &&
          <div className="flex flex-wrap gap-1 mt-2">
              {kunde.tags.map((tag, i) =>
            <Badge key={i} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
            )}
            </div>
          }
          {kunde.zahlungsziel_tage &&
          <div className="text-xs text-gray-500 mt-2">
              Zahlungsziel: {kunde.zahlungsziel_tage} Tage
            </div>
          }
        </CardContent>
      </Card>);

  };

  const KundeListItem = ({ kunde }) => {
    return (
      <div
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 flex items-center gap-4 cursor-pointer"
        onClick={() => handleCardClick(kunde.id)}>

        <div className="bg-[#223a5e] text-white text-lg font-bold rounded-lg w-12 h-12 from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
          {kunde.firmenname?.[0]?.toUpperCase() || 'K'}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 truncate">{kunde.firmenname}</h3>
              {kunde.ansprechpartner &&
              <p className="text-sm text-gray-600 truncate">{kunde.ansprechpartner}</p>
              }
            </div>
            <div className="relative flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdownId(showDropdownId === kunde.id ? null : kunde.id);
                }}>

                <MoreVertical className="w-4 h-4" />
              </Button>

              {showDropdownId === kunde.id &&
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
                      handleEdit(kunde);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">

                      <Edit className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Kunde bearbeiten</span>
                    </button>
                    
                    {kunde.email &&
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendMessage(kunde);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100">

                        <Send className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">Nachricht senden</span>
                      </button>
                  }
                  </div>
                </>
              }
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {kunde.email &&
            <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                <span className="truncate">{kunde.email}</span>
              </div>
            }
            {kunde.telefon &&
            <div className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                <span>{kunde.telefon}</span>
              </div>
            }
            {kunde.adresse &&
            <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{kunde.adresse}</span>
              </div>
            }
          </div>

          {kunde.tags && kunde.tags.length > 0 &&
          <div className="flex flex-wrap gap-1 mt-2">
              {kunde.tags.map((tag, i) =>
            <Badge key={i} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
            )}
            </div>
          }
        </div>
      </div>);

  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Kunden</h1>
            <p className="text-gray-600">Verwalte deine Kundenkontakte</p>
          </div>
          <Button
            onClick={() => {
              setEditingKunde(null);
              setShowForm(true);
            }}
            className="bg-slate-800 hover:bg-slate-900 text-white">

            <Plus className="w-4 h-4 mr-2" />
            Kunde anlegen
          </Button>
        </div>

        {/* Suche & View Toggle */}
        <Card className="mb-6 border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Kunden durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10" />

              </div>
              
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

        {/* Kunden Form */}
        {showForm &&
        <div className="mb-6">
            <KundenForm
            kunde={editingKunde}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingKunde(null);
            }} />

          </div>
        }

        {/* Kunden Grid/List */}
        {filteredKunden.length > 0 ?
        viewMode === "grid" ?
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKunden.map((kunde) =>
          <KundeCard key={kunde.id} kunde={kunde} />
          )}
            </div> :

        <div className="space-y-3">
              {filteredKunden.map((kunde) =>
          <KundeListItem key={kunde.id} kunde={kunde} />
          )}
            </div> :

        !showForm &&
        <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Kunden gefunden</h3>
              <p className="text-gray-500 mb-4">Lege deinen ersten Kunden an</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Kunde anlegen
              </Button>
            </CardContent>
          </Card>
        }
      </div>
    </div>);

}