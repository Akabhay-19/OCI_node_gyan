import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UserRole } from '../types';
import { noticeService } from '../services/noticeService';
import { draftService } from '../services/draftService';
import { CredentialResponse } from '@react-oauth/google';
import { GoogleAuthBlock } from './GoogleAuthBlock';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface OnboardingFlowProps {
    /** Called when STUDENT or TEACHER finishes phase 2 */
    onSignupComplete: (role: UserRole, data: any) => void;
    /** Called when ADMIN finishes phase 2 (school creation) */
    onRegisterSchool: (data: any) => void;
    /** Google ID token pre-fill callback */
    onGooglePreFill?: (credential: CredentialResponse) => void;
    /** Back to the auth home / login toggle */
    onBack: () => void;
    onSwitchToLogin?: () => void;
    /** If user is coming via Google, pre-fill these */
    googlePrefill?: { name?: string; email?: string; google_id?: string };
}

interface Phase1 {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface Phase2Student {
    rollNumber: string;
    phone: string;
    grade: string;
    inviteCode: string;
}

interface Phase2Teacher {
    phone: string;
    subject: string;
    inviteCode: string;
}

interface Phase2Admin {
    schoolName: string;
    motto: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    logoUrl: string;
}

type FieldErrors = Partial<Record<string, string>>;
type TouchedFields = Partial<Record<string, boolean>>;

// ─────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{10}$/;

const validatePhase1 = (d: Phase1, isGoogleLinked = false): FieldErrors => {
    const e: FieldErrors = {};
    if (!d.name.trim()) e.name = 'Full name is required';
    else if (d.name.trim().length < 2) e.name = 'Name must be at least 2 characters';

    if (!d.email.trim()) e.email = 'Email is required';
    else if (!EMAIL_RE.test(d.email)) e.email = 'Enter a valid email address';

    // Skip password validation if user signed up via Google
    if (!isGoogleLinked) {
        if (!d.password) e.password = 'Password is required';
        else if (d.password.length < 8) e.password = 'Password must be at least 8 characters';

        if (!d.confirmPassword) e.confirmPassword = 'Please confirm your password';
        else if (d.confirmPassword !== d.password) e.confirmPassword = 'Passwords do not match';
    }

    return e;
};

const validatePhase2Student = (d: Phase2Student): FieldErrors => {
    const e: FieldErrors = {};
    if (!d.rollNumber.trim()) e.rollNumber = 'Roll number is required';
    if (!d.phone.trim()) e.phone = 'Phone number is required';
    else if (!PHONE_RE.test(d.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid 10-digit phone number';
    if (!d.grade) e.grade = 'Please select your grade';
    if (!d.inviteCode.trim()) e.inviteCode = 'School invite code is required';
    return e;
};

const validatePhase2Teacher = (d: Phase2Teacher): FieldErrors => {
    const e: FieldErrors = {};
    if (!d.phone.trim()) e.phone = 'Phone number is required';
    else if (!PHONE_RE.test(d.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid 10-digit phone number';
    if (!d.subject.trim()) e.subject = 'Subject specialization is required';
    if (!d.inviteCode.trim()) e.inviteCode = 'School invite code is required';
    return e;
};

const validatePhase2Admin = (d: Phase2Admin): FieldErrors => {
    const e: FieldErrors = {};
    if (!d.schoolName.trim()) e.schoolName = 'School name is required';
    if (!d.city.trim()) e.city = 'City is required';
    if (!d.state.trim()) e.state = 'State is required';
    return e;
};

// ─────────────────────────────────────────────
// PASSWORD STRENGTH
// ─────────────────────────────────────────────
const getPasswordStrength = (p: string): { score: number; label: string; color: string } => {
    if (!p) return { score: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
    if (score <= 2) return { score, label: 'Fair', color: '#f59e0b' };
    if (score <= 3) return { score, label: 'Good', color: '#22c55e' };
    return { score, label: 'Strong', color: '#06b6d4' };
};

// ─────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────
const StepIndicator: React.FC<{ step: 1 | 2 }> = ({ step }) => (
    <div className="flex items-center justify-center gap-0 mb-8">
        {/* Step 1 */}
        <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500
        ${step >= 1
                    ? 'bg-neon-cyan border-neon-cyan text-black shadow-[0_0_16px_rgba(0,243,255,0.5)]'
                    : 'bg-transparent border-white/20 text-white/30'}`}>
                {step > 1 ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                ) : '1'}
            </div>
            <span className={`text-[10px] mt-1 font-semibold tracking-wider uppercase transition-colors duration-300
        ${step >= 1 ? 'text-neon-cyan' : 'text-white/30'}`}>
                Account
            </span>
        </div>

        {/* Connector */}
        <div className="w-16 h-px mx-1 mb-4 relative overflow-hidden bg-white/10">
            <div className={`absolute inset-0 bg-neon-cyan transition-transform duration-700 origin-left
        ${step >= 2 ? 'scale-x-100' : 'scale-x-0'}`} />
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500
        ${step >= 2
                    ? 'bg-signal-orange border-signal-orange text-black shadow-[0_0_16px_rgba(255,95,31,0.5)]'
                    : 'bg-transparent border-white/20 text-white/30'}`}>
                2
            </div>
            <span className={`text-[10px] mt-1 font-semibold tracking-wider uppercase transition-colors duration-300
        ${step >= 2 ? 'text-signal-orange' : 'text-white/30'}`}>
                Profile
            </span>
        </div>
    </div>
);

// ─────────────────────────────────────────────
// FIELD COMPONENT — input with inline error
// ─────────────────────────────────────────────
interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    touched?: boolean;
    hint?: string;
    rightElement?: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, error, touched, hint, rightElement, className = '', ...inputProps }) => {
    const showError = touched && error;
    return (
        <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-widest">{label}</label>
            <div className="relative">
                <input
                    {...inputProps}
                    className={`
            w-full bg-white/5 border rounded-lg px-4 py-3 text-white text-sm
            placeholder:text-white/25 outline-none transition-all duration-200
            ${showError
                            ? 'border-red-500/70 focus:border-red-400 bg-red-950/10'
                            : 'border-white/10 focus:border-neon-cyan/60 focus:bg-white/8'}
            ${rightElement ? 'pr-12' : ''}
            ${className}
          `}
                />
                {rightElement && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
                )}
            </div>
            {showError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </p>
            )}
            {!showError && hint && (
                <p className="text-xs text-white/30">{hint}</p>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────
// ROLE CARDS
// ─────────────────────────────────────────────
const ROLES: { role: UserRole; label: string; icon: string; color: string; border: string; shadow: string; desc: string }[] = [
    { role: 'STUDENT', label: 'Student', icon: '🎓', color: 'text-signal-orange', border: 'border-signal-orange/40', shadow: 'hover:shadow-[0_0_20px_rgba(255,95,31,0.3)]', desc: 'Join your school & classes' },
    { role: 'TEACHER', label: 'Teacher', icon: '👩‍🏫', color: 'text-neon-cyan', border: 'border-neon-cyan/40', shadow: 'hover:shadow-[0_0_20px_rgba(0,243,255,0.3)]', desc: 'Manage classrooms & students' },
    { role: 'ADMIN', label: 'Admin', icon: '🏫', color: 'text-neon-purple', border: 'border-neon-purple/40', shadow: 'hover:shadow-[0_0_20px_rgba(167,139,250,0.3)]', desc: 'Create & manage your school' },
];

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
    onSignupComplete,
    onRegisterSchool,
    onBack,
    onSwitchToLogin,
    googlePrefill,
}) => {
    // Step & Role state
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

    // Phase 1 data
    const [phase1, setPhase1] = useState<Phase1>({
        name: googlePrefill?.name || '',
        email: googlePrefill?.email || '',
        password: '',
        confirmPassword: '',
    });
    const [p1Errors, setP1Errors] = useState<FieldErrors>({});
    const [p1Touched, setP1Touched] = useState<TouchedFields>({});

    // Phase 2 data
    const [p2Student, setP2Student] = useState<Phase2Student>({ rollNumber: '', phone: '', grade: '', inviteCode: '' });
    const [p2Teacher, setP2Teacher] = useState<Phase2Teacher>({ phone: '', subject: '', inviteCode: '' });
    const [p2Admin, setP2Admin] = useState<Phase2Admin>({ schoolName: '', motto: '', address: '', city: '', state: '', pincode: '', phone: '', logoUrl: '' });
    const [p2Errors, setP2Errors] = useState<FieldErrors>({});
    const [p2Touched, setP2Touched] = useState<TouchedFields>({});

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLinked, setIsGoogleLinked] = useState(!!googlePrefill?.google_id);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [googleId, setGoogleId] = useState(googlePrefill?.google_id || '');
    const logoInputRef = useRef<HTMLInputElement>(null);

    const pwStrength = getPasswordStrength(phase1.password);

    // ── Google Prefill Handler ─────────────────
    const handleGooglePrefill = async (credentialResponse: CredentialResponse) => {
        if (!selectedRole) {
            noticeService.warning('Please select your role first, then connect with Google.');
            return;
        }
        setIsGoogleLoading(true);
        try {
            const { jwtDecode } = await import('jwt-decode');
            const decoded: any = jwtDecode(credentialResponse.credential!);
            const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'A1!';

            setPhase1(prev => ({
                ...prev,
                name: decoded.name || prev.name,
                email: decoded.email || prev.email,
                password: generatedPassword,
                confirmPassword: generatedPassword,
            }));
            setGoogleId(decoded.sub || '');
            setIsGoogleLinked(true);
            noticeService.success('Google account connected! Your name and email are pre-filled.');
        } catch (err: any) {
            noticeService.error('Could not connect Google account. Please fill the form manually.');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleGoogleError = (msg: string | null) => {
        if (msg) noticeService.error(msg);
    };

    // Re-validate on changes
    useEffect(() => {
        setP1Errors(validatePhase1(phase1, isGoogleLinked));
    }, [phase1, isGoogleLinked]);

    useEffect(() => {
        if (!selectedRole) return;
        if (selectedRole === 'STUDENT') setP2Errors(validatePhase2Student(p2Student));
        if (selectedRole === 'TEACHER') setP2Errors(validatePhase2Teacher(p2Teacher));
        if (selectedRole === 'ADMIN') setP2Errors(validatePhase2Admin(p2Admin));
    }, [p2Student, p2Teacher, p2Admin, selectedRole]);

    // ── Handlers ──────────────────────────────

    const touchP1 = (field: string) => setP1Touched(prev => ({ ...prev, [field]: true }));
    const touchP2 = (field: string) => setP2Touched(prev => ({ ...prev, [field]: true }));

    const handleP1Change = (field: keyof Phase1) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhase1(prev => ({ ...prev, [field]: e.target.value }));
    };

    const canContinue = () => {
        if (!selectedRole) return false;
        const errors = validatePhase1(phase1, isGoogleLinked);
        return Object.keys(errors).length === 0;
    };

    const handleContinue = () => {
        // Touch all phase1 fields to show errors
        setP1Touched({ name: true, email: true, password: true, confirmPassword: true });
        if (!selectedRole) {
            noticeService.warning('Please select your role first.');
            return;
        }
        const errors = validatePhase1(phase1, isGoogleLinked);
        if (Object.keys(errors).length > 0) return;
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const canSubmit = () => {
        if (!selectedRole) return false;
        if (selectedRole === 'STUDENT') return Object.keys(validatePhase2Student(p2Student)).length === 0;
        if (selectedRole === 'TEACHER') return Object.keys(validatePhase2Teacher(p2Teacher)).length === 0;
        if (selectedRole === 'ADMIN') return Object.keys(validatePhase2Admin(p2Admin)).length === 0;
        return false;
    };

    const handleSubmit = async () => {
        // Touch all phase2 fields
        const allP2Keys: Record<UserRole, string[]> = {
            STUDENT: ['rollNumber', 'phone', 'grade', 'inviteCode'],
            TEACHER: ['phone', 'subject', 'inviteCode'],
            ADMIN: ['schoolName', 'city', 'state'],
            PARENT: [],
        };
        const keys = allP2Keys[selectedRole!] || [];
        setP2Touched(Object.fromEntries(keys.map(k => [k, true])));

        if (!canSubmit()) return;

        setIsSubmitting(true);
        try {
            if (selectedRole === 'ADMIN') {
                const adminData = {
                    ...p2Admin,
                    adminName: phase1.name,
                    adminEmail: phase1.email,
                    password: phase1.password,
                };
                draftService.markCompleted();
                await onRegisterSchool(adminData);
            } else {
                const combined = {
                    name: phase1.name,
                    email: phase1.email,
                    password: phase1.password,
                    google_id: googleId || googlePrefill?.google_id,
                    ...(selectedRole === 'STUDENT'
                        ? { rollNumber: p2Student.rollNumber, mobileNumber: p2Student.phone, className: p2Student.grade, inviteCode: p2Student.inviteCode }
                        : { mobileNumber: p2Teacher.phone, stream: p2Teacher.subject, inviteCode: p2Teacher.inviteCode }
                    ),
                    emailVerified: true,
                    phoneVerified: true,
                };
                draftService.markCompleted();
                onSignupComplete(selectedRole!, combined);
            }
        } catch (e: any) {
            noticeService.handleApiError(e, 'Registration failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setP2Admin(prev => ({ ...prev, logoUrl: reader.result as string }));
        reader.readAsDataURL(file);
    };

    // ── EYE ICON ──────────────────────────────
    const EyeIcon = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
        <button type="button" onClick={onToggle} className="text-white/30 hover:text-white/70 transition-colors" tabIndex={-1}>
            {show
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            }
        </button>
    );

    // ────────────────────────────────────────────
    // RENDER — PHASE 1
    // ────────────────────────────────────────────
    if (step === 1) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] w-full py-8 px-4">
                <div className="w-full max-w-lg">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-6 mx-auto">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            Back
                        </button>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                            Create Account
                        </h1>
                        <p className="text-sm text-white/40">Join Gyan.AI and unlock AI-powered learning</p>
                    </div>

                    <StepIndicator step={1} />

                    {/* Role Selection */}
                    <div className="mb-6">
                        <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">I am a...</p>
                        <div className="grid grid-cols-3 gap-3">
                            {ROLES.map(r => (
                                <button
                                    key={r.role}
                                    onClick={() => setSelectedRole(r.role)}
                                    className={`
                    flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
                    ${selectedRole === r.role
                                            ? `${r.border} bg-white/8 ${r.shadow} scale-[1.03]`
                                            : 'border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5'}
                  `}
                                >
                                    <span className="text-2xl">{r.icon}</span>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${selectedRole === r.role ? r.color : 'text-white/60'}`}>
                                        {r.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                        {!selectedRole && p1Touched.name && (
                            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                Please select a role to continue
                            </p>
                        )}
                    </div>

                    {/* Base Account Form */}
                    <div className="space-y-4 bg-white/3 border border-white/8 rounded-2xl p-6 backdrop-blur-sm">
                        <Field
                            label="Full Name"
                            type="text"
                            placeholder="e.g. Arjun Singh"
                            autoComplete="name"
                            value={phase1.name}
                            onChange={handleP1Change('name')}
                            onBlur={() => touchP1('name')}
                            error={p1Errors.name}
                            touched={p1Touched.name}
                        />

                        <Field
                            label="Email Address"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            value={phase1.email}
                            onChange={handleP1Change('email')}
                            onBlur={() => touchP1('email')}
                            error={p1Errors.email}
                            touched={p1Touched.email}
                            rightElement={
                                !p1Errors.email && phase1.email ? (
                                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : undefined
                            }
                        />

                        <div className="space-y-1">
                            <Field
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Minimum 8 characters"
                                autoComplete="new-password"
                                value={phase1.password}
                                onChange={handleP1Change('password')}
                                onBlur={() => touchP1('password')}
                                error={p1Errors.password}
                                touched={p1Touched.password}
                                rightElement={<EyeIcon show={showPassword} onToggle={() => setShowPassword(v => !v)} />}
                            />
                            {/* Password Strength Bar */}
                            {phase1.password && (
                                <div className="space-y-1">
                                    <div className="flex gap-1 h-1">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div
                                                key={i}
                                                className="flex-1 rounded-full transition-all duration-300"
                                                style={{ backgroundColor: i <= pwStrength.score ? pwStrength.color : 'rgba(255,255,255,0.1)' }}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs" style={{ color: pwStrength.color }}>{pwStrength.label}</p>
                                </div>
                            )}
                        </div>

                        <Field
                            label="Confirm Password"
                            type={showConfirm ? 'text' : 'password'}
                            placeholder="Re-enter password"
                            autoComplete="new-password"
                            value={phase1.confirmPassword}
                            onChange={handleP1Change('confirmPassword')}
                            onBlur={() => touchP1('confirmPassword')}
                            error={p1Errors.confirmPassword}
                            touched={p1Touched.confirmPassword}
                            rightElement={
                                <div className="flex items-center gap-2">
                                    {phase1.confirmPassword && phase1.confirmPassword === phase1.password && (
                                        <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    <EyeIcon show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                                </div>
                            }
                        />
                    </div>

                    {/* Google Quick Fill */}
                    <div className="mt-6">
                        {/* Divider */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-white/10" />
                            <span className="text-xs text-white/30 font-medium tracking-wider uppercase">or continue with</span>
                            <div className="flex-1 h-px bg-white/10" />
                        </div>

                        {/* Google button — pre-fills name/email */}
                        <GoogleAuthBlock
                            onSuccess={handleGooglePrefill}
                            onError={handleGoogleError}
                            isLoading={isGoogleLoading}
                            error={null}
                            role={selectedRole || 'STUDENT'}
                        />

                        {/* Google linked badge */}
                        {isGoogleLinked && (
                            <div className="mt-3 flex items-center justify-center gap-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-4 py-2.5">
                                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-xs text-emerald-300 font-medium">Google account connected — password not required</span>
                            </div>
                        )}
                    </div>

                    {/* Continue Button */}
                    <button
                        onClick={handleContinue}
                        disabled={!canContinue()}
                        className={`
              mt-6 w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide
              flex items-center justify-center gap-2 transition-all duration-200
              ${canContinue()
                                ? 'bg-gradient-to-r from-neon-cyan to-cyan-400 text-black hover:shadow-[0_0_24px_rgba(0,243,255,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                                : 'bg-white/5 text-white/25 border border-white/10 cursor-not-allowed'}
            `}
                    >
                        Continue to Profile Details
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {/* Switch to Login */}
                    {onSwitchToLogin && (
                        <p className="text-center text-sm text-white/40 mt-6">
                            Already have an account?{' '}
                            <button onClick={onSwitchToLogin} className="text-neon-cyan hover:text-white font-semibold transition-colors underline decoration-dashed">
                                Log In
                            </button>
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // ────────────────────────────────────────────
    // RENDER — PHASE 2
    // ────────────────────────────────────────────
    const roleConfig = ROLES.find(r => r.role === selectedRole);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full py-8 px-4">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <button
                        onClick={() => { setStep(1); setP2Touched({}); }}
                        className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-6 mx-auto"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        Back to Account Details
                    </button>
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-2xl">{roleConfig?.icon}</span>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
                            {selectedRole === 'ADMIN' ? 'School Setup' : `${selectedRole} Profile`}
                        </h1>
                    </div>
                    <p className="text-sm text-white/40">
                        Hi <span className="text-white font-medium">{phase1.name}</span> — almost there!
                    </p>
                </div>

                <StepIndicator step={2} />

                {/* ── STUDENT PHASE 2 ── */}
                {selectedRole === 'STUDENT' && (
                    <div className="space-y-4 bg-white/3 border border-white/8 rounded-2xl p-6 backdrop-blur-sm">
                        <Field
                            label="Roll Number"
                            type="text"
                            placeholder="e.g. 2024-A-42"
                            value={p2Student.rollNumber}
                            onChange={e => setP2Student(prev => ({ ...prev, rollNumber: e.target.value }))}
                            onBlur={() => touchP2('rollNumber')}
                            error={p2Errors.rollNumber}
                            touched={p2Touched.rollNumber}
                        />

                        <Field
                            label="Mobile Number"
                            type="tel"
                            placeholder="10-digit number"
                            maxLength={10}
                            value={p2Student.phone}
                            onChange={e => setP2Student(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                            onBlur={() => touchP2('phone')}
                            error={p2Errors.phone}
                            touched={p2Touched.phone}
                        />

                        {/* Grade Select */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-white/60 uppercase tracking-widest">Grade / Class</label>
                            <select
                                value={p2Student.grade}
                                onChange={e => { setP2Student(prev => ({ ...prev, grade: e.target.value })); touchP2('grade'); }}
                                onBlur={() => touchP2('grade')}
                                className={`w-full bg-white/5 border rounded-lg px-4 py-3 text-white text-sm outline-none transition-all duration-200
                  ${p2Touched.grade && p2Errors.grade ? 'border-red-500/70' : 'border-white/10 focus:border-neon-cyan/60'}`}
                            >
                                <option value="" className="bg-gray-900">Select Grade...</option>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={`Grade ${i + 1}`} className="bg-gray-900">Grade {i + 1}</option>
                                ))}
                            </select>
                            {p2Touched.grade && p2Errors.grade && (
                                <p className="text-xs text-red-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    {p2Errors.grade}
                                </p>
                            )}
                        </div>

                        <Field
                            label="School Invite Code"
                            type="text"
                            placeholder="e.g. GYN-1234"
                            className="uppercase tracking-widest font-bold"
                            value={p2Student.inviteCode}
                            onChange={e => setP2Student(prev => ({ ...prev, inviteCode: e.target.value.toUpperCase() }))}
                            onBlur={() => touchP2('inviteCode')}
                            error={p2Errors.inviteCode}
                            touched={p2Touched.inviteCode}
                            hint="Get this code from your school administrator"
                        />
                    </div>
                )}

                {/* ── TEACHER PHASE 2 ── */}
                {selectedRole === 'TEACHER' && (
                    <div className="space-y-4 bg-white/3 border border-white/8 rounded-2xl p-6 backdrop-blur-sm">
                        <Field
                            label="Mobile Number"
                            type="tel"
                            placeholder="10-digit number"
                            maxLength={10}
                            value={p2Teacher.phone}
                            onChange={e => setP2Teacher(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                            onBlur={() => touchP2('phone')}
                            error={p2Errors.phone}
                            touched={p2Touched.phone}
                        />

                        {/* Subject Select */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-white/60 uppercase tracking-widest">Subject Specialization</label>
                            <select
                                value={p2Teacher.subject}
                                onChange={e => { setP2Teacher(prev => ({ ...prev, subject: e.target.value })); touchP2('subject'); }}
                                onBlur={() => touchP2('subject')}
                                className={`w-full bg-white/5 border rounded-lg px-4 py-3 text-white text-sm outline-none transition-all duration-200
                  ${p2Touched.subject && p2Errors.subject ? 'border-red-500/70' : 'border-white/10 focus:border-neon-cyan/60'}`}
                            >
                                <option value="" className="bg-gray-900">Select Subject...</option>
                                {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'History', 'Geography', 'Computer Science', 'Economics', 'Political Science', 'Physical Education', 'Art', 'Music', 'Other'].map(s => (
                                    <option key={s} value={s} className="bg-gray-900">{s}</option>
                                ))}
                            </select>
                            {p2Touched.subject && p2Errors.subject && (
                                <p className="text-xs text-red-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    {p2Errors.subject}
                                </p>
                            )}
                        </div>

                        <Field
                            label="School Invite Code"
                            type="text"
                            placeholder="e.g. GYN-1234"
                            className="uppercase tracking-widest font-bold"
                            value={p2Teacher.inviteCode}
                            onChange={e => setP2Teacher(prev => ({ ...prev, inviteCode: e.target.value.toUpperCase() }))}
                            onBlur={() => touchP2('inviteCode')}
                            error={p2Errors.inviteCode}
                            touched={p2Touched.inviteCode}
                            hint="Get this code from your school administrator"
                        />
                    </div>
                )}

                {/* ── ADMIN PHASE 2 ── */}
                {selectedRole === 'ADMIN' && (
                    <div className="space-y-4 bg-white/3 border border-white/8 rounded-2xl p-6 backdrop-blur-sm">
                        {/* Logo Upload */}
                        <div className="flex items-center gap-4">
                            <div
                                onClick={() => logoInputRef.current?.click()}
                                className="w-20 h-20 rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-neon-purple/50 transition-all overflow-hidden flex-shrink-0"
                            >
                                {p2Admin.logoUrl
                                    ? <img src={p2Admin.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                    : <>
                                        <svg className="w-6 h-6 text-white/30 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="text-[10px] text-white/30">Logo</span>
                                    </>
                                }
                            </div>
                            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            <div className="flex-1">
                                <Field
                                    label="School Name"
                                    type="text"
                                    placeholder="e.g. Delhi Public School"
                                    value={p2Admin.schoolName}
                                    onChange={e => setP2Admin(prev => ({ ...prev, schoolName: e.target.value }))}
                                    onBlur={() => touchP2('schoolName')}
                                    error={p2Errors.schoolName}
                                    touched={p2Touched.schoolName}
                                />
                            </div>
                        </div>

                        <Field
                            label="School Motto / Tagline (Optional)"
                            type="text"
                            placeholder="e.g. Knowledge is Power"
                            value={p2Admin.motto}
                            onChange={e => setP2Admin(prev => ({ ...prev, motto: e.target.value }))}
                        />

                        <Field
                            label="Admin Phone Number"
                            type="tel"
                            placeholder="10-digit number"
                            maxLength={10}
                            value={p2Admin.phone}
                            onChange={e => setP2Admin(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                        />

                        <Field
                            label="Full Address (Optional)"
                            type="text"
                            placeholder="Street, Area"
                            value={p2Admin.address}
                            onChange={e => setP2Admin(prev => ({ ...prev, address: e.target.value }))}
                        />

                        <div className="grid grid-cols-3 gap-3">
                            <Field
                                label="City"
                                type="text"
                                placeholder="Delhi"
                                value={p2Admin.city}
                                onChange={e => setP2Admin(prev => ({ ...prev, city: e.target.value }))}
                                onBlur={() => touchP2('city')}
                                error={p2Errors.city}
                                touched={p2Touched.city}
                            />
                            <Field
                                label="State"
                                type="text"
                                placeholder="DL"
                                value={p2Admin.state}
                                onChange={e => setP2Admin(prev => ({ ...prev, state: e.target.value }))}
                                onBlur={() => touchP2('state')}
                                error={p2Errors.state}
                                touched={p2Touched.state}
                            />
                            <Field
                                label="Pincode"
                                type="text"
                                placeholder="110001"
                                maxLength={6}
                                value={p2Admin.pincode}
                                onChange={e => setP2Admin(prev => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))}
                            />
                        </div>

                        <div className="border border-white/10 rounded-xl p-4 bg-neon-purple/5 flex items-start gap-3">
                            <svg className="w-5 h-5 text-neon-purple flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div>
                                <p className="text-xs font-semibold text-neon-purple">Auto Invite Code</p>
                                <p className="text-xs text-white/40 mt-0.5">A unique School Invite Code will be generated for you and displayed after registration.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !canSubmit()}
                    className={`
            mt-6 w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide
            flex items-center justify-center gap-2 transition-all duration-200
            ${canSubmit() && !isSubmitting
                            ? 'bg-gradient-to-r from-signal-orange to-orange-400 text-black hover:shadow-[0_0_24px_rgba(255,95,31,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-white/5 text-white/25 border border-white/10 cursor-not-allowed'}
          `}
                >
                    {isSubmitting ? (
                        <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            {selectedRole === 'ADMIN' ? 'Creating School...' : 'Creating Account...'}
                        </>
                    ) : (
                        <>
                            {selectedRole === 'ADMIN' ? '🏫 Create My School' : '✓ Complete Registration'}
                        </>
                    )}
                </button>

                {/* Security note */}
                <p className="text-center text-xs text-white/25 mt-4">
                    🔒 Your data is encrypted and never shared with third parties
                </p>
            </div>
        </div>
    );
};
