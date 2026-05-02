import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';

import { Login } from './pages/Login';
import { PublicVerify } from './pages/PublicVerify';

import { Dashboard } from './pages/Dashboard';
import { CreateShipment } from './pages/CreateShipment';
import { UploadDocuments } from './pages/UploadDocuments';
import { LiveTracking } from './pages/LiveTracking';
import { ShipmentTimeline } from './pages/ShipmentTimeline';
import { Alerts } from './pages/Alerts';
import { FinalVerification } from './pages/FinalVerification';
import { AnalyticsAudit } from './pages/AnalyticsAudit';
import { TamperDetection } from './pages/TamperDetection';

import { DriverManifest } from './pages/roles/DriverManifest';
import { DriverDashboard } from './pages/roles/DriverDashboard';
import { WarehouseDashboard } from './pages/roles/WarehouseDashboard';
import { CustomsDashboard } from './pages/roles/CustomsDashboard';

function RequireAuth() {
  const { role } = useAuth();
  if (!role || role === 'Customer') {
    return <Navigate to="/login" replace />;
  }
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/verify/:shipmentId" element={<PublicVerify />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Authenticated Routes wrapped in Layout */}
          <Route element={<RequireAuth />}>
            {/* Supplier Routes */}
            <Route path="/supplier" element={<Dashboard />} />
            <Route path="/supplier/create" element={<CreateShipment />} />
            <Route path="/supplier/upload" element={<UploadDocuments />} />
            <Route path="/supplier/tracking" element={<LiveTracking />} />
            <Route path="/supplier/timeline" element={<ShipmentTimeline />} />
            <Route path="/supplier/alerts" element={<Alerts />} />
            <Route path="/supplier/analytics" element={<AnalyticsAudit />} />
            <Route path="/supplier/verify" element={<FinalVerification />} />
            <Route path="/supplier/tamper" element={<TamperDetection />} />

            {/* Driver Routes */}
            <Route path="/driver" element={<DriverManifest />} />
            <Route path="/driver/handoff" element={<DriverDashboard />} />

            {/* Warehouse Routes */}
            <Route path="/warehouse" element={<Dashboard />} />
            <Route path="/warehouse/intake" element={<WarehouseDashboard />} />

            {/* Customs Routes */}
            <Route path="/customs" element={<Dashboard />} />
            <Route path="/customs/clearance" element={<CustomsDashboard />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
