# BusCheck – Ledermair
## Deployment Guide

### 1. Voraussetzungen
- Node.js ≥ 18
- Vercel-Account (kostenlos)
- Resend-Account (kostenlos bis 100 E-Mails/Tag: resend.com)

---

### 2. Lokale Entwicklung

```bash
npm install
npm run dev
# → http://localhost:5173
```

---

### 3. Deployment auf Vercel

```bash
# Vercel CLI installieren
npm i -g vercel

# Einmalig einrichten
vercel login
vercel link

# Environment Variable setzen (einmalig)
vercel env add RESEND_API_KEY

# Deployen
vercel --prod
```

**Oder direkt über das Vercel Dashboard:**
1. GitHub Repo verbinden
2. Under "Environment Variables": `RESEND_API_KEY = re_xxxxx`
3. Deploy → fertig

---

### 4. SendGrid einrichten

1. **Account anlegen:** https://sendgrid.com (kostenlos bis 100 E-Mails/Tag)
2. **Absender verifizieren** – zwei Optionen:
   - *Schnell:* Settings → Sender Authentication → **Single Sender Verification** (1 Adresse, 2 Min.)
   - *Professionell:* Settings → Sender Authentication → **Domain Authentication** für `ledermair.at` (empfohlen)
3. **API Key erstellen:** Settings → API Keys → Create API Key → **Restricted Access → Mail Send**
4. **In Vercel hinterlegen** (Dashboard → Project → Settings → Environment Variables):
   ```
   SENDGRID_API_KEY = SG.xxxxx...
   SENDGRID_FROM    = buscheck@ledermair.at
   ```
5. Nach dem Setzen der Env-Variablen: **Redeploy** auslösen

**Tipp:** SendGrid bietet im kostenlosen Plan 100 E-Mails/Tag – für den Busbetrieb völlig ausreichend. Beim kostenpflichtigen Essentials-Plan (ca. 15 €/Monat) sind es 50.000/Monat.

---

### 5. App auf iPhone/Android installieren

**iPhone:**
1. Safari → URL öffnen
2. Teilen-Symbol → "Zum Home-Bildschirm"
3. App erscheint als Icon auf dem Homescreen

**Android:**
1. Chrome → URL öffnen
2. Menü → "Zum Startbildschirm hinzufügen"
3. Alternativ: Banner "App installieren" antippen

---

### 6. Verwaltungsseite

Erreichbar unter: `https://deine-url.vercel.app/admin`

Keine zusätzliche Absicherung nötig – separate URL reicht laut Anforderung.

---

### 7. Projektstruktur

```
buscheck/
├── api/
│   └── send-email.js        ← Serverless Function (Resend)
├── src/
│   ├── components/
│   │   └── index.jsx        ← Wiederverwendbare UI-Komponenten
│   ├── screens/
│   │   └── index.jsx        ← Alle App-Screens
│   ├── store/
│   │   └── index.js         ← Zustand (State Management + LocalStorage)
│   ├── utils/
│   │   ├── helpers.js       ← OCR, GPS, Offline-Queue, Bildkomprimierung
│   │   └── pdfGen.js        ← PDF-Generierung (jsPDF)
│   ├── App.jsx              ← Routing
│   ├── main.jsx             ← Einstiegspunkt
│   └── index.css            ← Globales Ledermair-Design
├── index.html
├── vite.config.js           ← PWA-Konfiguration
├── vercel.json
└── package.json
```

---

### 8. Features im Überblick

| Feature | Status |
|---|---|
| Abfahrtskontrolle (6 Schritte) | ✅ |
| Ankunftskontrolle (5 Schritte) | ✅ |
| Führerscheinfoto einmal/Monat | ✅ |
| 8 Pflichtfotos Rundum-Bus | ✅ |
| OCR Kilometerstand (Tesseract.js) | ✅ |
| Ölstand / Tankstand | ✅ |
| Unfallbericht (6 Schritte) | ✅ |
| Fahrzeugskizze mit Markierungen | ✅ |
| Schadensfotos pro Punkt | ✅ |
| Europäischer Unfallbericht (Struktur) | ✅ |
| Digitale Unterschrift (signature_pad) | ✅ |
| PDF-Generierung (jsPDF) | ✅ |
| E-Mail-Versand (Resend) | ✅ |
| Offline-Queue + Auto-Retry | ✅ |
| Bildkomprimierung | ✅ |
| GPS-Koordinaten | ✅ |
| PWA (installierbar) | ✅ |
| Fahrer-Persistenz (LocalStorage) | ✅ |
| Verwaltungsseite | ✅ |
| Vollständig Deutsch | ✅ |
| Ledermair-Design | ✅ |
