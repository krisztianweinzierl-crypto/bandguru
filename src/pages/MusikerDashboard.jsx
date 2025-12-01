import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  MapPin,
  Euro,
  AlertCircle,
  FileText,
  Music,
  Users,
  Shirt,
  ChevronRight,
  ExternalLink,
  Hotel,
  Wrench,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function MusikerDashboard() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMusiker, setCurrentMusiker] = useState(null);
  const [loadingState, setLoadingState] = useState("loading"); // "loading", "success", "no_profile", "error"
  const [errorMessage, setErrorMessage] = useState("");
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false); // Added new state for details dialog
  const [selectedEventMusiker, setSelectedEventMusiker] = useState(null);
  const [responseType, setResponseType] = useState(null);
  const [bedingungenAkzeptiert, setBedingungenAkzeptiert] = useState(false);
  const [ablehnungsgrund, setAblehnungsgrund] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log("🎵 === MUSIKER DASHBOARD - VOLLSTÄNDIGER DEBUG ===");
        setLoadingState("loading");
        
        const orgId = localStorage.getItem('currentOrgId');
        console.log("📋 Organisation ID:", orgId);
        setCurrentOrgId(orgId);
        
        if (!orgId) {
          console.error("❌ Keine Organisation ID gefunden!");
          setErrorMessage("Keine Organisation gefunden. Bitte melde dich erneut an.");
          setLoadingState("error");
          return;
        }

        const user = await base44.auth.me();
        console.log("👤 User geladen:");
        console.log("   - ID:", user.id);
        console.log("   - Email:", user.email);
        console.log("   - Name:", user.full_name);
        setCurrentUser(user);

        // SCHRITT 1: Lade Mitgliedschaft
        console.log("\n📋 SCHRITT 1: Lade Mitgliedschaft...");
        const mitgliedschaften = await base44.entities.Mitglied.filter({ 
          org_id: orgId,
          user_id: user.id,
          status: "aktiv",
          rolle: "Musiker"
        });
        
        console.log("   Gefundene Mitgliedschaften:", mitgliedschaften.length);
        if (mitgliedschaften.length > 0) {
          console.log("   Mitgliedschaft Details:");
          console.log("   - ID:", mitgliedschaften[0].id);
          console.log("   - musiker_id:", mitgliedschaften[0].musiker_id || "NICHT GESETZT");
          console.log("   - invite_email:", mitgliedschaften[0].invite_email);
        }

        // SCHRITT 2: Lade ALLE Musiker der Organisation für Debug
        console.log("\n📋 SCHRITT 2: Lade ALLE Musiker der Organisation...");
        const alleMusiker = await base44.entities.Musiker.filter({ 
          org_id: orgId
        });
        console.log("   Musiker in Organisation:", alleMusiker.length);
        alleMusiker.forEach((m, i) => {
          console.log(`   ${i+1}. Name: ${m.name}`);
          console.log(`      ID: ${m.id}`);
          console.log(`      Email: ${m.email}`);
          console.log(`      Aktiv: ${m.aktiv}`);
          console.log(`      Email lowercase: ${m.email?.toLowerCase()}`);
          console.log(`      User Email lowercase: ${user.email.toLowerCase()}`);
          console.log(`      Match: ${m.email?.toLowerCase() === user.email.toLowerCase()}`);
        });

        // SCHRITT 3: Versuche Musiker zu finden
        console.log("\n📋 SCHRITT 3: Suche Musiker-Profil...");
        let gefundenerMusiker = null;

        // Methode 3a: Über musiker_id in Mitgliedschaft
        if (mitgliedschaften.length > 0 && mitgliedschaften[0].musiker_id) {
          console.log("   🔍 Methode 3a: Suche über musiker_id =", mitgliedschaften[0].musiker_id);
          const musikerById = await base44.entities.Musiker.filter({ 
            id: mitgliedschaften[0].musiker_id
          });
          
          if (musikerById.length > 0) {
            console.log("   ✅ Musiker gefunden über musiker_id!");
            gefundenerMusiker = musikerById[0];
          } else {
            console.log("   ❌ Kein Musiker mit dieser ID gefunden");
          }
        }

        // Methode 3b: Case-insensitive E-Mail-Suche über ALLE Musiker
        if (!gefundenerMusiker) {
          console.log("   🔍 Methode 3b: Case-insensitive E-Mail-Suche über alle Musiker...");
          console.log("   Suche nach:", user.email);
          
          gefundenerMusiker = alleMusiker.find(m => 
            m.email?.toLowerCase().trim() === user.email.toLowerCase().trim() && 
            m.aktiv === true
          );
          
          if (gefundenerMusiker) {
            console.log("   ✅ Musiker gefunden über E-Mail-Match!");
            console.log("   - Name:", gefundenerMusiker.name);
            console.log("   - ID:", gefundenerMusiker.id);
            console.log("   - Email:", gefundenerMusiker.email);
            
            // REPARATUR: Mitgliedschaft aktualisieren
            if (mitgliedschaften.length > 0 && !mitgliedschaften[0].musiker_id) {
              console.log("   🔧 REPARATUR: Aktualisiere Mitgliedschaft mit musiker_id...");
              await base44.entities.Mitglied.update(mitgliedschaften[0].id, {
                musiker_id: gefundenerMusiker.id
              });
              console.log("   ✅ Mitgliedschaft repariert!");
            }
          } else {
            console.log("   ❌ Kein Musiker mit dieser E-Mail gefunden");
          }
        }

        // Methode 3c: Über invite_email in Mitgliedschaft
        if (!gefundenerMusiker && mitgliedschaften.length > 0 && mitgliedschaften[0].invite_email) {
          console.log("   🔍 Methode 3c: Suche über invite_email =", mitgliedschaften[0].invite_email);
          
          gefundenerMusiker = alleMusiker.find(m => 
            m.email?.toLowerCase().trim() === mitgliedschaften[0].invite_email.toLowerCase().trim() && 
            m.aktiv === true
          );
          
          if (gefundenerMusiker) {
            console.log("   ✅ Musiker gefunden über invite_email!");
            console.log("   - Name:", gefundenerMusiker.name);
            console.log("   - ID:", gefundenerMusiker.id);
            
            // REPARATUR: Mitgliedschaft aktualisieren
            console.log("   🔧 REPARATUR: Aktualisiere Mitgliedschaft mit musiker_id...");
            await base44.entities.Mitglied.update(mitgliedschaften[0].id, {
              musiker_id: gefundenerMusiker.id
            });
            console.log("   ✅ Mitgliedschaft repariert!");
          } else {
            console.log("   ❌ Kein Musiker mit invite_email gefunden");
          }
        }

        // SCHRITT 4: Ergebnis
        console.log("\n📋 SCHRITT 4: Ergebnis");
        if (gefundenerMusiker) {
          console.log("✅ === MUSIKER ERFOLGREICH GELADEN ===");
          console.log("   - ID:", gefundenerMusiker.id);
          console.log("   - Name:", gefundenerMusiker.name);
          console.log("   - Email:", gefundenerMusiker.email);
          setCurrentMusiker(gefundenerMusiker);
          setLoadingState("success");
          
          // Prüfe EventMusiker
          console.log("\n📋 Prüfe EventMusiker für musiker_id:", gefundenerMusiker.id);
          const testEventMusiker = await base44.entities.EventMusiker.filter({ 
            musiker_id: gefundenerMusiker.id 
          });
          console.log("   EventMusiker gefunden:", testEventMusiker.length);
          if (testEventMusiker.length > 0) {
            console.log("   - Erster Eintrag:");
            console.log("     Event ID:", testEventMusiker[0].event_id);
            console.log("     Status:", testEventMusiker[0].status);
            console.log("     Rolle:", testEventMusiker[0].rolle);
          }
        } else {
          console.log("❌ === KEIN MUSIKER-PROFIL GEFUNDEN ===");
          console.log("\n📋 DIAGNOSE:");
          console.log("1. Überprüfte E-Mail-Adressen:");
          console.log("   - User Email:", user.email);
          if (mitgliedschaften.length > 0 && mitgliedschaften[0].invite_email) {
            console.log("   - Invite Email:", mitgliedschaften[0].invite_email);
          }
          console.log("2. Gefundene Musiker in Organisation:", alleMusiker.length);
          console.log("3. Aktive Musiker:", alleMusiker.filter(m => m.aktiv).length);
          console.log("4. E-Mail-Matches:", alleMusiker.filter(m => 
            m.email?.toLowerCase().trim() === user.email.toLowerCase().trim()
          ).length);
          
          setErrorMessage(
            "Kein Musiker-Profil gefunden für deine E-Mail-Adresse: " + user.email + 
            ". Bitte kontaktiere deinen Band Manager, um ein Musiker-Profil anzulegen."
          );
          setLoadingState("no_profile");
        }

      } catch (error) {
        console.error("❌ KRITISCHER FEHLER:", error);
        console.error("   Message:", error.message);
        console.error("   Stack:", error.stack);
        setErrorMessage("Fehler beim Laden: " + error.message);
        setLoadingState("error");
      }
    };
    loadUser();
  }, []);

  const { data: eventMusiker = [] } = useQuery({
    queryKey: ['eventMusiker', currentMusiker?.id],
    queryFn: async () => {
      console.log("📋 Lade EventMusiker für Musiker ID:", currentMusiker.id);
      const result = await base44.entities.EventMusiker.filter({ musiker_id: currentMusiker.id });
      console.log("   EventMusiker gefunden:", result.length);
      result.forEach((em, i) => {
        console.log(`   ${i+1}. Event ID: ${em.event_id}, Status: ${em.status}, Rolle: ${em.rolle}`);
      });
      return result;
    },
    enabled: !!currentMusiker?.id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', eventMusiker],
    queryFn: async () => {
      const eventIds = [...new Set(eventMusiker.map(em => em.event_id))];
      console.log("📋 Lade Events für IDs:", eventIds);
      const eventsPromises = eventIds.map(id => 
        base44.entities.Event.filter({ id }).then(res => res[0])
      );
      const result = await Promise.all(eventsPromises);
      console.log("   Events geladen:", result.length);
      return result.filter(Boolean); // Filter out any undefined events if an ID didn't match
    },
    enabled: eventMusiker.length > 0,
  });

  // Lade Dokumente für alle Events
  const { data: eventDateien = [] } = useQuery({
    queryKey: ['eventDateien', events],
    queryFn: async () => {
      const eventIds = events.map(e => e.id);
      const allDateien = await base44.entities.Datei.filter({ 
        org_id: currentOrgId, 
        bezug_typ: 'event' 
      });
      return allDateien.filter(d => eventIds.includes(d.bezug_id));
    },
    enabled: events.length > 0 && !!currentOrgId,
  });

  const updateEventMusikerMutation = useMutation({
    mutationFn: async ({ eventMusikerId, newStatus, antwortNotizen }) => {
      return await base44.entities.EventMusiker.update(eventMusikerId, {
        status: newStatus,
        antwort_datum: new Date().toISOString(),
        ablehnungsgrund: newStatus === 'abgelehnt' ? antwortNotizen : null,
        buchungsbedingungen_akzeptiert: newStatus === 'zugesagt' ? true : false
      });
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventMusiker'] });
      
      // Benachrichtigung für Band Manager erstellen
      try {
        const eventMusikerId = variables.eventMusikerId;
        const newStatus = variables.newStatus;
        
        const eventMusikerEntities = await base44.entities.EventMusiker.filter({ id: eventMusikerId });
        const em = eventMusikerEntities[0];
        if (!em) {
          console.error("EventMusiker not found for notification creation:", eventMusikerId);
          return;
        }
        
        const eventsEntities = await base44.entities.Event.filter({ id: em.event_id });
        const event = eventsEntities[0];
        if (!event) {
          console.error("Event not found for notification creation:", em.event_id);
          return;
        }
        
        // Finde alle Band Manager der Organisation
        const mitglieder = await base44.entities.Mitglied.filter({
          org_id: currentOrgId,
          rolle: "Band Manager",
          status: "aktiv"
        });
        
        // Erstelle Benachrichtigung für jeden Band Manager
        const statusText = {
          'zugesagt': 'zugesagt',
          'abgelehnt': 'abgelehnt',
          'optional': 'als optional markiert'
        };
        
        const notificationPromises = mitglieder.map(mitglied => 
          base44.entities.Benachrichtigung.create({
            org_id: currentOrgId,
            user_id: mitglied.user_id,
            typ: newStatus === 'zugesagt' ? 'musiker_zugesagt' : 'musiker_abgelehnt',
            titel: `${currentMusiker?.name} hat ${statusText[newStatus]}`,
            nachricht: `${currentMusiker?.name} hat für "${event?.titel}" ${statusText[newStatus]}${newStatus === 'abgelehnt' && variables.antwortNotizen ? ` (Grund: ${variables.antwortNotizen})` : ''}`,
            link_url: createPageUrl('EventDetail') + '?id=' + event.id,
            bezug_typ: 'event',
            bezug_id: event.id,
            icon: newStatus === 'zugesagt' ? 'CheckCircle' : 'AlertCircle',
            prioritaet: newStatus === 'zugesagt' ? 'normal' : 'hoch'
          })
        );
        
        await Promise.all(notificationPromises);
      } catch (error) {
        console.error("Fehler beim Erstellen der Benachrichtigung:", error);
      }
      
      setShowResponseDialog(false);
      setSelectedEventMusiker(null);
      setResponseType(null);
      setBedingungenAkzeptiert(false);
      setAblehnungsgrund("");
    },
  });

  const offeneAnfragen = eventMusiker.filter(em => em.status === 'angefragt');
  const optionaleAnfragen = eventMusiker.filter(em => em.status === 'optional');
  const bestaetigteEvents = eventMusiker.filter(em => em.status === 'zugesagt');

  const handleOpenResponseDialog = (em, type) => {
    setSelectedEventMusiker(em);
    setResponseType(type);
    setShowResponseDialog(true);
    setAblehnungsgrund(""); // Reset ablehnungsgrund
    setBedingungenAkzeptiert(false); // Reset bedingungenAkzeptiert
  };

  const handleOpenDetailsDialog = (em) => {
    setSelectedEventMusiker(em);
    setShowDetailsDialog(true);
  };

  const handleSubmitResponse = () => {
    if (!selectedEventMusiker) return;

    let notificationStatus = responseType; 
    let notificationAblehnungsgrund = ablehnungsgrund; 

    if (responseType === 'zugesagt') {
      if (selectedEventMusiker.buchungsbedingungen && !bedingungenAkzeptiert) {
        alert("Bitte akzeptiere die Buchungsbedingungen");
        return;
      }
    }

    updateEventMusikerMutation.mutate({
      eventMusikerId: selectedEventMusiker.id,
      newStatus: notificationStatus,
      antwortNotizen: notificationAblehnungsgrund
    });
  };

  const getEventForEventMusiker = (em) => {
    return events.find(e => e.id === em.event_id);
  };

  const getDateienForEvent = (eventId) => {
    return eventDateien.filter(d => d.bezug_id === eventId);
  };

  const openGoogleMaps = (address) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const statusColors = {
    angefragt: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-400" },
    optional: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-400" },
    zugesagt: { bg: "bg-green-100", text: "text-green-800", border: "border-green-400" },
    abgelehnt: { bg: "bg-red-100", text: "text-red-800", border: "border-red-400" }
  };

  // New component for list items
  const AnfrageListItem = ({ em, event }) => {
    if (!event) return null;

    const statusStyle = statusColors[em.status] || statusColors.angefragt;

    return (
      <div
        onClick={() => handleOpenDetailsDialog(em)}
        className={`group flex items-center gap-4 p-4 border-l-4 ${statusStyle.border} bg-white hover:bg-gray-50 transition-all cursor-pointer rounded-lg shadow-sm`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg text-gray-900 truncate">{event.titel}</h3>
            <Badge className={`${statusStyle.bg} ${statusStyle.text} flex-shrink-0`}>
              {em.status === 'angefragt' && '⏳ Offen'}
              {em.status === 'optional' && '❓ Optional'}
              {em.status === 'zugesagt' && '✅ Zugesagt'}
              {em.status === 'abgelehnt' && '❌ Abgelehnt'}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(event.datum_von), 'dd. MMM yyyy', { locale: de })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{format(new Date(event.datum_von), 'HH:mm', { locale: de })} Uhr</span>
            </div>
            {event.ort_name && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[200px]">{event.ort_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Music className="w-4 h-4" />
              <span className="font-medium">{em.rolle}</span>
            </div>
            {em.gage_netto && (
              <div className="flex items-center gap-1.5 font-semibold text-green-600">
                <Euro className="w-4 h-4" />
                <span>€{em.gage_netto.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
      </div>
    );
  };

  // Loading State
  if (loadingState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Music className="w-16 h-16 mx-auto mb-4 text-purple-500 animate-pulse" />
            <h3 className="text-lg font-semibold mb-2">Lade Dashboard...</h3>
            <p className="text-sm text-gray-500">Bitte warten</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No Profile State
  if (loadingState === "no_profile") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-2xl w-full border-l-4 border-l-orange-500">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
              <h3 className="text-xl font-bold mb-2">Kein Musiker-Profil gefunden</h3>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-800">{errorMessage}</p>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold mb-2">🔍 Debug-Informationen:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>User E-Mail: {currentUser?.email}</li>
                  <li>Organisation ID: {currentOrgId}</li>
                  <li>User ID: {currentUser?.id}</li>
                </ul>
                <p className="mt-3 text-xs text-gray-600">
                  Öffne die Browser-Console (F12) für detailliertere Debug-Logs
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold mb-2">✅ Lösung:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Bitte deinen Band Manager, ein Musiker-Profil für dich anzulegen</li>
                  <li>Die E-Mail-Adresse im Musiker-Profil muss sein: <span className="font-mono bg-white px-2 py-1 rounded">{currentUser?.email}</span></li>
                  <li>Der Musiker muss als "aktiv" markiert sein</li>
                  <li>Nach dem Anlegen: Seite neu laden (F5)</li>
                </ol>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Seite neu laden
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error State
  if (loadingState === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full border-l-4 border-l-red-500">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
            <p className="text-sm text-gray-600 mb-4">{errorMessage}</p>
            <Button onClick={() => window.location.reload()}>
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Willkommen zurück{currentMusiker ? `, ${currentMusiker.name}` : ''}! 🎵
          </h1>
          <p className="text-gray-600">Deine Buchungsanfragen und Events im Überblick</p>
        </div>

        {/* Statistik-Kacheln */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Offene Anfragen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-4xl font-bold text-orange-600">{offeneAnfragen.length}</p>
                <AlertCircle className="w-12 h-12 text-orange-300" />
              </div>
              <p className="text-sm text-gray-500 mt-2">Warten auf deine Antwort</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Optional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-4xl font-bold text-blue-600">{optionaleAnfragen.length}</p>
                <HelpCircle className="w-12 h-12 text-blue-300" />
              </div>
              <p className="text-sm text-gray-500 mt-2">Noch nicht festgelegt</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Bestätigt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-4xl font-bold text-green-600">{bestaetigteEvents.length}</p>
                <CheckCircle2 className="w-12 h-12 text-green-300" />
              </div>
              <p className="text-sm text-gray-500 mt-2">Zugesagte Events</p>
            </CardContent>
          </Card>
        </div>

        {/* Offene Anfragen */}
        {offeneAnfragen.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Offene Buchungsanfragen ({offeneAnfragen.length})
              </h2>
            </div>
            <div className="space-y-3"> {/* Changed to space-y-3 */}
              {offeneAnfragen.map(em => (
                <AnfrageListItem key={em.id} em={em} event={getEventForEventMusiker(em)} />
              ))}
            </div>
          </div>
        )}

        {/* Optionale Anfragen */}
        {optionaleAnfragen.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Optionale Anfragen ({optionaleAnfragen.length})
              </h2>
            </div>
            <div className="space-y-3"> {/* Changed to space-y-3 */}
              {optionaleAnfragen.map(em => (
                <AnfrageListItem key={em.id} em={em} event={getEventForEventMusiker(em)} />
              ))}
            </div>
          </div>
        )}

        {/* Bestätigte Events */}
        {bestaetigteEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Bestätigte Events ({bestaetigteEvents.length})
              </h2>
            </div>
            <div className="space-y-3"> {/* Changed to space-y-3 */}
              {bestaetigteEvents.map(em => (
                <AnfrageListItem key={em.id} em={em} event={getEventForEventMusiker(em)} />
              ))}
            </div>
          </div>
        )}

        {/* Keine Anfragen */}
        {offeneAnfragen.length === 0 && optionaleAnfragen.length === 0 && bestaetigteEvents.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Music className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Keine Buchungsanfragen</h3>
              <p className="text-gray-500">Du hast aktuell keine offenen oder bestätigten Buchungsanfragen</p>
            </CardContent>
          </Card>
        )}

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedEventMusiker && getEventForEventMusiker(selectedEventMusiker) && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <DialogTitle className="text-2xl mb-2">
                        {getEventForEventMusiker(selectedEventMusiker)?.titel}
                      </DialogTitle>
                      <Badge className={`${statusColors[selectedEventMusiker.status].bg} ${statusColors[selectedEventMusiker.status].text}`}>
                        {selectedEventMusiker.status === 'angefragt' && '⏳ Offen'}
                        {selectedEventMusiker.status === 'optional' && '❓ Optional'}
                        {selectedEventMusiker.status === 'zugesagt' && '✅ Zugesagt'}
                        {selectedEventMusiker.status === 'abgelehnt' && '❌ Abgelehnt'}
                      </Badge>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Event Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-5 h-5 flex-shrink-0" />
                      <span>{format(new Date(getEventForEventMusiker(selectedEventMusiker).datum_von), 'dd. MMMM yyyy', { locale: de })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-5 h-5 flex-shrink-0" />
                      <span>{format(new Date(getEventForEventMusiker(selectedEventMusiker).datum_von), 'HH:mm', { locale: de })} Uhr</span>
                    </div>
                    {getEventForEventMusiker(selectedEventMusiker).ort_name && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-5 h-5 flex-shrink-0" />
                        <span>{getEventForEventMusiker(selectedEventMusiker).ort_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Music className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{selectedEventMusiker.rolle}</span>
                    </div>
                    {selectedEventMusiker.gage_netto && (
                      <div className="flex items-center gap-2 text-green-600 font-semibold">
                        <Euro className="w-5 h-5 flex-shrink-0" />
                        <span>€{selectedEventMusiker.gage_netto.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Publikum & Ambiente */}
                  {(getEventForEventMusiker(selectedEventMusiker).event_typ || getEventForEventMusiker(selectedEventMusiker).anzahl_gaeste || getEventForEventMusiker(selectedEventMusiker).dresscode) && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Publikum & Ambiente</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {getEventForEventMusiker(selectedEventMusiker).event_typ && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <span className="text-xl">🎉</span>
                            <span>{getEventForEventMusiker(selectedEventMusiker).event_typ}</span>
                          </div>
                        )}
                        {getEventForEventMusiker(selectedEventMusiker).anzahl_gaeste && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Users className="w-5 h-5" />
                            <span>{getEventForEventMusiker(selectedEventMusiker).anzahl_gaeste} Gäste</span>
                          </div>
                        )}
                        {getEventForEventMusiker(selectedEventMusiker).dresscode && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Shirt className="w-5 h-5" />
                            <span>{getEventForEventMusiker(selectedEventMusiker).dresscode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notizen */}
                  {selectedEventMusiker.notizen && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Notizen:</p>
                      <p className="text-sm text-blue-700">{selectedEventMusiker.notizen}</p>
                    </div>
                  )}

                  {/* Buchungsbedingungen */}
                  {selectedEventMusiker.buchungsbedingungen && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-2">
                        <FileText className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-900 mb-2">Buchungsbedingungen:</p>
                          <div 
                            className="text-sm text-amber-700 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: selectedEventMusiker.buchungsbedingungen }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Aktionen */}
                  {selectedEventMusiker.status === 'angefragt' && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      <Button
                        onClick={() => {
                          setShowDetailsDialog(false);
                          handleOpenResponseDialog(selectedEventMusiker, 'zugesagt');
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Zusagen
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDetailsDialog(false);
                          handleOpenResponseDialog(selectedEventMusiker, 'optional');
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Optional
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDetailsDialog(false);
                          handleOpenResponseDialog(selectedEventMusiker, 'abgelehnt');
                        }}
                        variant="outline"
                        className="flex-1 text-red-600 hover:text-red-700 hover:border-red-600"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Ablehnen
                      </Button>
                    </div>
                  )}

                  {selectedEventMusiker.status === 'optional' && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={() => {
                          setShowDetailsDialog(false);
                          handleOpenResponseDialog(selectedEventMusiker, 'zugesagt');
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Zusagen
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDetailsDialog(false);
                          handleOpenResponseDialog(selectedEventMusiker, 'abgelehnt');
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Ablehnen
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Response Dialog */}
        <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {responseType === 'zugesagt' && '✅ Anfrage zusagen'}
                {responseType === 'optional' && '❓ Als optional markieren'}
                {responseType === 'abgelehnt' && '❌ Anfrage ablehnen'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {selectedEventMusiker && getEventForEventMusiker(selectedEventMusiker) && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <p className="font-semibold">
                    {getEventForEventMusiker(selectedEventMusiker)?.titel}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedEventMusiker.rolle} • €{selectedEventMusiker.gage_netto?.toFixed(2)}
                  </p>
                </div>
              )}

              {responseType === 'zugesagt' && selectedEventMusiker?.buchungsbedingungen && (
                <div className="space-y-3">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg max-h-60 overflow-y-auto">
                    <p className="font-semibold text-sm text-amber-900 mb-2">Buchungsbedingungen:</p>
                    <div 
                      className="text-sm text-amber-800 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEventMusiker.buchungsbedingungen }}
                    />
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id="accept-terms"
                      checked={bedingungenAkzeptiert}
                      onCheckedChange={setBedingungenAkzeptiert}
                      className="mt-0.5"
                    />
                    <label htmlFor="accept-terms" className="text-sm cursor-pointer">
                      Ich akzeptiere die Buchungsbedingungen und verpflichte mich, bei diesem Event zu spielen.
                    </label>
                  </div>
                </div>
              )}

              {responseType === 'optional' && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Du markierst diese Anfrage als "optional". Das bedeutet, dass du noch nicht sicher zusagen kannst, aber grundsätzlich verfügbar bist.
                  </p>
                </div>
              )}

              {responseType === 'abgelehnt' && (
                <div className="space-y-2">
                  <Label htmlFor="grund">Grund für Ablehnung (optional)</Label>
                  <Textarea
                    id="grund"
                    value={ablehnungsgrund}
                    onChange={(e) => setAblehnungsgrund(e.target.value)}
                    placeholder="z.B. Bereits anderweitig gebucht, zu weite Anreise..."
                    rows={3}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowResponseDialog(false);
                  setBedingungenAkzeptiert(false);
                  setAblehnungsgrund("");
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSubmitResponse}
                disabled={updateEventMusikerMutation.isPending || (responseType === 'zugesagt' && selectedEventMusiker?.buchungsbedingungen && !bedingungenAkzeptiert)}
                className={
                  responseType === 'zugesagt' ? 'bg-green-600 hover:bg-green-700' :
                  responseType === 'optional' ? 'bg-blue-600 hover:bg-blue-700' :
                  'bg-red-600 hover:bg-red-700'
                }
              >
                {responseType === 'zugesagt' && 'Zusagen'}
                {responseType === 'optional' && 'Als optional markieren'}
                {responseType === 'abgelehnt' && 'Ablehnen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}