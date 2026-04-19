// api/send-email.js – Vercel Serverless Function
// E-Mail-Versand via Resend

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.RESEND_API_KEY
  const fromAddress = process.env.RESEND_FROM || 'onboarding@resend.dev'

  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY nicht konfiguriert' })
  }

  const { pdfBase64, pdfDataUri, filename, to, cc, subject, body } = req.body

  if (!to || !subject) {
    return res.status(400).json({ error: 'Fehlende Pflichtfelder: to, subject' })
  }

  // PDF Base64 extrahieren – unterstützt beide Formate
  let base64Content = null

  if (pdfBase64) {
    // Direkt als Base64 gesendet (neues Format)
    base64Content = pdfBase64.replace(/\s/g, '')
  } else if (pdfDataUri) {
    // Als DataURI gesendet (altes Format)
    const match = pdfDataUri.match(/base64,(.+)$/s)
    if (match) base64Content = match[1].replace(/\s/g, '')
  }

  if (!base64Content) {
    return res.status(400).json({ error: 'Kein PDF-Inhalt gefunden (pdfBase64 oder pdfDataUri erforderlich)' })
  }

  const toList = (Array.isArray(to) ? to : [to]).filter(Boolean)
  const ccList = (Array.isArray(cc) ? cc : cc ? [cc] : []).filter(Boolean)

  if (toList.length === 0) {
    return res.status(400).json({ error: 'Kein gültiger Empfänger' })
  }

  const now = new Date().toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const htmlBody = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F4F4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;padding:24px 0;">
<tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
<tr><td style="background:#0D1A0F;border-radius:10px 10px 0 0;padding:20px 28px;">
  <span style="color:#F5D800;font-size:22px;font-weight:900;">BUS</span>
  <span style="color:#7DC48A;font-size:22px;font-weight:900;">CHECK</span>
  <span style="color:#5A6B5C;font-size:13px;margin-left:8px;">– Ledermair</span>
  <div style="height:2px;background:#CC0000;margin-top:10px;"></div>
</td></tr>
<tr><td style="background:#172019;padding:28px;color:#F0EDE8;">
  <h2 style="margin:0 0 12px;font-size:18px;">${(subject||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</h2>
  <p style="margin:0 0 16px;color:#A8B0A9;font-size:14px;line-height:1.6;">${(body||subject||'').replace(/\n/g,'<br>').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
  <div style="background:#1E2B20;border:1px solid rgba(26,92,42,0.3);border-radius:8px;padding:12px 16px;">
    <span style="color:#7DC48A;font-size:12px;">📎 PDF-Bericht ist als Anhang beigefügt</span>
  </div>
  <hr style="border:none;border-top:1px solid #1E2B20;margin:18px 0;">
  <p style="color:#5A6B5C;font-size:11px;margin:0;">Erstellt am ${now} · BusCheck Ledermair Touristik</p>
</td></tr>
<tr><td style="background:#111D13;border-radius:0 0 10px 10px;padding:12px 28px;text-align:center;">
  <span style="color:#2E3D30;font-size:11px;">BusCheck PWA · Ledermair</span>
</td></tr>
</table></td></tr></table></body></html>`

  const payload = {
    from: fromAddress,
    to: toList,
    subject,
    html: htmlBody,
    attachments: [{
      filename: filename || 'bericht.pdf',
      content: base64Content,
    }],
  }

  if (ccList.length > 0) payload.cc = ccList

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    let result = {}
    try { result = await response.json() } catch {}

    if (response.ok) {
      console.log(`✓ Gesendet: "${subject}" → ${toList.join(', ')}`)
      return res.status(200).json({ ok: true, id: result.id })
    }

    const detail = result?.message || result?.error || JSON.stringify(result)
    console.error(`✗ Resend Fehler ${response.status}:`, detail)
    return res.status(502).json({ error: 'E-Mail-Versand fehlgeschlagen', detail })

  } catch (err) {
    console.error('Netzwerkfehler:', err.message)
    return res.status(500).json({ error: 'Serverfehler', detail: err.message })
  }
}
