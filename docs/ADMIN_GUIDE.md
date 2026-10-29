<!-- docs/ADMIN_GUIDE.md -->
# Admin Guide

Sign in at `/admine/login` (`/admin` redirects there). Use the language toggle in the header to switch between Bengali and English.

If the page says the server is waking up, wait up to a minute and it retries automatically.

## What each role can do

| Area | super_admin | school_admin | accountant | teacher | admission_officer |
|---|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ✔ | ✔ | ✔ | ✔ | ✔ |
| Admissions | ✔ | ✔ |  |  | ✔ |
| Students | edit | edit | view | view | view |
| Teachers | edit | edit |  | view |  |
| Attendance | ✔ | ✔ |  | ✔ |  |
| Exams | edit | edit |  | view |  |
| Marks entry | ✔ | ✔ |  | ✔ |  |
| Notices, Gallery, FAQ, Contact | ✔ | ✔ |  |  |  |
| Payments, Invoices | ✔ | ✔ | ✔ |  |  |
| Expenses | ✔ | ✔ (can delete) | ✔ (cannot delete) |  |  |
| Reports | all tabs | all tabs | Finance | Attendance | Admissions |
| Settings | ✔ | ✔ |  |  |  |
| Users | ✔ |  |  |  |  |

## Admissions

1. Open **Admissions**. Filter by status (Submitted, Under review, Correction needed, Approved, Rejected) or search.
2. Open an application to see student, guardian and document details.
3. Choose an action:
   - **Mark under review**: no note needed.
   - **Request correction**: a note is required; the parent sees it on the status page.
   - **Reject**: a note is required.
   - **Approve**: opens a confirmation (optional note). Approval creates the student record and opens it.
4. Approved applications cannot be changed further.

## Students

- **New student**: name, class, roll (optional), guardian name and mobile (required), plus optional relation, NID, email, address. The student ID `TLFS-STU-YYYY-NNNN` is generated automatically.
- **Guardian mobile matters**: parents use it to look up results and submit payments. Accepted formats: `01XXXXXXXXX`, `+8801XXXXXXXXX`, `8801XXXXXXXXX`.
- **Import CSV** (max 200 rows, 1 MB, UTF-8). Required columns: `name`, `classId`, `guardianName`, `guardianMobile`. Optional: `roll`, `guardianRelation`, `guardianAddress`, `guardianNid`, `guardianEmail`. Unknown columns are rejected. `classId` is `play`, `nursery`, or `1`…`10`. Invalid rows are listed and skipped; valid rows are created one by one.
- **Deactivate** is a soft delete: the student disappears from rosters but their records remain.

## Teachers

Add or edit name, designation, subject, phone and email. Deleting a teacher is permanent. Mark them **Inactive** instead if you want to keep the record.

## Attendance

1. Pick a class and date (future dates are blocked).
2. Existing marks load automatically; students without a mark default to **present**.
3. Use the mark-all buttons or set each student to present / absent / late / leave, with an optional note.
4. **Save.** Saving again for the same day updates the records.

Notes: mark-all overwrites every row on screen, and there is no undo button (change the date and switch back to reload). Any teacher account can mark any class. A class roster is capped at 300 students.

## Exams, marks and results

1. **Exams → New exam**: name, class and subjects. For each subject set the full marks and optionally the pass marks (blank means 33% of full marks). Mark a subject **optional** if it only adds bonus points. At least one subject must be compulsory.
2. **Marks** (on each exam row): enter marks per student. A **blank cell means absent**, which fails that subject. Marks must be between 0 and the full marks. **Save** recalculates totals, grade and GPA.
3. **Publish** (writers only): the exam must have at least one saved result. Parents can then look up results with the exam, student ID and guardian mobile.
4. **Unpublish** removes the results from the public page immediately.

Good to know:
- Subjects cannot be edited, and the exam cannot be deleted, once any result exists.
- You can still edit marks after publishing. The public result changes immediately.
- Students you leave entirely blank are saved as absent in every subject (GPA 0.00). Enter marks only for students who sat the exam, or accept that blank rows count as absent.

## Notices

Create a notice with Bengali and English titles (required), optional descriptions, a date, an optional PDF (max 3 MB), and the **Published** and **Important** flags. Unpublished notices stay hidden from the public site. Deleting a notice also deletes its PDF.

## Gallery

Upload JPG, PNG or WebP images (max 3 MB) with captions, a category and a display order. You can edit captions, category, order and visibility later, but **not the image itself**: delete and upload again to replace it.

## FAQ

Add questions and answers in both languages. Use the up/down arrows to reorder (the list is renumbered each time). Unpublished entries are hidden from the public page.

## Contact messages

New messages are bold. Opening one marks it **Read**. Set the status to Replied or Archived yourself, add an internal note, or delete the message. Replies are sent outside this system (the panel shows the sender's email and phone).

## Payments (manual bKash / Nagad)

Parents submit a payment with the provider, TrxID, sender number, amount and an optional screenshot. They must supply the student ID and guardian mobile.

1. Open **Payments** and filter by **Pending**.
2. Check the TrxID and screenshot against your bKash/Nagad statement.
3. **Review → Verify** (or **Reject** with a required note). Verifying adds the amount to the linked invoice and updates its status (unpaid → partial → paid).
4. Reviewed payments cannot be reviewed again.

## Invoices

- **New invoice**: student ID, fee type (free text), amount, due date, optional note.
- Invoice status is driven by verified payments; there is no manual "mark as paid".
- **Cancel** is available only while nothing has been paid on the invoice.

## Expenses

Record category, amount, date and a description. The page total covers only the current page; use **Reports → Finance** for totals over a date range. Only super admin and school admin can delete expenses.

## Reports

- **Finance**: choose a range (up to 366 days; default is this month). Shows collected payments (by the date they were **reviewed**), expenses, net, and outstanding invoices (always current, not limited to the range). Export CSV from the page.
- **Admissions**: counts by status for the active session (or a session you enter).
- **Attendance**: range up to 92 days, optionally for one class. Percentage = (present + late) ÷ total.
- A "truncated" banner means the report hit its scan limit.

## Settings

Edit school name, address, phone, email and the **bKash/Nagad numbers**. The payment numbers are shown publicly, so double-check them before saving. Only changed fields are sent.

## Users (super admin only)

- **New user**: email, name, role and a password of at least 8 characters. Share it securely; the user cannot reset it themselves in v1.
- **Edit**: change name, role or Active/Inactive. Role changes and deactivation sign the user out. You cannot edit your own role or status.
- **Delete** is permanent (removes the login). Prefer **Inactive**.
- The last active super admin cannot be demoted, deactivated or deleted.
- To reset a password or change an email, use the Firebase console (Authentication).

## Tips

- Filters live in the page URL, so you can share or bookmark a filtered view.
- Student pages link to that student's attendance, invoices and payments.
- Student IDs are uppercase (`TLFS-STU-2026-0001`).
