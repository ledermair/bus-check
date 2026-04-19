import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// ─── Zoom verhindern (iOS PWA) ────────────────────────────────────────────
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false })
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false })
document.addEventListener('gestureend', e => e.preventDefault(), { passive: false })
document.addEventListener('touchmove', e => {
  if (e.scale !== undefined && e.scale !== 1) e.preventDefault()
}, { passive: false })

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return <InstallPage error={this.state.error.message} />
    }
    return this.props.children
  }
}

function InstallPage({ error }) {
  const url = window.location.origin
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isAndroid = /android/i.test(navigator.userAgent)

  return (
    <div style={{
      background: '#0E0E0F', minHeight: '100vh', color: '#F0EDE8',
      fontFamily: 'system-ui, sans-serif', padding: '0 0 40px',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(200,165,90,0.12) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(26,92,42,0.2)',
        padding: '32px 24px 28px', textAlign: 'center',
      }}>
        <img src="" alt="Ledermair"
          style={{ height: 44, margin: '0 auto 10px', display: 'block', filter: 'brightness(0) invert(1)' }} />
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, color: '#F0EDE8' }}>
          Bus<span style={{ color: '#F5D800' }}>Check</span>
        </div>
        <div style={{ fontSize: 12, color: '#5A5856', marginTop: 4, letterSpacing: 1 }}>
          LEDERMAIR · FAHRZEUGKONTROLLE
        </div>
      </div>

      <div style={{ padding: '24px 20px 0', maxWidth: 420, margin: '0 auto' }}>

        {/* Install prompt */}
        <div style={{
          background: '#172019', border: '1px solid rgba(26,92,42,0.2)',
          borderRadius: 16, padding: '20px', marginBottom: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📲</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>App installieren</div>
          <div style={{ fontSize: 13, color: '#9A9890', lineHeight: 1.6 }}>
            BusCheck läuft direkt im Browser – kein App Store nötig.
            Füge die App zum Homescreen hinzu für den schnellen Zugriff.
          </div>
        </div>

        {/* iPhone instructions */}
        <div style={{
          background: '#172019', border: '1px solid rgba(26,92,42,0.2)',
          borderRadius: 16, padding: '18px', marginBottom: 12,
          ...(isAndroid ? { opacity: 0.5 } : {}),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>🍎</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>iPhone / iPad</span>
            {isIOS && <span style={{
              background: 'rgba(26,92,42,0.2)', color: '#F5D800',
              fontSize: 10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 20, marginLeft: 'auto',
            }}>DIESES GERÄT</span>}
          </div>
          {[
            ['1', 'Safari öffnen', '⚠️ Nur Safari – nicht Chrome!'],
            ['2', 'Diese Seite aufrufen', url],
            ['3', 'Teilen-Symbol tippen', 'Das Quadrat mit dem Pfeil ↑ unten in der Mitte'],
            ['4', '„Zum Home-Bildschirm"', 'In der Liste nach unten scrollen'],
            ['5', '„Hinzufügen" tippen', 'App erscheint sofort auf dem Homescreen'],
          ].map(([nr, title, sub]) => (
            <div key={nr} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                background: 'rgba(200,165,90,0.12)', border: '1px solid rgba(245,216,0,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#F5D800',
              }}>{nr}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
                <div style={{ fontSize: 11, color: '#5A5856', marginTop: 2 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Android instructions */}
        <div style={{
          background: '#172019', border: '1px solid rgba(26,92,42,0.2)',
          borderRadius: 16, padding: '18px', marginBottom: 20,
          ...(isIOS ? { opacity: 0.5 } : {}),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>🤖</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Android</span>
            {isAndroid && <span style={{
              background: 'rgba(26,92,42,0.2)', color: '#F5D800',
              fontSize: 10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 20, marginLeft: 'auto',
            }}>DIESES GERÄT</span>}
          </div>
          {[
            ['1', 'Chrome öffnen', 'Google Chrome verwenden'],
            ['2', 'Diese Seite aufrufen', url],
            ['3', 'Menü antippen', 'Die drei Punkte ⋮ oben rechts'],
            ['4', '„App installieren"', 'Oder: „Zum Startbildschirm hinzufügen"'],
            ['5', 'Bestätigen', 'App erscheint sofort auf dem Homescreen'],
          ].map(([nr, title, sub]) => (
            <div key={nr} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                background: 'rgba(200,165,90,0.12)', border: '1px solid rgba(245,216,0,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#F5D800',
              }}>{nr}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
                <div style={{ fontSize: 11, color: '#5A5856', marginTop: 2 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Direct open button */}
        <a href={url} style={{
          display: 'block', width: '100%', padding: '17px',
          background: 'linear-gradient(135deg, #F5D800, #1A5C2A)',
          color: '#0E0E0F', fontWeight: 800, fontSize: 17,
          textAlign: 'center', borderRadius: 14, textDecoration: 'none',
          boxShadow: '0 6px 20px rgba(200,165,90,0.3)', marginBottom: 12,
        }}>
          App direkt öffnen →
        </a>

        {/* URL display */}
        <div style={{
          background: '#172019', border: '1px solid rgba(200,165,90,0.1)',
          borderRadius: 10, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 14 }}>🔗</span>
          <span style={{ fontSize: 12, color: '#9A9890', wordBreak: 'break-all' }}>{url}</span>
        </div>

        {error && (
          <div style={{
            marginTop: 16, background: 'rgba(217,64,64,0.08)',
            border: '1px solid rgba(217,64,64,0.2)', borderRadius: 10,
            padding: '12px 14px',
          }}>
            <div style={{ fontSize: 11, color: '#5A5856', marginBottom: 4, fontWeight: 700 }}>
              TECHNISCHER FEHLER
            </div>
            <div style={{ fontSize: 11, color: '#D94040', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
