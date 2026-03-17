# Shreeji Clinic OPD

## Current State
Full-featured clinic management app with prescription (stylus + typed), billing, referral letters, certificates, backup/restore, nursing user role, PWA support.

## Requested Changes (Diff)

### Add
1. **Palm rejection / stylus-only mode** on prescription canvas: enable `touch-action: none` with pointer event filtering so only stylus (pointerType === 'pen') strokes are accepted; palm/finger touches are ignored entirely during drawing.
2. **Referral doctor contact number** field in the referral letter dialog.
3. **WhatsApp message to referral doctor**: after filling the referral form, a "Send WhatsApp" button opens `https://wa.me/<referralDoctorPhone>?text=<message>` with patient details and referral reason.
4. **Vitals fields in patient registration** (optional, not mandatory): Blood Pressure, Pulse, SpO2. These fields are stored with the patient visit and shown only on the prescription paper header / PDF — not shown in dashboard or billing.
5. **Fix download/export/backup on installed PWA**: ensure CSV export, JSON backup, and PDF downloads use Blob + `<a download>` pattern compatible with installed PWA mode; avoid methods that break in standalone mode.

### Modify
- Prescription canvas pointer event handler: filter to only process `pointerType === 'pen'` events, ignore `touch` and `mouse` pointer types.
- Referral dialog: add contact number input field.
- Referral PDF and WhatsApp message: include referral doctor contact number.
- Patient registration form: add optional Vitals section (BP, Pulse, SpO2).
- Prescription paper header / PDF: show vitals if present.
- All download functions (backup JSON, billing CSV, prescription PDF, bill PDF): use robust Blob URL approach with `URL.createObjectURL` + `a.click()` + `URL.revokeObjectURL`.

### Remove
Nothing removed.

## Implementation Plan
1. Read App.tsx in sections to understand canvas pointer handlers, referral dialog, registration form, and all download functions.
2. Update canvas `onPointerDown/Move/Up` handlers to check `e.pointerType === 'pen'` and skip otherwise.
3. Add `referralDoctorPhone` state to referral dialog; add input field; include in PDF and WhatsApp message.
4. Add optional vitals fields (BP, Pulse, SpO2) to registration and follow-up forms; store in patient/visit data; display on prescription paper header and in PDF.
5. Audit all download/export/backup calls and replace any `window.open`, `document.execCommand`, or problematic patterns with `URL.createObjectURL(blob)` + hidden anchor click + `revokeObjectURL`.
6. Validate and deploy.
