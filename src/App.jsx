import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, OnboardingRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Stats } from './pages/Stats';

// Layout with persistent Navbar and background
function MainLayout() {
  return (
    <div className="min-h-screen bg-black text-[#f5f5f7] flex flex-col selection:bg-[#30d158]/30 selection:text-[#30d158]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-white/10 bg-black/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium text-slate-400">
            © {new Date().getFullYear()} NutriPulse — Precision Nutrition & Fitness Intelligence
          </p>
          <div className="flex items-center space-x-3 text-[11px] text-slate-500">
            <span className="caption-label text-[10px] text-[#30d158]">SUPABASE AUTH</span>
            <span>•</span>
            <span className="caption-label text-[10px] text-[#0a84ff]">GEMINI AI</span>
            <span>•</span>
            <span className="caption-label text-[10px] text-[#ff2d55]">APPLE DESIGN</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Login Route */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* One-Time Onboarding Form */}
          <Route element={<OnboardingRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>

          {/* Protected Routes (Requires Auth & Completed Profile) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/stats" element={<Stats />} />
            </Route>
          </Route>

          {/* Root and Fallback redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
