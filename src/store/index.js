import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Führerscheinfotos in sessionStorage (überlebt Page-Reload, nicht App-Kill) 
const LICENSE_KEY = 'buscheck_license_photos'
const saveLicensePhotos = (photos) => { try { sessionStorage.setItem(LICENSE_KEY, JSON.stringify(photos)) } catch {} }
const loadLicensePhotos = () => { try { return JSON.parse(sessionStorage.getItem(LICENSE_KEY) || '{}') } catch { return {} } }

// ─── App Store (NUR kleine Daten in localStorage – KEINE Fotos!) ──────────
export const useAppStore = create(
  persist(
    (set, get) => ({
      driver: null,
      setDriver: (d) => set({ driver: d }),

      settings: {
        buses: ['SZ-305FA', 'SZ-443TI', 'SZ-364TI', 'SZ-365TI', 'SZ-631KG'],
        vehicleDetails: [
          { kennzeichen: 'SZ-305FA', polizeinummer: '', versicherung: '', versicherungspolice: '' },
          { kennzeichen: 'SZ-443TI', polizeinummer: '', versicherung: '', versicherungspolice: '' },
          { kennzeichen: 'SZ-364TI', polizeinummer: '', versicherung: '', versicherungspolice: '' },
          { kennzeichen: 'SZ-365TI', polizeinummer: '', versicherung: '', versicherungspolice: '' },
          { kennzeichen: 'SZ-631KG', polizeinummer: '', versicherung: '', versicherungspolice: '' },
        ],
        drivers: [
          { nr: '5077', name: 'Christoph Budeck' },
          { nr: '5065', name: 'Ömer Bülbül' },
        ],
        emailUebergabe: 'übergabe@ledermair.at',
        emailSchaden: 'schaden@ledermair.at',
        emailVersicherung: 'versicherung@partner.at',
      },
      updateSettings: (s) => set({ settings: s }),

      licensePhotoDates: {},
      setLicensePhotoDate: (driverNr, ym) =>
        set((s) => ({ licensePhotoDates: { ...s.licensePhotoDates, [driverNr]: ym } })),

      // Fotos gehen in sessionStorage – NICHT in localStorage
      setLicensePhoto: (driverNr, photo) => {
        const all = loadLicensePhotos()
        all[driverNr] = photo
        saveLicensePhotos(all)
      },
      getLicensePhoto: (driverNr) => loadLicensePhotos()[driverNr] || null,

      needsLicensePhoto: (driverNr) => {
        const current = new Date().toISOString().slice(0, 7)
        return get().licensePhotoDates[driverNr] !== current
      },

      // Queue: nur Metadaten in localStorage, PDF-Base64 in sessionStorage
      pendingQueue: [],
      addToQueue: (item) => {
        const id = item.id || (Date.now() + Math.random())
        try { sessionStorage.setItem(`qpdf_${id}`, item.pdfBase64 || '') } catch (e) { console.warn('Queue storage full:', e) }
        const meta = { id, filename: item.filename, to: item.to, cc: item.cc, subject: item.subject, body: item.body, timestamp: item.timestamp }
        set((s) => ({ pendingQueue: [...s.pendingQueue, meta] }))
      },
      removeFromQueue: (id) => {
        try { sessionStorage.removeItem(`qpdf_${id}`) } catch {}
        set((s) => ({ pendingQueue: s.pendingQueue.filter((x) => x.id !== id) }))
      },
      clearQueue: () => {
        get().pendingQueue.forEach(item => { try { sessionStorage.removeItem(`qpdf_${item.id}`) } catch {} })
        set({ pendingQueue: [] })
      },
    }),
    {
      name: 'buscheck-store',
      // KRITISCH: Nur kleine Metadaten – keine Fotos, keine Base64-Strings!
      partialize: (state) => ({
        driver: state.driver,
        settings: state.settings,
        licensePhotoDates: state.licensePhotoDates,
        pendingQueue: state.pendingQueue,
      }),
    }
  )
)

// ─── Form Store (niemals persistiert) ─────────────────────────────────────
export const useFormStore = create((set) => ({
  kontrolle: {
    type: 'abfahrt', bus: '',
    datum: '', uhrzeit: '',
    fahrauftrag: '', ziel: '', emailKopie: '',
    licensePhoto: null, busPhotos: {},
    kmPhoto: null, kmValue: '',
    oelPhoto: null, oelStatus: '',
    tankPhoto: null, tankStatus: '',
    schaeden: null, signature: null,
  },
  setKontrolle: (k) => set((s) => ({ kontrolle: { ...s.kontrolle, ...k } })),
  resetKontrolle: (type = 'abfahrt') => set({ kontrolle: {
    type, bus: '',
    datum: new Date().toLocaleDateString('de-AT'),
    uhrzeit: new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) + ' Uhr',
    fahrauftrag: '', ziel: '', emailKopie: '',
    licensePhoto: null, busPhotos: {},
    kmPhoto: null, kmValue: '',
    oelPhoto: null, oelStatus: '',
    tankPhoto: null, tankStatus: '',
    schaeden: null, signature: null,
  }}),

  unfall: {
    datum: '', uhrzeit: '', ort: '', gps: '',
    bus: '', fahrer: '',
    unserPolizeinummer: '', unserVersicherung: '',
    gegnerKennzeichen: '', gegnerFahrer: '', gegnerAdresse: '',
    gegnerTelefon: '', gegnerEmail: '',
    gegnerVersicherung: '', gegnerVersicherungsNr: '',
    hatGegner: null, zeugen: '',
    damagePoints: [], damagePhotos: {}, extraPhotos: [],
    causes: [], hergang: '',
    polizeiGerufen: null, polizeiDienststelle: '',
    polizeiAktenzeichen: '', polizeiAnsprechpartner: '',
    polizeiFoto: null, signature1: null, signature2: null, emailKopie: '',
  },
  setUnfall: (u) => set((s) => ({ unfall: { ...s.unfall, ...u } })),
  resetUnfall: () => set({ unfall: {
    datum: new Date().toLocaleDateString('de-AT'),
    uhrzeit: new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) + ' Uhr',
    ort: '', gps: '', bus: '', fahrer: '',
    unserPolizeinummer: '', unserVersicherung: '',
    gegnerKennzeichen: '', gegnerFahrer: '', gegnerAdresse: '',
    gegnerTelefon: '', gegnerEmail: '',
    gegnerVersicherung: '', gegnerVersicherungsNr: '',
    hatGegner: null, zeugen: '',
    damagePoints: [], damagePhotos: {}, extraPhotos: [],
    causes: [], hergang: '',
    polizeiGerufen: null, polizeiDienststelle: '',
    polizeiAktenzeichen: '', polizeiAnsprechpartner: '',
    polizeiFoto: null, signature1: null, signature2: null, emailKopie: '',
  }}),
}))
