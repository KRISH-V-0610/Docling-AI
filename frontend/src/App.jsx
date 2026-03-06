import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ToastProvider } from './components/Toasts';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { Analyze } from './pages/Analyze';
import { Configure } from './pages/Configure';
import { Process } from './pages/Process';
import { Editor } from './pages/Editor';
import { Latex } from './pages/Latex';

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

function Layout() {
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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/configure" element={<Configure />} />
            <Route path="/process" element={<Process />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/latex" element={<Latex />} />
            <Route path="/reports" element={<PlaceholderPage title="Validation Report" />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <Layout />
    </ToastProvider>
  );
}

export default App;
