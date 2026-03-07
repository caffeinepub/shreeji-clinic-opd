import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";

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

  let records = Map.empty<Text, Patient>();

  public query ({ caller }) func getAllPatients() : async [Patient] {
    records.values().toArray().sort(Patient.compareByName);
  };

  public query ({ caller }) func getPatientByUid(uid : Text) : async Patient {
    switch (records.get(uid)) {
      case (null) { Runtime.trap("No patient with that UID found") };
      case (?p) { p };
    };
  };

  // Accepts either with or without UID
  public shared ({ caller }) func register(patient : Patient) : async () {
    records.add(patient.uid, patient);
  };

  public shared ({ caller }) func updatePatient(patient : Patient) : async Patient {
    if (not records.containsKey(patient.uid)) { Runtime.trap("No patient with that UID found") };
    records.add(patient.uid, patient);
    patient;
  };

  public shared ({ caller }) func deletePatient(uid : Text) : async Patient {
    switch (records.get(uid)) {
      case (null) { Runtime.trap("No patient with that UID found") };
      case (?p) {
        records.remove(uid);
        p;
      };
    };
  };
};
