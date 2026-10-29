<!-- docs/BACKUP.md -->
# Backup & Restore

What lives where:

| Data | Where | Backed up by |
|---|---|---|
| Code, rules, indexes, `render.yaml` | Git (GitHub) | Git history |
| Firestore data (incl. `auditLogs`, `counters`) | Cloud Firestore | **You** (this guide) |
| Uploaded files (notice PDFs, gallery images, payment screenshots, admission documents) | Firebase Storage bucket | **You** |
| Login accounts and role claims | Firebase Authentication | **You** (`auth:export`) |
| Secrets (service account, env vars) | Render dashboard / your password manager | **You** |

## 1. Firestore

Managed export needs the Firebase **Blaze (pay-as-you-go)** plan and the `gcloud` CLI.

```bash
# One-time: a dedicated, private bucket for backups (not the file-storage bucket)
gcloud storage buckets create gs://<project-id>-tlfs-backups --location=<region> --project=<project-id>

# Export everything
gcloud firestore export gs://<project-id>-tlfs-backups/firestore/$(date +%F) --project=<project-id>
```

Recommended cadence: weekly, and before any bulk change (large CSV imports, deleting exams, schema changes). Keep the bucket private and restrict IAM to the people who manage backups.

Also consider enabling **Point-in-Time Recovery** for Firestore in the console. It lets you restore the database to a recent moment after an accidental delete.

## 2. Storage files

The Storage bucket is a normal Google Cloud Storage bucket.

```bash
gcloud storage rsync --recursive gs://<storage-bucket> gs://<project-id>-tlfs-backups/storage/$(date +%F) --project=<project-id>
# or to a local disk
gcloud storage rsync --recursive gs://<storage-bucket> ./backup-storage
```

Payment screenshots and admission documents can contain personal data. Treat copies as sensitive.

## 3. Authentication accounts

```bash
firebase auth:export users.json --format=json --project <project-id>
```

The file contains password hashes. Store it encrypted, never in the repository. Role claims are also mirrored in the `users` collection, which the Firestore export covers. After restoring accounts, re-check each user's role in **Admin → Users**, because custom claims are re-applied only when roles are saved.

## 4. Secrets and key rotation

Keep an offline record (password manager) of: Firebase web config, the reCAPTCHA keys, and who holds the service-account key. Do **not** store the service-account JSON in the repo.

**Rotate the service account key** (do this if it may have leaked, and periodically):
1. Google Cloud console → IAM → Service accounts → select the Firebase Admin SDK account → **Keys → Add key** (JSON).
2. `base64 -i new-key.json | tr -d '\n'` and set it as `FIREBASE_SERVICE_ACCOUNT_BASE64` on `tlfs-api`.
3. Redeploy and confirm `GET /api/health/deep` returns `ok`.
4. **Delete the old key** in the console, then delete the local JSON files.

## 5. Restore

> Restoring **overwrites** documents that have the same IDs. Restore into a scratch project first when possible.

**Firestore**
```bash
gcloud firestore import gs://<project-id>-tlfs-backups/firestore/<DATE> --project=<project-id>
# optionally limit to some collections:
#   --collection-ids=students,results
```
Imported documents replace existing ones with the same ID; documents created after the backup are not removed. Re-deploy `firestore.indexes.json` if indexes are missing.

**Storage**
```bash
gcloud storage rsync --recursive gs://<project-id>-tlfs-backups/storage/<DATE> gs://<storage-bucket> --project=<project-id>
```

**Auth**
```bash
firebase auth:import users.json --hash-algo=SCRYPT --hash-key=<key> --salt-separator=<sep> --rounds=8 --mem-cost=14 --project <project-id>
```
Use the hash parameters shown in the Firebase console (Authentication → Users → ⋮ → Password hash parameters).

## 6. Restore drill (do once a term)

1. Create a scratch Firebase project and enable Firestore.
2. Import the latest Firestore export there.
3. Point a local backend at the scratch project and run `npm run test:smoke` with `SMOKE_WITH_DATA=1`.
4. Spot-check a few students, an exam result and an invoice in the admin panel.
5. Write down how long it took and what was missing.

## 7. After a restore: check these

- `counters` documents match the highest issued IDs. If you restored an old copy, newly generated student, application, invoice or payment IDs could collide with records created after the backup.
- Exactly one active session exists.
- Published exams still have results; invoice `paidAmount` values match verified payments.
- At least one active `super_admin` can sign in.
