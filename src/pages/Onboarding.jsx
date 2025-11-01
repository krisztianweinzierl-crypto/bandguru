import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Music, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orgData, setOrgData] = useState({
    name: "",
    adresse: "",
    steuernummer: "",
    waehrung: "EUR",
    zeitzone: "Europe/Berlin",
    primary_color: "#3B82F6"
  });

  useEffect(() => {
    checkUserAndOrg();
  }, []);

  const checkUserAndOrg = async () => {
    try {
      console.log("🔍 Onboarding: Checking user and organisation...");
      
      const userData = await base44.auth.me();
      
      if (!userData) {
        console.log("❌ No user found, redirecting to login");
        window.location.href = '/login';
        return;
      }

      console.log("✅ User found:", userData.email);
      setUser(userData);

      // Prüfe ob User bereits Mitglied einer Organisation ist
      const mitgliedschaften = await base44.entities.Mitglied.filter({ 
        user_id: userData.id
      });

      console.log("📋 Mitgliedschaften gefunden:", mitgliedschaften.length);

      if (mitgliedschaften.length > 0) {
        // User hat bereits eine Organisation - zum Dashboard
        console.log("✅ User hat bereits Organisation, redirect zu Dashboard");
        const orgId = mitgliedschaften[0].org_id;
        localStorage.setItem('currentOrgId', orgId);
        window.location.href = createPageUrl('Dashboard');
        return;
      }

      // User hat keine Organisation - Onboarding anzeigen
      console.log("ℹ️ Keine Organisation gefunden, zeige Onboarding");
      setIsLoading(false);
      
    } catch (error) {
      console.error("❌ Fehler beim Laden:", error);
      setIsLoading(false);
    }
  };

  const createOrgMutation = useMutation({
    mutationFn: async (data) => {
      console.log("🚀 Erstelle Organisation...");
      
      // 1. Organisation erstellen
      const org = await base44.entities.Organisation.create(data);
      console.log("✅ Organisation erstellt:", org.id);
      
      // 2. Mitgliedschaft erstellen
      await base44.entities.Mitglied.create({
        org_id: org.id,
        user_id: user.id,
        rolle: "Band Manager",
        status: "aktiv"
      });
      console.log("✅ Mitgliedschaft erstellt");
      
      return org;
    },
    onSuccess: (org) => {
      console.log("🎉 Onboarding erfolgreich abgeschlossen");
      localStorage.setItem('currentOrgId', org.id);
      // Harte Weiterleitung mit Reload
      window.location.href = createPageUrl('Dashboard');
    },
    onError: (error) => {
      console.error("❌ Fehler beim Erstellen der Organisation:", error);
      alert("Fehler beim Erstellen der Organisation. Bitte versuche es erneut.");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!orgData.name.trim()) {
      alert("Bitte gib einen Namen für deine Organisation ein");
      return;
    }

    createOrgMutation.mutate(orgData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
            alt="Bandguru Logo"
            className="w-24 h-24 mx-auto mb-4 animate-pulse"
          />
          <h2 className="text-2xl font-bold mb-2">Bandguru</h2>
          <p className="text-gray-600">Prüfe Zugang...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69022398b7641635d4b9d494/ee6dc0826_Buddha_Guitar_oHintergrund.png"
              alt="Bandguru Logo"
              className="w-16 h-16 object-contain"
            />
            <h1 className="text-4xl font-bold text-gray-900">Bandguru</h1>
          </div>
          <p className="text-xl text-gray-600">Willkommen! Lass uns deine Band einrichten.</p>
        </div>

        {/* Form */}
        <Card className="border-none shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <CardTitle className="text-xl">Deine Organisation erstellen</CardTitle>
            </div>
            <p className="text-sm text-blue-100 mt-1">
              Erstelle deine Band oder Organisation, um loszulegen
            </p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Band/Organisation Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Name deiner Band / Organisation *
                </Label>
                <Input
                  id="name"
                  value={orgData.name}
                  onChange={(e) => setOrgData({...orgData, name: e.target.value})}
                  placeholder="z.B. Die Fantastischen Vier"
                  className="text-lg"
                  required
                  autoFocus
                />
                <p className="text-sm text-gray-500">
                  Dies kann der Name deiner Band, Musikgruppe oder Organisation sein
                </p>
              </div>

              {/* Adresse */}
              <div className="space-y-2">
                <Label htmlFor="adresse" className="text-base font-semibold">
                  Adresse (optional)
                </Label>
                <Input
                  id="adresse"
                  value={orgData.adresse}
                  onChange={(e) => setOrgData({...orgData, adresse: e.target.value})}
                  placeholder="z.B. Musterstraße 123, 12345 Berlin"
                />
              </div>

              {/* Steuernummer */}
              <div className="space-y-2">
                <Label htmlFor="steuernummer" className="text-base font-semibold">
                  Steuernummer (optional)
                </Label>
                <Input
                  id="steuernummer"
                  value={orgData.steuernummer}
                  onChange={(e) => setOrgData({...orgData, steuernummer: e.target.value})}
                  placeholder="z.B. 12/345/67890"
                />
                <p className="text-sm text-gray-500">
                  Für Rechnungen und steuerliche Zwecke
                </p>
              </div>

              {/* Währung & Zeitzone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="waehrung" className="text-base font-semibold">
                    Währung
                  </Label>
                  <select
                    id="waehrung"
                    value={orgData.waehrung}
                    onChange={(e) => setOrgData({...orgData, waehrung: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="CHF">CHF (Fr.)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zeitzone" className="text-base font-semibold">
                    Zeitzone
                  </Label>
                  <select
                    id="zeitzone"
                    value={orgData.zeitzone}
                    onChange={(e) => setOrgData({...orgData, zeitzone: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="Europe/Berlin">Berlin (MEZ)</option>
                    <option value="Europe/Vienna">Wien (MEZ)</option>
                    <option value="Europe/Zurich">Zürich (MEZ)</option>
                    <option value="Europe/London">London (GMT)</option>
                  </select>
                </div>
              </div>

              {/* Brand Color */}
              <div className="space-y-2">
                <Label htmlFor="color" className="text-base font-semibold">
                  Primärfarbe (optional)
                </Label>
                <div className="flex gap-3 items-center">
                  <Input
                    id="color"
                    type="color"
                    value={orgData.primary_color}
                    onChange={(e) => setOrgData({...orgData, primary_color: e.target.value})}
                    className="w-20 h-12 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">
                    Diese Farbe wird in der App für deine Organisation verwendet
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                disabled={createOrgMutation.isPending}
              >
                {createOrgMutation.isPending ? (
                  "Organisation wird erstellt..."
                ) : (
                  <>
                    Organisation erstellen
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Du kannst später weitere Mitglieder zu deiner Organisation einladen
        </p>
      </div>
    </div>
  );
}