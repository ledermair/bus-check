import { useRef, useEffect, useState } from 'react'
import { LOGO_B64, BUS_VIEWS } from '../brand'
import { openCamera } from '../utils/helpers'

// ─── ScreenHeader ─────────────────────────────────────────────────────────
export function ScreenHeader({ title, subtitle, progress, onBack, right }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const measure = () => {
      const h = el.offsetHeight || 120
      const shell = el.closest('.app-shell')
      if (shell) shell.style.setProperty('--header-height', `${h + 8}px`)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [title, subtitle, progress])

  return (
    <div className="screen-header" ref={ref}>
      <div className="header-row">
        <div className="logo-lockup">
          {onBack
            ? <button className="btn-ghost" onClick={onBack}>‹ Zurück</button>
            : <><div className="logo-mark">LM</div><div className="logo-name">Bus<span>Check</span></div></>
          }
        </div>
        {right
          ? right
          : onBack
            ? <div className="logo-lockup"><div className="logo-mark">LM</div><div className="logo-name">Bus<span>Check</span></div></div>
            : null
        }
      </div>
      <div className="screen-title">{title}</div>
      {subtitle ? <div className="screen-sub">{subtitle}</div> : null}
      {progress !== undefined
        ? <div className="progress-track" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        : null
      }
    </div>
  )
}

// ─── PhotoSlot ────────────────────────────────────────────────────────────
export function PhotoSlot({ label, value, onChange, className = '', wide = false }) {
  const handleClick = () => {
    if (value) onChange(null)
    else openCamera(onChange)
  }

  return (
    <div
      className={`photo-slot ${value ? 'done' : ''} ${className}`}
      onClick={handleClick}
      style={value ? { aspectRatio: 'auto', height: 'auto', padding: 0 } : {}}
    >
      {value ? (
        // Wenn Foto vorhanden: img bestimmt die Höhe, kein fixer Container
        <img
          src={value}
          alt={label}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',       // echtes Seitenverhältnis
            maxHeight: '220px',   // max Höhe damit es nicht riesig wird
            objectFit: 'contain', // kein crop, volles Bild sichtbar
            borderRadius: 7,
            position: 'static',   // kein absolute mehr
          }}
        />
      ) : (
        <>
          <span className="slot-icon">📷</span>
          <span className="slot-label">{label}</span>
        </>
      )}
    </div>
  )
}

// ─── LicensePhotoSlot – Führerschein mit Scheckkartenrahmen ──────────────
// Zeigt Suchrahmen im Kamerabild-Format, speichert nur den Kartenbereich
export function LicensePhotoSlot({ value, onChange, label }) {
  const [cropping, setCropping] = useState(false)
  const [rawPhoto, setRawPhoto] = useState(null)
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  // Scheckkarte: 85.6mm × 53.98mm → ratio 1.586
  const CARD_RATIO = 85.6 / 54

  const handleCapture = () => {
    openCamera((img) => {
      if (!img) return
      setRawPhoto(img)
      setCropping(true)
    })
  }

  const cropAndSave = () => {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return

    // Ziel: Scheckkartenformat
    const outW = 680
    const outH = Math.round(outW / CARD_RATIO)
    canvas.width = outW
    canvas.height = outH

    // Bild in natürlichen Maßen
    const iW = img.naturalWidth
    const iH = img.naturalHeight
    const iRatio = iW / iH

    // Crop-Bereich: 80% der Breite, proportional hoch
    const cropW = iW * 0.82
    const cropH = cropW / CARD_RATIO
    const cropX = (iW - cropW) / 2
    const cropY = (iH - cropH) / 2

    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH)
    const cropped = canvas.toDataURL('image/jpeg', 0.72)
    onChange(cropped)
    setCropping(false)
    setRawPhoto(null)
  }

  if (cropping && rawPhoto) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'center' }}>
          Positioniere den Führerschein im Rahmen
        </div>
        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
          <img ref={imgRef} src={rawPhoto} alt="Vorschau"
            style={{ width: '100%', display: 'block' }} />
          {/* Scheckkarten-Overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '82%',
              aspectRatio: `${CARD_RATIO}`,
              border: '2px solid var(--yellow)',
              borderRadius: 8,
              boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)',
              position: 'relative',
            }}>
              {/* Ecken */}
              {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
                <div key={v+h} style={{
                  position: 'absolute', [v]: -2, [h]: -2,
                  width: 16, height: 16,
                  borderTop: v==='top' ? '3px solid var(--yellow)' : 'none',
                  borderBottom: v==='bottom' ? '3px solid var(--yellow)' : 'none',
                  borderLeft: h==='left' ? '3px solid var(--yellow)' : 'none',
                  borderRight: h==='right' ? '3px solid var(--yellow)' : 'none',
                }} />
              ))}
              <div style={{
                position: 'absolute', bottom: -22, left: 0, right: 0,
                textAlign: 'center', fontSize: 10, color: 'var(--yellow)', fontWeight: 600,
              }}>FÜHRERSCHEIN</div>
            </div>
          </div>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="btn-ghost" style={{ flex: 1 }}
            onClick={() => { setCropping(false); setRawPhoto(null) }}>
            Abbrechen
          </button>
          <button className="btn-primary" style={{ flex: 2 }} onClick={cropAndSave}>
            ✓ Bereich übernehmen
          </button>
        </div>
      </div>
    )
  }

  if (value) {
    return (
      <div>
        <div style={{
          position: 'relative', borderRadius: 10, overflow: 'hidden',
          aspectRatio: `${CARD_RATIO}`,
          border: '2px solid rgba(26,92,42,0.4)',
        }}>
          <img src={value} alt="Führerschein"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.6)', borderRadius: 6,
            padding: '3px 8px', fontSize: 11, color: '#fff', cursor: 'pointer',
          }} onClick={() => onChange(null)}>
            ✕ Löschen
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--green-light)', marginTop: 6, textAlign: 'center' }}>
          ✓ Führerscheinfoto gespeichert
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={handleCapture}
      style={{
        border: '2px dashed rgba(245,216,0,0.35)',
        borderRadius: 10,
        aspectRatio: `${CARD_RATIO}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 8, cursor: 'pointer',
        background: 'rgba(245,216,0,0.04)',
      }}
    >
      <span style={{ fontSize: 28 }}>🪪</span>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          {label || 'Führerschein fotografieren'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
          Scheckkarten-Format · Rahmen ausrichten
        </div>
      </div>
    </div>
  )
}
export function ToggleGroup({ options, value, onChange, colorMap }) {
  return (
    <div className="toggle-group">
      {options.map((opt) => {
        const sel = value === opt
        let cls = ''
        if (sel) {
          cls = colorMap?.[opt] || 'sel-neu'
        }
        return (
          <div
            key={opt}
            className={`toggle-btn ${cls}`}
            onClick={() => onChange(opt === value ? '' : opt)}
          >
            {opt}
          </div>
        )
      })}
    </div>
  )
}

// ─── FieldGroup ───────────────────────────────────────────────────────────
export function FieldGroup({ label, required, children }) {
  return (
    <div className="field">
      <div className="field-label">
        {label}
        {required && <span className="req">*</span>}
      </div>
      {children}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────
export function Card({ icon, title, children }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-icon">{icon}</div>
        <div className="card-title">{title}</div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

// ─── SignaturePad ─────────────────────────────────────────────────────────
export function SignaturePad({ value, onChange, label }) {
  const canvasRef = useRef(null)
  const padRef = useRef(null)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Dynamically load signature_pad
    const init = async () => {
      const { default: SignaturePad } = await import('signature_pad')
      const pad = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255,255,255,0)',
        penColor: '#1a1a2e',
        minWidth: 1,
        maxWidth: 3,
      })
      padRef.current = pad

      if (value) {
        pad.fromDataURL(value)
        setIsEmpty(false)
      }

      pad.addEventListener('endStroke', () => {
        setIsEmpty(pad.isEmpty())
        onChange(pad.toDataURL('image/png'))
      })
    }
    init()

    // Resize
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      canvas.getContext('2d').scale(ratio, ratio)
      padRef.current?.clear()
      setIsEmpty(true)
      onChange(null)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    return () => resizeObserver.disconnect()
  }, [])

  const clear = (e) => {
    e.stopPropagation()
    padRef.current?.clear()
    setIsEmpty(true)
    onChange(null)
  }

  return (
    <div>
      <div className="sig-wrap" style={{ touchAction: 'none' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        {isEmpty && <div className="sig-hint">Hier unterschreiben →</div>}
        <div className="sig-line" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
        {!isEmpty && (
          <span style={{ fontSize: 11, color: 'var(--gold)', cursor: 'pointer' }} onClick={clear}>
            Löschen
          </span>
        )}
      </div>
    </div>
  )
}

// ─── CauseTagGroup ────────────────────────────────────────────────────────
const CAUSES = [
  'Rückwärtsfahren', 'Parken', 'Enge Straße / Zufahrt', 'Bäume',
  'Toter Winkel', 'Mit Einweiser', 'Ohne Einweiser', 'Be- und Entladen',
]

export function CauseTagGroup({ value = [], onChange }) {
  const toggle = (c) => {
    if (value.includes(c)) onChange(value.filter((x) => x !== c))
    else onChange([...value, c])
  }
  return (
    <div className="cause-tags">
      {CAUSES.map((c) => (
        <div key={c} className={`cause-tag ${value.includes(c) ? 'on' : ''}`} onClick={() => toggle(c)}>
          {c}
        </div>
      ))}
    </div>
  )
}

// ─── VehicleSketch ────────────────────────────────────────────────────────
const VIEWS = [
  { key: 'Vorne',  label: 'Vorne',  img: 'vorne'  },
  { key: 'Links',  label: 'Links',  img: 'links'  },
  { key: 'Hinten', label: 'Hinten', img: 'hinten' },
  { key: 'Rechts', label: 'Rechts', img: 'rechts' },
]

export function VehicleSketch({ points = [], onChange }) {
  const [activeView, setActiveView] = useState('Vorne')
  const areaRef = useRef(null)
  const viewPoints = points.filter((p) => p.view === activeView)
  const currentView = VIEWS.find(v => v.key === activeView)

  const handleAreaClick = (e) => {
    const rect = areaRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const newId = points.length + 1
    onChange([...points, { id: newId, view: activeView, x, y }])
  }

  const removePoint = (id, e) => {
    e.stopPropagation()
    onChange(points.filter((p) => p.id !== id))
  }

  return (
    <div className="sketch-wrap">
      {/* Tabs */}
      <div className="sketch-tabs">
        {VIEWS.map((v) => {
          const cnt = points.filter((p) => p.view === v.key).length
          return (
            <div
              key={v.key}
              className={`sketch-tab ${activeView === v.key ? 'active' : ''}`}
              onClick={() => setActiveView(v.key)}
            >
              {v.label}
              {cnt > 0 && <span style={{ color: 'var(--red)', marginLeft: 3, fontSize: 10 }}>●{cnt}</span>}
            </div>
          )
        })}
      </div>

      {/* Bus-Foto mit Markierungspunkten */}
      <div
        className="sketch-canvas-wrap"
        ref={areaRef}
        onClick={handleAreaClick}
        style={{ padding: 0, position: 'relative', cursor: 'crosshair' }}
      >
        <img
          src={BUS_VIEWS[currentView?.img]}
          alt={activeView}
          style={{
            width: '100%',
            display: 'block',
            userSelect: 'none',
            pointerEvents: 'none',
            borderRadius: '0 0 0 0',
          }}
          draggable={false}
        />
        {/* Rote Markierungspunkte */}
        {viewPoints.map((p) => (
          <div
            key={p.id}
            className="damage-dot"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onClick={(e) => removePoint(p.id, e)}
          >
            {p.id}
          </div>
        ))}
      </div>

      <div style={{ padding: '7px 12px 10px', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>Tippen = Marker setzen · Marker antippen = löschen</span>
        <span style={{ color: points.length > 0 ? 'var(--red)' : 'var(--text-muted)' }}>
          {points.length} Punkt{points.length !== 1 ? 'e' : ''}
        </span>
      </div>
    </div>
  )
}

// ─── DateTimePicker ───────────────────────────────────────────────────────
// Datum mit Kalender, Uhrzeit mit Schiebereglern
// value: { datum: 'TT.MM.JJJJ', uhrzeit: 'HH:MM Uhr' }
// onChange: ({ datum, uhrzeit }) => void

export function DateTimePicker({ datum, uhrzeit, onChangeDatum, onChangeUhrzeit }) {
  const [showCal, setShowCal] = useState(false)
  const [showTime, setShowTime] = useState(false)

  // Parse datum TT.MM.JJJJ → Date
  const parseDate = (str) => {
    if (!str) return new Date()
    const [d, m, y] = str.split('.')
    return new Date(+y, +m - 1, +d)
  }

  // Parse uhrzeit 'HH:MM Uhr' → { h, m }
  const parseTime = (str) => {
    if (!str) return { h: new Date().getHours(), m: new Date().getMinutes() }
    const clean = str.replace(' Uhr', '').trim()
    const [h, m] = clean.split(':').map(Number)
    return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m }
  }

  const formatDate = (d) => {
    const pad = n => String(n).padStart(2, '0')
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
  }

  const formatTime = (h, m) => {
    const pad = n => String(n).padStart(2, '0')
    return `${pad(h)}:${pad(m)} Uhr`
  }

  const currentDate = parseDate(datum)
  const { h: currentH, m: currentM } = parseTime(uhrzeit)

  // Calendar state
  const [calYear, setCalYear] = useState(currentDate.getFullYear())
  const [calMonth, setCalMonth] = useState(currentDate.getMonth())

  const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  const DAYS = ['Mo','Di','Mi','Do','Fr','Sa','So']

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
  const getFirstDayOfMonth = (y, m) => {
    const d = new Date(y, m, 1).getDay()
    return d === 0 ? 6 : d - 1  // Mon=0
  }

  const selectDay = (day) => {
    const newDate = new Date(calYear, calMonth, day)
    onChangeDatum(formatDate(newDate))
    setShowCal(false)
  }

  const pickerStyle = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }

  const sheetStyle = {
    background: 'var(--dark2)',
    borderRadius: '20px 20px 0 0',
    width: '100%', maxWidth: 480,
    padding: '20px 16px 40px',
    border: '1px solid var(--border-green)',
    borderBottom: 'none',
  }

  return (
    <div className="two-col">
      {/* Datum Button */}
      <FieldGroup label="Datum">
        <div
          className="field-input"
          onClick={() => { setShowCal(true); setShowTime(false) }}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <span>{datum}</span>
          <span style={{ fontSize: 14, opacity: 0.5 }}>📅</span>
        </div>
      </FieldGroup>

      {/* Uhrzeit Button */}
      <FieldGroup label="Uhrzeit">
        <div
          className="field-input"
          onClick={() => { setShowTime(true); setShowCal(false) }}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <span>{uhrzeit}</span>
          <span style={{ fontSize: 14, opacity: 0.5 }}>🕐</span>
        </div>
      </FieldGroup>

      {/* Kalender Modal */}
      {showCal && (
        <div style={pickerStyle} onClick={() => setShowCal(false)}>
          <div style={sheetStyle} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button
                onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }}
                style={{ background: 'var(--dark4)', border: 'none', color: 'var(--text)', fontSize: 18, width: 36, height: 36, borderRadius: 10, cursor: 'pointer' }}>‹</button>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 17, color: 'var(--yellow)' }}>
                {MONTHS[calMonth]} {calYear}
              </div>
              <button
                onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }}
                style={{ background: 'var(--dark4)', border: 'none', color: 'var(--text)', fontSize: 18, width: 36, height: 36, borderRadius: 10, cursor: 'pointer' }}>›</button>
            </div>

            {/* Wochentage */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
              ))}
            </div>

            {/* Tage */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {/* Leere Felder vor dem 1. */}
              {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }).map((_, i) => (
                <div key={`e${i}`} />
              ))}
              {/* Tage */}
              {Array.from({ length: getDaysInMonth(calYear, calMonth) }, (_, i) => i + 1).map(day => {
                const isSelected = (
                  currentDate.getDate() === day &&
                  currentDate.getMonth() === calMonth &&
                  currentDate.getFullYear() === calYear
                )
                const isToday = (
                  new Date().getDate() === day &&
                  new Date().getMonth() === calMonth &&
                  new Date().getFullYear() === calYear
                )
                return (
                  <div
                    key={day}
                    onClick={() => selectDay(day)}
                    style={{
                      textAlign: 'center',
                      padding: '9px 0',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: isSelected ? 700 : 400,
                      cursor: 'pointer',
                      background: isSelected
                        ? 'var(--green)'
                        : isToday
                        ? 'rgba(245,216,0,0.12)'
                        : 'transparent',
                      color: isSelected ? '#fff' : isToday ? 'var(--yellow)' : 'var(--text)',
                      border: isToday && !isSelected ? '1px solid rgba(245,216,0,0.3)' : '1px solid transparent',
                    }}
                  >
                    {day}
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => setShowCal(false)}
              className="btn-primary"
              style={{ marginTop: 16 }}
            >
              Fertig
            </button>
          </div>
        </div>
      )}

      {/* Zeit Modal */}
      {showTime && (
        <div style={pickerStyle} onClick={() => setShowTime(false)}>
          <div style={sheetStyle} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 17, color: 'var(--yellow)', marginBottom: 20, textAlign: 'center' }}>
              Uhrzeit auswählen
            </div>

            {/* Große Zeitanzeige */}
            <div style={{ textAlign: 'center', fontSize: 52, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text)', letterSpacing: 2, marginBottom: 24 }}>
              {String(currentH).padStart(2,'0')}:{String(currentM).padStart(2,'0')}
            </div>

            {/* Stunden Regler */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Stunden</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>{String(currentH).padStart(2,'0')}</span>
              </div>
              <input
                type="range" min="0" max="23" value={currentH}
                onChange={e => onChangeUhrzeit(formatTime(+e.target.value, currentM))}
                style={{ width: '100%', accentColor: 'var(--green)', height: 4, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>00</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>12</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>23</span>
              </div>
            </div>

            {/* Minuten Regler */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Minuten</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>{String(currentM).padStart(2,'0')}</span>
              </div>
              <input
                type="range" min="0" max="59" value={currentM}
                onChange={e => onChangeUhrzeit(formatTime(currentH, +e.target.value))}
                style={{ width: '100%', accentColor: 'var(--green)', height: 4, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>00</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>30</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>59</span>
              </div>
            </div>

            {/* Schnellauswahl */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {['06:00','07:00','08:00','12:00','14:00','16:00','18:00','20:00'].map(t => {
                const [th, tm] = t.split(':').map(Number)
                return (
                  <div
                    key={t}
                    onClick={() => onChangeUhrzeit(formatTime(th, tm))}
                    style={{
                      padding: '6px 12px',
                      background: currentH === th && currentM === tm ? 'var(--green)' : 'var(--dark4)',
                      border: `1px solid ${currentH === th && currentM === tm ? 'var(--green-light)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 20,
                      fontSize: 12, fontWeight: 600,
                      color: currentH === th && currentM === tm ? '#fff' : 'var(--text-dim)',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </div>
                )
              })}
            </div>

            <button onClick={() => setShowTime(false)} className="btn-primary">Fertig</button>
          </div>
        </div>
      )}
    </div>
  )
}
