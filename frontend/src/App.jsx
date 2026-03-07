import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ToastProvider } from './components/Toasts';
import ChatBot from './components/ChatBot';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Auth } from './pages/Auth';
import { Profile } from './pages/Profile';
import { Landing } from './pages/Landing';
import { History } from './pages/History';
import { ProjectWorkspace } from './pages/ProjectWorkspace';
import { Process } from './pages/Process';
import { ValidationArea } from './pages/ValidationArea';
import { ValidationReport } from './components/ValidationReport';
import { AdvanceWorkspace } from './pages/AdvanceWorkspace';
import useAuthStore from './store/useAuthStore';

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

// Main layout for logged-in users (Sidebar + Navbar)
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
          <Outlet />
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
            <Route path="/reports" element={<ValidationReport />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/history" element={<History />} />
            <Route path="/project/:id" element={<ProjectWorkspace />} />
            <Route path="/process" element={<Process />} />
            <Route path="/advance-workshop" element={<AdvanceWorkspace />} />
            <Route path="/validation/:projectId/:originalId/:reconstructedId" element={<ValidationArea />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatBot />
    </ToastProvider>
  );
}

export default App;
