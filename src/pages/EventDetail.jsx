import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
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
  Receipt,
  ChevronDown
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
import MusikerHinzufuegenForm from "@/components/events/MusikerHinzufuegenForm";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import EventForm from "@/components/events/EventForm";
import EventAufgabenTab from "@/components/events/EventAufgabenTab";
import GoogleMapEmbed from "@/components/events/GoogleMapEmbed";
import EventMusikerCard from "@/components/events/EventMusikerCard";
import { EditMusikerDialog, EinladungDialog, KontaktDialog } from "@/components/events/EventMusikerDialogs";
import EventFinanzenTab from "@/components/events/EventFinanzenTab";

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
  const [musikerDistanz, setMusikerDistanz] = useState("");
  const [musikerFahrtkostenProKm, setMusikerFahrtkostenProKm] = useState("0.30");
  const [musikerNotizen, setMusikerNotizen] = useState("");
  const [buchungsbedingungen, setBuchungsbedingungen] = useState("");
  const [selectedVorlageId, setSelectedVorlageId] = useState("");
  const [showDropdownId, setShowDropdownId] = useState(null);
  const [editingEventMusiker, setEditingEventMusiker] = useState(null);
  const [showEditMusikerDialog, setShowEditMusikerDialog] = useState(false);
  const [editMusikerData, setEditMusikerData] = useState({
    rolle: "",
    gage_netto: "",
    mwst_satz: "19",
    distanz_km: "",
    fahrtkosten_pro_km: "0.30",
    weitere_kosten: [],
    notizen: "",
    buchungsbedingungen: ""
  });
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
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      
      // WICHTIG: Access-Check nur beim ersten Laden, nicht bei Updates
      if (accessChecked) return;

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
    
    if (eventId && !accessChecked) {
      loadUserData();
    }
  }, [event, eventId, accessChecked]);

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
      // Lade alle EventMusiker für dieses Event (Manager sieht alle, Musiker nur zugesagte + optionale)
      const allEventMusiker = await base44.entities.EventMusiker.filter({ event_id: eventId });
      if (isManager) {
        return allEventMusiker;
      } else {
        // Musiker sehen zugesagte und optionale Kollegen
        return allEventMusiker.filter(em => em.status === 'zugesagt' || em.status === 'optional');
      }
    },
    enabled: !!eventId && (isManager || !!currentMusiker?.id),
  });

  const { data: musiker = [] } = useQuery({
    queryKey: ['musiker', event?.org_id],
    queryFn: () => base44.entities.Musiker.filter({ org_id: event.org_id, aktiv: true }),
    enabled: !!event?.org_id,
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

  const { data: aktivitaeten = [] } = useQuery({
    queryKey: ['eventAktivitaeten', eventId],
    queryFn: () => base44.entities.EventAktivitaet.filter({ event_id: eventId }, '-created_date'),
    enabled: !!eventId,
  });

  const updateEventMutation = useMutation({
    mutationFn: async (eventData) => {
      console.log("Aktualisiere Event:", eventData);
      setIsSaving(true);
      return await base44.entities.Event.update(eventId, eventData);
    },
    onSuccess: async (data, variables) => {
      console.log("Event erfolgreich aktualisiert:", data);
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      
      // Prüfe, welche relevanten Felder sich geändert haben
      const relevantChanges = [];
      
      if (variables.datum_von !== event.datum_von || variables.datum_bis !== event.datum_bis) {
        relevantChanges.push('Datum/Uhrzeit');
      }
      if (variables.ort_name !== event.ort_name || variables.ort_adresse !== event.ort_adresse) {
        relevantChanges.push('Veranstaltungsort');
      }
      if (variables.get_in_zeit !== event.get_in_zeit) {
        relevantChanges.push('Get-In Zeit');
      }
      if (variables.soundcheck_zeit !== event.soundcheck_zeit) {
        relevantChanges.push('Soundcheck-Zeit');
      }
      if (variables.ablaufplan !== event.ablaufplan) {
        relevantChanges.push('Ablaufplan');
      }
      if (variables.musiker_notizen !== event.musiker_notizen) {
        relevantChanges.push('Notizen für Musiker');
      }
      if (variables.dresscode !== event.dresscode) {
        relevantChanges.push('Dresscode');
      }
      if (variables.hotel_name !== event.hotel_name || variables.hotel_adresse !== event.hotel_adresse) {
        relevantChanges.push('Hotel-Informationen');
      }
      if (variables.technik_hinweise !== event.technik_hinweise) {
        relevantChanges.push('Technik-Hinweise');
      }
      
      // Nur benachrichtigen, wenn relevante Änderungen vorliegen
      if (relevantChanges.length > 0) {
        await notifyEventMusicians(
          `📝 Event aktualisiert: ${event.titel}`,
          `Folgende Details wurden geändert: ${relevantChanges.join(', ')}. Bitte prüfe die aktuellen Event-Informationen.`,
          'event_update'
        );
        
        // Aktivität loggen
        await logActivity(
          'event_bearbeitet',
          `Event-Details aktualisiert: ${relevantChanges.join(', ')}`,
          { changes: relevantChanges }
        );
      }
      
      setIsEditing(false);
      setIsSaving(false);
    },
    onError: (error) => {
      console.error("Fehler beim Aktualisieren:", error);
      alert("Fehler beim Aktualisieren des Events: " + (error.message || "Unbekannter Fehler"));
      setIsSaving(false);
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
        
        // Aktivität loggen
        await logActivity(
          'musiker_hinzugefuegt',
          `${selectedMusiker?.name || 'Musiker'} wurde zum Event hinzugefügt (${variables.rolle})`,
          { musiker_name: selectedMusiker?.name, rolle: variables.rolle }
        );
        
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
    onSuccess: async (updatedData, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventMusiker', eventId] });
      
      // Wenn Status geändert wurde, Aktivität loggen
      if (variables.data.status) {
        const em = eventMusiker.find(m => m.id === variables.id);
        const musikerData = musiker.find(m => m.id === em?.musiker_id);
        const statusLabels = {
          angefragt: 'Angefragt',
          optional: 'Optional',
          zugesagt: 'Zugesagt',
          abgelehnt: 'Abgelehnt',
          ersetzt: 'Ersetzt'
        };
        
        await logActivity(
          'musiker_status_geaendert',
          `Status von ${musikerData?.name || 'Musiker'} geändert auf: ${statusLabels[variables.data.status] || variables.data.status}`,
          { 
            musiker_name: musikerData?.name,
            alter_status: em?.status,
            neuer_status: variables.data.status 
          }
        );
      }
      
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
      const em = eventMusiker.find(m => m.id === id);
      const musikerData = musiker.find(m => m.id === em?.musiker_id);
      
      await base44.entities.EventMusiker.delete(id);
      
      return { musikerData };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['eventMusiker', eventId] });
      
      // Aktivität loggen
      await logActivity(
        'musiker_entfernt',
        `${result.musikerData?.name || 'Musiker'} wurde vom Event entfernt`,
        { musiker_name: result.musikerData?.name }
      );
      
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

  // Hilfsfunktion: Aktivität loggen
  const logActivity = async (typ, beschreibung, details = {}) => {
    try {
      await base44.entities.EventAktivitaet.create({
        org_id: event.org_id,
        event_id: eventId,
        typ,
        beschreibung,
        details,
        benutzer_name: currentUser?.full_name || currentUser?.email || 'Unbekannt'
      });
      queryClient.invalidateQueries({ queryKey: ['eventAktivitaeten', eventId] });
    } catch (error) {
      console.error("Fehler beim Loggen der Aktivität:", error);
    }
  };

  // Hilfsfunktion: Benachrichtigung an alle zugesagten Musiker senden
  const notifyEventMusicians = async (titel, nachricht, typ = 'event_update') => {
    try {
      // Lade alle zugesagten EventMusiker
      const zugesagteMusiker = await base44.entities.EventMusiker.filter({ 
        event_id: eventId, 
        status: 'zugesagt' 
      });
      
      // Finde die User-IDs der Musiker
      for (const em of zugesagteMusiker) {
        const mitgliedschaften = await base44.entities.Mitglied.filter({
          org_id: event.org_id,
          musiker_id: em.musiker_id,
          status: "aktiv"
        });
        
        if (mitgliedschaften.length > 0 && mitgliedschaften[0].user_id) {
          await base44.entities.Benachrichtigung.create({
            org_id: event.org_id,
            user_id: mitgliedschaften[0].user_id,
            typ: typ,
            titel: titel,
            nachricht: nachricht,
            link_url: `${createPageUrl('EventDetail')}?id=${eventId}`,
            bezug_typ: 'event',
            bezug_id: eventId,
            icon: typ === 'event_update' ? 'Calendar' : 'FileText',
            prioritaet: 'normal'
          });
        }
      }
    } catch (error) {
      console.error("Fehler beim Senden der Benachrichtigungen:", error);
    }
  };

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
      
      // Aktivität loggen
      await logActivity(
        'dokument_hinzugefuegt',
        `Dokument "${file.name}" hochgeladen`,
        { datei_name: file.name, datei_groesse: file.size }
      );
      
      // Benachrichtigung an Musiker senden
      await notifyEventMusicians(
        `📄 Neues Dokument: ${event.titel}`,
        `Ein neues Dokument "${file.name}" wurde zum Event "${event.titel}" hinzugefügt.`,
        'event_update'
      );
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
      alert("Fehler beim Hochladen der Datei: " + error.message);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteDatei = async (dateiId) => {
    const datei = dateien.find(d => d.id === dateiId);
    if (confirm("Möchtest du diese Datei wirklich löschen?")) {
      deleteDateiMutation.mutate(dateiId);
      
      // Aktivität loggen
      if (datei) {
        await logActivity(
          'dokument_geloescht',
          `Dokument "${datei.file_name}" gelöscht`,
          { datei_name: datei.file_name }
        );
        
        // Benachrichtigung an Musiker senden
        await notifyEventMusicians(
          `🗑️ Dokument entfernt: ${event.titel}`,
          `Das Dokument "${datei.file_name}" wurde vom Event "${event.titel}" entfernt.`,
          'event_update'
        );
      }
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
    setMusikerDistanz("");
    setMusikerFahrtkostenProKm("0.30");
    setMusikerNotizen("");
    setBuchungsbedingungen("");
    setSelectedVorlageId("");
  };

  const handleAddMusiker = () => {
    if (!selectedMusikerId) return;

    const selectedMusiker = musiker.find(m => m.id === selectedMusikerId);
    
    const distanz = parseFloat(musikerDistanz) || 0;
    const fahrtkostenProKm = parseFloat(musikerFahrtkostenProKm) || 0.30;
    const berechneteSpesen = distanz * 2 * fahrtkostenProKm;
    
    addMusikerMutation.mutate({
      event_id: eventId,
      musiker_id: selectedMusikerId,
      rolle: musikerRolle || (selectedMusiker?.instrumente?.[0] || ""),
      gage_netto: parseFloat(musikerGage) || selectedMusiker?.tagessatz_netto || 0,
      distanz_km: distanz,
      fahrtkosten_pro_km: fahrtkostenProKm,
      spesen: berechneteSpesen,
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

  const handleOpenEditMusikerDialog = (em) => {
    setEditingEventMusiker(em);
    setEditMusikerData({
      rolle: em.rolle || "",
      gage_netto: em.gage_netto?.toString() || "",
      mwst_satz: em.mwst_satz?.toString() || "19",
      distanz_km: em.distanz_km?.toString() || "",
      fahrtkosten_pro_km: em.fahrtkosten_pro_km?.toString() || "0.30",
      weitere_kosten: em.weitere_kosten || [],
      notizen: em.notizen || "",
      buchungsbedingungen: em.buchungsbedingungen || ""
    });
    setShowEditMusikerDialog(true);
    setShowDropdownId(null);
  };

  const handleSaveEditMusiker = () => {
    if (!editingEventMusiker) return;
    
    const distanz = parseFloat(editMusikerData.distanz_km) || 0;
    const fahrtkostenProKm = parseFloat(editMusikerData.fahrtkosten_pro_km) || 0.30;
    const berechneteSpesen = distanz * 2 * fahrtkostenProKm;
    
    updateEventMusikerMutation.mutate({
      id: editingEventMusiker.id,
      data: {
        rolle: editMusikerData.rolle,
        gage_netto: parseFloat(editMusikerData.gage_netto) || 0,
        mwst_satz: parseFloat(editMusikerData.mwst_satz) || 19,
        distanz_km: distanz,
        fahrtkosten_pro_km: fahrtkostenProKm,
        spesen: berechneteSpesen,
        weitere_kosten: editMusikerData.weitere_kosten,
        notizen: editMusikerData.notizen,
        buchungsbedingungen: editMusikerData.buchungsbedingungen
      }
    });
    setShowEditMusikerDialog(false);
    setEditingEventMusiker(null);
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
  // WICHTIG: Nicht während des Speicherns anzeigen (verhindert kurzes Aufblinken)
  if (!hasAccess && !isSaving) {
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
    anfrage: { bg: "bg-gray-100", text: "text-gray-800", label: "Anfrage" },
    angebot_erstellt: { bg: "bg-blue-100", text: "text-blue-800", label: "Angebot erstellt" },
    angebot_angenommen: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Angebot angenommen" },
    wartet_auf_bestaetigung: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Wartet auf Bestätigung" },
    angefragt: { bg: "bg-orange-100", text: "text-orange-800", label: "Wartet auf Musiker" },
    bestätigt: { bg: "bg-green-100", text: "text-green-800", label: "Bestätigt" },
    abgesagt: { bg: "bg-red-100", text: "text-red-800", label: "Abgesagt" },
    zurückgezogen: { bg: "bg-slate-100", text: "text-slate-800", label: "Zurückgezogen" },
    durchgeführt: { bg: "bg-blue-100", text: "text-blue-800", label: "Durchgeführt" },
    abgerechnet: { bg: "bg-purple-100", text: "text-purple-800", label: "Abgerechnet" }
  };

  const musikerStatusColors = {
    angefragt: { bg: "bg-red-100", text: "text-red-800", border: "border-l-red-400", label: "Angefragt" },
    optional: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-l-yellow-400", label: "Optional" },
    zugesagt: { bg: "bg-green-100", text: "text-green-800", border: "border-l-green-500", label: "Zugesagt" },
    abgelehnt: { bg: "bg-red-100", text: "text-red-800", border: "border-l-red-400", label: "Abgelehnt" },
    ersetzt: { bg: "bg-gray-100", text: "text-gray-800", border: "border-l-gray-400", label: "Ersetzt" }
  };

  const statusInfo = statusColors[event.status] || statusColors.anfrage;

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

  const handleUpdateSubmit = async (data) => {
    updateEventMutation.mutate(data);
  };

  const handleDeleteEvent = () => {
    if (confirm("Möchtest du dieses Event wirklich löschen?\n\nAlle zugehörigen Musiker-Zuweisungen werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.")) {
      deleteEventMutation.mutate();
    }
  };

  const handleExportPDF = async () => {
    setGeneratingPDF(true);
    try {
      const response = await base44.functions.invoke('generateEventPDF', {
        event_id: eventId
      });

      // PDF als Blob erstellen
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Download starten
      const a = document.createElement('a');
      a.href = url;
      a.download = `Event_${event.titel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF-Export fehlgeschlagen:', error);
      alert('Fehler beim Erstellen des PDFs: ' + (error.message || 'Unbekannter Fehler'));
    } finally {
      setGeneratingPDF(false);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full max-w-7xl mx-auto px-3 md:px-8 py-4 md:py-6">
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={generatingPDF}
                className="gap-2"
              >
                {generatingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    PDF wird erstellt...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Als PDF
                  </>
                )}
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
      <div className="w-full max-w-7xl mx-auto px-3 md:px-8 py-4 md:py-8">
        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border-b border-gray-200 p-0 h-auto flex-wrap overflow-x-auto">
            <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3 text-xs md:text-sm">
              Übersicht
            </TabsTrigger>
            <TabsTrigger value="musiker" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3 text-xs md:text-sm">
              Musiker ({eventMusiker.length})
            </TabsTrigger>
            <TabsTrigger value="aufgaben" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3 text-xs md:text-sm">
              Aufgaben
            </TabsTrigger>
            <TabsTrigger value="dokumente" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3 text-xs md:text-sm">
              Dokumente
            </TabsTrigger>
            <TabsTrigger value="finanzen" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3 text-xs md:text-sm">
              Finanzen
            </TabsTrigger>
            <TabsTrigger value="verlauf" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-3 text-xs md:text-sm">
              Verlauf
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
                        {kunde ? (
                          <Link
                            to={`${createPageUrl('KundenDetail')}?id=${kunde.id}`}
                            className="font-medium text-[#223a5e] hover:underline inline-flex items-center gap-1"
                          >
                            {kunde.firmenname}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <p className="font-medium text-gray-900">Kein Kunde verknüpft</p>
                        )}
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
                  
                  {/* Google Maps Embed */}
                  <GoogleMapEmbed address={event.ort_adresse || event.ort_name} />
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
                  {event.ablaufplan && (
                    <div className="flex items-start gap-3 pt-4 border-t">
                      <FileText className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-2">Ablaufplan</p>
                        <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-gray-700">
                          {event.ablaufplan}
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
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Technik</p>
                    <p className="font-medium text-gray-900">
                      {event.technik_hinweise || 'Nicht angegeben'}
                    </p>
                  </div>
                </div>

                {/* Notizen für Musiker (öffentlich) */}
                {event.musiker_notizen && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">Notizen für Musiker</p>
                      <div className="text-gray-700 whitespace-pre-wrap">
                        {event.musiker_notizen}
                      </div>
                    </div>
                  </div>
                )}

                {/* Interne Notizen (nur für Manager) */}
                {isManager && event.interne_notizen && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <File className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-amber-900">Interne Notizen</p>
                        <Badge variant="outline" className="text-xs bg-amber-100 border-amber-300 text-amber-800">
                          Nur für Manager
                        </Badge>
                      </div>
                      <div className="text-gray-700 whitespace-pre-wrap">
                        {event.interne_notizen}
                      </div>
                    </div>
                  </div>
                )}

                {/* Keine Notizen vorhanden */}
                {!event.musiker_notizen && !event.interne_notizen && (
                  <div className="flex items-start gap-3">
                    <File className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Notizen</p>
                      <p className="font-medium text-gray-900">Nicht angegeben</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Musiker Tab */}
          <TabsContent value="musiker" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-bold">
                    {isManager ? "Gebuchte Musiker" : "Musiker bei diesem Event"}
                  </CardTitle>
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
                    <MusikerHinzufuegenForm
                      musiker={musiker}
                      vorlagen={vorlagen}
                      selectedMusikerId={selectedMusikerId} setSelectedMusikerId={setSelectedMusikerId}
                      musikerRolle={musikerRolle} setMusikerRolle={setMusikerRolle}
                      musikerGage={musikerGage} setMusikerGage={setMusikerGage}
                      musikerDistanz={musikerDistanz} setMusikerDistanz={setMusikerDistanz}
                      musikerFahrtkostenProKm={musikerFahrtkostenProKm} setMusikerFahrtkostenProKm={setMusikerFahrtkostenProKm}
                      musikerNotizen={musikerNotizen} setMusikerNotizen={setMusikerNotizen}
                      buchungsbedingungen={buchungsbedingungen} setBuchungsbedingungen={setBuchungsbedingungen}
                      selectedVorlageId={selectedVorlageId} setSelectedVorlageId={setSelectedVorlageId}
                      onAdd={handleAddMusiker}
                      onCancel={() => { setShowMusikerForm(false); resetMusikerForm(); }}
                      isPending={addMusikerMutation.isPending}
                    />
                  )}

                  <div className="space-y-4">
                    {eventMusiker.length > 0 ? (
                      eventMusiker.map((em) => {
                        const musikerData = musiker.find(m => m.id === em.musiker_id);
                        const statusStyle = musikerStatusColors[em.status] || musikerStatusColors.angefragt;
                        const initials = musikerData?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
                        const isCurrentUserMusiker = currentMusiker?.id === em.musiker_id;
                        
                        return (
                          <EventMusikerCard
                            key={em.id}
                            em={em}
                            musikerData={musikerData}
                            statusStyle={statusStyle}
                            isCurrentUserMusiker={isCurrentUserMusiker}
                            isManager={isManager}
                            showDropdownId={showDropdownId}
                            setShowDropdownId={setShowDropdownId}
                            handleUpdateStatus={handleUpdateStatus}
                            handleOpenEditMusikerDialog={handleOpenEditMusikerDialog}
                            handleOpenEinladungDialog={handleOpenEinladungDialog}
                            handleRemoveMusiker={handleRemoveMusiker}
                          />
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
                          <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-semibold mb-2">Keine Musiker</h3>
                          <p className="text-gray-500">Es sind noch keine anderen Musiker für dieses Event bestätigt.</p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

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
            <EventFinanzenTab
              isManager={isManager}
              eventMusiker={eventMusiker.map(em => ({ ...em, musiker_name: musiker.find(m => m.id === em.musiker_id)?.name }))}
              ausgaben={ausgaben}
              rechnungen={rechnungen}
              eventId={eventId}
            />
          </TabsContent>

          {/* Verlauf Tab */}
          <TabsContent value="verlauf" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-xl font-bold">Aktivitätsverlauf</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Alle Änderungen und Aktivitäten zu diesem Event</p>
              </CardHeader>
              <CardContent className="p-6">
                {aktivitaeten.length > 0 ? (
                  <div className="space-y-4">
                    {aktivitaeten.map((aktivitaet) => {
                      const iconMap = {
                        event_erstellt: '✨',
                        event_bearbeitet: '📝',
                        musiker_hinzugefuegt: '➕',
                        musiker_entfernt: '➖',
                        musiker_status_geaendert: '🔄',
                        dokument_hinzugefuegt: '📄',
                        dokument_geloescht: '🗑️',
                        aufgabe_erstellt: '✅',
                        aufgabe_geaendert: '📋',
                        aufgabe_geloescht: '❌'
                      };

                      const colorMap = {
                        event_erstellt: 'bg-green-50 border-green-200',
                        event_bearbeitet: 'bg-blue-50 border-blue-200',
                        musiker_hinzugefuegt: 'bg-green-50 border-green-200',
                        musiker_entfernt: 'bg-red-50 border-red-200',
                        musiker_status_geaendert: 'bg-yellow-50 border-yellow-200',
                        dokument_hinzugefuegt: 'bg-purple-50 border-purple-200',
                        dokument_geloescht: 'bg-red-50 border-red-200',
                        aufgabe_erstellt: 'bg-blue-50 border-blue-200',
                        aufgabe_geaendert: 'bg-orange-50 border-orange-200',
                        aufgabe_geloescht: 'bg-red-50 border-red-200'
                      };

                      return (
                        <div 
                          key={aktivitaet.id} 
                          className={`flex items-start gap-4 p-4 rounded-lg border ${colorMap[aktivitaet.typ] || 'bg-gray-50 border-gray-200'}`}
                        >
                          <span className="text-2xl">{iconMap[aktivitaet.typ] || '📌'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{aktivitaet.beschreibung}</p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <span>{aktivitaet.benutzer_name}</span>
                              <span>•</span>
                              <span>{format(new Date(aktivitaet.created_date), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">Noch keine Aktivitäten</h3>
                    <p className="text-gray-500">Änderungen am Event werden hier protokolliert</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <EditMusikerDialog
          open={showEditMusikerDialog}
          onOpenChange={setShowEditMusikerDialog}
          editMusikerData={editMusikerData}
          setEditMusikerData={setEditMusikerData}
          musiker={musiker}
          editingEventMusiker={editingEventMusiker}
          onSave={handleSaveEditMusiker}
          isSaving={updateEventMusikerMutation.isPending}
        />
        <EinladungDialog
          open={showEinladungDialog}
          onOpenChange={setShowEinladungDialog}
          einladungMusiker={einladungMusiker}
          einladungText={einladungText}
          setEinladungText={setEinladungText}
          event={event}
          onSend={handleSendEinladung}
          isSending={sendEinladungMutation.isPending}
        />
        <KontaktDialog
          open={showContactDialog}
          onOpenChange={setShowContactDialog}
          kunde={kunde}
          emailSubject={emailSubject}
          setEmailSubject={setEmailSubject}
          emailBody={emailBody}
          setEmailBody={setEmailBody}
          onSend={handleSendEmail}
          isSending={sendingEmail}
        />
        </div>
        </div>
        );
        }