import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle, XCircle, Loader2, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading, success, error, expired, already_accepted
  const [message, setMessage] = useState("");
  const [organisation, setOrganisation] = useState(null);
  const [mitgliedschaft, setMitgliedschaft] = useState(null);

  useEffect(() => {
    handleInviteAcceptance();
  }, []);

  const handleInviteAcceptance = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setStatus("error");
        setMessage("Kein Einladungs-Token gefunden. Bitte überprüfe den Link.");
        return;
      }

      // Token validieren
      const mitglieder = await base44.entities.Mitglied.filter({ 
        invite_token: token 
      });

      if (mitglieder.length === 0) {
        setStatus("error");
        setMessage("Ungültiger Einladungs-Link. Dieser Link existiert nicht.");
        return;
      }

      const mitglied = mitglieder[0];
      setMitgliedschaft(mitglied);

      // Organisation laden
      const orgs = await base44.entities.Organisation.filter({ id: mitglied.org_id });
      setOrganisation(orgs[0]);

      // Prüfen ob bereits akzeptiert
      if (mitglied.status === "aktiv") {
        setStatus("already_accepted");
        setMessage("Diese Einladung wurde bereits akzeptiert.");
        return;
      }

      // Prüfen ob abgelaufen
      if (mitglied.invite_expires_at && new Date(mitglied.invite_expires_at) < new Date()) {
        setStatus("expired");
        setMessage("Diese Einladung ist abgelaufen. Bitte kontaktiere den Absender für eine neue Einladung.");
        return;
      }

      // Benutzer authentifizieren
      let user = null;
      try {
        user = await base44.auth.me();
      } catch (e) {
        // Nicht eingeloggt - zur Login-Seite mit Redirect
        const currentUrl = window.location.href;
        base44.auth.redirectToLogin(currentUrl);
        return;
      }

      // Einladung akzeptieren
      await base44.entities.Mitglied.update(mitglied.id, {
        user_id: user.id,
        status: "aktiv",
        invite_token: null // Token löschen nach Verwendung
      });

      setStatus("success");
      setMessage(`Willkommen bei ${orgs[0].name}! Du wurdest erfolgreich als ${mitglied.rolle} hinzugefügt.`);

      // Nach 3 Sekunden zum Dashboard
      setTimeout(() => {
        localStorage.setItem('currentOrgId', mitglied.org_id);
        window.location.href = createPageUrl("Dashboard");
      }, 3000);

    } catch (error) {
      console.error("Fehler beim Akzeptieren der Einladung:", error);
      setStatus("error");
      setMessage("Ein Fehler ist aufgetreten: " + error.message);
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
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Erfolgreich!</h3>
                {organisation && (
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {organisation.name}
                  </p>
                )}
                <p className="text-gray-600">{message}</p>
                <p className="text-sm text-gray-500 mt-4">Du wirst automatisch weitergeleitet...</p>
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
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = "/"}
                >
                  Zur Startseite
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}