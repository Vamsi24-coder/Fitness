import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Activity, 
  ArrowRight, 
  Loader2,
  Target
} from 'lucide-react';

export function Login() {
  const { loginWithGoogle, activateDemoMode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      await loginWithGoogle();
      // Supabase OAuth redirects to Google login page
    } catch (err) {
      console.error('Login error:', err);
      if (err.message?.includes('provider') || err.message?.includes('not enabled')) {
        setErrorMsg('Google OAuth is not enabled in your Supabase dashboard yet. Please enable it or use Demo Mode below.');
      } else {
        setErrorMsg(err.message || 'Failed to initialize Google login.');
      }
      setLoading(false);
    }
  };

  const handleDemoSignIn = (hasProfile) => {
    activateDemoMode(hasProfile);
    if (hasProfile) {
      navigate('/dashboard');
    } else {
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Ambient Chromatic Backlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#ff2d55]/15 via-[#30d158]/15 to-[#0a84ff]/15 rounded-full blur-3xl pointer-events-none opacity-70" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4"
      >
        
        {/* Brand Icon & Typography */}
        <div className="text-center">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', damping: 15 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#30d158] via-[#0a84ff] to-[#bf5af2] p-0.5 shadow-2xl shadow-[#30d158]/20 mb-4"
          >
            <div className="w-full h-full bg-black rounded-[20px] flex items-center justify-center">
              <Activity className="w-8 h-8 text-[#30d158]" />
            </div>
          </motion.div>
          
          <h1 className="display-title text-3xl sm:text-4xl text-white">
            Nutri<span className="bg-gradient-to-r from-[#30d158] via-[#0a84ff] to-[#bf5af2] bg-clip-text text-transparent">Pulse</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 font-medium max-w-sm mx-auto">
            Intelligent nutrition and macro analytics powered by Supabase and Nutrition AI
          </p>
        </div>

        {/* Login Glass Card */}
        <div className="mt-8 glass-card rounded-[32px] p-6 sm:p-8 border-t border-t-white/15 shadow-2xl space-y-6">
          
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300 backdrop-blur-md">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            {/* Google OAuth Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="btn-press w-full flex items-center justify-center space-x-3 px-5 py-4 rounded-2xl bg-white hover:bg-slate-100 text-black font-bold text-sm shadow-xl transition-all disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-black" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </motion.button>

            {/* Subtle Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-[#121216] px-3 text-slate-400 font-semibold caption-label">
                  Or Instant Demo Preview
                </span>
              </div>
            </div>

            {/* Instant Demo Access Button */}
            <div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleDemoSignIn(false)}
                className="btn-press w-full flex items-center justify-between px-4 py-3.5 rounded-2xl glass-inset hover:bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-[#30d158]/15 border border-[#30d158]/30 flex items-center justify-center text-[#30d158]">
                    <Target className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block text-white font-bold text-xs">Test Dynamic Onboarding</span>
                    <span className="text-[10px] text-slate-400">Formulate custom blueprint from scratch</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </motion.button>
            </div>

          </div>

        </div>

      </motion.div>
    </div>
  );
}
