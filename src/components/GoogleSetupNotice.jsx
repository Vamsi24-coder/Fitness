import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ExternalLink, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check 
} from 'lucide-react';

export function GoogleSetupNotice({ supabaseUrl = 'https://dzfgdimeamocmrgkxjqh.supabase.co' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const callbackUrl = `${supabaseUrl}/auth/v1/callback`;

  const copyCallbackUrl = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto my-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-xs text-amber-200">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-amber-300">
            Setup Required: Enable Google Provider
          </span>
        </div>
        <button className="text-amber-400 hover:text-amber-300">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-2.5 text-slate-300">
          <p className="leading-relaxed">
            Google OAuth must be enabled in your Supabase dashboard to sign in with your real Google account:
          </p>

          <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
            <li>
              Open{' '}
              <a
                href="https://supabase.com/dashboard/project/dzfgdimeamocmrgkxjqh/auth/providers"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 underline inline-flex items-center space-x-0.5"
              >
                <span>Supabase Auth Providers</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </li>
            <li>Expand <strong>Google</strong> and toggle it <strong>Enabled</strong>.</li>
            <li>
              In Google Cloud Console, create OAuth 2.0 Client ID (Web application) and add this Authorized Redirect URI:
              <div className="mt-1 flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[11px] text-emerald-400">
                <span className="truncate mr-2">{callbackUrl}</span>
                <button
                  type="button"
                  onClick={copyCallbackUrl}
                  className="text-slate-400 hover:text-white shrink-0"
                  title="Copy Redirect URI"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </li>
            <li>Paste your Google Client ID & Secret into Supabase and click Save.</li>
          </ol>

          <p className="text-[11px] text-amber-300/80 pt-1">
            💡 <em>You can also click "Explore with Demo Account" below to test the full onboarding, dashboard, modals, stats charts, and Gemini AI right now!</em>
          </p>
        </div>
      )}
    </div>
  );
}
