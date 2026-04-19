import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ScreenHeader, PhotoSlot, ToggleGroup, FieldGroup, Card,
  SignaturePad, CauseTagGroup, VehicleSketch, DateTimePicker
} from '../components'
import { useAppStore, useFormStore } from '../store'
import { LOGO_B64, BUS_VIEWS } from '../brand'
import { openCamera, ocrKilometerstand, getGPS, sendPDF, formatFilename, compressForPDF } from '../utils/helpers'
import { generateKontrollePDF, generateUnfallPDF } from '../utils/pdfGen'

const BUS_POSITIONS = [
  'Vorne Mitte', 'Fahrerseite schräg vorne', 'Fahrerseite',
  'Fahrerseite schräg hinten', 'Hinten', 'Beifahrerseite schräg hinten',
  'Beifahrerseite', 'Beifahrerseite schräg vorne',
]

// ─── HOME ─────────────────────────────────────────────────────────────────
export function HomeScreen() {
  const nav = useNavigate()
  const driver = useAppStore(s => s.driver)
  const pendingQueue = useAppStore(s => s.pendingQueue)
  const removeFromQueue = useAppStore(s => s.removeFromQueue)
  const clearQueue = useAppStore(s => s.clearQueue)
  const resetKontrolle = useFormStore(s => s.resetKontrolle)
  const resetUnfall = useFormStore(s => s.resetUnfall)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // Redirect to setup if no driver selected
  useEffect(() => {
    if (!driver) nav('/setup', { replace: true })
  }, [driver, nav])

  if (!driver) return null

  const initials = driver.name.split(' ').map(n => n[0]).join('')

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100vw',
      height: 'var(--real-vh, 100vh)',
      background: 'var(--dark)', overflow: 'hidden',
    }}>
      {!isOnline && (
        <div className="offline-banner">
          📵 Offline – {pendingQueue.length > 0 ? `${pendingQueue.length} Bericht(e) ausstehend` : 'Daten werden lokal gespeichert'}
        </div>
      )}
      <div style={{
        position: 'absolute',
        top: !isOnline ? 32 : 0, left: 0, right: 0, bottom: 0,
        overflowY: 'scroll',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
      }}>
        <div className="home-hero">
          <img src={LOGO_B64} alt="Ledermair" className="home-logo-img" />
          <div className="home-sub" style={{ marginTop: 6 }}>BusCheck · Fahrzeugkontrolle</div>
          <div className="home-red-line" />
        </div>

        <div className="driver-badge">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="d-avatar">{initials}</div>
            <div>
              <div className="d-name">{driver.name}</div>
              <div className="d-nr">Personalnr. {driver.nr}</div>
            </div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--gold)', cursor: 'pointer' }} onClick={() => nav('/setup')}>Ändern</span>
        </div>

        {pendingQueue.length > 0 && (
          <div style={{ padding: '12px 16px 0' }}>
            <div className="info-chip" style={{ flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span>⏳</span>
                <span>
                  {pendingQueue.length} Bericht(e) konnten nicht gesendet werden.
                  {navigator.onLine ? ' Erneuter Versand läuft…' : ' Kein Internet – wird gesendet sobald Verbindung besteht.'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div
                  onClick={() => {
                    pendingQueue.forEach(async (item) => {
                      try {
                        const res = await fetch('/api/send-email', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(item),
                        })
                        if (res.ok) removeFromQueue(item.id)
                      } catch {}
                    })
                  }}
                  style={{
                    flex: 1, padding: '8px 12px', background: 'rgba(26,92,42,0.15)',
                    border: '1px solid rgba(26,92,42,0.3)', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, color: '#7DC48A',
                    cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  ↺ Erneut senden
                </div>
                <div
                  onClick={() => {
                    if (window.confirm(`${pendingQueue.length} ausstehende Berichte löschen? Diese können nicht mehr gesendet werden.`)) {
                      clearQueue()
                    }
                  }}
                  style={{
                    flex: 1, padding: '8px 12px', background: 'rgba(204,0,0,0.1)',
                    border: '1px solid rgba(204,0,0,0.2)', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, color: 'rgba(255,100,100,0.8)',
                    cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  ✕ Löschen
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '14px 16px 0' }}>
          <div className="main-card gold-card" onClick={() => { resetKontrolle('abfahrt'); nav('/abfahrt/1') }}>
            <div className="mc-icon ic-gold">🚌</div>
            <div>
              <div className="mc-label">Abfahrtskontrolle</div>
              <div className="mc-sub">Vor der Abfahrt durchführen</div>
            </div>
            <div className="mc-arrow">›</div>
          </div>

          <div className="main-card" onClick={() => { resetKontrolle('ankunft'); nav('/ankunft/1') }}>
            <div className="mc-icon ic-green">🏁</div>
            <div>
              <div className="mc-label">Ankunftskontrolle</div>
              <div className="mc-sub">Nach der Ankunft durchführen</div>
            </div>
            <div className="mc-arrow">›</div>
          </div>

          <div className="main-card red-card" onClick={() => { resetUnfall(); nav('/unfall/1') }}>
            <div className="mc-icon ic-red">⚠️</div>
            <div>
              <div className="mc-label">Unfall-/Schadensmeldung</div>
              <div className="mc-sub">Schaden oder Unfall melden</div>
            </div>
            <div className="mc-arrow">›</div>
          </div>
        </div>

        <div style={{ padding: '14px 16px 0', textAlign: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => nav('/admin')}>
            ⚙ Verwaltung
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 8px' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => nav('/install')}>
            📲 Installationshilfe
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 8px' }}>·</span>
          <span style={{ fontSize: 11, color: isOnline ? 'var(--green)' : 'var(--red)' }}>
            {isOnline ? '● Online' : '● Offline'}
          </span>
        </div>

        {/* Beenden */}
        <div style={{ padding: '12px 16px 36px' }}>
          <div
            onClick={() => {
              if (window.confirm('BusCheck beenden?')) {
                window.close()
                document.body.innerHTML = `<div style="background:#0D1A0F;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;color:#F0EDE8;gap:16px;"><div style="font-size:40px">✓</div><div style="font-size:18px;font-weight:700;color:#F5D800">BusCheck beendet</div><div style="font-size:13px;color:#5A6B5C">Du kannst dieses Fenster jetzt schließen.</div></div>`
              }
            }}
            style={{
              border: '1px solid rgba(204,0,0,0.2)',
              borderRadius: 12,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              color: 'rgba(255,100,100,0.55)',
              fontSize: 13,
              fontWeight: 600,
              marginTop: 8,
              userSelect: 'none',
            }}
          >
            <span>✕</span>
            <span>App beenden</span>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── DRIVER SETUP ─────────────────────────────────────────────────────────
export function DriverSetup() {
  const nav = useNavigate()
  const driver = useAppStore(s => s.driver)
  const setDriver = useAppStore(s => s.setDriver)
  const settings = useAppStore(s => s.settings)
  const [selected, setSelected] = useState(driver?.nr || '')
  const [email, setEmail] = useState(driver?.email || '')

  const confirm = () => {
    const d = settings.drivers.find(d => d.nr === selected)
    if (!d) return
    setDriver({ ...d, email })
    nav('/')
  }

  return (
    <div className="app-shell">
      <ScreenHeader title="Fahrer auswählen" subtitle="Einmalig – wird auf diesem Gerät gespeichert" />
      <div className="screen-body">
        <div className="info-chip">
          <span>ℹ️</span>
          <span>Wähle deinen Eintrag aus. Die Auswahl wird gespeichert und beim nächsten Start automatisch voreingestellt.</span>
        </div>
        {settings.drivers.map(d => (
          <div key={d.nr} className={`driver-opt ${selected === d.nr ? 'sel' : ''}`} onClick={() => setSelected(d.nr)}>
            <div className="d-avatar">{d.name.split(' ').map(n => n[0]).join('')}</div>
            <div>
              <div className="d-name">{d.name}</div>
              <div className="d-nr">Personalnr. {d.nr}</div>
            </div>
            {selected === d.nr && <span style={{ marginLeft: 'auto', color: 'var(--gold)' }}>✓</span>}
          </div>
        ))}
        <div style={{ marginTop: 16 }}>
          <FieldGroup label="E-Mail-Adresse (optional – für PDF-Kopie)">
            <input className="field-input" type="email" placeholder="deine@email.at"
              value={email} onChange={e => setEmail(e.target.value)} />
          </FieldGroup>
        </div>
      </div>
      <div className="screen-footer">
        <button className="btn-primary" disabled={!selected} onClick={confirm}>Weiter →</button>
      </div>
    </div>
  )
}

// ─── KONTROLLE STEP 1 – Grunddaten ───────────────────────────────────────
export function KontrolleStep1({ isAbfahrt = true }) {
  const nav = useNavigate()
  const driver = useAppStore(s => s.driver)
  const settings = useAppStore(s => s.settings)
  const kontrolle = useFormStore(s => s.kontrolle)
  const setKontrolle = useFormStore(s => s.setKontrolle)
  const totalSteps = isAbfahrt ? 6 : 5
  const isValid = !!kontrolle.bus && !!(kontrolle.fahrauftrag || kontrolle.ziel)

  return (
    <div className="app-shell">
      <ScreenHeader
        title={isAbfahrt ? 'Abfahrtskontrolle' : 'Ankunftskontrolle'}
        subtitle={`Schritt 1 von ${totalSteps} · Grunddaten`}
        onBack={() => nav('/')}
        progress={(1 / totalSteps) * 100}
      />
      <div className="screen-body fade-up">
        <Card icon="🚌" title="Fahrzeug & Einsatz">
          <FieldGroup label="Bus auswählen" required>
            <select className="field-input" value={kontrolle.bus} onChange={e => setKontrolle({ bus: e.target.value })}>
              <option value="">— Bitte auswählen —</option>
              {settings.buses.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </FieldGroup>
          <DateTimePicker
            datum={kontrolle.datum}
            uhrzeit={kontrolle.uhrzeit}
            onChangeDatum={d => setKontrolle({ datum: d })}
            onChangeUhrzeit={u => setKontrolle({ uhrzeit: u })}
          />
          <FieldGroup label="Fahrer">
            <div className="field-input auto">{driver?.nr} {driver?.name}</div>
          </FieldGroup>
        </Card>

        <Card icon="📋" title="Fahrauftrag">
          <FieldGroup label="Auftragsnummer">
            <input className="field-input" type="text" placeholder="z. B. 2026-04181"
              value={kontrolle.fahrauftrag} onChange={e => setKontrolle({ fahrauftrag: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="oder Ziel">
            <input className="field-input" type="text" placeholder="z. B. Salzburg Hbf"
              value={kontrolle.ziel} onChange={e => setKontrolle({ ziel: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="E-Mail für PDF-Kopie (optional)">
            <input className="field-input" type="email" placeholder={driver?.email || 'fahrer@ledermair.at'}
              value={kontrolle.emailKopie} onChange={e => setKontrolle({ emailKopie: e.target.value })} />
          </FieldGroup>
        </Card>
      </div>
      <div className="screen-footer">
        <button className="btn-primary" disabled={!isValid}
          onClick={() => nav(isAbfahrt ? '/abfahrt/2' : '/ankunft/2')}>
          Weiter{isAbfahrt ? ': Führerscheinfoto' : ': Rundum-Fotos'} →
        </button>
      </div>
    </div>
  )
}

// ─── ABFAHRT STEP 2 – Führerscheinfoto ───────────────────────────────────
export function AbfahrtStep2() {
  const nav = useNavigate()
  const driver = useAppStore(s => s.driver)
  const needsLicensePhoto = useAppStore(s => s.needsLicensePhoto)
  const setLicensePhotoDate = useAppStore(s => s.setLicensePhotoDate)
  const setLicensePhotoStore = useAppStore(s => s.setLicensePhoto)
  const getLicensePhoto = useAppStore(s => s.getLicensePhoto)
  const kontrolle = useFormStore(s => s.kontrolle)
  const setKontrolle = useFormStore(s => s.setKontrolle)

  // Direkt beim Render prüfen – kein useEffect, kein Spinner
  const needsPhoto = needsLicensePhoto(driver?.nr)
  const savedPhoto = getLicensePhoto(driver?.nr)

  // Wenn kein Foto nötig → sofort weiterleiten via useEffect
  useEffect(() => {
    if (!needsPhoto) {
      if (savedPhoto) setKontrolle({ licensePhoto: savedPhoto })
      nav('/abfahrt/3', { replace: true })
    }
  }, [needsPhoto])

  const handleNewPhoto = async (img) => {
    setKontrolle({ licensePhoto: img })
    if (img && driver?.nr) {
      const ym = new Date().toISOString().slice(0, 7)
      setLicensePhotoDate(driver.nr, ym)
      // Stark komprimieren für localStorage (max 400px, Q 0.5)
      try {
        // Scheckkarten-Größe: 85×54mm → max 340×216px
        const compressed = await compressForPDF(img, 340, 0.55)
        setLicensePhotoStore(driver.nr, compressed || img)
      } catch {
        setLicensePhotoStore(driver.nr, img)
      }
    }
  }

  const handleUseSaved = () => {
    setKontrolle({ licensePhoto: savedPhoto })
    const ym = new Date().toISOString().slice(0, 7)
    if (driver?.nr) setLicensePhotoDate(driver.nr, ym)
    nav('/abfahrt/3')
  }

  // Wenn kein Foto nötig – nichts rendern (useEffect leitet weiter)
  if (!needsPhoto) return null

  const hasNewPhoto = !!(kontrolle.licensePhoto && kontrolle.licensePhoto !== savedPhoto)
  const hasSavedSelected = !!(kontrolle.licensePhoto && kontrolle.licensePhoto === savedPhoto)
  const canProceed = !!kontrolle.licensePhoto

  return (
    <div className="app-shell">
      <ScreenHeader
        title="Führerscheinfoto"
        subtitle="Schritt 2 von 6 · Pflicht einmal pro Monat"
        onBack={() => nav('/abfahrt/1')}
        progress={2 / 6 * 100}
      />
      <div className="screen-body fade-up">
        <div className="info-chip">
          <span>📅</span>
          <span>
            Für <strong>{driver?.name}</strong> wurde im{' '}
            {new Date().toLocaleString('de-AT', { month: 'long' })}{' '}
            noch kein Führerscheinfoto erfasst.
          </span>
        </div>

        {/* Option A: Letztes Foto übernehmen */}
        {savedPhoto && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
            }}>
              Option A · Letztes Foto vom Vormonat übernehmen
            </div>
            <div
              onClick={hasSavedSelected ? undefined : handleUseSaved}
              style={{
                borderRadius: 10, overflow: 'hidden',
                border: `2px solid ${hasSavedSelected ? 'var(--green-light)' : 'rgba(255,255,255,0.1)'}`,
                position: 'relative',
                cursor: hasSavedSelected ? 'default' : 'pointer',
              }}
            >
              <img src={savedPhoto} alt="Letztes Führerscheinfoto"
                style={{ width: '100%', display: 'block', maxHeight: 160, objectFit: 'cover' }} />
              {hasSavedSelected ? (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'var(--green)', borderRadius: '50%',
                  width: 28, height: 28, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: '#fff', fontWeight: 700,
                }}>✓</div>
              ) : (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    background: 'var(--green)', color: '#fff',
                    padding: '8px 20px', borderRadius: 20,
                    fontSize: 13, fontWeight: 700,
                  }}>Foto übernehmen</div>
                </div>
              )}
            </div>
            {hasSavedSelected && (
              <div style={{ fontSize: 12, color: 'var(--green-light)', marginTop: 6, textAlign: 'center' }}>
                ✓ Letztes Foto wird verwendet
              </div>
            )}
          </div>
        )}

        {/* Option B: Neues Foto */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
          }}>
            {savedPhoto ? 'Option B · Neues Foto aufnehmen' : 'Führerschein fotografieren'}
          </div>
          <PhotoSlot
            label="Führerschein fotografieren"
            value={hasNewPhoto ? kontrolle.licensePhoto : null}
            onChange={handleNewPhoto}
            wide
          />
          {hasNewPhoto && (
            <div style={{ fontSize: 12, color: 'var(--green-light)', marginTop: 6, textAlign: 'center' }}>
              ✓ Neues Foto aufgenommen
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.6 }}>
          Beide Seiten des Führerscheins sollten gut lesbar sein.
        </div>
      </div>
      <div className="screen-footer">
        <button className="btn-primary" disabled={!canProceed} onClick={() => nav('/abfahrt/3')}>
          Weiter: Rundum-Fotos →
        </button>
      </div>
    </div>
  )
}

// ─── STEP 3 – 8 Bus-Fotos ────────────────────────────────────────────────
export function KontrolleStep3({ isAbfahrt = true }) {
  const nav = useNavigate()
  const needsLicensePhoto = useAppStore(s => s.needsLicensePhoto)
  const driver = useAppStore(s => s.driver)
  const kontrolle = useFormStore(s => s.kontrolle)
  const setKontrolle = useFormStore(s => s.setKontrolle)
  const photos = kontrolle.busPhotos || {}
  const doneCount = Object.values(photos).filter(Boolean).length
  const isValid = doneCount === 8
  const step = isAbfahrt ? 3 : 2
  const total = isAbfahrt ? 6 : 5

  // Zurück: bei Abfahrt → Schritt 2 wenn Führerschein nötig war, sonst Schritt 1
  const handleBack = () => {
    if (isAbfahrt) {
      const needed = needsLicensePhoto(driver?.nr)
      nav(needed ? '/abfahrt/2' : '/abfahrt/1')
    } else {
      nav('/ankunft/1')
    }
  }

  const setPhoto = useCallback((pos, img) => {
    setKontrolle({ busPhotos: { ...photos, [pos]: img } })
  }, [photos, setKontrolle])

  return (
    <div className="app-shell">
      <ScreenHeader
        title="Rundum-Fotos"
        subtitle={`Schritt ${step} von ${total} · 8 Pflichtpositionen im Uhrzeigersinn`}
        onBack={handleBack}
        progress={step / total * 100}
      />
      <div className="screen-body fade-up">
        <div className="info-chip">
          <span>📷</span>
          <span>Alle 8 Positionen sind Pflicht. Tippen zum Aufnehmen, erneut tippen zum Löschen.</span>
        </div>
        <div className="photo-grid-2">
          {BUS_POSITIONS.map((pos, i) => (
            <PhotoSlot key={pos} label={`${i + 1} · ${pos}`}
              value={photos[pos] || null}
              onChange={(img) => setPhoto(pos, img)} />
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: doneCount === 8 ? 'var(--green)' : 'var(--text-muted)' }}>
          {doneCount} von 8 Fotos aufgenommen {doneCount === 8 ? '✓' : ''}
        </div>
      </div>
      <div className="screen-footer">
        <button className="btn-primary" disabled={!isValid}
          onClick={() => nav(isAbfahrt ? '/abfahrt/4' : '/ankunft/3')}>
          Weiter: Kilometerstand →
        </button>
      </div>
    </div>
  )
}

// ─── STEP 4 – KM / Öl / Tank / Schäden ──────────────────────────────────
export function KontrolleStep4({ isAbfahrt = true }) {
  const nav = useNavigate()
  const kontrolle = useFormStore(s => s.kontrolle)
  const setKontrolle = useFormStore(s => s.setKontrolle)
  const [ocrLoading, setOcrLoading] = useState(false)
  const step = isAbfahrt ? 4 : 3
  const total = isAbfahrt ? 6 : 5

  const handleKmPhoto = useCallback(async (img) => {
    setKontrolle({ kmPhoto: img })
    if (img) {
      setOcrLoading(true)
      try {
        const result = await ocrKilometerstand(img)
        if (result.success) setKontrolle({ kmValue: result.value })
      } catch (e) {
        console.warn('OCR fehlgeschlagen:', e)
      } finally {
        setOcrLoading(false)
      }
    } else {
      setKontrolle({ kmValue: '' })
    }
  }, [setKontrolle])

  const handleSchaeden = useCallback((val) => {
    const jaSelected = val === 'Ja'
    setKontrolle({ schaeden: jaSelected })
    if (jaSelected) {
      setTimeout(() => nav('/unfall/1'), 300)
    }
  }, [setKontrolle, nav])

  const isValid = !!(
    kontrolle.kmPhoto && kontrolle.kmValue &&
    kontrolle.oelPhoto && kontrolle.oelStatus &&
    kontrolle.tankPhoto && kontrolle.tankStatus &&
    kontrolle.schaeden !== null
  )

  return (
    <div className="app-shell">
      <ScreenHeader title="Zustandsdaten" subtitle={`Schritt ${step} von ${total} · KM-Stand, Öl & Tank`}
        onBack={() => nav(isAbfahrt ? '/abfahrt/3' : '/ankunft/2')} progress={step / total * 100} />
      <div className="screen-body fade-up">

        <Card icon="🔢" title="Kilometerstand">
          <PhotoSlot label="Tacho fotografieren" value={kontrolle.kmPhoto} onChange={handleKmPhoto} wide />

          {/* OCR Ladeindikator */}
          {ocrLoading && (
            <div style={{
              marginTop: 10, background: 'rgba(245,216,0,0.06)',
              border: '1px solid rgba(245,216,0,0.15)', borderRadius: 8,
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="spinner" style={{ color: 'var(--yellow)' }}>⟳</span>
              <span style={{ fontSize: 12, color: 'var(--yellow)' }}>Kilometerstand wird automatisch erkannt…</span>
            </div>
          )}

          {/* OCR Ergebnis + manuelle Eingabe */}
          {!ocrLoading && (
            <div style={{ marginTop: 10 }}>
              {kontrolle.kmPhoto && kontrolle.kmValue && (
                <div style={{
                  background: 'rgba(26,92,42,0.1)',
                  border: '1px solid rgba(26,92,42,0.3)',
                  borderRadius: '8px 8px 0 0',
                  padding: '7px 13px',
                  display: 'flex', alignItems: 'center', gap: 6,
                  borderBottom: 'none',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#7DC48A', letterSpacing: 0.5 }}>
                    ✓ AUTOMATISCH ERKANNT – bei Bedarf korrigieren
                  </span>
                </div>
              )}
              {kontrolle.kmPhoto && !kontrolle.kmValue && !ocrLoading && (
                <div style={{
                  background: 'rgba(245,216,0,0.06)',
                  border: '1px solid rgba(245,216,0,0.2)',
                  borderRadius: '8px 8px 0 0',
                  padding: '7px 13px',
                  borderBottom: 'none',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--yellow)', letterSpacing: 0.5 }}>
                    ⚠ OCR konnte den Wert nicht lesen – bitte manuell eingeben
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  className="field-input"
                  type="number"
                  placeholder="Kilometerstand eingeben"
                  value={kontrolle.kmValue}
                  onChange={e => setKontrolle({ kmValue: e.target.value })}
                  style={{
                    flex: 1,
                    borderRadius: (kontrolle.kmPhoto) ? '0 0 8px 8px' : 8,
                    borderTop: kontrolle.kmPhoto ? 'none' : undefined,
                    fontSize: 20,
                    fontWeight: 700,
                    color: kontrolle.kmValue ? '#7DC48A' : 'var(--text)',
                    letterSpacing: 1,
                  }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>km</span>
              </div>
            </div>
          )}
        </Card>

        <Card icon="🛢️" title="Ölstand">
          <PhotoSlot label="Ölstand fotografieren" value={kontrolle.oelPhoto}
            onChange={img => setKontrolle({ oelPhoto: img })} wide />
          <div style={{ marginTop: 10 }}>
            <ToggleGroup
              options={['OK', 'unter Min', 'über Max']}
              value={kontrolle.oelStatus}
              onChange={v => setKontrolle({ oelStatus: v })}
              colorMap={{ OK: 'sel-yes', 'unter Min': 'sel-no', 'über Max': 'sel-no' }}
            />
          </div>
        </Card>

        <Card icon="⛽" title="Tankstand">
          <PhotoSlot label="Tankstand fotografieren" value={kontrolle.tankPhoto}
            onChange={img => setKontrolle({ tankPhoto: img })} wide />
          <div style={{ marginTop: 10 }}>
            <ToggleGroup
              options={['Voll', '3/4', '1/2', '1/4', 'Leer']}
              value={kontrolle.tankStatus}
              onChange={v => setKontrolle({ tankStatus: v })}
            />
          </div>
        </Card>

        <Card icon="🔍" title="Schäden vorhanden?">
          <ToggleGroup
            options={['Nein', 'Ja']}
            value={kontrolle.schaeden === null ? '' : kontrolle.schaeden ? 'Ja' : 'Nein'}
            onChange={handleSchaeden}
            colorMap={{ Nein: 'sel-yes', Ja: 'sel-no' }}
          />
          {kontrolle.schaeden === true && (
            <div className="warn-chip info-chip" style={{ marginTop: 10 }}>
              <span>⚠️</span>
              <span>Weiterleitung zum Schadenerfassungsprozess…</span>
            </div>
          )}
        </Card>
      </div>
      <div className="screen-footer">
        <button className="btn-primary" disabled={!isValid}
          onClick={() => nav(isAbfahrt ? '/abfahrt/5' : '/ankunft/4')}>
          Weiter: Zusammenfassung →
        </button>
      </div>
    </div>
  )
}

// ─── STEP 5 – Zusammenfassung & Unterschrift ─────────────────────────────
export function KontrolleStep5({ isAbfahrt = true }) {
  const nav = useNavigate()
  const driver = useAppStore(s => s.driver)
  const settings = useAppStore(s => s.settings)
  const kontrolle = useFormStore(s => s.kontrolle)
  const setKontrolle = useFormStore(s => s.setKontrolle)
  const step = isAbfahrt ? 5 : 4
  const total = isAbfahrt ? 6 : 5
  const photosCount = Object.values(kontrolle.busPhotos || {}).filter(Boolean).length

  const needsLicense = useAppStore(s => s.needsLicensePhoto)
  const driver2 = useAppStore(s => s.driver)
  const licenseRequired = isAbfahrt && needsLicense(driver2?.nr)

  const checks = [
    { label: 'Bus ausgewählt', ok: !!kontrolle.bus },
    { label: 'Fahrauftrag', ok: !!(kontrolle.fahrauftrag || kontrolle.ziel) },
    ...(licenseRequired ? [{ label: 'Führerscheinfoto', ok: !!kontrolle.licensePhoto }] : []),
    { label: `Rundum-Fotos (${photosCount}/8)`, ok: photosCount === 8 },
    { label: `Kilometerstand${kontrolle.kmValue ? ': ' + parseInt(kontrolle.kmValue).toLocaleString('de-AT') + ' km' : ''}`, ok: !!kontrolle.kmValue },
    { label: 'Ölstand-Foto', ok: !!kontrolle.oelPhoto },
    { label: 'Ölstatus', ok: !!kontrolle.oelStatus },
    { label: 'Tankstand-Foto', ok: !!kontrolle.tankPhoto },
    { label: 'Tankstatus', ok: !!kontrolle.tankStatus },
    { label: 'Schäden: ' + (kontrolle.schaeden ? 'Ja' : 'Nein'), ok: kontrolle.schaeden !== null },
    { label: 'Unterschrift', ok: !!kontrolle.signature },
  ]
  const allOk = checks.every(c => c.ok)

  return (
    <div className="app-shell">
      <ScreenHeader title="Zusammenfassung" subtitle={`Schritt ${step} von ${total} · Prüfen & Unterschreiben`}
        onBack={() => nav(isAbfahrt ? '/abfahrt/4' : '/ankunft/3')} progress={step / total * 100} />
      <div className="screen-body fade-up">
        <Card icon="📋" title="Zusammenfassung">
          <div className="status-row"><span className="status-label">Bus</span><span className="status-val">{kontrolle.bus}</span></div>
          <div className="status-row"><span className="status-label">Fahrer</span><span className="status-val">{driver?.nr} {driver?.name}</span></div>
          <div className="status-row"><span className="status-label">Datum / Zeit</span><span className="status-val">{kontrolle.datum} · {kontrolle.uhrzeit}</span></div>
          <div className="status-row"><span className="status-label">Kilometerstand</span><span className="status-val">{kontrolle.kmValue ? parseInt(kontrolle.kmValue).toLocaleString('de-AT') + ' km' : '—'}</span></div>
          <div className="status-row"><span className="status-label">Ölstand</span><span className={`tag ${kontrolle.oelStatus === 'OK' ? 'tag-ok' : 'tag-err'}`}>{kontrolle.oelStatus || '—'}</span></div>
          <div className="status-row"><span className="status-label">Tankstand</span><span className="tag tag-neu">{kontrolle.tankStatus || '—'}</span></div>
          <div className="status-row"><span className="status-label">Schäden</span><span className={`tag ${kontrolle.schaeden ? 'tag-err' : 'tag-ok'}`}>{kontrolle.schaeden ? 'Ja' : 'Nein'}</span></div>
        </Card>

        <Card icon="✅" title="Pflichtfelder">
          {checks.map((c, i) => (
            <div key={i} className="check-item">
              <div className={`check-dot ${c.ok ? 'ok' : 'err'}`}>{c.ok ? '✓' : '!'}</div>
              <span style={{ color: c.ok ? 'var(--text-dim)' : 'var(--red)', fontSize: 13 }}>{c.label}</span>
            </div>
          ))}
        </Card>

        <Card icon="✍️" title="Digitale Unterschrift">
          <SignaturePad
            value={kontrolle.signature}
            onChange={sig => setKontrolle({ signature: sig })}
            label={`${driver?.nr} ${driver?.name}`}
          />
        </Card>
      </div>
      <div className="screen-footer">
        <button className="btn-primary" disabled={!allOk}
          onClick={() => nav(isAbfahrt ? '/abfahrt/6' : '/ankunft/5')}>
          Jetzt unterschreiben und senden
        </button>
      </div>
    </div>
  )
}

// ─── STEP 6 – PDF erstellen & senden ─────────────────────────────────────
export function KontrolleStep6({ isAbfahrt = true }) {
  const nav = useNavigate()
  const driver = useAppStore(s => s.driver)
  const settings = useAppStore(s => s.settings)
  const kontrolle = useFormStore(s => s.kontrolle)
  const [state, setState] = useState('generating')
  const [errorDetail, setErrorDetail] = useState('')

  useEffect(() => {
    let cancelled = false
    const go = async () => {
      try {
        const pdfDataUri = await generateKontrollePDF(kontrolle, driver)
        const filename = formatFilename(isAbfahrt ? 'Abfahrt' : 'Ankunft', kontrolle.bus, new Date())
        const to = [settings.emailUebergabe].filter(Boolean)
        if (kontrolle.emailKopie) to.push(kontrolle.emailKopie)
        if (driver?.email) to.push(driver.email)

        const auftrag = kontrolle.fahrauftrag || kontrolle.ziel || '–'
        const subjectKontrolle = [
          isAbfahrt ? 'Abfahrtskontrolle' : 'Ankunftskontrolle',
          kontrolle.datum, driver?.name, auftrag, kontrolle.bus,
        ].filter(Boolean).join(' | ')

        const result = await sendPDF({
          pdfDataUri, filename, to,
          subject: subjectKontrolle,
          body: `${isAbfahrt ? 'Abfahrtskontrolle' : 'Ankunftskontrolle'} für ${kontrolle.bus} am ${kontrolle.datum}.\nFahrer: ${driver?.name}\nAuftrag / Ziel: ${auftrag}`,
          store: useAppStore,
        })
        if (!cancelled) {
          if (result.error) { setState('error'); setErrorDetail(result.detail || '') }
          else setState(result.queued ? 'queued' : 'sent')
        }
      } catch (e) {
        console.error('PDF/Send error:', e)
        if (!cancelled) { setState('error'); setErrorDetail(e.message || '') }
      }
    }
    go()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="app-shell">
      <ScreenHeader title={
        state === 'generating' ? 'PDF wird erstellt …' :
        state === 'sent' ? 'Gesendet!' :
        state === 'queued' ? 'Gespeichert' : 'Fehler'
      } />
      <div className="success-wrap">
        {state === 'generating' && (
          <>
            <div style={{ fontSize: 40 }} className="spinner">⟳</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>PDF wird erstellt und versendet…</div>
          </>
        )}
        {(state === 'sent' || state === 'queued') && (
          <>
            <div className="success-icon">✓</div>
            <div className="success-title">{isAbfahrt ? 'Abfahrtskontrolle' : 'Ankunftskontrolle'} {state === 'queued' ? 'gespeichert' : 'gesendet'}</div>
            <div className="success-text">
              {state === 'queued'
                ? 'Keine Verbindung – wird automatisch gesendet sobald du wieder online bist.'
                : 'PDF wurde erstellt und per E-Mail versendet.'}
            </div>
            <div className="email-badge">📧 {settings.emailUebergabe}</div>
            {kontrolle.emailKopie && <div className="email-badge">📧 Kopie: {kontrolle.emailKopie}</div>}
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => nav('/')}>← Zurück zur Startseite</button>
          </>
        )}
        {state === 'error' && (
          <>
            <div style={{ fontSize: 40 }}>❌</div>
            <div className="success-title" style={{ color: 'var(--red)' }}>Fehler beim Versand</div>
            <div className="success-text">Bitte versuche es erneut oder prüfe deine Verbindung.</div>
            {errorDetail && (
              <div style={{
                background: 'rgba(204,0,0,0.08)', border: '1px solid rgba(204,0,0,0.2)',
                borderRadius: 8, padding: '10px 14px', fontSize: 11,
                color: '#FF8080', fontFamily: 'monospace', wordBreak: 'break-all',
                width: '100%', textAlign: 'left',
              }}>{errorDetail}</div>
            )}
            <button className="btn-primary" onClick={() => setState('generating')} style={{ marginTop: 16 }}>Erneut versuchen</button>
            <button className="btn-primary" onClick={() => nav('/')} style={{ marginTop: 8, background: 'var(--dark3)', color: 'var(--text)', boxShadow: 'none' }}>← Zurück</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── UNFALL STEP 1 – Grunddaten ──────────────────────────────────────────
export function UnfallStep1() {
  const nav = useNavigate()
  const driver = useAppStore(s => s.driver)
  const settings = useAppStore(s => s.settings)
  const unfall = useFormStore(s => s.unfall)
  const setUnfall = useFormStore(s => s.setUnfall)
  const [gpsLoading, setGpsLoading] = useState(false)

  useEffect(() => {
    if (!unfall.gps) {
      setGpsLoading(true)
      getGPS().then(gps => {
        if (gps) setUnfall({ gps })
        setGpsLoading(false)
      })
    }
  }, [])

  // Pflichtfelder: Ort, Bus – Gegner nur wenn hatGegner = true
  const isValid = !!(unfall.ort && unfall.bus && unfall.hatGegner !== null)

  return (
    <div className="app-shell">
      <ScreenHeader title="Unfall-/Schadensmeldung" subtitle="Schritt 1 von 6 · Grunddaten"
        onBack={() => nav('/')} progress={1 / 6 * 100} />
      <div className="screen-body fade-up">

        {/* Ort & Zeit */}
        <Card icon="📍" title="Ort & Zeit">
          <DateTimePicker
            datum={unfall.datum} uhrzeit={unfall.uhrzeit}
            onChangeDatum={d => setUnfall({ datum: d })}
            onChangeUhrzeit={u => setUnfall({ uhrzeit: u })}
          />
          <FieldGroup label="Unfallort / Schadensort" required>
            <input className="field-input" placeholder="Straße, Ort"
              value={unfall.ort} onChange={e => setUnfall({ ort: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="GPS-Koordinaten">
            <div className="field-input auto" style={{ fontSize: 12 }}>
              {gpsLoading ? '⟳ Ermittle Position…' : unfall.gps || 'Nicht verfügbar'}
            </div>
          </FieldGroup>
        </Card>

        {/* Unser Fahrzeug */}
        <Card icon="🚌" title="Unser Fahrzeug">
          <FieldGroup label="Bus" required>
            <select className="field-input" value={unfall.bus} onChange={e => {
              const kennzeichen = e.target.value
              const detail = (settings.vehicleDetails || []).find(d => d.kennzeichen === kennzeichen) || {}
              setUnfall({
                bus: kennzeichen,
                unserPolizeinummer: detail.polizeinummer || '',
                unserVersicherung: detail.versicherung
                  ? `${detail.versicherung}${detail.versicherungspolice ? ' · ' + detail.versicherungspolice : ''}`
                  : '',
              })
            }}>
              <option value="">— Bitte auswählen —</option>
              {settings.buses.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Fahrer">
            <div className="field-input auto">{driver?.nr} {driver?.name}</div>
          </FieldGroup>
          <div className="two-col">
            <FieldGroup label="Polizeinummer">
              <input className="field-input" placeholder="Police-Nr."
                value={unfall.unserPolizeinummer || ''}
                onChange={e => setUnfall({ unserPolizeinummer: e.target.value })}
                style={{ fontSize: 13 }} />
            </FieldGroup>
            <FieldGroup label="Versicherung">
              <input className="field-input" placeholder="Versicherung"
                value={unfall.unserVersicherung || ''}
                onChange={e => setUnfall({ unserVersicherung: e.target.value })}
                style={{ fontSize: 13 }} />
            </FieldGroup>
          </div>
        </Card>

        {/* Unfallgegner – Auswahl */}
        <Card icon="🚗" title="Unfallgegner / Beteiligtes Fahrzeug">
          <FieldGroup label="Gibt es einen Unfallgegner?" required>
            <ToggleGroup
              options={['Nein – kein Gegner', 'Ja – Gegner vorhanden']}
              value={unfall.hatGegner === null ? '' : unfall.hatGegner ? 'Ja – Gegner vorhanden' : 'Nein – kein Gegner'}
              onChange={v => setUnfall({ hatGegner: v === 'Ja – Gegner vorhanden' })}
              colorMap={{ 'Nein – kein Gegner': 'sel-neu', 'Ja – Gegner vorhanden': 'sel-yes' }}
            />
          </FieldGroup>

          {/* Gegner-Felder nur wenn Ja */}
          {unfall.hatGegner === true && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                Angaben zum Unfallgegner
              </div>
              <FieldGroup label="Kennzeichen">
                <input className="field-input" placeholder="z. B. W-12345AB"
                  value={unfall.gegnerKennzeichen}
                  onChange={e => setUnfall({ gegnerKennzeichen: e.target.value })} />
              </FieldGroup>
              <FieldGroup label="Fahrer / Name">
                <input className="field-input" placeholder="Vorname Nachname"
                  value={unfall.gegnerFahrer}
                  onChange={e => setUnfall({ gegnerFahrer: e.target.value })} />
              </FieldGroup>
              <FieldGroup label="Adresse">
                <input className="field-input" placeholder="Straße, PLZ, Ort"
                  value={unfall.gegnerAdresse || ''}
                  onChange={e => setUnfall({ gegnerAdresse: e.target.value })} />
              </FieldGroup>
              <div className="two-col">
                <FieldGroup label="Telefon">
                  <input className="field-input" type="tel" placeholder="+43 ..."
                    value={unfall.gegnerTelefon || ''}
                    onChange={e => setUnfall({ gegnerTelefon: e.target.value })} />
                </FieldGroup>
                <FieldGroup label="E-Mail">
                  <input className="field-input" type="email" placeholder="email@..."
                    value={unfall.gegnerEmail || ''}
                    onChange={e => setUnfall({ gegnerEmail: e.target.value })} />
                </FieldGroup>
              </div>
              <div className="two-col">
                <FieldGroup label="Versicherung">
                  <input className="field-input" placeholder="Versicherungsname"
                    value={unfall.gegnerVersicherung}
                    onChange={e => setUnfall({ gegnerVersicherung: e.target.value })} />
                </FieldGroup>
                <FieldGroup label="Police-Nr.">
                  <input className="field-input" placeholder="Police-Nr."
                    value={unfall.gegnerVersicherungsNr || ''}
                    onChange={e => setUnfall({ gegnerVersicherungsNr: e.target.value })} />
                </FieldGroup>
              </div>
            </div>
          )}

          {unfall.hatGegner === false && (
            <div className="ok-chip info-chip" style={{ marginTop: 10 }}>
              <span>ℹ️</span>
              <span>Kein Gegner – Eigenunfall oder Sachschaden ohne Dritten.</span>
            </div>
          )}
        </Card>

        {/* Zeugen */}
        <Card icon="👤" title="Zeugen (optional)">
          <input className="field-input" placeholder="Name, Telefon"
            value={unfall.zeugen} onChange={e => setUnfall({ zeugen: e.target.value })} />
        </Card>

      </div>
      <div className="screen-footer">
        <button className="btn-primary" disabled={!isValid} onClick={() => nav('/unfall/2')}>
          Weiter: Schadenmarkierung →
        </button>
      </div>
    </div>
  )
}

// ─── UNFALL STEP 2 – Fahrzeugskizze ──────────────────────────────────────
export function UnfallStep2() {
  const nav = useNavigate()
  const unfall = useFormStore(s => s.unfall)
  const setUnfall = useFormStore(s => s.setUnfall)

  return (
    <div className="app-shell">
      <ScreenHeader title="Schadenmarkierung" subtitle="Schritt 2 von 6 · Tippe auf den Bus"
        onBack={() => nav('/unfall/1')} progress={2 / 6 * 100} />
      <div className="screen-body fade-up">
        <VehicleSketch
          points={unfall.damagePoints}
          onChange={pts => setUnfall({ damagePoints: pts })}
        />
        {unfall.damagePoints.length > 0 && (
          <Card icon="📍" title="Schadenspunkte">
            {unfall.damagePoints.map(p => (
              <div key={p.id} className="status-row">
                <span className="status-label">Punkt {p.id}</span>
                <span className="tag tag-err">{p.view}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
      <div className="screen-footer">
        <button className="btn-primary" onClick={() => nav('/unfall/3')}>
          Weiter: Schadensfotos →
        </button>
      </div>
    </div>
  )
}

// ─── UNFALL STEP 3 – Schadensfotos ───────────────────────────────────────
export function UnfallStep3() {
  const nav = useNavigate()
  const unfall = useFormStore(s => s.unfall)
  const setUnfall = useFormStore(s => s.setUnfall)

  const setPointPhotos = (id, photos) => {
    setUnfall({ damagePhotos: { ...unfall.damagePhotos, [id]: photos } })
  }

  const addPointPhoto = (id, img) => {
    const current = unfall.damagePhotos[id] || []
    setPointPhotos(id, [...current, img])
  }

  const addExtra = (img) => {
    setUnfall({ extraPhotos: [...(unfall.extraPhotos || []), img] })
  }

  return (
    <div className="app-shell">
      <ScreenHeader title="Schadensfotos" subtitle="Schritt 3 von 6 · Fotos pro Schadenspunkt"
        onBack={() => nav('/unfall/2')} progress={3 / 6 * 100} />
      <div className="screen-body fade-up">
        {unfall.damagePoints.length === 0 && (
          <div className="info-chip">
            <span>ℹ️</span>
            <span>Keine Schadenspunkte markiert – du kannst trotzdem Fotos hinzufügen.</span>
          </div>
        )}
        {unfall.damagePoints.map(p => {
          const photos = unfall.damagePhotos[p.id] || []
          return (
            <Card key={p.id} icon="🔴" title={`Schadenspunkt ${p.id} – ${p.view}`}>
              <div className="photo-grid-3">
                {photos.map((img, i) => (
                  <PhotoSlot key={i} label={`Foto ${i + 1}`} square value={img}
                    onChange={(newImg) => {
                      const updated = [...photos]
                      if (newImg) updated[i] = newImg
                      else updated.splice(i, 1)
                      setPointPhotos(p.id, updated)
                    }} />
                ))}
                <div className="photo-slot sq" onClick={() => openCamera(img => addPointPhoto(p.id, img))}>
                  <span style={{ fontSize: 24, opacity: 0.3 }}>＋</span>
                </div>
              </div>
            </Card>
          )
        })}
        <Card icon="📷" title="Weitere Übersichtsfotos">
          <div className="photo-grid-3">
            {(unfall.extraPhotos || []).map((img, i) => (
              <PhotoSlot key={i} label={`Foto ${i + 1}`} square value={img}
                onChange={(newImg) => {
                  const updated = [...(unfall.extraPhotos || [])]
                  if (newImg) updated[i] = newImg
                  else updated.splice(i, 1)
                  setUnfall({ extraPhotos: updated })
                }} />
            ))}
            <div className="photo-slot sq" onClick={() => openCamera(addExtra)}>
              <span style={{ fontSize: 24, opacity: 0.3 }}>＋</span>
            </div>
          </div>
        </Card>
      </div>
      <div className="screen-footer">
        <button className="btn-primary" onClick={() => nav('/unfall/4')}>Weiter: Unfallhergang / Schadenshergang →</button>
      </div>
    </div>
  )
}

// ─── UNFALL STEP 4 – Hergang & Polizei ───────────────────────────────────
export function UnfallStep4() {
  const nav = useNavigate()
  const unfall = useFormStore(s => s.unfall)
  const setUnfall = useFormStore(s => s.setUnfall)
  const [isRecording, setIsRecording] = useState(false)
  const [voiceSupported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  const recognitionRef = useRef(null)

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    const rec = new SpeechRecognition()
    rec.lang = 'de-AT'
    rec.continuous = true
    rec.interimResults = true
    recognitionRef.current = rec
    let finalText = unfall.hergang || ''

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
        else interim = e.results[i][0].transcript
      }
      setUnfall({ hergang: finalText + interim })
    }
    rec.onerror = () => { setIsRecording(false) }
    rec.onend = () => {
      setUnfall({ hergang: finalText })
      setIsRecording(false)
    }
    rec.start()
    setIsRecording(true)
  }

  const stopVoice = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  return (
    <div className="app-shell">
      <ScreenHeader title="Hergang & Polizei" subtitle="Schritt 4 von 6"
        onBack={() => nav('/unfall/3')} progress={4 / 6 * 100} />
      <div className="screen-body fade-up">
        <Card icon="📝" title="Unfallhergang / Schadenshergang">
          <FieldGroup label="Situationsauswahl (mehrfach möglich)">
            <CauseTagGroup value={unfall.causes} onChange={c => setUnfall({ causes: c })} />
          </FieldGroup>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div className="field-label">Beschreibung</div>
              {voiceSupported && (
                <div
                  onClick={isRecording ? stopVoice : startVoice}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                    background: isRecording ? 'rgba(204,0,0,0.15)' : 'rgba(26,92,42,0.12)',
                    border: `1px solid ${isRecording ? 'rgba(204,0,0,0.4)' : 'rgba(26,92,42,0.3)'}`,
                    fontSize: 12, fontWeight: 600,
                    color: isRecording ? 'var(--red)' : '#7DC48A',
                    userSelect: 'none',
                  }}
                >
                  {isRecording ? (
                    <><span className="spinner">⟳</span> Aufnahme stoppen</>
                  ) : (
                    <><span>🎤</span> Spracheingabe</>
                  )}
                </div>
              )}
            </div>
            {isRecording && (
              <div className="info-chip" style={{ marginBottom: 8, background: 'rgba(204,0,0,0.08)', borderColor: 'rgba(204,0,0,0.2)', color: '#FF8080' }}>
                <span>🎙️</span>
                <span>Aufnahme läuft – sprich jetzt den Hergang ein…</span>
              </div>
            )}
            <textarea
              className="field-input"
              placeholder="Beschreibe den Hergang so genau wie möglich… oder nutze die Spracheingabe."
              value={unfall.hergang}
              onChange={e => setUnfall({ hergang: e.target.value })}
              style={{ minHeight: 110 }}
            />
          </div>
        </Card>

        <Card icon="🚔" title="Polizei">
          <FieldGroup label="Polizei gerufen?" required>
            <ToggleGroup
              options={['Nein', 'Ja']}
              value={unfall.polizeiGerufen === null ? '' : unfall.polizeiGerufen ? 'Ja' : 'Nein'}
              onChange={v => setUnfall({ polizeiGerufen: v === 'Ja' })}
              colorMap={{ Nein: 'sel-no', Ja: 'sel-yes' }}
            />
          </FieldGroup>
          {unfall.polizeiGerufen && (
            <div style={{ marginTop: 12 }}>
              <FieldGroup label="Dienststelle">
                <input className="field-input" placeholder="z. B. PI Salzburg Mitte"
                  value={unfall.polizeiDienststelle} onChange={e => setUnfall({ polizeiDienststelle: e.target.value })} />
              </FieldGroup>
              <FieldGroup label="Aktenzeichen">
                <input className="field-input" placeholder="Aktenzeichen"
                  value={unfall.polizeiAktenzeichen} onChange={e => setUnfall({ polizeiAktenzeichen: e.target.value })} />
              </FieldGroup>
              <FieldGroup label="Ansprechpartner">
                <input className="field-input" placeholder="Beamter Name"
                  value={unfall.polizeiAnsprechpartner} onChange={e => setUnfall({ polizeiAnsprechpartner: e.target.value })} />
              </FieldGroup>
              <FieldGroup label="Foto Polizeiprotokoll (optional)">
                <PhotoSlot label="Protokoll fotografieren" value={unfall.polizeiFoto}
                  onChange={img => setUnfall({ polizeiFoto: img })} wide />
              </FieldGroup>
            </div>
          )}
        </Card>
      </div>
      <div className="screen-footer">
        <button className="btn-primary"
          disabled={unfall.polizeiGerufen === null}
          onClick={() => nav('/unfall/5')}>
          Weiter: Unterschrift →
        </button>
      </div>
    </div>
  )
}

// ─── UNFALL STEP 5 – Unterschriften ──────────────────────────────────────
export function UnfallStep5() {
  const nav = useNavigate()
  const driver = useAppStore(s => s.driver)
  const unfall = useFormStore(s => s.unfall)
  const setUnfall = useFormStore(s => s.setUnfall)
  const isValid = !!unfall.signature1

  return (
    <div className="app-shell">
      <ScreenHeader title="Unterschriften" subtitle="Schritt 5 von 6"
        onBack={() => nav('/unfall/4')} progress={5 / 6 * 100} />
      <div className="screen-body fade-up">
        <Card icon="✍️" title="Unterschrift Fahrer (Pflicht)">
          <SignaturePad value={unfall.signature1} onChange={sig => setUnfall({ signature1: sig })}
            label={`${driver?.nr} ${driver?.name}`} />
        </Card>
        <Card icon="✍️" title="Unterschrift Unfallgegner (optional)">
          <SignaturePad value={unfall.signature2} onChange={sig => setUnfall({ signature2: sig })}
            label="Zweite beteiligte Person" />
        </Card>
        <FieldGroup label="E-Mail für Kopie (optional)">
          <input className="field-input" type="email" placeholder="fahrer@ledermair.at"
            value={unfall.emailKopie} onChange={e => setUnfall({ emailKopie: e.target.value })} />
        </FieldGroup>
      </div>
      <div className="screen-footer">
        <button className="btn-primary btn-danger" disabled={!isValid} onClick={() => nav('/unfall/6')}>
          Jetzt unterschreiben und senden
        </button>
      </div>
    </div>
  )
}

// ─── UNFALL STEP 6 – PDF erstellen & senden ───────────────────────────────
export function UnfallStep6() {
  const nav = useNavigate()
  const driver = useAppStore(s => s.driver)
  const settings = useAppStore(s => s.settings)
  const unfall = useFormStore(s => s.unfall)
  const [state, setState] = useState('generating')
  const [errorDetail, setErrorDetail] = useState('')

  useEffect(() => {
    let cancelled = false
    const go = async () => {
      try {
        const pdfDataUri = await generateUnfallPDF(unfall, driver, BUS_VIEWS)
        const filename = formatFilename('Unfall', unfall.bus || 'Bus', new Date())
        const to = [settings.emailSchaden].filter(Boolean)
        const cc = [settings.emailVersicherung].filter(Boolean)
        if (unfall.emailKopie) to.push(unfall.emailKopie)
        if (driver?.email) to.push(driver.email)

        const subjectUnfall = [
          'Unfall-/Schadensmeldung',
          unfall.datum, driver?.name, unfall.ort || '–', unfall.bus,
        ].filter(Boolean).join(' | ')

        const result = await sendPDF({
          pdfDataUri, filename, to, cc,
          subject: subjectUnfall,
          body: `Unfall-/Schadensmeldung für ${unfall.bus} am ${unfall.datum}.\nFahrer: ${driver?.name}\nUnfallort: ${unfall.ort}\nGegner: ${unfall.gegnerKennzeichen || '–'}`,
          store: useAppStore,
        })
        if (!cancelled) {
          if (result.error) { setState('error'); setErrorDetail(result.detail || '') }
          else setState(result.queued ? 'queued' : 'sent')
        }
      } catch (e) {
        console.error('PDF/Send error:', e)
        if (!cancelled) { setState('error'); setErrorDetail(e.message || '') }
      }
    }
    go()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="app-shell">
      <ScreenHeader title={
        state === 'generating' ? 'Bericht wird erstellt…' :
        state === 'sent' ? 'Gesendet!' : 'Gespeichert'
      } />
      <div className="success-wrap">
        {state === 'generating' && (
          <>
            <div style={{ fontSize: 40 }} className="spinner">⟳</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Unfall-/Schadensmeldung wird erstellt…</div>
          </>
        )}
        {(state === 'sent' || state === 'queued') && (
          <>
            <div className="success-icon">✓</div>
            <div className="success-title">Unfall-/Schadensmeldung {state === 'queued' ? 'gespeichert' : 'gesendet'}</div>
            <div className="success-text">
              {state === 'queued'
                ? 'Offline – wird automatisch gesendet sobald Verbindung besteht.'
                : 'PDF wurde erstellt und an alle Empfänger versendet.'}
            </div>
            <div className="email-badge">📧 {settings.emailSchaden}</div>
            <div className="email-badge">📧 CC: {settings.emailVersicherung}</div>
            {unfall.emailKopie && <div className="email-badge">📧 Kopie: {unfall.emailKopie}</div>}
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => nav('/')}>← Zurück zur Startseite</button>
          </>
        )}
        {state === 'error' && (
          <>
            <div style={{ fontSize: 40 }}>❌</div>
            <div className="success-title" style={{ color: 'var(--red)' }}>Fehler beim Versand</div>
            <div className="success-text">Bitte versuche es erneut.</div>
            {errorDetail && (
              <div style={{
                background: 'rgba(204,0,0,0.08)', border: '1px solid rgba(204,0,0,0.2)',
                borderRadius: 8, padding: '10px 14px', fontSize: 11,
                color: '#FF8080', fontFamily: 'monospace', wordBreak: 'break-all',
                width: '100%', textAlign: 'left',
              }}>{errorDetail}</div>
            )}
            <button className="btn-primary" onClick={() => setState('generating')} style={{ marginTop: 16 }}>Erneut versuchen</button>
            <button className="btn-primary" onClick={() => nav('/')} style={{ marginTop: 8, background: 'var(--dark3)', color: 'var(--text)', boxShadow: 'none' }}>← Zurück</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── ADMIN ────────────────────────────────────────────────────────────────
export function AdminScreen() {
  const nav = useNavigate()
  const settings = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const licensePhotoDates = useAppStore(s => s.licensePhotoDates)
  const setLicensePhotoDate = useAppStore(s => s.setLicensePhotoDate)
  const [local, setLocal] = useState(() => ({ ...settings }))
  const [newBus, setNewBus] = useState('')
  const [newDriverNr, setNewDriverNr] = useState('')
  const [newDriverName, setNewDriverName] = useState('')

  // ─── PIN Schutz ───────────────────────────────────────────────────────
  const save = () => {
    updateSettings(local)
    nav('/')
  }

  const addBus = () => {
    const trimmed = newBus.trim()
    if (trimmed && !local.buses.includes(trimmed)) {
      const newDetails = [...(local.vehicleDetails || []), {
        kennzeichen: trimmed, polizeinummer: '', versicherung: '', versicherungspolice: ''
      }]
      setLocal(l => ({ ...l, buses: [...l.buses, trimmed], vehicleDetails: newDetails }))
      setNewBus('')
    }
  }

  const updateVehicleDetail = (kennzeichen, field, value) => {
    const details = local.vehicleDetails || []
    const existing = details.find(d => d.kennzeichen === kennzeichen)
    if (existing) {
      setLocal(l => ({
        ...l,
        vehicleDetails: l.vehicleDetails.map(d =>
          d.kennzeichen === kennzeichen ? { ...d, [field]: value } : d
        )
      }))
    } else {
      setLocal(l => ({
        ...l,
        vehicleDetails: [...(l.vehicleDetails || []), {
          kennzeichen, polizeinummer: '', versicherung: '', versicherungspolice: '',
          [field]: value
        }]
      }))
    }
  }

  const [expandedBus, setExpandedBus] = useState(null)

  const addDriver = () => {
    const nr = newDriverNr.trim()
    const name = newDriverName.trim()
    if (nr && name && !local.drivers.find(d => d.nr === nr)) {
      setLocal(l => ({ ...l, drivers: [...l.drivers, { nr, name }] }))
      setNewDriverNr('')
      setNewDriverName('')
    }
  }

  return (
    <div className="app-shell">
      <ScreenHeader title="Verwaltung" subtitle="Busse · Fahrer · E-Mail-Adressen" onBack={() => nav('/')} />
      <div className="screen-body fade-up">

        <Card icon="📧" title="E-Mail-Adressen">
          <FieldGroup label="Übergabe-Adresse (Kontrollen)">
            <input className="field-input" type="email" value={local.emailUebergabe}
              onChange={e => setLocal(l => ({ ...l, emailUebergabe: e.target.value }))} />
          </FieldGroup>
          <FieldGroup label="Schaden-Adresse (Unfälle)">
            <input className="field-input" type="email" value={local.emailSchaden}
              onChange={e => setLocal(l => ({ ...l, emailSchaden: e.target.value }))} />
          </FieldGroup>
          <FieldGroup label="Versicherungs-CC (Unfälle)">
            <input className="field-input" type="email" value={local.emailVersicherung}
              onChange={e => setLocal(l => ({ ...l, emailVersicherung: e.target.value }))} />
          </FieldGroup>
        </Card>

        <Card icon="🚌" title="Fahrzeuge & Fahrzeugdaten">
          {local.buses.map(b => {
            const detail = (local.vehicleDetails || []).find(d => d.kennzeichen === b) || {}
            const isExpanded = expandedBus === b
            return (
              <div key={b} style={{ marginBottom: 8 }}>
                {/* Bus Header */}
                <div
                  className="admin-item"
                  style={{ cursor: 'pointer', marginBottom: 0, borderRadius: isExpanded ? '8px 8px 0 0' : 8 }}
                  onClick={() => setExpandedBus(isExpanded ? null : b)}
                >
                  <div style={{ flex: 1 }}>
                    <div className="admin-item-main">{b}</div>
                    {(detail.versicherung || detail.polizeinummer) && (
                      <div className="admin-item-sub">
                        {detail.versicherung && `${detail.versicherung}`}
                        {detail.versicherung && detail.polizeinummer && ' · '}
                        {detail.polizeinummer && `Police: ${detail.polizeinummer}`}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--yellow)', marginRight: 10 }}>
                    {isExpanded ? '▲ einklappen' : '▼ bearbeiten'}
                  </span>
                  <div className="del-btn" onClick={e => {
                    e.stopPropagation()
                    setLocal(l => ({
                      ...l,
                      buses: l.buses.filter(x => x !== b),
                      vehicleDetails: (l.vehicleDetails || []).filter(d => d.kennzeichen !== b)
                    }))
                  }}>✕</div>
                </div>

                {/* Aufgeklappte Felder */}
                {isExpanded && (
                  <div style={{
                    background: 'rgba(26,92,42,0.06)',
                    border: '1px solid rgba(26,92,42,0.2)',
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    padding: '12px 12px 14px',
                  }}>
                    <div className="two-col" style={{ marginBottom: 10 }}>
                      <FieldGroup label="Polizeinummer">
                        <input className="field-input" placeholder="z. B. AT-1234567"
                          value={detail.polizeinummer || ''}
                          onChange={e => updateVehicleDetail(b, 'polizeinummer', e.target.value)}
                          style={{ fontSize: 13 }} />
                      </FieldGroup>
                      <FieldGroup label="Versicherungsgesellschaft">
                        <input className="field-input" placeholder="z. B. Wiener Städtische"
                          value={detail.versicherung || ''}
                          onChange={e => updateVehicleDetail(b, 'versicherung', e.target.value)}
                          style={{ fontSize: 13 }} />
                      </FieldGroup>
                    </div>
                    <FieldGroup label="Versicherungspolice-Nr.">
                      <input className="field-input" placeholder="Police-Nummer"
                        value={detail.versicherungspolice || ''}
                        onChange={e => updateVehicleDetail(b, 'versicherungspolice', e.target.value)}
                        style={{ fontSize: 13 }} />
                    </FieldGroup>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                      ✓ Wird im Unfall-/Schadensmeldung automatisch vorausgefüllt
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input className="field-input" placeholder="Neues Kennzeichen"
              value={newBus} onChange={e => setNewBus(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addBus()}
              style={{ flex: 1 }} />
            <button className="btn-ghost" onClick={addBus}>+ Hinzufügen</button>
          </div>
        </Card>

        <Card icon="👤" title="Fahrer">
          {local.drivers.map(d => (
            <div key={d.nr} className="admin-item">
              <div>
                <div className="admin-item-main">{d.name}</div>
                <div className="admin-item-sub">Personalnr. {d.nr}</div>
              </div>
              <div className="del-btn" onClick={() => setLocal(l => ({ ...l, drivers: l.drivers.filter(x => x.nr !== d.nr) }))}>✕</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <input className="field-input" placeholder="Personalnr." value={newDriverNr}
              onChange={e => setNewDriverNr(e.target.value)} style={{ width: 90 }} />
            <input className="field-input" placeholder="Name" value={newDriverName}
              onChange={e => setNewDriverName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDriver()}
              style={{ flex: 1 }} />
            <button className="btn-ghost" onClick={addDriver}>+ Hinzufügen</button>
          </div>
        </Card>

        {/* Führerscheinfoto zurücksetzen */}
        <Card icon="🪪" title="Führerscheinfoto">
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12, lineHeight: 1.5 }}>
            Führerscheinfoto-Status zurücksetzen damit beim nächsten Start der Abfahrtskontrolle wieder ein Foto verlangt wird.
          </div>
          {local.drivers.map(d => {
            const date = licensePhotoDates[d.nr]
            return (
              <div key={d.nr} className="admin-item" style={{ marginBottom: 8 }}>
                <div>
                  <div className="admin-item-main">{d.name}</div>
                  <div className="admin-item-sub">
                    {date ? `Letztes Foto: ${date}` : 'Noch kein Foto erfasst'}
                  </div>
                </div>
                {date && (
                  <div
                    className="del-btn"
                    style={{ width: 'auto', padding: '4px 10px', fontSize: 11, borderRadius: 7 }}
                    onClick={() => {
                      if (window.confirm(`Führerscheinfoto-Status für ${d.name} zurücksetzen?`)) {
                        setLicensePhotoDate(d.nr, '')
                      }
                    }}
                  >
                    Reset
                  </div>
                )}
              </div>
            )
          })}
        </Card>

      </div>
      <div className="screen-footer">
        <button className="btn-primary" onClick={save}>Speichern & Zurück</button>
      </div>
    </div>
  )
}

// ─── INSTALL SCREEN ───────────────────────────────────────────────────────
export function InstallScreen() {
  const nav = useNavigate()

  // Gerät erkennen
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
  const isAndroid = /Android/.test(ua)
  const isSamsung = /SamsungBrowser/.test(ua)
  const isChrome = /Chrome/.test(ua) && !isSamsung
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches

  const device = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'

  const Step = ({ nr, text, sub }) => (
    <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
      <div style={{
        minWidth: 30, height: 30, borderRadius: '50%',
        background: 'var(--green)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, flexShrink: 0,
      }}>{nr}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{text}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
      </div>
    </div>
  )

  return (
    <div className="app-shell">
      <ScreenHeader title="Installationshilfe" subtitle="BusCheck als App installieren" onBack={() => nav('/')} />
      <div className="screen-body fade-up">

        {isStandalone && (
          <div className="ok-chip info-chip" style={{ marginBottom: 16 }}>
            <span>✓</span>
            <span>BusCheck ist bereits als App installiert!</span>
          </div>
        )}

        {/* Geräte-Badge */}
        <div style={{
          background: 'var(--dark3)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 22 }}>
            {device === 'ios' ? '🍎' : device === 'android' ? '🤖' : '💻'}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {device === 'ios' ? 'iPhone / iPad erkannt' : device === 'android' ? 'Android-Gerät erkannt' : 'Desktop / PC erkannt'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {isSamsung ? 'Samsung Internet Browser' : isChrome ? 'Chrome Browser' : isIOS ? 'Safari Browser' : 'Browser'}
            </div>
          </div>
        </div>

        {/* iOS Anleitung */}
        {device === 'ios' && (
          <Card icon="🍎" title="Installation auf iPhone / iPad">
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
              BusCheck muss über <strong style={{ color: 'var(--text)' }}>Safari</strong> geöffnet werden – andere Browser (Chrome, Firefox) unterstützen die Installation nicht.
            </div>
            <Step nr="1" text="Safari öffnen"
              sub="Falls du gerade einen anderen Browser verwendest, öffne die URL in Safari." />
            <Step nr="2" text='Tippe auf das Teilen-Symbol ⬆️'
              sub='Das Symbol befindet sich unten in der Mitte der Safari-Leiste.' />
            <Step nr="3" text='"Zum Home-Bildschirm" wählen 📲'
              sub='Scrolle im Menü nach unten und tippe auf "Zum Home-Bildschirm hinzufügen".' />
            <Step nr="4" text='"Hinzufügen" bestätigen'
              sub='Tippe oben rechts auf "Hinzufügen". BusCheck erscheint jetzt als App-Symbol.' />
            <Step nr="5" text="App vom Home-Bildschirm starten"
              sub="Ab jetzt immer das BusCheck-Symbol tippen – nicht über Safari öffnen!" />

            <div className="info-chip" style={{ marginTop: 8 }}>
              <span>💡</span>
              <span>Tipp: iOS 16.4+ unterstützt Push-Benachrichtigungen in PWA-Apps.</span>
            </div>
          </Card>
        )}

        {/* Android Anleitung */}
        {device === 'android' && (
          <Card icon="🤖" title="Installation auf Android">
            {isChrome ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                  Mit <strong style={{ color: 'var(--text)' }}>Chrome</strong> kannst du BusCheck direkt installieren.
                </div>
                <Step nr="1" text="Banner antippen"
                  sub='Chrome zeigt unten automatisch "App installieren" oder "Zum Startbildschirm hinzufügen" an.' />
                <Step nr="2" text="Falls kein Banner: Menü öffnen"
                  sub='Tippe auf die drei Punkte ⋮ oben rechts.' />
                <Step nr="3" text='"App installieren" wählen'
                  sub='Oder: "Zum Startbildschirm hinzufügen" – je nach Chrome-Version.' />
                <Step nr="4" text='"Installieren" bestätigen'
                  sub='BusCheck erscheint als App-Symbol am Startbildschirm.' />
                <Step nr="5" text="App vom Startbildschirm öffnen"
                  sub="Das BusCheck-Symbol tippen – nicht mehr über Chrome!" />
              </>
            ) : isSamsung ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                  Samsung Internet Browser unterstützt PWA-Installation.
                </div>
                <Step nr="1" text="Menü öffnen"
                  sub="Tippe auf die drei Striche ☰ unten rechts." />
                <Step nr="2" text='"Seite hinzufügen" wählen'
                  sub='Dann "Zum Startbildschirm hinzufügen".' />
                <Step nr="3" text='"Hinzufügen' bestätigen"
                  sub="BusCheck erscheint als App-Symbol." />
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                  Für die beste Erfahrung verwende <strong style={{ color: 'var(--text)' }}>Chrome</strong> auf Android.
                </div>
                <Step nr="1" text="URL kopieren"
                  sub={`bus-check-mu.vercel.app`} />
                <Step nr="2" text="In Chrome öffnen"
                  sub="Chrome aus dem App-Store laden falls nicht vorhanden." />
                <Step nr="3" text="Installationsbanner bestätigen"
                  sub='Tippe auf "App installieren" oder im Menü ⋮ auf "Zum Startbildschirm".' />
              </>
            )}
          </Card>
        )}

        {/* Desktop Anleitung */}
        {device === 'desktop' && (
          <Card icon="💻" title="Installation am Desktop">
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
              BusCheck ist für Smartphones optimiert. Am Desktop kann die App in Chrome oder Edge installiert werden.
            </div>
            <Step nr="1" text="Chrome oder Edge verwenden"
              sub="Diese Browser unterstützen PWA-Installation am Desktop." />
            <Step nr="2" text="Installations-Symbol in der Adressleiste"
              sub='Klicke auf das ⊕-Symbol rechts in der Adressleiste oder im Menü auf "App installieren".' />
            <Step nr="3" text='"Installieren" bestätigen'
              sub="BusCheck öffnet als eigenes Fenster ohne Browser-Oberfläche." />
          </Card>
        )}

        <Card icon="❓" title="Häufige Fragen">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Die App ist zu klein / zu groß?</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            Stelle sicher dass du die App über das App-Symbol startest, nicht im Browser. Im Browser-Tab kann Zoomen die Darstellung beeinflussen.
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Fotos werden nicht gespeichert?</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            BusCheck speichert Fotos nur für die aktuelle Sitzung. Nach dem Beenden der App sind die Fotos weg – das ist gewollt für Datenschutz.
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>App bekommt keine E-Mails?</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Prüfe ob eine Internetverbindung besteht. Berichte die offline erstellt wurden werden automatisch gesendet sobald Verbindung besteht.
          </div>
        </Card>

      </div>
    </div>
  )
}
