import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle, XCircle, Loader2, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [organisation, setOrganisation] = useState(null);
  const [mitgliedschaft, setMitgliedschaft] = useState(null);

  useEffect(() => {
    handleInviteAcceptance();
  }, []);

  const handleInviteAcceptance = async () => {
    console.log("🚀 === EINLADUNGSPROZESS GESTARTET ===");
    
    try {
      // SCHRITT 1: Token validieren
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      console.log("📋 Schritt 1: Token-Validierung");
      console.log("   Token gefunden:", !!token);

      if (!token) {
        console.error("❌ Kein Token gefunden!");
        setStatus("error");
        setMessage("Kein Einladungs-Token gefunden. Bitte überprüfe den Link in deiner E-Mail.");
        return;
      }

      console.log("   Token:", token.substring(0, 10) + "...");

      // SCHRITT 2: Mitglied anhand Token suchen
      console.log("📋 Schritt 2: Mitglied-Suche");
      const mitglieder = await base44.entities.Mitglied.filter({ 
        invite_token: token 
      });

      console.log("   Mitglieder gefunden:", mitglieder.length);

      if (mitglieder.length === 0) {
        console.error("❌ Kein Mitglied mit diesem Token gefunden!");
        setStatus("error");
        setMessage("Ungültiger Einladungs-Link. Dieser Link existiert nicht oder wurde bereits verwendet.");
        return;
      }

      const mitglied = mitglieder[0];
      console.log("   Mitglied ID:", mitglied.id);
      console.log("   Status:", mitglied.status);
      console.log("   Eingeladen als:", mitglied.rolle);
      console.log("   E-Mail:", mitglied.invite_email);
      
      setMitgliedschaft(mitglied);

      // SCHRITT 3: Organisation laden
      console.log("📋 Schritt 3: Organisation laden");
      const orgs = await base44.entities.Organisation.filter({ id: mitglied.org_id });
      
      if (orgs.length === 0) {
        console.error("❌ Organisation nicht gefunden!");
        setStatus("error");
        setMessage("Die Organisation konnte nicht gefunden werden.");
        return;
      }

      const org = orgs[0];
      console.log("   Organisation:", org.name);
      setOrganisation(org);

      // SCHRITT 4: Status prüfen - Bereits akzeptiert?
      console.log("📋 Schritt 4: Status-Prüfung");
      if (mitglied.status === "aktiv") {
        console.log("⚠️ Einladung bereits akzeptiert!");
        setStatus("already_accepted");
        setMessage("Diese Einladung wurde bereits akzeptiert.");
        
        // Nach 3 Sekunden zum Dashboard
        setTimeout(() => {
          console.log("➡️ Weiterleitung zum Dashboard...");
          localStorage.setItem('currentOrgId', mitglied.org_id);
          window.location.href = createPageUrl("Dashboard");
        }, 3000);
        return;
      }

      // SCHRITT 5: Ablaufdatum prüfen
      console.log("📋 Schritt 5: Ablaufdatum prüfen");
      if (mitglied.invite_expires_at) {
        const expiresAt = new Date(mitglied.invite_expires_at);
        const now = new Date();
        console.log("   Läuft ab am:", expiresAt);
        console.log("   Jetzt:", now);
        
        if (expiresAt < now) {
          console.error("❌ Einladung abgelaufen!");
          setStatus("expired");
          setMessage("Diese Einladung ist abgelaufen. Bitte kontaktiere den Absender für eine neue Einladung.");
          return;
        }
      }

      // SCHRITT 6: Benutzer-Authentifizierung
      console.log("📋 Schritt 6: Benutzer-Authentifizierung");
      let user = null;
      
      try {
        user = await base44.auth.me();
        console.log("   User authentifiziert:", user.email);
        console.log("   User ID:", user.id);
      } catch (authError) {
        console.log("⚠️ Benutzer nicht eingeloggt");
        console.log("   Fehler:", authError.message);
        console.log("➡️ Weiterleitung zu Login mit Redirect...");
        
        // Nicht eingeloggt - zur Login-Seite mit Redirect zurück zu dieser Seite
        const currentUrl = window.location.href;
        base44.auth.redirectToLogin(currentUrl);
        return;
      }

      if (!user || !user.id) {
        console.error("❌ Keine User-Daten verfügbar!");
        setStatus("error");
        setMessage("Authentifizierungsfehler. Bitte melde dich erneut an.");
        
        setTimeout(() => {
          base44.auth.redirectToLogin(window.location.href);
        }, 2000);
        return;
      }

      // SCHRITT 7: Einladung akzeptieren - Mitglied aktualisieren
      console.log("📋 Schritt 7: Einladung akzeptieren");
      console.log("   Aktualisiere Mitglied ID:", mitglied.id);
      console.log("   Setze user_id auf:", user.id);
      console.log("   Setze status auf: aktiv");
      
      const updateData = {
        user_id: user.id,
        status: "aktiv",
        invite_token: null // Token löschen nach Verwendung
      };
      
      console.log("   Update-Daten:", updateData);

      try {
        const updatedMitglied = await base44.entities.Mitglied.update(mitglied.id, updateData);
        console.log("✅ Mitglied erfolgreich aktualisiert!");
        console.log("   Aktualisiertes Mitglied:", updatedMitglied);
      } catch (updateError) {
        console.error("❌ Fehler beim Aktualisieren des Mitglieds:", updateError);
        console.error("   Fehler-Details:", updateError.message);
        console.error("   Stack:", updateError.stack);
        throw updateError;
      }

      // SCHRITT 8: Erfolg!
      console.log("✅ === EINLADUNG ERFOLGREICH AKZEPTIERT ===");
      setStatus("success");
      setMessage(`Willkommen bei ${org.name}! Du wurdest erfolgreich als ${mitglied.rolle} hinzugefügt.`);

      // SCHRITT 9: Organisation setzen und weiterleiten
      console.log("📋 Schritt 9: Weiterleitung vorbereiten");
      console.log("   Setze currentOrgId:", mitglied.org_id);
      localStorage.setItem('currentOrgId', mitglied.org_id);

      // Nach 2 Sekunden zum Dashboard - mit vollständigem Reload
      setTimeout(() => {
        console.log("➡️ Weiterleitung zum Dashboard (voller Reload)...");
        window.location.href = createPageUrl("Dashboard");
      }, 2000);

    } catch (error) {
      console.error("❌ === KRITISCHER FEHLER ===");
      console.error("   Fehler:", error);
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
      
      setStatus("error");
      setMessage("Ein unerwarteter Fehler ist aufgetreten: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-none shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
              alt="Bandguru Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
          <CardTitle className="text-2xl">Einladung annehmen</CardTitle>
        </CardHeader>
        
        <CardContent className="text-center p-8">
          {status === "loading" && (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 mx-auto text-blue-600 animate-spin" />
              <p className="text-gray-600">Verarbeite Einladung...</p>
              <p className="text-sm text-gray-400">Bitte einen Moment Geduld</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">🎉 Erfolgreich!</h3>
                {organisation && (
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {organisation.name}
                  </p>
                )}
                <p className="text-gray-600">{message}</p>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Du wirst automatisch weitergeleitet...
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "already_accepted" && (
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <UserPlus className="w-12 h-12 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Bereits Mitglied</h3>
                <p className="text-gray-600 mb-4">{message}</p>
                <Button 
                  onClick={() => {
                    if (mitgliedschaft) {
                      localStorage.setItem('currentOrgId', mitgliedschaft.org_id);
                    }
                    window.location.href = createPageUrl("Dashboard");
                  }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                  Zum Dashboard
                </Button>
              </div>
            </div>
          )}

          {status === "expired" && (
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Einladung abgelaufen</h3>
                <p className="text-gray-600 mb-4">{message}</p>
                {organisation && (
                  <p className="text-sm text-gray-500">
                    Organisation: {organisation.name}
                  </p>
                )}
                <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-700">
                    Bitte kontaktiere den Band Manager für eine neue Einladung.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Fehler</h3>
                <p className="text-gray-600 mb-4">{message}</p>
                <div className="space-y-2">
                  <Button 
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="w-full"
                  >
                    Erneut versuchen
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => window.location.href = "/"}
                    className="w-full"
                  >
                    Zur Startseite
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}