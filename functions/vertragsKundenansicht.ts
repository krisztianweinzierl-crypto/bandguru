import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  console.log('🔍 Request Method:', req.method);
  console.log('🔍 Request URL:', req.url);

  try {
    const url = new URL(req.url);
    
    // POST-Request: Immer JSON zurückgeben
    if (req.method === 'POST') {
      console.log('📬 POST Request detected');
      
      // Base44 Client mit Service Role
      const base44 = createClientFromRequest(req);
      
      let body;
      try {
        body = await req.json();
        console.log('📦 Body parsed:', JSON.stringify(body));
      } catch (e) {
        console.error('❌ Failed to parse JSON body:', e);
        return new Response(
          JSON.stringify({ error: 'Ungültiges JSON' }),
          { 
            status: 400, 
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      const vertragId = body.vertragId;
      const kundenEmail = body.kundenEmail;
      
      console.log('🔑 Vertrag ID:', vertragId);
      console.log('📧 Kunden Email:', kundenEmail);
      
      if (!vertragId) {
        console.log('❌ Keine Vertrags-ID');
        return new Response(
          JSON.stringify({ error: 'Keine Vertrags-ID angegeben' }),
          { 
            status: 400, 
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      if (!kundenEmail) {
        console.log('❌ Keine E-Mail');
        return new Response(
          JSON.stringify({ error: 'E-Mail-Adresse erforderlich' }),
          { 
            status: 400, 
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      // Unterschrift speichern
      if (body.unterschrift_kunde !== undefined) {
        console.log('✍️ Unterschrift speichern...');
        
        console.log('📊 Lade Vertrag...');
        const vertraege = await base44.asServiceRole.entities.Vertrag.filter({ id: vertragId });
        const vertrag = vertraege[0];
        console.log('📊 Vertrag geladen:', vertrag ? 'JA' : 'NEIN');

        if (!vertrag || !vertrag.im_kundenportal_sichtbar) {
          console.log('❌ Vertrag nicht verfügbar');
          return new Response(
            JSON.stringify({ error: 'Vertrag nicht verfügbar' }),
            { 
              status: 403, 
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            }
          );
        }

        console.log('📊 Lade Kunde...');
        let kunde = null;
        if (vertrag.kunde_id) {
          const kunden = await base44.asServiceRole.entities.Kunde.filter({ id: vertrag.kunde_id });
          kunde = kunden[0];
          console.log('📊 Kunde geladen:', kunde ? kunde.email : 'KEIN KUNDE');
        }

        if (!kunde || kunde.email?.toLowerCase().trim() !== kundenEmail.toLowerCase().trim()) {
          console.log('❌ E-Mail stimmt nicht überein');
          return new Response(
            JSON.stringify({ error: 'E-Mail-Adresse stimmt nicht überein' }),
            { 
              status: 403, 
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            }
          );
        }

        const updateData = {
          unterschrift_kunde: body.unterschrift_kunde,
          unterschrift_kunde_name: body.unterschrift_kunde_name,
          unterschrift_kunde_datum: body.unterschrift_kunde_datum
        };

        if (vertrag.unterschrift_organisation && body.unterschrift_kunde) {
          updateData.status = 'unterzeichnet';
        }

        console.log('💾 Speichere Unterschrift...');
        const updatedVertrag = await base44.asServiceRole.entities.Vertrag.update(vertragId, updateData);
        console.log('✅ Unterschrift gespeichert');
        
        return new Response(
          JSON.stringify({ success: true, vertrag: updatedVertrag }),
          { 
            status: 200, 
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      // E-Mail Verifizierung
      console.log('🔐 E-Mail Verifizierung...');
      
      console.log('📊 Lade Vertrag...');
      const vertraege = await base44.asServiceRole.entities.Vertrag.filter({ id: vertragId });
      const vertrag = vertraege[0];
      console.log('📊 Vertrag gefunden:', vertrag ? 'JA' : 'NEIN');

      if (!vertrag) {
        console.log('❌ Vertrag nicht gefunden');
        return new Response(
          JSON.stringify({ error: 'Vertrag nicht gefunden' }),
          { 
            status: 404, 
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      if (!vertrag.im_kundenportal_sichtbar) {
        console.log('❌ Vertrag nicht sichtbar');
        return new Response(
          JSON.stringify({ error: 'Vertrag nicht verfügbar' }),
          { 
            status: 403, 
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      console.log('📊 Lade Kunde...');
      let kunde = null;
      if (vertrag.kunde_id) {
        const kunden = await base44.asServiceRole.entities.Kunde.filter({ id: vertrag.kunde_id });
        kunde = kunden[0] || null;
        console.log('📊 Kunde gefunden:', kunde ? kunde.email : 'NEIN');
      }

      if (!kunde) {
        console.log('❌ Kunde nicht gefunden');
        return new Response(
          JSON.stringify({ error: 'Kunde nicht gefunden' }),
          { 
            status: 404, 
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      console.log('🔍 Email-Check:', {
        kunde: kunde.email?.toLowerCase().trim(),
        eingabe: kundenEmail.toLowerCase().trim(),
        match: kunde.email?.toLowerCase().trim() === kundenEmail.toLowerCase().trim()
      });

      if (kunde.email?.toLowerCase().trim() !== kundenEmail.toLowerCase().trim()) {
        console.log('❌ E-Mail stimmt nicht überein');
        return new Response(
          JSON.stringify({ error: 'E-Mail-Adresse stimmt nicht überein' }),
          { 
            status: 403, 
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      console.log('📊 Lade Event...');
      let event = null;
      if (vertrag.event_id) {
        const events = await base44.asServiceRole.entities.Event.filter({ id: vertrag.event_id });
        event = events[0] || null;
        console.log('📊 Event gefunden:', event ? 'JA' : 'NEIN');
      }

      console.log('📊 Lade Organisation...');
      let organisation = null;
      if (vertrag.org_id) {
        const orgs = await base44.asServiceRole.entities.Organisation.filter({ id: vertrag.org_id });
        organisation = orgs[0] || null;
        console.log('📊 Organisation gefunden:', organisation ? 'JA' : 'NEIN');
      }

      console.log('✅ Verifizierung erfolgreich!');
      return new Response(
        JSON.stringify({
          success: true,
          vertrag,
          kunde,
          event,
          organisation
        }),
        { 
          status: 200, 
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // GET-Request: HTML zurückgeben
    console.log('🌐 GET Request - HTML zurückgeben');
    const vertragId = url.searchParams.get('id');
    
    if (!vertragId) {
      console.log('❌ Keine Vertrags-ID in URL');
      return new Response(buildErrorPage('Keine Vertrags-ID angegeben'), {
        status: 400,
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    console.log('✅ Sende HTML-Seite');
    return new Response(buildLoginPage(vertragId), {
      status: 200,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('💥 FATAL ERROR:', error);
    console.error('💥 Error Stack:', error.stack);
    console.error('💥 Error Message:', error.message);
    
    // Bei POST: JSON-Error zurückgeben
    if (req.method === 'POST') {
      return new Response(
        JSON.stringify({ error: 'Interner Serverfehler: ' + error.message }),
        { 
          status: 500, 
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
    
    // Bei GET: HTML-Error zurückgeben
    return new Response(buildErrorPage('Interner Serverfehler: ' + error.message), {
      status: 500,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      }
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
    '.btn-primary:disabled{opacity:0.5;cursor:not-allowed}' +
    '.btn-secondary{background:#f3f4f6;color:#374151}' +
    '.error{background:#fee2e2;color:#991b1b;padding:1rem;border-radius:0.5rem;margin-bottom:1rem}' +
    '.info{background:#eff6ff;color:#1e40af;padding:1rem;border-radius:0.5rem;font-size:0.875rem}' +
    '.success{background:#f0fdf4;color:#166534;padding:1rem;border-radius:0.5rem;margin-bottom:1rem}' +
    '.hidden{display:none!important}' +
    'canvas{border:2px solid #e5e7eb;border-radius:0.5rem;width:100%;max-width:600px;cursor:crosshair;touch-action:none}' +
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
    '<input type="email" id="emailInput" placeholder="ihre.email@beispiel.de" autocomplete="email">' +
    '<button id="verifyBtn" class="btn-primary" onclick="verify()">Vertrag anzeigen</button>' +
    '<div class="info" style="margin-top:1rem">🔒 Ihre Daten sind sicher. Diese Verifizierung dient ausschließlich dazu, sicherzustellen, dass Sie berechtigt sind, diesen Vertrag einzusehen.</div>' +
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
    '<button id="saveBtn" class="btn-primary" onclick="saveSig()">Speichern</button>' +
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
    'const addListeners=(e)=>{' +
    'canvas.addEventListener("mousedown",startDrawMouse);' +
    'canvas.addEventListener("mousemove",drawMouse);' +
    'canvas.addEventListener("mouseup",stopDraw);' +
    'canvas.addEventListener("mouseleave",stopDraw);' +
    'canvas.addEventListener("touchstart",startDrawTouch);' +
    'canvas.addEventListener("touchmove",drawTouch);' +
    'canvas.addEventListener("touchend",stopDraw);' +
    '};' +
    'addListeners();' +
    '}' +
    'function startDrawMouse(e){' +
    'const r=canvas.getBoundingClientRect();' +
    'ctx.beginPath();' +
    'ctx.moveTo(e.clientX-r.left,e.clientY-r.top);' +
    'drawing=true;' +
    '}' +
    'function drawMouse(e){' +
    'if(!drawing)return;' +
    'const r=canvas.getBoundingClientRect();' +
    'ctx.lineTo(e.clientX-r.left,e.clientY-r.top);' +
    'ctx.stroke();' +
    '}' +
    'function startDrawTouch(e){' +
    'e.preventDefault();' +
    'const t=e.touches[0];' +
    'const r=canvas.getBoundingClientRect();' +
    'ctx.beginPath();' +
    'ctx.moveTo(t.clientX-r.left,t.clientY-r.top);' +
    'drawing=true;' +
    '}' +
    'function drawTouch(e){' +
    'e.preventDefault();' +
    'if(!drawing)return;' +
    'const t=e.touches[0];' +
    'const r=canvas.getBoundingClientRect();' +
    'ctx.lineTo(t.clientX-r.left,t.clientY-r.top);' +
    'ctx.stroke();' +
    '}' +
    'function stopDraw(){drawing=false}' +
    'function clearSig(){ctx.clearRect(0,0,canvas.width,canvas.height)}' +
    'async function verify(){' +
    'const e=document.getElementById("emailInput").value.trim();' +
    'const btn=document.getElementById("verifyBtn");' +
    'const err=document.getElementById("emailError");' +
    'if(!e){' +
    'err.textContent="Bitte E-Mail eingeben";' +
    'err.classList.remove("hidden");' +
    'return;' +
    '}' +
    'btn.disabled=true;' +
    'btn.textContent="Lade...";' +
    'try{' +
    'const res=await fetch(window.location.href,{' +
    'method:"POST",' +
    'headers:{"Content-Type":"application/json"},' +
    'body:JSON.stringify({vertragId:vId,kundenEmail:e})' +
    '});' +
    'console.log("Response Status:",res.status);' +
    'console.log("Content-Type Header:",res.headers.get("content-type"));' +
    'if(!res.ok){' +
    'const data=await res.json();' +
    'throw new Error(data.error||"Fehler");' +
    '}' +
    'const data=await res.json();' +
    'if(!data.success){throw new Error(data.error||"Fehler")}' +
    'email=e;' +
    'document.getElementById("emailVerification").classList.add("hidden");' +
    'document.getElementById("content").classList.remove("hidden");' +
    'render(data);' +
    '}catch(err){' +
    'console.error("Verify Error:",err);' +
    'err.textContent=err.message;' +
    'err.classList.remove("hidden");' +
    'btn.disabled=false;' +
    'btn.textContent="Vertrag anzeigen";' +
    '}' +
    '}' +
    'function render(data){' +
    'console.log("Rendering data:",data);' +
    'const {vertrag,event,organisation}=data;' +
    'document.getElementById("title").textContent=vertrag.titel||"Vertrag";' +
    'document.getElementById("number").textContent=vertrag.vertragsnummer||"";' +
    'if(event&&vertrag.eventinformationen_anzeigen){' +
    'const d=new Date(event.datum_von).toLocaleDateString("de-DE",{year:"numeric",month:"long",day:"numeric"});' +
    'const t=new Date(event.datum_von).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});' +
    'let h="<div class=info style=margin-bottom:1rem><b>Event-Details</b><p>📅 "+d+" um "+t+" Uhr</p>";' +
    'if(event.ort_name)h+="<p>📍 "+event.ort_name+"</p>";' +
    'if(event.ort_adresse)h+="<p>"+event.ort_adresse+"</p>";' +
    'h+="</div>";' +
    'document.getElementById("eventInfo").innerHTML=h;' +
    '}' +
    'document.getElementById("body").innerHTML=vertrag.inhalt||"";' +
    'renderSig(vertrag);' +
    '}' +
    'function renderSig(v){' +
    'const s=document.getElementById("signature");' +
    'if(v.unterschrift_kunde){' +
    'const d=new Date(v.unterschrift_kunde_datum).toLocaleDateString("de-DE",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"});' +
    's.innerHTML="<div class=success><div style=display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem><span style=font-size:2rem>✅</span><h3 style=margin:0>Vertrag wurde unterzeichnet</h3></div><img src=\\""+v.unterschrift_kunde+"\\" style=\\"max-width:100%;height:120px;object-fit:contain;background:#fff;border:2px solid #e5e7eb;border-radius:0.5rem;padding:0.5rem;margin-bottom:1rem\\"><p style=margin:0><b>"+v.unterschrift_kunde_name+"</b></p><p style=margin:0;font-size:0.875rem;color:#666>"+d+"</p></div>";' +
    '}else{' +
    's.innerHTML="<div style=text-align:center;padding:3rem><div style=font-size:5rem;margin-bottom:1rem>✍️</div><h3 style=margin-bottom:0.5rem>Bitte unterschreiben Sie den Vertrag</h3><p style=color:#666;margin-bottom:2rem>Mit Ihrer Unterschrift bestätigen Sie, dass Sie den Vertrag gelesen haben und den Bedingungen zustimmen.</p><button class=btn-primary onclick=openModal() style=max-width:300px;margin:0 auto>Jetzt unterschreiben</button></div>";' +
    '}' +
    '}' +
    'function openModal(){' +
    'document.getElementById("modal").classList.remove("hidden");' +
    'setTimeout(initCanvas,100);' +
    '}' +
    'function closeModal(){' +
    'document.getElementById("modal").classList.add("hidden");' +
    'document.getElementById("sigName").value="";' +
    'clearSig();' +
    '}' +
    'async function saveSig(){' +
    'const name=document.getElementById("sigName").value.trim();' +
    'const btn=document.getElementById("saveBtn");' +
    'const err=document.getElementById("sigError");' +
    'if(!name){' +
    'err.textContent="Bitte Namen eingeben";' +
    'err.classList.remove("hidden");' +
    'return;' +
    '}' +
    'const sig=canvas.toDataURL("image/png");' +
    'btn.disabled=true;' +
    'btn.textContent="Speichere...";' +
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
    'if(!res.ok){' +
    'const data=await res.json();' +
    'throw new Error(data.error||"Fehler");' +
    '}' +
    'const data=await res.json();' +
    'alert("✅ Vielen Dank! Ihre Unterschrift wurde gespeichert.");' +
    'location.reload();' +
    '}catch(err){' +
    'console.error("Save Error:",err);' +
    'err.textContent=err.message;' +
    'err.classList.remove("hidden");' +
    'btn.disabled=false;' +
    'btn.textContent="Speichern";' +
    '}' +
    '}' +
    'document.getElementById("emailInput").addEventListener("keypress",e=>{if(e.key==="Enter")verify()});' +
    '</script>' +
    '</body>' +
    '</html>';
  
  return html;
}