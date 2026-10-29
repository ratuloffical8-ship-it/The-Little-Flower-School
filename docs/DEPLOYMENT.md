<!-- docs/DEPLOYMENT.md -->
# Deployment Guide

Target: Firebase (Auth, Firestore, Storage) + Render (API web service + static frontend).

## 0. Before you start

- Node.js ≥ 20.6 locally. Accounts: Firebase/Google, Render, GitHub.
- Commit **both** `package-lock.json` files (repo root and `server/`). `npm ci` on Render fails without them.
- `server/package.json` must define `build` (`tsc -p tsconfig.json`) and `start` (`node dist/index.js`) and the TypeScript output must land in `server/dist/`. `render.yaml` depends on this.
- `server/src/index.ts` must be wired (see the checklist in section 8). Until it is, the API serves nothing under `/api`.

## 1. Firebase project

1. Create a project in the Firebase console.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → create in production mode (the deny-all rules are deployed in step 3 below).
4. **Storage** → initialize the default bucket. Note the bucket name shown in the console; it becomes `FIREBASE_STORAGE_BUCKET`.
5. **Project settings → General → Your apps** → add a **Web app**. Copy the config values into the `VITE_FIREBASE_*` variables.
6. **Project settings → Service accounts → Generate new private key.** Keep the JSON file private and never commit it.

## 2. Service account → environment variable

```bash
# macOS / Linux: one line, no newlines
base64 -i service-account.json | tr -d '\n'
```

Paste the result as `FIREBASE_SERVICE_ACCOUNT_BASE64` (Render dashboard, or `server/.env` for local use). Delete the downloaded JSON when you are done.

## 3. Deploy rules and indexes

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes,storage
```

- Rules are deny-all on purpose. The backend uses the Admin SDK, which bypasses them.
- Index builds take a few minutes. Until they finish, filtered admin lists fail with an "index required" error.
- If a query still reports a missing index, open the link in the error, create it, and copy it into `firestore.indexes.json`.

## 4. reCAPTCHA v3 (App Check)

1. Create a reCAPTCHA v3 key (Google reCAPTCHA admin) for your frontend domain(s). Use the **site key** as `VITE_RECAPTCHA_SITE_KEY`.
2. Firebase console → **App Check** → register the web app with the reCAPTCHA v3 provider (it needs the matching secret key).
3. Leave enforcement **off** at first (see section 9).

## 5. Render: first deploy

1. Push the repo to GitHub.
2. Render → **New → Blueprint** → select the repo. Render reads `render.yaml` and creates two services:
   - `tlfs-api`: Node web service (free plan), root `server/`, health check `/api/health`
   - `tlfs-web`: static site, SPA rewrite to `/index.html`
3. Fill every variable marked `sync: false`:

| Service | Variables |
|---|---|
| `tlfs-api` | `FRONTEND_ORIGIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, optional `BOOTSTRAP_SUPER_ADMIN_EMAIL` |
| `tlfs-web` | `VITE_API_BASE_URL`, `VITE_SITE_URL`, all `VITE_FIREBASE_*`, `VITE_RECAPTCHA_SITE_KEY` |

4. **Order matters** because each service needs the other's URL:
   1. Deploy once with placeholders.
   2. When `tlfs-api` has a URL, set `VITE_API_BASE_URL` on `tlfs-web` (no trailing slash).
   3. When `tlfs-web` has a URL, set `FRONTEND_ORIGIN` on `tlfs-api` (comma-separate several origins) and `VITE_SITE_URL` on `tlfs-web`.
   4. **Redeploy `tlfs-web`.** `VITE_*` values are baked in at build time.
5. Add the frontend domain to the reCAPTCHA key's allowed domains.

> `render.yaml` uses `npm ci --include=dev` because `NODE_ENV=production` would otherwise skip `typescript` and `vite`.

## 6. Create the first super admin

Pick one method.

**A. Auto-promote on first login**
1. Firebase console → Authentication → **Add user** (the person's email + a password).
2. Set `BOOTSTRAP_SUPER_ADMIN_EMAIL` on `tlfs-api` to that email.
3. Log in at `/admine/login`. The account is promoted to `super_admin`.
4. Recommended: remove `BOOTSTRAP_SUPER_ADMIN_EMAIL` afterwards so a demoted account cannot be silently re-promoted.

**B. Local script**
```bash
cd server
# server/.env: FIREBASE_* variables, BOOTSTRAP_SUPER_ADMIN_EMAIL,
# and BOOTSTRAP_SUPER_ADMIN_PASSWORD (≥ 8 chars, only if the Auth user does not exist yet)
npm run bootstrap
```
The script re-enables an existing user, sets the role claim, revokes their refresh tokens, creates the `users` document, and ensures default settings exist. Never set the password variable on Render.

## 7. Seed reference data

```bash
cd server
npm run seed                      # classes Play, Nursery, 1–10 + active session (current BD year)
npm run seed -- --session 2026    # choose the session year explicitly
```
Idempotent: existing class documents are never changed, and an already-active session is never switched.

## 8. Wiring checklist (`server/src/index.ts`)

- Remove the old inline `/api/health` handler and the old inline error handler.
- Mount `app.use('/api/health', healthRoutes)` after helmet/CORS/`express.json()`.
- Add `X-Firebase-AppCheck` to CORS `allowedHeaders`.
- Register `app.post(APP_CHECK_PROTECTED_PATHS, verifyAppCheck)` before the routers.
- Mount all routers. `publicRoutes` on `/api/settings` **before** `settingsRoutes`.
- Finish with `app.use('/api', notFoundHandler)` and `app.use(errorHandler)`.

The exact code is in the project state file (CRITICAL block). Register every admin page in `App.tsx` (lazy, default import):
`/admine/admissions`, `/admissions/:id`, `/students`, `/students/:id`, `/teachers`, `/attendance`, `/exams`, `/exams/:examId/results`, `/notices`, `/gallery`, `/faq`, `/contact`, `/payments`, `/invoices`, `/expenses`, `/reports`, `/settings`, `/users`.

## 9. Enabling App Check enforcement

Do this only after confirming every public form sends the token:

1. `src/lib/api.ts` attaches an App Check token as `X-Firebase-AppCheck`.
2. `AdmissionForm.tsx` (it uses a direct `fetch`) also attaches it.
3. CORS `allowedHeaders` includes `X-Firebase-AppCheck`.
4. Set `RECAPTCHA_ENFORCE_APP_CHECK=true` on `tlfs-api` and redeploy.
5. Submit each public form once (apply, status check, contact, payment, result lookup).

Protected paths: admission apply, admission status, contact, payment submit, results lookup. Missing or invalid tokens get `401`. If forms break, set the variable back to `false`.

## 10. Verify the deployment

```bash
cd server
SMOKE_BASE_URL=https://<your-api>.onrender.com npm run test:smoke
SMOKE_WITH_DATA=1 SMOKE_BASE_URL=https://<your-api>.onrender.com npm run test:smoke   # includes Firestore reads
```

- The test waits up to 80 s for a sleeping free instance.
- The two validation checks expect `400`, so run them with App Check enforcement **off**.
- Re-running within one minute can hit rate limits (`429`).
- `GET /api/health` is liveness only. `GET /api/health/deep` also reads Firestore (limited to 10/min).

## 11. Operating notes

- **Cold starts:** the free API sleeps when idle and takes up to about 50 s to wake. The frontend shows a "server waking" banner and retries on 502/503/504.
- **Rate limiting** is in memory, per instance. Fine for one free instance; revisit if you scale out.
- **Updates:** `autoDeploy: true` redeploys on each push to the linked branch. Deploy rule/index changes separately with the Firebase CLI.
- **PDF util:** if you add PDF export endpoints, commit `HindSiliguri-Regular.ttf` (+ Bold) to `server/assets/fonts/`. Set `PDF_FONT_DIR` if the default path does not resolve from `dist/`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Everything under `/api` returns 404 | `index.ts` routers not wired |
| Render build: `tsc: not found` / `vite: not found` | Build command missing `--include=dev` |
| Browser CORS error | `FRONTEND_ORIGIN` does not exactly match the site origin (scheme + host, no trailing slash) |
| Admin list fails with "index required" | Indexes still building, or an index is missing |
| Public forms return 401 | App Check enforced but the frontend does not send the token |
| Frontend calls `localhost` | `VITE_API_BASE_URL` not set, or `tlfs-web` not redeployed after setting it |
| Login works but the admin panel says no role | User has no `role` claim; use the bootstrap steps |
| Settings save returns 400 | Field names in `SettingsPage.tsx` do not match `settings.service.ts` |
