import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import Notifications from './pages/Notifications';
import Overview from './pages/Overview';
import PricingAndDiscounts from './pages/PricingAndDiscounts';
import Requests from './pages/Requests';
import Services from './pages/Services';
import Store from './pages/Store';
import Users from './pages/Users';
import Workers from './pages/Workers';
import ZonePricing from './pages/ZonePricing';
import DynamicPricing from './pages/DynamicPricing';
import AnalyticsHub    from './pages/analytics/index';
import FinancialKPIs   from './pages/analytics/FinancialKPIs';
import Charts          from './pages/analytics/Charts';
import AIInsights      from './pages/analytics/AIInsights';
import PaymentsTable   from './pages/analytics/PaymentsTable';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Default Route goes to Overview */}
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="users" element={<Users />} />
          <Route path="requests" element={<Requests />} />
          <Route path="store" element={<Store />} />
          <Route path="workers" element={<Workers />} />
          <Route path="pricing" element={<PricingAndDiscounts />} />
          <Route path="services" element={<Services />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="zone-pricing" element={<ZonePricing />} />
          <Route path="dynamic-pricing" element={<DynamicPricing />} />
          <Route path="analytics" element={<AnalyticsHub />} />
          <Route path="analytics/kpis"     element={<FinancialKPIs />} />
          <Route path="analytics/charts"   element={<Charts />} />
          <Route path="analytics/insights" element={<AIInsights />} />
          <Route path="analytics/payments" element={<PaymentsTable />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
