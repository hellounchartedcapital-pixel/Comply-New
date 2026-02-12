import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Properties = lazy(() => import('@/pages/Properties'));
const PropertyDetail = lazy(() => import('@/pages/PropertyDetail'));
const Vendors = lazy(() => import('@/pages/Vendors'));
const AddVendor = lazy(() => import('@/pages/AddVendor'));
const Tenants = lazy(() => import('@/pages/Tenants'));
const AddTenant = lazy(() => import('@/pages/AddTenant'));
const COIUpload = lazy(() => import('@/pages/COIUpload'));
const Requirements = lazy(() => import('@/pages/Requirements'));
const Reports = lazy(() => import('@/pages/Reports'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const BulkImport = lazy(() => import('@/pages/BulkImport'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const VendorPortal = lazy(() => import('@/pages/VendorPortal'));
const Login = lazy(() => import('@/pages/Login'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Loading SmartCOI..." />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Suspense fallback={<PageLoader />}>
              <LandingPage />
            </Suspense>
          )
        }
      />
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Suspense fallback={<PageLoader />}>
              <Login />
            </Suspense>
          )
        }
      />
      <Route
        path="/vendor-portal"
        element={
          <Suspense fallback={<PageLoader />}>
            <VendorPortal />
          </Suspense>
        }
      />

      {/* Protected routes (require auth) */}
      <Route element={user ? <AppLayout /> : <Navigate to="/login" replace />}>
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="/properties"
          element={
            <Suspense fallback={<PageLoader />}>
              <Properties />
            </Suspense>
          }
        />
        <Route
          path="/properties/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <PropertyDetail />
            </Suspense>
          }
        />
        <Route
          path="/vendors"
          element={
            <Suspense fallback={<PageLoader />}>
              <Vendors />
            </Suspense>
          }
        />
        <Route
          path="/vendors/add"
          element={
            <Suspense fallback={<PageLoader />}>
              <AddVendor />
            </Suspense>
          }
        />
        <Route
          path="/vendors/bulk-import"
          element={
            <Suspense fallback={<PageLoader />}>
              <BulkImport />
            </Suspense>
          }
        />
        <Route
          path="/tenants"
          element={
            <Suspense fallback={<PageLoader />}>
              <Tenants />
            </Suspense>
          }
        />
        <Route
          path="/tenants/add"
          element={
            <Suspense fallback={<PageLoader />}>
              <AddTenant />
            </Suspense>
          }
        />
        <Route
          path="/upload"
          element={
            <Suspense fallback={<PageLoader />}>
              <COIUpload />
            </Suspense>
          }
        />
        <Route
          path="/requirements"
          element={
            <Suspense fallback={<PageLoader />}>
              <Requirements />
            </Suspense>
          }
        />
        <Route
          path="/reports"
          element={
            <Suspense fallback={<PageLoader />}>
              <Reports />
            </Suspense>
          }
        />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route
          path="/onboarding"
          element={
            <Suspense fallback={<PageLoader />}>
              <Onboarding />
            </Suspense>
          }
        />
      </Route>

      {/* 404 Page */}
      <Route
        path="*"
        element={
          <Suspense fallback={<PageLoader />}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                className: 'font-sans',
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
