
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Clock,
  Calendar as CalendarIcon,
  User,
  AlertCircle,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import AufgabeForm from "@/components/aufgaben/AufgabeForm";

// Helper function to create page URLs for notifications
const createPageUrl = (pageName) => {
  // This is a placeholder. In a real application, you would use your router's
  // method to generate paths or a more robust mapping.
  switch (pageName) {
    case 'Aufgaben':
      return '/app/aufgaben'; // Example path
    case 'Dashboard':
      return '/app/dashboard';
    // Add other cases as needed for your application's routes
    default:
      return '/app';
  }
};

export default function AufgabenPage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAufgabe, setEditingAufgabe] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("alle");
  const [expandedTasks, setExpandedTasks] = useState({});
  const [showDropdownId, setShowDropdownId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: mitgliedschaften = [] } = useQuery({
    queryKey: ['mitgliedschaften', currentOrgId, user?.id],
    queryFn: () => base44.entities.Mitglied.filter({ 
      org_id: currentOrgId,
      user_id: user?.id,
      status: "aktiv"
    }),
    enabled: !!currentOrgId && !!user?.id,
  });

  // Prüfe ob der User ein Band Manager ist
  const currentMitglied = mitgliedschaften.find(m => m.org_id === currentOrgId);
  const isManager = currentMitglied?.rolle === "Band Manager";

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben', currentOrgId, user?.id, isManager],
    queryFn: async () => {
      if (!currentOrgId) return [];
      
      const allAufgaben = await base44.entities.Aufgabe.filter({ org_id: currentOrgId }, '-created_date');
      
      // Manager sehen alle Aufgaben
      if (isManager) {
        return allAufgaben;
      }
      
      // Musiker sehen nur:
      // 1. Ihre eigenen erstellten Aufgaben (created_by)
      // 2. Ihnen zugewiesene Aufgaben (zugewiesen_an)
      return allAufgaben.filter(a => 
        a.created_by === user?.email || 
        a.zugewiesen_an === user?.id
      );
    },
    enabled: !!currentOrgId && !!user?.id,
  });

  const { data: mitglieder = [] } = useQuery({
    queryKey: ['mitglieder', currentOrgId],
    queryFn: () => base44.entities.Mitglied.filter({ org_id: currentOrgId, status: "aktiv" }),
    enabled: !!currentOrgId,
  });

  const createAufgabeMutation = useMutation({
    mutationFn: async ({ hauptaufgabe, unteraufgaben }) => {
      // 1. Hauptaufgabe erstellen
      const createdHauptaufgabe = await base44.entities.Aufgabe.create({
        ...hauptaufgabe,
        org_id: currentOrgId
      });

      // 2. Unteraufgaben erstellen (falls vorhanden)
      if (unteraufgaben && unteraufgaben.length > 0) {
        const unteraufgabenPromises = unteraufgaben
          .filter(u => u.titel && u.titel.trim()) // Nur Unteraufgaben mit Titel
          .map(unteraufgabe =>
            base44.entities.Aufgabe.create({
              org_id: currentOrgId,
              titel: unteraufgabe.titel,
              prioritaet: unteraufgabe.prioritaet || "normal",
              status: "offen",
              parent_task_id: createdHauptaufgabe.id,
              // Inherit assignee from parent task if not explicitly set for subtask
              zugewiesen_an: unteraufgabe.zugewiesen_an || hauptaufgabe.zugewiesen_an
            })
          );

        if (unteraufgabenPromises.length > 0) {
          await Promise.all(unteraufgabenPromises);
        }
      }

      // Benachrichtigung erstellen, wenn Hauptaufgabe zugewiesen wurde
      if (hauptaufgabe.zugewiesen_an) {
        try {
          await base44.entities.Benachrichtigung.create({
            org_id: currentOrgId,
            user_id: hauptaufgabe.zugewiesen_an,
            typ: 'aufgabe_zugewiesen',
            titel: 'Neue Aufgabe zugewiesen',
            nachricht: `Dir wurde die Aufgabe "${hauptaufgabe.titel}" zugewiesen`,
            link_url: createPageUrl('Aufgaben'),
            bezug_typ: 'aufgabe',
            bezug_id: createdHauptaufgabe.id,
            icon: 'CheckCircle',
            prioritaet: hauptaufgabe.prioritaet === 'hoch' ? 'hoch' : 'normal'
          });
        } catch (error) {
          console.error("Fehler beim Erstellen der Benachrichtigung:", error);
        }
      }

      return createdHauptaufgabe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      setShowForm(false);
      setEditingAufgabe(null);
    },
  });

  const updateAufgabeMutation = useMutation({
    mutationFn: async ({ aufgabeId, hauptaufgabe, unteraufgaben }) => {
      const oldAufgabe = aufgaben.find(a => a.id === aufgabeId);

      // 1. Hauptaufgabe updaten
      await base44.entities.Aufgabe.update(aufgabeId, hauptaufgabe);

      // 2. Neue Unteraufgaben erstellen (falls vorhanden)
      if (unteraufgaben && unteraufgaben.length > 0) {
        const unteraufgabenPromises = unteraufgaben
          .filter(u => u.titel && u.titel.trim())
          .map(unteraufgabe =>
            base44.entities.Aufgabe.create({
              org_id: currentOrgId,
              titel: unteraufgabe.titel,
              prioritaet: unteraufgabe.prioritaet || "normal",
              status: "offen",
              parent_task_id: aufgabeId,
              // Inherit assignee from parent task if not explicitly set for subtask
              zugewiesen_an: unteraufgabe.zugewiesen_an || hauptaufgabe.zugewiesen_an
            })
          );

        if (unteraufgabenPromises.length > 0) {
          await Promise.all(unteraufgabenPromises);
        }
      }

      // Benachrichtigung erstellen, wenn Zuweisung geändert wurde
      if (hauptaufgabe.zugewiesen_an &&
          oldAufgabe?.zugewiesen_an !== hauptaufgabe.zugewiesen_an) {
        try {
          await base44.entities.Benachrichtigung.create({
            org_id: currentOrgId,
            user_id: hauptaufgabe.zugewiesen_an,
            typ: 'aufgabe_zugewiesen',
            titel: 'Aufgabe zugewiesen',
            nachricht: `Dir wurde die Aufgabe "${hauptaufgabe.titel}" zugewiesen`,
            link_url: createPageUrl('Aufgaben'),
            bezug_typ: 'aufgabe',
            bezug_id: aufgabeId,
            icon: 'CheckCircle',
            prioritaet: hauptaufgabe.prioritaet === 'hoch' ? 'hoch' : 'normal'
          });
        } catch (error) {
          console.error("Fehler beim Erstellen der Benachrichtigung:", error);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      setShowForm(false);
      setEditingAufgabe(null);
      setShowDropdownId(null);
    },
  });

  const deleteAufgabeMutation = useMutation({
    mutationFn: (id) => base44.entities.Aufgabe.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      setShowDropdownId(null);
    },
  });

  const handleSubmit = (hauptaufgabe, unteraufgaben = []) => {
    if (editingAufgabe) {
      // Bei Bearbeitung: Hauptaufgabe updaten + neue Unteraufgaben erstellen
      updateAufgabeMutation.mutate({ aufgabeId: editingAufgabe.id, hauptaufgabe, unteraufgaben });
    } else {
      // Bei neuer Aufgabe: Hauptaufgabe + Unteraufgaben erstellen
      createAufgabeMutation.mutate({ hauptaufgabe, unteraufgaben });
    }
  };

  const handleStatusToggle = (aufgabe) => {
    const newStatus = aufgabe.status === 'erledigt' ? 'offen' : 'erledigt';
    updateAufgabeMutation.mutate({
      aufgabeId: aufgabe.id,
      hauptaufgabe: { ...aufgabe, status: newStatus },
      unteraufgaben: [] // Keine neuen Unteraufgaben beim Status-Toggle
    });
  };

  const handleEdit = (aufgabe) => {
    setEditingAufgabe(aufgabe);
    setShowForm(true);
    setShowDropdownId(null);
  };

  const handleDelete = (aufgabe) => {
    if (confirm(`Möchtest du die Aufgabe "${aufgabe.titel}" wirklich löschen?`)) {
      deleteAufgabeMutation.mutate(aufgabe.id);
    }
  };

  const toggleExpand = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Aufgaben filtern und gruppieren
  const hauptAufgaben = aufgaben.filter(a => !a.parent_task_id);
  const unteraufgabenMap = aufgaben.reduce((acc, aufgabe) => {
    if (aufgabe.parent_task_id) {
      if (!acc[aufgabe.parent_task_id]) acc[aufgabe.parent_task_id] = [];
      acc[aufgabe.parent_task_id].push(aufgabe);
    }
    return acc;
  }, {});

  const filteredAufgaben = hauptAufgaben.filter(a => {
    const matchesSearch = a.titel?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "alle" || a.prioritaet === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const offeneAufgaben = filteredAufgaben.filter(a => a.status === 'offen');
  const inArbeitAufgaben = filteredAufgaben.filter(a => a.status === 'in_arbeit');
  const erledigtAufgaben = filteredAufgaben.filter(a => a.status === 'erledigt');
  const meineAufgaben = filteredAufgaben.filter(a => a.zugewiesen_an === user?.id);

  const priorityColors = {
    niedrig: "text-gray-400",
    normal: "text-blue-500",
    hoch: "text-red-500"
  };

  const priorityBadges = {
    niedrig: "bg-gray-100 text-gray-800",
    normal: "bg-blue-100 text-blue-800",
    hoch: "bg-red-100 text-red-800"
  };

  const AufgabeItem = ({ aufgabe, level = 0 }) => {
    const unteraufgaben = unteraufgabenMap[aufgabe.id] || [];
    const hasUnteraufgaben = unteraufgaben.length > 0;
    const isExpanded = expandedTasks[aufgabe.id];
    const isOverdue = aufgabe.faellig_am && new Date(aufgabe.faellig_am) < new Date() && aufgabe.status !== 'erledigt';
    const assignedMitglied = mitglieder.find(m => m.user_id === aufgabe.zugewiesen_an);

    return (
      <div className={`${level > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        <div
          className={`group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
            aufgabe.status === 'erledigt' ? 'opacity-60' : ''
          }`}
        >
          {/* Expand/Collapse Button */}
          {hasUnteraufgaben ? (
            <button
              onClick={() => toggleExpand(aufgabe.id)}
              className="mt-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-0.5 transition-all"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Checkbox */}
          <button
            onClick={() => handleStatusToggle(aufgabe)}
            className="mt-1"
          >
            {aufgabe.status === 'erledigt' ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className={`w-5 h-5 ${priorityColors[aufgabe.prioritaet]}`} />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${aufgabe.status === 'erledigt' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {aufgabe.titel}
                  {hasUnteraufgaben && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({unteraufgaben.filter(u => u.status === 'erledigt').length}/{unteraufgaben.length})
                    </span>
                  )}
                </p>
                {aufgabe.beschreibung && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{aufgabe.beschreibung}</p>
                )}

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {aufgabe.faellig_am && (
                    <div className={`flex items-center gap-1 text-xs ${
                      isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                    }`}>
                      <CalendarIcon className="w-3 h-3" />
                      {format(new Date(aufgabe.faellig_am), 'dd. MMM', { locale: de })}
                    </div>
                  )}

                  {assignedMitglied && (
                    <Badge variant="outline" className="text-xs">
                      <User className="w-3 h-3 mr-1" />
                      {assignedMitglied.rolle}
                    </Badge>
                  )}

                  {aufgabe.prioritaet !== 'normal' && (
                    <Badge className={`${priorityBadges[aufgabe.prioritaet]} text-xs`}>
                      {aufgabe.prioritaet === 'hoch' && <AlertCircle className="w-3 h-3 mr-1" />}
                      {aufgabe.prioritaet}
                    </Badge>
                  )}

                  {aufgabe.status === 'in_arbeit' && (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      In Arbeit
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowDropdownId(showDropdownId === aufgabe.id ? null : aufgabe.id)}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>

                {showDropdownId === aufgabe.id && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowDropdownId(null)}
                    />
                    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-48 overflow-hidden">
                      <button
                        onClick={() => handleEdit(aufgabe)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDelete(aufgabe)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-left text-sm text-red-600 border-t"
                      >
                        <Trash2 className="w-4 h-4" />
                        Löschen
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Unteraufgaben */}
        {hasUnteraufgaben && isExpanded && (
          <div className="mt-1">
            {unteraufgaben.map(unteraufgabe => (
              <AufgabeItem key={unteraufgabe.id} aufgabe={unteraufgabe} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Aufgaben</h1>
            <p className="text-gray-600">Organisiere und verfolge deine Aufgaben</p>
          </div>
          <Button
            onClick={() => {
              setEditingAufgabe(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neue Aufgabe
          </Button>
        </div>

        {/* Search & Filter */}
        <Card className="mb-6 border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Aufgaben durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white"
              >
                <option value="alle">Alle Prioritäten</option>
                <option value="niedrig">Niedrig</option>
                <option value="normal">Normal</option>
                <option value="hoch">Hoch</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {showForm && (
          <div className="mb-6">
            <AufgabeForm
              aufgabe={editingAufgabe}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingAufgabe(null);
              }}
              mitglieder={mitglieder}
              hauptAufgaben={hauptAufgaben}
              allAufgaben={aufgaben}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="alle" className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="alle">
              Alle ({filteredAufgaben.length})
            </TabsTrigger>
            <TabsTrigger value="meine">
              Meine ({meineAufgaben.length})
            </TabsTrigger>
            <TabsTrigger value="offen">
              Offen ({offeneAufgaben.length})
            </TabsTrigger>
            <TabsTrigger value="in_arbeit">
              In Arbeit ({inArbeitAufgaben.length})
            </TabsTrigger>
            <TabsTrigger value="erledigt">
              Erledigt ({erledigtAufgaben.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alle">
            <Card className="border-none shadow-lg">
              <CardContent className="p-0">
                {filteredAufgaben.length > 0 ? (
                  <div className="divide-y">
                    {filteredAufgaben.map(aufgabe => (
                      <AufgabeItem key={aufgabe.id} aufgabe={aufgabe} />
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Keine Aufgaben gefunden</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meine">
            <Card className="border-none shadow-lg">
              <CardContent className="p-0">
                {meineAufgaben.length > 0 ? (
                  <div className="divide-y">
                    {meineAufgaben.map(aufgabe => (
                      <AufgabeItem key={aufgabe.id} aufgabe={aufgabe} />
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Keine Aufgaben zugewiesen</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offen">
            <Card className="border-none shadow-lg">
              <CardContent className="p-0">
                {offeneAufgaben.length > 0 ? (
                  <div className="divide-y">
                    {offeneAufgaben.map(aufgabe => (
                      <AufgabeItem key={aufgabe.id} aufgabe={aufgabe} />
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Keine offenen Aufgaben</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="in_arbeit">
            <Card className="border-none shadow-lg">
              <CardContent className="p-0">
                {inArbeitAufgaben.length > 0 ? (
                  <div className="divide-y">
                    {inArbeitAufgaben.map(aufgabe => (
                      <AufgabeItem key={aufgabe.id} aufgabe={aufgabe} />
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Keine Aufgaben in Arbeit</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="erledigt">
            <Card className="border-none shadow-lg">
              <CardContent className="p-0">
                {erledigtAufgaben.length > 0 ? (
                  <div className="divide-y">
                    {erledigtAufgaben.map(aufgabe => (
                      <AufgabeItem key={aufgabe.id} aufgabe={aufgabe} />
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Keine erledigten Aufgaben</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
