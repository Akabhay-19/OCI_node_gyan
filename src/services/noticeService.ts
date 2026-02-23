// ============================================================
// GYAN AI — Centralized Notice & Error Handling Service
// ============================================================
// Never expose raw backend errors to users.
// All API errors must pass through this service before display.
// ============================================================

export type NoticeType = 'success' | 'warning' | 'info' | 'processing' | 'error';

export interface Notice {
    id: string;
    type: NoticeType;
    message: string;
    duration?: number; // ms, 0 = permanent until dismissed
    timestamp: number;
}

// Global listener (set by GlobalNotice component)
type NoticeListener = (notice: Notice) => void;
type DismissListener = (id: string) => void;

let _addListener: NoticeListener | null = null;
let _dismissListener: DismissListener | null = null;

export const noticeService = {
    // --- Internal registration (called by GlobalNotice component) ---
    _register: (addFn: NoticeListener, dismissFn: DismissListener) => {
        _addListener = addFn;
        _dismissListener = dismissFn;
    },

    // --- Core emit function ---
    _emit: (type: NoticeType, message: string, duration = 4000): string => {
        const id = `notice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const notice: Notice = { id, type, message, duration, timestamp: Date.now() };
        if (_addListener) {
            _addListener(notice);
        } else {
            // Fallback: queue for when listener registers
            console.warn(`[NoticeService] No listener registered yet. Notice: ${type} - ${message}`);
        }
        return id;
    },

    // --- Public API ---
    success: (message: string, duration = 4000) =>
        noticeService._emit('success', message, duration),

    error: (message: string, duration = 5000) =>
        noticeService._emit('error', message, duration),

    warning: (message: string, duration = 5000) =>
        noticeService._emit('warning', message, duration),

    info: (message: string, duration = 4000) =>
        noticeService._emit('info', message, duration),

    processing: (message: string, duration = 0) =>
        noticeService._emit('processing', message, duration),

    dismiss: (id: string) => {
        if (_dismissListener) _dismissListener(id);
    },

    // --- Error Mapping: Raw API error → User-friendly message ---
    mapApiError: (error: any): string => {
        // Log the real error internally (never shown to user)
        console.error('[API Error - Internal]', error);

        const message: string =
            typeof error === 'string'
                ? error
                : error?.message || error?.error || '';

        const status: number = error?.status || error?.statusCode || 0;

        // HTTP Status codes
        if (status === 401 || message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('session expired')) {
            return 'Your session has expired. Please log in again.';
        }
        if (status === 403) {
            return "You don't have permission to do this.";
        }
        if (status === 404) {
            return 'The requested resource was not found.';
        }
        if (status === 409 || message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('already exists') || message.toLowerCase().includes('unique constraint')) {
            return 'This record already exists. Please check your details.';
        }
        if (status === 429) {
            return 'Too many requests. Please wait a moment and try again.';
        }
        if (status >= 500) {
            return "We're experiencing a temporary issue. Please try again in a moment.";
        }

        // Validation errors
        if (message.toLowerCase().includes('validation') || message.toLowerCase().includes('required')) {
            return 'Please check the required fields and try again.';
        }
        if (message.toLowerCase().includes('email') && message.toLowerCase().includes('invalid')) {
            return 'Email format is invalid. Please enter a valid email address.';
        }
        if (message.toLowerCase().includes('password')) {
            return 'Password does not meet security requirements. Please try a stronger password.';
        }
        if (message.toLowerCase().includes('invite code') || message.toLowerCase().includes('invitecode')) {
            return 'Invalid or expired invite code. Please verify with your school admin.';
        }

        // Network / timeout
        if (
            message.toLowerCase().includes('network') ||
            message.toLowerCase().includes('fetch') ||
            message.toLowerCase().includes('failed to fetch') ||
            message.toLowerCase().includes('networkerror')
        ) {
            return 'Network issue detected. Please check your connection and try again.';
        }

        // Auth errors
        if (message.toLowerCase().includes('invalid credentials') || message.toLowerCase().includes('login failed')) {
            return 'Invalid credentials. Please check your username and password.';
        }
        if (message.toLowerCase().includes('google') || message.toLowerCase().includes('oauth')) {
            return 'Google sign-in failed. Please try again or use email/password.';
        }

        // Database internal messages (never show these raw)
        if (
            message.toLowerCase().includes('supabase') ||
            message.toLowerCase().includes('postgres') ||
            message.toLowerCase().includes('sql') ||
            message.toLowerCase().includes('mongo') ||
            message.toLowerCase().includes('sqlite')
        ) {
            return "We're experiencing a temporary issue. Please try again in a moment.";
        }

        // Fallback
        if (message && message.length < 120 && !message.toLowerCase().includes('stack')) {
            // Safe to show short, non-technical messages
            return message;
        }

        return "Something went wrong. Please try again.";
    },

    // --- Convenience: catch API error and auto-show notice ---
    handleApiError: (error: any, fallbackMsg?: string): void => {
        const friendlyMsg = fallbackMsg || noticeService.mapApiError(error);
        noticeService.error(friendlyMsg);
    },

    // --- Retry helper (silent retry before showing error) ---
    withRetry: async <T>(
        fn: () => Promise<T>,
        options: { retries?: number; delay?: number; onFail?: (err: any) => void } = {}
    ): Promise<T> => {
        const { retries = 1, delay = 2000, onFail } = options;
        let lastError: any;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await fn();
            } catch (err) {
                lastError = err;
                if (attempt < retries) {
                    // Silent wait before retry
                    await new Promise(res => setTimeout(res, delay));
                }
            }
        }

        if (onFail) {
            onFail(lastError);
        } else {
            noticeService.handleApiError(lastError);
        }
        throw lastError;
    },
};
