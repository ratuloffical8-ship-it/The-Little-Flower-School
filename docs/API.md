<!-- docs/API.md -->
# API Reference

Base URL: the `tlfs-api` service (local: `http://localhost:3001`). All paths start with `/api`.

## Conventions

**Authentication**: admin endpoints need `Authorization: Bearer <Firebase ID token>`. A missing or invalid token returns `401`; a valid token with the wrong role returns `403`.

**Errors**: every error is JSON `{ "error": "<bilingual message>" }`. Validation errors (400) also include `details: [{ path, message }]`. Server errors (5xx) hide details in production. Unknown `/api/*` paths return a JSON 404.

**Generic lookup error**: public lookups return `404 { "error": "তথ্য মেলেনি / Details do not match" }` for **any** mismatch (wrong ID, wrong mobile, unpublished, wrong class). The cause is never revealed.

**Rate limits** (per client IP, in-memory) return `429` when exceeded:

| Endpoint | Limit |
|---|---|
| `POST /api/admission/apply` | 5/min |
| `POST /api/admission/status` | 10/min |
| `POST /api/contact` | 3/min |
| `POST /api/payments/submit` | 5/min |
| `POST /api/results/lookup` | 10/min |
| `GET /api/notices/:id/download` | 20/min |
| `GET /api/settings/public` | 60/min |
| `GET /api/health/deep` | 10/min |

**App Check**: when `RECAPTCHA_ENFORCE_APP_CHECK=true`, these POSTs need the header `X-Firebase-AppCheck: <token>` or get `401 { "error": "অ্যাপ যাচাই ব্যর্থ হয়েছে / App verification failed" }`: admission apply, admission status, contact, payments submit, results lookup.

**Pagination**: paginated lists take `page` and `pageSize` and return `{ items, total, page, pageSize }`. Other lists return `{ items }` (noted below).

**Dates and IDs**: dates are `YYYY-MM-DD`; "today" and range boundaries use Bangladesh time (UTC+6). Application ID `TLFS-APP-YYYY-NNNNNN`, student ID `TLFS-STU-YYYY-NNNN`. Class IDs: `play`, `nursery`, `1`…`10`.

**Multipart**: upload endpoints use `multipart/form-data`; max file size 3 MB (MIME-filtered). Non-file fields arrive as strings.

**Success shapes**: create/update → `{ success: true, item }` (some → `{ success: true, ... }`); delete → `{ success: true }`; bulk saves → `{ success: true, saved }`.

**Roles** (abbreviations used below): **SA** `super_admin`, **SC** `school_admin`, **AC** `accountant`, **TE** `teacher`, **AO** `admission_officer`.

---

## Health

| Method | Path | Response |
|---|---|---|
| GET | `/api/health` | `{ status: "ok", uptime, time }` (no Firestore, `Cache-Control: no-store`) |
| GET | `/api/health/deep` | `200 { status: "ok", checks: { firestore: "ok" } }` or `503 { status: "degraded", checks: { firestore: "unavailable" } }` |

## Public endpoints (no token)

### Admission
- `POST /api/admission/apply`: multipart; field list is defined by the admission form and `server/src/schemas/admission.schema.ts`. → `{ applicationId }`.
- `POST /api/admission/status`: verification details per `admission.schema.ts` (application ID plus guardian detail). → `{ status, correctionNote, studentNameBn, studentNameEn, classApplyingFor, submittedAt }` or the generic 404.

### Notices, gallery, FAQ, settings
- `GET /api/notices/published` → `{ items }` (newest first, max 100)
- `GET /api/notices/:id/download` → `{ url, expiresIn }` (signed PDF URL)
- `GET /api/gallery/published?category=` → `{ items }` (each with signed `imageUrl`, valid 60 min)
- `GET /api/gallery/categories` → categories of published items
- `GET /api/faq/published` → **raw array** (not wrapped), ordered by `order`
- `GET /api/settings/public` → `{ item }` (public subset of school settings, cacheable 5 min)

### Contact
- `POST /api/contact` JSON `{ name, email, phone, subject, message }` plus a hidden honeypot field `website` (must be empty). → `{ success: true }`. A filled honeypot also returns success but stores nothing.

### Payments
- `POST /api/payments/submit` multipart: `studentId`, `mobile` (guardian mobile), `provider` (`bkash` | `nagad`), `trxId`, `senderNumber`, `amount`, optional `invoiceId`, optional file `screenshot`. → `201 { success: true, paymentId }`. `404` generic on mismatch; `400` on duplicate (provider + TrxID) or invoice not payable.

### Results
- `GET /api/results/exams/published` → `{ items: [{ id, name, classId, sessionId }] }`
- `POST /api/results/lookup` JSON `{ examId, studentId, mobile }` → `{ exam: { id, name }, student: { studentId, name, classId, roll? }, subjects: [{ name, fullMarks, marks, percentage, grade, gradePoint, passed, isOptional }], total, fullTotal, percentage, gpa, grade, passed }` or the generic 404.

## Auth

- `POST /api/auth/verify`: validates the caller's token, returns their role, keeps the `users` document in sync, and performs inline super-admin bootstrap for `BOOTSTRAP_SUPER_ADMIN_EMAIL`.

---

## Admin endpoints

### Admissions (SA, SC, AO)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/admission` | Query `status`, `search`, `page`, `pageSize` → paginated |
| GET | `/api/admission/:id` | Application detail |
| PATCH | `/api/admission/:id/status` | Body `{ status, note? }`; status: `submitted`, `under_review`, `correction_needed`, `approved`, `rejected` |
| POST | `/api/admission/:id/approve` | Body `{ note? }`; creates the student record |

### Students
| Method | Path | Roles |
|---|---|---|
| GET | `/api/students` (`classId`, `sessionId`, `isActive`, `search` = ID prefix, `page`, `pageSize`) | SA, SC, AC, TE, AO |
| GET | `/api/students/:id` | SA, SC, AC, TE, AO |
| POST | `/api/students` body `{ name, classId, roll?, guardian: { name, mobile, relation?, address?, nid?, email? } }` | SA, SC |
| PUT | `/api/students/:id` (same fields, partial) | SA, SC |
| DELETE | `/api/students/:id` (soft: `isActive=false`) | SA, SC |

`sessionId` defaults to the active session on create.

### Teachers
| Method | Path | Roles |
|---|---|---|
| GET | `/api/teachers?isActive=` → `{ items }` | SA, SC, TE |
| GET | `/api/teachers/:id` | SA, SC, TE |
| POST / PUT | `/api/teachers[/:id]` body `{ name, designation?, subject?, phone?, email?, isActive }` | SA, SC |
| DELETE | `/api/teachers/:id` (hard delete) | SA, SC |

### Attendance (SA, SC, TE)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/attendance?classId=&date=` | → `{ items }` |
| POST | `/api/attendance/mark` | Body `{ classId, date, records: [{ studentId, status, note? }] }`; max 300 records; no future dates (BD time); status `present` \| `absent` \| `late` \| `leave`; all students must be active in that class → `{ success, saved }` |
| GET | `/api/attendance/student/:studentId?from=&to=` | Max range 366 days → `{ items, summary }` (percentage = (present + late) / total) |

### Exams (read: SA, SC, TE; write: SA, SC)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/exams?classId=&sessionId=&published=` | → `{ items }` |
| GET | `/api/exams/:id` | → `{ item }` |
| POST | `/api/exams` | Body `{ name, classId, sessionId?, subjects: [{ name, fullMarks, passMarks?, isOptional? }] }`; `passMarks` defaults to ceil(33% of `fullMarks`); at least one compulsory subject; unique subject names → `201 { success, item }` |
| PUT | `/api/exams/:id` | `{ name?, subjects? }`; subjects are locked once any result exists |
| PATCH | `/api/exams/:id/publish` | `{ published: boolean }`; publishing needs ≥ 1 result |
| DELETE | `/api/exams/:id` | Blocked if results exist |

### Results (read/enter: SA, SC, TE; delete: SA, SC)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/results/exam/:examId` | → `{ exam, items }` (joined with `studentName`, `roll`) |
| PUT | `/api/results/exam/:examId` | Body `{ entries: [{ studentId, marks: { [subject]: number \| null } }] }`; max 300; all-or-nothing validation; `null` = absent (fails the subject) → `{ success, saved }` |
| GET | `/api/results/exam/:examId/student/:studentId` | → `{ item }` |
| DELETE | `/api/results/exam/:examId/student/:studentId` | SA, SC |

Grading: Bangladesh 5.00 scale: 80+ A+ (5.00), 70+ A (4.00), 60+ A- (3.50), 50+ B (3.00), 40+ C (2.00), 33+ D (1.00), below 33 F (0.00). Any failed or absent compulsory subject gives F with GPA 0.00. Optional subjects add only points above 2.

### Notices (SA, SC)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/notices?published=&important=&page=&pageSize=` | Paginated |
| GET | `/api/notices/:id` | |
| POST | `/api/notices` | Multipart: `titleBn`, `titleEn`, `descriptionBn`, `descriptionEn`, `date`, `published`, `important`, optional file `pdf` |
| PUT | `/api/notices/:id` | JSON with the same fields, or multipart when replacing the PDF |
| DELETE | `/api/notices/:id` | Also deletes the stored PDF |

### Gallery (SA, SC)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/gallery?category=&published=&page=&pageSize=` | Paginated; items carry `imageUrl` |
| POST | `/api/gallery` | Multipart: file `image`, `captionBn`, `captionEn`, `category`, `order`, `published` |
| PUT | `/api/gallery/:id` | JSON metadata only (the image cannot be replaced) |
| DELETE | `/api/gallery/:id` | Also deletes the stored image |

### FAQ (SA, SC)
`GET /api/faq`, `GET /api/faq/:id`, `POST /api/faq`, `PUT /api/faq/:id` (body `{ questionBn, questionEn, answerBn, answerEn, published, order }`), `DELETE /api/faq/:id`, `POST /api/faq/reorder` (body `{ items: [{ id, order }] }`).

### Contact messages (SA, SC)
`GET /api/contact?status=` (`new` | `read` | `replied` | `archived`), `GET /api/contact/:id`, `PATCH /api/contact/:id` (body `{ status, note? }`), `DELETE /api/contact/:id`.

### Payments and invoices (SA, SC, AC)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/payments?status=&provider=&studentId=&page=&pageSize=` | Paginated; items carry a signed `screenshotUrl` |
| GET | `/api/payments/:id` | |
| PATCH | `/api/payments/:id/review` | Body `{ decision: "verified" \| "rejected", note? }`; verifying adds the amount to the linked invoice and recomputes its status |
| GET | `/api/payments/invoices?status=&studentId=&page=&pageSize=` | Paginated |
| POST | `/api/payments/invoices` | Body `{ studentId, feeType, amount, dueDate, note? }`; the student must exist |
| PATCH | `/api/payments/invoices/:id/cancel` | Blocked if already cancelled or `paidAmount > 0` |

Invoice status: `unpaid` \| `partial` \| `paid` \| `cancelled`. Payment status: `pending` \| `verified` \| `rejected`.

### Expenses
| Method | Path | Roles |
|---|---|---|
| GET | `/api/expenses?category=&from=&to=&page=&pageSize=` (max pageSize 100) | SA, SC, AC |
| GET | `/api/expenses/:id` → `{ item }` | SA, SC, AC |
| POST | `/api/expenses` body `{ category, amount (0.01–100,000,000), date, description? }` | SA, SC, AC |
| PUT | `/api/expenses/:id` (partial) | SA, SC, AC |
| DELETE | `/api/expenses/:id` (hard) | SA, SC |

### Reports (all → `{ item }`)
| Path | Roles | Notes |
|---|---|---|
| `GET /api/reports/dashboard` | all five roles | Counts only: active students and teachers, applications by status, pending payments, outstanding invoices, unread messages |
| `GET /api/reports/finance?from=&to=` | SA, SC, AC | Default range: current BD month; max 366 days. Collected = verified payments by **review** date; expenses by date; `outstanding` is current and not range-limited; `truncated` is true past 5000 documents |
| `GET /api/reports/admissions?sessionId=` | SA, SC, AO | Counts grouped by status; defaults to the active session |
| `GET /api/reports/attendance?from=&to=&classId=` | SA, SC, TE | Max 92 days; per-day totals and percentage |

### Settings
- `GET /api/settings` → `{ item }`; `PUT /api/settings` → `{ success, item }` (SA, SC). Strict partial body of `schoolName`, `address`, `phone`, `email`, `bkashNumber`, `nagadNumber`.

### Users (SA only)
`GET /api/users?role=` → `{ items }`; `GET /api/users/:uid`; `POST /api/users` (`{ email, password (≥ 8), name, role }`); `PUT /api/users/:uid` (`{ name?, role?, isActive? }`); `DELETE /api/users/:uid` (removes the Auth user and the document).
Rules: you cannot change your own role, deactivate or delete yourself, and the last active `super_admin` cannot be demoted, deactivated or deleted. Role changes and deactivation revoke refresh tokens. There is no password-reset endpoint in v1.

## Audit log

Admin writes record `actorUid`, `action`, `targetCollection`, `targetId` and a timestamp in `auditLogs` (for example `student.create`, `payment.verified`, `result.save`, `user.update`, `settings.update`). There is no API or UI to read them yet; use the Firestore console.
