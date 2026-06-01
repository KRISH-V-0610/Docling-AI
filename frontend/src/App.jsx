import React, { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ToastProvider } from './components/Toasts';
import { ErrorBoundary } from './components/ErrorBoundary';
import ChatBot from './components/ChatBot';
import useAuthStore from './store/useAuthStore';

// ── Code-splitting (Track A5) ────────────────────────────────────────────────
// Each page is lazy-loaded so its JS (and heavy deps like Monaco, Quill, the
// 3D/markdown libs) only downloads when the user navigates to that route. This
// shrinks the initial bundle dramatically. Public/landing pages stay eager so
// first paint is instant.
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));
const ProjectWorkspace = lazy(() => import('./pages/ProjectWorkspace').then(m => ({ default: m.ProjectWorkspace })));
const AdvanceWorkspace = lazy(() => import('./pages/AdvanceWorkspace').then(m => ({ default: m.AdvanceWorkspace })));
const DeepScan = lazy(() => import('./pages/DeepScan').then(m => ({ default: m.DeepScan })));
const Integrations = lazy(() => import('./pages/Integrations').then(m => ({ default: m.Integrations })));
const Workflows = lazy(() => import('./pages/Workflows').then(m => ({ default: m.Workflows })));
const LatexToolkit = lazy(() => import('./pages/LatexToolkit')); // default export

function PlaceholderPage({ title }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-2">{title}</h2>
        <p className="text-[var(--color-text-muted)]">This page is under construction.</p>
      </div>
    </div>
  );
}

// Fallback shown while a lazy route's chunk is downloading.
function RouteLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <svg className="animate-spin h-8 w-8 text-[var(--color-primary-500)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );
}

// Protected Routes Wrapper
const ProtectedRoute = () => {
  const { isAuthenticated, status } = useAuthStore();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-50)] text-[var(--color-text-main)]">
        <div className="flex flex-col items-center gap-4">
          {/* spinner */}
          <svg className="animate-spin h-8 w-8 text-[var(--color-primary-500)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="font-medium animate-pulse">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

// Main layout for logged-in users (Sidebar + Navbar). Each route element is
// wrapped in an ErrorBoundary + Suspense so a crash or slow chunk in one page
// never takes down the shell (nav stays usable).
function AuthenticatedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--color-surface-50)] text-[var(--color-text-main)] flex font-sans overflow-hidden">
      {/* Floating Sidebar Container */}
      <div className="py-4 pl-4 shrink-0 flex">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      <div className="flex flex-1 flex-col h-screen overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto w-full p-4 md:p-8">
          <ErrorBoundary>
            <Suspense fallback={<RouteLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ToastProvider>
      <Routes>
        {/* Public Routes (No Sidebar/Navbar) */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/auth" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Auth />} />

        {/* Protected Authenticated App Layout Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/history" element={<History />} />
            <Route path="/project/:id" element={<ProjectWorkspace />} />
            <Route path="/deep-scan" element={<DeepScan />} />
            <Route path="/advance-workshop" element={<AdvanceWorkspace />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/toolkit" element={<LatexToolkit />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatBot />
    </ToastProvider>
  );
}

export default App;
