import { createClient } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClient(
    Deno.env.get("BASE44_APP_ID"),
    Deno.env.get("BASE44_SERVICE_ROLE_KEY")
  );

  try {
    const url = new URL(req.url);
    const vertragId = url.searchParams.get('id');
    
    if (req.method === 'POST') {
      const body = await req.json();
      const kundenEmail = body.kundenEmail;
      
      if (!vertragId) {
        return Response.json({ error: 'Keine Vertrags-ID angegeben' }, { status: 400 });
      }

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

    // GET-Request: Nur prüfen ob ID vorhanden, dann HTML zurückgeben
    // KEINE Datenbank-Abfragen hier!
    if (!vertragId) {
      return new Response(buildErrorPage('Keine Vertrags-ID angegeben'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // HTML direkt zurückgeben ohne vorher Daten zu laden
    return new Response(buildLoginPage(vertragId), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error) {
    console.error('Fehler:', error);
    return new Response(buildErrorPage('Interner Serverfehler'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
});

function buildErrorPage(message) {
  const html = '<!DOCTYPE html>' +
    '<html lang="de">' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Fehler</title>' +
    '<style>' +
    'body{margin:0;padding:2rem;font-family:system-ui;background:#f5f3ff;min-height:100vh;display:flex;align-items:center;justify-content:center}' +
    '.box{background:white;padding:3rem;border-radius:1rem;box-shadow:0 10px 30px rgba(0,0,0,0.1);text-align:center;max-width:500px}' +
    '.icon{font-size:4rem;margin-bottom:1rem}' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="box">' +
    '<div class="icon">⚠️</div>' +
    '<h1>' + message + '</h1>' +
    '</div>' +
    '</body>' +
    '</html>';
  return html;
}

function buildLoginPage(vertragId) {
  const html = '<!DOCTYPE html>' +
    '<html lang="de">' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Vertrag anzeigen - Bandguru</title>' +
    '<style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:system-ui;background:linear-gradient(135deg,#f5f3ff,#fff,#fce7f3);min-height:100vh;padding:1rem;color:#1f2937}' +
    '.container{max-width:900px;margin:0 auto}' +
    '.card{background:white;border-radius:1rem;box-shadow:0 10px 30px rgba(0,0,0,0.1);margin-bottom:1.5rem;overflow:hidden}' +
    '.header{background:linear-gradient(135deg,#8b5cf6,#ec4899);color:white;padding:2rem}' +
    '.body{padding:2rem}' +
    'input{width:100%;padding:0.75rem;border:2px solid #e5e7eb;border-radius:0.5rem;font-size:1rem;margin:0.5rem 0}' +
    'input:focus{outline:none;border-color:#8b5cf6}' +
    'button{padding:0.75rem 1.5rem;border:none;border-radius:0.5rem;font-size:1rem;font-weight:600;cursor:pointer;width:100%}' +
    '.btn-primary{background:linear-gradient(135deg,#8b5cf6,#ec4899);color:white}' +
    '.btn-primary:hover{opacity:0.9}' +
    '.btn-secondary{background:#f3f4f6;color:#374151}' +
    '.error{background:#fee2e2;color:#991b1b;padding:1rem;border-radius:0.5rem;margin-bottom:1rem}' +
    '.info{background:#eff6ff;color:#1e40af;padding:1rem;border-radius:0.5rem;font-size:0.875rem}' +
    '.hidden{display:none!important}' +
    'canvas{border:2px solid #e5e7eb;border-radius:0.5rem;width:100%;max-width:600px;cursor:crosshair}' +
    '.modal{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:1rem;z-index:50}' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="container">' +
    '<div class="card">' +
    '<div class="header">' +
    '<h1>Bandguru</h1>' +
    '<p>Kundenportal</p>' +
    '</div>' +
    '</div>' +
    '<div id="emailVerification" class="card">' +
    '<div class="header">' +
    '<h1>Vertrag anzeigen</h1>' +
    '<p>Verifizierung erforderlich</p>' +
    '</div>' +
    '<div class="body">' +
    '<div id="emailError" class="error hidden"></div>' +
    '<label><b>E-Mail-Adresse</b></label>' +
    '<input type="email" id="emailInput" placeholder="ihre.email@beispiel.de">' +
    '<button class="btn-primary" onclick="verify()">Vertrag anzeigen</button>' +
    '<div class="info" style="margin-top:1rem">Ihre Daten sind sicher</div>' +
    '</div>' +
    '</div>' +
    '<div id="content" class="hidden">' +
    '<div class="card">' +
    '<div class="header">' +
    '<h1 id="title"></h1>' +
    '<p id="number"></p>' +
    '</div>' +
    '</div>' +
    '<div class="card">' +
    '<div class="body">' +
    '<h2>Vertragsinhalt</h2>' +
    '<div id="eventInfo"></div>' +
    '<div id="body"></div>' +
    '</div>' +
    '</div>' +
    '<div class="card">' +
    '<div class="body">' +
    '<h2>Unterschrift</h2>' +
    '<div id="signature"></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div id="modal" class="modal hidden">' +
    '<div class="card" style="max-width:700px;width:100%;margin:0">' +
    '<div class="header">' +
    '<h2>Unterschreiben</h2>' +
    '</div>' +
    '<div class="body">' +
    '<div id="sigError" class="error hidden"></div>' +
    '<label><b>Name</b></label>' +
    '<input type="text" id="sigName" placeholder="Max Mustermann">' +
    '<label><b>Unterschrift</b></label>' +
    '<canvas id="canvas" width="600" height="200"></canvas>' +
    '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
    '<button class="btn-secondary" onclick="clearSig()">Loeschen</button>' +
    '<button class="btn-secondary" onclick="closeModal()">Abbrechen</button>' +
    '<button class="btn-primary" onclick="saveSig()">Speichern</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<script>' +
    'const vId="' + vertragId + '";' +
    'let email="";' +
    'let canvas,ctx,drawing=false;' +
    'function initCanvas(){' +
    'canvas=document.getElementById("canvas");' +
    'ctx=canvas.getContext("2d");' +
    'ctx.strokeStyle="#000";' +
    'ctx.lineWidth=2;' +
    'ctx.lineCap="round";' +
    'canvas.onmousedown=e=>{' +
    'const r=canvas.getBoundingClientRect();' +
    'ctx.beginPath();' +
    'ctx.moveTo(e.clientX-r.left,e.clientY-r.top);' +
    'drawing=true;' +
    '};' +
    'canvas.onmousemove=e=>{' +
    'if(!drawing)return;' +
    'const r=canvas.getBoundingClientRect();' +
    'ctx.lineTo(e.clientX-r.left,e.clientY-r.top);' +
    'ctx.stroke();' +
    '};' +
    'canvas.onmouseup=()=>drawing=false;' +
    'canvas.onmouseleave=()=>drawing=false;' +
    '}' +
    'function clearSig(){ctx.clearRect(0,0,canvas.width,canvas.height)}' +
    'async function verify(){' +
    'const e=document.getElementById("emailInput").value.trim();' +
    'if(!e){' +
    'document.getElementById("emailError").textContent="Bitte E-Mail eingeben";' +
    'document.getElementById("emailError").classList.remove("hidden");' +
    'return;' +
    '}' +
    'try{' +
    'const res=await fetch(window.location.href,{' +
    'method:"POST",' +
    'headers:{"Content-Type":"application/json"},' +
    'body:JSON.stringify({vertragId:vId,kundenEmail:e})' +
    '});' +
    'const data=await res.json();' +
    'if(!res.ok)throw new Error(data.error);' +
    'email=e;' +
    'document.getElementById("emailVerification").classList.add("hidden");' +
    'document.getElementById("content").classList.remove("hidden");' +
    'render(data);' +
    '}catch(err){' +
    'document.getElementById("emailError").textContent=err.message;' +
    'document.getElementById("emailError").classList.remove("hidden");' +
    '}' +
    '}' +
    'function render(data){' +
    'const {vertrag,event,organisation}=data;' +
    'document.getElementById("title").textContent=vertrag.titel||"Vertrag";' +
    'document.getElementById("number").textContent=vertrag.vertragsnummer||"";' +
    'if(event&&vertrag.eventinformationen_anzeigen){' +
    'const d=new Date(event.datum_von).toLocaleDateString("de-DE");' +
    'let h="<div class=info><b>Event</b><p>"+d+"</p>";' +
    'if(event.ort_name)h+="<p>"+event.ort_name+"</p>";' +
    'h+="</div>";' +
    'document.getElementById("eventInfo").innerHTML=h;' +
    '}' +
    'document.getElementById("body").innerHTML=vertrag.inhalt||"";' +
    'renderSig(vertrag);' +
    '}' +
    'function renderSig(v){' +
    'const s=document.getElementById("signature");' +
    'if(v.unterschrift_kunde){' +
    's.innerHTML="<div style=background:#f0fdf4;padding:1rem;border-radius:0.5rem><h3>Unterzeichnet</h3><img src="+v.unterschrift_kunde+" style=max-width:100%;height:120px;object-fit:contain><p><b>"+v.unterschrift_kunde_name+"</b></p></div>";' +
    '}else{' +
    's.innerHTML="<div style=text-align:center;padding:2rem><div style=font-size:4rem>✍️</div><h3>Bitte unterschreiben</h3><button class=btn-primary onclick=openModal() style=max-width:300px>Jetzt unterschreiben</button></div>";' +
    '}' +
    '}' +
    'function openModal(){' +
    'document.getElementById("modal").classList.remove("hidden");' +
    'setTimeout(initCanvas,100);' +
    '}' +
    'function closeModal(){' +
    'document.getElementById("modal").classList.add("hidden");' +
    'document.getElementById("sigName").value="";' +
    '}' +
    'async function saveSig(){' +
    'const name=document.getElementById("sigName").value.trim();' +
    'if(!name){' +
    'document.getElementById("sigError").textContent="Bitte Namen eingeben";' +
    'document.getElementById("sigError").classList.remove("hidden");' +
    'return;' +
    '}' +
    'const sig=canvas.toDataURL("image/png");' +
    'try{' +
    'const res=await fetch(window.location.href,{' +
    'method:"POST",' +
    'headers:{"Content-Type":"application/json"},' +
    'body:JSON.stringify({' +
    'vertragId:vId,' +
    'kundenEmail:email,' +
    'unterschrift_kunde:sig,' +
    'unterschrift_kunde_name:name,' +
    'unterschrift_kunde_datum:new Date().toISOString()' +
    '})' +
    '});' +
    'if(!res.ok)throw new Error("Fehler");' +
    'alert("Gespeichert!");' +
    'location.reload();' +
    '}catch(err){' +
    'document.getElementById("sigError").textContent=err.message;' +
    'document.getElementById("sigError").classList.remove("hidden");' +
    '}' +
    '}' +
    'document.getElementById("emailInput").addEventListener("keypress",e=>{if(e.key==="Enter")verify()});' +
    '</script>' +
    '</body>' +
    '</html>';
  
  return html;
}