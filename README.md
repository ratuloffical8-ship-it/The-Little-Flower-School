<!-- README.md -->
# The Little Flower School (TLFS): Website & Management System

Public website (Bengali primary, English toggle) and an admin panel at `/admine` for **The Little Flower School**, established 2016, Bangladesh.

## What it does

**Public (parents / students)**
- Browse the school site: notices, gallery, FAQ, contact form
- Apply for admission online and check application status
- Look up published exam results (student ID + guardian mobile)
- Submit manual fee payments (bKash / Nagad) with TrxID and optional screenshot

**Admin panel (`/admine`)**: five roles (`super_admin`, `school_admin`, `accountant`, `teacher`, `admission_officer`)
- Admissions review and approval (approval creates the student record)
- Students (incl. CSV import), teachers
- Daily attendance, exams, marks entry, result publishing
- Notices (with PDF), gallery, FAQ, contact inbox
- Invoices, payment review, expenses
- Reports (finance, admissions, attendance), school settings, user management

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, TailwindCSS, React Router |
| Backend | Node.js, Express, TypeScript, Zod, Multer |
| Data | Cloud Firestore (database), Firebase Storage (private files, signed URLs) |
| Auth | Firebase Auth with custom claims (`role`) |
| Abuse protection | Firebase App Check + reCAPTCHA v3, honeypot, in-memory rate limiting |
| Hosting | Render (static site + free web service) |
| Exports | pdfkit (Bengali font) and CSV utilities exist server-side; the UI exports CSV client-side |

## Repository layout

```
tlfs/
├── src/                     React frontend (public pages, admin features)
├── public/images/logo.png   Keep this filename
├── server/
│   ├── src/                 Express API (routes, services, middleware, scripts)
│   ├── assets/fonts/        Hind Siliguri TTFs (manual, needed for PDF util only)
│   └── tests/smoke.test.ts  Black-box smoke test
├── docs/                    DEPLOYMENT, API, ADMIN_GUIDE, BACKUP
├── firestore.rules          Deny-all (backend uses the Admin SDK)
├── storage.rules            Deny-all (signed URLs only)
├── firestore.indexes.json   Composite indexes
├── firebase.json
├── render.yaml              Render Blueprint (API + static site)
└── .github/workflows/ci.yml
```

## Security model

- Firestore and Storage reject **all** client access. The backend (Firebase Admin SDK) is the only reader and writer.
- Every admin endpoint requires a Firebase ID token and a role check.
- Public lookups (results, admission status, payment submission) need multiple factors and return one generic error (`তথ্য মেলেনি / Details do not match`) on any mismatch.
- Secrets live only in Render environment variables, never in the repo.

## Quick start (local)

Prerequisites: Node.js **≥ 20.6**, a Firebase project (Auth email/password, Firestore, Storage).

```bash
# 1. Install
npm install
cd server && npm install && cd ..

# 2. Configure (see tables below)
#    frontend: .env.local        backend: server/.env

# 3. One-time data setup (from server/)
cd server
npm run seed          # classes Play–10 + active session
npm run bootstrap     # first super_admin (see docs/DEPLOYMENT.md)

# 4. Run the API (loads server/.env)
npx tsx --env-file=.env src/index.ts     # http://localhost:3001

# 5. Run the frontend (new terminal, repo root)
npm run dev                              # http://localhost:5173
```

The admin panel is at `http://localhost:5173/admine` (`/admin` redirects there).

## Environment variables

**Frontend (`.env.local`)**

| Name | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend URL |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Firebase web app config |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 site key (App Check) |
| `VITE_SITE_URL` | Canonical site URL |

**Backend (`server/.env` / Render)**

| Name | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | no | `development` | Environment |
| `PORT` | no | `3001` | Port (Render injects its own) |
| `FRONTEND_ORIGIN` | no | `http://localhost:5173` | Allowed CORS origins, comma-separated |
| `FIREBASE_PROJECT_ID` | yes |  | Firebase project |
| `FIREBASE_STORAGE_BUCKET` | yes |  | Storage bucket |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | yes |  | `base64(service-account.json)` on one line |
| `RECAPTCHA_ENFORCE_APP_CHECK` | no | `false` | Require App Check on public POSTs |
| `BOOTSTRAP_SUPER_ADMIN_EMAIL` | no |  | Auto-promote this email on first login |

Script/test-only: `BOOTSTRAP_SUPER_ADMIN_PASSWORD` (local shell only, never on Render), `PDF_FONT_DIR`, `SMOKE_BASE_URL`, `SMOKE_WITH_DATA`.

## Scripts

| Where | Command | What |
|---|---|---|
| root | `npm run dev` / `npm run build` | Frontend dev server / production build |
| `server/` | `npm run build` / `npm start` | Compile to `dist/` / run `node dist/index.js` |
| `server/` | `npm run seed` | Create classes and the active session (idempotent) |
| `server/` | `npm run bootstrap` | Create or promote the first super admin |
| `server/` | `npm run test:smoke` | Smoke test against a running server |

## Documentation

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Firebase and Render setup, first deploy, App Check
- [docs/API.md](docs/API.md): endpoint reference
- [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md): how to use the admin panel, by task
- [docs/BACKUP.md](docs/BACKUP.md): backups, restore, secret rotation
- [CHANGELOG.md](CHANGELOG.md): release notes and known limitations
