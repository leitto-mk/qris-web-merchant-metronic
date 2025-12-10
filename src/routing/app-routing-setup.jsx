import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout1 } from '@/components/layouts/layout-1';
import { LoginPage } from '@/pages/auth/login';
import { Fragment } from 'react';
import { MerchantPage } from '@/pages/metronic-layouts/layout-1/merchant';
import { MerchantReportPage } from '@/pages/metronic-layouts/layout-1/merchant-report.jsx';
import { OutletPage } from '@/pages/metronic-layouts/layout-1/outlets.jsx';
import { AppDataProvider } from '@/context/AppDataContext.jsx';
import AuthService from '@/services/AuthService';
import { Layout32 } from '@/components/layouts/layout-32/index.jsx';
import { Layout32Page } from '@/pages/metronic-layouts/layout-32/terminal-page.jsx';
import { TerminalQRDisplay } from '@/pages/metronic-layouts/layout-32/terminal-qr-display.jsx';

function RequireAuth({ children }) {
  const location = useLocation();
  const isValid = AuthService.isSessionValid();

  if (!isValid) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Fragment>{children}</Fragment>;
}

export function AppRoutingSetup() {
  const session = JSON.parse(localStorage.getItem('qris-web-merchant-data'));
  const isAdmin = session?.access_type === 'ADM';

  return (
    <Routes>
      {/* Random Route */}
      <Route path="*" element={
        AuthService.isSessionValid() ?
        <Navigate to={isAdmin ? '/merchant' : '/terminal/outlet'} replace /> :
        <Navigate to="/login" replace />}
      />

      {/* Force Login */}
      <Route
        path="/login"
        element={AuthService.isSessionValid() ?
          <Navigate to={isAdmin ? '/merchant' : '/terminal/outlet'} replace /> :
          <LoginPage />}
      />

      {/* Protected routes */}
      {isAdmin ? (
        <Route element={
          <RequireAuth>
            <AppDataProvider session={session}>
              <Layout1 />
            </AppDataProvider>
          </RequireAuth>
        }>
          <Route path="/merchant" element={<MerchantPage />} />
          <Route path="/outlet" element={<OutletPage />} />
          <Route path="/report" element={<MerchantReportPage />} />
          <Route path="*" element={<Navigate to="/merchant" replace />} />
        </Route>
      ): (
        <Route element={
          <RequireAuth>
            <AppDataProvider session={session}>
              <Layout32 />
            </AppDataProvider>
          </RequireAuth>
        }>
          <Route path="/terminal/outlet" element={<Layout32Page />} />
          <Route path="/terminal/pembayaran" element={<Layout32Page />} />
        </Route>
      )}

      {/* Customer QR Display */}
      <Route path="/terminal/qr-display" element={<TerminalQRDisplay />} />

    </Routes>
  );
}
