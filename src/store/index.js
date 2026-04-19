import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── App Store ─────────────────────────────────────────────────────────────
export const useAppStore = create(
  persist(
    (set, get) => ({
      // Driver
      driver: null, // { nr, name, email }
      setDriver: (d) => set({ driver: d }),

      // Settings (admin)
      settings: {
        buses: ['SZ-305FA', 'SZ-443TI', 'SZ-364TI', 'SZ-365TI', 'SZ-631KG'],
        // Erweiterte Fahrzeugdaten: { kennzeichen, polizeinummer, versicherung, versicherungspolice }
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

      // License photo tracking: { driverNr: 'YYYY-MM' }
      licensePhotoDates: {},
      // License photo storage: { driverNr: dataURL } – letztes Foto gespeichert
      licensePhotos: {},

      setLicensePhotoDate: (driverNr, yearMonth) =>
        set((state) => ({
          licensePhotoDates: { ...state.licensePhotoDates, [driverNr]: yearMonth },
        })),

      setLicensePhoto: (driverNr, photoDataUrl) =>
        set((state) => ({
          licensePhotos: { ...state.licensePhotos, [driverNr]: photoDataUrl },
        })),

      getLicensePhoto: (driverNr) => get().licensePhotos[driverNr] || null,

      needsLicensePhoto: (driverNr) => {
        const current = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
        return get().licensePhotoDates[driverNr] !== current
      },

      // Offline queue
      pendingQueue: [],
      addToQueue: (item) => set((s) => ({ pendingQueue: [...s.pendingQueue, item] })),
      removeFromQueue: (id) => set((s) => ({ pendingQueue: s.pendingQueue.filter((x) => x.id !== id) })),
      clearQueue: () => set({ pendingQueue: [] }),
    }),
    {
      name: 'buscheck-store',
      partialize: (state) => ({
        driver: state.driver,
        settings: state.settings,
        licensePhotoDates: state.licensePhotoDates,
        licensePhotos: state.licensePhotos,
        pendingQueue: state.pendingQueue,
      }),
    }
  )
)

// ─── Current form store (not persisted) ───────────────────────────────────
export const useFormStore = create((set, get) => ({
  // Abfahrt / Ankunft
  kontrolle: {
    type: 'abfahrt', // 'abfahrt' | 'ankunft'
    bus: '',
    datum: '',
    uhrzeit: '',
    fahrauftrag: '',
    ziel: '',
    emailKopie: '',
    licensePhoto: null,
    busPhotos: {}, // key: position name, value: dataURL
    kmPhoto: null,
    kmValue: '',
    oelPhoto: null,
    oelStatus: '',
    tankPhoto: null,
    tankStatus: '',
    schaeden: null, // true | false
    signature: null,
  },
  setKontrolle: (k) => set((s) => ({ kontrolle: { ...s.kontrolle, ...k } })),
  resetKontrolle: (type = 'abfahrt') =>
    set({
      kontrolle: {
        type,
        bus: '',
        datum: new Date().toLocaleDateString('de-AT'),
        uhrzeit: new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) + ' Uhr',
        fahrauftrag: '',
        ziel: '',
        emailKopie: '',
        licensePhoto: null,
        busPhotos: {},
        kmPhoto: null,
        kmValue: '',
        oelPhoto: null,
        oelStatus: '',
        tankPhoto: null,
        tankStatus: '',
        schaeden: null,
        signature: null,
      },
    }),

  // Unfallbericht
  unfall: {
    datum: '',
    uhrzeit: '',
    ort: '',
    gps: '',
    bus: '',
    fahrer: '',
    unserPolizeinummer: '',
    unserVersicherung: '',
    gegnerKennzeichen: '',
    gegnerFahrer: '',
    gegnerAdresse: '',
    gegnerTelefon: '',
    gegnerEmail: '',
    gegnerVersicherung: '',
    gegnerVersicherungsNr: '',
    hatGegner: null, // null = nicht gewählt, true = Ja, false = Nein
    zeugen: '',
    damagePoints: [],
    damagePhotos: {},
    extraPhotos: [],
    causes: [],
    hergang: '',
    polizeiGerufen: null,
    polizeiDienststelle: '',
    polizeiAktenzeichen: '',
    polizeiAnsprechpartner: '',
    polizeiFoto: null,
    signature1: null,
    signature2: null,
    emailKopie: '',
  },
  setUnfall: (u) => set((s) => ({ unfall: { ...s.unfall, ...u } })),
  resetUnfall: () =>
    set({
      unfall: {
        datum: new Date().toLocaleDateString('de-AT'),
        uhrzeit: new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) + ' Uhr',
        ort: '',
        gps: '',
        bus: '',
        fahrer: '',
        unserPolizeinummer: '',
        unserVersicherung: '',
        gegnerKennzeichen: '',
        gegnerFahrer: '',
        gegnerAdresse: '',
        gegnerTelefon: '',
        gegnerEmail: '',
        gegnerVersicherung: '',
        gegnerVersicherungsNr: '',
        hatGegner: null,
        zeugen: '',
        damagePoints: [],
        damagePhotos: {},
        extraPhotos: [],
        causes: [],
        hergang: '',
        polizeiGerufen: null,
        polizeiDienststelle: '',
        polizeiAktenzeichen: '',
        polizeiAnsprechpartner: '',
        polizeiFoto: null,
        signature1: null,
        signature2: null,
        emailKopie: '',
      },
    }),
}))
