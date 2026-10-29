// PROJECT_STATE_BATCH_16.md

# ═══════════════════════════════════════════════════════════════════
# PROJECT HANDOFF STATE — The Little Flower School (TLFS)
# Complete Project Snapshot — Resumable by Any AI/Developer
# ═══════════════════════════════════════════════════════════════════

**Last completed batch:** 16 of 24
**Next batch:** 17
**Date:** 2026-10-29
**Files done:** 112 of 168 (67%)
**Files remaining:** 56

---

## 📖 HOW TO RESUME (READ THIS FIRST)

If you are a new AI assistant or developer picking up this project:

1. **Read this entire file** — it contains the full project context.
2. **Do NOT regenerate completed files** (listed below with contracts).
3. **Do NOT re-plan from scratch** — follow the batch plan in order.
4. **Confirm understanding** in ≤5 lines: last batch, next batch number, next 7 file paths.
5. **Ask permission** before starting Batch N+1.
6. **One batch per message.** Never deliver two batches at once.
7. **Each code file's FIRST LINE must be a comment with its full path.**
8. **After each batch, emit a NEW complete state file** with everything in this file + the new batch's entries.

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

### Security
- All Firestore/Storage client writes DENIED
- Backend API is the ONLY writer
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
├── src/                            (frontend — 63 files DONE)
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
│   └── features/admission/ (5 files)
├── server/                         (backend — 49 files DONE)
│   ├── package.json, tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── config/{firebase,env}.ts
│       ├── middleware/{auth,rateLimit,validate}.ts
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
│       │   ├── report.service.ts        ← Batch 16
│       │   ├── expense.service.ts       ← Batch 16
│       │   └── user.service.ts          ← Batch 16
│       ├── utils/{errors,upload,grading}.ts
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
│           ├── reports.ts               ← Batch 16
│           ├── expenses.ts              ← Batch 16
│           ├── settings.ts              ← Batch 16
│           └── users.ts                 ← Batch 16
└── (root configs: package.json, vite.config.ts, tailwind.config.ts, etc.)
```

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
| PORT | no | 3001 | Server port |
| FRONTEND_ORIGIN | no | http://localhost:5173 | CORS origins (comma-sep) |
| FIREBASE_PROJECT_ID | yes | — | Firebase project |
| FIREBASE_STORAGE_BUCKET | yes | — | Storage bucket |
| FIREBASE_SERVICE_ACCOUNT_BASE64 | yes | — | base64(service-account.json) |
| RECAPTCHA_ENFORCE_APP_CHECK | no | false | Require App Check |
| BOOTSTRAP_SUPER_ADMIN_EMAIL | no | — | Auto-promote on first login |

---

## 📊 FIRESTORE COLLECTIONS

| Collection | Purpose | Key Fields |
|---|---|---|
| `sessions` | Academic years | id=year, isActive |
| `schoolClasses` | Classes Play–10 | id, nameBn, nameEn, order |
| `admissionApplications` | Applications | applicationId, sessionId, student{}, guardian{}, documents{}, status, statusHistory[] |
| `students` | Enrolled students | studentId, classId, sessionId, name, roll?, guardian{name,mobile}, isActive, createdAt, updatedAt |
| `teachers` | Faculty | name, designation, subject, phone, email, isActive, createdAt, updatedAt |
| `attendance` | Daily records (doc ID = `{date}_{studentId}`, upsert) | studentId, date (YYYY-MM-DD), classId, sessionId, status (present/absent/late/leave), note?, markedBy, updatedAt |
| `exams` | Exams (auto doc ID) | name, classId, sessionId, subjects[{name, fullMarks, passMarks, isOptional}], published, publishedAt?, createdBy, createdAt, updatedAt |
| `results` | Marks (doc ID = `{examId}_{studentId}`, upsert) | examId, studentId, classId, sessionId, subjects[{name, fullMarks, marks\|null, percentage, grade, gradePoint, passed, isOptional}], total, fullTotal, percentage, gpa, grade, passed, enteredBy, updatedAt |
| `notices` | Notices | titleBn/En, descriptionBn/En, date, published, important, pdfPath |
| `gallery` | Photos | imagePath, captionBn/En, category, published, order |
| `faq` | Q&A | questionBn/En, answerBn/En, published, order |
| `contactMessages` | Form submissions | name, email, phone, subject, message, status (new/read/replied/archived) |
| `invoices` | Fee invoices (doc ID = generated invoice ID) | studentId, feeType, amount, paidAmount, status (unpaid/partial/paid/cancelled), dueDate (YYYY-MM-DD), note, createdBy, createdAt, updatedAt |
| `payments` | Payment submissions (doc ID = generated payment ID) | studentId, invoiceId?, provider (bkash/nagad), trxId, senderNumber, amount, status (pending/verified/rejected), screenshotPath?, reviewedBy, reviewedAt, reviewNote, createdAt, updatedAt |
| `expenses` | Expenses (auto doc ID) — Batch 16 | category (free string ≤60), amount (2dp), date (YYYY-MM-DD), description, createdBy, createdAt, updatedAt |
| `schoolSettings` | Config (single doc "main") | schoolName, address, phone?, email?, bkashNumber, nagadNumber, etc. |
| `counters` | Atomic ID counters | {type}_{year} → { value } |
| `auditLogs` | Admin action trail | actorUid, action, targetCollection, targetId, at |
| `users` | Admin users (doc ID = Firebase Auth uid) — Batch 16 | uid, email, name, role, isActive (missing = active), lastLoginAt, createdBy?, createdAt?, updatedAt? |

---

## 🔗 API ENDPOINTS

### Public (no auth)
| Method | Path | Status | Rate Limit |
|---|---|---|---|
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
| GET | `/api/settings/public` | ⏳ Batch 17 (routes/public.ts) | — |

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
| GET | `/api/notices` | ✅ | super/school |
| GET | `/api/notices/:id` | ✅ | super/school |
| POST | `/api/notices` | ✅ | super/school |
| PUT | `/api/notices/:id` | ✅ | super/school |
| DELETE | `/api/notices/:id` | ✅ | super/school |
| GET | `/api/gallery` | ✅ | super/school |
| POST | `/api/gallery` | ✅ | super/school |
| PUT | `/api/gallery/:id` | ✅ | super/school |
| DELETE | `/api/gallery/:id` | ✅ | super/school |
| GET | `/api/faq` | ✅ | super/school |
| GET | `/api/faq/:id` | ✅ | super/school |
| POST | `/api/faq` | ✅ | super/school |
| PUT | `/api/faq/:id` | ✅ | super/school |
| DELETE | `/api/faq/:id` | ✅ | super/school |
| POST | `/api/faq/reorder` | ✅ | super/school |
| GET | `/api/contact` | ✅ | super/school |
| GET | `/api/contact/:id` | ✅ | super/school |
| PATCH | `/api/contact/:id` | ✅ | super/school |
| DELETE | `/api/contact/:id` | ✅ | super/school |
| GET | `/api/payments` | ✅ | super/school/accountant |
| GET | `/api/payments/:id` | ✅ | super/school/accountant |
| PATCH | `/api/payments/:id/review` | ✅ | super/school/accountant |
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

## ✅ COMPLETED FILES (112 of 168)

### Frontend (63 files — Batches 1–9) — DONE
All public pages, components, hooks, utils, i18n, layouts, admission flow.

### Backend (49 files — Batches 10–16)

#### Batch 10 (Foundation)
- `server/package.json`, `server/tsconfig.json`
- `server/src/index.ts` — Express app, CORS, helmet, health check, global error handler
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

**`server/src/services/notice.service.ts`**
- Collection: `notices`
- Exports: `NoticeRecord`, `CreateNoticeInput`
- `listPublishedNotices()` → published, newest first, limit 100
- `getPublishedNotice(id)` → single notice if published, else null
- `listAllNotices({ published?, important?, page, pageSize })` → paginated for admin
- `getNoticeById(id)`, `createNotice(input)`, `updateNotice(id, updates)`, `deleteNotice(id)` (also removes PDF from storage)

**`server/src/services/gallery.service.ts`**
- Collection: `gallery`
- Exports: `GalleryRecord` (includes optional `imageUrl` populated by signed URL)
- `listPublishedGallery(category?)` → attaches signed URLs (60min)
- `listCategories()` → distinct categories from published items
- `listAllGallery({ category?, published?, page, pageSize })` → paginated for admin, with signed URLs
- `createGalleryItem({ imagePath, captionBn, captionEn, category, published, order })`
- `updateGalleryItem(id, updates)`, `deleteGalleryItem(id)` (removes image from storage)

**`server/src/services/faq.service.ts`**
- Collection: `faq`
- Exports: `FAQRecord`, `CreateFAQInput`
- `listPublishedFAQ()` → published, ordered by `order` asc, limit 100
- `listAllFAQ()`, `getFAQById(id)`, `createFAQ(input)`, `updateFAQ(id, updates)`, `deleteFAQ(id)`
- `reorderFAQ([{ id, order }, ...])` → batch update

**`server/src/routes/notices.ts`**
- Public: GET `/published`, GET `/:id/download` (returns `{ url, expiresIn }`)
- Admin: GET `/`, GET `/:id`, POST `/` (multer `pdf`), PUT `/:id` (multer `pdf` replacement), DELETE `/:id`
- Create flow: creates doc → uploads PDF to `notices/{id}/notice.pdf` → updates doc with pdfPath
- Audit logs on all admin writes

**`server/src/routes/gallery.ts`**
- Public: GET `/published?category=`, GET `/categories`
- Admin: GET `/`, POST `/` (multer `image`), PUT `/:id` (metadata only), DELETE `/:id`
- Create flow: reserves doc ID → uploads to `gallery/{id}/{uuid}.{ext}` → creates doc with imagePath

**`server/src/routes/faq.ts`**
- Public: GET `/published` → returns RAW ARRAY (not wrapped) — matches frontend expectation
- Admin: GET `/`, GET `/:id`, POST `/`, PUT `/:id`, DELETE `/:id`, POST `/reorder` (`{ items: [{id, order}] }`)

**`server/src/routes/contact.ts`**
- Public: POST `/` (3/min rate limit, honeypot `website` field → silent 200 if filled)
- Stores: name, email, phone, subject, message, status='new', ipAddress, userAgent
- Admin: GET `/` (filter by status), GET `/:id`, PATCH `/:id` (status + note), DELETE `/:id`
- Status values: new | read | replied | archived
- Audit logs on admin writes

#### Batch 14 (Payments, Students, Teachers)

**`server/src/services/student.service.ts`**
- Collection: `students` (doc ID = studentId, e.g. `TLFS-STU-2026-0001`)
- Exports: `StudentRecord`, `Guardian`, `CreateStudentInput`, `UpdateStudentInput`, `ListStudentsParams`
- `listStudents({ classId?, sessionId?, isActive?, search?, page, pageSize })` → `{ items, total, page, pageSize }`; `search` = studentId prefix; ordered by studentId
- `getStudentById(id)` → record | null
- `findStudentByStudentId(studentId)` → doc-ID lookup, falls back to `studentId` field query
- `createStudent({ name, classId, sessionId, roll?, guardian })` → uses `generateId('student')`, isActive=true
- `updateStudent(id, updates)` → guardian fields merged via dot-notation
- `deactivateStudent(id)` → soft delete (isActive=false)

**`server/src/services/invoice.service.ts`**
- Collection: `invoices` (doc ID = `generateId('invoice')`)
- Exports: `INVOICES_COLLECTION`, `InvoiceRecord`, `InvoiceStatus`, `CreateInvoiceInput`, `ListInvoicesParams`
- `computeInvoiceStatus(amount, paidAmount)` → unpaid | partial | paid
- `getInvoiceById(id)`, `listInvoices({ studentId?, status?, page, pageSize })` (createdAt desc)
- `createInvoice({ studentId, feeType, amount, dueDate, note? }, actorUid)` → requires existing student
- `cancelInvoice(id)` → blocked if already cancelled or paidAmount > 0

**`server/src/services/payment.service.ts`**
- Collection: `payments` (doc ID = `generateId('payment')`)
- Exports: `PaymentRecord`, `PaymentStatus`, `PaymentProvider`, `SubmitPaymentInput`, `PaymentFile`, `ListPaymentsParams`
- `submitPayment(input, file?)` → multi-factor check (studentId + guardian mobile, normalized for +88/88 prefix), generic error `তথ্য মেলেনি / Details do not match` (404) on mismatch; validates invoice belongs to student and is unpaid/partial; rejects duplicate (provider + trxId); uploads screenshot to `payments/{id}/{uuid}.{ext}`; returns payment ID; status='pending'
- `listPayments({ status?, provider?, studentId?, page, pageSize })` → attaches `screenshotUrl` (signed, 60min)
- `getPaymentById(id)` → with `screenshotUrl`
- `reviewPayment(id, 'verified'|'rejected', note, actorUid)` → Firestore transaction; on verify, adds amount to linked invoice `paidAmount` and recomputes invoice status

**`server/src/routes/payments.ts`**
- Public: POST `/submit` (rateLimit 5/min → multer `screenshot` optional → local Zod parse → `submitPayment`) → 201 `{ success: true, paymentId }`
- Admin (super/school/accountant): GET `/invoices`, POST `/invoices`, PATCH `/invoices/:id/cancel` (declared BEFORE `/:id`), GET `/`, GET `/:id`, PATCH `/:id/review` body `{ decision: 'verified'|'rejected', note? }`
- List responses: `{ items, total, page, pageSize }`
- Audit actions: `invoice.create`, `invoice.cancel`, `payment.verified`, `payment.rejected`

**`server/src/routes/students.ts`**
- Read roles: super/school/accountant/teacher/admission; write roles: super/school
- GET `/` (query: classId, sessionId, isActive, search, page, pageSize), GET `/:id`, POST `/` (sessionId defaults to `getActiveSessionId()`), PUT `/:id`, DELETE `/:id` (soft)
- Audit actions: `student.create`, `student.update`, `student.deactivate`

**`server/src/routes/teachers.ts`**
- Read roles: super/school/teacher; write roles: super/school
- GET `/` (query: isActive) → `{ items: TeacherRecord[] }`, GET `/:id`, POST `/`, PUT `/:id`, DELETE `/:id` (hard)
- Audit actions: `teacher.create`, `teacher.update`, `teacher.delete`

#### Batch 15 (Attendance, Exams, Results)

**`server/src/utils/grading.ts`**
- Exports: `GradeBand`, `DEFAULT_GRADE_SCALE`, `DEFAULT_PASS_PERCENT` (33), `OPTIONAL_BASE_POINT` (2), `SubjectInput`, `SubjectResult`, `GradingOptions`, `ComputedResult`
- Default scale: 80+ A+ 5.00 | 70+ A 4.00 | 60+ A- 3.50 | 50+ B 3.00 | 40+ C 2.00 | 33+ D 1.00 | <33 F 0.00
- `gradeForPercentage(pct, scale?)`, `gradeForGpa(gpa, scale?)`
- `gradeSubject(input, scale?, passPercent?)` → null marks = absent = fail; uses `passMarks` if given else passPercent
- `computeResult(subjects, { scale?, passPercent? })` → `{ subjects, total, fullTotal, percentage, gpa, grade, passed }`
- Rules: any failed/absent compulsory subject → passed=false, GPA 0.00, grade F; GPA = (Σ compulsory points + Σ max(0, optional point − 2)) / compulsory count, capped at max scale point, 2 decimals; total/percentage include optional subjects

**`server/src/services/attendance.service.ts`**
- Collection: `attendance`, doc ID = `{date}_{studentId}` (idempotent upsert)
- Exports: `ATTENDANCE_COLLECTION`, `ATTENDANCE_STATUSES`, `AttendanceStatus`, `AttendanceRecord`, `AttendanceEntry`, `MarkAttendanceInput`, `AttendanceSummary`, `attendanceDocId`, `summarizeAttendance`
- `getClassAttendance(classId, date)` → records sorted by studentId
- `markAttendance({ classId, sessionId, date, records[] }, actorUid)` → validates every studentId is an ACTIVE student of that class, rejects duplicates; chunked batch writes (400), `set` with merge; empty note clears field → `{ saved }`
- `getStudentAttendance(studentId, from, to)` → `{ items, summary }`; summary percentage = (present+late)/total

**`server/src/services/exam.service.ts`**
- Collection: `exams` (auto doc ID)
- Exports: `EXAMS_COLLECTION`, `ExamSubject`, `ExamRecord`, `PublicExam`, `CreateExamInput`, `UpdateExamInput`, `ListExamsParams`
- `getExamById(id)`, `listExams({ classId?, sessionId?, published? })` (sorted in memory, limit 200), `listPublishedExams()` → `PublicExam[]` (id, name, classId, sessionId only)
- `createExam(input, actorUid)` — validates unique subject names, 0 ≤ passMarks ≤ fullMarks, ≥1 compulsory subject; published=false
- `updateExam(id, { name?, subjects? })` — subjects locked once any result exists
- `setExamPublished(id, bool)` — publishing requires ≥1 result; sets/clears `publishedAt`
- `deleteExam(id)` — blocked if results exist
- Uses literal `'results'` collection name (avoids circular import with result.service)

**`server/src/services/result.service.ts`**
- Collection: `results`, doc ID = `{examId}_{studentId}` (idempotent upsert)
- Exports: `RESULTS_COLLECTION`, `ResultRecord`, `ResultListItem`, `ResultEntryInput`, `LookupResultInput`, `PublicResult`, `resultDocId`
- `saveResults(examId, entries[{ studentId, marks:{[subject]: number|null} }], actorUid)` — validates all-or-nothing: no duplicate students, students belong to the exam's class, every exam subject key present (null = absent), no unknown subjects, 0 ≤ marks ≤ fullMarks; computes via `computeResult`; chunked batch → `{ saved }`
- `listExamResults(examId)` → results joined with `studentName`, `roll` from class roster, sorted by studentId
- `getResult(examId, studentId)`, `deleteResult(examId, studentId)`
- `lookupPublishedResult({ examId, studentId, mobile })` — exam must be published; student class must equal exam class; guardian mobile match (normalized +88/88); EVERY failure → 404 `তথ্য মেলেনি / Details do not match`

**`server/src/routes/attendance.ts`**
- Router-level `verifyToken` + `requireRole(super, school, teacher)`
- GET `/?classId=&date=` → `{ items }`
- POST `/mark` body `{ classId, date, records:[{ studentId, status, note? }] }` (max 300; rejects future dates in BD time; sessionId from `getActiveSessionId()`) → `{ success, saved }`
- GET `/student/:studentId?from=&to=` → `{ items, summary }` (max range 366 days)
- Audit: `attendance.mark` (targetId `{classId}_{date}`)

**`server/src/routes/exams.ts`**
- Read: super/school/teacher; write: super/school
- GET `/` (query classId, sessionId, published=true|false) → `{ items }`; GET `/:id` → `{ item }`
- POST `/` body `{ name, classId, sessionId?, subjects:[{ name, fullMarks, passMarks?, isOptional? }] }` → 201 `{ success, item }` (passMarks defaults to ceil(33% of fullMarks); sessionId defaults to active session)
- PUT `/:id` `{ name?, subjects? }` → `{ success, item }`
- PATCH `/:id/publish` `{ published: boolean }` → `{ success, item }`
- DELETE `/:id` → `{ success }`
- Audit: `exam.create`, `exam.update`, `exam.publish`, `exam.unpublish`, `exam.delete`

**`server/src/routes/results.ts`**
- Public: GET `/exams/published` → `{ items: PublicExam[] }`; POST `/lookup` (rateLimit 10/min; body `{ examId, studentId (uppercased), mobile }`) → `PublicResult` OR 404 generic
- Staff (super/school/teacher): GET `/exam/:examId` → `{ exam, items }`; PUT `/exam/:examId` body `{ entries }` (max 300) → `{ success, saved }`; GET `/exam/:examId/student/:studentId` → `{ item }`
- Delete (super/school): DELETE `/exam/:examId/student/:studentId` → `{ success }`
- Audit: `result.save`, `result.delete`

#### Batch 16 (Reports, Expenses, Settings, Users) — JUST ADDED

**`server/src/services/report.service.ts`**
- No collection of its own; read-only aggregation over `students`, `teachers`, `admissionApplications`, `payments`, `invoices`, `contactMessages`, `expenses`, `attendance`
- Exports: `MAX_FINANCE_DAYS` (366), `MAX_ATTENDANCE_DAYS` (92), `todayBd()`, `isValidIsoDate(s)`, `defaultMonthRange()` ({from: first of current BD month, to: today BD}), types `AdmissionsReport`, `DashboardSummary`, `FinanceReport`, `AttendanceDay`, `AttendanceReport`
- `getAdmissionsReport(sessionId?)` → `{ sessionId, total, byStatus: Record<string, number>, truncated }`; sessionId defaults to active; groups by whatever `status` strings exist (no hard-coded status list)
- `getDashboardSummary()` → `{ students:{active}, teachers:{active}, applications: AdmissionsReport, payments:{pending}, invoices:{outstanding}, messages:{unread} }` — counts only, NO money (safe for all roles); uses `count()` aggregations
- `getFinanceReport(from, to)` → `{ from, to, collected:{total,count,byProvider}, expenses:{total,count,byCategory[{category,total}] desc}, net, monthly[{month 'YYYY-MM', collected, expenses, net}], outstanding:{count, amount}, truncated }`. Collected = payments with status 'verified' and `reviewedAt` inside range (BD day boundaries, UTC+6); expenses by `date` string; `outstanding` = invoices unpaid/partial, CURRENT (not date-limited). Max range 366 days
- `getAttendanceReport({ from, to, classId? })` → `{ from, to, classId|null, totals:{present,absent,late,leave,total,percentage}, days[{date,present,absent,late,leave,total}] asc, truncated }`; percentage = (present+late)/total×100; max range 92 days
- Safety caps: 5000 docs per finance/admissions scan, 20000 for attendance; `truncated: true` if exceeded
- Invalid/reversed/oversized ranges → 400 (bilingual)

**`server/src/services/expense.service.ts`**
- Collection: `expenses` (auto doc ID)
- Exports: `EXPENSES_COLLECTION`, `ExpenseRecord`, `CreateExpenseInput`, `UpdateExpenseInput`, `ListExpensesParams`
- `listExpenses({ category?, from?, to?, page, pageSize })` → `{ items, total, page, pageSize }` ordered by `date` desc (offset pagination + `count()`)
- `getExpenseById(id)` → record | null
- `createExpense({ category, amount, date, description }, actorUid)` → record (re-read so server timestamps resolve)
- `updateExpense(id, partial)` → record (404 if missing); `deleteExpense(id)` hard delete (404 if missing)
- Timestamps returned as stored (consistent with Batch 15)

**`server/src/services/user.service.ts`**
- Collection: `users` (doc ID = Firebase Auth uid)
- Exports: `USERS_COLLECTION`, `ADMIN_ROLES` (`super_admin`, `school_admin`, `accountant`, `teacher`, `admission_officer`), `AdminRole`, `UserRecord`, `CreateUserInput`, `UpdateUserInput`
- Role stored BOTH as Firebase custom claim `{ role }` and in the `users` doc; kept in sync here
- `listUsers({ role? })` → `UserRecord[]` sorted by email in memory (limit 500); `getUserById(uid)`
- `createUser({ email, password, name, role }, actorUid)` → creates Auth user, sets claim, writes doc (rolls back Auth user on failure); duplicate email → 400 bilingual
- `updateUser(uid, { name?, role?, isActive? }, actorUid)` → syncs Auth displayName/disabled + claims; revokes refresh tokens on role change or deactivation; cannot change own role / deactivate self; cannot demote/deactivate the last active super_admin
- `deleteUser(uid, actorUid)` → hard delete (Auth + doc); cannot delete self or the last active super_admin
- `isActive` missing on a doc (e.g. written by `/auth/verify`) is treated as active

**`server/src/routes/reports.ts`**
- Router-level `verifyToken`; per-route roles
- GET `/dashboard` (all 5 roles), GET `/finance?from=&to=` (super/school/accountant), GET `/admissions?sessionId=` (super/school/admission_officer), GET `/attendance?from=&to=&classId=` (super/school/teacher)
- ALL responses shaped `{ item }`; from/to default to current BD month

**`server/src/routes/expenses.ts`**
- Read + create + update: super/school/accountant; delete: super/school
- GET `/` (category, from, to, page, pageSize ≤100) → `{ items, total, page, pageSize }`; GET `/:id` → `{ item }`; POST `/` body `{ category, amount, date, description? }` → 201 `{ success, item }`; PUT `/:id` (partial) → `{ success, item }`; DELETE `/:id` → `{ success }`
- Amount: 0.01–100,000,000, rounded to 2dp; strict bodies (unknown keys rejected)
- Audit: `expense.create`, `expense.update`, `expense.delete`

**`server/src/routes/settings.ts`**
- super/school only
- GET `/` → `{ item }`; PUT `/` (partial, strict; fields: schoolName, address, phone, email, bkashNumber, nagadNumber; mobile numbers may be '' to clear) → `{ success, item }` (re-reads via `getSettings()`)
- Audit: `settings.update` (targetCollection `schoolSettings`, targetId `main`)
- Public settings endpoint is NOT here (Batch 17 `routes/public.ts`)

**`server/src/routes/users.ts`**
- Router-level `verifyToken` + `requireRole('super_admin')`
- GET `/` (role?) → `{ items }`; GET `/:uid` → `{ item }`; POST `/` body `{ email, password (≥8), name, role }` → 201 `{ success, item }`; PUT `/:uid` body `{ name?, role?, isActive? }` → `{ success, item }`; DELETE `/:uid` → `{ success }`
- Audit: `user.create`, `user.update`, `user.delete`

---

## 🔗 CROSS-FILE DEPENDENCIES (Backend)

```
index.ts
  ├── config/env.ts
  ├── config/firebase.ts
  ├── middleware/rateLimit.ts
  └── (route imports pending — see "Known Issues")

ALL ROUTES depend on:
  ├── middleware/auth.ts (verifyToken, requireRole)
  ├── services/audit.service.ts (logAudit)
  ├── utils/errors.ts (badRequest, notFound)
  └── config/firebase.ts (db, FieldValue, Timestamp; `auth` for user.service)

routes/admission.ts, routes/notices.ts, routes/gallery.ts
  └── utils/upload.ts (upload, getFile)
  └── services/storage.service.ts (uploadFile, getSignedUrl, deleteFile)

routes/admission.ts
  └── services/counter.service.ts (generateId)
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
  ├── services/attendance.service.ts (reads `students` collection directly)
  └── services/session.service.ts

routes/exams.ts
  ├── services/exam.service.ts (reads `results` collection by literal name)
  └── services/session.service.ts

routes/results.ts
  ├── middleware/rateLimit.ts
  ├── services/exam.service.ts
  └── services/result.service.ts
        ├── utils/grading.ts
        ├── services/exam.service.ts
        └── services/student.service.ts

routes/reports.ts                                   (Batch 16)
  └── services/report.service.ts
        ├── services/session.service.ts (getActiveSessionId)
        └── reads collections directly (students, teachers, admissionApplications,
            payments, invoices, contactMessages, expenses, attendance)

routes/expenses.ts                                  (Batch 16)
  ├── services/expense.service.ts
  └── services/report.service.ts (isValidIsoDate only)

routes/settings.ts                                  (Batch 16)
  └── services/settings.service.ts (getSettings, updateSettings)

routes/users.ts                                     (Batch 16)
  └── services/user.service.ts (→ config/firebase `auth`)
```

**⚠️ CRITICAL:** `server/src/index.ts` has all route imports COMMENTED OUT. After Batch 17 (public.ts exists), uncomment and add:
```typescript
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
// ... batch 17: import publicRoutes from './routes/public';

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
app.use('/api/settings', settingsRoutes);   // mount public settings (Batch 17) so GET /api/settings/public is not shadowed by admin router
app.use('/api/users', usersRoutes);
```
NOTE: `/api/settings/public` (Batch 17) must be mounted BEFORE `/api/settings` or be handled with a router that skips auth for `/public` — the admin settings router applies `verifyToken` to every path.

---

## ⏳ REMAINING BATCHES (17 → 24)

### Batch 17 — Export, Bootstrap, Public Routes, App Check
1. `server/src/utils/csv.ts` — UTF-8 BOM
2. `server/src/utils/pdf.ts` — Bengali font embed
3. `server/src/scripts/bootstrap.ts`
4. `server/src/scripts/seed.ts`
5. `server/src/routes/public.ts`
6. `server/src/middleware/appCheck.ts`
7. `server/src/middleware/errorHandler.ts`

### Batch 18 — Admin Panel Shared Components (Frontend)
1. `src/features/admin/AdminDashboard.tsx`
2. `src/features/admin/LoginPage.tsx`
3. `src/features/admin/common/AdminHeader.tsx`
4. `src/features/admin/common/AdminSidebar.tsx`
5. `src/features/admin/common/StatCard.tsx`
6. `src/features/admin/common/ChartCard.tsx`
7. `src/features/admin/common/ActionBar.tsx`

### Batch 19 — Admin: Admissions + Students
1–7: AdmissionsListPage, AdmissionDetailPage, ApproveModal, StudentsListPage, StudentDetailPage, StudentFormModal, ImportStudentsModal

### Batch 20 — Admin: Teachers, Attendance, Exams
1–7: TeachersListPage, TeacherFormModal, AttendancePage, ExamsListPage, ExamFormModal, ResultsEntryPage, ResultsPublishModal

### Batch 21 — Admin: Notices, Gallery, FAQ, Contact
1–7: NoticesListPage, NoticeFormModal, GalleryListPage, GalleryUploadModal, FAQListPage, FAQFormModal, ContactMessagesPage

### Batch 22 — Admin: Payments, Expenses, Reports, Settings, Users
1–7: PaymentsListPage, InvoicesListPage, ExpensesListPage, ReportsPage, SettingsPage, UsersListPage, UserFormModal

### Batch 23 — Firebase Rules, Deployment, Tests
1–7: firestore.rules, storage.rules, firestore.indexes.json, firebase.json, render.yaml, tests/smoke.test.ts, server/src/routes/health.ts

### Batch 24 — Docs & Finalization
1–7: README.md, docs/DEPLOYMENT.md, docs/API.md, docs/ADMIN_GUIDE.md, docs/BACKUP.md, .github/workflows/ci.yml, CHANGELOG.md

---

## 🧩 KEY INTERFACE CONTRACTS (Frontend ↔ Backend)

### Frontend API Client (`src/lib/api.ts`)
- `api.get<T>(path)`, `api.post`, `api.put`, `api.patch`, `api.delete`
- `api.uploadFile(path, formData)` — multipart
- Auto-attaches Firebase ID token
- Cold-start retry on 502/503/504 → throws `ServerWakingError`

### Frontend Hooks
- `useAuth()` → `{ user, role, isAdmin, isLoading, login, logout, hasPermission }`
- `useApi<T>(method, path)` → `{ data, isLoading, isWaking, error, execute }`
- `useApiGet<T>(path, deps)` → auto-fetch on mount
- `useLanguage()` → `{ locale, setLocale, t, isBengali }`

### Response Shapes (Frontend expectations)
- `GET /api/notices/published` → `{ items: NoticeRecord[] }` (NoticesPage reads items)
- `GET /api/faq/published` → `FAQRecord[]` (RAW ARRAY — FAQPage reads directly)
- `GET /api/gallery/published` → `{ items: GalleryRecord[] }` (each item has `imageUrl` signed URL)
- `POST /api/admission/apply` → `{ applicationId }`
- `POST /api/admission/status` → `{ status, correctionNote, studentNameBn, studentNameEn, classApplyingFor, submittedAt }` OR 404 `{ error: 'তথ্য মেলেনি / Details do not match' }`
- `POST /api/contact` → `{ success: true }` (always 200/201 even on honeypot trigger)
- `POST /api/payments/submit` (multipart: studentId, mobile, provider, trxId, senderNumber, amount, invoiceId?, screenshot?) → 201 `{ success: true, paymentId }` OR 404 `{ error: 'তথ্য মেলেনি / Details do not match' }` OR 400 duplicate trxId
- `GET /api/results/exams/published` → `{ items: [{ id, name, classId, sessionId }] }`
- `POST /api/results/lookup` (JSON: examId, studentId, mobile) → `{ exam:{id,name}, student:{studentId,name,classId,roll?}, subjects:[{name,fullMarks,marks,percentage,grade,gradePoint,passed,isOptional}], total, fullTotal, percentage, gpa, grade, passed }` OR 404 `{ error: 'তথ্য মেলেনি / Details do not match' }`
- Admin list endpoints (payments, invoices, students, **expenses**) → `{ items, total, page, pageSize }`; teachers/exams/attendance/**users** lists → `{ items }`; `GET /api/results/exam/:examId` → `{ exam, items }`; `GET /api/attendance/student/:id` → `{ items, summary }`
- Admin create/update (exams, **expenses, users**) → `{ success: true, item }`; marks/attendance saves → `{ success: true, saved }`; deletes → `{ success: true }`
- **Batch 16:** `GET /api/reports/{dashboard|finance|admissions|attendance}` → `{ item }`; `GET/PUT /api/settings` → `{ item }` / `{ success, item }`; `GET /api/users/:uid` → `{ item }`; `GET /api/expenses/:id` → `{ item }`

### Design Tokens
- Colors: navy #102A43, royal #1D4ED8, gold #D6AD60, surface #F5F7FB, ink #172B4D
- Fonts: Hind Siliguri (Bengali), Inter (English)
- Classes: `.btn-primary`, `.card`, `.input-field`, `.label`, `.error-text`, `.section-title`, `.container-page`

### Backend Middleware Chain Patterns
```
Public GET:    [rateLimit?] → [validate(query)] → handler
Public POST:   rateLimit → validate(body) → handler
Public upload: rateLimit → upload.fields([...]) → manual validate → handler
Admin GET:     verifyToken → requireRole(...) → [validate(query)] → handler
Admin POST/PUT: verifyToken → requireRole(...) → [upload] → validate(body) → handler
```
Batch 14–16 routes use per-file local Zod schemas parsed inside handlers via `parse(schema, data)` (throws `badRequest`) wrapped by a local `ah()` async-error helper, instead of `validate` middleware. Batch 16 `parse` is generic over `z.ZodTypeAny` (`z.infer<S>` return) so it works with transforms/defaults.

---

## ⚠️ KNOWN ISSUES / TODOS

- **`server/src/index.ts` route imports commented out** — uncomment after Batch 17 when all routes exist (see CRITICAL block above, including the `/api/settings/public` mount-order note)
- **Admin pages not created** (Batches 18–22) — build fails until then (lazy imports in App.tsx)
- **Rate limiter in-memory** — single instance only; fine for Render free
- **No App Check middleware** yet (Batch 17)
- **Bootstrap script** pending (Batch 17) — currently bootstrap happens inline in auth.ts
- **Firestore `count()`** used extensively — requires Firebase Admin SDK v11+
- **AdmissionForm.tsx uses direct fetch** for multipart (not api.ts) — works but inconsistent
- **Privacy page** marked DRAFT
- **Firestore composite indexes needed** (Batch 23 `firestore.indexes.json`): notices (published + date desc), gallery (published + category + order), contactMessages (status + createdAt desc), admissionApplications (status + createdAt desc), invoices (studentId/status + createdAt desc), payments (status/provider/studentId + createdAt desc; provider + trxId equality), students (classId/sessionId/isActive + studentId asc), teachers (isActive + name asc), attendance (studentId asc + date asc — range query + orderBy). **Batch 16 additions:** **payments (status asc + reviewedAt asc)** for the finance report; **expenses (category asc + date desc)** for filtered expense lists; **attendance (classId asc + date asc)** for class-filtered attendance report. Single-field `date` queries on expenses/attendance use automatic indexes. Batch 15 exam/result/class-attendance queries use equality filters only. Batch 16 users/admissionApplications(sessionId)/count queries use equality only.
- **Assumed signatures (VERIFY on first compile — fix Batch 14/15/16 call sites only):**
  - `rateLimit({ windowMs, max })` object form, named export (payments.ts, results.ts)
  - `uploadFile(path, buffer, contentType)` and `getSignedUrl(path, expiresMinutes)` returning a string (payment.service.ts)
  - `generateId('student' | 'invoice' | 'payment')` returning `Promise<string>`
  - `logAudit({ actorUid, action, targetCollection, targetId })` object form
  - `requireRole(...roles)` variadic returning a RequestHandler; authenticated user available as `req.user.uid` (Batch 15–16 use `req.user!.uid`)
  - **Batch 16:** `requireRole` accepts the literal role strings `'super_admin' | 'school_admin' | 'accountant' | 'teacher' | 'admission_officer'` (if auth.ts types roles differently, adjust the Batch 16 call sites or `ADMIN_ROLES`)
  - `badRequest(message)` / `notFound(message)` take a message string; Batch 15–16 use `throw badRequest(...)`
  - `getActiveSessionId()` returns `Promise<string>`
  - Student docs use doc ID = `studentId` (service falls back to field query), `guardian.mobile` for guardian mobile
  - Batch 15 additions: `StudentRecord` exposes `classId`, `name`, optional `roll`, `guardian.mobile` and (for the field fallback case) `studentId`; `getStudentById(id)` and `findStudentByStudentId(id)` return `Promise<StudentRecord | null>`; `db.batch()` available on exported `db`
  - **Batch 16 additions:**
    - `config/firebase.ts` exports `auth` (Admin `getAuth()` instance) in addition to `db`, `FieldValue`, `Timestamp` — user.service.ts needs it
    - Custom claim name is `role` and `auth.ts` / `/auth/verify` reads the role from that claim (or the `users` doc) using the same five strings; if auth.ts uses a different claim key, change it in `user.service.ts`
    - `getSettings()` returns the settings object; `updateSettings(updates)` accepts a partial object of `{ schoolName, address, phone, email, bkashNumber, nagadNumber }` (single argument; route re-reads with `getSettings()` so its return value is ignored)
    - Settings field names `phone` and `email` are guesses ("etc." in the original spec) — align with settings.service.ts defaults if they differ (route schema is `.strict()`)
    - `payments.reviewedAt` is a Firestore `Timestamp` written with `serverTimestamp()` by `reviewPayment` (finance report range-queries on it; if it was stored as an ISO string the finance totals will be 0 — fix `reviewPayment` or the query)
    - Admission application docs have a `sessionId` and `status` field (as listed in Collections)
- **Timestamps**: Batch 15–16 services return Firestore Timestamps as stored (no ISO conversion); confirm this matches how earlier services/frontend handle `createdAt`/`updatedAt`
- **Frontend ResultsPage shape check**: the existing public results page was built before these endpoints existed — VERIFY it matches the `/api/results/exams/published` and `/api/results/lookup` shapes above; adjust the frontend, not the backend contract, if they differ
- **Results lookup uses guardian mobile only** (student records have no DOB field); locked decision says "mobile/DOB" — DOB factor would require adding it to students
- **Class ID format** (`schoolClasses` doc IDs, e.g. `play`, `nursery`, `1`…`10`) is passed through as an opaque string; Batch 15–16 do not validate it against `schoolClasses`
- **Editing marks after an exam is published** is allowed (updates live public results); audited via `result.save`
- **Attendance has no teacher↔class assignment**: any teacher role can mark/report any class
- **Duplicate trxId check is query-then-write** (not transactional) — tiny race window; acceptable for manual-payment volume
- **Payment screenshot optional**; MIME/size limits come from `utils/upload.ts`
- **Batch 16 notes:**
  - Reports are computed on read by scanning (capped at 5000 docs; attendance 20000) → response includes `truncated`; fine for a single school, revisit with pre-aggregated counters if volume grows
  - Finance `collected` counts payments by REVIEW date (`reviewedAt`), not submission date
  - Admission statuses are not enumerated in reports (grouped dynamically); the frontend should map status strings to labels
  - Expense `category` is a free string (no fixed list yet); ReportsPage groups by whatever exists. Consider a fixed category list in Batch 22 UI
  - Users: `password` is only accepted on create (no reset endpoint in v1; use Firebase console). No self-service profile edit
  - `setActiveSession()` (session.service) still has NO route — academic-year switching is not exposed in the admin API yet (decide in Batch 17 or via seed script)
  - `/api/auth/verify` should keep `users` doc in sync (lastLoginAt); users created via POST /api/users get `isActive: true`; deactivated users are disabled in Firebase Auth and refresh tokens revoked (existing ID tokens remain valid up to ~1h unless `verifyToken` checks revocation)

## 🛠 MANUAL STEPS

1. `npm install` (frontend) + `cd server && npm install` (backend)
2. Set all env vars in `.env.local` (dev) and Render dashboard (prod)
3. `base64 -i service-account.json | tr -d '\n'` → `FIREBASE_SERVICE_ACCOUNT_BASE64`
4. Enable Firebase: Auth (email/password), Firestore, Storage
5. Create reCAPTCHA v3 key → App Check provider
6. First deploy: set `BOOTSTRAP_SUPER_ADMIN_EMAIL` → login → auto-promoted
7. Keep `public/images/logo.png` filename

---

## 🎯 NEXT BATCH (17 — Export, Bootstrap, Public Routes, App Check)
1. `server/src/utils/csv.ts`
2. `server/src/utils/pdf.ts`
3. `server/src/scripts/bootstrap.ts`
4. `server/src/scripts/seed.ts`
5. `server/src/routes/public.ts`
6. `server/src/middleware/appCheck.ts`
7. `server/src/middleware/errorHandler.ts`

---

## 📜 CORE RULES
- 7 files/batch + 1 state file. Permission before each batch.
- First line = path comment. No secrets. No fake data. Complete files only.
- No scope creep. Backend-only writes. Complete state file each batch.
- State file delivered as ONE complete markdown block.
