<!-- CHANGELOG.md -->
# Changelog

All notable changes to the TLFS website and management system.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); versions follow [SemVer](https://semver.org/).

## [1.0.0] - 2026-10-30

First complete release.

### Added

**Public website**
- Bilingual (Bengali primary, English toggle) public site with Bengali numerals and a mobile bottom navigation
- Online admission application and status lookup
- Notices (with PDF download), gallery with categories, FAQ, contact form (honeypot protected)
- Result lookup by exam + student ID + guardian mobile
- Manual fee payment submission (bKash / Nagad) with TrxID and optional screenshot

**Admin panel (`/admine`)**
- Five roles: super admin, school admin, accountant, teacher, admission officer, enforced by the API and reflected in the sidebar and dashboard
- Admissions review workflow with approval that creates the student (`TLFS-STU-YYYY-NNNN`)
- Students (with CSV import) and teachers management
- Daily attendance with per-student history and summary
- Exams with per-subject full/pass marks, optional subjects, marks entry, Bangladesh 5.00 GPA grading, and publish/unpublish
- Notices, gallery, FAQ (reorderable) and contact inbox management
- Invoices, payment review (verify/reject), and expenses
- Reports: finance, admissions, attendance (client-side CSV export)
- School settings and user management (create, role change, deactivate, delete)

**Backend**
- Express + TypeScript API on the Firebase Admin SDK, with Zod validation and a uniform `{ error }` format
- Firestore and Storage locked down to deny-all; private files served through short-lived signed URLs
- Firebase App Check middleware (opt-in), rate limiting on public endpoints, audit logging for admin writes
- Atomic ID counters (`TLFS-APP-…`, `TLFS-STU-…`), session handling, health checks (`/api/health`, `/api/health/deep`)
- CSV and PDF (embedded Bengali font) utilities
- Scripts: `bootstrap` (first super admin) and `seed` (classes and active session)

**Deployment & tooling**
- Render Blueprint (`render.yaml`) for the API and the static frontend
- Firebase configuration: deny-all rules, 34 composite indexes
- Black-box smoke test and a build-only GitHub Actions workflow
- Documentation: README, deployment, API, admin guide, backup/restore

### Known limitations (candidates for v2)

- **Exports:** the server CSV/PDF utilities have no endpoints, and the UI offers CSV only (client-side). There is no PDF export anywhere in the UI.
- **Accounts:** no self-service or admin password reset and no email change (use the Firebase console).
- **Teachers:** no teacher-to-class assignment; any teacher can mark attendance for, and enter marks in, any class.
- **Results lookup** uses the guardian's mobile number only (students have no date-of-birth field).
- **Academic sessions:** the active session is set once by `seed`; there is no UI or endpoint to switch it.
- **Scale:** class rosters are capped at 300 students; reports scan up to 5,000 documents (20,000 for attendance) and flag `truncated`; the rate limiter is in memory (single instance).
- **Payments:** reviewed payments cannot be re-reviewed from the UI; there are no invoice edits and no manual "mark paid".
- **Gallery:** an image cannot be replaced in place (delete and re-upload).
- **Audit log:** entries are written but there is no screen to browse them.
- **Cold starts:** the free Render API sleeps when idle (up to about 50 s to wake).
- **Privacy page** is still marked DRAFT.
- **Classes endpoint:** `/api/classes` does not exist; admin screens use a built-in list (`play`, `nursery`, `1`…`10`).

[1.0.0]: #100---2026-10-30
