# Shreeji Clinic OPD

## Current State
The app has Certificate (Rest/Fitness) generation for patients accessible from the Dashboard patient cards. It generates a styled A4 PDF with clinic header, patient info band, certificate body, doctor stamp, and footer.

## Requested Changes (Diff)

### Add
- **Referral Letter** feature: A button on the Dashboard patient card (visible to doctors only, not nursing) that opens a `ReferralDialog`.
- `ReferralDialog` component with fields:
  - Doctor (referring doctor — Dr. Dhravid Patel / Dr. Zeel Patel)
  - Referred To Doctor Name (free text input)
  - Referred To Department / Speciality (free text, e.g. Orthopedics, Cardiology)
  - Hospital / Clinic Name (free text, optional)
  - Reason for Referral / Diagnosis (textarea)
  - Urgency (Normal / Urgent — toggle)
  - Remarks (optional textarea)
- `generateReferralPDF` function that creates a styled A4 PDF with:
  - Same clinic header style as Certificate (blue band, logo 22mm, clinic name, referring doctor name + credentials, date)
  - Patient info band (UID, Name, Age/Sex, Contact, Date)
  - "REFERRAL LETTER" title with underline (red)
  - Body text: "Dear Dr. [RefTo], We are referring our patient [Name], Age [age], UID [uid], for your expert opinion and management. Diagnosis/Reason: [reason]. Urgency: [Normal/Urgent]." etc.
  - Remarks section if provided
  - Signature area with referring doctor name, credentials, stamp
  - Footer: "We listen, We Care, We Heal."
  - No center watermark (same as certificates)

### Modify
- `DashboardView` component: Add `onReferral` prop and a "Referral" button (teal/cyan colored) next to the Certificate button for non-nursing users.
- Main `App` component: Add `referralPatient` state and wire up `ReferralDialog`.

### Remove
- Nothing

## Implementation Plan
1. Add `generateReferralPDF` async function after `generateCertificatePDF`.
2. Add `ReferralDialog` component after `CertificateDialog`.
3. Add `onReferral` to `DashboardView` props and add Referral button to patient card action buttons.
4. Add `referralPatient` state in main App, pass `onReferral` to `DashboardView`, render `<ReferralDialog>`.
