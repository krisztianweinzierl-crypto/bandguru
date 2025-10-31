import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authentifizierung prüfen
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Request-Body parsen
        const { to, subject, body, from_name } = await req.json();

        if (!to || !subject || !body) {
            return Response.json({ 
                error: 'Missing required fields: to, subject, body' 
            }, { status: 400 });
        }

        // Mailgun API Credentials
        const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
        const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN');

        if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
            return Response.json({ 
                error: 'Mailgun credentials not configured' 
            }, { status: 500 });
        }

        // Mailgun API Request
        const formData = new FormData();
        formData.append('from', from_name ? `${from_name} <noreply@${MAILGUN_DOMAIN}>` : `noreply@${MAILGUN_DOMAIN}`);
        formData.append('to', to);
        formData.append('subject', subject);
        formData.append('text', body);

        const mailgunResponse = await fetch(
            `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + btoa(`api:${MAILGUN_API_KEY}`)
                },
                body: formData
            }
        );

        if (!mailgunResponse.ok) {
            const errorText = await mailgunResponse.text();
            console.error('Mailgun error:', errorText);
            return Response.json({ 
                error: 'Failed to send email via Mailgun',
                details: errorText
            }, { status: 500 });
        }

        const result = await mailgunResponse.json();

        return Response.json({ 
            success: true,
            message: 'Email sent successfully',
            mailgun_id: result.id
        });

    } catch (error) {
        console.error('Error in sendEmail function:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});