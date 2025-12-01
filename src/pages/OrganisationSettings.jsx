import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Mail,
  Trash2,
  UserPlus,
  Crown,
  Shield,
  Copy,
  Check,
  Save,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";

export default function OrganisationSettingsPage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Musiker");
  const [inviteName, setInviteName] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [orgFormData, setOrgFormData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();
  const { showAlert, AlertDialog } = useAlertDialog();

  // Helper function to create page URLs.
  // In a real application, this would typically come from a routing library
  // or a centralized utility. For this implementation, we'll map 'AcceptInvite'
  // to a known path.
  // This helper function is now removed as it's no longer used.

  useEffect(() => {
    setCurrentOrgId(localStorage.getItem('currentOrgId'));
  }, []);

  const { data: organisation } = useQuery({
    queryKey: ['organisation', currentOrgId],
    queryFn: async () => {
      const orgs = await base44.entities.Organisation.filter({ id: currentOrgId });
      return orgs[0];
    },
    enabled: !!currentOrgId,
  });

  useEffect(() => {
    if (organisation && !orgFormData) {
      setOrgFormData({
        name: organisation.name || "",
        adresse: organisation.adresse || "",
        steuernummer: organisation.steuernummer || "",
        waehrung: organisation.waehrung || "EUR",
        primary_color: organisation.primary_color || "#3B82F6"
      });
    }
  }, [organisation, orgFormData]);

  const { data: mitglieder = [] } = useQuery({
    queryKey: ['mitglieder', currentOrgId],
    queryFn: () => base44.entities.Mitglied.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Lade alle User-Daten (nur als Manager möglich) - MIT asServiceRole
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers', currentOrgId],
    queryFn: async () => {
      try {
        console.log("🔍 Lade alle User-Daten mit ServiceRole...");
        const users = await base44.asServiceRole.entities.User.list();
        console.log("   Gefundene Users:", users.length);
        return users;
      } catch (error) {
        console.error("❌ Fehler beim Laden der User-Liste:", error);
        return [];
      }
    },
    enabled: !!currentOrgId,
  });

  // Lade alle Musiker der Organisation
  const { data: allMusiker = [] } = useQuery({
    queryKey: ['allMusiker', currentOrgId],
    queryFn: () => base44.entities.Musiker.filter({ org_id: currentOrgId }),
    enabled: !!currentOrgId,
  });

  const updateOrgMutation = useMutation({
    mutationFn: (data) => base44.entities.Organisation.update(currentOrgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation'] });
      setHasChanges(false);
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Token generieren
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // 2. Ablaufdatum (30 Tage)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      let createdMitglied = null; // Declare here so it's accessible in catch block

      try {
        // 3. Mitglied-Eintrag mit Status "eingeladen" erstellen
        createdMitglied = await base44.entities.Mitglied.create({
          org_id: currentOrgId,
          rolle: data.rolle,
          status: "eingeladen",
          invite_token: token,
          invite_email: data.email,
          invite_name: data.name || data.email, // Use email as fallback for name
          invite_expires_at: expiresAt.toISOString()
        });

        // 4. Personalisierten Link generieren - KORRIGIERT zu /AcceptInvite
        const inviteUrl = `${window.location.origin}/AcceptInvite?token=${token}`;
        
        const personalMessage = data.message ? `\n\n"${data.message}"\n` : "";
        
        const emailBody = `Hey ${data.name || 'du'}! 👋

${user?.full_name || 'Jemand'} hat dich zu "${organisation.name}" auf Bandguru eingeladen! 

🎸 Du wurdest als ${data.rolle} hinzugefügt.${personalMessage}

Mit Bandguru kannst du:
✨ Events & Auftritte verwalten
💰 Gagen & Finanzen im Blick behalten
📋 Aufgaben & Deadlines managen
💬 Mit dem Team kommunizieren

**Klicke hier, um die Einladung anzunehmen:**
👉 ${inviteUrl}

⏰ Diese Einladung ist 30 Tage gültig.

Falls du Fragen hast, einfach auf diese Mail antworten!

Viele Grüße
Das ${organisation.name} Team 🎵`;

        const response = await base44.functions.invoke('sendEmail', {
          to: data.email,
          subject: `🎵 Einladung zu ${organisation.name} auf Bandguru`,
          body: emailBody,
          from_name: organisation.name
        });

        if (!response || !response.data) {
          throw new Error('Keine Antwort vom Server erhalten');
        }

        if (!response.data.success) {
          // Bei Fehler: Mitglied wieder löschen
          await base44.entities.Mitglied.delete(createdMitglied.id);
          const errorMsg = response.data.error || response.data.details || 'Unbekannter Fehler';
          throw new Error(errorMsg);
        }

        return createdMitglied;
      } catch (error) {
        // Bei Fehler: Mitglied wieder löschen, falls es erstellt wurde
        if (createdMitglied && createdMitglied.id) {
          try {
            await base44.entities.Mitglied.delete(createdMitglied.id);
          } catch (e) {
            console.error('Fehler beim Löschen des Mitglieds nach fehlgeschlagenem E-Mail-Versand:', e);
          }
        }
        
        console.error('Detaillierter Fehler:', error);
        
        if (error.response?.status === 500) {
          throw new Error('Server-Fehler: Bitte überprüfe deine Mailgun-Einstellungen');
        } else if (error.response?.status === 401) {
          throw new Error('Authentifizierung fehlgeschlagen');
        } else if (error.message) {
          throw new Error(error.message);
        } else {
          throw new Error('E-Mail konnte nicht versendet werden');
        }
      }
    },
    onSuccess: (mitglied) => {
      queryClient.invalidateQueries({ queryKey: ['mitglieder'] });
      showAlert({
        title: 'Einladung versendet',
        message: `Die Einladung wurde erfolgreich an ${mitglied.invite_email} versendet!`,
        type: 'success'
      });
      setInviteEmail("");
      setInviteName("");
      setInviteMessage("");
      setInviteRole("Musiker");
    },
    onError: (error) => {
      console.error("Fehler beim Versenden der Einladung:", error);
      
      const errorMessage = error.message || "Unbekannter Fehler";
      showAlert({
        title: 'Fehler beim Versenden',
        message: `${errorMessage}\n\nBitte überprüfe:\n• Mailgun API Key korrekt?\n• Mailgun Domain korrekt?\n• Domain verifiziert bei Mailgun?`,
        type: 'error'
      });
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (mitgliedId) => base44.entities.Mitglied.delete(mitgliedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitglieder'] });
    },
  });

  const handleFormChange = (field, value) => {
    setOrgFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    updateOrgMutation.mutate(orgFormData);
  };

  const handleInvite = (e) => {
    e.preventDefault();
    
    inviteMemberMutation.mutate({
      email: inviteEmail,
      name: inviteName,
      rolle: inviteRole,
      message: inviteMessage
    });
  };

  const currentMitglied = mitglieder.find(m => m.user_id === user?.id);
  const isManager = currentMitglied?.rolle === "Band Manager";

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper-Funktion um E-Mail eines Mitglieds zu ermitteln
  const getMitgliedEmail = (mitglied) => {
    // 1. Priorität: invite_email (bei eingeladenen oder neu akzeptierten Mitgliedern)
    if (mitglied.invite_email) {
      return mitglied.invite_email;
    }
    
    // 2. Priorität: Aktueller User (wenn es der eigene Account ist)
    if (mitglied.user_id === user?.id && user?.email) {
      return user.email;
    }
    
    // 3. Priorität: User-Daten aus der User-Entity
    if (mitglied.user_id && allUsers.length > 0) {
      const userData = allUsers.find(u => u.id === mitglied.user_id);
      if (userData?.email) {
        return userData.email;
      }
      
      // 3b. Wenn User gefunden, suche Musiker-Profil über E-Mail
      if (userData?.email && allMusiker.length > 0) {
        const musikerByEmail = allMusiker.find(m => 
          m.email?.toLowerCase().trim() === userData.email.toLowerCase().trim()
        );
        if (musikerByEmail?.email) {
          return musikerByEmail.email;
        }
      }
    }
    
    // 4. Priorität: Musiker-Profil (über musiker_id)
    if (mitglied.musiker_id && allMusiker.length > 0) {
      const musikerData = allMusiker.find(m => m.id === mitglied.musiker_id);
      if (musikerData?.email) {
        return musikerData.email;
      }
    }
    
    return null;
  };

  // Helper-Funktion um den Namen eines Mitglieds zu ermitteln
  const getMitgliedName = (mitglied) => {
    // Für eingeladene Mitglieder
    if (mitglied.status === "eingeladen") {
      return mitglied.invite_name || mitglied.invite_email;
    }
    
    // Für aktive Mitglieder
    if (mitglied.user_id) {
      // Eigener Account
      if (mitglied.user_id === user?.id && user?.full_name) {
        return user.full_name;
      }
      
      // Andere User aus User-Entity
      if (allUsers.length > 0) {
        const userData = allUsers.find(u => u.id === mitglied.user_id);
        if (userData?.full_name) {
          return userData.full_name;
        }
        
        // Wenn User-Email bekannt, suche Musiker-Profil über E-Mail
        if (userData?.email && allMusiker.length > 0) {
          const musikerByEmail = allMusiker.find(m => 
            m.email?.toLowerCase().trim() === userData.email.toLowerCase().trim()
          );
          if (musikerByEmail?.name) {
            return musikerByEmail.name;
          }
        }
        
        if (userData?.email) {
          return userData.email;
        }
      }
    }
    
    // Fallback: Musiker-Name aus Musiker-Profil (über musiker_id)
    if (mitglied.musiker_id && allMusiker.length > 0) {
      const musikerData = allMusiker.find(m => m.id === mitglied.musiker_id);
      if (musikerData?.name) {
        return musikerData.name;
      }
      if (musikerData?.email) {
        return musikerData.email;
      }
    }
    
    // Letzter Fallback: invite_email oder "Unbekannt"
    return mitglied.invite_email || "Unbekannt";
  };

  if (!organisation || !orgFormData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-600">Lade Organisation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Organisations-Einstellungen
          </h1>
          <p className="text-gray-600">Verwalte deine Organisation und Mitglieder</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="general">Allgemein</TabsTrigger>
            <TabsTrigger value="members">Mitglieder</TabsTrigger>
          </TabsList>

          {/* Allgemein Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <CardTitle>Organisations-Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Name der Organisation</Label>
                  <Input
                    id="org-name"
                    value={orgFormData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    disabled={!isManager}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-adresse">Adresse</Label>
                  <Input
                    id="org-adresse"
                    value={orgFormData.adresse}
                    onChange={(e) => handleFormChange('adresse', e.target.value)}
                    placeholder="Straße, PLZ Ort"
                    disabled={!isManager}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-steuernummer">Steuernummer</Label>
                  <Input
                    id="org-steuernummer"
                    value={orgFormData.steuernummer}
                    onChange={(e) => handleFormChange('steuernummer', e.target.value)}
                    disabled={!isManager}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-waehrung">Währung</Label>
                    <select
                      id="org-waehrung"
                      value={orgFormData.waehrung}
                      onChange={(e) => handleFormChange('waehrung', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      disabled={!isManager}
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="CHF">CHF (Fr.)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="org-color">Primärfarbe</Label>
                    <Input
                      id="org-color"
                      type="color"
                      value={orgFormData.primary_color}
                      onChange={(e) => handleFormChange('primary_color', e.target.value)}
                      className="h-10 cursor-pointer"
                      disabled={!isManager}
                    />
                  </div>
                </div>

                {!isManager && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <Shield className="w-4 h-4 inline mr-2" />
                    Nur Band Manager können diese Einstellungen ändern
                  </p>
                )}

                {isManager && hasChanges && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={handleSaveChanges}
                      className="bg-slate-800 hover:bg-slate-900 text-white"
                      disabled={updateOrgMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateOrgMutation.isPending ? "Speichere..." : "Änderungen speichern"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle>Organisations-ID</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Input value={organisation.id} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(organisation.id)}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Diese ID wird für technische Integrationen benötigt
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mitglieder Tab */}
          <TabsContent value="members" className="space-y-6">
            {/* Mitglied einladen */}
            {isManager && (
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    <CardTitle>Mitglied einladen</CardTitle>
                  </div>
                  <p className="text-sm text-gray-500">
                    Lade neue Band Manager oder Musiker per E-Mail zu deiner Organisation ein
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="invite-name">Name (optional)</Label>
                        <Input
                          id="invite-name"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                          placeholder="z.B. Max Mustermann"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="invite-role">Rolle</Label>
                        <select
                          id="invite-role"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="Band Manager">Band Manager</option>
                          <option value="Musiker">Musiker</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invite-email">E-Mail-Adresse *</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="musiker@beispiel.de"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invite-message">Persönliche Nachricht (optional)</Label>
                      <Textarea
                        id="invite-message"
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        placeholder="z.B. Freue mich auf die Zusammenarbeit mit dir!"
                        rows={3}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="bg-slate-800 hover:bg-slate-900 text-white"
                      disabled={inviteMemberMutation.isPending}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {inviteMemberMutation.isPending ? "Wird versendet..." : "Einladung versenden"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Mitglieder Liste */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <CardTitle>Mitglieder ({mitglieder.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {mitglieder.map((mitglied) => {
                    const displayUserName = getMitgliedName(mitglied);
                    const displayInitial = (displayUserName?.[0] || '?').toUpperCase();
                    const isInvited = mitglied.status === "eingeladen";
                    const displayEmail = getMitgliedEmail(mitglied);

                    return (
                      <div
                        key={mitglied.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                            {displayInitial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">
                              {displayUserName}
                              {isInvited && <span className="text-sm text-gray-500 ml-2">(eingeladen)</span>}
                            </p>
                            {displayEmail && (
                              <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3" />
                                {displayEmail}
                              </p>
                            )}
                            {!displayEmail && (
                              <p className="text-xs text-amber-600 mt-0.5">
                                Keine E-Mail verfügbar
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className={
                                  mitglied.rolle === "Band Manager"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }
                              >
                                {mitglied.rolle === "Band Manager" && <Crown className="w-3 h-3 mr-1" />}
                                {mitglied.rolle}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={
                                  mitglied.status === "aktiv"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                }
                              >
                                {mitglied.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {isManager && mitglied.user_id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Möchtest du dieses Mitglied wirklich entfernen?")) {
                                removeMemberMutation.mutate(mitglied.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}