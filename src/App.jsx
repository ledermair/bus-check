import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import './index.css'
import { useAppStore } from './store'
import { setupOfflineSync } from './utils/helpers'
import {
  HomeScreen,
  DriverSetup,
  KontrolleStep1,
  AbfahrtStep2,
  KontrolleStep3,
  KontrolleStep4,
  KontrolleStep5,
  KontrolleStep6,
  UnfallStep1,
  UnfallStep2,
  UnfallStep3,
  UnfallStep4,
  UnfallStep5,
  UnfallStep6,
  AdminScreen,
} from './screens'

// ─── Wrapper-Komponenten außerhalb von App() definiert ────────────────────
const AbfahrtStep1 = () => <KontrolleStep1 isAbfahrt={true} />
const AbfahrtStep3 = () => <KontrolleStep3 isAbfahrt={true} />
const AbfahrtStep4 = () => <KontrolleStep4 isAbfahrt={true} />
const AbfahrtStep5 = () => <KontrolleStep5 isAbfahrt={true} />
const AbfahrtStep6 = () => <KontrolleStep6 isAbfahrt={true} />

const AnkunftStep1 = () => <KontrolleStep1 isAbfahrt={false} />
const AnkunftStep2 = () => <KontrolleStep3 isAbfahrt={false} />
const AnkunftStep3 = () => <KontrolleStep4 isAbfahrt={false} />
const AnkunftStep4 = () => <KontrolleStep5 isAbfahrt={false} />
const AnkunftStep5 = () => <KontrolleStep6 isAbfahrt={false} />

// ─── App ──────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    const cleanup = setupOfflineSync(useAppStore)

    // PWA: Beim App-Start immer zur Startseite – verhindert dass die App
    // auf einer alten Route (z.B. /unfall/3) startet
    if (window.location.pathname !== '/' && window.location.pathname !== '/setup') {
      window.history.replaceState(null, '', '/')
    }

    return cleanup
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<HomeScreen />} />
        <Route path="/setup"  element={<DriverSetup />} />

        {/* Abfahrtskontrolle */}
        <Route path="/abfahrt/1" element={<AbfahrtStep1 />} />
        <Route path="/abfahrt/2" element={<AbfahrtStep2 />} />
        <Route path="/abfahrt/3" element={<AbfahrtStep3 />} />
        <Route path="/abfahrt/4" element={<AbfahrtStep4 />} />
        <Route path="/abfahrt/5" element={<AbfahrtStep5 />} />
        <Route path="/abfahrt/6" element={<AbfahrtStep6 />} />

        {/* Ankunftskontrolle */}
        <Route path="/ankunft/1" element={<AnkunftStep1 />} />
        <Route path="/ankunft/2" element={<AnkunftStep2 />} />
        <Route path="/ankunft/3" element={<AnkunftStep3 />} />
        <Route path="/ankunft/4" element={<AnkunftStep4 />} />
        <Route path="/ankunft/5" element={<AnkunftStep5 />} />

        {/* Unfallbericht */}
        <Route path="/unfall/1" element={<UnfallStep1 />} />
        <Route path="/unfall/2" element={<UnfallStep2 />} />
        <Route path="/unfall/3" element={<UnfallStep3 />} />
        <Route path="/unfall/4" element={<UnfallStep4 />} />
        <Route path="/unfall/5" element={<UnfallStep5 />} />
        <Route path="/unfall/6" element={<UnfallStep6 />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminScreen />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
