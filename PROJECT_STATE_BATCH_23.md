// PROJECT_STATE_BATCH_23.md

# ═══════════════════════════════════════════════════════════════════
# PROJECT HANDOFF STATE — The Little Flower School (TLFS)
# Complete Project Snapshot — Resumable by Any AI/Developer
# ═══════════════════════════════════════════════════════════════════

**Last completed batch:** 23 of 24
**Next batch:** 24
**Date:** 2026-10-30
**Files done:** 161 of 168 (96%)
**Files remaining:** 7

---

## 📖 HOW TO RESUME (READ THIS FIRST)

If you are a new AI assistant or developer picking up this project:

1. **Read this entire file** — it contains the full project context.
2. **Do NOT regenerate completed files** (listed below with contracts).
3. **Do NOT re-plan from scratch** — follow the batch plan in order.
4. **Confirm understanding** in ≤5 lines: last batch, next batch number, next 7 file paths.
5. **Ask permission ONCE per batch** — then deliver all 7 files back-to-back without asking again. Only ask again before starting batch N+1.
6. **One batch per permission.** Never deliver two batches on one permission.
7. **Each code file's FIRST LINE must be a comment with its full path** (JSON files cannot hold comments — state the path in the heading instead).
8. **After each batch, emit a NEW complete state file** as ONE single markdown code block — top to bottom in one copy — nothing split, nothing truncated.
9. **Deliver code files one after another in the same message/turn flow** once permission is given; do NOT wait for "continue" between files inside the same batch (user preference, Batch 19 onward).

---

## 🎯 WHAT WE ARE BUILDING

**Project:** Complete school website + management system for "The Little Flower School" (TLFS), established 2016, Bangladesh.

**Scope:** Public website (Bengali primary + English toggle) + admin panel at `/admine` with full CRUD for admissions, students, teachers, attendance, exams, results, notices, gallery, FAQ, payments, expenses, reports.

**Users:**
- Public (parents/students): browse info, apply for admission, check status, lookup results, pay fees (manual bKash/Nagad), contact.
- Admin roles (5): super_admin, school_admin, accountant, teacher, admission_officer.

---

## 🏗️ ARCHITECTURE

### Frontend
- React 18 + Vite + TypeScript + TailwindCSS + React Router
- Hosting: Render Static Site (free)
- Auth: Firebase Auth with custom claims
- i18n: Custom (bn/en + Bengali numerals)

### Backend
- Node.js + Express + TypeScript + Firebase Admin SDK
- Hosting: Render Web Service (free — handles cold starts)
- Database: Cloud Firestore
- Storage: Firebase Storage (private; signed URLs only)
- Validation: Zod
- Uploads: Multer (memory storage)
- Exports: pdfkit (PDF, Bengali font embedded) + hand-rolled CSV (UTF-8 BOM) — Batch 17
- Deployment: Render Blueprint (`render.yaml`) + Firebase CLI for rules/indexes — Batch 23
- Tests: black-box smoke test via `node:test` + `tsx` against a running server — Batch 23

### Security
- All Firestore/Storage client reads AND writes DENIED (rules = `if false`); Admin SDK bypasses rules
- Backend API is the ONLY reader/writer
- All secrets in Render env vars
- Firebase App Check + reCAPTCHA v3 + honeypot + rate limiting
- Public lookups: multi-factor (ID + mobile/DOB), generic error messages

### Locked Decisions (DO NOT CHANGE)
- Admin URL = `/admine` (misspelled). `/admin` → redirect to `/admine`.
- Classes: Play, Nursery, 1–10
- GPA scale: Bangladesh 5.00 (configurable)
- Application ID: `TLFS-APP-YYYY-NNNNNN`
- Student ID: `TLFS-STU-YYYY-NNNN`
- Payments: manual bKash/Nagad only
- No 2FA, SMS, email in v1
- Mobile bottom nav: হোম, ভর্তি, ফলাফল, নোটিশ, আরও
- CSV: UTF-8 BOM; PDFs: embed Bengali font

---

## 📁 DIRECTORY STRUCTURE

```
tlfs/
├── public/images/logo.png
├── firestore.rules                        ← Batch 23
├── storage.rules                          ← Batch 23
├── firestore.indexes.json                 ← Batch 23
├── firebase.json                          ← Batch 23
├── render.yaml                            ← Batch 23
├── src/                                   (frontend — 98 files DONE)
│   ├── main.tsx, App.tsx, vite-env.d.ts
│   ├── styles/index.css
│   ├── lib/{env,api}.ts, lib/firebase/{config,auth,appCheck}.ts
│   ├── i18n/{index,bn,en}.ts
│   ├── types/{index,admission,payment,admin}.ts
│   ├── hooks/{useAuth,useLanguage,useApi}.ts
│   ├── utils/{format,validation}.ts
│   ├── layouts/{PublicLayout,AdminLayout}.tsx
│   ├── components/ (14 shared UI)
│   ├── pages/ (12 public pages)
│   └── features/
│       ├── admission/ (5 files)
│       └── admin/
│           ├── AdminDashboard.tsx                      ← Batch 18
│           ├── LoginPage.tsx                           ← Batch 18
│           ├── common/
│           │   ├── AdminHeader.tsx                     ← Batch 18
│           │   ├── AdminSidebar.tsx                    ← Batch 18
│           │   ├── StatCard.tsx                        ← Batch 18
│           │   ├── ChartCard.tsx                       ← Batch 18
│           │   └── ActionBar.tsx                       ← Batch 18
│           ├── admissions/                             ← Batch 19
│           │   ├── AdmissionsListPage.tsx
│           │   ├── AdmissionDetailPage.tsx
│           │   └── ApproveModal.tsx
│           ├── students/                               ← Batch 19
│           │   ├── StudentsListPage.tsx
│           │   ├── StudentDetailPage.tsx
│           │   ├── StudentFormModal.tsx
│           │   └── ImportStudentsModal.tsx
│           ├── teachers/                               ← Batch 20
│           │   ├── TeachersListPage.tsx
│           │   └── TeacherFormModal.tsx
│           ├── attendance/                             ← Batch 20
│           │   └── AttendancePage.tsx
│           ├── exams/                                  ← Batch 20
│           │   ├── ExamsListPage.tsx
│           │   ├── ExamFormModal.tsx
│           │   ├── ResultsEntryPage.tsx
│           │   └── ResultsPublishModal.tsx
│           ├── notices/                                ← Batch 21
│           │   ├── NoticesListPage.tsx
│           │   └── NoticeFormModal.tsx
│           ├── gallery/                                ← Batch 21
│           │   ├── GalleryListPage.tsx
│           │   └── GalleryUploadModal.tsx
│           ├── faq/                                    ← Batch 21
│           │   ├── FAQListPage.tsx
│           │   └── FAQFormModal.tsx
│           ├── contact/                                ← Batch 21
│           │   └── ContactMessagesPage.tsx
│           ├── payments/                               ← Batch 22
│           │   ├── PaymentsListPage.tsx
│           │   └── InvoicesListPage.tsx
│           ├── expenses/                               ← Batch 22
│           │   └── ExpensesListPage.tsx
│           ├── reports/                                ← Batch 22
│           │   └── ReportsPage.tsx
│           ├── settings/                               ← Batch 22
│           │   └── SettingsPage.tsx
│           └── users/                                  ← Batch 22
│               ├── UsersListPage.tsx
│               └── UserFormModal.tsx
├── server/                                (backend — 58 files DONE)
│   ├── package.json, tsconfig.json
│   ├── assets/fonts/   ← MANUAL: HindSiliguri-Regular.ttf (+ -Bold.ttf) — NOT generated
│   ├── tests/
│   │   └── smoke.test.ts                               ← Batch 23
│   └── src/
│       ├── index.ts
│       ├── config/{firebase,env}.ts
│       ├── middleware/
│       │   ├── auth.ts, rateLimit.ts, validate.ts
│       │   ├── appCheck.ts                             ← Batch 17
│       │   └── errorHandler.ts                         ← Batch 17
│       ├── schemas/{common,admission,payment}.schema.ts
│       ├── services/
│       │   ├── counter.service.ts
│       │   ├── storage.service.ts
│       │   ├── admission.service.ts
│       │   ├── audit.service.ts
│       │   ├── session.service.ts
│       │   ├── settings.service.ts
│       │   ├── notice.service.ts
│       │   ├── gallery.service.ts
│       │   ├── faq.service.ts
│       │   ├── invoice.service.ts
│       │   ├── payment.service.ts
│       │   ├── student.service.ts
│       │   ├── teacher.service.ts
│       │   ├── attendance.service.ts
│       │   ├── exam.service.ts
│       │   ├── result.service.ts
│       │   ├── report.service.ts
│       │   ├── expense.service.ts
│       │   └── user.service.ts
│       ├── utils/
│       │   ├── errors.ts, upload.ts, grading.ts
│       │   ├── csv.ts                                  ← Batch 17
│       │   └── pdf.ts                                  ← Batch 17
│       ├── scripts/
│       │   ├── bootstrap.ts                            ← Batch 17
│       │   └── seed.ts                                 ← Batch 17
│       └── routes/
│           ├── auth.ts
│           ├── admission.ts
│           ├── notices.ts
│           ├── gallery.ts
│           ├── faq.ts
│           ├── contact.ts
│           ├── payments.ts
│           ├── students.ts
│           ├── teachers.ts
│           ├── attendance.ts
│           ├── exams.ts
│           ├── results.ts
│           ├── reports.ts
│           ├── expenses.ts
│           ├── settings.ts
│           ├── users.ts
│           ├── public.ts                               ← Batch 17
│           └── health.ts                               ← Batch 23
└── (root configs: package.json, vite.config.ts, tailwind.config.ts, etc.)
```

File count: frontend 98 + backend 58 + root/infra 5 (rules ×2, indexes, firebase.json, render.yaml) = 161.

---

## 🔐 ENVIRONMENT VARIABLES

### Frontend (VITE_)
| Name | Purpose |
|---|---|
| VITE_API_BASE_URL | Backend URL |
| VITE_FIREBASE_API_KEY | Firebase web API key |
| VITE_FIREBASE_AUTH_DOMAIN | Firebase auth domain |
| VITE_FIREBASE_PROJECT_ID | Firebase project ID |
| VITE_FIREBASE_STORAGE_BUCKET | Storage bucket |
| VITE_FIREBASE_MESSAGING_SENDER_ID | FCM sender ID |
| VITE_FIREBASE_APP_ID | Firebase web app ID |
| VITE_RECAPTCHA_SITE_KEY | reCAPTCHA v3 site key |
| VITE_SITE_URL | Canonical site URL |

### Backend
| Name | Required | Default | Purpose |
|---|---|---|---|
| NODE_ENV | no | development | Environment |
| PORT | no | 3001 | Server port (Render injects its own `PORT`; do NOT set it in render.yaml) |
| FRONTEND_ORIGIN | no | http://localhost:5173 | CORS origins (comma-sep) |
| FIREBASE_PROJECT_ID | yes | — | Firebase project |
| FIREBASE_STORAGE_BUCKET | yes | — | Storage bucket |
| FIREBASE_SERVICE_ACCOUNT_BASE64 | yes | — | base64(service-account.json) |
| RECAPTCHA_ENFORCE_APP_CHECK | no | false | Require App Check (read directly from `process.env` by `appCheck.ts`) |
| BOOTSTRAP_SUPER_ADMIN_EMAIL | no | — | Auto-promote on first login (also used by `scripts/bootstrap.ts`) |

### Script-only / optional (NOT in `config/env.ts`; read from `process.env` directly) — Batch 17
| Name | Used by | Purpose |
|---|---|---|
| BOOTSTRAP_SUPER_ADMIN_PASSWORD | scripts/bootstrap.ts | Only when the Auth user must be created (≥8 chars). Local shell only — do NOT set on Render |
| PDF_FONT_DIR | utils/pdf.ts | Optional override of the font folder (default `server/assets/fonts`) |

### Test-only — Batch 23 (read by `server/tests/smoke.test.ts`; NOT used by the server)
| Name | Default | Purpose |
|---|---|---|
| SMOKE_BASE_URL | http://localhost:3001 | Target server for the smoke test |
| SMOKE_WITH_DATA | unset | Set to `1` to also run checks that read Firestore (public data + `/api/health/deep`) |

### Render-only — Batch 23 (set in `render.yaml`)
| Name | Value | Purpose |
|---|---|---|
| NODE_VERSION | 20 | Both services (the `--env-file` scripts need Node ≥ 20.6) |

---

## 📊 FIRESTORE COLLECTIONS

| Collection | Purpose | Key Fields |
|---|---|---|
| `sessions` | Academic years | id=year, isActive (seed.ts also writes `year` number, createdAt, updatedAt) |
| `schoolClasses` | Classes Play–10 (doc IDs `play`, `nursery`, `1`…`10`; seeded by seed.ts) | id, nameBn, nameEn, order, createdAt, updatedAt |
| `admissionApplications` | Applications | applicationId, sessionId, student{}, guardian{}, documents{}, status, statusHistory[] |
| `students` | Enrolled students | studentId, classId, sessionId, name, roll?, guardian{name,mobile}, isActive, createdAt, updatedAt |
| `teachers` | Faculty | name, designation, subject, phone, email, isActive, createdAt, updatedAt |
| `attendance` | Daily records (doc ID = `{date}_{studentId}`, upsert) | studentId, date (YYYY-MM-DD), classId, sessionId, status (present/absent/late/leave), note?, markedBy, updatedAt |
| `exams` | Exams (auto doc ID) | name, classId, sessionId, subjects[{name, fullMarks, passMarks, isOptional}], published, publishedAt?, createdBy, createdAt, updatedAt |
| `results` | Marks (doc ID = `{examId}_{studentId}`, upsert) | examId, studentId, classId, sessionId, subjects[{name, fullMarks, marks\|null, percentage, grade, gradePoint, passed, isOptional}], total, fullTotal, percentage, gpa, grade, passed, enteredBy, updatedAt |
| `notices` | Notices | titleBn/En, descriptionBn/En, date, published, important, pdfPath |
| `gallery` | Photos | imagePath, captionBn/En, category, published, order |
| `faq` | Q&A | questionBn/En, answerBn/En, published, order |
| `contactMessages` | Form submissions | name, email, phone, subject, message, status (new/read/replied/archived), note?, createdAt |
| `invoices` | Fee invoices (doc ID = generated invoice ID) | studentId, feeType, amount, paidAmount, status (unpaid/partial/paid/cancelled), dueDate (YYYY-MM-DD), note, createdBy, createdAt, updatedAt |
| `payments` | Payment submissions (doc ID = generated payment ID) | studentId, invoiceId?, provider (bkash/nagad), trxId, senderNumber, amount, status (pending/verified/rejected), screenshotPath?, reviewedBy, reviewedAt, reviewNote, createdAt, updatedAt |
| `expenses` | Expenses (auto doc ID) | category (free string ≤60), amount (2dp), date (YYYY-MM-DD), description, createdBy, createdAt, updatedAt |
| `schoolSettings` | Config (single doc "main") | schoolName, address, phone?, email?, bkashNumber, nagadNumber, etc. (`/api/health/deep` reads this doc) |
| `counters` | Atomic ID counters | {type}_{year} → { value } |
| `auditLogs` | Admin action trail | actorUid, action, targetCollection, targetId, at |
| `users` | Admin users (doc ID = Firebase Auth uid) | uid, email, name, role, isActive (missing = active), lastLoginAt, createdBy?, createdAt?, updatedAt? |

---

## 🔗 API ENDPOINTS

### Public (no auth)
| Method | Path | Status | Rate Limit |
|---|---|---|---|
| GET | `/api/health` | ✅ Batch 23 (liveness, no Firestore) | — |
| GET | `/api/health/deep` | ✅ Batch 23 (one Firestore read; 503 `degraded` on failure) | 10/min |
| POST | `/api/admission/apply` | ✅ | 5/min |
| POST | `/api/admission/status` | ✅ | 10/min |
| GET | `/api/notices/published` | ✅ | — |
| GET | `/api/notices/:id/download` | ✅ | 20/min |
| GET | `/api/gallery/published?category=` | ✅ | — |
| GET | `/api/gallery/categories` | ✅ | — |
| GET | `/api/faq/published` | ✅ | — |
| POST | `/api/contact` | ✅ | 3/min + honeypot |
| POST | `/api/payments/submit` | ✅ | 5/min |
| GET | `/api/results/exams/published` | ✅ | — |
| POST | `/api/results/lookup` | ✅ | 10/min |
| GET | `/api/settings/public` | ✅ Batch 17 (routes/public.ts) | 60/min |

### Auth
| Method | Path | Status |
|---|---|---|
| POST | `/api/auth/verify` | ✅ (bootstrap logic inline) |

### Admin (verifyToken + requireRole)
| Method | Path | Status | Roles |
|---|---|---|---|
| GET | `/api/admission` | ✅ | super/school/admission |
| GET | `/api/admission/:id` | ✅ | super/school/admission |
| PATCH | `/api/admission/:id/status` | ✅ | super/school/admission |
| POST | `/api/admission/:id/approve` | ✅ | super/school/admission |
| GET | `/api/notices` (paginated `{items,total,page,pageSize}`) | ✅ | super/school |
| GET | `/api/notices/:id` | ✅ | super/school |
| POST | `/api/notices` (multipart, field `pdf`) | ✅ | super/school |
| PUT | `/api/notices/:id` (multipart `pdf` replacement) | ✅ | super/school |
| DELETE | `/api/notices/:id` | ✅ | super/school |
| GET | `/api/gallery` (paginated, items carry `imageUrl`) | ✅ | super/school |
| POST | `/api/gallery` (multipart, field `image`) | ✅ | super/school |
| PUT | `/api/gallery/:id` (metadata only, JSON) | ✅ | super/school |
| DELETE | `/api/gallery/:id` | ✅ | super/school |
| GET | `/api/faq` | ✅ | super/school |
| GET | `/api/faq/:id` | ✅ | super/school |
| POST | `/api/faq` | ✅ | super/school |
| PUT | `/api/faq/:id` | ✅ | super/school |
| DELETE | `/api/faq/:id` | ✅ | super/school |
| POST | `/api/faq/reorder` body `{ items:[{id,order}] }` | ✅ | super/school |
| GET | `/api/contact?status=` | ✅ | super/school |
| GET | `/api/contact/:id` | ✅ | super/school |
| PATCH | `/api/contact/:id` body `{ status, note? }` | ✅ | super/school |
| DELETE | `/api/contact/:id` | ✅ | super/school |
| GET | `/api/payments` | ✅ | super/school/accountant |
| GET | `/api/payments/:id` | ✅ | super/school/accountant |
| PATCH | `/api/payments/:id/review` body `{ decision, note? }` | ✅ | super/school/accountant |
| GET | `/api/payments/invoices` | ✅ | super/school/accountant |
| POST | `/api/payments/invoices` | ✅ | super/school/accountant |
| PATCH | `/api/payments/invoices/:id/cancel` | ✅ | super/school/accountant |
| GET | `/api/students` | ✅ | super/school/accountant/teacher/admission |
| GET | `/api/students/:id` | ✅ | super/school/accountant/teacher/admission |
| POST | `/api/students` | ✅ | super/school |
| PUT | `/api/students/:id` | ✅ | super/school |
| DELETE | `/api/students/:id` | ✅ (soft: isActive=false) | super/school |
| GET | `/api/teachers` | ✅ | super/school/teacher |
| GET | `/api/teachers/:id` | ✅ | super/school/teacher |
| POST | `/api/teachers` | ✅ | super/school |
| PUT | `/api/teachers/:id` | ✅ | super/school |
| DELETE | `/api/teachers/:id` | ✅ (hard delete) | super/school |
| GET | `/api/attendance?classId=&date=` | ✅ | super/school/teacher |
| POST | `/api/attendance/mark` | ✅ | super/school/teacher |
| GET | `/api/attendance/student/:studentId?from=&to=` | ✅ | super/school/teacher |
| GET | `/api/exams?classId=&sessionId=&published=` | ✅ | super/school/teacher |
| GET | `/api/exams/:id` | ✅ | super/school/teacher |
| POST | `/api/exams` | ✅ | super/school |
| PUT | `/api/exams/:id` | ✅ | super/school |
| PATCH | `/api/exams/:id/publish` | ✅ | super/school |
| DELETE | `/api/exams/:id` | ✅ | super/school |
| GET | `/api/results/exam/:examId` | ✅ | super/school/teacher |
| PUT | `/api/results/exam/:examId` | ✅ | super/school/teacher |
| GET | `/api/results/exam/:examId/student/:studentId` | ✅ | super/school/teacher |
| DELETE | `/api/results/exam/:examId/student/:studentId` | ✅ | super/school |
| GET | `/api/reports/dashboard` | ✅ Batch 16 | all 5 roles (counts only) |
| GET | `/api/reports/finance?from=&to=` | ✅ Batch 16 | super/school/accountant |
| GET | `/api/reports/admissions?sessionId=` | ✅ Batch 16 | super/school/admission |
| GET | `/api/reports/attendance?from=&to=&classId=` | ✅ Batch 16 | super/school/teacher |
| GET | `/api/expenses?category=&from=&to=&page=&pageSize=` | ✅ Batch 16 | super/school/accountant |
| GET | `/api/expenses/:id` | ✅ Batch 16 | super/school/accountant |
| POST | `/api/expenses` | ✅ Batch 16 | super/school/accountant |
| PUT | `/api/expenses/:id` | ✅ Batch 16 | super/school/accountant |
| DELETE | `/api/expenses/:id` | ✅ Batch 16 (hard) | super/school |
| GET | `/api/settings` | ✅ Batch 16 | super/school |
| PUT | `/api/settings` | ✅ Batch 16 | super/school |
| GET | `/api/users?role=` | ✅ Batch 16 | super |
| GET | `/api/users/:uid` | ✅ Batch 16 | super |
| POST | `/api/users` | ✅ Batch 16 | super |
| PUT | `/api/users/:uid` | ✅ Batch 16 | super |
| DELETE | `/api/users/:uid` | ✅ Batch 16 (hard: Auth + doc) | super |

---

## ✅ COMPLETED FILES (161 of 168)

### Frontend (98 files — Batches 1–9, 18–22) — DONE
Public pages, components, hooks, utils, i18n, layouts, admission flow (Batches 1–9); admin dashboard, login and shared admin components (18); admissions + students (19); teachers + attendance + exams/results (20); notices + gallery + FAQ + contact (21); payments + invoices + expenses + reports + settings + users (22). **All admin pages are built.**

#### Batch 18 (Admin Panel Shared Components)
All Batch 18 components are DEFAULT exports (lazy-import friendly) and use the inline bilingual helper `tr(bn, en)` driven by `useLanguage().isBengali` (no new i18n keys added to `bn.ts`/`en.ts`). Layout classes used: `.card`, `.btn-primary`, `.input-field`, `.label`, `.error-text`, `.section-title`; Tailwind colors `navy`, `royal`, `gold`, `surface`, `ink`.

- **`src/features/admin/AdminDashboard.tsx`** — `useApiGet<{ item: DashboardSummary }>('/api/reports/dashboard', [])`; role-filtered cards and `ActionBar`; status label map for `submitted`, `under_review`, `correction_needed`, `approved`, `rejected`; cold-start banner; retry via `execute()`
- **`src/features/admin/LoginPage.tsx`** — route `/admine/login`; generic error on any failure; redirect to `location.state.from.pathname` ONLY if under `/admine` and not `/admine/login`, else `/admine`
- **`src/features/admin/common/AdminHeader.tsx`** — sticky `h-14`, hamburger `aria-controls="admin-sidebar"`, logo, lang toggle, user label, logout
- **`src/features/admin/common/AdminSidebar.tsx`** — `<aside id="admin-sidebar">`, `fixed bottom-0 left-0 top-14 z-40 w-64`; drawer below `lg`, always-visible from `lg`; role-filtered groups
- **`src/features/admin/common/StatCard.tsx`** — tones `navy|royal|gold|alert`; preformatted `value`; optional `to` makes whole card a `Link`
- **`src/features/admin/common/ChartCard.tsx`** — frame-only (no chart lib) for reports
- **`src/features/admin/common/ActionBar.tsx`** — primary = `.btn-primary` Link, others = outlined Link

#### Batch 19 (Admin Panel — Admissions + Students)

All Batch 19 files are DEFAULT exports, bilingual via inline `tr(bn, en)` with `useLanguage().isBengali`. No new i18n keys. All list pages use `useSearchParams` for shareable filter/page state and `useApiGet<T>` for data loading. All mutating pages/modals use `useApi<T>(method)`; errors surface as `{ error: string }` from the backend.

**`src/features/admin/admissions/AdmissionsListPage.tsx`**
- Reads filters from URL: `status`, `search`, `page` (default page 1); `PAGE_SIZE = 20`
- Status filter pills: `''` (all), `submitted`, `under_review`, `correction_needed`, `approved`, `rejected`
- Search field submits via `search` query param (prefix search on applicationId/name/mobile — backend decides)
- Fetches `GET /api/admission?${qs}` → `{ items, total, page, pageSize }`
- Date/status pills: color-coded (`STATUS_PILL`), bilingual labels (`STATUS_LABEL`), unknown statuses fall back to humanized string
- Pagination with Previous/Next; cold-start banner when `isWaking`; retry on error
- Row links to `/admine/admissions/:id` ("View")
- Formats: numbers via `toLocaleString('bn-BD'|'en-US')`; dates via `toLocaleDateString`
- Timestamps supported: ISO string OR Firestore `{ _seconds }` object

**`src/features/admin/admissions/AdmissionDetailPage.tsx`**
- `GET /api/admission/:id` tolerates both `{ item }` and raw object shapes
- Three info cards: Student information, Guardian information, Documents (lists keys in `documents`, shows "Open" link only when `url` is present)
- Role gate: `canReview = role in {super_admin, school_admin, admission_officer}`; action card hidden when `status === 'approved'`
- Actions (writes via `useApi('PATCH')` → `/api/admission/:id/status`):
  - "Approve" → opens `ApproveModal`
  - "Mark under review" → status `under_review` (no note required)
  - "Request correction" → status `correction_needed` (note REQUIRED, enforced client-side)
  - "Reject" → status `rejected` (note REQUIRED, enforced client-side)
- Status pill, status history timeline (reads `statusHistory[]`), submitted/sessionId fields
- Back link → `/admine/admissions`

**`src/features/admin/admissions/ApproveModal.tsx`**
- Props: `{ application: { id, applicationId, studentName, classApplyingFor?, sessionId }, onClose, onApproved(studentId) }`
- POSTs to `/api/admission/:id/approve` with `{ note? }`; expects any of `{ studentId }`, `{ item: { studentId } }`, `{ item: { id } }`; if absent, calls `onApproved('')` (caller still refreshes list)
- On success: `AdmissionDetailPage` navigates to `/admine/students/:studentId` (or just refreshes if empty)
- Backdrop click closes; "Approving…" state while loading

**`src/features/admin/students/StudentsListPage.tsx`**
- URL filters: `classId`, `isActive` (`''|'true'|'false'`), `search`, `page`; `PAGE_SIZE = 25`
- Role gate for create/import: `canWrite = role in {super_admin, school_admin}`
- Attempts `GET /api/classes` → `{ items } | ClassOption[]`; falls back silently to a hard-coded `FALLBACK_CLASSES` list (`play`, `nursery`, `1`…`10`) if the endpoint is missing or empty — this is the ONLY classes source the admin UI uses
- Fetches `GET /api/students?${qs}` → `{ items, total, page, pageSize }`
- Table columns: Student ID (mono), Name, Class (localized via classes), Roll, Guardian (name + mobile), Status pill (active/inactive), Action → `/admine/students/:id`
- Buttons: "Import" → opens `ImportStudentsModal`; "New student" → opens `StudentFormModal` (create)
- On successful save or import, `execute()` refreshes the list

**`src/features/admin/students/StudentDetailPage.tsx`**
- `GET /api/students/:id` tolerant to `{ item }` or raw object
- Reuses same classes-loading fallback as list page
- Role gate for Edit + Deactivate buttons: `canWrite = role in {super_admin, school_admin}`
- Deactivate: `DELETE /api/students/:id` (backend performs soft delete, `isActive=false`); shows confirmation modal
- "Edit" opens `StudentFormModal` in edit mode (passes current record)
- Right column: Record (created/updated) + Quick links to attendance, invoices, payments (deep-link via `?studentId=<studentId>`; Batch 22 invoices + payments pages honor it)

**`src/features/admin/students/StudentFormModal.tsx`**
- Props: `{ mode: 'create' | 'edit', classes, student?, onClose, onSaved }`
- Create → `POST /api/students`; Edit → `PUT /api/students/:id`
- Fields: name (required, ≤100), classId (required, from classes), roll (optional, 1–999 integer), guardian {name (required), mobile (required, BD mobile), relation, nid, email, address}
- Mobile validation: accepts `01XXXXXXXXX`, `+8801XXXXXXXXX`, `8801XXXXXXXXX`; email validation when non-empty
- Payload: `{ name, classId, roll?, guardian: { name, mobile, relation?, address?, nid?, email? } }` (empty optional strings omitted)
- Scrollable modal; backdrop click closes; shows the `studentId` label when editing; surfaces backend `{ error }` on failure

**`src/features/admin/students/ImportStudentsModal.tsx`**
- Pure-client CSV importer (no backend `/import` endpoint — iterates `POST /api/students` per row)
- CSV constraints: UTF-8 (strips BOM); max file size 1 MB; max rows `MAX_ROWS = 200`; required headers: `name, classId, guardianName, guardianMobile`; optional: `roll, guardianRelation, guardianAddress, guardianNid, guardianEmail`; unknown columns rejected
- Minimal RFC 4180-ish CSV parser (quotes, escaped `""`, CRLF/CR/LF, trailing-empty-row trim); same mobile/email validators as the form modal
- Per-row validation builds a skippable `RowError[]` list (shown but import proceeds with valid rows); invalid `classId` (not in the classes prop) also skipped
- Import loop is sequential; shows live progress `done/total`; summary at the end lists created/failed counts; failed rows show their backend error
- `onFinished()` is called on close ONLY when `summary.created > 0` (otherwise `onClose()`); user cannot close while importing

#### Batch 20 (Admin — Teachers, Attendance, Exams & Results)

All Batch 20 files are DEFAULT exports, bilingual via inline `tr(bn, en)` with `useLanguage().isBengali`. No new i18n keys. URL-synced filters where applicable (`useSearchParams`); tolerant response unwrap (`data?.item ?? data`); Firestore timestamp tolerance via local `toDate(value)` where needed.

**`src/features/admin/teachers/TeachersListPage.tsx`**
- `GET /api/teachers?isActive=true|false` → `{ items }`
- Client-side filtering on name/designation/subject/phone/email via `search` input
- Role gate for create/edit/delete: `canWrite = role in {super_admin, school_admin}`
- Rows show: Name, Designation, Subject, Contact (phone + email), Status pill (Active/Inactive), Action column (edit/delete) — hidden for non-writers
- Delete uses `DELETE /api/teachers/:id` (hard delete per Batch 14 backend) with confirmation modal; refreshes list on success
- Create → opens `TeacherFormModal` (mode='create'); Edit → opens `TeacherFormModal` (mode='edit') with existing record
- Cold-start banner on `isWaking`; retry on error via `execute()`

**`src/features/admin/teachers/TeacherFormModal.tsx`**
- Props: `{ mode: 'create' | 'edit', teacher?, onClose, onSaved }`
- Create → `POST /api/teachers`; Edit → `PUT /api/teachers/:id`
- Fields: name (required, ≤100), designation (≤60), subject (≤60), phone (BD mobile validated when non-empty), email (validated when non-empty), isActive checkbox
- Payload omits empty optional strings; always includes `name` + `isActive`
- Same modal shell as Batch 19 (backdrop click close, ✕ button, `card`, action row with cancel + submit)

**`src/features/admin/attendance/AttendancePage.tsx`**
- URL state: `classId`, `date` (default = today in BD time via `todayBdString()`); `date` input has `max=todayBdString()` (no future)
- Loads `/api/classes` with silent fallback to the same `FALLBACK_CLASSES` list used by Batch 19
- Students fetched via `GET /api/students?classId=X&isActive=true&page=1&pageSize=300` (per-class rosters capped at 300; sorted client-side by numeric roll then studentId)
- Existing attendance pre-filled via `GET /api/attendance?classId=&date=` → `{ items: [{ studentId, status, note? }] }`; students without a prior record default to `present`
- Draft kept in local state `{ [studentId]: { status, note } }`; mark-all buttons for each of the four statuses; per-row status buttons (`present | absent | late | leave`); per-row optional note input (≤120 chars)
- Save → `POST /api/attendance/mark` with `{ classId, date, records: [{ studentId, status, note? }] }` (max 300 per Batch 15 backend); empty notes stripped
- Live summary pill row shows counts per status
- Cold-start banner aggregates `isWaking` from classes/students/attendance queries
- NOTE: any logged-in teacher/school/super user can access any class (no teacher↔class assignment, per Batch 15 known issue)

**`src/features/admin/exams/ExamsListPage.tsx`**
- URL filters: `classId`, `published` (`''|'true'|'false'`)
- `GET /api/exams?classId=&published=` → `{ items: ExamRecord[] }`
- Columns: Name, Class (localized via classes), Session, Subjects (count), Status pill (Published/Draft), Action: `Marks` link → `/admine/exams/:id/results` (all read-role users), plus `Edit`, `Publish/Unpublish`, `Delete` (writers only)
- Role gate for create/edit/delete/publish: `canWrite = role in {super_admin, school_admin}`
- Delete: `DELETE /api/exams/:id`; backend blocks when results exist — the modal copy warns about this
- Opens `ExamFormModal` for create/edit; `ResultsPublishModal` for publish/unpublish toggle; refreshes list after any mutation
- Uses the same `FALLBACK_CLASSES` fallback as other admin pages

**`src/features/admin/exams/ExamFormModal.tsx`**
- Props: `{ mode: 'create' | 'edit', classes, exam?, onClose, onSaved }`
- Create → `POST /api/exams` with `{ name, classId, subjects }`; Edit → `PUT /api/exams/:id` with `{ name, subjects }` (classId NOT re-sent — Class dropdown disabled in edit mode because Batch 15 backend locks the schema once results exist)
- Subjects editor: name (≤60, unique case-insensitive), fullMarks (1–1000), passMarks (0–fullMarks, blank → backend defaults to ceil(33% × fullMarks)), isOptional checkbox; add/remove rows (min 1)
- Validation: at least one compulsory subject, no duplicate names, numeric ranges
- Session is NOT entered — backend defaults to `getActiveSessionId()` on create; unchanged on edit

**`src/features/admin/exams/ResultsEntryPage.tsx`**
- Route `/admine/exams/:examId/results`
- `GET /api/results/exam/:examId` → `{ exam, items }`; `items[i].subjects[j]` = `{ name, marks: number|null }` plus computed fields the UI ignores while editing
- Roster: `GET /api/students?classId=<exam.classId>&isActive=true&page=1&pageSize=300`; pre-fills draft from existing results per studentId×subject (null → empty string = absent)
- Grid: columns per exam subject showing `/fullMarks` + "opt" marker; per-cell `<input type="number" min=0 max=fullMarks step=0.01>`; blank = absent
- Validation (client): each non-blank cell 0 ≤ n ≤ fullMarks, else error with student name + subject name
- Save → `PUT /api/results/exam/:examId` with `{ entries: [{ studentId, marks: { [subject]: number|null } }] }` (max 300); re-fetches results on success for freshly computed totals/grades
- Public results stay in sync (edit after publish allowed)

**`src/features/admin/exams/ResultsPublishModal.tsx`**
- Props: `{ exam: { id, name, classId, sessionId, published? }, onClose, onDone }`
- `PATCH /api/exams/:id/publish` body `{ published: !exam.published }`
- Shows exam summary; publish copy warns that ≥1 result must exist (backend enforces); unpublish copy warns results will immediately disappear from the public page
- Publish uses `.btn-primary`; unpublish uses a red destructive button

#### Batch 21 (Admin — Notices, Gallery, FAQ, Contact)

All Batch 21 files are DEFAULT exports (modals also export their item type as a named `type` export), inline bilingual `tr(bn, en)`, same modal shell as Batches 19–20 (backdrop click closes unless saving, `aria-modal`, ✕ button, `.card`, cancel + `.btn-primary`/red destructive). Named imports are used for hooks/api: `import { useApi, useApiGet } from '../../../hooks/useApi'`, `import { useLanguage } from '../../../hooks/useLanguage'`, `import { api } from '../../../lib/api'`.

**`src/features/admin/notices/NoticesListPage.tsx`**
- URL filters: `published` (''|true|false), `important` (''|true|false), `page` (pageSize 20); changing a non-page filter resets page
- `GET /api/notices?page=&pageSize=&published=&important=` → `{ items, total, page, pageSize }`
- Table: title (BN/EN, ★ for important), date (local `toDate`), status pill, PDF "View" (calls public `GET /api/notices/:id/download` → `{ url }` → opens new tab), Edit, Delete
- Delete: `DELETE /api/notices/:id` with confirm modal (warns PDF is also removed)
- Opens `NoticeFormModal`; cold-start banner; retry card

**`src/features/admin/notices/NoticeFormModal.tsx`**
- Exports default component + `NoticeItem` type `{ id, titleBn, titleEn, descriptionBn?, descriptionEn?, date?, published, important, pdfPath? }`
- Props: `{ mode: 'create'|'edit', notice?, onClose, onSaved }`
- Fields: titleBn/titleEn (required ≤200), descriptionBn/En (≤3000), date (YYYY-MM-DD, default today BD), PDF (optional, application/pdf, ≤3 MB), published, important
- Create → `api.uploadFile('/api/notices', FormData)` (fields as strings; file field `pdf`; booleans sent as `'true'|'false'`)
- Edit without new file → `PUT /api/notices/:id` JSON (real booleans); edit WITH new file → `api.uploadFile('/api/notices/:id', FormData, { method: 'PUT' })` (see Known Issues)

**`src/features/admin/gallery/GalleryListPage.tsx`**
- URL filters: `category`, `published`, `page` (pageSize 24)
- `GET /api/gallery?page=&pageSize=&category=&published=` → `{ items, total, page, pageSize }` (items have signed `imageUrl`)
- Category options = union of `GET /api/gallery/categories` (tolerates raw array or `{items}`; public/published-only; silent if fails) and categories seen on current page
- Responsive card grid (image, caption, category chip, status pill, order); Edit → `GalleryUploadModal` (edit); Delete → `DELETE /api/gallery/:id` confirm modal

**`src/features/admin/gallery/GalleryUploadModal.tsx`**
- Exports default + `GalleryItem` type `{ id, imagePath?, imageUrl?, captionBn?, captionEn?, category, published, order? }`
- Props: `{ mode, item?, categories, onClose, onSaved }`
- Create → `api.uploadFile('/api/gallery', FormData)` with file field `image` (JPG/PNG/WebP, ≤3 MB), captionBn/En (≤200), category (required ≤60, datalist suggestions), order (integer ≥0), published; live preview via object URL (revoked on change/unmount)
- Edit → metadata only `PUT /api/gallery/:id` JSON `{ captionBn, captionEn, category, published, order }`; image cannot be replaced (delete + re-upload)

**`src/features/admin/faq/FAQListPage.tsx`**
- `GET /api/faq` (tolerates raw array or `{ items }`), sorted by `order`
- Up/Down arrows → `POST /api/faq/reorder { items: [{ id, order }] }` with the WHOLE list renumbered 1..n; arrows disabled while a reorder is in flight
- Edit/Delete (`DELETE /api/faq/:id`, confirm modal); opens `FAQFormModal` with `defaultOrder` = max order + 1

**`src/features/admin/faq/FAQFormModal.tsx`**
- Exports default + `FAQItem` type `{ id, questionBn, questionEn, answerBn, answerEn, published, order? }`
- Props: `{ mode, faq?, defaultOrder?, onClose, onSaved }`
- Create `POST /api/faq`; edit `PUT /api/faq/:id`; payload `{ questionBn, questionEn, answerBn, answerEn, published, order }`
- Validation: all four texts required (questions ≤300, answers ≤3000), order integer ≥0

**`src/features/admin/contact/ContactMessagesPage.tsx`**
- URL filters: `status` (''|new|read|replied|archived pills), `page` (pageSize 20)
- `GET /api/contact?page=&pageSize=&status=` → `{ items, total?, ... }` (total falls back to `items.length` if absent)
- Master/detail layout: list (unread = bold) + side panel (on mobile the panel replaces the list)
- Opening a `new` message silently `PATCH /api/contact/:id { status: 'read' }` then refetches
- Panel: name, email (mailto), phone (tel), received time, message body, status select, internal note (≤1000) → `PATCH /api/contact/:id { status, note }`; delete with inline "Sure?" confirm → `DELETE /api/contact/:id`
- Closes panel automatically if the selected message leaves the current page

#### Batch 22 (Admin — Payments, Invoices, Expenses, Reports, Settings, Users)

All Batch 22 files are DEFAULT exports, inline bilingual `tr(bn, en)`, same modal shell/list conventions as Batches 19–21, named hook imports (`useApi`, `useApiGet`, `useAuth`, `useLanguage` from `../../../hooks/*`). Small modals that have a single consumer (payment review, invoice create, expense form) live INSIDE their page file to keep the 7-file plan; `UserFormModal` is a separate file because it exports `ROLES`/`UserItem`.

**`src/features/admin/payments/PaymentsListPage.tsx`**
- URL filters: `status` (pill row: all/pending/verified/rejected), `provider` (''|bkash|nagad), `studentId` (text + Apply/Clear, uppercased; honors the deep link from StudentDetailPage), `page` (pageSize 20)
- `GET /api/payments?page=&pageSize=&status=&provider=&studentId=` → `{ items, total, page, pageSize }`; item fields used: `id, studentId, invoiceId?, provider, trxId, senderNumber?, amount, status, screenshotUrl?, reviewNote?, reviewedAt?, createdAt`
- Table: submitted time, student ID, provider/TrxID, amount (৳), invoice ID, status pill (+ review note), actions (screenshot link, **Review** for `pending` rows; reviewed rows show reviewedAt)
- Inline `ReviewModal`: details + screenshot preview; Verify/Reject toggle; note ≤500 (REQUIRED for reject, client-side only); `PATCH /api/payments/:id/review { decision: 'verified'|'rejected', note? }`; copy explains verify adds amount to the linked invoice

**`src/features/admin/payments/InvoicesListPage.tsx`**
- URL filters: `status` (all/unpaid/partial/paid/cancelled), `studentId` (Apply/Clear; honors deep link), `page` (pageSize 20)
- `GET /api/payments/invoices?page=&pageSize=&status=&studentId=` → `{ items, total, page, pageSize }`; fields: `id, studentId, feeType, amount, paidAmount, status, dueDate?, note?`
- Table: invoice ID, student, fee type (+note), amount, paid, due, status pill, **Cancel** (shown only when status ≠ cancelled and paidAmount = 0)
- Inline `CreateInvoiceModal`: `POST /api/payments/invoices { studentId (uppercased, /^TLFS-STU-\d{4}-\d{4}$/i), feeType (≤60, free text), amount (>0, ≤100,000,000, ≤2dp), dueDate (YYYY-MM-DD, default today BD), note? (≤300) }`; prefilled with the `studentId` filter
- Cancel confirm modal: `PATCH /api/payments/invoices/:id/cancel` with body `{}`

**`src/features/admin/expenses/ExpensesListPage.tsx`**
- URL filters: `category`, `from`, `to`, `page` (pageSize 20); text/date filters apply via an Apply button (client validates date format and from ≤ to)
- `GET /api/expenses?page=&pageSize=&category=&from=&to=` → `{ items, total, page, pageSize }`; fields: `id, category, amount, date, description?`
- Table + "total on this page" footer; category datalist built from categories on the current page
- Inline `ExpenseFormModal` (create `POST /api/expenses`, edit `PUT /api/expenses/:id`) body `{ category (≤60), amount (0.01–100,000,000, ≤2dp), date (YYYY-MM-DD), description (REQUIRED in UI, ≤500) }`
- Delete: `DELETE /api/expenses/:id`, visible only when `role in {super_admin, school_admin}` (matches backend); accountant can create/edit

**`src/features/admin/reports/ReportsPage.tsx`**
- Role-based tabs: **Finance** (super/school/accountant), **Admissions** (super/school/admission_officer), **Attendance** (super/school/teacher); first allowed tab is default; role-less/other users see an info card
- Finance: range (default = current BD month → today; ≤ 366 days) → `GET /api/reports/finance?from=&to=` → `{ item }`; StatCards collected / expenses / net / outstanding (outstanding is NOT range-limited), monthly bars, tables by provider and by category, `truncated` banner, client-side CSV export
- Admissions: optional `sessionId` → `GET /api/reports/admissions[?sessionId=]`; renders `total`/`count` StatCard plus ONE table per array/object field of `item` (generic breakdown; skips `truncated, sessionId, from, to`); CSV export
- Attendance: range (default current month; ≤ 92 days) + class select (`FALLBACK_CLASSES` copy) → `GET /api/reports/attendance?from=&to=&classId=`; reads per-day array from `item.days ?? daily ?? byDay ?? items`; StatCards overall rate/present/absent/late+leave; per-day table; CSV export
- Uses `StatCard`/`ChartCard` from `../common/*`; parsing is deliberately TOLERANT (numbers may be plain or `{ total }`; breakdowns may be arrays or maps); CSV is built client-side (UTF-8 BOM, formula-injection guard) — `csv.ts`/`pdf.ts` on the server remain unused

**`src/features/admin/settings/SettingsPage.tsx`**
- `GET /api/settings` (tolerates `{ item }` or raw) → form of EXACTLY six fields: `schoolName` (required ≤150), `address` (≤300), `phone` (loose phone pattern), `email`, `bkashNumber`, `nagadNumber` (BD mobile when non-empty)
- Sends ONLY changed fields: `PUT /api/settings` → `{ success, item }`; re-syncs from the returned item (or refetches); Save disabled when nothing changed; warning copy about public bKash/Nagad numbers
- Unknown settings keys are left untouched (never sent) because the backend body is strict

**`src/features/admin/users/UsersListPage.tsx`**
- `GET /api/users[?role=]` (tolerates raw array or `{ items }`); role filter (URL `role`), client-side search on name/email
- Table: name (+ "You" badge), email, role pill, status pill (`isActive !== false` = active), last login (`toDate`), Edit, Delete
- "Self" detected by comparing `useAuth().user.email` with the row email (case-insensitive); self row has no Delete and the modal locks role/status
- Delete: `DELETE /api/users/:uid` (hard: Auth + doc) with confirm; copy points to Inactive as the softer option

**`src/features/admin/users/UserFormModal.tsx`**
- Exports default + `ROLES` (`super_admin, school_admin, accountant, teacher, admission_officer`), `UserRole`, `UserItem { uid, email, name?, role, isActive?, lastLoginAt? }`
- Props: `{ mode, user?, isSelf?, onClose, onSaved }`
- Create → `POST /api/users { email (lowercased), password (8–128), name (≤100), role }`; Edit → `PUT /api/users/:uid { name, role, isActive }` (email read-only; no password field — no reset endpoint in v1)
- Notes shown: changing role/deactivating signs the user out; password reset via Firebase console

### Backend (58 files — Batches 10–17, 23) + Infra (5 files — Batch 23)

#### Batch 10 (Foundation)
- `server/package.json`, `server/tsconfig.json`
- `server/src/index.ts` — Express app, CORS, helmet, health check (inline — to be REPLACED by `routes/health.ts`), global error handler
- `server/src/config/firebase.ts` — Admin SDK init from base64 env var
- `server/src/config/env.ts` — Zod env validation
- `server/src/middleware/auth.ts` — verifyToken, requireRole, optionalAuth
- `server/src/middleware/rateLimit.ts` — In-memory rate limiter

#### Batch 11 (Schemas & Core Services)
- `server/src/schemas/common.schema.ts` — bdPhone, nid, isoDate, pagination, IDs, contactForm, lookups
- `server/src/schemas/admission.schema.ts` — admissionApply, list, update, approve schemas
- `server/src/schemas/payment.schema.ts` — paymentSubmit, verify, list, createInvoice, createExpense
- `server/src/middleware/validate.ts` — Zod validation middleware
- `server/src/services/counter.service.ts` — Atomic counters, generateId() for admission/student/invoice/payment
- `server/src/services/storage.service.ts` — uploadFile, getSignedUrl, deleteFile
- `server/src/services/admission.service.ts` — createApplication, lookupStatus, listApplications, updateStatus

#### Batch 12 (Auth & Admission Routes)
- `server/src/utils/errors.ts` — HttpError + factories (badRequest, notFound, etc.)
- `server/src/utils/upload.ts` — Multer memory storage; 3MB; MIME filter; getFile() helper
- `server/src/services/audit.service.ts` — logAudit() (never throws); queryAuditLogs()
- `server/src/services/session.service.ts` — getActiveSessionId() with 5min cache; setActiveSession()
- `server/src/services/settings.service.ts` — getSettings/getPublicSettings/updateSettings/ensureDefaultSettings
- `server/src/routes/auth.ts` — POST /verify (bootstrap super_admin inline)
- `server/src/routes/admission.ts` — POST /apply, POST /status, GET /, GET /:id, PATCH /:id/status, POST /:id/approve

#### Batch 13 (Notices, Gallery, FAQ, Contact)
- `server/src/services/notice.service.ts` — list/get published, admin CRUD, PDF cleanup on delete
- `server/src/services/gallery.service.ts` — published list w/ signed URLs (60min), categories, admin CRUD, image cleanup
- `server/src/services/faq.service.ts` — published list ordered by `order`, CRUD, batch reorder
- `server/src/routes/notices.ts` — Public GET /published + GET /:id/download; Admin CRUD w/ multer `pdf`
- `server/src/routes/gallery.ts` — Public GET /published, GET /categories; Admin CRUD w/ multer `image`
- `server/src/routes/faq.ts` — Public GET /published returns RAW ARRAY (frontend expects); Admin CRUD + POST /reorder
- `server/src/routes/contact.ts` — Public POST (3/min + honeypot `website` → silent 200); Admin list/get/patch/delete

#### Batch 14 (Payments, Students, Teachers)
- `server/src/services/student.service.ts` — doc ID = studentId; list/search/create/update/soft-delete
- `server/src/services/invoice.service.ts` — status compute (unpaid/partial/paid), CRUD, cancel
- `server/src/services/payment.service.ts` — submit (multi-factor check vs guardian mobile; generic 404 on mismatch; duplicate trxId check), list (signed URLs), review (txn: on verify, bumps invoice.paidAmount + recomputes status)
- `server/src/routes/payments.ts` — Public POST /submit (multipart); Admin invoices + payments CRUD/review; `/invoices/:id/cancel` BEFORE `/:id`
- `server/src/routes/students.ts` — Admin CRUD (soft delete), roles per Admin API table
- `server/src/routes/teachers.ts` — Admin CRUD (hard delete), roles per Admin API table

#### Batch 15 (Attendance, Exams, Results)
- `server/src/utils/grading.ts` — DEFAULT_GRADE_SCALE (BD 5.00), DEFAULT_PASS_PERCENT=33, OPTIONAL_BASE_POINT=2; `computeResult` with absent-null handling, optional-subject math, failed-compulsory → F/0.00
- `server/src/services/attendance.service.ts` — doc ID = `{date}_{studentId}` upsert; validates all students belong to active class roster; chunked batch (400); summary pct = (present+late)/total
- `server/src/services/exam.service.ts` — CRUD, subjects locked once any result exists; publishing requires ≥1 result; literal `'results'` string avoids circular import
- `server/src/services/result.service.ts` — all-or-nothing save (subject keys match exam, 0 ≤ marks ≤ fullMarks, null = absent), joins studentName/roll on list; `lookupPublishedResult` requires published exam + class match + guardian mobile match (normalized), generic 404 on any mismatch
- `server/src/routes/attendance.ts` — router-level auth, max 300 records/mark, no future dates (BD), max 366 day range for student history
- `server/src/routes/exams.ts` — CRUD + publish; passMarks default = ceil(33% fullMarks); sessionId default = `getActiveSessionId()`
- `server/src/routes/results.ts` — Public GET /exams/published + POST /lookup (10/min, generic 404); Staff GET/PUT /exam/:examId; delete super/school

#### Batch 16 (Reports, Expenses, Settings, Users)
- `server/src/services/report.service.ts` — on-read aggregations with caps (5000/20000) + `truncated` flag; `MAX_FINANCE_DAYS=366`, `MAX_ATTENDANCE_DAYS=92`; BD day boundaries (UTC+6); default range = current BD month
  - `getDashboardSummary()` — counts only (safe for all roles)
  - `getFinanceReport(from, to)` — `collected` by `payments.reviewedAt` where status='verified'; `expenses` by date; `outstanding` = CURRENT unpaid/partial invoices (not date-limited); monthly bucket + byProvider/byCategory
  - `getAdmissionsReport(sessionId?)` — grouped by whatever `status` strings exist
  - `getAttendanceReport({from, to, classId?})` — per-day totals + pct
- `server/src/services/expense.service.ts` — CRUD, list ordered by date desc, offset pagination + count()
- `server/src/services/user.service.ts` — Firestore doc keyed by Auth uid; mirrors custom claim `role`; create/update syncs Auth displayName/disabled; revokes refresh tokens on role change / deactivation; prevents self-demotion/deactivation; prevents removing the last active super_admin; delete removes Auth user + doc
- `server/src/routes/reports.ts` — all responses `{ item }`; per-route role gates
- `server/src/routes/expenses.ts` — amount 0.01–100,000,000 (2dp), strict bodies, delete super/school only
- `server/src/routes/settings.ts` — super/school, GET/PUT `{ item }`; strict partial body; public settings in Batch 17
- `server/src/routes/users.ts` — router-level super_admin; password only on create (≥8); no reset endpoint v1

#### Batch 17 (Export, Bootstrap, Public Routes, App Check)
- `server/src/utils/csv.ts` — `CSV_BOM='\uFEFF'`, `CsvColumn<T>`, `escapeCsvCell`, `toCsv`, `sendCsv`; CRLF; CSV-injection guard (allows plain numbers, phone-like `+8801…`); `sendCsv` sets `text/csv; charset=utf-8` + attachment w/ sanitized name + RFC 5987 `filename*` + `Cache-Control: no-store`. NO consumers yet.
- `server/src/utils/pdf.ts` — `MAX_PDF_ROWS=5000`, `PdfColumn`, `TablePdfOptions`, `buildTablePdf`, `sendPdf`; embeds Hind Siliguri from `server/assets/fonts/`; A4 table report, navy header, zebra rows, gold rule, footer `school • BD date-time • page/total`. Requires `pdfkit` (not yet in `server/package.json`). NO consumers yet.
- `server/src/scripts/bootstrap.ts` — CLI; existing Auth user → re-enabled + role claim set + refresh tokens revoked; missing user → created from `BOOTSTRAP_SUPER_ADMIN_PASSWORD` (≥8); upserts `users/{uid}`; calls `ensureDefaultSettings()`; audit `bootstrap.super_admin`. Inline `/auth/verify` bootstrap unchanged — both coexist.
- `server/src/scripts/seed.ts` — CLI; creates missing `schoolClasses` (`play`, `nursery`, `1`…`10`) with order and bilingual names; if no active session, creates/activates `--session` (default current BD year); never overwrites existing docs or switches an active session.
- `server/src/routes/public.ts` — public router (no auth); `GET /public` rateLimit 60/min → `{ item }`; `Cache-Control: public, max-age=300`; MUST be mounted on `/api/settings` BEFORE the admin settings router.
- `server/src/middleware/appCheck.ts` — `APP_CHECK_HEADER='X-Firebase-AppCheck'`, `APP_CHECK_PROTECTED_PATHS` (apply, admission status, contact, payments submit, results lookup); when `RECAPTCHA_ENFORCE_APP_CHECK==='true'` → missing/invalid → 401 bilingual; verifies with `getAppCheck().verifyToken()`; never logs the token.
- `server/src/middleware/errorHandler.ts` — `notFoundHandler` + `errorHandler`; ZodError → 400 + `details`; `HttpError` → its `statusCode|status`; multer/body-parser mapped; CORS → 403; 5xx logged with minimal fields; `debug` field only outside production. Replaces inline handler in `index.ts`.

#### Batch 23 (Firebase Rules, Deployment, Tests) — JUST ADDED

**`firestore.rules`** — `rules_version = '2'`; single catch-all `match /{document=**}` with `allow read, write: if false`. The Admin SDK (backend) bypasses rules, so nothing breaks; any direct client SDK access is denied.

**`storage.rules`** — same deny-all for `/b/{bucket}/o/{allPaths=**}`. Signed URLs generated by the Admin SDK (`getSignedUrl`) are unaffected by rules.

**`firestore.indexes.json`** — 34 composite indexes (`queryScope: COLLECTION`), `fieldOverrides: []`. JSON has no comment line. By collection:
- `notices`: (published, date↓), (important, date↓), (published, important, date↓)
- `gallery`: (published, order), (published, category, order), (category, order)
- `faq`: (published, order)
- `contactMessages`: (status, createdAt↓)
- `admissionApplications`: (status, createdAt↓), (sessionId, createdAt↓), (sessionId, status, createdAt↓)
- `invoices`: (studentId, createdAt↓), (status, createdAt↓), (studentId, status, createdAt↓)
- `payments`: every status/provider/studentId combination each followed by createdAt↓ (7 indexes), plus (status, reviewedAt) for the finance report and (provider, trxId) for the duplicate check
- `students`: (classId|sessionId|isActive combinations — 7 indexes) each ending in studentId↑
- `teachers`: (isActive, name)
- `attendance`: (studentId, date), (classId, date)
- `expenses`: (category, date↓)
- Sort directions for notices (`date`↓), gallery (`order`↑) and the admin lists (`createdAt`↓) are ASSUMED from earlier batches; if a query still fails, Firestore's error contains a one-click link that creates the exact index (then copy it into this file).
- NOT included: `auditLogs` (no route queries it yet), `users`/`teachers`/`exams`/`results` extras (sorted in memory or equality-only).

**`firebase.json`** — `{ firestore: { rules, indexes }, storage: { rules } }`. No hosting/functions/emulators (frontend and backend are on Render).

**`render.yaml`** — Blueprint with two services:
- `tlfs-api` (`type: web`, `runtime: node`, `plan: free`, `rootDir: server`): build `npm ci --include=dev && npm run build`, start `npm start`, `healthCheckPath: /api/health`, `autoDeploy: true`. Literal env: `NODE_VERSION=20`, `NODE_ENV=production`, `RECAPTCHA_ENFORCE_APP_CHECK=false`. `sync: false` (entered in dashboard): `FRONTEND_ORIGIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, `BOOTSTRAP_SUPER_ADMIN_EMAIL`. `PORT` deliberately NOT set (Render injects it).
- `tlfs-web` (`type: web`, `runtime: static`): build `npm ci --include=dev && npm run build`, publish `dist`; `NODE_VERSION=20`; all nine `VITE_*` keys are `sync: false`; SPA rewrite `/*` → `/index.html`; headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, immutable 1-year cache on `/assets/*`.
- `--include=dev` is required because `NODE_ENV=production` otherwise makes `npm ci` skip `typescript`/`vite`.

**`server/tests/smoke.test.ts`** — black-box test using `node:test` + `node:assert/strict` + global `fetch` against a RUNNING server (`SMOKE_BASE_URL`, default `http://localhost:3001`); does not import app code.
- `before`: polls `/api/health` for up to 80 s (Render cold start), else throws with instructions
- `health`: 200 `{ status:'ok', uptime:number, time:string }`; `Cache-Control` contains `no-store`; `x-content-type-options: nosniff`; no `x-powered-by`
- unknown route: `/api/definitely-not-a-route` → 404 `{ error }`
- 16 admin GET paths without a token → 401 `{ error }`; malformed bearer token → 401
- validation without Firestore: `POST /api/contact {}` → 400 and `POST /api/results/lookup {}` → 400
- gated by `SMOKE_WITH_DATA=1`: `/api/health/deep` 200, `/api/settings/public` has `item`, notices/gallery/results public lists have `items[]`, `/api/faq/published` is a RAW ARRAY
- Run: `cd server && npm run test:smoke` (script: `node --import tsx --test tests/smoke.test.ts`)

**`server/src/routes/health.ts`** — default-export router mounted at `/api/health`
- `GET /` → `{ status:'ok', uptime (s, rounded), time (ISO) }`; `Cache-Control: no-store`; NO Firestore, NO secrets; used by Render
- `GET /deep` → `rateLimit({ windowMs: 60_000, max: 10 })`; reads `schoolSettings/main` with a 3 s timeout; 200 `{ status:'ok', checks:{ firestore:'ok' } }` or 503 `{ status:'degraded', checks:{ firestore:'unavailable' } }`; failure details are never returned
- Imports: `db` from `../config/firebase`, `rateLimit` (named) from `../middleware/rateLimit`

**`server/package.json` additions (NOT a generated file — manual merge; Batch 10 file not regenerated):**
```json
{
  "engines": { "node": ">=20.6" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "bootstrap": "tsx --env-file=.env src/scripts/bootstrap.ts",
    "seed": "tsx --env-file=.env src/scripts/seed.ts",
    "test:smoke": "node --import tsx --test tests/smoke.test.ts"
  }
}
```
Add `build`/`start` only if missing. Dependencies: `cd server && npm install pdfkit && npm install -D @types/pdfkit tsx`.

---

## 🔗 CROSS-FILE DEPENDENCIES

### Frontend admin
```
Batch 18
AdminDashboard.tsx
├── hooks/useAuth (user, role)
├── hooks/useLanguage (isBengali)
├── hooks/useApi (useApiGet)
├── features/admin/common/StatCard
├── features/admin/common/ChartCard
└── features/admin/common/ActionBar

LoginPage.tsx
├── react-router-dom (useNavigate, useLocation)
├── hooks/useAuth (user, isAdmin, isLoading, login, logout)
└── hooks/useLanguage (isBengali, setLocale)

common/AdminHeader.tsx  → react-router-dom (useNavigate), hooks/useAuth, hooks/useLanguage
common/AdminSidebar.tsx → react-router-dom (NavLink), hooks/useAuth (role), hooks/useLanguage
common/StatCard.tsx     → react-router-dom (Link)
common/ChartCard.tsx    → react only
common/ActionBar.tsx    → react-router-dom (Link)

AdminLayout.tsx (existing, Batches 1–9 — NOT regenerated) must:
├── own sidebarOpen state
├── render <AdminHeader onMenuClick menuOpen /> and <AdminSidebar open onClose />
└── add lg:pl-64 to the main content column

Batch 19
admissions/AdmissionsListPage.tsx
├── react-router-dom (Link, useSearchParams)
├── hooks/useLanguage, hooks/useApi (useApiGet)
└── GET /api/admission?status=&search=&page=&pageSize=

admissions/AdmissionDetailPage.tsx
├── react-router-dom (Link, useNavigate, useParams)
├── hooks/useLanguage, hooks/useAuth, hooks/useApi (useApiGet + useApi('PATCH'))
├── admissions/ApproveModal
├── GET /api/admission/:id (tolerates { item } or raw)
└── PATCH /api/admission/:id/status

admissions/ApproveModal.tsx
├── hooks/useLanguage, hooks/useApi (useApi('POST'))
└── POST /api/admission/:id/approve

students/StudentsListPage.tsx
├── react-router-dom (Link, useSearchParams)
├── hooks/useLanguage, hooks/useAuth, hooks/useApi (useApiGet)
├── students/StudentFormModal, students/ImportStudentsModal
├── GET /api/classes (optional; falls back silently)
└── GET /api/students?classId=&isActive=&search=&page=&pageSize=

students/StudentDetailPage.tsx
├── react-router-dom (Link, useParams)
├── hooks/useLanguage, hooks/useAuth, hooks/useApi (useApiGet + useApi('DELETE'))
├── students/StudentFormModal
├── GET /api/students/:id, GET /api/classes (optional)
└── DELETE /api/students/:id (soft)

students/StudentFormModal.tsx
├── hooks/useLanguage, hooks/useApi (useApi('POST') + useApi('PUT'))
├── POST /api/students
└── PUT /api/students/:id

students/ImportStudentsModal.tsx
├── hooks/useLanguage, hooks/useApi (useApi('POST') — one call per row)
└── POST /api/students (iterated sequentially)

Batch 20
teachers/TeachersListPage.tsx
├── hooks/useLanguage, hooks/useAuth, hooks/useApi (useApiGet + useApi('DELETE'))
├── teachers/TeacherFormModal
├── GET /api/teachers?isActive=
└── DELETE /api/teachers/:id

teachers/TeacherFormModal.tsx
├── hooks/useLanguage, hooks/useApi (useApi('POST') + useApi('PUT'))
├── POST /api/teachers
└── PUT /api/teachers/:id

attendance/AttendancePage.tsx
├── react-router-dom (useSearchParams)
├── hooks/useLanguage, hooks/useApi (useApiGet + useApi('POST'))
├── GET /api/classes (optional, silent fallback)
├── GET /api/students?classId=&isActive=true&page=1&pageSize=300
├── GET /api/attendance?classId=&date=
└── POST /api/attendance/mark

exams/ExamsListPage.tsx
├── react-router-dom (Link, useSearchParams)
├── hooks/useLanguage, hooks/useAuth, hooks/useApi (useApiGet + useApi('DELETE'))
├── exams/ExamFormModal, exams/ResultsPublishModal
├── GET /api/classes (optional, silent fallback)
├── GET /api/exams?classId=&published=
└── DELETE /api/exams/:id

exams/ExamFormModal.tsx
├── hooks/useLanguage, hooks/useApi (useApi('POST') + useApi('PUT'))
├── POST /api/exams
└── PUT /api/exams/:id

exams/ResultsEntryPage.tsx
├── react-router-dom (Link, useParams)
├── hooks/useLanguage, hooks/useApi (useApiGet + useApi('PUT'))
├── GET /api/results/exam/:examId
├── GET /api/students?classId=&isActive=true&page=1&pageSize=300
└── PUT /api/results/exam/:examId

exams/ResultsPublishModal.tsx
├── hooks/useLanguage, hooks/useApi (useApi('PATCH'))
└── PATCH /api/exams/:id/publish

Batch 21
notices/NoticesListPage.tsx
├── react-router-dom (useSearchParams)
├── hooks/useLanguage, hooks/useApi (useApiGet + useApi('DELETE') + useApi('GET'))
├── notices/NoticeFormModal (default + type NoticeItem)
├── GET /api/notices?page=&pageSize=&published=&important=
├── GET /api/notices/:id/download   (public endpoint, returns { url })
└── DELETE /api/notices/:id

notices/NoticeFormModal.tsx
├── lib/api (api.uploadFile), hooks/useLanguage, hooks/useApi (useApi('PUT'))
├── POST /api/notices (multipart)
└── PUT /api/notices/:id (JSON, or multipart when replacing the PDF)

gallery/GalleryListPage.tsx
├── react-router-dom (useSearchParams)
├── hooks/useLanguage, hooks/useApi (useApiGet x2 + useApi('DELETE'))
├── gallery/GalleryUploadModal (default + type GalleryItem)
├── GET /api/gallery?page=&pageSize=&category=&published=
├── GET /api/gallery/categories
└── DELETE /api/gallery/:id

gallery/GalleryUploadModal.tsx
├── lib/api (api.uploadFile), hooks/useLanguage, hooks/useApi (useApi('PUT'))
├── POST /api/gallery (multipart, field `image`)
└── PUT /api/gallery/:id (JSON metadata)

faq/FAQListPage.tsx
├── hooks/useLanguage, hooks/useApi (useApiGet + useApi('POST') + useApi('DELETE'))
├── faq/FAQFormModal (default + type FAQItem)
├── GET /api/faq
├── POST /api/faq/reorder
└── DELETE /api/faq/:id

faq/FAQFormModal.tsx
├── hooks/useLanguage, hooks/useApi (useApi('POST') + useApi('PUT'))
├── POST /api/faq
└── PUT /api/faq/:id

contact/ContactMessagesPage.tsx
├── react-router-dom (useSearchParams)
├── hooks/useLanguage, hooks/useApi (useApiGet + useApi('PATCH') + useApi('DELETE'))
├── GET /api/contact?page=&pageSize=&status=
├── PATCH /api/contact/:id
└── DELETE /api/contact/:id

Batch 22
payments/PaymentsListPage.tsx
├── react-router-dom (useSearchParams)
├── hooks/useLanguage, hooks/useApi (useApiGet + useApi('PATCH') inside inline ReviewModal)
├── GET /api/payments?page=&pageSize=&status=&provider=&studentId=
└── PATCH /api/payments/:id/review

payments/InvoicesListPage.tsx
├── react-router-dom (useSearchParams)
├── hooks/useLanguage, hooks/useApi (useApiGet + useApi('PATCH') cancel + useApi('POST') inside inline CreateInvoiceModal)
├── GET /api/payments/invoices?page=&pageSize=&status=&studentId=
├── POST /api/payments/invoices
└── PATCH /api/payments/invoices/:id/cancel

expenses/ExpensesListPage.tsx
├── react-router-dom (useSearchParams)
├── hooks/useLanguage, hooks/useAuth (role), hooks/useApi (useApiGet + useApi('DELETE') + POST/PUT inside inline ExpenseFormModal)
├── GET /api/expenses?page=&pageSize=&category=&from=&to=
├── POST /api/expenses, PUT /api/expenses/:id
└── DELETE /api/expenses/:id

reports/ReportsPage.tsx
├── hooks/useLanguage, hooks/useAuth (role, isLoading), hooks/useApi (useApiGet)
├── features/admin/common/StatCard, features/admin/common/ChartCard
├── GET /api/reports/finance?from=&to=
├── GET /api/reports/admissions[?sessionId=]
└── GET /api/reports/attendance?from=&to=[&classId=]

settings/SettingsPage.tsx
├── hooks/useLanguage, hooks/useApi (useApiGet + useApi('PUT'))
├── GET /api/settings
└── PUT /api/settings

users/UsersListPage.tsx
├── react-router-dom (useSearchParams)
├── hooks/useLanguage, hooks/useAuth (user.email), hooks/useApi (useApiGet + useApi('DELETE'))
├── users/UserFormModal (default + ROLES + type UserItem)
├── GET /api/users[?role=]
└── DELETE /api/users/:uid

users/UserFormModal.tsx
├── hooks/useLanguage, hooks/useApi (useApi('POST') + useApi('PUT'))
├── POST /api/users
└── PUT /api/users/:uid
```

### Backend
```
index.ts
├── config/env.ts
├── config/firebase.ts
├── middleware/rateLimit.ts
├── middleware/appCheck.ts (Batch 17 — to be wired)
├── middleware/errorHandler.ts (Batch 17 — to be wired)
├── routes/health.ts (Batch 23 — to be wired; replaces inline health check)
└── all routers incl. routes/public.ts (to be wired — see CRITICAL block)

ALL ROUTES depend on:
├── middleware/auth.ts (verifyToken, requireRole)
├── services/audit.service.ts (logAudit)
├── utils/errors.ts (badRequest, notFound)
└── config/firebase.ts (db, FieldValue, Timestamp; auth for user.service)

routes/admission.ts, routes/notices.ts, routes/gallery.ts
├── utils/upload.ts (upload, getFile)
└── services/storage.service.ts (uploadFile, getSignedUrl, deleteFile)

routes/admission.ts
├── services/counter.service.ts (generateId)
└── services/session.service.ts (getActiveSessionId)

routes/contact.ts
└── schemas/common.schema.ts (contactFormSchema with honeypot)

routes/payments.ts
├── middleware/rateLimit.ts, utils/upload.ts
├── services/payment.service.ts
│     ├── services/invoice.service.ts
│     ├── services/student.service.ts
│     ├── services/counter.service.ts, services/storage.service.ts
└── services/invoice.service.ts
      ├── services/student.service.ts
      └── services/counter.service.ts

routes/students.ts
├── services/student.service.ts (→ counter.service.ts)
└── services/session.service.ts

routes/teachers.ts
└── services/teacher.service.ts

routes/attendance.ts
├── services/attendance.service.ts (reads students collection directly)
└── services/session.service.ts

routes/exams.ts
├── services/exam.service.ts (reads results collection by literal name)
└── services/session.service.ts

routes/results.ts
├── middleware/rateLimit.ts
├── services/exam.service.ts
└── services/result.service.ts
      ├── utils/grading.ts
      ├── services/exam.service.ts
      └── services/student.service.ts

routes/reports.ts
└── services/report.service.ts
      ├── services/session.service.ts (getActiveSessionId)
      └── reads collections directly (students, teachers, admissionApplications,
          payments, invoices, contactMessages, expenses, attendance)

routes/expenses.ts
├── services/expense.service.ts
└── services/report.service.ts (isValidIsoDate only)

routes/settings.ts
└── services/settings.service.ts (getSettings, updateSettings)

routes/users.ts
└── services/user.service.ts (→ config/firebase auth)

routes/public.ts (Batch 17)
├── middleware/rateLimit.ts
└── services/settings.service.ts (getPublicSettings)

routes/health.ts (Batch 23)
├── express (Router)
├── config/firebase.ts (db — /deep only)
└── middleware/rateLimit.ts (/deep only)

middleware/appCheck.ts (Batch 17)
├── firebase-admin/app-check
└── config/firebase.ts (side-effect init)

middleware/errorHandler.ts (Batch 17)
├── zod (ZodError)
└── utils/errors.ts (HttpError)

utils/csv.ts (Batch 17) — no internal deps (express types only)
utils/pdf.ts (Batch 17) — pdfkit, fs/path, server/assets/fonts

scripts/bootstrap.ts (Batch 17) — standalone process
├── config/firebase.ts (auth, db, FieldValue)
├── services/settings.service.ts (ensureDefaultSettings)
└── services/audit.service.ts (logAudit)

scripts/seed.ts (Batch 17) — standalone process
├── config/firebase.ts (db, FieldValue)
└── services/report.service.ts (todayBd)

tests/smoke.test.ts (Batch 23) — standalone; imports NOTHING from src/ (node:test, node:assert, global fetch)
└── talks HTTP to a running server (SMOKE_BASE_URL)
```

### Infra (Batch 23)
```
firebase.json ──► firestore.rules, firestore.indexes.json, storage.rules
render.yaml
├── tlfs-api ──► server/ (npm run build → dist/, npm start), GET /api/health
└── tlfs-web ──► repo root (npm run build → dist/), env VITE_*
```

**⚠️ CRITICAL:** `server/src/index.ts` STILL has all route imports COMMENTED OUT. All routers now exist (including `routes/health.ts`), so it must be wired. Remove the old inline `/api/health` handler from Batch 10 (duplicate paths — first registered wins) and the old inline global error handler:

```typescript
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import admissionRoutes from './routes/admission';
import noticesRoutes from './routes/notices';
import galleryRoutes from './routes/gallery';
import faqRoutes from './routes/faq';
import contactRoutes from './routes/contact';
import paymentsRoutes from './routes/payments';
import studentsRoutes from './routes/students';
import teachersRoutes from './routes/teachers';
import attendanceRoutes from './routes/attendance';
import examsRoutes from './routes/exams';
import resultsRoutes from './routes/results';
import reportsRoutes from './routes/reports';
import expensesRoutes from './routes/expenses';
import settingsRoutes from './routes/settings';
import usersRoutes from './routes/users';
import publicRoutes from './routes/public';
import { verifyAppCheck, APP_CHECK_PROTECTED_PATHS, APP_CHECK_HEADER } from './middleware/appCheck';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// CORS: add APP_CHECK_HEADER ('X-Firebase-AppCheck') to `allowedHeaders`
// (alongside Content-Type, Authorization) or browsers will block the header.

// Mount AFTER helmet / cors / express.json(), BEFORE everything below.
// Render's health check sends no Origin header, so CORS does not interfere.
app.use('/api/health', healthRoutes);

// App Check on public POST endpoints — BEFORE the routers
app.post(APP_CHECK_PROTECTED_PATHS, verifyAppCheck);

app.use('/api/auth', authRoutes);
app.use('/api/admission', admissionRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/settings', publicRoutes);     // MUST come BEFORE the admin settings router
app.use('/api/settings', settingsRoutes);   // admin router applies verifyToken to every path
app.use('/api/users', usersRoutes);

// LAST: remove the old inline global error handler, then
app.use('/api', notFoundHandler);
app.use(errorHandler);
```

---

## ⏳ REMAINING BATCHES (24 → 24)

### Batch 24 — Docs & Finalization
1. `README.md`
2. `docs/DEPLOYMENT.md`
3. `docs/API.md`
4. `docs/ADMIN_GUIDE.md`
5. `docs/BACKUP.md`
6. `.github/workflows/ci.yml`
7. `CHANGELOG.md`

---

## 🧩 KEY INTERFACE CONTRACTS (Frontend ↔ Backend)

### Frontend API Client (`src/lib/api.ts`)
- `api.get<T>(path)`, `api.post`, `api.put`, `api.patch`, `api.delete`
- `api.uploadFile(path, formData)` — multipart (Batch 21 additionally calls it with a 3rd arg `{ method: 'PUT' }` for notice PDF replacement — see Known Issues)
- Auto-attaches Firebase ID token
- Cold-start retry on 502/503/504 → throws `ServerWakingError`

### Frontend Hooks
- `useAuth()` → `{ user, role, isAdmin, isLoading, login, logout, hasPermission }`
- `useApi<T>(method, path?)` → `{ data, isLoading, isWaking, error, execute(path?, body?) }` — path & body can be passed at call time; `execute` returns the parsed response and rejects on failure (Batches 19–22 depend on this)
- `useApiGet<T>(path, deps)` → auto-fetch on mount, same return shape; `''` path = "do not fetch yet"; `execute()` with no args refetches
- `useLanguage()` → `{ locale, setLocale, t, isBengali }`

### Admin shared component contracts (Batches 18–22)
- `StatCard { label; value: string | null; hint?; to?; tone?: 'navy'|'royal'|'gold'|'alert'; isLoading? }`
- `ChartCard { title; subtitle?; isLoading?; isEmpty?; emptyText?; children }`
- `ActionBar { title?; actions: { label; to; variant?: 'primary' }[] }`
- `AdminHeader { onMenuClick; menuOpen? }`, `AdminSidebar { open; onClose }`
- Inline bilingual pattern: `const tr = (bn: string, en: string) => (isBengali ? bn : en);`
- Modal shell: `fixed inset-0 z-50 bg-black/50 p-4` (+ `overflow-y-auto` for tall forms), click backdrop to close (ignored while saving), `role="dialog" aria-modal`, ✕ button, `.card` body (max-w-md / xl / 2xl / 3xl), action row with `rounded border border-navy/30` cancel + `.btn-primary` submit (red `bg-red-600` for delete/unpublish/cancel-invoice)
- Filter URL pattern: all list filters mirrored in `useSearchParams`; changing any non-page filter resets `page`
- List page pattern: cold-start banner on `isWaking`, retry card on `error && !isLoading`, `actionError` line for mutations, pagination Prev/Next with `page / totalPages`
- Status pills: `rounded-full px-2 py-0.5 text-xs` with green (published/ok/verified/paid), gray (draft/hidden/cancelled), royal tint (new/partial), yellow (archived/warn/pending/unpaid), red-100 (rejected)
- Classes source: hard-coded `FALLBACK_CLASSES` ids `play, nursery, 1..10`; `/api/classes` is tried but optional; copy (not import) in any page that needs a class picker (ReportsPage has its own copy with Bengali numerals)
- BD-time helper: `todayBdString()` = `new Date(Date.now()+6*3600*1000).toISOString().slice(0,10)` (defined locally in files that need it)
- Timestamp tolerance: local `toDate(v)` handling ISO string, number, `{_seconds}`/`{seconds}`
- Pre-fill editor pattern (Batch 20): fetch roster + existing records in parallel, merge into `Record<id, draft>`
- Page layout convention: `space-y-4/6` outer, header row with `section-title` + action buttons, `.card` panels, `overflow-x-auto` tables
- Client-side CSV pattern (Batch 22 ReportsPage): `Blob` with `\uFEFF` BOM, CRLF, quoted cells, formula-injection guard (prefix `'` for cells starting `= + - @` unless numeric)

### Response Shapes (Frontend expectations)
- `GET /api/health` → `{ status:'ok', uptime, time }`; `GET /api/health/deep` → `{ status:'ok'|'degraded', checks:{ firestore } }` (503 when degraded)
- `GET /api/notices/published` → `{ items: NoticeRecord[] }`
- `GET /api/faq/published` → `FAQRecord[]` (RAW ARRAY)
- `GET /api/gallery/published` → `{ items: GalleryRecord[] }` (each item has `imageUrl` signed URL)
- `POST /api/admission/apply` → `{ applicationId }`
- `POST /api/admission/status` → `{ status, correctionNote, studentNameBn, studentNameEn, classApplyingFor, submittedAt }` OR 404 generic
- `POST /api/contact` → `{ success: true }` (always 200/201 even on honeypot trigger)
- `POST /api/payments/submit` → 201 `{ success: true, paymentId }` OR 404 generic OR 400 duplicate trxId
- `GET /api/results/exams/published` → `{ items: [{ id, name, classId, sessionId }] }`
- `POST /api/results/lookup` → full result OR 404 generic
- Admin list endpoints (admissions, payments, invoices, students, expenses, notices, gallery) → `{ items, total, page, pageSize }`
- Teachers/exams/attendance lists → `{ items }`; users list → `{ items }` (Batch 22 tolerates a raw array too)
- Admin FAQ list `GET /api/faq` — tolerates raw array OR `{ items }`
- Admin contact list `GET /api/contact` — expects `{ items }` (total/page optional)
- `GET /api/results/exam/:examId` → `{ exam, items }`; `GET /api/attendance?classId=&date=` → `{ items }`; `GET /api/attendance/student/:id` → `{ items, summary }`
- Admin create/update (exams, expenses, users, students, teachers, notices, gallery, faq, invoices) → `{ success: true, ... }`; marks/attendance saves → `{ success: true, saved }`; deletes → `{ success: true }`
- Batch 16: `GET /api/reports/{dashboard|finance|admissions|attendance}` → `{ item }`; `GET/PUT /api/settings` → `{ item }` / `{ success, item }`; `GET /api/users/:uid` → `{ item }`; `GET /api/expenses/:id` → `{ item }`
- Batch 17: `GET /api/settings/public` → `{ item }`
- Batch 19 expectation of `POST /api/admission/:id/approve`: ANY of `{ studentId }`, `{ item: { studentId } }`, `{ item: { id } }`; if none, the frontend simply refreshes the list without navigating
- Batch 19 expectation of `GET /api/admission/:id` and `GET /api/students/:id`: either `{ item }` or the raw record — the UI handles both
- Batch 20: results entry page expects `{ exam, items }` exactly (not wrapped in `item`)
- Batch 22: `GET /api/payments` items carry `screenshotUrl` (signed); `PATCH /api/payments/:id/review` body `{ decision, note? }`; `PUT /api/settings` body = only changed keys among `schoolName, address, phone, email, bkashNumber, nagadNumber`
- **Errors (Batch 17):** every error response is `{ error: string }` (bilingual); validation errors also carry `details: [{ path, message }]`; App Check rejection (when enforced) is 401 `{ error: 'অ্যাপ যাচাই ব্যর্থ হয়েছে / App verification failed' }`

### Design Tokens
- Colors: navy #102A43, royal #1D4ED8, gold #D6AD60, surface #F5F7FB, ink #172B4D
- Fonts: Hind Siliguri (Bengali), Inter (English)
- Classes: `.btn-primary`, `.card`, `.input-field`, `.label`, `.error-text`, `.section-title`, `.container-page`

### Backend Middleware Chain Patterns
```
Public GET:    [rateLimit?] → [validate(query)] → handler
Public POST:   [appCheck — central, via index.ts] → rateLimit → validate(body) → handler
Public upload: [appCheck] → rateLimit → upload.fields([...]) → manual validate → handler
Admin GET:     verifyToken → requireRole(...) → [validate(query)] → handler
Admin POST/PUT: verifyToken → requireRole(...) → [upload] → validate(body) → handler
```
Batch 14–17 and 23 routes use per-file local Zod schemas parsed inside handlers via `parse(schema, data)` (throws `badRequest`) wrapped by a local `ah()` async-error helper, instead of `validate` middleware. Async errors flow to `errorHandler` via `next(err)`.

---

## ⚠️ KNOWN ISSUES / TODOS

- **`server/src/index.ts` route imports commented out** — all routers now exist; wire per the CRITICAL block above (health first, public-before-settings mount order, App Check, errorHandler, CORS header; remove the old inline health + error handlers). Not changed in Batches 18–23. Until this is done the server serves NOTHING under `/api` and the smoke test fails.
- **All admin pages now exist** — register ALL admin routes in `App.tsx` (lazy, default import; see Manual Steps 12–15). The sidebar links must match these paths, otherwise they 404 inside the admin shell.
- **Rate limiter in-memory** — single instance only; fine for Render free. Smoke test note: re-running `test:smoke` within a minute can hit `contact` (3/min) or `/api/health/deep` (10/min) limits → 429.
- **App Check is built but not enforced by default** — needs (a) wiring in index.ts, (b) `X-Firebase-AppCheck` in CORS `allowedHeaders`, (c) the frontend to SEND the header: verify `src/lib/api.ts` attaches an App Check token (from `lib/firebase/appCheck.ts`) and that `AdmissionForm.tsx` (direct `fetch`) does too, BEFORE setting `RECAPTCHA_ENFORCE_APP_CHECK=true` — otherwise public forms will 401. The smoke test's two validation checks expect 400, so they ALSO fail (401) if enforcement is on — run them against a server with `RECAPTCHA_ENFORCE_APP_CHECK=false`.
- **Bootstrap**: `scripts/bootstrap.ts` delivered; inline bootstrap in `auth.ts` remains (both coexist)
- **`server/package.json` still needs a MANUAL merge** (Batch 10 file, not regenerated): `pdfkit`, `@types/pdfkit`, `tsx`; scripts `bootstrap`, `seed`, `test:smoke` (exact JSON in the Batch 23 section); `build`/`start` ONLY if missing — `render.yaml` assumes `npm run build` emits `dist/index.js` and `npm start` runs it (`node dist/index.js`). VERIFY against the real Batch 10 `package.json` and `tsconfig.json` (`outDir: dist`, `rootDir: src`), or change `render.yaml`'s `startCommand`.
- **`server/package-lock.json` and the root `package-lock.json` must be committed** — `npm ci` in `render.yaml` fails without them.
- **Smoke test is not part of CI by default** — the server needs real Firebase credentials to boot (`config/firebase.ts` reads the service account at import). Batch 24's `ci.yml` should run typecheck/build only (frontend `npm run build`, server `npm run build`), not `test:smoke`, unless a secret-backed job is added deliberately.
- **`tests/` is outside `src/`** — keep it excluded from the server `tsc` build (fine if `tsconfig.json` has `"include": ["src"]`); `tsx` runs it directly. `fetch`/`AbortSignal.timeout` types need `@types/node` ≥ 18/20.
- **Firestore indexes** — `firestore.indexes.json` is delivered (34 indexes). Deploy with `firebase deploy --only firestore:indexes` (indexes take minutes to build; queries fail with "index required" until ready). Sort directions for admin lists are assumptions (see Batch 23 section). `auditLogs` queries are NOT indexed (no route uses them yet).
- **Rules deploy** — `firebase deploy --only firestore:rules,storage` (needs `firebase-tools`, `firebase login`, `firebase use <projectId>`). Storage rules require the default bucket to be initialized in the console first.
- **Render free tier** — the API sleeps after inactivity (cold start up to ~50 s; the frontend's `ServerWakingError` retry + the smoke test's 80 s wake loop cover this); the Render health check only hits `/api/health` (no Firestore). A deep readiness check exists at `/api/health/deep` but is NOT used by Render.
- **First Render deploy order**: (1) apply the Blueprint, fill `sync: false` values; (2) once `tlfs-api` has a URL, set `VITE_API_BASE_URL` on `tlfs-web`; (3) once `tlfs-web` has a URL, set `FRONTEND_ORIGIN` (and `VITE_SITE_URL`) — `VITE_*` values are baked in at BUILD time, so `tlfs-web` must be re-deployed after changing them.
- **Font file is a MANUAL asset**: download Hind Siliguri Regular (+ Bold) TTFs from Google Fonts into `server/assets/fonts/` and commit them (PDF export throws until present). `pdfkit` default text shaping is relied on for Bengali conjuncts — verify one real Bengali PDF visually on first use. Note: the Render build (`rootDir: server`) includes `server/assets`, but `dist/` is where code runs — `PDF_FONT_DIR` may be needed if the default path resolves relative to `dist/`.
- **`pdfkit` import style**: `utils/pdf.ts` uses `import PDFDocument from 'pdfkit'` → requires `esModuleInterop` (or `allowSyntheticDefaultImports`) in `server/tsconfig.json`; verify on first compile
- **csv.ts / pdf.ts have NO consumers** — no export endpoints exist; Batch 22 ReportsPage exports CSV client-side instead. PDF export is not available anywhere in the UI (locked decision "PDFs: embed Bengali font" is satisfied only by the unused util). Document as v2 in Batch 24 (README/CHANGELOG) unless the user wants `?format=pdf` routes.
- **`GET /api/settings/public` shape** `{ item }` is a guess (frontend spec never listed it); adjust `routes/public.ts` (one line) if the frontend already expects a raw object
- **Firestore `count()`** used extensively — requires Firebase Admin SDK v11+
- **AdmissionForm.tsx uses direct fetch** for multipart (not api.ts) — works but inconsistent
- **Privacy page** marked DRAFT
- **Assumed signatures (VERIFY on first compile — fix affected batches only):**
  - `rateLimit({ windowMs, max })` object form, named export (payments.ts, results.ts, public.ts, **health.ts**)
  - `uploadFile(path, buffer, contentType)` and `getSignedUrl(path, expiresMinutes)` returning a string (payment.service.ts)
  - `generateId('student' | 'invoice' | 'payment')` returning `Promise<string>`
  - `logAudit({ actorUid, action, targetCollection, targetId })` object form (also used by bootstrap.ts)
  - `requireRole(...roles)` variadic returning a RequestHandler; authenticated user available as `req.user!.uid`
  - `badRequest(message)` / `notFound(message)` take a message string; routes use `throw badRequest(...)`
  - `getActiveSessionId()` returns `Promise<string>`
  - Student docs use doc ID = `studentId` (service falls back to field query), `guardian.mobile` for guardian mobile; `StudentRecord` exposes `classId`, `name`, optional `roll`, `guardian.mobile`; `getStudentById` / `findStudentByStudentId` return `Promise<StudentRecord | null>`
  - `config/firebase.ts` exports `auth` (Admin `getAuth()` instance) in addition to `db`, `FieldValue`, `Timestamp`; `db.batch()` available; **`db` is a named export usable in `health.ts`**
  - Custom claim name is `role`; `auth.ts` / `/auth/verify` reads the role from that claim (or the `users` doc) using the five role strings
  - `getSettings()` returns the settings object; `updateSettings(updates)` accepts a partial; route re-reads with `getSettings()`
  - Settings fields `phone`/`email` are guesses — align with `settings.service.ts` defaults
  - `payments.reviewedAt` is a Firestore `Timestamp` written with `serverTimestamp()` by `reviewPayment` (finance range queries depend on this)
  - Admission application docs have `sessionId` + `status` fields
  - `getPublicSettings()` returns `Promise<object>`; `ensureDefaultSettings()` takes no arguments
  - `HttpError` is a NAMED export class of `utils/errors.ts` exposing `statusCode` or `status` plus `message`
  - `todayBd()` returns `'YYYY-MM-DD'` in BD time (seed.ts uses `.slice(0,4)` for year)
  - `firebase-admin` v11+ (for `firebase-admin/app-check`, `firebase-admin/auth`)
  - `config/env.ts` validation does not reject the scripts' environment (scripts load `.env` via `node --env-file`, not `dotenv`)
  - **Batch 23 backend/test (fix Batch 23 files only):** `verifyToken` returns 401 + `{ error }` for a missing OR malformed bearer token WITHOUT needing network access (malformed JWTs fail locally in `verifyIdToken`); admin GET `/api/notices`, `/api/gallery`, `/api/faq`, `/api/contact` are guarded (public routes are only `/published`, `/categories`, `/:id/download`, POST `/`); `helmet()` is active (provides `x-content-type-options` and removes `x-powered-by`); `notFoundHandler` returns JSON `{ error }` with 404 for unknown `/api/*` paths; `POST /api/contact {}` and `POST /api/results/lookup {}` fail validation (400) before any Firestore access; the `schoolSettings/main` doc may or may not exist — `/deep` only checks that the read succeeds, not that the doc exists.
  - **Batch 18 frontend (fix Batch 18 files only):** `useApiGet<T>(path, deps)` returns `{ data, isLoading, isWaking, error, execute }`; `useAuth()` exposes `user.{displayName,email}`, `role`, `isAdmin`, `isLoading`, `login(email, password): Promise<void>` (throws on failure), `logout(): Promise<void>`; `isAdmin` true only after role loads (LoginPage redirects on it); `useLanguage()` exposes `setLocale('bn'|'en')` + `isBengali`; Tailwind theme defines `navy|royal|gold|surface|ink`; red uses the default palette; `.card` must NOT set its own border-left (StatCard adds `border-l-4`); `AdminLayout.tsx` guards `/admine/*` and redirects unauthenticated users to `/admine/login` with `state={{ from: location }}`; `App.tsx` exposes `/admine/login` and all admin routes under `/admine`.
  - **Batch 19 frontend (fix Batch 19 files only):** `useApi<T>(method)` callable WITHOUT a path at construction; `execute(path, body)` accepts both at call time and returns the parsed response (if it returns void, read `data` after `await execute(...)`); `/api/classes` does NOT exist (fallback list used; a real endpoint must return `{ items: ClassOption[] }` with `id, nameBn, nameEn, order?`); `POST /api/students` accepts `{ name, classId, roll?, guardian: { name, mobile, relation?, address?, nid?, email? } }` and `PUT` the same partial (sessionId defaulted server-side); `PATCH /api/admission/:id/status` body `{ status, note? }` with status ∈ submitted | under_review | correction_needed | approved | rejected; CSV import creates students one by one (add a delay if rate limiting throttles).
  - **Batch 20 frontend (fix Batch 20 files only):** `useApiGet` treats `''` path as "do not fetch" (if it fires a request instead, add conditional guards in the callers); `PUT /api/exams/:id` accepts `{ name?, subjects? }` without classId; `POST /api/attendance/mark` derives `sessionId` server-side; `PUT /api/results/exam/:examId` accepts `{ entries }` (max 300) and the page sends every roster student (blank rows = absent → null = fail rule); `/api/students?pageSize=300` per-class roster (truncates >300 silently); `/api/attendance?classId=&date=` returns `{ items }`; `.input-field` is applied to select/date/number/checkbox/textarea (add scoped overrides if ugly); modals assume `z-50`, `fixed inset-0`, `overflow-y-auto` and `.card` padding/background work globally.
  - **Batch 21 frontend (fix Batch 21 files only):**
    - **Hooks and api are NAMED exports**: `import { useApi, useApiGet } from '../../../hooks/useApi'`, `import { useLanguage } from '../../../hooks/useLanguage'`, `import { api } from '../../../lib/api'`. If any is a default export, change the import lines (one line per file).
    - **`api.uploadFile(path, formData, { method: 'PUT' })`** — the 3rd options argument is an ASSUMPTION. If `uploadFile` is POST-only, replacing a notice PDF on edit will hit a non-existent POST route (404). Fixes (pick one): extend `uploadFile` in `src/lib/api.ts` to accept `{ method }`, OR make `NoticeFormModal` delete+recreate for PDF replacement, OR add a `POST /api/notices/:id/pdf` route. Creating notices and gallery items (POST) is unaffected; editing a notice WITHOUT a new PDF uses plain JSON PUT.
    - **Multipart booleans/numbers are sent as strings** (`'true'`, `'false'`, `'3'`). Backend notice/gallery create handlers must coerce them (e.g., `z.coerce` / string-to-boolean preprocess). If the Batch 13 route schemas expect real booleans, they will reject multipart posts — fix by adding coercion in `routes/notices.ts` / `routes/gallery.ts`.
    - **Notice PUT JSON** sends `{ titleBn, titleEn, descriptionBn, descriptionEn, date, published, important }`; empty descriptions are sent as `''` (not omitted).
    - **Gallery list category filter** relies on `GET /api/gallery?category=`; **contact list** relies on `GET /api/contact?status=&page=&pageSize=` (pagination params may be ignored by the Batch 13 route; the UI then shows one page and hides pagination only if `total <= 20`).
    - `useApi(...).execute` is assumed to THROW on HTTP errors (all Batch 21–22 mutations use try/catch around `await execute(...)`).
    - Notice `date` is assumed to be stored as a `YYYY-MM-DD` string; timestamp objects are tolerated.
    - `line-clamp-*` and `aspect-[4/3]` Tailwind utilities are used (built into Tailwind ≥3.3; add `@tailwindcss/line-clamp` for older versions).
  - **Batch 22 frontend (VERIFY on first compile; fix Batch 22 files only):**
    - `useAuth` is a NAMED export from `hooks/useAuth` and `role` may be `null`/`undefined` until loaded (ReportsPage and ExpensesListPage tolerate this); `useAuth().user.email` exists (UsersListPage self-detection).
    - `StatCard` / `ChartCard` are DEFAULT exports of `features/admin/common/*` with the prop contracts above; `StatCard.tone` accepts `'alert'`.
    - **Payments list items have an `id` field** (service spreads `{ id: doc.id, ...data }`) and `screenshotUrl`; **invoices** have `id`, `paidAmount`, `status`; the review/cancel URLs use `id`.
    - `PATCH /api/payments/invoices/:id/cancel` is called with body `{}`; if the backend rejects an empty-object body (strict Zod), switch the call to send no body (`execute(path)`).
    - Invoice `feeType` is treated as FREE TEXT (≤60). If `payment.schema.ts` `createInvoice` uses an enum, the create modal needs a `<select>` with those values.
    - Expense `description` is REQUIRED in the UI; if the backend rejects empty/omitted descriptions differently, adjust the modal only.
    - **SettingsPage sends only changed keys among six fields**; if `settings.service.ts` uses different field names (e.g. `schoolNameBn/En`, `bkashNumber` vs `bkash`), the PUT will be rejected by the strict body — align `FIELDS` in `SettingsPage.tsx` (and `phone`/`email` guesses) with the real settings schema. Clearing an optional field sends `''` which a strict schema may reject.
    - **ReportsPage parsing is tolerant by design** but depends on key names: finance `collected, expenses, outstanding, monthly, byProvider, byCategory, truncated`; attendance per-day array under `days|daily|byDay|items` with `date, total?, present, absent, late, leave, percentage|pct`; admissions: any array/object fields are rendered generically. If the real report shape differs, adjust the readers inside `FinanceTab` / `AttendanceTab` (frontend only).
    - `GET /api/users` response shape is `{ items }` or a raw array (both handled); user objects must include `uid` (used as the React key and in URLs); `lastLoginAt` may be a Timestamp object.
    - Users: the UI hides Delete for the current user and locks role/status in the modal, but the backend is the authority (prevents self-demotion and removing the last super_admin; errors surface via the modal/page `{ error }`).
    - Role-based access to the pages is enforced by the backend and the sidebar only; there is no per-page redirect for unauthorized roles (they would just see error cards).
- **Timestamps**: Batch 15–16 services return Firestore Timestamps as stored (no ISO conversion); pages tolerate ISO strings and `{ _seconds }` via local `toDate`
- **Frontend ResultsPage shape check**: the existing public results page was built before these endpoints existed — VERIFY it matches the `/api/results/exams/published` and `/api/results/lookup` shapes; adjust the frontend, not the backend contract
- **Results lookup uses guardian mobile only** (student records have no DOB field); locked decision says "mobile/DOB" — a DOB factor would require adding it to students
- **Class ID format** (`play`, `nursery`, `1`…`10`, created by seed.ts) is passed through as an opaque string; backend does not validate against `schoolClasses`; admin UIs validate against `FALLBACK_CLASSES`
- **Editing marks after an exam is published** is allowed (updates live public results); audited via `result.save`
- **Attendance has no teacher↔class assignment**: any teacher role can mark/report any class
- **Duplicate trxId check is query-then-write** (not transactional) — acceptable for manual-payment volume
- **Payment screenshot optional**; MIME/size limits come from `utils/upload.ts` (3 MB; also applies to notice PDFs and gallery images)
- **Batch 16 notes:** reports are computed on read by scanning (capped at 5000 docs; attendance 20000) → response includes `truncated`; finance `collected` counts payments by REVIEW date; admission statuses grouped dynamically (frontend status map uses the five strings — adjust if real strings differ); expense category is a free string; users: `password` only on create (no reset endpoint in v1; use Firebase console); `setActiveSession()` has NO route (seed.ts only activates a session when none is active); `/auth/verify` should keep the `users` doc in sync (`lastLoginAt`); deactivated users are disabled in Auth and refresh tokens revoked.
- **Batch 17 notes:** errorHandler hides 5xx details in production (4xx from HttpError returned as-is); bootstrap.ts re-promotes ANY existing Auth user whose email is given + revokes their refresh tokens; seed.ts never edits/deletes existing class docs.
- **Batch 18 notes:** dashboard hides cards the role cannot use (UX only; endpoint returns counts for every role); sidebar role lists mirror backend guards (update `NAV` in AdminSidebar.tsx if a guard changes); sidebar is `fixed` under the `h-14` header (`top-14`; changing header height requires changing sidebar and backdrop); admin UI strings are inline bilingual, not in `i18n/bn.ts`/`en.ts`.
- **Batch 19 notes:** reusable patterns (URL-synced filters, cold-start banner, retry card, status pill map + `humanize()` fallback, timestamp tolerance, modal shell, tolerant unwrap); ImportStudentsModal is a one-off (add `POST /api/students/bulk` later if volume demands); status label map must stay in sync with values written by `admission.service.ts`; ApproveModal note is OPTIONAL and AdmissionDetailPage enforces notes for `correction_needed`/`rejected` client-side ONLY (backend should also enforce if required).
- **Batch 20 notes:** AttendancePage reads `?studentId=` as a hint only (does not auto-select a student; user must pick a class); ExamFormModal disables Class in edit mode (backend PUT does not accept a classId change; use delete+recreate if needed); ResultsEntryPage sends every student (blank = absent, GPA 0 — filter all-blank rows client-side if "no entry yet" must differ); 300-row caps align with backend limits; mark-all buttons overwrite ALL rows including loaded ones and there is no revert button (change date and back to re-fetch).
- **Batch 21 notes:**
  - Gallery edit cannot replace the image (backend PUT is metadata-only); delete + re-upload instead.
  - FAQ reorder renumbers the entire list 1..n on every arrow click (one request; backend cap on `items` unknown — keep FAQ count modest, ≤ ~100).
  - Contact page auto-marks a message `read` on open (one PATCH); messages are never auto-set to `replied`.
  - Notice "View PDF" uses the PUBLIC download endpoint, so unpublished notices with a PDF may 404 if the backend's `/:id/download` checks `published` — if so add an admin-signed-URL route (small change to `routes/notices.ts`).
  - No role-gating inside Batch 21 pages: backend allows only super_admin/school_admin and the sidebar hides these links from other roles.
- **Batch 22 notes:**
  - Payment review is one-way in the UI: only `pending` payments show Review; verified/rejected payments cannot be re-reviewed (backend behavior for re-review is unverified).
  - Rejecting requires a note in the UI only; verifying/rejecting never edits the amount.
  - Invoice Cancel is shown only when `paidAmount` is 0 and status ≠ cancelled (mirrors `cancelInvoice` rule); there is no invoice edit and no "mark paid" — payments drive invoice status.
  - Payments/Invoices `studentId` filters are uppercased client-side; the backend must match the stored case (`TLFS-STU-YYYY-NNNN`).
  - Expense page totals only the CURRENT page; use Reports → Finance for range totals.
  - Reports are client-rendered from `{ item }`; ranges are validated client-side (finance ≤366 days, attendance ≤92 days) to avoid 400s; the "Outstanding" figure ignores the range by design (Batch 16).
  - Settings page cannot edit other settings keys (e.g. grading scale, active session); `setActiveSession()` still has no
