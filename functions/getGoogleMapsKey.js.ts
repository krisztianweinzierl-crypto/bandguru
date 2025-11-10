import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Prüfe ob User authentifiziert ist
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gib den Google Maps API-Schlüssel zurück
    const apiKey = Deno.env.get("Places_API");
    
    if (!apiKey) {
      return Response.json({ error: 'Google Maps API-Schlüssel nicht konfiguriert' }, { status: 500 });
    }

    return Response.json({ apiKey });
  } catch (error) {
    console.error('Fehler beim Abrufen des API-Schlüssels:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});