import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authentifizierung prüfen
        const user = await base44.auth.me();
        if (!user) {
            console.error('Unauthorized: No user found');
            return Response.json({ 
                success: false,
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        console.log('User authenticated:', user.email);

        // Request-Body parsen
        const { to, subject, body, from_name } = await req.json();

        console.log('Email request:', { to, subject, from_name });

        if (!to || !subject || !body) {
            console.error('Missing required fields');
            return Response.json({ 
                success: false,
                error: 'Missing required fields: to, subject, body' 
            }, { status: 400 });
        }

        // Mailgun API Credentials
        const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
        const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN');

        console.log('Mailgun config check:', {
            hasApiKey: !!MAILGUN_API_KEY,
            hasDomain: !!MAILGUN_DOMAIN,
            domain: MAILGUN_DOMAIN
        });

        if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
            console.error('Missing Mailgun credentials');
            return Response.json({ 
                success: false,
                error: 'Mailgun credentials not configured',
                details: {
                    hasApiKey: !!MAILGUN_API_KEY,
                    hasDomain: !!MAILGUN_DOMAIN
                }
            }, { status: 500 });
        }

        // Mailgun API Request
        const formData = new FormData();
        const fromEmail = from_name ? `${from_name} <noreply@${MAILGUN_DOMAIN}>` : `noreply@${MAILGUN_DOMAIN}`;
        
        formData.append('from', fromEmail);
        formData.append('to', to);
        formData.append('subject', subject);
        formData.append('text', body);

        console.log('Sending email via Mailgun EU to:', to);

        // EU Region API URL verwenden
        const mailgunUrl = `https://api.eu.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
        console.log('Mailgun URL (EU):', mailgunUrl);

        const mailgunResponse = await fetch(mailgunUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`api:${MAILGUN_API_KEY}`)
            },
            body: formData
        });

        console.log('Mailgun response status:', mailgunResponse.status);

        if (!mailgunResponse.ok) {
            const errorText = await mailgunResponse.text();
            console.error('Mailgun error:', errorText);
            return Response.json({ 
                success: false,
                error: 'Failed to send email via Mailgun',
                details: errorText,
                status: mailgunResponse.status
            }, { status: 500 });
        }

        const result = await mailgunResponse.json();
        console.log('Email sent successfully:', result.id);

        return Response.json({ 
            success: true,
            message: 'Email sent successfully',
            mailgun_id: result.id
        });

    } catch (error) {
        console.error('Error in sendEmail function:', error);
        return Response.json({ 
            success: false,
            error: error.message || 'Internal server error',
            stack: error.stack
        }, { status: 500 });
    }
});