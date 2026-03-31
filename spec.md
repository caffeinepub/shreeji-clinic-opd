# Shreeji Clinic OPD

## Current State
The Follow-up Dialog (`FollowUpDialog`) allows selecting a follow-up date and doctor, but does NOT have Vitals (BP, Pulse, SpO2) fields. Vitals are only available during initial patient registration. The prescription page shows patient vitals from the `currentPatient.vitals` field.

There are also potential bugs around:
- `onConfirm` callback missing vitals propagation
- Vitals not updating on the patient record when a follow-up is confirmed
- Various TypeScript/runtime issues identified in previous versions

## Requested Changes (Diff)

### Add
- Vitals section (BP, Pulse, SpO2) in the FollowUpDialog — optional, mirrors the registration form layout
- Pass vitals from the FollowUpDialog to the onConfirm callback
- Update the patient's vitals on the selected patient when follow-up is confirmed, so the prescription paper reflects the new vitals

### Modify
- `FollowUpDialog` component: add vitals state, UI fields, pass in onConfirm
- `onConfirm` type signature: add optional vitals parameter
- Main app follow-up handler: apply new vitals to the patient before navigating to prescription

### Remove
- Nothing removed

## Implementation Plan
1. Update `FollowUpDialog` props: change `onConfirm` to include optional vitals `{ bp: string; pulse: string; spo2: string }`
2. Add vitals state inside `FollowUpDialog`, pre-populate from `patient.vitals`
3. Add Vitals UI section in the dialog (same 3-col grid as registration)
4. Pass vitals in `handleConfirm` call
5. In the main app `onConfirm` handler (line ~7080), merge vitals into `patientForFollowUp` before setting selected patient
6. Ensure vitals sync to cloud via existing `savePatientExtras` flow
