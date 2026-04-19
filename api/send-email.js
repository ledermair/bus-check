// api/send-email.js – Vercel Serverless Function
// E-Mail-Versand via Resend (https://resend.com)
// Environment variables:
//   RESEND_API_KEY  – API Key von resend.com (beginnt mit re_)
//   RESEND_FROM     – Absender, z.B. "BusCheck <buscheck@ledermair.at>"

// Vercel Body-Size-Limit erhöhen (Standard 1MB → 10MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { pdfDataUri, filename, to, cc, subject, body } = req.body

  if (!pdfDataUri || !to || !subject) {
    return res.status(400).json({ error: 'Fehlende Pflichtfelder: pdfDataUri, to, subject' })
  }

  const apiKey = process.env.RESEND_API_KEY
  const fromAddress = process.env.RESEND_FROM || 'BusCheck Ledermair <onboarding@resend.dev>'

  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY nicht konfiguriert' })
  }

  // DataURI → Base64
  const base64Match = pdfDataUri.match(/^data:[^;]+;base64,(.+)$/)
  if (!base64Match) return res.status(400).json({ error: 'Ungültiges PDF-Format' })
  const pdfBase64 = base64Match[1]

  const toList = (Array.isArray(to) ? to : [to]).filter(Boolean)
  const ccList = (Array.isArray(cc) ? cc : cc ? [cc] : []).filter(Boolean)
  if (toList.length === 0) return res.status(400).json({ error: 'Kein Empfänger angegeben' })

  const now = new Date().toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const htmlBody = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F4F4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;padding:24px 0;">
<tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
<tr><td style="background:#0D1A0F;border-radius:10px 10px 0 0;padding:20px 28px;">
  <span style="color:#F5D800;font-size:22px;font-weight:900;font-family:Arial Black,sans-serif;">BUS</span>
  <span style="color:#7DC48A;font-size:22px;font-weight:900;font-family:Arial Black,sans-serif;">CHECK</span>
  <span style="color:#5A6B5C;font-size:13px;margin-left:8px;">– Ledermair</span>
  <div style="height:2px;background:#CC0000;margin-top:12px;border-radius:1px;opacity:0.7;"></div>
</td></tr>
<tr><td style="background:#172019;padding:28px;color:#F0EDE8;">
  <h2 style="margin:0 0 14px;color:#F0EDE8;font-size:18px;">${(subject||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</h2>
  <p style="margin:0 0 18px;color:#A8B0A9;font-size:14px;line-height:1.6;">${(body||subject||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
  <div style="background:#1E2B20;border:1px solid rgba(26,92,42,0.3);border-radius:8px;padding:12px 16px;">
    <span style="color:#7DC48A;font-size:12px;">📎 PDF-Bericht ist als Anhang beigefügt</span>
  </div>
  <hr style="border:none;border-top:1px solid #1E2B20;margin:20px 0;">
  <p style="color:#5A6B5C;font-size:11px;margin:0;">Erstellt am ${now} · BusCheck Ledermair Touristik</p>
</td></tr>
<tr><td style="background:#111D13;border-radius:0 0 10px 10px;padding:12px 28px;text-align:center;">
  <span style="color:#2E3D30;font-size:11px;">BusCheck PWA · ledermair.at</span>
</td></tr>
</table></td></tr></table></body></html>`

  // Resend Payload
  const payload = {
    from: fromAddress,
    to: toList,
    subject,
    html: htmlBody,
    attachments: [
      {
        filename: filename || 'bericht.pdf',
        content: pdfBase64,
      },
    ],
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

    const result = await response.json()

    if (response.ok) {
      console.log(`✓ E-Mail gesendet via Resend: ${subject} → ${toList.join(', ')} | ID: ${result.id}`)
      return res.status(200).json({ ok: true, id: result.id })
    }

    console.error('Resend Fehler:', result)
    return res.status(502).json({
      error: 'E-Mail-Versand fehlgeschlagen',
      detail: result?.message || JSON.stringify(result),
    })
  } catch (err) {
    console.error('Netzwerkfehler:', err.message)
    return res.status(500).json({ error: 'Interner Serverfehler', detail: err.message })
  }
}
