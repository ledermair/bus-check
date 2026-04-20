import jsPDF from 'jspdf'
import { compressForPDF } from './helpers'

// ─── Farben (Druckoptimiert: weißer Hintergrund, dunkle Schrift) ──────────
const BG       = [255, 255, 255]  // Weißer Hintergrund
const TEXT     = [20,  20,  20]   // Fast schwarz
const TEXT2    = [80,  80,  80]   // Grau
const TEXT3    = [140, 140, 140]  // Hellgrau
const GREEN_D  = [26,  92,  42]   // Ledermair Grün
const YELLOW_D = [180, 140, 0]    // Gedämpftes Gelb für Druck
const RED_D    = [180, 40,  40]   // Dunkelrot
const LINE     = [200, 200, 200]  // Trennlinie

// ─── Helpers ──────────────────────────────────────────────────────────────
function addHeader(doc, title, subtitle) {
  // Grüner Header-Balken
  doc.setFillColor(...GREEN_D)
  doc.rect(0, 0, 210, 28, 'F')

  // Weißer Akzentstreifen links
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, 5, 28, 'F')

  // Roter Unterstrich
  doc.setFillColor(...RED_D)
  doc.rect(0, 27, 210, 2, 'F')

  // Logo Text weiß
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('LEDERMAIR', 12, 12)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 230, 200)
  doc.text('BusCheck – Fahrzeugkontrollsystem', 12, 18)

  // Titel rechts
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(title, 210 - 14, 12, { align: 'right' })

  if (subtitle) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(200, 230, 200)
    doc.text(subtitle, 210 - 14, 19, { align: 'right' })
  }

  return 36
}

function addSectionTitle(doc, y, title) {
  doc.setFillColor(240, 245, 240)
  doc.rect(10, y, 190, 7, 'F')
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.line(10, y + 7, 200, y + 7)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GREEN_D)
  doc.text(title.toUpperCase(), 14, y + 5)
  return y + 11
}

function addField(doc, y, label, value) {
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT3)
  doc.text(label, 14, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT)
  doc.text(String(value || '—'), 14, y + 5)
  return y + 11
}

function addTwoFields(doc, y, l1, v1, l2, v2) {
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT3)
  doc.text(l1, 14, y)
  doc.text(l2, 110, y)
  doc.setTextColor(...TEXT)
  doc.text(String(v1 || '—'), 14, y + 5)
  doc.text(String(v2 || '—'), 110, y + 5)
  return y + 11
}

function addDivider(doc, y) {
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.line(10, y, 200, y)
  return y + 5
}

// ─── Bild-Dimensionen asynchron ermitteln ────────────────────────────────
function getImageDimensions(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 4, h: 3 }) // Fallback 4:3
    img.src = src
  })
}

async function addPhotoWithAspect(doc, x, y, imgData, label, maxW, maxH) {
  if (!imgData) return { w: maxW, h: maxH }
  try {
    // Echte Bildgröße asynchron laden
    const { w: natW, h: natH } = await getImageDimensions(imgData)
    const ratio = natW > 0 && natH > 0 ? natW / natH : 4 / 3

    let w = maxW
    let h = w / ratio
    if (h > maxH) { h = maxH; w = h * ratio }

    doc.setFillColor(245, 245, 245)
    doc.roundedRect(x, y, w, h, 1, 1, 'F')
    doc.addImage(imgData, 'JPEG', x, y, w, h)

    if (label) {
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...TEXT3)
      doc.text(label, x, y + h + 3)
    }
    return { w, h }
  } catch (e) {
    console.warn('Photo embed failed:', e)
    return { w: maxW, h: maxH }
  }
}

async function addPhotoRow(doc, y, photos, labels, maxH = 45) {
  const gap = 4, startX = 14
  const valid = photos.filter(Boolean)
  if (valid.length === 0) return y
  const count = Math.min(valid.length, 3)
  const maxW = (190 - gap * (count - 1)) / count

  let x = startX
  let actualH = 0
  for (let i = 0; i < photos.length; i++) {
    const img = photos[i]
    if (!img) continue
    const { h } = await addPhotoWithAspect(doc, x, y, img, labels[i] || '', maxW, maxH)
    actualH = Math.max(actualH, h)
    x += maxW + gap
    if (x > 170 && i < photos.length - 1) { x = startX; y += actualH + 8; actualH = 0 }
  }
  return y + actualH + 8
}

function addSignature(doc, y, sigData, label) {
  y = checkPageBreak(doc, y, 45)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT3)
  doc.text(label, 14, y)

  doc.setFillColor(250, 250, 250)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.roundedRect(14, y + 3, 120, 28, 1, 1, 'FD')

  if (sigData) {
    try { doc.addImage(sigData, 'PNG', 16, y + 4, 116, 26) } catch {}
    doc.setFillColor(...GREEN_D)
    doc.circle(140, y + 17, 4, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.text('✓', 140, y + 19, { align: 'center' })
  } else {
    doc.setFontSize(7)
    doc.setTextColor(...TEXT3)
    doc.text('Unterschrift', 74, y + 18, { align: 'center' })
  }

  doc.setDrawColor(...LINE)
  doc.line(14, y + 28, 134, y + 28)

  const heute = new Date().toLocaleDateString('de-AT')
  doc.setFontSize(6.5)
  doc.setTextColor(...TEXT3)
  doc.text(`Datum: ${heute}`, 14, y + 33)
  doc.text(label, 134, y + 33, { align: 'right' })

  return y + 40
}

function checkPageBreak(doc, y, needed = 40) {
  if (y + needed > 280) {
    doc.addPage()
    doc.setFillColor(...BG)
    doc.rect(0, 0, 210, 297, 'F')
    return 15
  }
  return y
}

// ─── Skizze mit Markierungen als Bild rendern ─────────────────────────────
async function renderSketchToImage(damagePoints, busViews) {
  if (!damagePoints || damagePoints.length === 0) return null

  // Alle betroffenen Views
  const viewsWithPoints = [...new Set(damagePoints.map(p => p.view))]
  const results = {}

  for (const view of viewsWithPoints) {
    const viewKey = view.toLowerCase()
    const bgImage = busViews[viewKey]
    if (!bgImage) continue

    const pts = damagePoints.filter(p => p.view === view)

    // Canvas erstellen
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 400
    const ctx = canvas.getContext('2d')

    // Hintergrund weiß
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 800, 400)

    // Bus-Bild laden
    await new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        // Bild proportional einpassen
        const ratio = img.width / img.height
        let dw = 800, dh = 800 / ratio
        if (dh > 400) { dh = 400; dw = 400 * ratio }
        const dx = (800 - dw) / 2
        const dy = (400 - dh) / 2
        ctx.drawImage(img, dx, dy, dw, dh)
        resolve()
      }
      img.onerror = resolve
      img.src = bgImage
    })

    // Markierungspunkte zeichnen – relativ zum eingepassten Bild
    // Die gespeicherten Koordinaten (p.x, p.y) sind % des sketch-canvas-wrap Containers
    // Der Container hat das Bus-Bild proportional eingepasst
    // Wir müssen dasselbe auf unserem Render-Canvas tun
    let imgOffsetX = 0, imgOffsetY = 0, imgW = 800, imgH = 400
    // Bereits in der onload-Closure berechnet – hier nochmal für die Punkte:
    await new Promise(resolve => {
      const img2 = new Image()
      img2.onload = () => {
        const ratio = img2.width / img2.height
        let dw = 800, dh = 800 / ratio
        if (dh > 400) { dh = 400; dw = 400 * ratio }
        imgOffsetX = (800 - dw) / 2
        imgOffsetY = (400 - dh) / 2
        imgW = dw
        imgH = dh
        resolve()
      }
      img2.onerror = resolve
      img2.src = bgImage
    })

    pts.forEach(p => {
      // p.x/p.y sind % relativ zum sketch-canvas-wrap (das das Bild enthält)
      // → auf unser Canvas-Bild-Bereich mappen
      const x = imgOffsetX + (p.x / 100) * imgW
      const y = imgOffsetY + (p.y / 100) * imgH

      ctx.beginPath()
      ctx.arc(x, y, 16, 0, Math.PI * 2)
      ctx.fillStyle = '#CC0000'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(p.id), x, y)
    })

    // View-Label
    ctx.fillStyle = 'rgba(26,92,42,0.85)'
    ctx.fillRect(0, 0, 120, 28)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 13px Arial'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(view.toUpperCase(), 10, 7)

    results[view] = canvas.toDataURL('image/jpeg', 0.85)
  }

  return results
}

// ─── KONTROLLE PDF ────────────────────────────────────────────────────────
export async function generateKontrollePDF(data, driver) {
  // Bilder komprimieren
  const [licensePhotoC, kmPhotoC, oelPhotoC, tankPhotoC] = await Promise.all([
    compressForPDF(data.licensePhoto),
    compressForPDF(data.kmPhoto),
    compressForPDF(data.oelPhoto),
    compressForPDF(data.tankPhoto),
  ])
  const busPhotosC = {}
  for (const [pos, img] of Object.entries(data.busPhotos || {})) {
    if (img) busPhotosC[pos] = await compressForPDF(img)
  }
  const d = { ...data, licensePhoto: licensePhotoC, kmPhoto: kmPhotoC, oelPhoto: oelPhotoC, tankPhoto: tankPhotoC, busPhotos: busPhotosC }

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  doc.setFillColor(...BG)
  doc.rect(0, 0, 210, 297, 'F')

  const isAbfahrt = d.type === 'abfahrt'
  let y = addHeader(doc, isAbfahrt ? 'Abfahrtskontrolle' : 'Ankunftskontrolle', `${d.bus} · ${d.datum} · ${d.uhrzeit}`)

  y = addSectionTitle(doc, y, 'Stammdaten')
  y = addTwoFields(doc, y, 'Fahrzeug', d.bus, 'Datum', d.datum)
  y = addTwoFields(doc, y, 'Fahrer', `${driver.nr} ${driver.name}`, 'Uhrzeit', d.uhrzeit)
  y = addTwoFields(doc, y, 'Fahrauftrag / Ziel', d.fahrauftrag || d.ziel || '—', 'Typ', isAbfahrt ? 'Abfahrtskontrolle' : 'Ankunftskontrolle')
  y = addDivider(doc, y)

  y = addSectionTitle(doc, y, 'Fahrzeugzustand')
  const tankMap = { voll: 'Voll', '3/4': '3/4', '1/2': '1/2', '1/4': '1/4', leer: 'Leer' }
  y = addTwoFields(doc, y, 'Kilometerstand', d.kmValue ? `${parseInt(d.kmValue).toLocaleString('de-AT')} km` : '—', 'Ölstand', d.oelStatus || '—')
  y = addTwoFields(doc, y, 'Tankstand', tankMap[d.tankStatus] || d.tankStatus || '—', 'Schäden', d.schaeden ? 'JA' : 'Nein')
  y = addDivider(doc, y)

  if (isAbfahrt && d.licensePhoto) {
    y = checkPageBreak(doc, y, 70)
    y = addSectionTitle(doc, y, 'Führerscheinfoto')
    const { h } = await addPhotoWithAspect(doc, 14, y, d.licensePhoto, 'Führerschein', 120, 70)
    y += h + 10
    y = addDivider(doc, y)
  }

  const positions = ['Vorne Mitte','Fahrerseite schräg vorne','Fahrerseite','Fahrerseite schräg hinten','Hinten','Beifahrerseite schräg hinten','Beifahrerseite','Beifahrerseite schräg vorne']
  y = checkPageBreak(doc, y, 60)
  y = addSectionTitle(doc, y, 'Rundum-Fotos (8 Positionen)')
  for (let i = 0; i < positions.length; i += 3) {
    y = checkPageBreak(doc, y, 55)
    const chunk = positions.slice(i, i + 3)
    y = await addPhotoRow(doc, y, chunk.map(p => d.busPhotos[p] || null), chunk, 42)
  }
  y = addDivider(doc, y)

  y = checkPageBreak(doc, y, 60)
  y = addSectionTitle(doc, y, 'Zustandsfotos')
  y = await addPhotoRow(doc, y, [d.kmPhoto, d.oelPhoto, d.tankPhoto], ['Kilometerstand', 'Ölstand', 'Tankstand'], 42)
  y = addDivider(doc, y)

  y = checkPageBreak(doc, y, 50)
  y = addSectionTitle(doc, y, 'Unterschrift')
  y = addSignature(doc, y, d.signature, `${driver.nr} ${driver.name}`)

  doc.setFontSize(6)
  doc.setTextColor(...TEXT3)
  doc.text(`Erstellt am ${new Date().toLocaleString('de-AT')} · BusCheck Ledermair`, 105, 292, { align: 'center' })

  return doc.output('datauristring')
}

// ─── UNFALLBERICHT PDF ────────────────────────────────────────────────────
export async function generateUnfallPDF(data, driver, busViews) {
  // Skizze mit Markierungen rendern
  let sketchImages = null
  if (data.damagePoints && data.damagePoints.length > 0 && busViews) {
    try { sketchImages = await renderSketchToImage(data.damagePoints, busViews) } catch(e) { console.warn('Sketch render failed:', e) }
  }

  // Fotos komprimieren
  const polizeiFotoC = await compressForPDF(data.polizeiFoto)
  const damagePhotosC = {}
  for (const [id, photos] of Object.entries(data.damagePhotos || {})) {
    if (photos?.length) damagePhotosC[id] = await Promise.all(photos.map(p => compressForPDF(p)))
  }
  const extraPhotosC = await Promise.all((data.extraPhotos || []).map(p => compressForPDF(p)))

  const d = { ...data, polizeiFoto: polizeiFotoC, damagePhotos: damagePhotosC, extraPhotos: extraPhotosC }

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  doc.setFillColor(...BG)
  doc.rect(0, 0, 210, 297, 'F')

  let y = addHeader(doc, 'Unfall-/Schadensmeldung', `${d.bus} · ${d.datum} · ${d.uhrzeit}`)

  doc.setFontSize(7)
  doc.setTextColor(...RED_D)
  doc.text('Basierend auf dem Europäischen Unfallbericht', 14, y)
  y += 8

  // Ort & Zeit
  y = addSectionTitle(doc, y, 'Ort & Zeit')
  y = addTwoFields(doc, y, 'Datum', d.datum, 'Uhrzeit', d.uhrzeit)
  y = addTwoFields(doc, y, 'Unfallort / Schadensort', d.ort, 'GPS', d.gps || '—')
  y = addDivider(doc, y)

  // Unser Fahrzeug
  y = addSectionTitle(doc, y, 'Fahrzeug 1 – Ledermair')
  y = addTwoFields(doc, y, 'Fahrzeug', d.bus, 'Fahrer', `${driver.nr} ${driver.name}`)
  y = addTwoFields(doc, y, 'Versicherung', d.unserVersicherung || '—', 'Polizeinummer', d.unserPolizeinummer || '—')
  y = addDivider(doc, y)

  // Gegner
  if (d.hatGegner) {
    y = addSectionTitle(doc, y, 'Fahrzeug 2 – Unfallgegner')
    y = addTwoFields(doc, y, 'Kennzeichen', d.gegnerKennzeichen || '—', 'Fahrer', d.gegnerFahrer || '—')
    if (d.gegnerAdresse) y = addField(doc, y, 'Adresse', d.gegnerAdresse)
    y = addTwoFields(doc, y, 'Telefon', d.gegnerTelefon || '—', 'E-Mail', d.gegnerEmail || '—')
    y = addTwoFields(doc, y, 'Versicherung', d.gegnerVersicherung || '—', 'Police-Nr.', d.gegnerVersicherungsNr || '—')
    y = addDivider(doc, y)
  } else {
    y = addSectionTitle(doc, y, 'Unfallgegner')
    y = addField(doc, y, 'Unfallgegner', 'Kein Unfallgegner / Eigenunfall')
    y = addDivider(doc, y)
  }

  if (d.zeugen) { y = addField(doc, y, 'Zeugen', d.zeugen); y = addDivider(doc, y) }

  // Polizei
  y = checkPageBreak(doc, y, 35)
  y = addSectionTitle(doc, y, 'Polizei')
  if (d.polizeiGerufen) {
    y = addTwoFields(doc, y, 'Polizei gerufen', 'JA', 'Dienststelle', d.polizeiDienststelle || '—')
    y = addTwoFields(doc, y, 'Aktenzeichen', d.polizeiAktenzeichen || '—', 'Ansprechpartner', d.polizeiAnsprechpartner || '—')
  } else {
    y = addField(doc, y, 'Polizei gerufen', 'Nein')
  }
  y = addDivider(doc, y)

  // Hergang
  y = checkPageBreak(doc, y, 40)
  y = addSectionTitle(doc, y, 'Unfallhergang / Schadenshergang')
  if (d.causes && d.causes.length > 0) y = addField(doc, y, 'Situationen', d.causes.join(', '))
  if (d.hergang) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT3)
    doc.text('Beschreibung:', 14, y)
    y += 4
    const lines = doc.splitTextToSize(d.hergang, 182)
    doc.setTextColor(...TEXT)
    lines.forEach(line => {
      y = checkPageBreak(doc, y, 6)
      doc.text(line, 14, y)
      y += 4.5
    })
    y += 2
  }
  y = addDivider(doc, y)

  // Skizze mit Markierungen
  y = checkPageBreak(doc, y, 60)
  y = addSectionTitle(doc, y, 'Fahrzeugskizze mit Schadenmarkierungen')
  if (sketchImages && Object.keys(sketchImages).length > 0) {
    for (const [view, imgData] of Object.entries(sketchImages)) {
      y = checkPageBreak(doc, y, 65)
      const { h } = await addPhotoWithAspect(doc, 14, y, imgData, view, 182, 80)
      y += h + 6
    }
  } else if (d.damagePoints && d.damagePoints.length > 0) {
    doc.setFontSize(7.5)
    doc.setTextColor(...TEXT)
    d.damagePoints.forEach(p => {
      doc.text(`• Punkt ${p.id}: ${p.view} (${Math.round(p.x)}% / ${Math.round(p.y)}%)`, 14, y)
      y += 5
    })
  } else {
    doc.setFontSize(8)
    doc.setTextColor(...TEXT3)
    doc.text('Keine Schadenmarkierungen gesetzt.', 14, y)
    y += 8
  }
  y = addDivider(doc, y)

  // Schadensfotos
  if (Object.keys(d.damagePhotos || {}).length > 0 || (d.extraPhotos || []).length > 0) {
    y = checkPageBreak(doc, y, 50)
    y = addSectionTitle(doc, y, 'Schadensfotos')
    for (const [pointId, photos] of Object.entries(d.damagePhotos || {})) {
      if (!photos?.length) continue
      y = checkPageBreak(doc, y, 10)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...RED_D)
      doc.text(`Schadenspunkt ${pointId}`, 14, y)
      y += 5
      for (let i = 0; i < photos.length; i += 3) {
        y = checkPageBreak(doc, y, 50)
        y = await addPhotoRow(doc, y, photos.slice(i, i + 3), photos.slice(i, i + 3).map((_, j) => `Foto ${i + j + 1}`), 42)
      }
    }
    if (d.extraPhotos?.length) {
      y = checkPageBreak(doc, y, 10)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...TEXT2)
      doc.text('Weitere Fotos', 14, y)
      y += 5
      for (let i = 0; i < d.extraPhotos.length; i += 3) {
        y = checkPageBreak(doc, y, 50)
        y = await addPhotoRow(doc, y, d.extraPhotos.slice(i, i + 3), d.extraPhotos.slice(i, i+3).map((_,j)=>`Foto ${i+j+1}`), 42)
      }
    }
    y = addDivider(doc, y)
  }

  // Unterschriften
  y = checkPageBreak(doc, y, 90)
  y = addSectionTitle(doc, y, 'Unterschriften')
  y = addSignature(doc, y, d.signature1 || null, `Fahrer: ${driver.nr} ${driver.name}`)
  y = addSignature(doc, y, d.signature2 || null, 'Unfallgegner / zweite beteiligte Person')

  doc.setFontSize(6)
  doc.setTextColor(...TEXT3)
  doc.text(`Erstellt am ${new Date().toLocaleString('de-AT')} · BusCheck Ledermair · Unfall-/Schadensmeldung`, 105, 292, { align: 'center' })

  return doc.output('datauristring')
}
