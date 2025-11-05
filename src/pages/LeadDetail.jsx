
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Mail,
  Phone,
  Calendar,
  MapPin,
  User,
  Users as UsersIcon,
  Building2,
  Euro,
  FileText,
  CheckCircle,
  CheckSquare,
  Plus,
  Send,
  Activity,
  Clock,
  Circle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  MoreVertical,
  Trash2,
  Upload,
  File,
  Download,
  Eye,
  DollarSign,
  Target,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import AufgabeForm from "@/components/aufgaben/AufgabeForm";
import LeadForm from "@/components/leads/LeadForm"; // Added LeadForm import
import EmailForm from "@/components/leads/EmailForm";

export default function LeadDetailPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [showAufgabeForm, setShowAufgabeForm] = useState(false);
  const [editingAufgabe, setEditingAufgabe] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [showDropdownId, setShowDropdownId] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileDescription, setFileDescription] = useState("");
  const [fileKategorie, setFileKategorie] = useState("sonstiges");
  const [showFileDropdownId, setShowFileDropdownId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isManager, setIsManager] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);


  // 1. Erst Lead laden
  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const result = await base44.entities.Lead.filter({ id: leadId });
      return result[0];
    },
    enabled: !!leadId
  });

  // 2. Dann User-Daten und Berechtigungen laden (abhängig von lead)
  useEffect(() => {
    const loadUserData = async () => {
      if (!lead) return; // Ensure lead is available

      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        // Prüfe Rolle
        const mitgliedschaften = await base44.entities.Mitglied.filter({
          user_id: user.id,
          org_id: lead.org_id, // Use lead from useQuery
          status: "aktiv"
        });
        const mitglied = mitgliedschaften[0];
        setIsManager(mitglied?.rolle === "Band Manager");
      } catch (error) {
        console.error("Fehler beim Laden der User-Daten:", error);
        setCurrentUser(null); // Ensure currentUser is null on error
        setIsManager(false);
      }
    };

    // Only run if lead is defined
    if (lead) {
      loadUserData();
    }
  }, [lead, leadId]); // Depend on lead and leadId

  const { data: notizen = [] } = useQuery({
    queryKey: ['leadNotizen', leadId],
    queryFn: () => base44.entities.LeadNotiz.filter({ lead_id: leadId }, '-created_date'),
    enabled: !!leadId && isManager
  });

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['leadAufgaben', leadId],
    queryFn: () => base44.entities.Aufgabe.filter({
      bezug_typ: 'lead',
      bezug_id: leadId
    }, '-created_date'),
    enabled: !!leadId && isManager
  });

  const { data: dateien = [] } = useQuery({
    queryKey: ['leadDateien', leadId],
    queryFn: () => base44.entities.Datei.filter({
      bezug_typ: 'lead',
      bezug_id: leadId
    }, '-created_date'),
    enabled: !!leadId && isManager
  });

  const { data: mitglieder = [] } = useQuery({
    queryKey: ['mitglieder', lead?.org_id],
    queryFn: () => base44.entities.Mitglied.filter({ org_id: lead.org_id, status: "aktiv" }),
    enabled: !!lead?.org_id && isManager
  });

  const { data: emailLogs = [] } = useQuery({
    queryKey: ['emailLogs', leadId],
    queryFn: () => base44.entities.EmailLog.filter({
      bezug_typ: 'lead',
      bezug_id: leadId
    }, '-created_date'),
    enabled: !!leadId && isManager
  });

  // Modified updateLeadMutation to accept {id, data} payload
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const createNotizMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadNotiz.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadNotizen', leadId] });
      setNewNote("");
    }
  });

  const createAufgabeMutation = useMutation({
    mutationFn: async ({ hauptaufgabe, unteraufgaben }) => {
      const createdHauptaufgabe = await base44.entities.Aufgabe.create({
        ...hauptaufgabe,
        org_id: lead.org_id,
        bezug_typ: 'lead',
        bezug_id: leadId
      });

      if (unteraufgaben && unteraufgaben.length > 0) {
        const unteraufgabenData = unteraufgaben.
        filter((u) => u.titel && u.titel.trim()).
        map((u) => ({
          titel: u.titel,
          beschreibung: u.beschreibung,
          prioritaet: u.prioritaet || 'normal',
          faellig_am: u.faellig_am,
          status: 'offen',
          org_id: lead.org_id,
          bezug_typ: 'lead',
          bezug_id: leadId,
          parent_task_id: createdHauptaufgabe.id,
          zugewiesen_an: u.zugewiesen_an
        }));

        if (unteraufgabenData.length > 0) {
          await base44.entities.Aufgabe.bulkCreate(unteraufgabenData);
        }
      }

      return createdHauptaufgabe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadAufgaben'] });
      setShowAufgabeForm(false);
      setEditingAufgabe(null);
    }
  });

  const updateAufgabeMutation = useMutation({
    mutationFn: async ({ id, data, unteraufgaben }) => {
      await base44.entities.Aufgabe.update(id, data);

      if (unteraufgaben && unteraufgaben.length > 0) {
        // Handle new subtasks if any are passed during an update
        const newUnteraufgabenData = unteraufgaben.
        filter((u) => u.titel && u.titel.trim() && !u.id)
        .map((u) => ({
          titel: u.titel,
          beschreibung: u.beschreibung,
          prioritaet: u.prioritaet || 'normal',
          faellig_am: u.faellig_am,
          status: 'offen',
          org_id: lead.org_id,
          bezug_typ: 'lead',
          bezug_id: leadId,
          parent_task_id: id,
          zugewiesen_an: u.zugewiesen_an
        }));

        if (newUnteraufgabenData.length > 0) {
          await base44.entities.Aufgabe.bulkCreate(newUnteraufgabenData);
        }

        // Handle updates to existing subtasks (if any are sent with IDs)
        const updatedUnteraufgabenData = unteraufgaben.
        filter((u) => u.titel && u.titel.trim() && u.id).
        map((u) => base44.entities.Aufgabe.update(u.id, u));

        if (updatedUnteraufgabenData.length > 0) {
          await Promise.all(updatedUnteraufgabenData);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadAufgaben'] });
      setShowAufgabeForm(false);
      setEditingAufgabe(null);
      setShowDropdownId(null);
    }
  });

  const deleteAufgabeMutation = useMutation({
    mutationFn: (id) => base44.entities.Aufgabe.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadAufgaben'] });
      setShowDropdownId(null);
    }
  });

  const deleteDateiMutation = useMutation({
    mutationFn: (id) => base44.entities.Datei.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadDateien'] });
      setShowFileDropdownId(null);
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ betreff, inhalt }) => {
      if (!lead.email) {
        throw new Error("Lead hat keine E-Mail-Adresse");
      }

      setSendingEmail(true);

      try {
        // E-Mail versenden
        const emailResult = await base44.functions.invoke('sendEmail', {
          to: lead.email,
          subject: betreff,
          body: inhalt.replace(/<[^>]*>/g, ''), // HTML Tags entfernen für Plain Text
          from_name: currentUser?.full_name || 'Bandguru'
        });

        if (!emailResult.data.success) {
          throw new Error(emailResult.data.error || 'Fehler beim Versenden');
        }

        // E-Mail Log erstellen
        await base44.entities.EmailLog.create({
          org_id: lead.org_id,
          bezug_typ: 'lead',
          bezug_id: leadId,
          empfaenger_email: lead.email,
          empfaenger_name: lead.kontaktperson || lead.firmenname,
          betreff: betreff,
          inhalt: inhalt,
          gesendet_von: currentUser.id,
          gesendet_von_name: currentUser.full_name,
          status: 'gesendet',
          mailgun_id: emailResult.data.mailgun_id
        });

        return emailResult;
      } catch (error) {
        // Log auch bei Fehler erstellen
        await base44.entities.EmailLog.create({
          org_id: lead.org_id,
          bezug_typ: 'lead',
          bezug_id: leadId,
          empfaenger_email: lead.email,
          empfaenger_name: lead.kontaktperson || lead.firmenname,
          betreff: betreff,
          inhalt: inhalt,
          gesendet_von: currentUser.id,
          gesendet_von_name: currentUser.full_name,
          status: 'fehler',
          fehler_nachricht: error.message
        });

        throw error;
      } finally {
        setSendingEmail(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
      setShowEmailForm(false);
      alert('E-Mail wurde erfolgreich versendet!');
    },
    onError: (error) => {
      alert('Fehler beim Versenden: ' + error.message);
    }
  });

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      // 1. Datei hochladen
      const uploadResult = await base44.integrations.Core.UploadFile({ file });

      // 2. Datei-Eintrag in DB erstellen
      await base44.entities.Datei.create({
        org_id: lead.org_id,
        file_url: uploadResult.file_url,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        bezug_typ: 'lead',
        bezug_id: leadId,
        beschreibung: fileDescription,
        kategorie: fileKategorie
      });

      // 3. State zurücksetzen und Liste neu laden
      queryClient.invalidateQueries({ queryKey: ['leadDateien'] });
      setFileDescription("");
      setFileKategorie("sonstiges");
      event.target.value = ""; // Clear the file input
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
      alert("Fehler beim Hochladen der Datei: " + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = (datei) => {
    if (confirm(`Möchtest du die Datei "${datei.file_name}" wirklich löschen?`)) {
      deleteDateiMutation.mutate(datei.id);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return '🖼️';
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return '📊';
    if (fileType?.includes('zip') || fileType?.includes('rar')) return '🗜️';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const kategorieLabels = {
    vertrag: "Vertrag",
    angebot: "Angebot",
    rechnung: "Rechnung",
    technische_unterlagen: "Technische Unterlagen",
    bilder: "Bilder",
    sonstiges: "Sonstiges"
  };

  const kategorieBadges = {
    vertrag: "bg-blue-100 text-blue-800",
    angebot: "bg-purple-100 text-purple-800",
    rechnung: "bg-green-100 text-green-800",
    technische_unterlagen: "bg-orange-100 text-orange-800",
    bilder: "bg-pink-100 text-pink-800",
    sonstiges: "bg-gray-100 text-gray-800"
  };

  // Modified handleStatusChange to match new updateLeadMutation signature
  const handleStatusChange = (newStatus) => {
    updateLeadMutation.mutate({ id: leadId, data: { status: newStatus } });
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

  const handleAufgabeSubmit = (hauptaufgabe, unteraufgaben = []) => {
    if (editingAufgabe) {
      updateAufgabeMutation.mutate({ id: editingAufgabe.id, data: hauptaufgabe, unteraufgaben });
    } else {
      createAufgabeMutation.mutate({ hauptaufgabe, unteraufgaben });
    }
  };

  const handleToggleAufgabeStatus = (aufgabe) => {
    const newStatus = aufgabe.status === 'erledigt' ? 'offen' : 'erledigt';
    updateAufgabeMutation.mutate({
      id: aufgabe.id,
      data: { ...aufgabe, status: newStatus },
      unteraufgaben: [] // Pass an empty array to indicate no subtask changes from this action
    });
  };

  const handleEditAufgabe = (aufgabe) => {
    setEditingAufgabe(aufgabe);
    setShowAufgabeForm(true);
    setShowDropdownId(null);
  };

  const handleDeleteAufgabe = (aufgabe) => {
    if (window.confirm(`Möchtest du die Aufgabe "${aufgabe.titel}" wirklich löschen? Alle Unteraufgaben werden ebenfalls gelöscht.`)) {
      deleteAufgabeMutation.mutate(aufgabe.id);
    }
  };

  const toggleExpand = (taskId) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleConvertToEvent = () => {
    // Später: Lead in Event konvertieren
    alert("Lead wird in Event konvertiert (Feature kommt später)");
  };

  const handleCreateAngebot = () => {
    // Navigiere zur Rechnungsseite mit vorausgefüllten Daten
    if (lead.kunde_id) {
      navigate(createPageUrl('Rechnungen') + '?create=true&kunde_id=' + lead.kunde_id + '&lead_id=' + leadId);
    } else {
      alert('Bitte erstelle zuerst einen Kunden für diesen Lead, um ein Angebot zu erstellen.');
    }
  };

  const handleLeadUpdate = (data) => {
    updateLeadMutation.mutate({ id: leadId, data });
    setIsEditing(false);
  };

  const handleSendEmail = (formData) => {
    sendEmailMutation.mutate(formData);
  };

  // Lade-Status für Lead
  if (leadLoading || !lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade Lead...</p>
      </div>);

  }

  // Warte auf User-Daten und Berechtigungsprüfung
  if (currentUser === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Prüfe Berechtigungen...</p>
      </div>);

  }

  // Zugriffsprüfung: Nur Manager haben Zugriff auf Leads
  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h3 className="text-lg font-semibold mb-2">Kein Zugriff auf Leads</h3>
            <p className="text-sm text-gray-600 mb-4">
              Nur Band Manager haben Zugriff auf Lead-Verwaltung.
            </p>
            <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zum Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>);

  }

  // Aufgaben gruppieren
  const hauptAufgaben = aufgaben.filter((a) => !a.parent_task_id);
  const unteraufgabenMap = aufgaben.reduce((acc, aufgabe) => {
    if (aufgabe.parent_task_id) {
      if (!acc[aufgabe.parent_task_id]) acc[aufgabe.parent_task_id] = [];
      acc[aufgabe.parent_task_id].push(aufgabe);
    }
    return acc;
  }, {});

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

  const statusStyle = statusColors[lead.status] || statusColors.neu;
  const assignedMitglied = mitglieder.find((m) => m.user_id === lead.zugewiesen_an);

  const offeneAufgaben = hauptAufgaben.filter((a) => a.status === 'offen').length;
  const erledigtAufgaben = hauptAufgaben.filter((a) => a.status === 'erledigt').length;

  const AufgabeItem = ({ aufgabe, level = 0 }) => {
    const unteraufgaben = unteraufgabenMap[aufgabe.id] || [];
    const hasUnteraufgaben = unteraufgaben.length > 0;
    const isExpanded = expandedTasks[aufgabe.id];
    const isOverdue = aufgabe.faellig_am && new Date(aufgabe.faellig_am) < new Date() && aufgabe.status !== 'erledigt';
    const assignedMitgliedForTask = mitglieder.find((m) => m.user_id === aufgabe.zugewiesen_an);

    return (
      <div className={`${level > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        <div
          className={`group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
          aufgabe.status === 'erledigt' ? 'opacity-60' : ''}`
          }>

          {/* Expand/Collapse Button */}
          {hasUnteraufgaben ?
          <button
            onClick={() => toggleExpand(aufgabe.id)}
            className="mt-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-0.5 transition-all">

              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button> :

          <div className="w-5" />
          }

          {/* Checkbox */}
          <button
            onClick={() => handleToggleAufgabeStatus(aufgabe)}
            className="mt-1">

            {aufgabe.status === 'erledigt' ?
            <CheckCircle2 className="w-5 h-5 text-green-500" /> :

            <Circle className={`w-5 h-5 ${priorityColors[aufgabe.prioritaet]}`} />
            }
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${aufgabe.status === 'erledigt' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {aufgabe.titel}
                  {hasUnteraufgaben &&
                  <span className="ml-2 text-xs text-gray-500">
                      ({unteraufgaben.filter((u) => u.status === 'erledigt').length}/{unteraufgaben.length})
                    </span>
                  }
                </p>
                {aufgabe.beschreibung &&
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{aufgabe.beschreibung}</p>
                }

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {aufgabe.faellig_am &&
                  <div className={`flex items-center gap-1 text-xs ${
                  isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`
                  }>
                      <Calendar className="w-3 h-3" />
                      {format(new Date(aufgabe.faellig_am), 'dd. MMM', { locale: de })}
                    </div>
                  }

                  {assignedMitgliedForTask &&
                  <Badge variant="outline" className="text-xs">
                      <User className="w-3 h-3 mr-1" />
                      {assignedMitgliedForTask.name}
                    </Badge>
                  }

                  {aufgabe.prioritaet !== 'normal' &&
                  <Badge className={`${priorityBadges[aufgabe.prioritaet]} text-xs`}>
                      {aufgabe.prioritaet === 'hoch' && <AlertCircle className="w-3 h-3 mr-1" />}
                      {aufgabe.prioritaet}
                    </Badge>
                  }

                  {aufgabe.status === 'in_arbeit' &&
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      In Arbeit
                    </Badge>
                  }
                </div>
              </div>

              {/* Actions */}
              <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowDropdownId(showDropdownId === aufgabe.id ? null : aufgabe.id)}>

                  <MoreVertical className="w-4 h-4" />
                </Button>

                {showDropdownId === aufgabe.id &&
                <>
                    <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdownId(null)} />

                    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-48 overflow-hidden">
                      <button
                      onClick={() => handleEditAufgabe(aufgabe)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left text-sm">

                        <Edit className="w-4 h-4" />
                        Bearbeiten
                      </button>
                      <button
                      onClick={() => handleDeleteAufgabe(aufgabe)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-left text-sm text-red-600 border-t">

                        <Trash2 className="w-4 h-4" />
                        Löschen
                      </button>
                    </div>
                  </>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Unteraufgaben */}
        {hasUnteraufgaben && isExpanded &&
        <div className="mt-1">
            {unteraufgaben.map((unteraufgabe) =>
          <AufgabeItem key={unteraufgabe.id} aufgabe={unteraufgabe} level={level + 1} />
          )}
          </div>
        }
      </div>);

  };

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
              className="gap-2">

              <ArrowLeft className="w-4 h-4" />
              Zurück zu Leads
            </Button>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{lead.titel}</h1>
              {lead.firmenname &&
              <p className="text-lg text-gray-600">{lead.firmenname}</p>
              }
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleConvertToEvent}
                className="gap-2 bg-green-600 hover:bg-green-700">

                <CheckCircle className="w-4 h-4" />
                Lead konvertieren
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2">

                <Edit className="w-4 h-4" />
                Edit Lead
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {isEditing ? (
          <LeadForm
            lead={lead}
            onSubmit={handleLeadUpdate}
            onCancel={() => setIsEditing(false)}
            mitglieder={mitglieder}
          />
        ) : (
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
                    <Label className="text-xs text-gray-600 mb-2 block">Status</Label>
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
                  {lead.event_datum &&
                  <div>
                      <p className="text-xs text-gray-500 mb-1 uppercase">Event-Datum</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="font-semibold text-gray-900">
                          {format(new Date(lead.event_datum), 'dd.MM.yyyy', { locale: de })}
                        </p>
                      </div>
                    </div>
                  }

                  {lead.event_ort &&
                  <div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{lead.event_ort}</span>
                      </div>
                    </div>
                  }

                  {lead.event_typ &&
                  <div>
                      <Badge variant="outline">{lead.event_typ}</Badge>
                    </div>
                  }

                  {lead.kontaktperson &&
                  <div>
                      <p className="text-xs text-gray-500 mb-1">Kontaktperson</p>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{lead.kontaktperson}</span>
                      </div>
                    </div>
                  }

                  {lead.email &&
                  <div>
                      <p className="text-xs text-gray-500 mb-1">E-Mail</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline truncate">
                          {lead.email}
                        </a>
                      </div>
                    </div>
                  }

                  {lead.telefon &&
                  <div>
                      <p className="text-xs text-gray-500 mb-1">Telefon</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${lead.telefon}`} className="text-gray-900 hover:underline">
                          {lead.telefon}
                        </a>
                      </div>
                    </div>
                  }

                  {lead.firmenname &&
                  <div>
                      <p className="text-xs text-gray-500 mb-1">Unternehmen</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{lead.firmenname}</span>
                      </div>
                    </div>
                  }

                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                      {statusLabels[lead.status]}
                    </Badge>
                  </div>

                  {lead.erwarteter_umsatz &&
                  <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Erwarteter Umsatz</p>
                      <div className="flex items-center gap-2">
                        <Euro className="w-5 h-5 text-green-600" />
                        <span className="text-xl font-bold text-green-600">
                          {lead.erwarteter_umsatz.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                    </div>
                  }

                  {lead.quelle &&
                  <div>
                      <p className="text-xs text-gray-500 mb-1">Quelle</p>
                      <p className="text-sm font-medium">{lead.quelle}</p>
                    </div>
                  }

                  {assignedMitglied &&
                  <div>
                      <p className="text-xs text-gray-500 mb-1">Zugewiesen an</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {assignedMitglied.name?.[0]}
                        </div>
                        <span className="text-sm font-medium">{assignedMitglied.name}</span>
                      </div>
                    </div>
                  }
                </CardContent>
              </Card>

              {/* Letzte Notiz */}
              {notizen.length > 0 &&
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
              }
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCreateAngebot}
                    >
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateAngebot}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Erstes Angebot erstellen
                  </Button>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="notizen" className="space-y-6">
                <TabsList className="bg-white border shadow-sm">
                  <TabsTrigger value="notizen">Notizen</TabsTrigger>
                  <TabsTrigger value="aufgaben">
                    Aufgaben
                    {hauptAufgaben.length > 0 &&
                    <Badge variant="secondary" className="ml-2">
                        {offeneAufgaben}
                      </Badge>
                    }
                  </TabsTrigger>
                  <TabsTrigger value="dateien">
                    Dateien
                    {dateien.length > 0 &&
                    <Badge variant="secondary" className="ml-2">
                        {dateien.length}
                      </Badge>
                    }
                  </TabsTrigger>
                  <TabsTrigger value="emails">E-Mails</TabsTrigger>
                  <TabsTrigger value="verlauf">Verlauf</TabsTrigger>
                </TabsList>

                {/* Notizen Tab */}
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
                        className="mb-4" />

                      <Button
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || createNotizMutation.isPending} className="bg-[#223a5e] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-9 from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">


                        <Send className="w-4 h-4 mr-2" />
                        {createNotizMutation.isPending ? "Speichert..." : "Notiz hinzufügen"}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg mt-6">
                    <CardHeader className="border-b">
                      <CardTitle>Notizen-Verlauf</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {notizen.length > 0 ?
                      <div className="space-y-4">
                          {notizen.map((notiz) =>
                        <div key={notiz.id} className="bg-yellow-50 rounded-lg p-4 border-l-4 border-l-yellow-400">
                              <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {format(new Date(notiz.created_date), 'dd.MM.yyyy, HH:mm', { locale: de })}
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{notiz.inhalt}</p>
                            </div>
                        )}
                        </div> :

                      <p className="text-center text-gray-500 py-8">Noch keine Notizen vorhanden</p>
                      }
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aufgaben Tab */}
                <TabsContent value="aufgaben">
                  <Card className="border-none shadow-lg">
                    <CardHeader className="border-b">
                      <div className="flex justify-between items-center">
                        <CardTitle>Aufgaben für diesen Lead</CardTitle>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingAufgabe(null);
                            setShowAufgabeForm(!showAufgabeForm);
                          }} className="bg-[#223a5e] text-primary-foreground px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-8 from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">


                          <Plus className="w-4 h-4 mr-2" />
                          Neue Aufgabe
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        {offeneAufgaben} offen • {erledigtAufgaben} erledigt
                      </p>
                    </CardHeader>

                    {showAufgabeForm &&
                    <CardContent className="p-6 border-b bg-gray-50">
                        <AufgabeForm
                        aufgabe={editingAufgabe}
                        onSubmit={handleAufgabeSubmit}
                        onCancel={() => {
                          setShowAufgabeForm(false);
                          setEditingAufgabe(null);
                        }}
                        mitglieder={mitglieder}
                        hauptAufgaben={hauptAufgaben}
                        allAufgaben={aufgaben}
                      />
                      </CardContent>
                    }

                    <CardContent className="p-0">
                      {hauptAufgaben.length > 0 ?
                      <div className="divide-y">
                          {hauptAufgaben.map((aufgabe) =>
                        <AufgabeItem key={aufgabe.id} aufgabe={aufgabe} />
                        )}
                        </div> :

                      <div className="p-12 text-center">
                          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-semibold mb-2">Keine Aufgaben</h3>
                          <p className="text-gray-500 mb-4">
                            Erstelle die erste Aufgabe für diesen Lead
                          </p>
                          <Button
                          onClick={() => setShowAufgabeForm(true)}
                          variant="outline">

                            <Plus className="w-4 h-4 mr-2" />
                            Aufgabe erstellen
                          </Button>
                        </div>
                      }
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Dateien Tab - Added */}
                <TabsContent value="dateien">
                  <Card className="border-none shadow-lg">
                    <CardHeader className="border-b">
                      <CardTitle>Dateien hochladen</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fileKategorie">Kategorie</Label>
                            <Select value={fileKategorie} onValueChange={setFileKategorie}>
                              <SelectTrigger>
                                <SelectValue placeholder="Kategorie wählen" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vertrag">Vertrag</SelectItem>
                                <SelectItem value="angebot">Angebot</SelectItem>
                                <SelectItem value="rechnung">Rechnung</SelectItem>
                                <SelectItem value="technische_unterlagen">Technische Unterlagen</SelectItem>
                                <SelectItem value="bilder">Bilder</SelectItem>
                                <SelectItem value="sonstiges">Sonstiges</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="fileDescription">Beschreibung (optional)</Label>
                            <Input
                              id="fileDescription"
                              value={fileDescription}
                              onChange={(e) => setFileDescription(e.target.value)}
                              placeholder="z.B. Vertragsentwurf vom 15.10." />

                          </div>
                        </div>

                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                          <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploadingFile} />

                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer flex flex-col items-center">

                            <Upload className="w-12 h-12 text-gray-400 mb-4" />
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              {uploadingFile ? "Lädt hoch..." : "Klicke zum Hochladen oder ziehe Dateien hierher"}
                            </p>
                            <p className="text-xs text-gray-500">
                              PDF, Word, Excel, Bilder und mehr (max. 10MB)
                            </p>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {dateien.length > 0 &&
                  <Card className="border-none shadow-lg mt-6">
                      <CardHeader className="border-b">
                        <CardTitle>Hochgeladene Dateien ({dateien.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {dateien.map((datei) =>
                        <div key={datei.id} className="group flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                              <div className="text-3xl">{getFileIcon(datei.file_type)}</div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 truncate">{datei.file_name}</p>
                                  <Badge className={`${kategorieBadges[datei.kategorie]} text-xs`}>
                                    {kategorieLabels[datei.kategorie]}
                                  </Badge>
                                </div>

                                {datei.beschreibung &&
                            <p className="text-sm text-gray-500 mt-1">{datei.beschreibung}</p>
                            }

                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                  <span>{formatFileSize(datei.file_size)}</span>
                                  <span>•</span>
                                  <span>{format(new Date(datei.created_date), 'dd.MM.yyyy, HH:mm', { locale: de })}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <a
                              href={datei.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Öffnen">

                                  <Eye className="w-4 h-4 text-gray-600" />
                                </a>

                                <a
                              href={datei.file_url}
                              download={datei.file_name}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Herunterladen">

                                  <Download className="w-4 h-4 text-gray-600" />
                                </a>

                                <div className="relative">
                                  <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setShowFileDropdownId(showFileDropdownId === datei.id ? null : datei.id)}>

                                    <MoreVertical className="w-4 h-4" />
                                  </Button>

                                  {showFileDropdownId === datei.id &&
                              <>
                                      <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setShowFileDropdownId(null)} />

                                      <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-48 overflow-hidden">
                                        <button
                                    onClick={() => handleDeleteFile(datei)}
                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-left text-sm text-red-600">

                                          <Trash2 className="w-4 h-4" />
                                          Löschen
                                        </button>
                                      </div>
                                    </>
                              }
                                </div>
                              </div>
                            </div>
                        )}
                        </div>
                      </CardContent>
                    </Card>
                  }

                  {dateien.length === 0 && !uploadingFile &&
                  <Card className="border-dashed border-2 mt-6">
                      <CardContent className="p-12 text-center">
                        <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold mb-2">Noch keine Dateien</h3>
                        <p className="text-gray-500">Lade die erste Datei für diesen Lead hoch</p>
                      </CardContent>
                    </Card>
                  }
                </TabsContent>

                {/* E-Mails Tab */}
                <TabsContent value="emails">
                  {!showEmailForm ? (
                    <>
                      <Card className="border-none shadow-lg">
                        <CardHeader className="border-b">
                          <div className="flex justify-between items-center">
                            <CardTitle>E-Mail an Kunden senden</CardTitle>
                            <Button
                              size="sm"
                              onClick={() => setShowEmailForm(true)}
                              disabled={!lead.email}
                              style={{ backgroundColor: '#223a5e' }}
                              className="hover:opacity-90"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Neue E-Mail
                            </Button>
                          </div>
                          {!lead.email && (
                            <p className="text-sm text-red-600 mt-2">
                              ⚠️ Keine E-Mail-Adresse für diesen Lead hinterlegt
                            </p>
                          )}
                        </CardHeader>
                      </Card>

                      {/* E-Mail Historie */}
                      {emailLogs.length > 0 && (
                        <Card className="border-none shadow-lg mt-6">
                          <CardHeader className="border-b">
                            <CardTitle>E-Mail-Verlauf ({emailLogs.length})</CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="divide-y">
                              {emailLogs.map((email) => (
                                <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg ${
                                        email.status === 'gesendet' ? 'bg-green-100' : 'bg-red-100'
                                      }`}>
                                        <Mail className={`w-4 h-4 ${
                                          email.status === 'gesendet' ? 'text-green-600' : 'text-red-600'
                                        }`} />
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-gray-900">{email.betreff}</h4>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                          <span>An: {email.empfaenger_email}</span>
                                          <span>•</span>
                                          <span>Von: {email.gesendet_von_name}</span>
                                          <span>•</span>
                                          <span>{format(new Date(email.created_date), 'dd.MM.yyyy, HH:mm', { locale: de })}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <Badge className={
                                      email.status === 'gesendet' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }>
                                      {email.status === 'gesendet' ? 'Gesendet' : 'Fehler'}
                                    </Badge>
                                  </div>

                                  {email.fehler_nachricht && (
                                    <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700 mt-2">
                                      <strong>Fehler:</strong> {email.fehler_nachricht}
                                    </div>
                                  )}

                                  <div 
                                    className="text-sm text-gray-700 mt-3 line-clamp-3"
                                    dangerouslySetInnerHTML={{ __html: email.inhalt }}
                                  />
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {emailLogs.length === 0 && lead.email && (
                        <Card className="border-dashed border-2 mt-6">
                          <CardContent className="p-12 text-center">
                            <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-semibold mb-2">Noch keine E-Mails versendet</h3>
                            <p className="text-gray-500 mb-4">Sende die erste E-Mail an diesen Lead</p>
                            <Button 
                              onClick={() => setShowEmailForm(true)}
                              style={{ backgroundColor: '#223a5e' }}
                              className="hover:opacity-90"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              E-Mail verfassen
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <EmailForm
                      lead={lead}
                      onSubmit={handleSendEmail}
                      onCancel={() => setShowEmailForm(false)}
                      isSending={sendingEmail}
                    />
                  )}
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
        )}
      </div>
    </div>);

}
