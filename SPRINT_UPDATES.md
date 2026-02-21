# 🚀 GYAN.AI — Sprint Update Log
**Date:** 20 February 2026  
**Branch:** `google-auth-ui-fixes`  
**Developer:** Vinay Badnoriya

---

## ✅ Changes Made This Sprint

### 1. 🔐 Google OAuth — Full Integration Fix

**Files Changed:**
- `backend/services/google-auth.service.js`
- `backend/middleware/validators.js`

**What was fixed:**
- **Root cause fixed:** Supabase PostgREST errors have details in `.message`, `.details`, and `.hint` fields — previous code only checked `.message`, so schema-missing errors were not being caught properly.
- **New approach:** Added `schemaHasGoogleColumns` flag — a single clean lookup decides whether DB has Google columns. If not, entire flow gracefully falls back to email-only mode — no crashes, no "System configuration error".
- **Middleware fix:** `googleLoginRules` validator was only allowing `STUDENT` and `TEACHER` — added `ADMIN` so admin Google login requests were no longer rejected at middleware layer (HTTP 400) before reaching backend logic.
- **Error messages:** Removed misleading `"System configuration error"` — now shows actual error message for easier debugging.

**Flow:**
```
Google Token → Verify (google-auth-library + 5s timeout)
  → DB Lookup (google_id OR email)
    → Schema Error? → Fallback to email-only lookup (schemaHasGoogleColumns = false)
    → Found by google_id? → Login ✅
    → Found by email? → Link Google account → Login ✅
    → Not found? → Create new account → Login ✅
  → JWT issued → User lands on Dashboard
```

---

### 2. 👤 Admin Google Login — Added Support

**Files Changed:**
- `backend/services/google-auth.service.js`
- `backend/middleware/validators.js`

**What was done:**
- Added `'ADMIN'` to `ALLOWED_GOOGLE_ROLES` in `google-auth.service.js`
- Added `'ADMIN'` to `googleLoginRules` validator in `validators.js`
- Added proper **ADMIN role mapping** for new user creation — when an Admin signs up via Google for the first time, a school record is auto-created with:
  - School name from Google profile (`"John's School"`)
  - Auto-generated unique invite code (`SCH-XXXXXX`)
  - Default `studentCount: 0`, `maxStudents: 200`, `subscriptionStatus: 'trial'`

**Roles now supported for Google Login:**

| Role | Table | Email Field | Google Login |
|------|-------|------------|--------------|
| STUDENT | `students` | `email` | ✅ |
| TEACHER | `teachers` | `email` | ✅ |
| ADMIN | `schools` | `adminEmail` | ✅ (new) |

---

### 3. 👁️ Password Show/Hide — Eye Icon Toggle

**File Changed:**
- `src/components/UIComponents.tsx`

**What was done:**
- Core `Input` component upgraded with internal `showPassword` state
- `Eye` / `EyeOff` icons from `lucide-react` added
- Auto-activates only when `type="password"` is passed — no change needed in any other file
- Icon: absolute positioned on right side with neon-cyan hover effect
- `tabIndex={-1}` so it doesn't interrupt keyboard flow

**All pages where this now works (automatically):**
- ✅ Student Login
- ✅ Teacher Login  
- ✅ Admin Login
- ✅ Parent Login
- ✅ Student Signup (Create Password)
- ✅ Teacher Signup (Create Password)
- ✅ School Registration (Admin Password)
- ✅ Developer Console Login

---

### 4. 🏫 Google Button — Create School Page

**File Changed:**
- `src/components/RoleSelection.tsx`

**What was done:**
- Added `GoogleAuthBlock` to the **"Create Your School"** form
- Placed below "Create School & Generate Invite Code" button with `"OR quick setup with"` divider
- **Behavior:** Google button on this page does NOT login — it **pre-fills the form**:
  - `adminEmail` ← from Google account email
  - `adminName` ← from Google account name
- Rest of the form (School Name, Password, Address) still requires manual entry

---

### 5. 🛡️ Frontend Google Provider Fix

**File Changed:**
- `src/App.tsx`

**What was done:**
- `GoogleOAuthProvider` now conditionally renders only when `VITE_GOOGLE_CLIENT_ID` is set
- Previously: provider was initialized with empty string `|| ''` causing silent failures
- Now: if key is missing → no Google button shown → no errors

---

## 🗃️ Database Migration Required (Permanent Fix)

The fallback logic handles missing columns gracefully, but for full Google linking to save permanently, run this in Supabase SQL editor:

```sql
-- For Teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS oauth_linked_at TIMESTAMPTZ;

-- For Students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS oauth_linked_at TIMESTAMPTZ;

-- For Schools/Admins table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS oauth_linked_at TIMESTAMPTZ;
```

---

## 📁 Files Modified Summary

| File | Type | Change |
|------|------|--------|
| `backend/services/google-auth.service.js` | Backend | Google Auth complete rewrite with robust fallback |
| `backend/middleware/validators.js` | Backend | Added ADMIN to Google login validator |
| `backend/routes/data.routes.js` | Backend | Student/Teacher registration Google fields fallback |
| `src/components/UIComponents.tsx` | Frontend | Password eye icon toggle |
| `src/components/RoleSelection.tsx` | Frontend | Google button on Create School page |
| `src/App.tsx` | Frontend | Conditional GoogleOAuthProvider |

---

## 🔧 Tech Stack

```
Frontend  : React 19 + TypeScript + Vite + TailwindCSS
Backend   : Node.js + Express.js  
Database  : Supabase (PostgreSQL)
Auth      : JWT + Google OAuth 2.0 (google-auth-library)
Security  : Helmet + bcryptjs + express-rate-limit
```

---

*Generated: 20 Feb 2026 | GYAN.AI Sprint Documentation*
