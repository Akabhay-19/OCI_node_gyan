# GYAN AI - Architecture & Features Documentation

## 🏗️ System Architecture

```
├── Frontend (React + Vite)
│   ├── src/App.tsx          → Main application routing
│   ├── src/services/api.ts  → API client with auth support
│   └── src/components/      → UI components
│
├── Backend (Node.js + Express)
│   ├── server.js            → Entry point
│   ├── middleware/auth.js   → JWT authentication
│   ├── routes/
│   │   ├── auth.routes.js   → Login, OTP, dev-login
│   │   └── ai.routes.js     → AI config, models, status
│   ├── ai-service.js        → OpenRouter/Gemini AI
│   └── email-service.js     → OTP email sending
│
└── Database (Supabase/PostgreSQL)
    ├── system_users         → Developer credentials
    ├── app_config           → AI settings (stateless)
    ├── schools, teachers, students, classrooms
    └── announcements
```

---

## 🔐 Security Features

### 1. JWT Authentication
**Files:** `backend/middleware/auth.js`, `src/services/api.ts`

| What it does | Why it matters |
|--------------|----------------|
| Generates encrypted tokens on login | No passwords stored in browser |
| Validates tokens on protected routes | API can't be accessed without login |
| Expires after 7 days | Limits damage if token is stolen |

**How it works:**
1. User logs in → Server returns JWT token
2. Token stored in `sessionStorage`
3. All protected API calls include `Authorization: Bearer <token>`
4. Server verifies token before processing request

---

### 2. Password Hashing (bcrypt)
**Files:** `backend/routes/auth.routes.js`

| What it does | Why it matters |
|--------------|----------------|
| Passwords stored as irreversible hashes | Even if database is hacked, passwords are safe |
| Uses salt (random data) per password | Same password = different hash for each user |

---

### 3. Row Level Security (RLS)
**Location:** Supabase Database

| What it does | Why it matters |
|--------------|----------------|
| Database rejects unauthorized writes | Even if someone bypasses the API, database won't accept bad data |
| Only service_role key can write | Frontend can read, but can't modify |

---

## 📁 Route Modularization

### Before (Bad)
```
server.js → 3000+ lines, everything mixed together
```

### After (Good)
```
server.js (entry point, ~200 lines)
├── routes/auth.routes.js (login, OTP)
└── routes/ai.routes.js (AI config, models)
```

**Benefits:**
- ✅ Easier to find code
- ✅ Easier to test individual parts
- ✅ Multiple developers can work on different files
- ✅ Smaller files = faster code review

---

## 💾 Stateless Configuration

### Before (Bad)
```javascript
let currentModel = 'gemini'; // Stored in server memory
// If server restarts → RESET to default
// If 3 servers running → Each has DIFFERENT setting
```

### After (Good)
```javascript
// Stored in Supabase app_config table
// Server restart → Setting PERSISTS
// Multiple servers → All read SAME setting
```

**Table: `app_config`**
| key | value |
|-----|-------|
| ai_provider | openrouter |
| ai_model | google/gemini-2.0-flash-exp:free |
| ai_audio_model | gemini-2.0-flash-exp |

---

## 🤖 AI Service Integration

**File:** `backend/ai-service.js`

| Provider | When Used | Cost |
|----------|-----------|------|
| OpenRouter | Primary (default) | Free tier available |
| Gemini | Fallback | Free tier available |

**Features:**
- Automatic fallback if primary fails
- Model switching via Developer Console
- Supports text generation and chat

---

## 📧 Email OTP Verification

**Files:** `backend/email-service.js`, `routes/auth.routes.js`

| Endpoint | Purpose |
|----------|---------|
| `/api/auth/send-email-otp` | Sends 6-digit OTP to email |
| `/api/auth/verify-email-otp` | Validates OTP entered by user |

**Flow:**
1. User enters email
2. Server generates OTP, stores with expiry
3. Sends email via Resend API
4. User enters OTP → verified against stored value

---

## 🔑 Developer Console Access

**How to access:** Go to `/developer` on your site

**Protected Actions:**
- Change AI provider (OpenRouter/Gemini)
- Change AI model
- View system status
- Manage API keys

**Security:**
- Requires login with credentials in `system_users` table
- All actions require valid JWT token
- Cannot be accessed from frontend without authentication

---

## 📊 Database Tables Summary

| Table | Purpose | RLS |
|-------|---------|-----|
| `system_users` | Developer/Admin accounts | ✅ |
| `app_config` | AI settings | ✅ |
| `schools` | School profiles | ✅ |
| `teachers` | Teacher accounts | ✅ |
| `students` | Student accounts | ✅ |
| `classrooms` | Class information | ✅ |
| `announcements` | School announcements | ✅ |

---

## 🚀 Scalability Improvements Summary

| Before | After | Impact |
|--------|-------|--------|
| Hardcoded credentials | Database + bcrypt | 🔒 Security |
| No API protection | JWT tokens | 🔒 Security |
| One 3000-line file | Modular routes | 🛠️ Maintainability |
| Memory-based config | Database config | 📈 Scalability |
| No RLS | RLS enabled | 🔒 Security |

**Overall Scalability Rating: 9/10**
