// ─── Image Compression ────────────────────────────────────────────────────
export function compressImage(file, maxWidth = 1200, quality = 0.78) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > maxWidth) {
          height = (maxWidth / width) * height
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// ─── Extra-Komprimierung für PDF-Einbettung ───────────────────────────────
// Reduziert Fotos auf PDF-taugliche Größe (max 800px, Q 0.65)
export function compressForPDF(dataUrl, maxWidth = 800, quality = 0.65) {
  if (!dataUrl) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((maxWidth / width) * height)
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl) // Fallback: Original
    img.src = dataUrl
  })
}

// ─── OCR via Tesseract (CDN) – numeric only ───────────────────────────────
let tesseractWorker = null

export async function ocrKilometerstand(imageData) {
  try {
    // Dynamically load tesseract.js from CDN
    if (!window.Tesseract) {
      await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js')
    }

    const { data: { text } } = await window.Tesseract.recognize(imageData, 'deu', {
      logger: () => {},
      tessedit_char_whitelist: '0123456789',
    })

    const digits = text.replace(/\D/g, '')
    const num = parseInt(digits, 10)
    if (!isNaN(num) && num > 1000 && num < 9999999) {
      return { success: true, value: String(num) }
    }
    return { success: false, value: '' }
  } catch (e) {
    console.warn('OCR failed:', e)
    return { success: false, value: '' }
  }
}

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = res
    s.onerror = rej
    document.head.appendChild(s)
  })
}

// ─── GPS ──────────────────────────────────────────────────────────────────
export function getGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6)
        const lng = pos.coords.longitude.toFixed(6)
        resolve(`${lat}° N, ${lng}° E`)
      },
      () => resolve(null),
      { timeout: 5000, maximumAge: 30000 }
    )
  })
}

// ─── Offline Queue ────────────────────────────────────────────────────────
export function setupOfflineSync(store) {
  const tryFlush = async () => {
    if (!navigator.onLine) return
    const queue = store.getState().pendingQueue
    if (queue.length === 0) return

    for (const item of queue) {
      try {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })
        if (res.ok) {
          store.getState().removeFromQueue(item.id)
        }
      } catch (e) {
        // Still offline or error – keep in queue
        break
      }
    }
  }

  window.addEventListener('online', tryFlush)
  // Also try on load
  if (navigator.onLine) tryFlush()

  return () => window.removeEventListener('online', tryFlush)
}

// ─── Send email (with offline fallback) ──────────────────────────────────
export async function sendPDF({ pdfDataUri, filename, to, cc, subject, body, store }) {
  const payload = {
    id: Date.now() + Math.random(),
    pdfDataUri,
    filename,
    to,
    cc,
    subject,
    body,
    timestamp: new Date().toISOString(),
  }

  if (!navigator.onLine) {
    store.getState().addToQueue(payload)
    return { queued: true }
  }

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) return { sent: true }

    // Fehlerdetails aus der API lesen
    let errorDetail = `HTTP ${res.status}`
    try {
      const errData = await res.json()
      errorDetail = errData.detail || errData.error || errorDetail
    } catch {}

    // Bei 4xx nicht in Queue – das ist ein Konfigurationsfehler
    if (res.status >= 400 && res.status < 500) {
      return { error: true, detail: errorDetail }
    }

    // Bei 5xx in Queue für späteren Retry
    store.getState().addToQueue(payload)
    return { queued: true, detail: errorDetail }

  } catch (e) {
    // Netzwerkfehler → Queue
    store.getState().addToQueue(payload)
    return { queued: true, detail: e.message }
  }
}

// ─── Format date for filename ─────────────────────────────────────────────
export function formatFilename(prefix, bus, date) {
  const d = date || new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const str = `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`
  return `${prefix}_${bus.replace(/-/g, '')}_${str}.pdf`
}

// ─── Photo from file input ────────────────────────────────────────────────
export function openCamera(onPhoto) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'environment'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const compressed = await compressImage(file)
    onPhoto(compressed)
  }
  input.click()
}
