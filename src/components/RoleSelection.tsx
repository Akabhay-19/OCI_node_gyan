import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UserRole, Teacher } from '../types';
import { NeonCard, NeonButton, Input } from './UIComponents';
import { ForgotPassword } from './ForgotPassword';
import { ArrowLeft, LogIn, UserPlus, Building2, Home } from 'lucide-react';
import { GoogleAuthBlock } from './GoogleAuthBlock';
import { CredentialResponse } from '@react-oauth/google';
import { draftService, SignupDraft } from '../services/draftService';
import { noticeService } from '../services/noticeService';
import { ResumeDraftModal } from './ResumeDraftModal';
import { OnboardingFlow } from './OnboardingFlow';

// ─────────────────────────────────────────────────────────
// GYAN AI — RoleSelection
// Controls the main auth entry gate:
//   HOME → LOGIN or ONBOARDING (signup) or FORGOT_PASSWORD
// Login section is 100% untouched.
// Signup (JOIN SCHOOL / CREATE SCHOOL) now uses OnboardingFlow.
// ─────────────────────────────────────────────────────────

type ViewState = 'HOME' | 'LOGIN' | 'ONBOARDING' | 'FORGOT_PASSWORD';

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
  onLogin: (role: UserRole, schoolName: string, credentials?: any) => void;
  onSignupDetails: (details: any) => void;
  onRegisterSchool: (data: any) => void;
  onBackToHome?: () => void;
  faculty?: Teacher[];
  initialView?: 'HOME' | 'LOGIN';
  showLoginButton?: boolean;
}

export const RoleSelection: React.FC<RoleSelectionProps> = React.memo(({
  onSelectRole,
  onLogin,
  onSignupDetails,
  onRegisterSchool,
  onBackToHome,
  faculty = [],
  initialView = 'HOME',
  showLoginButton = true
}) => {
  const [view, setView] = useState<ViewState>(
    initialView === 'LOGIN' ? 'LOGIN' : 'HOME'
  );

  // Login-specific state
  const [loginRole, setLoginRole] = useState<UserRole | null>(null);
  const [loginFields, setLoginFields] = useState({ username: '', email: '', password: '' });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Draft resume
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<SignupDraft | null>(null);

  // Check for existing draft on mount (only on home/signup views)
  useEffect(() => {
    if (view === 'HOME') {
      const draft = draftService.getDraft();
      if (draft && draftService.hasDraft()) {
        setPendingDraft(draft);
        setShowDraftModal(true);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resume Draft ──────────────────────────
  const handleResumeDraft = useCallback((draft: SignupDraft) => {
    setShowDraftModal(false);
    setPendingDraft(null);
    // Go directly to onboarding — the draft data will be handled there
    setView('ONBOARDING');
    noticeService.success('Registration restored! Continue from where you left off.');
  }, []);

  const handleStartFresh = useCallback(() => {
    setShowDraftModal(false);
    setPendingDraft(null);
    noticeService.info('Starting fresh.');
  }, []);

  // ── Google Auth ───────────────────────────
  const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
    if (!loginRole) {
      noticeService.warning('Please select a role before using Google sign-in.');
      return;
    }
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    setAuthError(null);
    try {
      await onLogin(loginRole, '', {
        idToken: credentialResponse.credential,
        authProvider: 'google',
      });
    } catch (err: any) {
      const msg = noticeService.mapApiError(err);
      setAuthError(msg);
      noticeService.error(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = useCallback((msg: string | null) => {
    setAuthError(msg);
    if (msg) noticeService.error(msg);
  }, []);

  // ── Onboarding callbacks ──────────────────
  const handleSignupComplete = useCallback((role: UserRole, data: any) => {
    // Phase 2 done for STUDENT/TEACHER → pass data up, navigate to /join-school
    onSignupDetails(data);
    onSelectRole(role);
  }, [onSignupDetails, onSelectRole]);

  // ─────────────────────────────────────────
  // VIEW: HOME
  // ─────────────────────────────────────────
  if (view === 'HOME') {
    return (
      <>
        {showDraftModal && pendingDraft && (
          <ResumeDraftModal
            draft={pendingDraft}
            onResume={handleResumeDraft}
            onStartFresh={handleStartFresh}
          />
        )}
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-12 relative">
          {onBackToHome && (
            <NeonButton variant="ghost" onClick={onBackToHome} className="absolute top-0 left-4 md:left-8">
              <Home className="w-4 h-4 mr-2" /> Homepage
            </NeonButton>
          )}
          <div className="text-center space-y-4">
            <h2 className="text-6xl md:text-8xl font-display font-bold text-white tracking-tighter">
              GYAN<span className="text-signal-orange">.AI</span>
            </h2>
            <p className="text-xl text-gray-400">AI-Powered. Gamified. Data-Driven.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 w-full max-w-4xl px-4">
            {showLoginButton && (
              <button
                onClick={() => setView('LOGIN')}
                className="group px-10 py-10 bg-white/5 border border-white/10 hover:border-neon-cyan/50 hover:bg-white/8 rounded-2xl flex flex-col items-center gap-4 min-w-[200px] transition-all duration-200 hover:shadow-[0_0_24px_rgba(0,243,255,0.15)]"
              >
                <LogIn className="w-10 h-10 text-neon-cyan" />
                <div className="text-center">
                  <span className="font-bold text-white block">LOGIN</span>
                  <span className="text-xs text-white/40">Access your dashboard</span>
                </div>
              </button>
            )}

            <button
              onClick={() => setView('ONBOARDING')}
              className="group px-10 py-10 bg-white/5 border border-white/10 hover:border-signal-orange/50 hover:bg-white/8 rounded-2xl flex flex-col items-center gap-4 min-w-[200px] transition-all duration-200 hover:shadow-[0_0_24px_rgba(255,95,31,0.15)]"
            >
              <UserPlus className="w-10 h-10 text-signal-orange" />
              <div className="text-center">
                <span className="font-bold text-white block">JOIN SCHOOL</span>
                <span className="text-xs text-white/40">Student or Teacher signup</span>
              </div>
            </button>

            <button
              onClick={() => setView('ONBOARDING')}
              className="group px-10 py-10 bg-gradient-to-br from-neon-purple/10 to-transparent border border-neon-purple/30 hover:border-neon-purple/60 rounded-2xl flex flex-col items-center gap-4 min-w-[200px] transition-all duration-200 hover:shadow-[0_0_24px_rgba(167,139,250,0.2)]"
            >
              <Building2 className="w-10 h-10 text-neon-purple" />
              <div className="text-center">
                <span className="font-bold text-white block">CREATE SCHOOL</span>
                <span className="text-xs text-white/40">Register as Admin</span>
              </div>
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────
  // VIEW: ONBOARDING (Two-Phase Signup)
  // ─────────────────────────────────────────
  if (view === 'ONBOARDING') {
    return (
      <OnboardingFlow
        onSignupComplete={handleSignupComplete}
        onRegisterSchool={onRegisterSchool}
        onBack={() => setView('HOME')}
        onSwitchToLogin={() => setView('LOGIN')}
      />
    );
  }

  // ─────────────────────────────────────────
  // VIEW: FORGOT PASSWORD
  // ─────────────────────────────────────────
  if (view === 'FORGOT_PASSWORD') {
    return (
      <ForgotPassword
        onBack={() => setView('LOGIN')}
        initialRole={loginRole || 'STUDENT'}
      />
    );
  }

  // ─────────────────────────────────────────
  // VIEW: LOGIN (100% Original — untouched)
  // ─────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center w-full relative" style={{ minHeight: 'calc(100vh - 160px)' }}>
      <div className="absolute top-0 left-4 md:left-8 flex gap-2">
        {onBackToHome && (
          <NeonButton variant="ghost" onClick={onBackToHome}>
            <Home className="w-4 h-4 mr-2" /> Homepage
          </NeonButton>
        )}
      </div>
      <NeonButton variant="ghost" onClick={() => setView('HOME')} className="absolute top-0 right-4 md:right-8">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </NeonButton>

      <NeonCard className="w-full max-w-md px-8 pt-6 pb-6 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }} glowColor="cyan">
        <h3 className="text-3xl font-bold text-white text-center">Login</h3>

        {/* Role tabs */}
        <div className="grid grid-cols-4 gap-2">
          {(['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'] as UserRole[]).map(r => (
            <button
              key={r}
              onClick={() => { setLoginRole(r); setAuthError(null); }}
              className={`text-[10px] font-bold py-2 rounded border transition-all duration-150
                ${loginRole === r
                  ? 'bg-neon-cyan text-black border-neon-cyan'
                  : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white'}`}
            >
              {r}
            </button>
          ))}
        </div>

        {authError && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-2.5 text-sm text-red-300 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {authError}
          </div>
        )}

        {/* STUDENT login */}
        {loginRole === 'STUDENT' && (
          <>
            <Input
              placeholder="Username, Mobile, or User ID"
              value={loginFields.username}
              onChange={e => setLoginFields(prev => ({ ...prev, username: e.target.value }))}
            />
            <Input
              type="password"
              placeholder="Password"
              value={loginFields.password}
              onChange={e => setLoginFields(prev => ({ ...prev, password: e.target.value }))}
            />
            <NeonButton
              onClick={() => onLogin('STUDENT', '', { username: loginFields.username, password: loginFields.password })}
              className="w-full" glow
              disabled={!loginFields.username || !loginFields.password}
            >
              Login as Student
            </NeonButton>
            <GoogleAuthBlock onSuccess={handleGoogleLogin} onError={handleGoogleError} isLoading={isGoogleLoading} error={authError} role="STUDENT" />
          </>
        )}

        {/* TEACHER login */}
        {loginRole === 'TEACHER' && (
          <>
            <Input
              placeholder="Email or Mobile Number"
              value={loginFields.email}
              onChange={e => setLoginFields(prev => ({ ...prev, email: e.target.value }))}
            />
            <Input
              type="password"
              placeholder="Password"
              value={loginFields.password}
              onChange={e => setLoginFields(prev => ({ ...prev, password: e.target.value }))}
            />
            <NeonButton
              onClick={() => onLogin('TEACHER', '', { email: loginFields.email, password: loginFields.password })}
              className="w-full" glow
              disabled={!loginFields.email || !loginFields.password}
            >
              Login as Teacher
            </NeonButton>
            <GoogleAuthBlock onSuccess={handleGoogleLogin} onError={handleGoogleError} isLoading={isGoogleLoading} error={authError} role="TEACHER" />
          </>
        )}

        {/* PARENT login */}
        {loginRole === 'PARENT' && (
          <>
            <p className="text-xs text-gray-400">Use your child's credentials to login</p>
            <Input
              placeholder="Student Username or Mobile"
              value={loginFields.username}
              onChange={e => setLoginFields(prev => ({ ...prev, username: e.target.value }))}
            />
            <Input
              type="password"
              placeholder="Student Password"
              value={loginFields.password}
              onChange={e => setLoginFields(prev => ({ ...prev, password: e.target.value }))}
            />
            <NeonButton
              onClick={() => onLogin('PARENT', '', { username: loginFields.username, password: loginFields.password, asParent: true })}
              className="w-full" glow
              disabled={!loginFields.username || !loginFields.password}
            >
              Login as Parent
            </NeonButton>
          </>
        )}

        {/* ADMIN login */}
        {loginRole === 'ADMIN' && (
          <>
            <Input
              placeholder="Admin Email"
              type="email"
              value={loginFields.email}
              onChange={e => setLoginFields(prev => ({ ...prev, email: e.target.value }))}
            />
            <Input
              type="password"
              placeholder="Password"
              value={loginFields.password}
              onChange={e => setLoginFields(prev => ({ ...prev, password: e.target.value }))}
            />
            <NeonButton
              onClick={() => onLogin('ADMIN', '', { email: loginFields.email, password: loginFields.password })}
              className="w-full" glow
              disabled={!loginFields.email || !loginFields.password}
            >
              Authenticate
            </NeonButton>
            <GoogleAuthBlock onSuccess={handleGoogleLogin} onError={handleGoogleError} isLoading={isGoogleLoading} error={authError} role="ADMIN" />
          </>
        )}

        {!loginRole && (
          <p className="text-center text-sm text-white/40">Select your role above to continue</p>
        )}

        {/* Forgot password + switch to signup */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            onClick={() => setView('FORGOT_PASSWORD')}
            className="text-sm text-neon-cyan/70 hover:text-white underline decoration-dashed hover:decoration-solid transition-all"
          >
            Forgot Password?
          </button>
          <p className="text-sm text-white/30">
            New here?{' '}
            <button
              onClick={() => setView('ONBOARDING')}
              className="text-signal-orange hover:text-white font-semibold transition-colors"
            >
              Create Account
            </button>
          </p>
        </div>
      </NeonCard>
    </div>
  );
});