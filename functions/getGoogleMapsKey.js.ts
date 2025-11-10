import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Prüfe ob User authentifiziert ist
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hole API-Schlüssel aus Secrets
    const apiKey = Deno.env.get('Places_API');
    
    if (!apiKey) {
      return Response.json({ error: 'API Key nicht konfiguriert' }, { status: 500 });
    }

    return Response.json({ apiKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});