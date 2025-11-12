import { createClient } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const vertragId = url.searchParams.get('id');
    
    // Base44 Client als Service Role (Admin-Rechte)
    const base44 = createClient(
      Deno.env.get("BASE44_APP_ID"),
      Deno.env.get("BASE44_SERVICE_ROLE_KEY")
    );

    // Wenn es ein POST-Request ist (API-Call für Daten oder Update)
    if (req.method === 'POST') {
      const body = await req.json();
      const kundenEmail = body.kundenEmail;
      
      if (!vertragId) {
        return Response.json({ error: 'Keine Vertrags-ID angegeben' }, { status: 400 });
      }

      // Update: Unterschrift speichern
      if (body.unterschrift_kunde !== undefined) {
        if (!kundenEmail) {
          return Response.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
        }

        const vertraege = await base44.entities.Vertrag.filter({ id: vertragId });
        const vertrag = vertraege[0];

        if (!vertrag || !vertrag.im_kundenportal_sichtbar) {
          return Response.json({ error: 'Vertrag nicht verfügbar' }, { status: 403 });
        }

        // Kunde laden und E-Mail prüfen
        let kunde = null;
        if (vertrag.kunde_id) {
          const kunden = await base44.entities.Kunde.filter({ id: vertrag.kunde_id });
          kunde = kunden[0];
        }

        if (!kunde || kunde.email?.toLowerCase().trim() !== kundenEmail.toLowerCase().trim()) {
          return Response.json({ error: 'E-Mail-Adresse stimmt nicht überein' }, { status: 403 });
        }

        const updateData = {
          unterschrift_kunde: body.unterschrift_kunde,
          unterschrift_kunde_name: body.unterschrift_kunde_name,
          unterschrift_kunde_datum: body.unterschrift_kunde_datum
        };

        if (vertrag.unterschrift_organisation && body.unterschrift_kunde) {
          updateData.status = 'unterzeichnet';
        }

        const updatedVertrag = await base44.entities.Vertrag.update(vertragId, updateData);
        return Response.json({ success: true, vertrag: updatedVertrag });
      }

      // GET via POST: Vertrag abrufen mit E-Mail-Verifizierung
      if (!kundenEmail) {
        return Response.json({ error: 'E-Mail-Adresse erforderlich', needsEmail: true }, { status: 400 });
      }

      const vertraege = await base44.entities.Vertrag.filter({ id: vertragId });
      const vertrag = vertraege[0];

      if (!vertrag || !vertrag.im_kundenportal_sichtbar) {
        return Response.json({ error: 'Vertrag nicht verfügbar' }, { status: 403 });
      }

      let kunde = null;
      if (vertrag.kunde_id) {
        const kunden = await base44.entities.Kunde.filter({ id: vertrag.kunde_id });
        kunde = kunden[0] || null;
      }

      if (!kunde || kunde.email?.toLowerCase().trim() !== kundenEmail.toLowerCase().trim()) {
        return Response.json({ error: 'E-Mail-Adresse stimmt nicht überein' }, { status: 403 });
      }

      let event = null;
      if (vertrag.event_id) {
        const events = await base44.entities.Event.filter({ id: vertrag.event_id });
        event = events[0] || null;
      }

      let organisation = null;
      if (vertrag.org_id) {
        const orgs = await base44.entities.Organisation.filter({ id: vertrag.org_id });
        organisation = orgs[0] || null;
      }

      return Response.json({
        success: true,
        vertrag,
        kunde,
        event,
        organisation
      });
    }

    // GET-Request: HTML-Seite zurückgeben
    if (!vertragId) {
      return new Response(renderErrorPage('Keine Vertrags-ID angegeben'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // Vertrag laden für initiale Anzeige (ohne E-Mail-Check)
    const vertraege = await base44.entities.Vertrag.filter({ id: vertragId });
    const vertrag = vertraege[0];

    if (!vertrag) {
      return new Response(renderErrorPage('Vertrag nicht gefunden'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (!vertrag.im_kundenportal_sichtbar) {
      return new Response(renderErrorPage('Dieser Vertrag ist nicht verfügbar'), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // Organisation für Logo/Branding laden
    let organisation = null;
    if (vertrag.org_id) {
      const orgs = await base44.entities.Organisation.filter({ id: vertrag.org_id });
      organisation = orgs[0] || null;
    }

    // HTML-Seite mit E-Mail-Verifizierung rendern
    return new Response(renderVertragPage(vertrag, organisation), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error) {
    console.error('Fehler in vertragsKundenansicht:', error);
    return new Response(renderErrorPage('Interner Serverfehler: ' + error.message), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
});

function renderErrorPage(message) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fehler - Bandguru</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f5f3ff 0%, #ffffff 50%, #fce7f3 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .error-card {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      padding: 3rem;
      max-width: 500px;
      text-align: center;
    }
    .error-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      background: #fee2e2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }
    h1 { color: #1f2937; font-size: 1.5rem; margin-bottom: 1rem; }
    p { color: #6b7280; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="error-card">
    <div class="error-icon">⚠️</div>
    <h1>Fehler</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

function renderVertragPage(vertrag, organisation) {
  const primaryColor = organisation?.primary_color || '#8b5cf6';
  const orgName = organisation?.name || 'Bandguru';
  
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${vertrag.titel} - ${orgName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f5f3ff 0%, #ffffff 50%, #fce7f3 100%);
      min-height: 100vh;
      padding: 2rem 1rem;
      line-height: 1.6;
      color: #1f2937;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .card {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      margin-bottom: 1.5rem;
    }
    .card-header {
      background: linear-gradient(135deg, ${primaryColor} 0%, #ec4899 100%);
      color: white;
      padding: 2rem;
    }
    .card-header h1 { font-size: 1.875rem; margin-bottom: 0.5rem; }
    .card-header p { opacity: 0.9; font-size: 0.875rem; }
    .card-body { padding: 2rem; }
    .form-group { margin-bottom: 1.5rem; }
    .form-label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #374151;
    }
    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      font-size: 1rem;
      transition: all 0.2s;
    }
    .form-input:focus {
      outline: none;
      border-color: ${primaryColor};
      box-shadow: 0 0 0 3px ${primaryColor}33;
    }
    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-primary {
      background: linear-gradient(135deg, ${primaryColor} 0%, #ec4899 100%);
      color: white;
      width: 100%;
      justify-content: center;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }
    .btn-secondary:hover { background: #e5e7eb; }
    .error-message {
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: start;
      gap: 0.5rem;
    }
    .success-message {
      background: #d1fae5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: start;
      gap: 0.5rem;
    }
    .info-box {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      padding: 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: #1e40af;
      margin-bottom: 1.5rem;
    }
    .loader {
      border: 3px solid #f3f4f6;
      border-top: 3px solid ${primaryColor};
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
      display: inline-block;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .hidden { display: none !important; }
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .status-versendet { background: #dbeafe; color: #1e40af; }
    .status-unterzeichnet { background: #d1fae5; color: #065f46; }
    .canvas-container {
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      background: white;
      cursor: crosshair;
      touch-action: none;
    }
    .signature-preview {
      border: 2px solid #d1fae5;
      border-radius: 0.5rem;
      padding: 1rem;
      background: #f0fdf4;
    }
    .signature-preview img {
      max-width: 100%;
      height: auto;
      background: white;
      padding: 0.5rem;
      border-radius: 0.25rem;
    }
    .content-box { line-height: 1.8; }
    .content-box h1, .content-box h2, .content-box h3 { margin: 1.5rem 0 1rem; }
    .content-box p { margin-bottom: 1rem; }
    .event-info {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .event-info h3 { color: #1e40af; margin-bottom: 0.75rem; }
    .event-info-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header Card -->
    <div class="card">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
          <div style="width: 3rem; height: 3rem; background: rgba(255,255,255,0.2); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold;">
            ${orgName[0]?.toUpperCase() || 'B'}
          </div>
          <div>
            <h1>${orgName}</h1>
            <p>Kundenportal</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Email Verification Section -->
    <div id="emailVerification" class="card">
      <div class="card-header">
        <h1>🔒 Vertrag anzeigen</h1>
        <p>Verifizierung erforderlich</p>
      </div>
      <div class="card-body">
        <div id="emailError" class="error-message hidden">
          <span>❌</span>
          <span id="emailErrorText"></span>
        </div>
        
        <div class="form-group">
          <label class="form-label">Bitte geben Sie Ihre E-Mail-Adresse ein</label>
          <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 1rem;">
            Um den Vertrag anzuzeigen, bestätigen Sie bitte Ihre E-Mail-Adresse, die bei uns hinterlegt ist.
          </p>
          <input 
            type="email" 
            id="emailInput" 
            class="form-input" 
            placeholder="ihre.email@beispiel.de"
            required
          />
        </div>

        <button onclick="verifyEmail()" id="verifyBtn" class="btn btn-primary">
          <span id="verifyBtnText">✓ Vertrag anzeigen</span>
          <span id="verifyBtnLoader" class="loader hidden"></span>
        </button>

        <div class="info-box" style="margin-top: 1.5rem;">
          🔒 Ihre Daten sind sicher. Diese Verifizierung dient ausschließlich dazu, sicherzustellen, dass Sie berechtigt sind, diesen Vertrag einzusehen.
        </div>
      </div>
    </div>

    <!-- Contract Content (hidden initially) -->
    <div id="contractContent" class="hidden">
      <!-- Contract Details Card -->
      <div class="card">
        <div class="card-header">
          <h1>${vertrag.titel}</h1>
          ${vertrag.vertragsnummer ? `<p>${vertrag.vertragsnummer}</p>` : ''}
          <span class="status-badge status-${vertrag.status}" style="margin-top: 0.5rem; display: inline-block;">
            ${vertrag.status === 'unterzeichnet' ? '✓ Unterzeichnet' : 
              vertrag.status === 'versendet' ? '📧 Versendet' : 
              vertrag.status}
          </span>
        </div>
      </div>

      <!-- Contract Body Card -->
      <div class="card">
        <div class="card-header" style="background: #f9fafb; color: #1f2937; border-bottom: 1px solid #e5e7eb;">
          <h2 style="font-size: 1.25rem;">Vertragsinhalt</h2>
        </div>
        <div class="card-body">
          <div id="eventInfo"></div>
          <div class="content-box" id="contractBody"></div>
        </div>
      </div>

      <!-- Signature Card -->
      <div class="card">
        <div class="card-header" style="background: #f9fafb; color: #1f2937; border-bottom: 1px solid #e5e7eb;">
          <h2 style="font-size: 1.25rem;">Ihre Unterschrift</h2>
        </div>
        <div class="card-body">
          <div id="signatureSection"></div>
        </div>
      </div>

      <!-- Contact Card -->
      <div class="card">
        <div class="card-body" style="text-align: center; color: #6b7280;">
          <p>Bei Fragen wenden Sie sich bitte an:</p>
          <p style="font-weight: 600; color: #1f2937; margin-top: 0.5rem;">${orgName}</p>
          ${organisation?.adresse ? `<p style="font-size: 0.875rem;">${organisation.adresse}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Signature Modal -->
    <div id="signatureModal" class="hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 50;">
      <div class="card" style="max-width: 700px; width: 100%; margin: 0;">
        <div class="card-header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2 style="font-size: 1.25rem;">Vertrag unterschreiben</h2>
            <button onclick="closeSignatureModal()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 0; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center;">×</button>
          </div>
        </div>
        <div class="card-body">
          <div id="signatureError" class="error-message hidden">
            <span>❌</span>
            <span id="signatureErrorText"></span>
          </div>

          <div class="form-group">
            <label class="form-label">Ihr vollständiger Name *</label>
            <input type="text" id="signatureName" class="form-input" placeholder="z.B. Max Mustermann" />
          </div>

          <div class="form-group">
            <label class="form-label">Ihre Unterschrift</label>
            <canvas 
              id="signatureCanvas" 
              width="600" 
              height="200" 
              class="canvas-container"
              style="width: 100%; height: auto;"
            ></canvas>
            <p style="font-size: 0.75rem; color: #6b7280; margin-top: 0.5rem;">
              Zeichnen Sie Ihre Unterschrift mit der Maus oder dem Touchpad
            </p>
          </div>

          <div class="info-box">
            Mit Ihrer Unterschrift bestätigen Sie, dass Sie den Vertrag gelesen haben und mit den Bedingungen einverstanden sind.
          </div>

          <div style="display: flex; justify-content: space-between; gap: 1rem; margin-top: 1.5rem;">
            <button onclick="clearSignature()" class="btn btn-secondary">
              🗑️ Löschen
            </button>
            <div style="display: flex; gap: 0.5rem;">
              <button onclick="closeSignatureModal()" class="btn btn-secondary">
                Abbrechen
              </button>
              <button onclick="saveSignature()" id="saveSignatureBtn" class="btn btn-primary" style="width: auto;">
                <span id="saveSignatureBtnText">✓ Unterschrift speichern</span>
                <span id="saveSignatureBtnLoader" class="loader hidden"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vertragId = '${vertrag.id}';
    let verifiedEmail = '';
    let contractData = null;
    let canvas, ctx;
    let isDrawing = false;

    // Initialize canvas
    function initCanvas() {
      canvas = document.getElementById('signatureCanvas');
      if (!canvas) return;
      
      ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Mouse events
      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseleave', stopDrawing);

      // Touch events for mobile
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', stopDrawing);
    }

    function handleTouchStart(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
      isDrawing = true;
    }

    function handleTouchMove(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    function startDrawing(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
      isDrawing = true;
    }

    function draw(e) {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    function stopDrawing() {
      isDrawing = false;
    }

    function clearSignature() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    async function verifyEmail() {
      const email = document.getElementById('emailInput').value.trim();
      if (!email) {
        showError('emailError', 'Bitte geben Sie Ihre E-Mail-Adresse ein');
        return;
      }

      setLoading('verifyBtn', true);
      hideError('emailError');

      try {
        const response = await fetch(window.location.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vertragId, kundenEmail: email })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'E-Mail-Adresse stimmt nicht überein');
        }

        verifiedEmail = email;
        contractData = data;
        
        // Hide verification, show contract
        document.getElementById('emailVerification').classList.add('hidden');
        document.getElementById('contractContent').classList.remove('hidden');
        
        // Render contract details
        renderContract(data);
        
      } catch (error) {
        showError('emailError', error.message);
      } finally {
        setLoading('verifyBtn', false);
      }
    }

    function renderContract(data) {
      const { vertrag, event, organisation } = data;

      // Render event info if available
      if (vertrag.eventinformationen_anzeigen && event) {
        const eventDate = new Date(event.datum_von);
        document.getElementById('eventInfo').innerHTML = \`
          <div class="event-info">
            <h3>Event-Details</h3>
            <div class="event-info-item">
              📅 \${eventDate.toLocaleDateString('de-DE', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })} Uhr
            </div>
            \${event.ort_name ? \`<div class="event-info-item">📍 \${event.ort_name}</div>\` : ''}
            \${event.ort_adresse ? \`<div class="event-info-item">📍 \${event.ort_adresse}</div>\` : ''}
          </div>
        \`;
      }

      // Render contract body
      document.getElementById('contractBody').innerHTML = vertrag.inhalt || '';

      // Render signature section
      renderSignatureSection(vertrag);
    }

    function renderSignatureSection(vertrag) {
      const section = document.getElementById('signatureSection');
      
      if (vertrag.unterschrift_kunde) {
        const signDate = new Date(vertrag.unterschrift_kunde_datum);
        section.innerHTML = \`
          <div class="signature-preview">
            <div style="display: flex; align-items: start; gap: 1rem;">
              <div style="font-size: 2rem;">✓</div>
              <div style="flex: 1;">
                <h3 style="color: #065f46; margin-bottom: 1rem;">Vertrag wurde unterzeichnet</h3>
                <img src="\${vertrag.unterschrift_kunde}" alt="Ihre Unterschrift" style="max-width: 400px; width: 100%; height: 120px; object-fit: contain; margin-bottom: 1rem; background: white; padding: 0.5rem; border-radius: 0.25rem;" />
                <p style="font-weight: 600; color: #1f2937;">\${vertrag.unterschrift_kunde_name}</p>
                <p style="color: #6b7280; font-size: 0.875rem;">\${signDate.toLocaleDateString('de-DE')} \${signDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
              </div>
            </div>
          </div>
        \`;
      } else {
        section.innerHTML = \`
          <div style="text-align: center; padding: 2rem 0;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">✍️</div>
            <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Bitte unterschreiben Sie den Vertrag</h3>
            \${vertrag.unterzeichnen_bis ? \`
              <p style="color: #6b7280; margin-bottom: 1.5rem;">
                Bitte unterzeichnen Sie bis zum \${new Date(vertrag.unterzeichnen_bis).toLocaleDateString('de-DE')}
              </p>
            \` : ''}
            <button onclick="openSignatureModal()" class="btn btn-primary" style="margin: 0 auto;">
              ✍️ Jetzt unterschreiben
            </button>
          </div>
        \`;
      }
    }

    function openSignatureModal() {
      document.getElementById('signatureModal').classList.remove('hidden');
      setTimeout(() => initCanvas(), 100);
    }

    function closeSignatureModal() {
      document.getElementById('signatureModal').classList.add('hidden');
      document.getElementById('signatureName').value = '';
      if (canvas) clearSignature();
      hideError('signatureError');
    }

    async function saveSignature() {
      const name = document.getElementById('signatureName').value.trim();
      if (!name) {
        showError('signatureError', 'Bitte geben Sie Ihren Namen ein');
        return;
      }

      const signatureData = canvas.toDataURL('image/png');
      
      setLoading('saveSignatureBtn', true);
      hideError('signatureError');

      try {
        const response = await fetch(window.location.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vertragId,
            kundenEmail: verifiedEmail,
            unterschrift_kunde: signatureData,
            unterschrift_kunde_name: name,
            unterschrift_kunde_datum: new Date().toISOString()
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Fehler beim Speichern der Unterschrift');
        }

        // Success!
        alert('✅ Vielen Dank! Ihre Unterschrift wurde gespeichert.');
        closeSignatureModal();
        
        // Reload contract data
        const refreshResponse = await fetch(window.location.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vertragId, kundenEmail: verifiedEmail })
        });
        const refreshData = await refreshResponse.json();
        renderContract(refreshData);
        
      } catch (error) {
        showError('signatureError', error.message);
      } finally {
        setLoading('saveSignatureBtn', false);
      }
    }

    function showError(elementId, message) {
      const errorDiv = document.getElementById(elementId);
      const errorText = document.getElementById(elementId + 'Text');
      if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
      }
    }

    function hideError(elementId) {
      const errorDiv = document.getElementById(elementId);
      if (errorDiv) {
        errorDiv.classList.add('hidden');
      }
    }

    function setLoading(buttonId, isLoading) {
      const btn = document.getElementById(buttonId);
      const text = document.getElementById(buttonId + 'Text');
      const loader = document.getElementById(buttonId + 'Loader');
      
      if (btn && text && loader) {
        btn.disabled = isLoading;
        if (isLoading) {
          text.classList.add('hidden');
          loader.classList.remove('hidden');
        } else {
          text.classList.remove('hidden');
          loader.classList.add('hidden');
        }
      }
    }

    // Handle Enter key in email input
    document.getElementById('emailInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifyEmail();
      }
    });
  </script>
</body>
</html>`;
}