import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, AlertCircle, Receipt, TrendingUp, TrendingDown, Euro, Users as UsersIcon } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function EventFinanzenTab({ isManager, eventMusiker, ausgaben, rechnungen, eventId }) {
  const navigate = useNavigate();

  if (!isManager) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold mb-2">Finanzen</h3>
          <p className="text-gray-500">Diese Ansicht ist nur für Manager verfügbar</p>
        </CardContent>
      </Card>
    );
  }

  const musikerKosten = eventMusiker.filter(em => em.status === 'zugesagt').reduce((sum, em) => {
    const weitereKosten = (em.weitere_kosten || []).reduce((s, k) => s + (k.betrag || 0), 0);
    return sum + (em.gage_netto || 0) + (em.spesen || 0) + weitereKosten;
  }, 0);

  const sonstigeAusgaben = ausgaben.reduce((sum, a) => sum + (a.betrag || 0), 0);
  const einnahmenBrutto = rechnungen.reduce((sum, r) => sum + (r.brutto_betrag || 0), 0);
  const einnahmenNetto = rechnungen.reduce((sum, r) => sum + (r.netto_betrag || 0), 0);
  const gewinn = einnahmenNetto - musikerKosten - sonstigeAusgaben;

  const statusColors = {
    entwurf: 'bg-gray-100 text-gray-700',
    versendet: 'bg-blue-100 text-blue-700',
    teilweise_bezahlt: 'bg-yellow-100 text-yellow-700',
    bezahlt: 'bg-green-100 text-green-700',
    überfällig: 'bg-red-100 text-red-700',
    storniert: 'bg-gray-100 text-gray-500'
  };

  return (
    <>
      {/* Finanz-Übersicht */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><UsersIcon className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Musiker-Kosten gesamt</p>
                <p className="text-lg font-bold text-gray-900">{musikerKosten.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><TrendingDown className="w-5 h-5 text-orange-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Sonstige Ausgaben</p>
                <p className="text-lg font-bold text-gray-900">{sonstigeAusgaben.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Rechnungen (brutto)</p>
                <p className="text-lg font-bold text-gray-900">{einnahmenBrutto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Euro className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Gewinn (netto)</p>
                <p className={`text-lg font-bold ${gewinn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {gewinn.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
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
                const total = (em.gage_netto || 0) + (em.spesen || 0) + ((em.weitere_kosten || []).reduce((s, k) => s + (k.betrag || 0), 0));
                return (
                  <div key={em.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-500 text-white text-sm">
                          {em.musiker_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{em.musiker_name || 'Unbekannt'}</p>
                        <p className="text-sm text-gray-500">{em.rolle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                      <p className="text-xs text-gray-500">
                        {em.spesen > 0 && `Fahrt: ${em.spesen?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                        {em.weitere_kosten?.length > 0 && (<>{em.spesen > 0 && ' + '}Weitere: {(em.weitere_kosten.reduce((s, k) => s + (k.betrag || 0), 0)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</>)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between pt-3 border-t mt-3">
                <p className="font-semibold">Gesamt Musiker-Kosten</p>
                <p className="font-bold text-lg">{musikerKosten.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
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
            <Button size="sm" onClick={() => navigate(`${createPageUrl('Rechnungen')}?event_id=${eventId}`)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />Rechnung erstellen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {rechnungen.length > 0 ? (
            <div className="space-y-3">
              {rechnungen.map((rechnung) => (
                <div key={rechnung.id} onClick={() => navigate(createPageUrl('Rechnungen'))}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div>
                    <p className="font-medium">{rechnung.rechnungsnummer}</p>
                    <p className="text-sm text-gray-500">{rechnung.rechnungsdatum && format(new Date(rechnung.rechnungsdatum), 'dd.MM.yyyy', { locale: de })}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={statusColors[rechnung.status] || 'bg-gray-100'}>{rechnung.status}</Badge>
                    <p className="font-semibold">{(rechnung.brutto_betrag || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-3">Noch keine Rechnungen für dieses Event</p>
              <Button size="sm" onClick={() => navigate(createPageUrl('Rechnungen'))} className="text-white" style={{ backgroundColor: '#223a5e' }}>
                <Plus className="w-4 h-4 mr-2" />Rechnung erstellen
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
            <Button size="sm" onClick={() => navigate(createPageUrl('Ausgaben'))} variant="outline">
              <Plus className="w-4 h-4 mr-2" />Ausgabe hinzufügen
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
                  <p className="font-semibold text-orange-600">-{(ausgabe.betrag || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t mt-3">
                <p className="font-semibold">Gesamt Ausgaben</p>
                <p className="font-bold text-lg text-orange-600">-{sonstigeAusgaben.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingDown className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-3">Noch keine Ausgaben für dieses Event</p>
              <Button size="sm" onClick={() => navigate(createPageUrl('Ausgaben'))} className="text-white" style={{ backgroundColor: '#223a5e' }}>
                <Plus className="w-4 h-4 mr-2" />Ausgabe hinzufügen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}