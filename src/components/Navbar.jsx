import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { SettingsModal } from './SettingsModal';
import { 
  Activity, 
  BarChart3, 
  LayoutDashboard, 
  LogOut, 
  Sparkles, 
  Settings as SettingsIcon, 
  UserCircle 
} from 'lucide-react';

export function Navbar() {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isCurrent = (path) => location.pathname === path;

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Fitness Tracker';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <>
      <header className="sticky top-0 z-40 w-full apple-glass border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-6">
            <Link to="/dashboard" className="flex items-center space-x-2.5 group apple-btn">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#30d158] via-[#0a84ff] to-[#bf5af2] p-0.5 shadow-md shadow-[#30d158]/20 transition-transform">
                <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#30d158]" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="display-title text-xl text-white">
                  Nutri<span className="bg-gradient-to-r from-[#30d158] to-[#0a84ff] bg-clip-text text-transparent">Pulse</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#30d158] caption-label bg-white/5 border border-white/10 rounded-full">
                  APPLE DESIGN
                </span>
              </div>
            </Link>

            {/* Navigation Tabs (Apple Segmented Bar) */}
            <nav className="hidden md:flex items-center space-x-1 apple-glass-inset p-1 rounded-2xl">
              <Link
                to="/dashboard"
                className={`apple-btn relative flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isCurrent('/dashboard')
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isCurrent('/dashboard') && (
                  <motion.div
                    layoutId="activeNavPill"
                    transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                    className="absolute inset-0 bg-white/15 rounded-xl border border-white/10 shadow-sm"
                  />
                )}
                <LayoutDashboard className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Dashboard</span>
              </Link>

              <Link
                to="/stats"
                className={`apple-btn relative flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isCurrent('/stats')
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isCurrent('/stats') && (
                  <motion.div
                    layoutId="activeNavPill"
                    transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                    className="absolute inset-0 bg-white/15 rounded-xl border border-white/10 shadow-sm"
                  />
                )}
                <BarChart3 className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Trends & Analytics</span>
              </Link>
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-3">
            {profile && (
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                title="Edit Fitness Profile & Goals"
                className="apple-btn hidden lg:flex items-center space-x-2 px-3.5 py-1.5 rounded-full apple-glass-inset hover:bg-white/10 text-xs text-slate-300 transition-colors group"
              >
                <span className="w-2 h-2 rounded-full bg-[#30d158] shadow-sm shadow-[#30d158]/50 animate-pulse" />
                <span className="tabular-numbers font-semibold text-white">{profile.weight} kg</span>
                <span className="text-slate-600">•</span>
                <span className="capitalize text-[#30d158] font-medium">{profile.intensity || 'Active'}</span>
                <SettingsIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-white ml-1 transition-colors" />
              </button>
            )}

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings & Edit Details"
              className="apple-btn p-2.5 rounded-xl apple-glass-inset text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            {/* Profile Avatar / Name */}
            <div className="flex items-center space-x-2.5 pl-2 border-l border-white/10">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full border border-white/15 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-bold text-[#30d158]">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-200 max-w-[120px] truncate">
                {displayName}
              </span>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Sign Out"
                className="apple-btn p-2 rounded-xl text-slate-400 hover:text-[#ff2d55] hover:bg-[#ff2d55]/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Mobile Navigation Dock */}
        <div className="md:hidden flex border-t border-white/10 bg-black/80 px-4 py-2 justify-around backdrop-blur-xl">
          <Link
            to="/dashboard"
            className={`apple-btn flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
              isCurrent('/dashboard') ? 'bg-white/15 text-white' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/stats"
            className={`apple-btn flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
              isCurrent('/stats') ? 'bg-white/15 text-white' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="apple-btn flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
