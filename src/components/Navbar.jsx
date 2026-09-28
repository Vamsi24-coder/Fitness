import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { SettingsModal } from './SettingsModal';
import { CompleteProfileModal } from './CompleteProfileModal';
import { calculateProfileCompletion } from '../services/nutrition';
import { 
  Activity, 
  BarChart3, 
  LayoutDashboard, 
  LogOut, 
  Sparkles, 
  Settings as SettingsIcon, 
  UserCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export function Navbar() {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCompleteProfileOpen, setIsCompleteProfileOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const isCurrent = (path) => location.pathname === path;

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Fitness Tracker';
  const avatarUrl = user?.user_metadata?.avatar_url;

  // Single Source of Truth for Profile Completion
  const completion = calculateProfileCompletion(profile);
  const completionPercentage = profile ? completion.percentage : 0;
  const isComplete = completion.isComplete;

  // Color Mapping: Red (<30%), Orange (30-99%), Green (100%)
  const ringColor = completionPercentage < 30
    ? '#ff453a'
    : completionPercentage < 100
      ? '#ff9f0a'
      : '#30d158';

  const ringBg = completionPercentage < 30
    ? 'rgba(255, 69, 58, 0.15)'
    : completionPercentage < 100
      ? 'rgba(255, 159, 10, 0.15)'
      : 'rgba(48, 209, 88, 0.15)';

  // SVG circular ring geometry
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  const handleAvatarClick = () => {
    if (!isComplete && profile) {
      setIsCompleteProfileOpen(true);
    } else {
      setIsSettingsOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-6">
            <Link to="/dashboard" className="flex items-center space-x-2.5 group btn-press">
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
                  FLUID DESIGN
                </span>
              </div>
            </Link>

            {/* Navigation Tabs (Segmented Bar) */}
            <nav className="hidden md:flex items-center space-x-1 glass-inset p-1 rounded-2xl">
              <Link
                to="/dashboard"
                className={`btn-press relative flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
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
                className={`btn-press relative flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
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
                className="btn-press hidden lg:flex items-center space-x-2 px-3.5 py-1.5 rounded-full glass-inset hover:bg-white/10 text-xs text-slate-300 transition-colors group"
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
              aria-label="Settings & Edit Details"
              className="btn-press min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-xl glass-inset text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            {/* Profile Avatar with Dynamic Circular Completion Ring & Hover/Tap Tooltip */}
            <div className="relative flex items-center pl-2 border-l border-white/10">
              <div 
                className="relative cursor-pointer flex items-center justify-center"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={handleAvatarClick}
              >
                {/* SVG Progress Ring */}
                <svg className="w-10 h-10 -rotate-90 transform" viewBox="0 0 40 40">
                  {/* Background Track */}
                  <circle
                    cx="20"
                    cy="20"
                    r={radius}
                    className="stroke-white/10"
                    strokeWidth="2.5"
                    fill="transparent"
                  />
                  {/* Dynamic Progress Stroke */}
                  <circle
                    cx="20"
                    cy="20"
                    r={radius}
                    stroke={ringColor}
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{
                      transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease',
                    }}
                  />
                </svg>

                {/* Inner Avatar Image / Initial */}
                <div className="absolute inset-0 m-auto w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-white/10">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] font-bold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Micro Completion Status Dot */}
                <span 
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black"
                  style={{ backgroundColor: ringColor }}
                />

                {/* Premium Hover / Tap Tooltip */}
                <AnimatePresence>
                  {showTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 z-50 min-w-[210px] p-3 rounded-2xl glass-card border border-white/15 shadow-2xl backdrop-blur-2xl text-left pointer-events-none"
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span 
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ringColor }}
                        />
                        <span className="text-xs font-bold text-white">
                          Profile {completionPercentage}% complete
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {isComplete 
                          ? 'Your profile is fully personalized.' 
                          : 'Complete your profile to unlock full personalization.'}
                      </p>
                      {!isComplete && (
                        <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-[#30d158] font-semibold">
                          <span>Complete Profile</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Name */}
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-200 max-w-[110px] truncate ml-2">
                {displayName}
              </span>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                aria-label="Sign Out"
                className="btn-press min-w-[36px] min-h-[36px] flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-[#ff2d55] hover:bg-[#ff2d55]/10 transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Mobile Navigation Dock */}
        <div className="md:hidden flex border-t border-white/10 bg-black/80 px-2 py-1.5 justify-around backdrop-blur-xl">
          <Link
            to="/dashboard"
            className={`btn-press flex items-center justify-center space-x-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold ${
              isCurrent('/dashboard') ? 'bg-white/15 text-white' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/stats"
            className={`btn-press flex items-center justify-center space-x-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold ${
              isCurrent('/stats') ? 'bg-white/15 text-white' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="btn-press flex items-center justify-center space-x-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Incremental Profile Completion Modal */}
      <CompleteProfileModal isOpen={isCompleteProfileOpen} onClose={() => setIsCompleteProfileOpen(false)} />
    </>
  );
}

