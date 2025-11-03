import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Mail, Phone, Music, Languages, Globe, Save, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MusikerProfilPage() {
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMusiker, setCurrentMusiker] = useState(null);
  const [loadingState, setLoadingState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    telefon: "",
    instrumente: [],
    genre: [],
    sprachen: [],
    buchungsbedingungen: "",
    reisespesen_regeln: "",
    notfallkontakt: ""
  });

  const [instrumentInput, setInstrumentInput] = useState("");
  const [genreInput, setGenreInput] = useState("");
  const [spracheInput, setSpracheInput] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoadingState("loading");
        
        const orgId = localStorage.getItem('currentOrgId');
        setCurrentOrgId(orgId);
        
        if (!orgId) {
          setErrorMessage("Keine Organisation gefunden.");
          setLoadingState("error");
          return;
        }

        const user = await base44.auth.me();
        setCurrentUser(user);

        // Lade Mitgliedschaft
        const mitgliedschaften = await base44.entities.Mitglied.filter({ 
          org_id: orgId,
          user_id: user.id,
          status: "aktiv",
          rolle: "Musiker"
        });

        if (mitgliedschaften.length === 0) {
          setErrorMessage("Du bist kein Musiker in dieser Organisation.");
          setLoadingState("error");
          return;
        }

        // Lade ALLE Musiker der Organisation
        const alleMusiker = await base44.entities.Musiker.filter({ 
          org_id: orgId
        });

        // Finde Musiker-Profil
        let gefundenerMusiker = null;

        // Methode 1: Über musiker_id in Mitgliedschaft
        if (mitgliedschaften[0].musiker_id) {
          const musikerById = await base44.entities.Musiker.filter({ 
            id: mitgliedschaften[0].musiker_id
          });
          
          if (musikerById.length > 0) {
            gefundenerMusiker = musikerById[0];
          }
        }

        // Methode 2: Case-insensitive E-Mail-Suche
        if (!gefundenerMusiker) {
          gefundenerMusiker = alleMusiker.find(m => 
            m.email?.toLowerCase().trim() === user.email.toLowerCase().trim() && 
            m.aktiv === true
          );
          
          // Repariere Mitgliedschaft
          if (gefundenerMusiker && !mitgliedschaften[0].musiker_id) {
            await base44.entities.Mitglied.update(mitgliedschaften[0].id, {
              musiker_id: gefundenerMusiker.id
            });
          }
        }

        if (gefundenerMusiker) {
          setCurrentMusiker(gefundenerMusiker);
          setFormData({
            name: gefundenerMusiker.name || "",
            email: gefundenerMusiker.email || "",
            telefon: gefundenerMusiker.telefon || "",
            instrumente: gefundenerMusiker.instrumente || [],
            genre: gefundenerMusiker.genre || [],
            sprachen: gefundenerMusiker.sprachen || [],
            buchungsbedingungen: gefundenerMusiker.buchungsbedingungen || "",
            reisespesen_regeln: gefundenerMusiker.reisespesen_regeln || "",
            notfallkontakt: gefundenerMusiker.notfallkontakt || ""
          });
          setLoadingState("success");
        } else {
          setErrorMessage("Kein Musiker-Profil für deine E-Mail-Adresse gefunden.");
          setLoadingState("no_profile");
        }

      } catch (error) {
        console.error("Fehler beim Laden:", error);
        setErrorMessage("Fehler beim Laden: " + error.message);
        setLoadingState("error");
      }
    };
    loadUser();
  }, []);

  const updateMusikerMutation = useMutation({
    mutationFn: (data) => base44.entities.Musiker.update(currentMusiker.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musiker'] });
      setHasChanges(false);
      alert("✅ Profil erfolgreich aktualisiert!");
    },
    onError: (error) => {
      alert("❌ Fehler beim Speichern: " + error.message);
    }
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const addItem = (field, value, setter) => {
    if (value.trim()) {
      handleChange(field, [...formData[field], value.trim()]);
      setter("");
    }
  };

  const removeItem = (field, index) => {
    handleChange(field, formData[field].filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMusikerMutation.mutate(formData);
  };

  if (loadingState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Music className="w-16 h-16 mx-auto mb-4 text-purple-500 animate-pulse" />
            <h3 className="text-lg font-semibold mb-2">Lade Profil...</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingState === "error" || loadingState === "no_profile") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-2xl w-full border-l-4 border-l-orange-500">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
              <h3 className="text-xl font-bold mb-2">Profil nicht verfügbar</h3>
            </div>
            
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>

            <div className="mt-6 text-center">
              <Button onClick={() => window.location.reload()} variant="outline">
                Seite neu laden
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Mein Musiker-Profil
          </h1>
          <p className="text-gray-600">Bearbeite deine persönlichen Informationen</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-none shadow-lg mb-6">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                <CardTitle>Persönliche Informationen</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name / Künstlername *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="z.B. Max Mustermann"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="max@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefon">Telefon</Label>
                  <Input
                    id="telefon"
                    value={formData.telefon}
                    onChange={(e) => handleChange('telefon', e.target.value)}
                    placeholder="+49 123 456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notfallkontakt">Notfallkontakt</Label>
                  <Input
                    id="notfallkontakt"
                    value={formData.notfallkontakt}
                    onChange={(e) => handleChange('notfallkontakt', e.target.value)}
                    placeholder="Name und Telefon"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg mb-6">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-purple-600" />
                <CardTitle>Musikalische Fähigkeiten</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label>Instrumente</Label>
                <div className="flex gap-2">
                  <Input
                    value={instrumentInput}
                    onChange={(e) => setInstrumentInput(e.target.value)}
                    placeholder="z.B. Gitarre"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('instrumente', instrumentInput, setInstrumentInput))}
                  />
                  <Button 
                    type="button" 
                    onClick={() => addItem('instrumente', instrumentInput, setInstrumentInput)}
                    variant="outline"
                  >
                    Hinzufügen
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.instrumente.map((instrument, i) => (
                    <Badge key={i} variant="secondary" className="text-sm">
                      {instrument}
                      <button
                        type="button"
                        onClick={() => removeItem('instrumente', i)}
                        className="ml-2 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Genres</Label>
                <div className="flex gap-2">
                  <Input
                    value={genreInput}
                    onChange={(e) => setGenreInput(e.target.value)}
                    placeholder="z.B. Jazz"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('genre', genreInput, setGenreInput))}
                  />
                  <Button 
                    type="button" 
                    onClick={() => addItem('genre', genreInput, setGenreInput)}
                    variant="outline"
                  >
                    Hinzufügen
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.genre.map((g, i) => (
                    <Badge key={i} variant="secondary" className="text-sm">
                      {g}
                      <button
                        type="button"
                        onClick={() => removeItem('genre', i)}
                        className="ml-2 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sprachen</Label>
                <div className="flex gap-2">
                  <Input
                    value={spracheInput}
                    onChange={(e) => setSpracheInput(e.target.value)}
                    placeholder="z.B. Deutsch"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('sprachen', spracheInput, setSpracheInput))}
                  />
                  <Button 
                    type="button" 
                    onClick={() => addItem('sprachen', spracheInput, setSpracheInput)}
                    variant="outline"
                  >
                    Hinzufügen
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.sprachen.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-sm">
                      {s}
                      <button
                        type="button"
                        onClick={() => removeItem('sprachen', i)}
                        className="ml-2 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg mb-6">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" />
                <CardTitle>Buchungsinformationen</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="buchungsbedingungen">Buchungsbedingungen</Label>
                <Textarea
                  id="buchungsbedingungen"
                  value={formData.buchungsbedingungen}
                  onChange={(e) => handleChange('buchungsbedingungen', e.target.value)}
                  placeholder="z.B. Mindestvorlauf 2 Wochen, Anreise ab 50km extra..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reisespesen">Reisespesen-Regeln</Label>
                <Textarea
                  id="reisespesen"
                  value={formData.reisespesen_regeln}
                  onChange={(e) => handleChange('reisespesen_regeln', e.target.value)}
                  placeholder="z.B. 0,30€/km ab 50km..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={!hasChanges || updateMusikerMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMusikerMutation.isPending ? "Speichere..." : "Änderungen speichern"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}