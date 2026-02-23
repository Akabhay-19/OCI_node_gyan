// ============================================================
// GYAN AI — Intelligent Draft Save & Resume Service
// ============================================================
// Saves registration progress locally (localStorage) and
// syncs to backend (draft_users table).
// Drafts auto-expire after 24 hours.
// ============================================================

import { API_URL } from './api';
import { UserRole } from '../types';

const DRAFT_KEY = 'GYAN_SIGNUP_DRAFT';
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SignupDraft {
    draftId: string;
    role: UserRole | null;
    currentView: string;
    formData: Record<string, any>;
    lastUpdatedAt: number; // timestamp
    isCompleted: boolean;
}

// --- UUID generator (no external dep) ---
const generateDraftId = (): string => {
    return 'draft-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
};

// --- Debounce utility ---
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
const debounce = (fn: () => void, delay: number) => {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(fn, delay);
};

export const draftService = {
    // --- Read draft from localStorage ---
    getDraft: (): SignupDraft | null => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return null;
            const draft: SignupDraft = JSON.parse(raw);

            // Check expiry
            if (Date.now() - draft.lastUpdatedAt > DRAFT_EXPIRY_MS) {
                draftService.clearLocal();
                return null;
            }

            // Ignore completed drafts
            if (draft.isCompleted) {
                draftService.clearLocal();
                return null;
            }

            return draft;
        } catch {
            return null;
        }
    },

    // --- Check if a non-trivial draft exists (has some data) ---
    hasDraft: (): boolean => {
        const draft = draftService.getDraft();
        if (!draft) return false;
        // A meaningful draft has a role and at least one form field filled
        const hasRole = !!draft.role;
        const hasFields = Object.values(draft.formData || {}).some(v => v && v !== '');
        return hasRole && hasFields;
    },

    // --- Save draft immediately (local + queued backend sync) ---
    save: (
        role: UserRole | null,
        currentView: string,
        formData: Record<string, any>,
        immediate = false
    ): SignupDraft => {
        const existing = draftService.getDraft();
        const draft: SignupDraft = {
            draftId: existing?.draftId || generateDraftId(),
            role,
            currentView,
            formData: { ...formData },
            lastUpdatedAt: Date.now(),
            isCompleted: false,
        };

        // Sanitize: remove password from local storage draft
        const safeDraft = {
            ...draft,
            formData: { ...draft.formData, password: '' },
        };

        localStorage.setItem(DRAFT_KEY, JSON.stringify(safeDraft));

        // Backend sync (debounced to avoid flooding)
        if (immediate) {
            draftService._syncToBackend(draft);
        } else {
            debounce(() => draftService._syncToBackend(draft), 5000);
        }

        return safeDraft;
    },

    // --- Auto-save on field blur (called from RoleSelection) ---
    autoSave: (role: UserRole | null, currentView: string, formData: Record<string, any>) => {
        draftService.save(role, currentView, formData, false);
    },

    // --- Save on blur (immediate local, debounced backend) ---
    saveOnBlur: (role: UserRole | null, currentView: string, formData: Record<string, any>) => {
        draftService.save(role, currentView, formData, false);
    },

    // --- Mark draft as completed (call after successful registration) ---
    markCompleted: async () => {
        const draft = draftService.getDraft();
        if (draft) {
            try {
                await draftService._deleteFromBackend(draft.draftId);
            } catch (e) {
                console.warn('[Draft] Failed to delete from backend:', e);
            }
        }
        draftService.clearLocal();
    },

    // --- Clear local storage ---
    clearLocal: () => {
        localStorage.removeItem(DRAFT_KEY);
    },

    // --- Clear everything (local + backend) ---
    clear: async () => {
        const draft = draftService.getDraft();
        draftService.clearLocal();
        if (draft?.draftId) {
            try {
                await draftService._deleteFromBackend(draft.draftId);
            } catch {
                // Silently fail — local is already cleared
            }
        }
    },

    // --- Backend: Sync draft ---
    _syncToBackend: async (draft: SignupDraft): Promise<void> => {
        try {
            // Never send password to backend
            const safeDraft = {
                ...draft,
                formData: { ...draft.formData, password: '' },
            };

            await fetch(`${API_URL}/drafts/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(safeDraft),
            });
        } catch (e) {
            // Backend sync failure is non-critical; local copy still exists
            console.debug('[Draft] Backend sync failed (non-critical):', e);
        }
    },

    // --- Backend: Restore draft by ID ---
    _getFromBackend: async (draftId: string): Promise<SignupDraft | null> => {
        try {
            const res = await fetch(`${API_URL}/drafts/${draftId}`);
            if (!res.ok) return null;
            return await res.json();
        } catch {
            return null;
        }
    },

    // --- Backend: Delete draft ---
    _deleteFromBackend: async (draftId: string): Promise<void> => {
        try {
            await fetch(`${API_URL}/drafts/${draftId}`, { method: 'DELETE' });
        } catch {
            // Non-critical
        }
    },

    // --- Get friendly "last saved" text ---
    getLastSavedText: (draft: SignupDraft): string => {
        const diff = Date.now() - draft.lastUpdatedAt;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);

        if (diff < 60000) return 'just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        return 'more than a day ago';
    },
};
