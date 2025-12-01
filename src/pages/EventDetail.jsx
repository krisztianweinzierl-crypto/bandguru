import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Edit,
  Mail,
  ExternalLink,
  Clock,
  Users as UsersIcon,
  FileText,
  Shirt,
  Hotel,
  Settings,
  File,
  Plus,
  MoreVertical,
  Trash2,
  X,
  Euro,
  MessageSquare,
  Send,
  AlertCircle,
  CheckSquare,
  Circle,
  CheckCircle2,
  Upload,
  Download,
  FileIcon,
  Loader2,
  TrendingUp,
  TrendingDown,
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import EventForm from "@/components/events/EventForm";
import EventAufgabenTab from "@/components/events/EventAufgabenTab";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function EventDetailPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showMusikerForm, setShowMusikerForm] = useState(false);
  const [selectedMusikerId, setSelectedMusikerId] = useState("");
  const [musikerRolle, setMusikerRolle] = useState("");
  const [musikerGage, setMusikerGage] = useState("");
  const [musikerSpesen, setMusikerSpesen] = useState("");
  const [musikerNotizen, setMusikerNotizen] = useState("");
  const [buchungsbedingungen, setBuchungsbedingungen] = useState("");
  const [selectedVorlageId, setSelectedVorlageId] = useState("");
  const [showDropdownId, setShowDropdownId] = useState(null);
  const [editingEventMusiker, setEditingEventMusiker] = useState(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEinladungDialog, setShowEinladungDialog] = useState(false);
  const [einladungMusiker, setEinladungMusiker] = useState(null);
  const [einladungEventMusikerId, setEinladungEventMusikerId] = useState(null);
  const [einladungText, setEinladungText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMusiker, setCurrentMusiker] = useState(null);
  const [isManager, setIsManager] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

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

  // 1. Erst Event laden
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ id: eventId });
      return events[0];
    },
    enabled: !!eventId,
  });

  // 2. Dann User-Daten und Berechtigungen laden (abhängig von event)
  useEffect(() => {
    const loadUserData = async () => {
      if (!event) return;
      
      // Reset access state before evaluation for new event/user
      setIsManager(false);
      setHasAccess(false);
      setCurrentMusiker(null);

      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        // Prüfe Rolle
        const mitgliedschaften = await base44.entities.Mitglied.filter({ 
          user_id: user.id,
          org_id: event.org_id,
          status: "aktiv" 
        });
        const mitglied = mitgliedschaften[0];
        
        if (mitglied?.rolle === "Band Manager") {
          setIsManager(true);
          setHasAccess(true);
          setAccessChecked(true);
          } else if (mitglied?.rolle === "Musiker") {
          // Wenn Musiker, lade Musiker-Profil
          const alleMusiker = await base44.entities.Musiker.filter({ org_id: event.org_id });
          const musikerProfil = alleMusiker.find(m => 
            m.email?.toLowerCase().trim() === user.email.toLowerCase().trim() && m.aktiv === true
          );
          setCurrentMusiker(musikerProfil);

          if (musikerProfil) {
            // Prüfe ob Musiker am Event teilnimmt und zugesagt hat
            const eventMusikerList = await base44.entities.EventMusiker.filter({ 
              event_id: eventId,
              musiker_id: musikerProfil.id,
              status: 'zugesagt'
            });
            setHasAccess(eventMusikerList.length > 0);
            setAccessChecked(true);
            } else {
            setHasAccess(false);
            setAccessChecked(true);
            }
            } else {
            setHasAccess(false);
            setAccessChecked(true);
            }
      } catch (error) {
        console.error("Fehler beim Laden der User-Daten:", error);
        setHasAccess(false);
        setAccessChecked(true);
      }
    };
    
    if (eventId) {
      loadUserData();
    }
  }, [event, eventId]);

  const { data: kunde } = useQuery({
    queryKey: ['kunde', event?.kunde_id],
    queryFn: async () => {
      if (!event?.kunde_id) return null;
      const kunden = await base44.entities.Kunde.filter({ id: event.kunde_id });
      return kunden[0];
    },
    enabled: !!event?.kunde_id,
  });

  const { data: kunden = [] } = useQuery({
    queryKey: ['kunden', event?.org_id],
    queryFn: () => base44.entities.Kunde.filter({ org_id: event.org_id }),
    enabled: !!event?.org_id && isManager,
  });

  const { data: eventMusiker = [] } = useQuery({
    queryKey: ['eventMusiker', eventId],
    queryFn: async () => {
      if (isManager) {
        return base44.entities.EventMusiker.filter({ event_id: eventId });
      } else if (currentMusiker?.id) {
        const myEventMusiker = await base44.entities.EventMusiker.filter({
          event_id: eventId,
          musiker_id: currentMusiker.id,
          status: 'zugesagt'
        });
        return myEventMusiker;
      }
      return [];
    },
    enabled: !!eventId && (isManager || !!currentMusiker?.id),
  });

  const { data: musiker = [] } = useQuery({
    queryKey: ['musiker', event?.org_id],
    queryFn: () => base44.entities.Musiker.filter({ org_id: event.org_id, aktiv: true }),
    enabled: !!event?.org_id && isManager,
  });

  const { data: vorlagen = [] } = useQuery({
    queryKey: ['buchungsbedingungVorlagen', event?.org_id],
    queryFn: () => base44.entities.BuchungsbedingungVorlage.filter({ org_id: event.org_id, aktiv: true }),
    enabled: !!event?.org_id && isManager,
  });

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben', eventId],
    queryFn: () => base44.entities.Aufgabe.filter({ bezug_typ: 'event', bezug_id: eventId }),
    enabled: !!eventId,
  });

  const { data: dateien = [] } = useQuery({
    queryKey: ['dateien', eventId],
    queryFn: () => base44.entities.Datei.filter({ bezug_typ: 'event', bezug_id: eventId }),
    enabled: !!eventId,
  });

  const { data: rechnungen = [] } = useQuery({
    queryKey: ['rechnungen', eventId],
    queryFn: () => base44.entities.Rechnung.filter({ event_id: eventId }),
    enabled: !!eventId && isManager,
  });

  const { data: ausgaben = [] } = useQuery({
    queryKey: ['ausgaben', eventId],
    queryFn: () => base44.entities.Ausgabe.filter({ event_id: eventId }),
    enabled: !!eventId && isManager,
  });

  const { data: mitglieder = [] } = useQuery({
    queryKey: ['mitglieder', event?.org_id],
    queryFn: () => base44.entities.Mitglied.filter({ org_id: event.org_id, status: 'aktiv' }),
    enabled: !!event?.org_id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!event?.org_id,
  });

  const updateEventMutation = useMutation({
    mutationFn: async (eventData) => {
      console.log("Aktualisiere Event:", eventData);
      return await base44.entities.Event.update(eventId, eventData);
    },
    onSuccess: (data) => {
      console.log("Event erfolgreich aktualisiert:", data);
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error("Fehler beim Aktualisieren:", error);
      alert("Fehler beim Aktualisieren des Events: " + (error.message || "Unbekannter Fehler"));
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      // Zuerst alle EventMusiker löschen
      const eventMusikerToDelete = await base44.entities.EventMusiker.filter({ event_id: eventId });
      await Promise.all(eventMusikerToDelete.map(em => base44.entities.EventMusiker.delete(em.id)));
      // Dann Event löschen
      return await base44.entities.Event.delete(eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate(createPageUrl('Events'));
    },
    onError: (error) => {
      console.error("Fehler beim Löschen:", error);
      alert("Fehler beim Löschen des Events: " + (error.message || "Unbekannter Fehler"));
    }
  });

  const addMusikerMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.EventMusiker.create(data);
    },
    onSuccess: async (createdEventMusiker, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventMusiker', eventId] });
      
      try {
        const selectedMusiker = musiker.find(m => m.id === variables.musiker_id);
        const mitgliedschaften = await base44.entities.Mitglied.filter({
          org_id: event.org_id,
          musiker_id: selectedMusiker.id,
          status: "aktiv"
        });
        
        // In-App Benachrichtigung erstellen
        if (mitgliedschaften.length > 0 && mitgliedschaften[0].user_id) {
          await base44.entities.Benachrichtigung.create({
            org_id: event.org_id,
            user_id: mitgliedschaften[0].user_id,
            typ: 'event_einladung',
            titel: `Neue Event-Anfrage: ${event.titel}`,
            nachricht: `Du wurdest für "${event.titel}" am ${format(new Date(event.datum_von), 'dd. MMMM yyyy', { locale: de })} angefragt.`,
            link_url: createPageUrl('MusikerDashboard'),
            bezug_typ: 'event',
            bezug_id: event.id,
            icon: 'Calendar',
            prioritaet: 'hoch'
          });
        }
        
        // Automatisch E-Mail an Musiker senden über Mailgun
        if (selectedMusiker?.email) {
          // Lade Organisation für den Absendernamen
          const orgList = await base44.entities.Organisation.filter({ id: event.org_id });
          const organisation = orgList[0];
          const orgName = organisation?.name || 'Das Team';
          
          const emailBody = `Hey ${selectedMusiker.name}! 👋\n\nDu wurdest für folgendes Event angefragt:\n\n🎵 Event: ${event.titel}\n\n📅 Datum: ${format(new Date(event.datum_von), 'dd. MMMM yyyy, HH:mm', { locale: de })} Uhr\n\n📍 Ort: ${event.ort_name || event.ort_adresse || 'Noch nicht festgelegt'}\n\n🎸 Rolle: ${variables.rolle || 'Nicht angegeben'}\n\n💰 Gage: €${variables.gage_netto || 0}\n\n${variables.notizen ? `Notizen: ${variables.notizen}\n\n` : ''}Bitte logge dich ein und gib uns so bald wie möglich Bescheid, ob du dabei sein kannst!\n\n👉 Hier geht's zur App: https://app.bandguru.de\n\nViele Grüße,\n${orgName} Team`;

          try {
            await base44.functions.invoke('sendMailgunEmail', {
              to: selectedMusiker.email,
              subject: `🎵 Event-Anfrage: ${event.titel}`,
              body: emailBody,
              from_name: orgName
            });
            console.log(`✅ E-Mail automatisch an ${selectedMusiker.name} versendet`);
          } catch (emailError) {
            console.error("Fehler beim Senden der E-Mail über Mailgun:", emailError);
          }
        }
      } catch (error) {
        console.error("Fehler beim Erstellen der Benachrichtigung/E-Mail:", error);
      }
      
      setShowMusikerForm(false);
      resetMusikerForm();
    },
    onError: (error) => {
      console.error("Fehler beim Hinzufügen des Musikers:", error);
      alert("Fehler beim Hinzufügen des Musikers: " + (error.message || "Unbekannter Fehler"));
    }
  });

  const updateEventMusikerMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.EventMusiker.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventMusiker', eventId] });
      setShowDropdownId(null);
      setEditingEventMusiker(null);
    },
    onError: (error) => {
      console.error("Fehler beim Aktualisieren des Musiker-Status:", error);
      alert("Fehler beim Aktualisieren des Musiker-Status: " + (error.message || "Unbekannter Fehler"));
    }
  });

  const deleteEventMusikerMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.EventMusiker.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventMusiker', eventId] });
      setShowDropdownId(null);
    },
    onError: (error) => {
      console.error("Fehler beim Entfernen des Musikers:", error);
      alert("Fehler beim Entfernen des Musikers: " + (error.message || "Unbekannter Fehler"));
    }
  });

  const createAufgabeMutation = useMutation({
    mutationFn: async (aufgabeData) => {
      return await base44.entities.Aufgabe.create({
        ...aufgabeData,
        org_id: event.org_id,
        bezug_typ: 'event',
        bezug_id: eventId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben', eventId] });
    },
  });

  const updateAufgabeMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Aufgabe.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben', eventId] });
    },
  });

  const deleteAufgabeMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Aufgabe.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben', eventId] });
    },
  });

  const deleteDateiMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Datei.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dateien', eventId] });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.Datei.create({
        org_id: event.org_id,
        file_url,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        bezug_typ: 'event',
        bezug_id: eventId,
        kategorie: 'sonstiges'
      });

      queryClient.invalidateQueries({ queryKey: ['dateien', eventId] });
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
      alert("Fehler beim Hochladen der Datei: " + error.message);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteDatei = (dateiId) => {
    if (confirm("Möchtest du diese Datei wirklich löschen?")) {
      deleteDateiMutation.mutate(dateiId);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
    if (fileType?.includes('sheet') || fileType?.includes('excel')) return '📊';
    return '📁';
  };

  const sendEinladungMutation = useMutation({
    mutationFn: async ({ eventMusikerId, musikerData, customMessage }) => {
      const eventMusikerEntry = await base44.entities.EventMusiker.filter({ id: eventMusikerId });
      const em = eventMusikerEntry[0];
      
      // Lade Organisation für den Absendernamen
      const orgList = await base44.entities.Organisation.filter({ id: event.org_id });
      const organisation = orgList[0];
      const orgName = organisation?.name || 'Das Team';
      
      const personalMessage = customMessage ? `\n💬 Persönliche Nachricht:\n"${customMessage}"\n` : '';
      
      const emailBody = `Hey ${musikerData.name}! 👋

Du wurdest für folgendes Event angefragt:

🎵 Event: ${event.titel}

📅 Datum: ${format(new Date(event.datum_von), 'dd. MMMM yyyy, HH:mm', { locale: de })} Uhr

📍 Ort: ${event.ort_name || event.ort_adresse || 'Noch nicht festgelegt'}

🎸 Rolle: ${em.rolle}

💰 Gage: €${em.gage_netto}
${personalMessage}
${em.notizen ? `Notizen: ${em.notizen}\n\n` : ''}${em.buchungsbedingungen ? `Buchungsbedingungen: ${em.buchungsbedingungen}\n\n` : ''}Bitte gib uns so bald wie möglich Bescheid, ob du dabei sein kannst!

👉 Hier geht's zur App: https://app.bandguru.de

Viele Grüße,
${orgName} Team`;

      await base44.functions.invoke('sendMailgunEmail', {
        to: musikerData.email,
        subject: `🎵 Event-Anfrage: ${event.titel}`,
        body: emailBody,
        from_name: orgName
      });

      return musikerData;
    },
    onSuccess: (musikerData) => {
      setShowEinladungDialog(false);
      setEinladungMusiker(null);
      setEinladungEventMusikerId(null);
      setEinladungText('');
      alert(`✅ Einladung wurde an ${musikerData.name} versendet!`);
    },
    onError: (error) => {
      console.error("Fehler beim Versenden der Einladung:", error);
      alert("❌ Fehler beim Versenden der Einladung: " + (error.message || "Unbekannter Fehler"));
    }
  });

  const resetMusikerForm = () => {
    setSelectedMusikerId("");
    setMusikerRolle("");
    setMusikerGage("");
    setMusikerSpesen("");
    setMusikerNotizen("");
    setBuchungsbedingungen("");
    setSelectedVorlageId("");
  };

  const handleAddMusiker = () => {
    if (!selectedMusikerId) return;

    const selectedMusiker = musiker.find(m => m.id === selectedMusikerId);
    
    addMusikerMutation.mutate({
      event_id: eventId,
      musiker_id: selectedMusikerId,
      rolle: musikerRolle || (selectedMusiker?.instrumente?.[0] || ""),
      gage_netto: parseFloat(musikerGage) || selectedMusiker?.tagessatz_netto || 0,
      spesen: parseFloat(musikerSpesen) || 0,
      status: "angefragt",
      notizen: musikerNotizen,
      buchungsbedingungen: buchungsbedingungen
    });
  };

  const handleRemoveMusiker = (eventMusikerId) => {
    if (confirm("Möchtest du diesen Musiker wirklich vom Event entfernen?")) {
      deleteEventMusikerMutation.mutate(eventMusikerId);
    }
  };

  const handleUpdateStatus = (eventMusikerId, newStatus) => {
    updateEventMusikerMutation.mutate({
      id: eventMusikerId,
      data: { status: newStatus }
    });
  };

  const handleOpenEinladungDialog = (eventMusikerId, musikerId) => {
    const musikerData = musiker.find(m => m.id === musikerId);
    if (musikerData?.email) {
      setEinladungMusiker(musikerData);
      setEinladungEventMusikerId(eventMusikerId);
      setEinladungText('');
      setShowEinladungDialog(true);
      setShowDropdownId(null);
    } else {
      alert("Dieser Musiker hat keine E-Mail-Adresse hinterlegt.");
    }
  };

  const handleSendEinladung = () => {
    if (einladungMusiker && einladungEventMusikerId) {
      sendEinladungMutation.mutate({ 
        eventMusikerId: einladungEventMusikerId, 
        musikerData: einladungMusiker,
        customMessage: einladungText 
      });
    }
  };

  // Lade-Status - First, ensure event data is loaded
  if (eventLoading || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade Event...</p>
      </div>
    );
  }

  if (currentUser === null || !accessChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade Event...</p>
      </div>
    );
  }

  // Zugriffsprüfung - Finally, if hasAccess is false after all checks, deny access
  // Note: isManager implies hasAccess is true due to the useEffect logic, so we only need to check !hasAccess
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h3 className="text-lg font-semibold mb-2">Kein Zugriff auf dieses Event</h3>
            <p className="text-sm text-gray-600 mb-4">
              Du hast für dieses Event nicht zugesagt oder wurdest nicht für die Details freigegeben.
            </p>
            <Button onClick={() => navigate(createPageUrl('Events'))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zu Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors = {
    entwurf: { bg: "bg-gray-100", text: "text-gray-800", label: "Entwurf" },
    angefragt: { bg: "bg-orange-100", text: "text-orange-800", label: "Wartet auf Musiker" },
    bestätigt: { bg: "bg-green-100", text: "text-green-800", label: "Bestätigt" },
    durchgeführt: { bg: "bg-blue-100", text: "text-blue-800", label: "Durchgeführt" },
    abgerechnet: { bg: "bg-purple-100", text: "text-purple-800", label: "Abgerechnet" },
    storniert: { bg: "bg-red-100", text: "text-red-800", label: "Storniert" }
  };

  const musikerStatusColors = {
    angefragt: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-l-yellow-400", label: "Angefragt" },
    optional: { bg: "bg-blue-100", text: "text-blue-800", border: "border-l-blue-400", label: "Optional" },
    zugesagt: { bg: "bg-green-100", text: "text-green-800", border: "border-l-green-500", label: "Zugesagt" },
    abgelehnt: { bg: "bg-red-100", text: "text-red-800", border: "border-l-red-400", label: "Abgelehnt" },
    ersetzt: { bg: "bg-gray-100", text: "text-gray-800", border: "border-l-gray-400", label: "Ersetzt" }
  };

  const statusInfo = statusColors[event.status] || statusColors.entwurf;

  const handleAddToCalendar = () => {
    const startDate = new Date(event.datum_von);
    const endDate = new Date(event.datum_bis);
    
    const formatDateForCalendar = (date) => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, '');
    };

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.titel)}&dates=${formatDateForCalendar(startDate)}/${formatDateForCalendar(endDate)}&details=${encodeURIComponent(event.oeffentliche_notizen || '')}&location=${encodeURIComponent(event.ort_adresse || event.ort_name || '')}`;
    
    window.open(calendarUrl, '_blank');
  };

  const handleContactCustomer = () => {
    if (kunde?.email) {
      setEmailSubject(`Event: ${event.titel}`);
      setEmailBody(`Hallo ${kunde.ansprechpartner || kunde.firmenname},\n\n\n\nMit freundlichen Grüßen`);
      setShowContactDialog(true);
    }
  };

  const handleSendEmail = async () => {
    if (!kunde?.email || !emailSubject || !emailBody) return;
    
    setSendingEmail(true);
    try {
      await base44.functions.invoke('sendMailgunEmail', {
        to: kunde.email,
        subject: emailSubject,
        body: emailBody
      });
      setShowContactDialog(false);
      setEmailSubject('');
      setEmailBody('');
      alert('✅ E-Mail erfolgreich versendet!');
    } catch (error) {
      console.error("Fehler beim Senden der E-Mail:", error);
      alert('❌ Fehler beim Senden der E-Mail: ' + error.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const openInMaps = () => {
    const address = event.ort_adresse || event.ort_name;
    if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  const handleUpdateSubmit = (data) => {
    updateEventMutation.mutate(data);
  };

  const handleDeleteEvent = () => {
    if (confirm("Möchtest du dieses Event wirklich löschen?\n\nAlle zugehörigen Musiker-Zuweisungen werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.")) {
      deleteEventMutation.mutate();
    }
  };

  // Wenn im Bearbeitungsmodus, zeige das Formular
  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="gap-2 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Übersicht
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Event bearbeiten</h1>
            <p className="text-gray-600">{event.titel}</p>
          </div>
          <EventForm
            event={event}
            onSubmit={handleUpdateSubmit}
            onCancel={() => setIsEditing(false)}
            onDelete={handleDeleteEvent}
            kunden={kunden}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          {/* Back Button & Status */}
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl('Events'))}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            <Badge className={`${statusInfo.bg} ${statusInfo.text} border-none px-3 py-1`}>
              {statusInfo.label}
            </Badge>
          </div>

          {/* Title & Actions */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{event.titel}</h1>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddToCalendar}
                className="gap-2"
              >
                <Calendar className="w-4 h-4" />
                Zu Kalender
              </Button>
              {isManager && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2 text-white"
                  style={{ backgroundColor: '#223a5e' }}
                >
                  <Edit className="w-4 h-4" />
                  Bearbeiten
                </Button>
              )}
              {isManager && kunde && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleContactCustomer}
                  className="gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Kunde kontaktieren
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border-b border-gray-200 p-0 h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
              Übersicht
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="musiker" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
                Musiker ({eventMusiker.length})
              </TabsTrigger>
            )}
            {/* Musiker only see their own tab if zugesagt */}
            {!isManager && eventMusiker.length > 0 && (
              <TabsTrigger value="musiker" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
                Mein Engagement
              </TabsTrigger>
            )}
            <TabsTrigger value="aufgaben" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
              Aufgaben
            </TabsTrigger>
            <TabsTrigger value="dokumente" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
              Dokumente ({dateien.length})
            </TabsTrigger>
            <TabsTrigger value="finanzen" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3">
              Finanzen
            </TabsTrigger>
          </TabsList>

          {/* Übersicht Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Details Card */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b bg-white">
                <CardTitle className="text-xl font-bold">Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Datum */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Datum</p>
                      <p className="font-medium text-gray-900">
                        {format(new Date(event.datum_von), 'dd. MMMM yyyy', { locale: de })}
                      </p>
                    </div>
                  </div>

                  {/* Veranstaltungsort */}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Veranstaltungsort</p>
                      <p className="font-medium text-gray-900">
                        {event.ort_adresse || event.ort_name || 'Nicht angegeben'}
                      </p>
                    </div>
                  </div>

                  {/* Kunde */}
                  {isManager && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Kunde</p>
                        <p className="font-medium text-gray-900">
                          {kunde ? kunde.firmenname : 'Kein Kunde verknüpft'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Event Location Card */}
            {(event.ort_name || event.ort_adresse) && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="border-b bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-gray-700" />
                      <CardTitle className="text-xl font-bold">Event Location</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openInMaps}
                      className="gap-2 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Maps
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 bg-white">
                  <p className="text-gray-700 mb-4 font-medium">{event.ort_adresse || event.ort_name}</p>
                  
                  {/* Map Placeholder */}
                  <div className="bg-gray-50 rounded-lg p-12 text-center border border-gray-200">
                    <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 font-medium mb-2">{event.ort_adresse || event.ort_name}</p>
                    <button
                      onClick={openInMaps}
                      className="text-cyan-500 hover:text-cyan-600 font-medium text-sm"
                    >
                      View on Google Maps
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Zeitplan */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b bg-white">
                <CardTitle className="text-xl font-bold">Zeitplan</CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-white">
                <div className="space-y-4">
                  {/* Veranstaltungszeit */}
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Veranstaltungszeit</p>
                      <p className="font-medium text-gray-900">
                        {format(new Date(event.datum_von), 'HH:mm')} - {format(new Date(event.datum_bis), 'HH:mm')}
                      </p>
                    </div>
                  </div>

                  {/* Get-In Zeit */}
                  {event.get_in_zeit && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Get-In Zeit</p>
                        <p className="font-medium text-gray-900">{event.get_in_zeit}</p>
                      </div>
                    </div>
                  )}

                  {/* Soundcheck-Zeit */}
                  {event.soundcheck_zeit && (
                    <div className="flex items-start gap-3">
                      <span className="text-yellow-500 text-xl mt-0.5">☀️</span>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Soundcheck-Zeit</p>
                        <p className="font-medium text-gray-900">{event.soundcheck_zeit}</p>
                      </div>
                    </div>
                  )}

                  {/* Ablaufplan */}
                  {event.oeffentliche_notizen && (
                    <div className="flex items-start gap-3 pt-4 border-t">
                      <FileText className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-2">Ablaufplan</p>
                        <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-gray-700">
                          {event.oeffentliche_notizen}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Publikum & Ambiente */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b bg-white">
                <CardTitle className="text-xl font-bold">Publikum & Ambiente</CardTitle>
                <p className="text-sm text-gray-500">Details über die Veranstaltung und das Publikum</p>
              </CardHeader>
              <CardContent className="p-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Event-Typ */}
                  {event.event_typ && (
                    <div className="flex items-start gap-3">
                      <span className="text-purple-500 text-xl mt-0.5">🎉</span>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Event-Typ</p>
                        <p className="font-medium text-gray-900">{event.event_typ}</p>
                      </div>
                    </div>
                  )}

                  {/* Anzahl der Gäste */}
                  {event.anzahl_gaeste && (
                    <div className="flex items-start gap-3">
                      <UsersIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Anzahl der Gäste</p>
                        <p className="font-medium text-gray-900">{event.anzahl_gaeste}</p>
                      </div>
                    </div>
                  )}

                  {/* Dresscode */}
                  {event.dresscode && (
                    <div className="flex items-start gap-3">
                      <Shirt className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Dresscode</p>
                        <p className="font-medium text-gray-900">{event.dresscode}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Hotel-Informationen */}
            {(event.hotel_name || event.hotel_adresse) && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="border-b bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold">Hotel-Informationen</CardTitle>
                      <p className="text-sm text-gray-500">Unterkunft für Musiker</p>
                    </div>
                    {event.hotel_adresse && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.hotel_adresse)}`, '_blank')}
                        className="gap-2 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        In Maps öffnen
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Hotel-Name */}
                    {event.hotel_name && (
                      <div className="flex items-start gap-3">
                        <Hotel className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Hotel-Name</p>
                          <p className="font-medium text-gray-900">{event.hotel_name}</p>
                        </div>
                      </div>
                    )}

                    {/* Hotel-Adresse */}
                    {event.hotel_adresse && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Hotel-Adresse</p>
                          <button
                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.hotel_adresse)}`, '_blank')}
                            className="font-medium text-gray-900 hover:text-blue-600 hover:underline text-left transition-colors"
                          >
                            {event.hotel_adresse}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Zusätzliche Informationen */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b bg-white">
                <CardTitle className="text-xl font-bold">Zusätzliche Informationen</CardTitle>
                <p className="text-sm text-gray-500">Weitere wichtige Details</p>
              </CardHeader>
              <CardContent className="p-6 bg-white space-y-4">
                {/* Technik */}
                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Technik</p>
                    <p className="font-medium text-gray-900">
                      {event.technik_hinweise || 'Nicht angegeben'}
                    </p>
                  </div>
                </div>

                {/* Notizen */}
                <div className="flex items-start gap-3">
                  <File className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Notizen</p>
                    <p className="font-medium text-gray-900">
                      {event.interne_notizen || 'Nicht angegeben'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Musiker Tab (Conditional for Manager and Zugesagter Musiker) */}
          {(isManager || (eventMusiker.length > 0)) && (
            <TabsContent value="musiker" className="space-y-6">
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-bold">{isManager ? "Gebuchte Musiker" : "Mein Engagement"}</CardTitle>
                    {isManager && (
                      <Button
                        onClick={() => setShowMusikerForm(true)}
                        size="sm"
                        className="text-white"
                        style={{ backgroundColor: '#223a5e' }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Musiker hinzufügen
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {isManager && showMusikerForm && (
                    <Card className="mb-6 bg-blue-50 border-blue-200">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-semibold text-lg">Musiker hinzufügen</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setShowMusikerForm(false);
                              resetMusikerForm();
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label>Musiker auswählen <span className="text-red-500">*</span></Label>
                            <Select value={selectedMusikerId} onValueChange={(value) => {
                              setSelectedMusikerId(value);
                              const m = musiker.find(mus => mus.id === value);
                              if (m) {
                                setMusikerRolle(m.instrumente?.[0] || "");
                                setMusikerGage(m.tagessatz_netto?.toString() || "");
                              }
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Musiker wählen..." />
                              </SelectTrigger>
                              <SelectContent>
                                {musiker.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.name} {m.instrumente?.length > 0 && `(${m.instrumente.join(', ')})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Rolle/Instrument <span className="text-red-500">*</span></Label>
                              <Input
                                value={musikerRolle}
                                onChange={(e) => setMusikerRolle(e.target.value)}
                                placeholder="z.B. Gitarre, Gesang"
                              />
                            </div>
                            <div>
                              <Label>Gage (netto)</Label>
                              <Input
                                type="number"
                                value={musikerGage}
                                onChange={(e) => setMusikerGage(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label>Fahrtkosten (Cent/km)</Label>
                              <Input
                                type="number"
                                value={musikerSpesen}
                                onChange={(e) => setMusikerSpesen(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Notizen</Label>
                            <Textarea
                              value={musikerNotizen}
                              onChange={(e) => setMusikerNotizen(e.target.value)}
                              placeholder="Zusätzliche Informationen..."
                              rows={2}
                            />
                          </div>

                          <div className="space-y-3">
                            <Label>Buchungsbedingungen (sichtbar für Musiker)</Label>
                            
                            <div className="space-y-2">
                              <Label htmlFor="vorlage" className="text-sm text-gray-600">Vorlage auswählen (optional)</Label>
                              <Select
                                value={selectedVorlageId}
                                onValueChange={(value) => {
                                  setSelectedVorlageId(value);
                                  if (value === "keine") {
                                    setBuchungsbedingungen("");
                                  } else {
                                    const vorlage = vorlagen.find(v => v.id === value);
                                    if (vorlage) {
                                      setBuchungsbedingungen(vorlage.inhalt);
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Vorlage wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="keine">-- Keine Vorlage --</SelectItem>
                                  {vorlagen.map((v) => (
                                    <SelectItem key={v.id} value={v.id}>
                                      {v.name} ({v.kategorie})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {vorlagen.length === 0 && (
                                <p className="text-xs text-amber-600">
                                  Noch keine Vorlagen vorhanden. Erstelle Vorlagen unter Einstellungen → Buchungsbedingungen
                                </p>
                              )}
                              {vorlagen.length > 0 && (
                                <p className="text-xs text-gray-500">
                                  Wähle eine gespeicherte Vorlage oder schreibe eigene Bedingungen
                                </p>
                              )}
                            </div>

                            <div className="border border-gray-200 rounded-lg">
                              <ReactQuill
                                theme="snow"
                                value={buchungsbedingungen}
                                onChange={(value) => setBuchungsbedingungen(value)}
                                modules={modules}
                                formats={formats}
                                placeholder="z.B. Bitte Smoking mitbringen, Soundcheck um 18:00 Uhr..."
                                className="min-h-[150px]"
                              />
                            </div>
                            <p className="text-xs text-gray-500">
                              Diese Bedingungen muss der Musiker bei Zusage akzeptieren
                            </p>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowMusikerForm(false);
                                resetMusikerForm();
                              }}
                            >
                              Abbrechen
                            </Button>
                            <Button
                              onClick={handleAddMusiker}
                              disabled={!selectedMusikerId || addMusikerMutation.isPending}
                              className="text-white"
                              style={{ backgroundColor: '#223a5e' }}
                            >
                              Musiker hinzufügen
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-4">
                    {eventMusiker.length > 0 ? (
                      eventMusiker.map((em) => {
                        const musikerData = musiker.find(m => m.id === em.musiker_id);
                        const statusStyle = musikerStatusColors[em.status] || musikerStatusColors.angefragt;
                        const initials = musikerData?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
                        
                        return (
                          <Card key={em.id} className={`border-l-4 ${statusStyle.border}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <Avatar className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600">
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-4 mb-2">
                                    <div>
                                      <h3 className="font-semibold text-lg">{musikerData?.name || 'Unbekannt'}</h3>
                                      <Badge className={`${statusStyle.bg} ${statusStyle.text} mt-1`}>
                                        {statusStyle.label}
                                      </Badge>
                                    </div>
                                    {isManager && (
                                      <div className="relative">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setShowDropdownId(showDropdownId === em.id ? null : em.id)}
                                        >
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>

                                        {showDropdownId === em.id && (
                                          <>
                                            <div 
                                              className="fixed inset-0 z-40" 
                                              onClick={() => setShowDropdownId(null)}
                                            />
                                            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-56 overflow-hidden">
                                              {em.status === 'angefragt' && (
                                                <>
                                                  <button
                                                    onClick={() => handleUpdateStatus(em.id, 'zugesagt')}
                                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left text-sm"
                                                  >
                                                    Als zugesagt markieren
                                                  </button>
                                                  <button
                                                    onClick={() => handleUpdateStatus(em.id, 'optional')}
                                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left text-sm border-t"
                                                  >
                                                    Als optional markieren
                                                  </button>
                                                  <button
                                                    onClick={() => handleUpdateStatus(em.id, 'abgelehnt')}
                                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left text-sm border-t"
                                                  >
                                                    Als abgelehnt markieren
                                                  </button>
                                                </>
                                              )}
                                              {musikerData?.email && (
                                                <button
                                                  onClick={() => handleOpenEinladungDialog(em.id, em.musiker_id)}
                                                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left text-sm border-t"
                                                >
                                                  <Send className="w-4 h-4" />
                                                  Einladung senden
                                                </button>
                                              )}
                                              <button
                                                onClick={() => handleRemoveMusiker(em.id)}
                                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-left text-sm text-red-600 border-t"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                                Entfernen
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <p className="text-sm text-gray-600 mb-3">{em.rolle}</p>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <Calendar className="w-4 h-4" />
                                      <div>
                                        <p className="text-xs text-gray-500">Eingeladen am</p>
                                        <p className="font-medium">{format(new Date(em.created_date), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
                                      </div>
                                    </div>

                                    {em.status === 'zugesagt' && (
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <Calendar className="w-4 h-4 text-green-600" />
                                        <div>
                                          <p className="text-xs text-gray-500">Zugesagt am</p>
                                          <p className="font-medium text-green-600">{format(new Date(em.updated_date), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2 text-gray-600">
                                      <Euro className="w-4 h-4" />
                                      <div>
                                        <p className="text-xs text-gray-500">Gage (netto)</p>
                                        <p className="font-medium">€{em.gage_netto?.toFixed(2) || '0.00'}</p>
                                      </div>
                                    </div>

                                    {em.spesen > 0 && (
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <Euro className="w-4 h-4" />
                                        <div>
                                          <p className="text-xs text-gray-500">Fahrtkosten</p>
                                          <p className="font-medium">€{em.spesen?.toFixed(2) || '0.00'}</p>
                                        </div>
                                      </div>
                                    )}
                                    </div>

                                  {em.notizen && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                      <div className="flex items-start gap-2 text-sm">
                                        <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <div>
                                          <p className="text-xs text-gray-500 mb-1">Notizen für Musiker</p>
                                          <p className="text-gray-700">{em.notizen}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {em.buchungsbedingungen && (
                                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <div className="flex items-start gap-2 text-sm">
                                        <FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-1">Buchungsbedingungen</p>
                                          <p className="font-medium text-blue-700">Buchungsbedingungen hinterlegt</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      isManager ? (
                        <div className="text-center py-12">
                          <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-semibold mb-2">Noch keine Musiker hinzugefügt</h3>
                          <p className="text-gray-500 mb-4">Füge Musiker hinzu, um sie für dieses Event anzufragen</p>
                          <Button
                            onClick={() => setShowMusikerForm(true)}
                            className="text-white"
                            style={{ backgroundColor: '#223a5e' }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Ersten Musiker hinzufügen
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                           <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
                          <h3 className="text-lg font-semibold mb-2">Kein Engagement gefunden</h3>
                          <p className="text-gray-500 mb-4">Du bist für dieses Event nicht als Musiker eingetragen oder dein Status ist noch nicht 'zugesagt'.</p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Aufgaben Tab */}
          <TabsContent value="aufgaben" className="space-y-6">
            <EventAufgabenTab
              aufgaben={aufgaben}
              users={users}
              event={event}
              eventId={eventId}
              isManager={isManager}
              updateAufgabeMutation={updateAufgabeMutation}
              deleteAufgabeMutation={deleteAufgabeMutation}
              createAufgabeMutation={createAufgabeMutation}
              queryClient={queryClient}
            />
          </TabsContent>

          {/* Dokumente Tab */}
          <TabsContent value="dokumente" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-bold">Dokumente</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Wegebeschreibungen, Abläufe und andere wichtige Dateien</p>
                  </div>
                  {isManager && (
                    <div>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      />
                      <Button
                        onClick={() => document.getElementById('file-upload').click()}
                        disabled={uploadingFile}
                        size="sm"
                        className="text-white"
                        style={{ backgroundColor: '#223a5e' }}
                      >
                        {uploadingFile ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Wird hochgeladen...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Datei hochladen
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {dateien.length > 0 ? (
                  <div className="space-y-3">
                    {dateien.map((datei) => (
                      <div
                        key={datei.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{getFileIcon(datei.file_type)}</span>
                          <div>
                            <p className="font-medium text-gray-900">{datei.file_name}</p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(datei.file_size)} • {format(new Date(datei.created_date), 'dd.MM.yyyy', { locale: de })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(datei.file_url, '_blank')}
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Öffnen
                          </Button>
                          {isManager && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDatei(datei.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">Noch keine Dokumente</h3>
                    <p className="text-gray-500 mb-4">
                      {isManager 
                        ? "Lade Wegebeschreibungen, Abläufe oder andere wichtige Dateien hoch"
                        : "Es wurden noch keine Dokumente für dieses Event hochgeladen"
                      }
                    </p>
                    {isManager && (
                      <Button
                        onClick={() => document.getElementById('file-upload').click()}
                        disabled={uploadingFile}
                        className="text-white"
                        style={{ backgroundColor: '#223a5e' }}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Erste Datei hochladen
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finanzen" className="space-y-6">
            {isManager ? (
              <>
                {/* Finanz-Übersicht */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Musiker-Kosten */}
                  <Card className="border-none shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <UsersIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Musiker-Gagen + Fahrtkosten</p>
                          <p className="text-lg font-bold text-gray-900">
                            €{eventMusiker.filter(em => em.status === 'zugesagt').reduce((sum, em) => sum + (em.gage_netto || 0) + (em.spesen || 0), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sonstige Ausgaben */}
                  <Card className="border-none shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <TrendingDown className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Sonstige Ausgaben</p>
                          <p className="text-lg font-bold text-gray-900">
                            €{ausgaben.reduce((sum, a) => sum + (a.betrag || 0), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Einnahmen */}
                  <Card className="border-none shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Rechnungen (brutto)</p>
                          <p className="text-lg font-bold text-gray-900">
                            €{rechnungen.reduce((sum, r) => sum + (r.brutto_betrag || 0), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Profit */}
                  <Card className="border-none shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Euro className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Gewinn (netto)</p>
                          <p className={`text-lg font-bold ${
                            (rechnungen.reduce((sum, r) => sum + (r.netto_betrag || 0), 0) - 
                             eventMusiker.filter(em => em.status === 'zugesagt').reduce((sum, em) => sum + (em.gage_netto || 0) + (em.spesen || 0), 0) - 
                             ausgaben.reduce((sum, a) => sum + (a.betrag || 0), 0)) >= 0 
                              ? 'text-green-600' : 'text-red-600'
                          }`}>
                            €{(rechnungen.reduce((sum, r) => sum + (r.netto_betrag || 0), 0) - 
                               eventMusiker.filter(em => em.status === 'zugesagt').reduce((sum, em) => sum + (em.gage_netto || 0) + (em.spesen || 0), 0) - 
                               ausgaben.reduce((sum, a) => sum + (a.betrag || 0), 0)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Musiker-Gagen */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="border-b">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="w-5 h-5 text-gray-700" />
                      <CardTitle className="text-xl font-bold">Musiker-Gagen</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {eventMusiker.filter(em => em.status === 'zugesagt').length > 0 ? (
                      <div className="space-y-3">
                        {eventMusiker.filter(em => em.status === 'zugesagt').map((em) => {
                          const musikerData = musiker.find(m => m.id === em.musiker_id);
                          return (
                            <div key={em.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-blue-500 text-white text-sm">
                                    {musikerData?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{musikerData?.name || 'Unbekannt'}</p>
                                  <p className="text-sm text-gray-500">{em.rolle}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                  <p className="font-semibold">€{((em.gage_netto || 0) + (em.spesen || 0)).toFixed(2)}</p>
                                  {em.spesen > 0 && (
                                    <p className="text-xs text-gray-500">
                                      (Gage: €{em.gage_netto?.toFixed(2)} + Fahrt: €{em.spesen?.toFixed(2)})
                                    </p>
                                  )}
                                </div>
                              </div>
                              );
                              })}
                              <div className="flex justify-between pt-3 border-t mt-3">
                              <p className="font-semibold">Gesamt Musiker-Kosten</p>
                              <p className="font-bold text-lg">
                              €{eventMusiker.filter(em => em.status === 'zugesagt').reduce((sum, em) => sum + (em.gage_netto || 0) + (em.spesen || 0), 0).toFixed(2)}
                              </p>
                              </div>
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-6">Noch keine zugesagten Musiker</p>
                    )}
                  </CardContent>
                </Card>

                {/* Rechnungen */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-gray-700" />
                        <CardTitle className="text-xl font-bold">Rechnungen</CardTitle>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(createPageUrl('Rechnungen'))}
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Rechnung erstellen
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {rechnungen.length > 0 ? (
                      <div className="space-y-3">
                        {rechnungen.map((rechnung) => {
                          const statusColors = {
                            entwurf: 'bg-gray-100 text-gray-700',
                            versendet: 'bg-blue-100 text-blue-700',
                            teilweise_bezahlt: 'bg-yellow-100 text-yellow-700',
                            bezahlt: 'bg-green-100 text-green-700',
                            überfällig: 'bg-red-100 text-red-700',
                            storniert: 'bg-gray-100 text-gray-500'
                          };
                          return (
                            <div key={rechnung.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div>
                                <p className="font-medium">{rechnung.rechnungsnummer}</p>
                                <p className="text-sm text-gray-500">
                                  {rechnung.rechnungsdatum && format(new Date(rechnung.rechnungsdatum), 'dd.MM.yyyy', { locale: de })}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <Badge className={statusColors[rechnung.status] || 'bg-gray-100'}>
                                  {rechnung.status}
                                </Badge>
                                <p className="font-semibold">€{rechnung.brutto_betrag?.toFixed(2) || '0.00'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500 mb-3">Noch keine Rechnungen für dieses Event</p>
                        <Button
                          size="sm"
                          onClick={() => navigate(createPageUrl('Rechnungen'))}
                          className="text-white"
                          style={{ backgroundColor: '#223a5e' }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Rechnung erstellen
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Ausgaben */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-gray-700" />
                        <CardTitle className="text-xl font-bold">Ausgaben</CardTitle>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(createPageUrl('Ausgaben'))}
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ausgabe hinzufügen
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {ausgaben.length > 0 ? (
                      <div className="space-y-3">
                        {ausgaben.map((ausgabe) => (
                          <div key={ausgabe.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{ausgabe.titel}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Badge variant="outline" className="text-xs">{ausgabe.kategorie}</Badge>
                                <span>•</span>
                                <span>{ausgabe.datum && format(new Date(ausgabe.datum), 'dd.MM.yyyy', { locale: de })}</span>
                              </div>
                            </div>
                            <p className="font-semibold text-orange-600">-€{ausgabe.betrag?.toFixed(2) || '0.00'}</p>
                          </div>
                        ))}
                        <div className="flex justify-between pt-3 border-t mt-3">
                          <p className="font-semibold">Gesamt Ausgaben</p>
                          <p className="font-bold text-lg text-orange-600">
                            -€{ausgaben.reduce((sum, a) => sum + (a.betrag || 0), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <TrendingDown className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500 mb-3">Noch keine Ausgaben für dieses Event</p>
                        <Button
                          size="sm"
                          onClick={() => navigate(createPageUrl('Ausgaben'))}
                          className="text-white"
                          style={{ backgroundColor: '#223a5e' }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Ausgabe hinzufügen
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">Finanzen</h3>
                  <p className="text-gray-500">Diese Ansicht ist nur für Manager verfügbar</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Einladung an Musiker Dialog */}
        <Dialog open={showEinladungDialog} onOpenChange={setShowEinladungDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Einladung an {einladungMusiker?.name}</DialogTitle>
              <DialogDescription>
                Sende eine Event-Einladung an {einladungMusiker?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg text-sm space-y-2">
                <p><strong>Event:</strong> {event?.titel}</p>
                <p><strong>Datum:</strong> {event?.datum_von && format(new Date(event.datum_von), 'dd. MMMM yyyy, HH:mm', { locale: de })} Uhr</p>
                <p><strong>Ort:</strong> {event?.ort_name || event?.ort_adresse || 'Nicht angegeben'}</p>
              </div>
              
              <div>
                <Label htmlFor="einladung-text">Persönliche Nachricht (optional)</Label>
                <Textarea
                  id="einladung-text"
                  value={einladungText}
                  onChange={(e) => setEinladungText(e.target.value)}
                  placeholder="z.B. Freue mich auf dich! Wäre toll, wenn du dabei bist..."
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Diese Nachricht wird in der E-Mail angezeigt
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEinladungDialog(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSendEinladung}
                disabled={sendEinladungMutation.isPending}
                className="text-white"
                style={{ backgroundColor: '#223a5e' }}
              >
                <Send className="w-4 h-4 mr-2" />
                {sendEinladungMutation.isPending ? 'Wird gesendet...' : 'Einladung senden'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contact Customer Dialog */}
        <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Kunde kontaktieren</DialogTitle>
              <DialogDescription>
                E-Mail an {kunde?.firmenname} ({kunde?.email}) senden
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-subject">Betreff</Label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Betreff der E-Mail"
                />
              </div>
              <div>
                <Label htmlFor="email-body">Nachricht</Label>
                <Textarea
                  id="email-body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Ihre Nachricht..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowContactDialog(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailSubject || !emailBody}
                className="text-white"
                style={{ backgroundColor: '#223a5e' }}
              >
                {sendingEmail ? 'Wird gesendet...' : 'E-Mail senden'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
        </div>
        );
        }