import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body, from_name } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      return Response.json({ error: 'Mailgun not configured' }, { status: 500 });
    }

    const fromAddress = from_name 
      ? `${from_name} <noreply@${MAILGUN_DOMAIN}>`
      : `Bandguru <noreply@${MAILGUN_DOMAIN}>`;

    const formData = new FormData();
    formData.append('from', fromAddress);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('text', body);

    const response = await fetch(`https://api.eu.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`api:${MAILGUN_API_KEY}`)
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mailgun error:", errorText);
      return Response.json({ error: 'Failed to send email', details: errorText }, { status: 500 });
    }

    const result = await response.json();
    return Response.json({ success: true, message_id: result.id });

  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});