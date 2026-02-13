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
const PropertyForm = lazy(() => import('@/pages/PropertyForm'));
const Vendors = lazy(() => import('@/pages/Vendors'));
const AddVendor = lazy(() => import('@/pages/AddVendor'));
const VendorDetail = lazy(() => import('@/pages/VendorDetail'));
const Tenants = lazy(() => import('@/pages/Tenants'));
const AddTenant = lazy(() => import('@/pages/AddTenant'));
const TenantDetail = lazy(() => import('@/pages/TenantDetail'));
const COIUpload = lazy(() => import('@/pages/COIUpload'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const SelfServicePortal = lazy(() => import('@/pages/SelfServicePortal'));
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

      {/* Self-service portal — PUBLIC, no auth */}
      <Route
        path="/upload/:token"
        element={
          <Suspense fallback={<PageLoader />}>
            <SelfServicePortal />
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
          path="/properties/new"
          element={
            <Suspense fallback={<PageLoader />}>
              <PropertyForm />
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
          path="/properties/:id/edit"
          element={
            <Suspense fallback={<PageLoader />}>
              <PropertyForm />
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
          path="/vendors/new"
          element={
            <Suspense fallback={<PageLoader />}>
              <AddVendor />
            </Suspense>
          }
        />
        <Route
          path="/vendors/add"
          element={<Navigate to="/vendors/new" replace />}
        />
        <Route
          path="/vendors/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <VendorDetail />
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
          path="/tenants/new"
          element={
            <Suspense fallback={<PageLoader />}>
              <AddTenant />
            </Suspense>
          }
        />
        <Route
          path="/tenants/add"
          element={<Navigate to="/tenants/new" replace />}
        />
        <Route
          path="/tenants/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <TenantDetail />
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
          path="/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
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
