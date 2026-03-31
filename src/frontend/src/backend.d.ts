import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Patient {
    age: bigint;
    sex: string;
    uid: string;
    contact: string;
    imageData: string;
    canvasData: string;
    name: string;
    historyNotes: string;
    doctorName: string;
    registrationDate: string;
}
export interface AppState {
    patients: Array<Patient>;
    prescriptions: Array<[string, string]>;
    bills: Array<[string, string]>;
    accounts: Array<[string, string]>;
    uidCounters: Array<[string, bigint]>;
    patientExtras: Array<[string, string]>;
}
export interface backendInterface {
    deletePatient(uid: string): Promise<Patient>;
    getAllPatients(): Promise<Array<Patient>>;
    getPatientByUid(uid: string): Promise<Patient>;
    register(patient: Patient): Promise<void>;
    updatePatient(patient: Patient): Promise<Patient>;
    savePatientExtras(uid: string, extrasJson: string): Promise<void>;
    getPatientExtras(uid: string): Promise<string>;
    getAllPatientExtras(): Promise<Array<[string, string]>>;
    savePrescriptions(uid: string, prescriptionsJson: string): Promise<void>;
    getPrescriptions(uid: string): Promise<string>;
    getAllPrescriptions(): Promise<Array<[string, string]>>;
    saveBills(uid: string, billsJson: string): Promise<void>;
    getBills(uid: string): Promise<string>;
    getAllBills(): Promise<Array<[string, string]>>;
    saveAccount(userId: string, accountJson: string): Promise<void>;
    deleteAccount(userId: string): Promise<void>;
    getAllAccounts(): Promise<Array<[string, string]>>;
    initDefaultAccounts(): Promise<void>;
    setUidCounter(key: string, value: bigint): Promise<void>;
    getUidCounter(key: string): Promise<bigint>;
    getAllUidCounters(): Promise<Array<[string, bigint]>>;
    getAppState(): Promise<AppState>;
}
