Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get("PLACES_API");
    
    if (!apiKey) {
      return Response.json(
        { error: "Google Maps API Key nicht konfiguriert" },
        { status: 500 }
      );
    }

    return Response.json({ apiKey });
  } catch (error) {
    console.error("Fehler beim Abrufen des API-Keys:", error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});