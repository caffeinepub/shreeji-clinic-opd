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
export interface backendInterface {
    deletePatient(uid: string): Promise<Patient>;
    getAllPatients(): Promise<Array<Patient>>;
    getPatientByUid(uid: string): Promise<Patient>;
    register(patient: Patient): Promise<void>;
    updatePatient(patient: Patient): Promise<Patient>;
}
