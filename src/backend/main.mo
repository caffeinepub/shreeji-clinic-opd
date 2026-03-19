import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";

actor {
  type Patient = {
    uid : Text;
    name : Text;
    age : Nat;
    sex : Text;
    contact : Text;
    doctorName : Text;
    registrationDate : Text;
    canvasData : Text;
    historyNotes : Text;
    imageData : Text;
  };

  module Patient {
    public func compare(p1 : Patient, p2 : Patient) : Order.Order {
      Text.compare(p1.uid, p2.uid);
    };
    public func compareByName(p1 : Patient, p2 : Patient) : Order.Order {
      switch (Text.compare(p1.name, p2.name)) {
        case (#equal) { Text.compare(p1.uid, p2.uid) };
        case (order) { order };
      };
    };
  };

  // Existing patient records - unchanged for upgrade compatibility
  let records = Map.empty<Text, Patient>();

  // New: prescription history per patient (uid -> JSON array string)
  let prescriptions = Map.empty<Text, Text>();

  // New: billing records per patient (uid -> JSON array string)
  let bills = Map.empty<Text, Text>();

  // New: user accounts (userId -> JSON object string)
  let accounts = Map.empty<Text, Text>();

  // New: uid counters (key like "0326" -> counter value)
  let uidCounters = Map.empty<Text, Nat>();

  // New: patient extras (uid -> JSON with vitals, typedContent, etc.)
  let patientExtras = Map.empty<Text, Text>();

  // ─── Patient functions ───────────────────────────────────────────

  public query func getAllPatients() : async [Patient] {
    records.values().toArray().sort(Patient.compareByName);
  };

  public query func getPatientByUid(uid : Text) : async Patient {
    switch (records.get(uid)) {
      case (null) { Runtime.trap("No patient with that UID found") };
      case (?p) { p };
    };
  };

  public shared func register(patient : Patient) : async () {
    records.add(patient.uid, patient);
  };

  public shared func updatePatient(patient : Patient) : async Patient {
    if (not records.containsKey(patient.uid)) { Runtime.trap("No patient with that UID found") };
    records.add(patient.uid, patient);
    patient;
  };

  public shared func deletePatient(uid : Text) : async Patient {
    switch (records.get(uid)) {
      case (null) { Runtime.trap("No patient with that UID found") };
      case (?p) {
        records.remove(uid);
        patientExtras.remove(uid);
        p;
      };
    };
  };

  // ─── Patient Extras (vitals, etc.) ──────────────────────────────

  public shared func savePatientExtras(uid : Text, extrasJson : Text) : async () {
    patientExtras.add(uid, extrasJson);
  };

  public query func getPatientExtras(uid : Text) : async Text {
    switch (patientExtras.get(uid)) {
      case (null) { "{}" };
      case (?e) { e };
    };
  };

  public query func getAllPatientExtras() : async [(Text, Text)] {
    patientExtras.entries().toArray();
  };

  // ─── Prescription functions ──────────────────────────────────────

  public shared func savePrescriptions(uid : Text, prescriptionsJson : Text) : async () {
    prescriptions.add(uid, prescriptionsJson);
  };

  public query func getPrescriptions(uid : Text) : async Text {
    switch (prescriptions.get(uid)) {
      case (null) { "[]" };
      case (?p) { p };
    };
  };

  public query func getAllPrescriptions() : async [(Text, Text)] {
    prescriptions.entries().toArray();
  };

  // ─── Billing functions ───────────────────────────────────────────

  public shared func saveBills(uid : Text, billsJson : Text) : async () {
    bills.add(uid, billsJson);
  };

  public query func getBills(uid : Text) : async Text {
    switch (bills.get(uid)) {
      case (null) { "[]" };
      case (?b) { b };
    };
  };

  public query func getAllBills() : async [(Text, Text)] {
    bills.entries().toArray();
  };

  // ─── User Account functions ──────────────────────────────────────

  public shared func saveAccount(userId : Text, accountJson : Text) : async () {
    accounts.add(userId, accountJson);
  };

  public shared func deleteAccount(userId : Text) : async () {
    accounts.remove(userId);
  };

  public query func getAllAccounts() : async [(Text, Text)] {
    accounts.entries().toArray();
  };

  // Initialize default doctor accounts if none exist
  public shared func initDefaultAccounts() : async () {
    if (accounts.size() == 0) {
      accounts.add("dr.dhravid", "{\"userId\":\"dr.dhravid\",\"password\":\"dhravid@123\",\"displayName\":\"Dr. Dhravid Patel\",\"role\":\"doctor\"}");
      accounts.add("dr.zeel", "{\"userId\":\"dr.zeel\",\"password\":\"zeel@123\",\"displayName\":\"Dr. Zeel Patel\",\"role\":\"doctor\"}");
    };
  };

  // ─── UID Counter functions ───────────────────────────────────────

  public shared func setUidCounter(key : Text, value : Nat) : async () {
    uidCounters.add(key, value);
  };

  public query func getUidCounter(key : Text) : async Nat {
    switch (uidCounters.get(key)) {
      case (null) { 0 };
      case (?n) { n };
    };
  };

  public query func getAllUidCounters() : async [(Text, Nat)] {
    uidCounters.entries().toArray();
  };

  // ─── Bulk load for app startup ───────────────────────────────────

  public query func getAppState() : async {
    patients : [Patient];
    prescriptions : [(Text, Text)];
    bills : [(Text, Text)];
    accounts : [(Text, Text)];
    uidCounters : [(Text, Nat)];
    patientExtras : [(Text, Text)];
  } {
    {
      patients = records.values().toArray().sort(Patient.compareByName);
      prescriptions = prescriptions.entries().toArray();
      bills = bills.entries().toArray();
      accounts = accounts.entries().toArray();
      uidCounters = uidCounters.entries().toArray();
      patientExtras = patientExtras.entries().toArray();
    };
  };
};
