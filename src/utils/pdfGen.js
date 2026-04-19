import jsPDF from 'jspdf'
import { compressForPDF } from './helpers'

// ─── Colors ───────────────────────────────────────────────────────────────
const GOLD = [200, 165, 90]
const DARK = [14, 14, 15]
const GRAY = [50, 50, 55]
const WHITE = [240, 237, 232]
const RED = [217, 64, 64]
const GREEN = [61, 170, 106]

// ─── Helpers ──────────────────────────────────────────────────────────────
function addHeader(doc, title, subtitle) {
  // Background
  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 35, 'F')

  // Gold accent bar
  doc.setFillColor(...GOLD)
  doc.rect(0, 0, 6, 35, 'F')

  // Logo text
  doc.setTextColor(...GOLD)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('LEDERMAIR', 14, 14)

  doc.setTextColor(...WHITE)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('BusCheck – Fahrzeugkontrollsystem', 14, 20)

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(title, 14, 30)

  if (subtitle) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GOLD)
    doc.text(subtitle, 14, 35.5)
  }

  return 45
}

function addSectionTitle(doc, y, title, icon = '') {
  doc.setFillColor(30, 30, 33)
  doc.roundedRect(10, y, 190, 8, 2, 2, 'F')
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.3)
  doc.line(10, y + 8, 200, y + 8)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD)
  doc.text((icon ? icon + '  ' : '') + title.toUpperCase(), 14, y + 5.5)
  return y + 13
}

function addField(doc, y, label, value, highlight = false) {
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 115, 110)
  doc.text(label, 14, y)

  doc.setFont('helvetica', highlight ? 'bold' : 'normal')
  if (highlight) { doc.setTextColor(...GOLD) } else { doc.setTextColor(...WHITE) }
  doc.text(String(value || '—'), 14, y + 5)
  return y + 11
}

function addTwoFields(doc, y, l1, v1, l2, v2) {
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 115, 110)
  doc.text(l1, 14, y)
  doc.text(l2, 110, y)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...WHITE)
  doc.text(String(v1 || '—'), 14, y + 5)
  doc.text(String(v2 || '—'), 110, y + 5)
  return y + 11
}

function addDivider(doc, y) {
  doc.setDrawColor(40, 40, 44)
  doc.setLineWidth(0.3)
  doc.line(10, y, 200, y)
  return y + 4
}

function addPhoto(doc, y, imgData, label, width = 85, height = 55) {
  if (!imgData) return y
  try {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 115, 110)
    doc.text(label, 14, y + 3)

    doc.setFillColor(30, 30, 33)
    doc.roundedRect(14, y + 5, width, height, 2, 2, 'F')
    doc.addImage(imgData, 'JPEG', 14, y + 5, width, height)

    return y + height + 10
  } catch (e) {
    console.warn('Photo embed failed:', e)
    return y
  }
}

function addPhotoRow(doc, y, photos, labels) {
  // Up to 3 photos per row, each ~58mm wide
  const w = 56, h = 38, gap = 4, startX = 14
  photos.forEach((img, i) => {
    if (!img) return
    const x = startX + i * (w + gap)
    try {
      doc.setFillColor(30, 30, 33)
      doc.roundedRect(x, y, w, h, 2, 2, 'F')
      doc.addImage(img, 'JPEG', x, y, w, h)
      doc.setFontSize(6)
      doc.setTextColor(120, 115, 110)
      doc.text(labels[i] || '', x, y + h + 3)
    } catch (e) {
      console.warn('Photo embed failed:', e)
    }
  })
  return y + h + 8
}

function addSignature(doc, y, sigData, label) {
  y = checkPageBreak(doc, y, 45)

  // Label
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 115, 110)
  doc.text(label, 14, y)

  // Weißes Unterschriftsfeld
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(14, y + 3, 120, 30, 2, 2, 'F')

  // Unterschrift einfügen wenn vorhanden
  if (sigData) {
    try {
      doc.addImage(sigData, 'PNG', 16, y + 4, 116, 28)
    } catch (e) {
      // Fallback: Hinweis
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text('Unterschrift digital erfasst', 20, y + 20)
    }
  } else {
    // Leeres Feld mit Hinweis
    doc.setFontSize(7)
    doc.setTextColor(180, 180, 180)
    doc.text('Unterschrift', 74, y + 19, { align: 'center' })
  }

  // Unterschriftslinie
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.4)
  doc.line(14, y + 29, 134, y + 29)

  // Datum + Name unter der Linie
  const heute = new Date().toLocaleDateString('de-AT')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 115, 110)
  doc.text(`Datum: ${heute}`, 14, y + 34)
  doc.text(label, 134, y + 34, { align: 'right' })

  // Grüner Haken wenn unterschrieben
  if (sigData) {
    doc.setFillColor(26, 92, 42)
    doc.circle(140, y + 16, 4, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.text('✓', 140, y + 18, { align: 'center' })
  }

  return y + 40
}

function checkPageBreak(doc, y, needed = 40) {
  if (y + needed > 285) {
    doc.addPage()
    doc.setFillColor(...DARK)
    doc.rect(0, 0, 210, 297, 'F')
    return 15
  }
  return y
}

// ─── KONTROLLE PDF ────────────────────────────────────────────────────────
export async function generateKontrollePDF(data, driver) {
  // ── Alle Bilder vor PDF-Erstellung komprimieren (spart 60-80% Größe)
  const [
    licensePhotoC,
    kmPhotoC,
    oelPhotoC,
    tankPhotoC,
  ] = await Promise.all([
    compressForPDF(data.licensePhoto),
    compressForPDF(data.kmPhoto),
    compressForPDF(data.oelPhoto),
    compressForPDF(data.tankPhoto),
  ])

  // Bus-Fotos komprimieren
  const busPhotosC = {}
  for (const [pos, img] of Object.entries(data.busPhotos || {})) {
    if (img) busPhotosC[pos] = await compressForPDF(img)
  }

  // Komprimierte Daten verwenden
  const d = {
    ...data,
    licensePhoto: licensePhotoC,
    kmPhoto: kmPhotoC,
    oelPhoto: oelPhotoC,
    tankPhoto: tankPhotoC,
    busPhotos: busPhotosC,
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

  // Dark background
  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 297, 'F')

  const isAbfahrt = d.type === 'abfahrt'
  let y = addHeader(
    doc,
    isAbfahrt ? 'Abfahrtskontrolle' : 'Ankunftskontrolle',
    `${d.bus} · ${d.datum} · ${d.uhrzeit}`
  )

  // ── Stammdaten
  y = addSectionTitle(doc, y, 'Stammdaten', '📋')
  y = addTwoFields(doc, y, 'Fahrzeug', d.bus, 'Datum', d.datum)
  y = addTwoFields(doc, y, 'Fahrer', `${driver.nr} ${driver.name}`, 'Uhrzeit', d.uhrzeit)
  y = addTwoFields(
    doc,
    y,
    'Fahrauftrag / Ziel',
    d.fahrauftrag || d.ziel || '—',
    'Typ',
    isAbfahrt ? 'Abfahrtskontrolle' : 'Ankunftskontrolle'
  )
  y = addDivider(doc, y)

  // ── Zustandsdaten
  y = addSectionTitle(doc, y, 'Fahrzeugzustand', '🔍')

  const oelColor =
    d.oelStatus === 'OK' ? [...GREEN] : d.oelStatus ? [...RED] : [...WHITE]
  const tankMap = { voll: '████████ Voll', '3/4': '██████░░ 3/4', '1/2': '████░░░░ 1/2', '1/4': '██░░░░░░ 1/4', leer: '░░░░░░░░ Leer' }

  y = addTwoFields(doc, y, 'Kilometerstand', d.kmValue ? `${parseInt(d.kmValue).toLocaleString('de-AT')} km` : '—', 'Ölstand', d.oelStatus || '—')
  y = addTwoFields(doc, y, 'Tankstand', tankMap[d.tankStatus] || d.tankStatus || '—', 'Schäden', d.schaeden ? 'JA – Schadenerfassung erfolgt' : 'Nein')
  y = addDivider(doc, y)

  // ── Führerscheinfoto (Abfahrt only)
  if (isAbfahrt && d.licensePhoto) {
    y = checkPageBreak(doc, y, 70)
    y = addSectionTitle(doc, y, 'Führerscheinfoto', '🪪')
    y = addPhoto(doc, y, d.licensePhoto, 'Führerschein des Fahrers', 120, 75)
    y = addDivider(doc, y)
  }

  // ── Bus-Fotos (8 Positionen)
  const positions = [
    'Vorne Mitte', 'Fahrerseite schräg vorne', 'Fahrerseite',
    'Fahrerseite schräg hinten', 'Hinten', 'Beifahrerseite schräg hinten',
    'Beifahrerseite', 'Beifahrerseite schräg vorne'
  ]

  const photoChunks = []
  for (let i = 0; i < positions.length; i += 3) {
    photoChunks.push(positions.slice(i, i + 3))
  }

  y = checkPageBreak(doc, y, 60)
  y = addSectionTitle(doc, y, 'Rundum-Fotos Fahrzeug (8 Positionen)', '📸')

  for (const chunk of photoChunks) {
    y = checkPageBreak(doc, y, 50)
    const imgs = chunk.map((pos) => d.busPhotos[pos] || null)
    y = addPhotoRow(doc, y, imgs, chunk)
  }
  y = addDivider(doc, y)

  // ── Zustandsfotos
  y = checkPageBreak(doc, y, 60)
  y = addSectionTitle(doc, y, 'Zustandsfotos', '📷')
  const statePhotos = [d.kmPhoto, d.oelPhoto, d.tankPhoto].filter(Boolean)
  const stateLabels = ['Kilometerstand', 'Ölstand', 'Tankstand']
  if (statePhotos.length > 0) {
    y = addPhotoRow(doc, y, [d.kmPhoto, d.oelPhoto, d.tankPhoto], stateLabels)
  }
  y = addDivider(doc, y)

  // ── Unterschrift
  y = checkPageBreak(doc, y, 40)
  y = addSectionTitle(doc, y, 'Digitale Unterschrift', '✍️')
  y = addSignature(doc, y, d.signature, `${driver.nr} ${driver.name}`)

  // ── Footer
  doc.setFontSize(6.5)
  doc.setTextColor(60, 60, 65)
  doc.text(
    `Erstellt am ${new Date().toLocaleString('de-AT')} · BusCheck Ledermair · Dieses Dokument ist automatisch erzeugt.`,
    105,
    292,
    { align: 'center' }
  )

  return doc.output('datauristring')
}

// ─── UNFALLBERICHT PDF ────────────────────────────────────────────────────
export async function generateUnfallPDF(data, driver) {
  // ── Alle Bilder komprimieren
  const polizeiFotoC = await compressForPDF(data.polizeiFoto)

  const damagePhotosC = {}
  for (const [id, photos] of Object.entries(data.damagePhotos || {})) {
    if (photos?.length) {
      damagePhotosC[id] = await Promise.all(photos.map(p => compressForPDF(p)))
    }
  }
  const extraPhotosC = await Promise.all((data.extraPhotos || []).map(p => compressForPDF(p)))

  const d = {
    ...data,
    polizeiFoto: polizeiFotoC,
    damagePhotos: damagePhotosC,
    extraPhotos: extraPhotosC,
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 297, 'F')

  let y = addHeader(doc, 'Unfall-/Schadensmeldung', `${d.bus || d.fahrer} · ${d.datum} · ${d.uhrzeit}`)

  doc.setFontSize(7)
  doc.setTextColor(...RED)
  doc.text('⚠  UNFALLBERICHT – basierend auf dem Europäischen Unfall-/Schadensmeldung', 14, 41)
  y = 50

  // ── Grunddaten
  y = addSectionTitle(doc, y, 'Ort & Zeit', '📍')
  y = addTwoFields(doc, y, 'Datum', d.datum, 'Uhrzeit', d.uhrzeit)
  y = addTwoFields(doc, y, 'Unfallort', d.ort, 'GPS-Koordinaten', d.gps || '—')
  y = addDivider(doc, y)

  // ── Unser Fahrzeug
  y = addSectionTitle(doc, y, 'Fahrzeug 1 – Ledermair', '🚌')
  y = addTwoFields(doc, y, 'Fahrzeug / Kennzeichen', d.bus, 'Fahrer', `${driver.nr} ${driver.name}`)
  y = addTwoFields(doc, y, 'Versicherung', d.unserVersicherung || '—', 'Polizeinummer', d.unserPolizeinummer || '—')
  y = addDivider(doc, y)

  // ── Gegner (nur wenn vorhanden)
  if (d.hatGegner) {
    y = addSectionTitle(doc, y, 'Fahrzeug 2 – Unfallgegner', '🚗')
    y = addTwoFields(doc, y, 'Kennzeichen', d.gegnerKennzeichen || '—', 'Fahrer / Name', d.gegnerFahrer || '—')
    if (d.gegnerAdresse) y = addField(doc, y, 'Adresse', d.gegnerAdresse)
    y = addTwoFields(doc, y, 'Telefon', d.gegnerTelefon || '—', 'E-Mail', d.gegnerEmail || '—')
    y = addTwoFields(doc, y, 'Versicherung', d.gegnerVersicherung || '—', 'Police-Nr.', d.gegnerVersicherungsNr || '—')
    y = addDivider(doc, y)
  } else {
    y = addSectionTitle(doc, y, 'Unfallgegner', '🚗')
    y = addField(doc, y, 'Unfallgegner', 'Kein Unfallgegner / Eigenunfall')
    y = addDivider(doc, y)
  }
  if (d.zeugen) {
    y = addField(doc, y, 'Zeugen', d.zeugen)
  }

  // ── Polizei
  y = checkPageBreak(doc, y, 40)
  y = addSectionTitle(doc, y, 'Polizei', '🚔')
  if (d.polizeiGerufen) {
    y = addTwoFields(doc, y, 'Polizei verständigt', 'JA', 'Dienststelle', d.polizeiDienststelle)
    y = addTwoFields(doc, y, 'Aktenzeichen', d.polizeiAktenzeichen, 'Ansprechpartner', d.polizeiAnsprechpartner)
  } else {
    y = addField(doc, y, 'Polizei verständigt', 'Nein')
  }
  y = addDivider(doc, y)

  // ── Unfallhergang / Schadenshergang
  y = checkPageBreak(doc, y, 50)
  y = addSectionTitle(doc, y, 'Unfallhergang / Schadenshergang', '📝')
  if (d.causes && d.causes.length > 0) {
    y = addField(doc, y, 'Situationsauswahl', d.causes.join(', '))
  }
  if (d.hergang) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 115, 110)
    doc.text('Beschreibung:', 14, y)
    y += 5
    const lines = doc.splitTextToSize(d.hergang, 182)
    doc.setTextColor(...WHITE)
    doc.text(lines, 14, y)
    y += lines.length * 4.5 + 4
  }
  y = addDivider(doc, y)

  // ── Fahrzeugskizze
  y = checkPageBreak(doc, y, 60)
  y = addSectionTitle(doc, y, 'Fahrzeugskizze mit Schadenmarkierungen', '🗺️')

  if (d.sketchImage) {
    y = addPhoto(doc, y, d.sketchImage, 'Schadenmarkierung auf Fahrzeugskizze', 180, 80)
  } else {
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 85)
    doc.text('Keine Skizze erfasst.', 14, y)
    y += 8
  }
  y = addDivider(doc, y)

  // ── Schadensfotos
  if (d.damagePhotos && Object.keys(d.damagePhotos).length > 0) {
    y = checkPageBreak(doc, y, 60)
    y = addSectionTitle(doc, y, 'Schadensfotos', '📷')
    for (const [pointId, photos] of Object.entries(d.damagePhotos)) {
      if (!photos || photos.length === 0) continue
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...RED)
      doc.text(`Schadenspunkt ${pointId}`, 14, y)
      y += 5
      for (let i = 0; i < photos.length; i += 3) {
        y = checkPageBreak(doc, y, 45)
        const chunk = photos.slice(i, i + 3)
        const labels = chunk.map((_, idx) => `Foto ${i + idx + 1}`)
        y = addPhotoRow(doc, y, chunk, labels)
      }
    }
    if (d.extraPhotos && d.extraPhotos.length > 0) {
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(120, 115, 110)
      doc.text('Weitere Übersichtsfotos:', 14, y)
      y += 5
      for (let i = 0; i < d.extraPhotos.length; i += 3) {
        y = checkPageBreak(doc, y, 45)
        const chunk = d.extraPhotos.slice(i, i + 3)
        y = addPhotoRow(doc, y, chunk, chunk.map((_, idx) => `Foto ${i + idx + 1}`))
      }
    }
    y = addDivider(doc, y)
  }

  // ── Unterschriften – immer anzeigen
  y = checkPageBreak(doc, y, 100)
  y = addSectionTitle(doc, y, 'Unterschriften', '✍️')

  // Fahrer-Unterschrift immer (mit oder ohne Inhalt)
  y = addSignature(doc, y, d.signature1 || null, `Fahrer: ${driver.nr} ${driver.name}`)

  // Unfallgegner-Unterschrift immer als Feld anzeigen
  y = addSignature(doc, y, d.signature2 || null, 'Unfallgegner / zweite beteiligte Person')

  // Footer
  doc.setFontSize(6.5)
  doc.setTextColor(60, 60, 65)
  doc.text(
    `Erstellt am ${new Date().toLocaleString('de-AT')} · BusCheck Ledermair · Unfall-/Schadensmeldung gemäß Europäischem Unfall-/Schadensmeldung`,
    105,
    292,
    { align: 'center' }
  )

  return doc.output('datauristring')
}
