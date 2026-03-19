# Shreeji Clinic OPD

## Current State
The app stores patient basic records in the ICP backend, but prescription history, billing records, doctor accounts, nursing accounts, and UID counters are stored only in localStorage — making data inaccessible when switching devices.

## Requested Changes (Diff)

### Add
- Backend stable storage for prescription history (per patient, keyed by uid)
- Backend stable storage for billing records (per patient, keyed by uid)
- Backend stable storage for doctor accounts (userId, passwordHash, displayName)
- Backend stable storage for nursing accounts (userId, passwordHash, displayName)
- Backend stable storage for UID counter (per MMYY key)
- Backend query/update functions for all new data types
- Frontend sync: all writes go to backend + localStorage; on app load, fetch everything from backend as source of truth

### Modify
- Patient record in backend to include vitals (bp, pulse, spo2) fields
- App startup: load all data from backend, merge with local cache
- Registration, prescription save, billing save, account management — all sync to backend

### Remove
- Nothing removed from existing frontend features

## Implementation Plan
1. Extend Motoko backend with stable maps for: prescriptions, bills, doctorAccounts, nursingAccounts, uidCounters
2. Add CRUD functions for each new data type
3. Update frontend to sync all data to/from backend on every read/write operation
4. On app load, pull all data from backend and update localStorage as local cache
5. Ensure offline fallback: if backend call fails, use localStorage data
