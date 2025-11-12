import { createClient } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClient(
    Deno.env.get("BASE44_APP_ID"),
    Deno.env.get("BASE44_SERVICE_ROLE_KEY")
  );

  try {
    const url = new URL(req.url);
    const vertragId = url.searchParams.get('id');
    
    // POST-Request: API-Call für Verifizierung oder Update
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
      return new Response(getErrorHTML('Keine Vertrags-ID angegeben'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const vertraege = await base44.entities.Vertrag.filter({ id: vertragId });
    const vertrag = vertraege[0];

    if (!vertrag) {
      return new Response(getErrorHTML('Vertrag nicht gefunden'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (!vertrag.im_kundenportal_sichtbar) {
      return new Response(getErrorHTML('Dieser Vertrag ist nicht verfügbar'), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    let organisation = null;
    if (vertrag.org_id) {
      const orgs = await base44.entities.Organisation.filter({ id: vertrag.org_id });
      organisation = orgs[0] || null;
    }

    return new Response(getContractHTML(vertrag, organisation, vertragId), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error) {
    console.error('Fehler:', error);
    return new Response(getErrorHTML('Interner Serverfehler: ' + error.message), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
});

function getErrorHTML(message) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fehler - Bandguru</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #f5f3ff 0%, #fff 50%, #fce7f3 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      margin: 0;
    }
    .error-card {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
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
  </style>
</head>
<body>
  <div class="error-card">
    <div class="error-icon">⚠️</div>
    <h1>${message}</h1>
  </div>
</body>
</html>`;
}

function getContractHTML(vertrag, organisation, vertragId) {
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
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #f5f3ff 0%, #fff 50%, #fce7f3 100%);
      min-height: 100vh;
      padding: 2rem 1rem;
      color: #1f2937;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .card {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .card-header {
      background: linear-gradient(135deg, ${primaryColor}, #ec4899);
      color: white;
      padding: 2rem;
    }
    .card-body { padding: 2rem; }
    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      font-size: 1rem;
    }
    .form-input:focus {
      outline: none;
      border-color: ${primaryColor};
      box-shadow: 0 0 0 3px rgba(139,92,246,0.2);
    }
    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, ${primaryColor}, #ec4899);
      color: white;
      width: 100%;
    }
    .btn-primary:hover { transform: translateY(-2px); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: #f3f4f6; color: #374151; }
    .btn-secondary:hover { background: #e5e7eb; }
    .error-box {
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }
    .info-box {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      padding: 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: #1e40af;
    }
    .loader {
      border: 3px solid #f3f4f6;
      border-top: 3px solid ${primaryColor};
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .hidden { display: none !important; }
    canvas {
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      background: white;
      cursor: crosshair;
      width: 100%;
      max-width: 600px;
    }
    .modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 50;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="card-header">
        <h1>${orgName}</h1>
        <p>Kundenportal</p>
      </div>
    </div>

    <div id="emailVerification" class="card">
      <div class="card-header">
        <h1>🔒 Vertrag anzeigen</h1>
        <p>Verifizierung erforderlich</p>
      </div>
      <div class="card-body">
        <div id="emailError" class="error-box hidden"></div>
        
        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
          Bitte geben Sie Ihre E-Mail-Adresse ein
        </label>
        <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 1rem;">
          Um den Vertrag anzuzeigen, bestätigen Sie bitte Ihre E-Mail-Adresse.
        </p>
        <input 
          type="email" 
          id="emailInput" 
          class="form-input" 
          placeholder="ihre.email@beispiel.de"
          style="margin-bottom: 1rem;"
        />

        <button onclick="verifyEmail()" id="verifyBtn" class="btn btn-primary">
          <span id="verifyBtnText">✓ Vertrag anzeigen</span>
        </button>

        <div class="info-box" style="margin-top: 1.5rem;">
          🔒 Ihre Daten sind sicher.
        </div>
      </div>
    </div>

    <div id="contractContent" class="hidden">
      <div class="card">
        <div class="card-header">
          <h1 id="contractTitle">${vertrag.titel}</h1>
          <p id="contractNumber">${vertrag.vertragsnummer || ''}</p>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h2 style="margin-bottom: 1rem;">Vertragsinhalt</h2>
          <div id="eventInfo"></div>
          <div id="contractBody"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h2 style="margin-bottom: 1rem;">Ihre Unterschrift</h2>
          <div id="signatureSection"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-body" style="text-align: center; color: #6b7280;">
          <p>Bei Fragen: ${orgName}</p>
        </div>
      </div>
    </div>

    <div id="signatureModal" class="modal hidden">
      <div class="card" style="max-width: 700px; width: 100%; margin: 0;">
        <div class="card-header">
          <h2>Vertrag unterschreiben</h2>
        </div>
        <div class="card-body">
          <div id="signatureError" class="error-box hidden"></div>

          <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
            Ihr vollständiger Name
          </label>
          <input type="text" id="signatureName" class="form-input" placeholder="Max Mustermann" style="margin-bottom: 1rem;" />

          <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
            Ihre Unterschrift
          </label>
          <canvas id="signatureCanvas" width="600" height="200"></canvas>

          <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
            <button onclick="clearSignature()" class="btn btn-secondary">Löschen</button>
            <button onclick="closeSignatureModal()" class="btn btn-secondary">Abbrechen</button>
            <button onclick="saveSignature()" id="saveSignatureBtn" class="btn btn-primary">
              <span id="saveSignatureBtnText">Speichern</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vertragId = '${vertragId}';
    let verifiedEmail = '';
    let canvas, ctx;
    let isDrawing = false;

    function initCanvas() {
      canvas = document.getElementById('signatureCanvas');
      ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      canvas.onmousedown = startDrawing;
      canvas.onmousemove = draw;
      canvas.onmouseup = stopDrawing;
      canvas.onmouseleave = stopDrawing;
    }

    function startDrawing(e) {
      const rect = canvas.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      isDrawing = true;
    }

    function draw(e) {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
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
        document.getElementById('emailError').textContent = 'Bitte E-Mail eingeben';
        document.getElementById('emailError').classList.remove('hidden');
        return;
      }

      document.getElementById('verifyBtn').disabled = true;
      document.getElementById('verifyBtnText').textContent = 'Wird überprüft...';

      try {
        const response = await fetch(window.location.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vertragId, kundenEmail: email })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Fehler');
        }

        verifiedEmail = email;
        
        document.getElementById('emailVerification').classList.add('hidden');
        document.getElementById('contractContent').classList.remove('hidden');
        
        renderContract(data);
        
      } catch (error) {
        document.getElementById('emailError').textContent = error.message;
        document.getElementById('emailError').classList.remove('hidden');
      } finally {
        document.getElementById('verifyBtn').disabled = false;
        document.getElementById('verifyBtnText').textContent = '✓ Vertrag anzeigen';
      }
    }

    function renderContract(data) {
      const { vertrag, event } = data;

      if (event && vertrag.eventinformationen_anzeigen) {
        const date = new Date(event.datum_von).toLocaleDateString('de-DE');
        let html = '<div class="info-box" style="margin-bottom: 1rem;"><h3>Event-Details</h3><p>📅 ' + date + '</p>';
        if (event.ort_name) html += '<p>📍 ' + event.ort_name + '</p>';
        html += '</div>';
        document.getElementById('eventInfo').innerHTML = html;
      }

      document.getElementById('contractBody').innerHTML = vertrag.inhalt || '';
      
      renderSignature(vertrag);
    }

    function renderSignature(vertrag) {
      const section = document.getElementById('signatureSection');
      
      if (vertrag.unterschrift_kunde) {
        section.innerHTML = '<div style="background: #f0fdf4; border: 2px solid #d1fae5; border-radius: 0.5rem; padding: 1rem;">' +
          '<h3 style="color: #065f46; margin-bottom: 1rem;">✓ Unterzeichnet</h3>' +
          '<img src="' + vertrag.unterschrift_kunde + '" style="max-width: 100%; height: 120px; object-fit: contain; background: white; padding: 0.5rem; border-radius: 0.25rem;" />' +
          '<p style="margin-top: 1rem; font-weight: 600;">' + vertrag.unterschrift_kunde_name + '</p>' +
          '</div>';
      } else {
        section.innerHTML = '<div style="text-align: center; padding: 2rem;">' +
          '<div style="font-size: 4rem; margin-bottom: 1rem;">✍️</div>' +
          '<h3 style="margin-bottom: 1rem;">Bitte unterschreiben Sie den Vertrag</h3>' +
          '<button onclick="openSignatureModal()" class="btn btn-primary" style="max-width: 300px;">Jetzt unterschreiben</button>' +
          '</div>';
      }
    }

    function openSignatureModal() {
      document.getElementById('signatureModal').classList.remove('hidden');
      setTimeout(() => initCanvas(), 100);
    }

    function closeSignatureModal() {
      document.getElementById('signatureModal').classList.add('hidden');
      document.getElementById('signatureName').value = '';
    }

    async function saveSignature() {
      const name = document.getElementById('signatureName').value.trim();
      if (!name) {
        document.getElementById('signatureError').textContent = 'Bitte Namen eingeben';
        document.getElementById('signatureError').classList.remove('hidden');
        return;
      }

      const signatureData = canvas.toDataURL('image/png');
      
      document.getElementById('saveSignatureBtn').disabled = true;

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

        if (!response.ok) {
          throw new Error('Fehler beim Speichern');
        }

        alert('✅ Unterschrift gespeichert!');
        closeSignatureModal();
        location.reload();
        
      } catch (error) {
        document.getElementById('signatureError').textContent = error.message;
        document.getElementById('signatureError').classList.remove('hidden');
      } finally {
        document.getElementById('saveSignatureBtn').disabled = false;
      }
    }

    document.getElementById('emailInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifyEmail();
    });
  </script>
</body>
</html>`;
}