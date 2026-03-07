import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Toaster } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useActor } from "@/hooks/useActor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarPlus,
  ChevronLeft,
  Clock,
  Copy,
  Download,
  Eraser,
  FileText,
  Loader2,
  LogOut,
  MessageSquare,
  PenLine,
  Plus,
  Printer,
  Redo2,
  Search,
  Stethoscope,
  Trash2,
  Undo2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { Patient } from "./backend.d.ts";
import {
  type AuthSession,
  LoginPage,
  clearSession,
  getSession,
} from "./components/LoginPage";

// ── PWA Install Banner ─────────────────────────────────────────────────────

function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<
    | (Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      })
    | null
  >(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("pwa_banner_dismissed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dismissed) return;
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as typeof deferredPrompt);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      toast.success("App installed successfully!");
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowBanner(false);
    setDismissed(true);
    try {
      localStorage.setItem("pwa_banner_dismissed", "true");
    } catch {}
  }

  if (!showBanner || dismissed) return null;

  return (
    <div
      className="no-print fixed bottom-0 left-0 right-0 z-50 p-3 bg-clinic-blue text-white shadow-lg flex items-center gap-3"
      data-ocid="pwa.install_banner"
    >
      <img
        src="/assets/generated/pwa-icon-192x192.dim_192x192.png"
        alt="App Icon"
        className="w-10 h-10 rounded-xl flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight">
          Install Shreeji Clinic OPD
        </p>
        <p className="text-white/80 text-xs mt-0.5">
          Add to your home screen for quick access
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleInstall}
          className="bg-white text-clinic-blue text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-white/90 transition-colors"
          data-ocid="pwa.install_button"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-white/70 hover:text-white p-1.5"
          data-ocid="pwa.dismiss_button"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

type Page = "dashboard" | "register" | "prescription";

interface LocalPatient {
  uid: string;
  name: string;
  age: number;
  sex: string;
  contact: string;
  registrationDate: string;
  doctorName: string;
  imageData: string;
  canvasData: string;
  historyNotes: string;
}

interface PrescriptionRecord {
  date: string;
  canvasData: string;
  pages?: string[]; // all pages as base64 dataURLs
  savedAt: string; // ISO timestamp
  followUpDate?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toLocalPatient(p: Patient): LocalPatient {
  return { ...p, age: Number(p.age) };
}

function toBackendPatient(p: LocalPatient): Patient {
  return { ...p, age: BigInt(p.age) };
}

function generateUID(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `UID-${datePart}-${rand}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadLocalPatients(): LocalPatient[] {
  try {
    const raw = localStorage.getItem("shreeji_patients");
    return raw ? (JSON.parse(raw) as LocalPatient[]) : [];
  } catch {
    return [];
  }
}

function saveLocalPatients(patients: LocalPatient[]): void {
  localStorage.setItem("shreeji_patients", JSON.stringify(patients));
}

function loadPrescriptionHistory(uid: string): PrescriptionRecord[] {
  try {
    const raw = localStorage.getItem(`shreeji_rx_history_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePrescriptionHistory(
  uid: string,
  records: PrescriptionRecord[],
): void {
  localStorage.setItem(`shreeji_rx_history_${uid}`, JSON.stringify(records));
}

const COLORS = [
  { name: "black", value: "#000000", label: "Black" },
  { name: "blue", value: "#1a56db", label: "Blue" },
  { name: "red", value: "#e02424", label: "Red" },
  { name: "green", value: "#057a55", label: "Green" },
  { name: "purple", value: "#7e3af2", label: "Purple" },
] as const;

// ── Header ─────────────────────────────────────────────────────────────────

function Header({
  onNavigate,
  currentPage,
  session,
  onLogout,
}: {
  onNavigate: (p: Page) => void;
  currentPage: Page;
  session: AuthSession;
  onLogout: () => void;
}) {
  return (
    <header className="clinic-header-gradient text-white shadow-md no-print">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex items-center gap-3 hover:opacity-90 transition-opacity flex-shrink-0"
          onClick={() => onNavigate("dashboard")}
        >
          <img
            src="/assets/generated/logo-white-circle.dim_400x400.png"
            alt="Shreeji Clinic Logo"
            className="w-12 h-12 object-cover rounded-full"
          />
          <div className="text-left">
            <h1 className="font-display text-xl font-bold leading-none">
              Shreeji Clinic
            </h1>
            <p className="text-xs text-white/70 mt-0.5">
              OPD Management System
            </p>
          </div>
        </button>
        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              currentPage === "dashboard"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Patients</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("register")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              currentPage === "register"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Register</span>
          </button>

          {/* Doctor badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 text-white/90 text-sm font-medium ml-1 border border-white/20"
            data-ocid="header.doctor_badge"
          >
            <Stethoscope className="w-3.5 h-3.5 text-white/70" />
            <span>{session.displayName}</span>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-white/70 hover:text-white hover:bg-white/10"
            title="Logout"
            data-ocid="header.logout_button"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────

function DashboardPage({
  patients,
  isLoading,
  onNewPatient,
  onViewPrescription,
  onDeletePatient,
  onViewHistory,
  onFollowUp,
}: {
  patients: LocalPatient[];
  isLoading: boolean;
  onNewPatient: () => void;
  onViewPrescription: (p: LocalPatient) => void;
  onDeletePatient: (uid: string) => void;
  onViewHistory: (p: LocalPatient) => void;
  onFollowUp: (p: LocalPatient) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.uid.toLowerCase().includes(search.toLowerCase()),
  );

  function exportToExcel() {
    const headers = [
      "UID",
      "Name",
      "Age",
      "Sex",
      "Contact",
      "Doctor",
      "Registration Date",
    ];
    const rows = patients.map((p) => [
      p.uid,
      p.name,
      String(p.age),
      p.sex,
      p.contact,
      p.doctorName,
      p.registrationDate,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shreeji-clinic-patients-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV file exported successfully");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" data-ocid="dashboard.page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Patient Dashboard
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {patients.length} registered patient
            {patients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            className="gap-2"
            onClick={exportToExcel}
            data-ocid="dashboard.export_excel_button"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
          <Button
            className="gap-2 bg-clinic-red hover:bg-clinic-red/90 text-white"
            onClick={onNewPatient}
            data-ocid="dashboard.new_patient_button"
          >
            <Plus className="w-4 h-4" />
            New Patient
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or UID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-ocid="dashboard.search_input"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div
          className="flex items-center justify-center py-20 text-muted-foreground gap-2"
          data-ocid="dashboard.loading_state"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading patients...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
          data-ocid="dashboard.empty_state"
        >
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg text-foreground mb-1">
            {search ? "No patients found" : "No patients registered yet"}
          </h3>
          <p className="text-muted-foreground text-sm mb-5">
            {search
              ? "Try a different search term"
              : "Start by registering your first patient"}
          </p>
          {!search && (
            <Button
              onClick={onNewPatient}
              className="gap-2 bg-clinic-red hover:bg-clinic-red/90 text-white"
            >
              <Plus className="w-4 h-4" />
              Register Patient
            </Button>
          )}
        </div>
      ) : (
        <div
          className="rounded-lg border border-border overflow-hidden bg-card"
          data-ocid="dashboard.patient_list"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="font-semibold">UID</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Age/Sex</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">
                  Doctor
                </TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">
                  Date
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((patient, idx) => (
                <TableRow
                  key={patient.uid}
                  className="hover:bg-accent/30 transition-colors"
                  data-ocid={`dashboard.patient.item.${idx + 1}`}
                >
                  <TableCell>
                    <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
                      {patient.uid}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {patient.age}y / {patient.sex}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className="text-xs">
                      {patient.doctorName}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell text-sm">
                    {patient.registrationDate}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => onViewPrescription(patient)}
                        data-ocid={`dashboard.view_prescription_button.${idx + 1}`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Prescription
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => onViewHistory(patient)}
                        data-ocid={`dashboard.view_history_button.${idx + 1}`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        History
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs text-clinic-blue border-clinic-blue/30 hover:bg-clinic-blue/10 hover:text-clinic-blue"
                        onClick={() => onFollowUp(patient)}
                        data-ocid={`dashboard.followup_button.${idx + 1}`}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        Follow-up
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 w-8 h-8 p-0"
                        onClick={() => onDeletePatient(patient.uid)}
                        data-ocid={`dashboard.patient.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Registration ───────────────────────────────────────────────────────────

function RegistrationPage({
  onSave,
  onCancel,
}: {
  onSave: (p: LocalPatient) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<
    Omit<LocalPatient, "imageData" | "canvasData" | "historyNotes">
  >({
    uid: generateUID(),
    name: "",
    age: 0,
    sex: "Male",
    contact: "",
    registrationDate: todayStr(),
    doctorName: "Dr. Dhravid",
  });
  const [isSaving, setIsSaving] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Patient name is required");
      return;
    }
    if (!form.age || form.age <= 0) {
      toast.error("Valid age is required");
      return;
    }
    setIsSaving(true);
    const patient: LocalPatient = {
      ...form,
      imageData: "[]",
      canvasData: "",
      historyNotes: JSON.stringify({
        chiefComplaint: "",
        pastHistory: "",
        examinationFindings: "",
        diagnosis: "",
        treatment: "",
      }),
    };
    onSave(patient);
  }

  function copyUID() {
    navigator.clipboard.writeText(form.uid);
    toast.success("UID copied to clipboard");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-display text-2xl font-bold">
            Patient Registration
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Fill in the details to register a new patient
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-xl p-6 space-y-5"
      >
        {/* UID */}
        <div className="space-y-1.5">
          <Label htmlFor="uid">UID Number</Label>
          <div className="flex gap-2">
            <Input
              id="uid"
              value={form.uid}
              readOnly
              className="font-mono bg-secondary text-secondary-foreground"
              data-ocid="registration.uid_input"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyUID}
              title="Copy UID"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Patient Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Enter full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            data-ocid="registration.name_input"
          />
        </div>

        {/* Age + Sex */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="age">
              Age <span className="text-destructive">*</span>
            </Label>
            <Input
              id="age"
              type="number"
              min={0}
              max={150}
              placeholder="Years"
              value={form.age || ""}
              onChange={(e) =>
                setForm({ ...form, age: Number.parseInt(e.target.value) || 0 })
              }
              required
              data-ocid="registration.age_input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sex">Sex</Label>
            <Select
              value={form.sex}
              onValueChange={(v) => setForm({ ...form, sex: v })}
            >
              <SelectTrigger id="sex" data-ocid="registration.sex_select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-1.5">
          <Label htmlFor="contact">Contact Number</Label>
          <Input
            id="contact"
            type="tel"
            placeholder="+91 XXXXX XXXXX"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            data-ocid="registration.contact_input"
          />
        </div>

        {/* Date + Doctor */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="reg-date">Registration Date</Label>
            <Input
              id="reg-date"
              type="date"
              value={form.registrationDate}
              onChange={(e) =>
                setForm({ ...form, registrationDate: e.target.value })
              }
              data-ocid="registration.date_input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doctor">Doctor</Label>
            <Select
              value={form.doctorName}
              onValueChange={(v) => setForm({ ...form, doctorName: v })}
            >
              <SelectTrigger id="doctor" data-ocid="registration.doctor_select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dr. Dhravid">Dr. Dhravid</SelectItem>
                <SelectItem value="Dr. Zeel">Dr. Zeel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            data-ocid="registration.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-clinic-red hover:bg-clinic-red/90 text-white gap-2"
            disabled={isSaving}
            data-ocid="registration.submit_button"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Save &amp; Open Prescription
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Drawing Canvas ─────────────────────────────────────────────────────────

type Tool = "pen" | "eraser";

function DrawingCanvas({
  canvasRef,
  onSnapshot,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onSnapshot: (dataUrl: string) => void;
}) {
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [canvasRef]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function pushSnapshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const snap = canvas.toDataURL("image/png");
    setUndoStack((prev) => [...prev, snap]);
    setRedoStack([]);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    pushSnapshot();
    isDrawing.current = true;
    lastPoint.current = getPos(e);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing.current || !lastPoint.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "white";
      ctx.lineWidth = strokeWidth * 4;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPoint.current = pos;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    isDrawing.current = false;
    lastPoint.current = null;
    if (canvasRef.current) {
      onSnapshot(canvasRef.current.toDataURL("image/png"));
    }
  }

  function handlePointerLeave(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    isDrawing.current = false;
    lastPoint.current = null;
  }

  function undo() {
    if (undoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const current = canvas.toDataURL("image/png");
    setRedoStack((prev) => [...prev, current]);
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      onSnapshot(canvas.toDataURL("image/png"));
    };
    img.src = prev;
  }

  function redo() {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const current = canvas.toDataURL("image/png");
    setUndoStack((prev) => [...prev, current]);
    const next = redoStack[redoStack.length - 1];
    setRedoStack((stack) => stack.slice(0, -1));
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      onSnapshot(canvas.toDataURL("image/png"));
    };
    img.src = next;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setUndoStack([]);
    setRedoStack([]);
    onSnapshot(canvas.toDataURL("image/png"));
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border no-print">
        {/* Tool toggle */}
        <div className="flex rounded-md overflow-hidden border border-border">
          <button
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
              tool === "pen"
                ? "bg-clinic-blue text-white"
                : "bg-card text-muted-foreground hover:bg-accent"
            }`}
            onClick={() => setTool("pen")}
            data-ocid="prescription.pen_tool_button"
          >
            <PenLine className="w-4 h-4" />
            Pen
          </button>
          <button
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
              tool === "eraser"
                ? "bg-clinic-blue text-white"
                : "bg-card text-muted-foreground hover:bg-accent"
            }`}
            onClick={() => setTool("eraser")}
            data-ocid="prescription.eraser_tool_button"
          >
            <Eraser className="w-4 h-4" />
            Eraser
          </button>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.label}
              className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                color === c.value
                  ? "border-foreground scale-110 ring-2 ring-offset-1 ring-foreground/30"
                  : "border-border"
              }`}
              style={{ backgroundColor: c.value }}
              onClick={() => {
                setColor(c.value);
                setTool("pen");
              }}
              data-ocid={`prescription.color_${c.name}`}
            />
          ))}
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Size: {strokeWidth}px
          </span>
          <Slider
            min={1}
            max={20}
            step={1}
            value={[strokeWidth]}
            onValueChange={([v]) => setStrokeWidth(v)}
            className="w-20"
            data-ocid="prescription.stroke_slider"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8"
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo"
            data-ocid="prescription.undo_button"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8"
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo"
            data-ocid="prescription.redo_button"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8"
            onClick={clearCanvas}
            title="Clear Canvas"
            data-ocid="prescription.clear_button"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Canvas — A4 aspect ratio (794 × 1123 px @ 96 dpi) */}
      <div className="border border-border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={794}
          height={1123}
          className="w-full"
          style={{
            touchAction: "none",
            cursor: tool === "eraser" ? "cell" : "crosshair",
            aspectRatio: "794 / 1123",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          data-ocid="prescription.canvas_target"
        />
      </div>
    </div>
  );
}

// ── Image Upload Panel ─────────────────────────────────────────────────────

function ImageUploadPanel({
  images,
  onAdd,
  onDelete,
}: {
  images: string[];
  onAdd: (base64: string) => void;
  onDelete: (idx: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onAdd(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <label
        htmlFor="image-upload-input"
        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-clinic-red hover:bg-clinic-red-light/30 transition-colors block"
        data-ocid="prescription.dropzone"
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="font-medium text-sm">Upload from Camera or Gallery</p>
        <p className="text-xs text-muted-foreground mt-1">
          Click to browse or take a photo
        </p>
        <input
          id="image-upload-input"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFileChange}
          data-ocid="prescription.image_upload_button"
        />
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div
              key={`img-${idx}-${img.slice(22, 30)}`}
              className="relative group rounded-lg overflow-hidden border border-border aspect-square"
            >
              <img
                src={img}
                alt={`Upload ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDelete(idx)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {images.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No images uploaded yet
        </p>
      )}
    </div>
  );
}

// ── Patient History Modal ──────────────────────────────────────────────────

function PatientHistoryModal({
  uid,
  patientName,
  open,
  onClose,
  onEdit,
}: {
  uid: string;
  patientName: string;
  open: boolean;
  onClose: () => void;
  onEdit: (record: PrescriptionRecord) => void;
}) {
  const [selectedRecord, setSelectedRecord] =
    useState<PrescriptionRecord | null>(null);
  const history = uid ? loadPrescriptionHistory(uid) : [];

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (!open) setSelectedRecord(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        data-ocid="history.modal"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Prescription History — {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
          {/* Records list */}
          <div className="w-64 flex-shrink-0 overflow-y-auto border-r border-border pr-4 space-y-2">
            {history.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-center"
                data-ocid="history.empty_state"
              >
                <FileText className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  No saved prescriptions yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Save a prescription to see it here
                </p>
              </div>
            ) : (
              history
                .slice()
                .reverse()
                .map((record, idx) => (
                  <button
                    key={`${record.savedAt}-${idx}`}
                    type="button"
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedRecord?.savedAt === record.savedAt
                        ? "border-clinic-blue bg-clinic-blue/10"
                        : "border-border hover:bg-accent/40"
                    }`}
                    onClick={() => setSelectedRecord(record)}
                    data-ocid={`history.item.${idx + 1}`}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">
                        {record.date}
                      </p>
                      {record.followUpDate && (
                        <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full leading-none">
                          Follow-up
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Saved:{" "}
                      {new Date(record.savedAt).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </button>
                ))
            )}
          </div>

          {/* Preview pane */}
          <div className="flex-1 overflow-y-auto">
            {selectedRecord ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    Prescription on {selectedRecord.date}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedRecord.savedAt).toLocaleString("en-IN")}
                  </span>
                </div>
                {/* Show all pages if available, otherwise fall back to single canvasData */}
                {(selectedRecord.pages && selectedRecord.pages.length > 0
                  ? selectedRecord.pages
                  : selectedRecord.canvasData
                    ? [selectedRecord.canvasData]
                    : []
                ).length > 0 ? (
                  <div className="space-y-3">
                    {(selectedRecord.pages && selectedRecord.pages.length > 0
                      ? selectedRecord.pages
                      : [selectedRecord.canvasData]
                    ).map((pageData, pageIdx) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: page index is stable/positional
                      <div key={`preview-page-${pageIdx}`}>
                        {(selectedRecord.pages?.length ?? 0) > 1 && (
                          <p className="text-xs text-muted-foreground mb-1 font-medium">
                            Page {pageIdx + 1}
                          </p>
                        )}
                        {pageData ? (
                          <img
                            src={pageData}
                            alt={`Prescription page ${pageIdx + 1}`}
                            className="w-full rounded-lg border border-border"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-32 bg-secondary rounded-lg text-muted-foreground text-xs">
                            Blank page
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Open & Edit button */}
                    <Button
                      className="w-full gap-2 bg-clinic-blue hover:bg-clinic-blue/90 text-white mt-2"
                      onClick={() => onEdit(selectedRecord)}
                      data-ocid="history.open_edit_button"
                    >
                      <PenLine className="w-4 h-4" />
                      Open &amp; Edit
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center h-48 bg-secondary rounded-lg text-muted-foreground text-sm">
                      No canvas data for this record
                    </div>
                    {/* Open & Edit even for blank records */}
                    <Button
                      className="w-full gap-2 bg-clinic-blue hover:bg-clinic-blue/90 text-white"
                      onClick={() => onEdit(selectedRecord)}
                      data-ocid="history.open_edit_button"
                    >
                      <PenLine className="w-4 h-4" />
                      Open &amp; Edit
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm">
                {history.length > 0
                  ? "Select a record to preview"
                  : "No prescriptions saved yet"}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="history.close_button"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Follow-up Dialog ───────────────────────────────────────────────────────

function FollowUpDialog({
  patient,
  open,
  onClose,
  onConfirm,
}: {
  patient: LocalPatient | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (followUpDate: string, doctorName: string) => void;
}) {
  const [followUpDate, setFollowUpDate] = useState(todayStr());
  const [doctorName, setDoctorName] = useState(
    patient?.doctorName ?? "Dr. Dhravid",
  );

  // Sync doctor name when patient changes
  useEffect(() => {
    if (patient) {
      setDoctorName(patient.doctorName);
      setFollowUpDate(todayStr());
    }
  }, [patient]);

  function handleConfirm() {
    if (!followUpDate) {
      toast.error("Please select a follow-up date");
      return;
    }
    onConfirm(followUpDate, doctorName);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-ocid="followup.dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-clinic-blue" />
            Schedule Follow-up
          </DialogTitle>
        </DialogHeader>

        {patient && (
          <div className="space-y-5 py-2">
            {/* Patient name */}
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="w-9 h-9 rounded-full bg-clinic-blue/20 flex items-center justify-center text-clinic-blue font-bold text-sm flex-shrink-0">
                {patient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {patient.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {patient.uid} · {patient.age}y / {patient.sex}
                </p>
              </div>
            </div>

            {/* Follow-up Date */}
            <div className="space-y-1.5">
              <Label htmlFor="followup-date">Follow-up Date</Label>
              <Input
                id="followup-date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                data-ocid="followup.date_input"
              />
            </div>

            {/* Doctor */}
            <div className="space-y-1.5">
              <Label htmlFor="followup-doctor">Doctor</Label>
              <Select value={doctorName} onValueChange={setDoctorName}>
                <SelectTrigger
                  id="followup-doctor"
                  data-ocid="followup.doctor_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr. Dhravid">Dr. Dhravid</SelectItem>
                  <SelectItem value="Dr. Zeel">Dr. Zeel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="followup.cancel_button"
          >
            Cancel
          </Button>
          <Button
            className="gap-2 bg-clinic-red hover:bg-clinic-red/90 text-white"
            onClick={handleConfirm}
            data-ocid="followup.confirm_button"
          >
            <CalendarPlus className="w-4 h-4" />
            Confirm Follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Prescription Page ──────────────────────────────────────────────────────

function PrescriptionPage({
  patient,
  onBack,
  onUpdate,
  followUpDate,
  initialPages,
}: {
  patient: LocalPatient;
  onBack: () => void;
  onUpdate: (p: LocalPatient) => void;
  followUpDate?: string;
  initialPages?: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPatient, setCurrentPatient] = useState<LocalPatient>(patient);
  const [activeTab, setActiveTab] = useState("draw");

  // ── Multi-page state ──────────────────────────────────────────────────────
  // pages: array of base64 dataURLs (empty string = blank page)
  const [pages, setPages] = useState<string[]>(() => {
    if (initialPages && initialPages.length > 0) return initialPages;
    // Follow-up always starts fresh; otherwise load existing canvasData as page 0
    if (followUpDate) return [""];
    if (patient.canvasData) return [patient.canvasData];
    return [""];
  });
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Load the correct page content into the canvas whenever currentPageIndex changes
  // or on initial mount
  const loadPageIntoCanvas = useCallback((pageData: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (pageData) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = pageData;
    } else {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Initialize canvas on mount — only run once with page 0
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only init
  useEffect(() => {
    const startPage =
      initialPages && initialPages.length > 0
        ? (initialPages[0] ?? "")
        : (pages[0] ?? "");
    loadPageIntoCanvas(startPage);
  }, [loadPageIntoCanvas]);

  // pendingPageLoad: when set, load this data into canvas after next render
  const pendingPageLoad = useRef<string | null>(null);

  // Save current canvas to pages array and switch to target page
  function switchPage(targetIndex: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const currentData = canvas.toDataURL("image/png");
    const targetData = pages[targetIndex] ?? "";
    setPages((prev) => {
      const updated = [...prev];
      updated[currentPageIndex] = currentData;
      return updated;
    });
    pendingPageLoad.current = targetData;
    setCurrentPageIndex(targetIndex);
  }

  function handleAddPage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const currentData = canvas.toDataURL("image/png");
    const newIndex = currentPageIndex + 1;
    setPages((prev) => {
      const updated = [...prev];
      updated[currentPageIndex] = currentData;
      updated.splice(newIndex, 0, "");
      return updated;
    });
    pendingPageLoad.current = "";
    setCurrentPageIndex(newIndex);
  }

  function handleDeletePage() {
    if (pages.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const newPages = [...pages];
    newPages.splice(currentPageIndex, 1);
    const newIndex = Math.max(0, currentPageIndex - 1);
    pendingPageLoad.current = newPages[newIndex] ?? "";
    setPages(newPages);
    setCurrentPageIndex(newIndex);
  }

  // Execute pending page load after state update
  useEffect(() => {
    if (pendingPageLoad.current !== null) {
      loadPageIntoCanvas(pendingPageLoad.current);
      pendingPageLoad.current = null;
    }
  });

  // Capture all pages (including the currently displayed one) for saving/printing
  const captureAllPages = useCallback((): string[] => {
    const canvas = canvasRef.current;
    if (!canvas) return pages;
    const currentData = canvas.toDataURL("image/png");
    const updated = [...pages];
    updated[currentPageIndex] = currentData;
    return updated;
  }, [pages, currentPageIndex]);

  const images: string[] = (() => {
    try {
      return JSON.parse(currentPatient.imageData);
    } catch {
      return [];
    }
  })();

  function handleCanvasSnapshot(dataUrl: string) {
    setCurrentPatient((prev) => ({ ...prev, canvasData: dataUrl }));
  }

  function handleAddImage(base64: string) {
    const newImages = [...images, base64];
    const updated = { ...currentPatient, imageData: JSON.stringify(newImages) };
    setCurrentPatient(updated);
  }

  function handleDeleteImage(idx: number) {
    const newImages = images.filter((_, i) => i !== idx);
    const updated = { ...currentPatient, imageData: JSON.stringify(newImages) };
    setCurrentPatient(updated);
  }

  function handleSaveAll() {
    const allPages = captureAllPages();
    const firstPageData = allPages[0] ?? "";
    const updated = { ...currentPatient, canvasData: firstPageData };
    setCurrentPatient(updated);
    setPages(allPages);
    onUpdate(updated);
    // Save to prescription history
    const history = loadPrescriptionHistory(currentPatient.uid);
    const newRecord: PrescriptionRecord = {
      date: followUpDate ?? currentPatient.registrationDate,
      canvasData: firstPageData,
      pages: allPages,
      savedAt: new Date().toISOString(),
      ...(followUpDate ? { followUpDate } : {}),
    };
    const updatedHistory = [...history, newRecord].slice(-20);
    savePrescriptionHistory(currentPatient.uid, updatedHistory);
    toast.success("Prescription saved successfully");
  }

  function handlePrint() {
    handleSaveAll();
    setTimeout(() => window.print(), 300);
  }

  const visitDate = followUpDate ?? currentPatient.registrationDate;

  // Patient info band items
  const patientInfoItems = [
    { label: "UID", value: currentPatient.uid },
    { label: "Name", value: currentPatient.name },
    { label: "Age", value: `${currentPatient.age} yrs` },
    { label: "Sex", value: currentPatient.sex },
    { label: "Contact", value: currentPatient.contact || "—" },
    { label: "Doctor", value: currentPatient.doctorName },
    { label: followUpDate ? "Follow-up" : "Date", value: visitDate },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      {/* Prescription Paper — on-screen interactive view (A4-like width) */}
      <div className="prescription-paper rounded-xl border border-border overflow-hidden">
        {/* Prescription Header */}
        <div className="clinic-header-gradient text-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/generated/logo-white-circle.dim_400x400.png"
                alt="Shreeji Clinic"
                className="w-12 h-12 object-cover rounded-full"
              />
              <div>
                <h2 className="font-display text-2xl font-bold">
                  Shreeji Clinic
                </h2>
                <p className="text-white/80 text-sm">OPD Prescription</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-white">
                {currentPatient.doctorName}
              </p>
              <p className="text-white/70 mt-1">{visitDate}</p>
            </div>
          </div>

          {/* Patient Info Band */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {patientInfoItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-lg px-3 py-2 ${
                  item.label === "Follow-up"
                    ? "bg-yellow-400/30 ring-1 ring-yellow-300/50"
                    : "bg-white/10"
                }`}
              >
                <p className="text-white/60 text-xs uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="text-white font-semibold text-sm truncate">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-5">
          {/* Tab Navigation — no-print */}
          <div className="no-print mb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger
                  value="draw"
                  className="gap-1.5"
                  data-ocid="prescription.draw_tab"
                >
                  <PenLine className="w-4 h-4" />
                  Draw
                </TabsTrigger>
                <TabsTrigger
                  value="images"
                  className="gap-1.5"
                  data-ocid="prescription.images_tab"
                >
                  <Upload className="w-4 h-4" />
                  Images {images.length > 0 && `(${images.length})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Draw Tab Content */}
          {activeTab === "draw" && (
            <div className="space-y-3">
              {/* ── Page Navigation Bar ── */}
              <div className="no-print flex flex-wrap items-center gap-2 p-2.5 bg-secondary/50 rounded-lg border border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => switchPage(currentPageIndex - 1)}
                  disabled={currentPageIndex === 0}
                  data-ocid="prescription.prev_page_button"
                >
                  ← Prev
                </Button>
                <span className="text-sm font-medium text-foreground px-1 min-w-[90px] text-center">
                  Page {currentPageIndex + 1} of {pages.length}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => switchPage(currentPageIndex + 1)}
                  disabled={currentPageIndex === pages.length - 1}
                  data-ocid="prescription.next_page_button"
                >
                  Next →
                </Button>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5 bg-clinic-blue hover:bg-clinic-blue/90 text-white"
                    onClick={handleAddPage}
                    data-ocid="prescription.add_page_button"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Page
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={handleDeletePage}
                    disabled={pages.length <= 1}
                    data-ocid="prescription.delete_page_button"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Page
                  </Button>
                </div>
              </div>

              {/* Drawing Canvas */}
              <DrawingCanvas
                canvasRef={canvasRef}
                onSnapshot={handleCanvasSnapshot}
              />
            </div>
          )}

          {/* Images Tab */}
          {activeTab === "images" && (
            <div className="py-2">
              <ImageUploadPanel
                images={images}
                onAdd={handleAddImage}
                onDelete={handleDeleteImage}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Print-Only Multi-Page Layout ── */}
      <div className="print-only-pages">
        {captureAllPages().map((pageData, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: page index is stable/positional
          <div key={`print-page-${idx}`} className="print-page">
            {/* Print Header */}
            <div className="print-header">
              <div className="print-header-top">
                <div className="print-header-brand">
                  <img
                    src="/assets/generated/logo-white-circle.dim_400x400.png"
                    alt="Shreeji Clinic"
                    className="print-logo rounded-full"
                  />
                  <div>
                    <h2 className="print-clinic-name">Shreeji Clinic</h2>
                    <p className="print-clinic-sub">OPD Prescription</p>
                  </div>
                </div>
                <div className="print-header-right">
                  <p className="print-doctor">{currentPatient.doctorName}</p>
                  <p className="print-date">{visitDate}</p>
                  {pages.length > 1 && (
                    <p className="print-page-num">
                      Page {idx + 1} / {pages.length}
                    </p>
                  )}
                </div>
              </div>
              {/* Patient Info Band */}
              <div className="print-patient-band">
                {patientInfoItems.map((item) => (
                  <div
                    key={item.label}
                    className={`print-patient-field${item.label === "Follow-up" ? " print-followup-field" : ""}`}
                  >
                    <span className="print-field-label">{item.label}</span>
                    <span className="print-field-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Canvas image */}
            <div className="print-canvas-area">
              {pageData ? (
                <img
                  src={pageData}
                  alt={`Prescription page ${idx + 1}`}
                  className="print-canvas-img"
                />
              ) : (
                <div className="print-canvas-blank" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar — no-print */}
      <div className="no-print mt-4 flex flex-wrap items-center gap-2 justify-between">
        <Button
          variant="outline"
          className="gap-2"
          onClick={onBack}
          data-ocid="prescription.back_button"
        >
          <ChevronLeft className="w-4 h-4" />
          Dashboard
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button
            className="gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
            onClick={() => {
              if (!currentPatient.contact) {
                toast.error("No contact number available");
                return;
              }
              const phone = currentPatient.contact.replace(/\D/g, "");
              const message = `Dear ${currentPatient.name},\n\nYour OPD prescription from Shreeji Clinic is ready.\n\nPatient Details:\nUID: ${currentPatient.uid}\nName: ${currentPatient.name}\nAge/Sex: ${currentPatient.age} yrs / ${currentPatient.sex}\nContact: ${currentPatient.contact}\nDoctor: ${currentPatient.doctorName}\nVisit Date: ${visitDate}\n\nPlease visit the clinic as advised.\n- Shreeji Clinic`;
              window.open(
                `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
                "_blank",
              );
            }}
            data-ocid="prescription.whatsapp_button"
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handlePrint}
            data-ocid="prescription.print_button"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </Button>
          <Button
            className="gap-2 bg-clinic-red hover:bg-clinic-red/90 text-white"
            onClick={handleSaveAll}
            data-ocid="prescription.save_button"
          >
            Save Prescription
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────────────────

export default function App() {
  // ── Auth gate ──────────────────────────────────────────────────────────────
  const [session, setSession] = useState<AuthSession | null>(() =>
    getSession(),
  );

  function handleLogin(s: AuthSession) {
    setSession(s);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    toast.success("Logged out successfully");
  }

  // If not logged in, render the login page full-screen
  if (!session) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  return <AppShell session={session} onLogout={handleLogout} />;
}

// ── AppShell (authenticated view) ─────────────────────────────────────────

function AppShell({
  session,
  onLogout,
}: {
  session: AuthSession;
  onLogout: () => void;
}) {
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedPatient, setSelectedPatient] = useState<LocalPatient | null>(
    null,
  );
  const [historyPatient, setHistoryPatient] = useState<LocalPatient | null>(
    null,
  );
  const [followUpTarget, setFollowUpTarget] = useState<LocalPatient | null>(
    null,
  );
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<string | undefined>(
    undefined,
  );
  const [editFromHistoryPages, setEditFromHistoryPages] = useState<
    string[] | undefined
  >(undefined);
  const [localPatients, setLocalPatients] = useState<LocalPatient[]>(
    loadLocalPatients(),
  );
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();

  // Fetch from backend
  const { isLoading: backendLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      if (!actor) return localPatients;
      try {
        const patients = await actor.getAllPatients();
        const local = patients.map(toLocalPatient);
        setLocalPatients(local);
        saveLocalPatients(local);
        return local;
      } catch {
        return localPatients;
      }
    },
    enabled: !!actor && !isFetching,
  });

  const registerMutation = useMutation({
    mutationFn: async (patient: LocalPatient) => {
      if (actor) {
        await actor.register(toBackendPatient(patient));
      }
      const updated = [
        ...localPatients.filter((p) => p.uid !== patient.uid),
        patient,
      ];
      setLocalPatients(updated);
      saveLocalPatients(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (patient: LocalPatient) => {
      if (actor) {
        await actor.updatePatient(toBackendPatient(patient));
      }
      const updated = localPatients.map((p) =>
        p.uid === patient.uid ? patient : p,
      );
      setLocalPatients(updated);
      saveLocalPatients(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (uid: string) => {
      if (actor) {
        await actor.deletePatient(uid);
      }
      const updated = localPatients.filter((p) => p.uid !== uid);
      setLocalPatients(updated);
      saveLocalPatients(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient deleted");
    },
  });

  const handleRegisterSave = useCallback(
    (patient: LocalPatient) => {
      registerMutation.mutate(patient, {
        onSuccess: () => {
          setSelectedPatient(patient);
          setPage("prescription");
          toast.success(`Patient ${patient.name} registered successfully`);
        },
        onError: () => {
          // Still navigate even if backend fails
          setSelectedPatient(patient);
          setPage("prescription");
          toast.success(`Patient ${patient.name} registered (offline)`);
        },
      });
    },
    [registerMutation],
  );

  const handlePatientUpdate = useCallback(
    (patient: LocalPatient) => {
      updateMutation.mutate(patient);
    },
    [updateMutation],
  );

  const isLoading = backendLoading && localPatients.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        onNavigate={(p) => setPage(p)}
        currentPage={page}
        session={session}
        onLogout={onLogout}
      />

      <main className="flex-1">
        {page === "dashboard" && (
          <DashboardPage
            patients={localPatients}
            isLoading={isLoading}
            onNewPatient={() => setPage("register")}
            onViewPrescription={(p) => {
              setSelectedPatient(p);
              setFollowUpDate(undefined);
              setPage("prescription");
            }}
            onDeletePatient={(uid) => deleteMutation.mutate(uid)}
            onViewHistory={(p) => setHistoryPatient(p)}
            onFollowUp={(p) => {
              setFollowUpTarget(p);
              setFollowUpDialogOpen(true);
            }}
          />
        )}

        {page === "register" && (
          <RegistrationPage
            onSave={handleRegisterSave}
            onCancel={() => setPage("dashboard")}
          />
        )}

        {page === "prescription" && selectedPatient && (
          <PrescriptionPage
            patient={selectedPatient}
            onBack={() => {
              setPage("dashboard");
              setFollowUpDate(undefined);
              setEditFromHistoryPages(undefined);
            }}
            onUpdate={handlePatientUpdate}
            followUpDate={followUpDate}
            initialPages={editFromHistoryPages}
          />
        )}
      </main>

      <PatientHistoryModal
        uid={historyPatient?.uid ?? ""}
        patientName={historyPatient?.name ?? ""}
        open={!!historyPatient}
        onClose={() => setHistoryPatient(null)}
        onEdit={(record) => {
          if (!historyPatient) return;
          const pages =
            record.pages && record.pages.length > 0
              ? record.pages
              : record.canvasData
                ? [record.canvasData]
                : [];
          setEditFromHistoryPages(pages);
          setFollowUpDate(record.followUpDate ?? undefined);
          setSelectedPatient(historyPatient);
          setHistoryPatient(null);
          setPage("prescription");
        }}
      />

      <FollowUpDialog
        patient={followUpTarget}
        open={followUpDialogOpen}
        onClose={() => {
          setFollowUpDialogOpen(false);
          setFollowUpTarget(null);
        }}
        onConfirm={(date, doctor) => {
          if (!followUpTarget) return;
          // Use the same patient but with the chosen doctor for this visit
          const patientForFollowUp: LocalPatient = {
            ...followUpTarget,
            doctorName: doctor,
          };
          setSelectedPatient(patientForFollowUp);
          setFollowUpDate(date);
          setFollowUpDialogOpen(false);
          setFollowUpTarget(null);
          setPage("prescription");
          toast.success(`Follow-up for ${followUpTarget.name} on ${date}`);
        }}
      />

      {/* Footer */}
      <footer className="no-print text-center py-4 text-xs text-muted-foreground border-t border-border">
        © {new Date().getFullYear()}.{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-clinic-blue transition-colors"
        >
          Built with ❤️ using caffeine.ai
        </a>
      </footer>

      <PWAInstallBanner />
      <Toaster richColors position="top-right" />
    </div>
  );
}
