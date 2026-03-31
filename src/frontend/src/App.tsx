import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { useActor } from "@/hooks/useActor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  Download,
  Eraser,
  Eye,
  EyeOff,
  FileText,
  IndianRupee,
  Keyboard,
  Loader2,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  PenLine,
  Pencil,
  Pill,
  Plus,
  Printer,
  Receipt,
  Redo2,
  ScrollText,
  Search,
  Send,
  Stethoscope,
  Trash2,
  Undo2,
  Unlock,
  Upload,
  UserCog,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Module-level actor ref for fire-and-forget backend sync across all functions
// eslint-disable-next-line prefer-const
let _cloudActor: any = null;

import type { Patient } from "./backend.d.ts";
import {
  type AuthSession,
  LoginPage,
  type NursingAccount,
  clearSession,
  getAccounts,
  getNursingAccounts,
  getSession,
  saveAccounts,
  saveNursingAccounts,
  setSession,
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

type Page = "frontdesk" | "dashboard" | "register" | "prescription";

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
  vitals?: { bp: string; pulse: string; spo2: string };
}

interface TypedContent {
  chiefComplaint: string;
  diagnosis: string;
  medicines: string;
  advice: string;
  nextVisit: string;
}

const EMPTY_TYPED_CONTENT: TypedContent = {
  chiefComplaint: "",
  diagnosis: "",
  medicines: "",
  advice: "",
  nextVisit: "",
};

interface PrescriptionRecord {
  date: string;
  canvasData: string;
  pages?: string[]; // all pages as base64 dataURLs
  savedAt: string; // ISO timestamp
  followUpDate?: string;
  typedContent?: TypedContent;
}

type BillCategory = "medicine" | "consulting" | "other";

interface BillItem {
  id: string;
  category: BillCategory;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Bill {
  billId: string;
  date: string;
  savedAt: string;
  items: BillItem[];
  discount: number;
  discountType: "amount" | "percent";
  gstPercent: number;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  status?: "pending" | "done";
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
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const counterKey = `shreeji_uid_counter_${yy}${mm}`;
  let counter = 1;
  try {
    const stored = localStorage.getItem(counterKey);
    if (stored !== null) {
      counter = Number.parseInt(stored, 10) + 1;
      if (Number.isNaN(counter) || counter < 1) counter = 1;
    }
    localStorage.setItem(counterKey, String(counter));
    if (_cloudActor) {
      _cloudActor.setUidCounter(`${yy}${mm}`, counter).catch(() => {});
    }
  } catch {
    counter = 1;
  }
  return `SC${mm}${yy}${String(counter).padStart(4, "0")}`;
}

/** Format an ISO date string (YYYY-MM-DD) or any parseable date to DD/MM/YYYY */
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  // Already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  // ISO YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  // Fallback: try Date parse
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }
  return dateStr;
}

/** Format a full ISO timestamp to DD/MM/YYYY HH:MM */
function formatDateTime(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
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
  try {
    localStorage.setItem("shreeji_patients", JSON.stringify(patients));
  } catch (e) {
    console.warn("localStorage quota exceeded:", e);
  }
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
  try {
    localStorage.setItem(`shreeji_rx_history_${uid}`, JSON.stringify(records));
  } catch (e) {
    console.warn("localStorage quota exceeded:", e);
  }
  if (_cloudActor) {
    _cloudActor.savePrescriptions(uid, JSON.stringify(records)).catch(() => {});
  }
}

function loadBills(uid: string): Bill[] {
  try {
    const raw = localStorage.getItem(`shreeji_bills_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBills(uid: string, bills: Bill[]): void {
  try {
    localStorage.setItem(`shreeji_bills_${uid}`, JSON.stringify(bills));
  } catch (e) {
    console.warn("localStorage quota exceeded:", e);
  }
  if (_cloudActor) {
    _cloudActor.saveBills(uid, JSON.stringify(bills)).catch(() => {});
  }
}

// ── Backup helpers ─────────────────────────────────────────────────────────

interface BackupData {
  version: number;
  exportedAt: string;
  patients: LocalPatient[];
  prescriptionHistories: Record<string, PrescriptionRecord[]>;
  bills?: Record<string, any[]>;
}

function exportBackup(patients: LocalPatient[]): void {
  const histories: Record<string, PrescriptionRecord[]> = {};
  for (const p of patients) {
    const h = loadPrescriptionHistory(p.uid);
    if (h.length > 0) histories[p.uid] = h;
  }
  const bills: Record<string, any[]> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("shreeji_bills_")) {
      const uid = key.replace("shreeji_bills_", "");
      try {
        bills[uid] = JSON.parse(localStorage.getItem(key) || "[]");
      } catch {}
    }
  }
  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    patients,
    prescriptionHistories: histories,
    bills,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `shreeji-clinic-backup-${dateStr}.json`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success("Backup file downloaded successfully");
}

function importBackupFile(
  file: File,
  onImport: (patients: LocalPatient[]) => void,
): void {
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target?.result as string) as BackupData;
      if (!data.patients || !Array.isArray(data.patients)) {
        toast.error("Invalid backup file format");
        return;
      }
      // Merge patients: backup wins per-UID
      const existing = loadLocalPatients();
      const existingMap = new Map(existing.map((p) => [p.uid, p]));
      for (const p of data.patients) {
        existingMap.set(p.uid, p);
      }
      const merged = Array.from(existingMap.values());
      saveLocalPatients(merged);
      // Restore prescription histories
      if (data.prescriptionHistories) {
        for (const [uid, history] of Object.entries(
          data.prescriptionHistories,
        )) {
          if (Array.isArray(history)) {
            savePrescriptionHistory(uid, history as PrescriptionRecord[]);
          }
        }
      }
      // Restore bills
      if (data.bills) {
        for (const [uid, billList] of Object.entries(data.bills)) {
          try {
            localStorage.setItem(
              `shreeji_bills_${uid}`,
              JSON.stringify(billList),
            );
          } catch {}
        }
      }
      onImport(merged);
      toast.success(
        `Backup restored: ${data.patients.length} patient(s) imported`,
      );
    } catch {
      toast.error("Failed to read backup file. Please check the file.");
    }
  };
  reader.readAsText(file);
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
  onExportExcel,
  onExportBillingReport,
  onBackup,
  onRestoreTrigger,
  onChangeProfile,
  onBillingClick,
  onManageNursing,
  onShowLicence,
}: {
  onNavigate: (p: Page) => void;
  currentPage: Page;
  session: AuthSession;
  onLogout: () => void;
  onExportExcel: () => void;
  onExportBillingReport: () => void;
  onBackup: () => void;
  onRestoreTrigger: () => void;
  onChangeProfile: () => void;
  onBillingClick: () => void;
  onManageNursing: () => void;
  onShowLicence: () => void;
}) {
  return (
    <header className="clinic-header-gradient text-white shadow-md no-print">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <button
          type="button"
          className="flex items-center gap-3 hover:opacity-90 transition-opacity flex-shrink-0"
          onClick={() => onNavigate("frontdesk")}
          data-ocid="header.brand_button"
        >
          <img
            src="/assets/generated/logo-white-circle.dim_400x400.png"
            alt="Shreeji Clinic Logo"
            className="w-10 h-10 object-cover rounded-full"
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

        {/* Right side nav */}
        <nav className="flex items-center gap-2">
          {/* Doctor badge — visible on sm+ */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 text-white/90 text-sm font-medium border border-white/20"
            data-ocid="header.doctor_badge"
          >
            <Stethoscope className="w-3.5 h-3.5 text-white/70" />
            <span>{session.displayName}</span>
          </div>

          {/* Unified Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-white/90 hover:text-white hover:bg-white/15 border border-white/20"
                data-ocid="header.menu_button"
                aria-label="Open menu"
              >
                <Menu className="w-4 h-4" />
                <span className="hidden sm:inline">Menu</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52"
              data-ocid="header.menu_dropdown_menu"
            >
              {/* Navigation */}
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide pb-1">
                Navigation
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onNavigate("register")}
                className={`gap-2 cursor-pointer ${currentPage === "register" ? "bg-accent" : ""}`}
                data-ocid="header.register_link"
              >
                <Plus className="w-4 h-4 text-clinic-red" />
                Patient Registration
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onBillingClick}
                className="gap-2 cursor-pointer"
                data-ocid="header.billing_link"
              >
                <Receipt className="w-4 h-4 text-emerald-600" />
                Billing
              </DropdownMenuItem>
              {session.role === "doctor" && (
                <>
                  <DropdownMenuItem
                    onClick={() => onNavigate("dashboard")}
                    className={`gap-2 cursor-pointer ${currentPage === "dashboard" ? "bg-accent" : ""}`}
                    data-ocid="header.patients_link"
                  >
                    <Users className="w-4 h-4 text-clinic-blue" />
                    Patients / Dashboard
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Data actions — doctor only */}
                  <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide pb-1">
                    Data
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={onExportExcel}
                    className="gap-2 cursor-pointer"
                    data-ocid="header.export_excel_button"
                  >
                    <Download className="w-4 h-4 text-muted-foreground" />
                    Export Patients (Excel)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onExportBillingReport}
                    className="gap-2 cursor-pointer"
                    data-ocid="header.export_billing_report_button"
                  >
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Export Billing Report
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onBackup}
                    className="gap-2 cursor-pointer"
                    data-ocid="header.backup_button"
                  >
                    <Download className="w-4 h-4 text-clinic-blue" />
                    Backup
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onRestoreTrigger}
                    className="gap-2 cursor-pointer"
                    data-ocid="header.restore_button"
                  >
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    Restore
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              {/* Account */}
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide pb-1">
                Account
              </DropdownMenuLabel>
              {/* User info — non-clickable */}
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-foreground/80 select-none">
                <Stethoscope className="w-4 h-4 text-clinic-blue flex-shrink-0" />
                <span className="truncate">{session.displayName}</span>
              </div>
              {session.role === "doctor" && (
                <>
                  <DropdownMenuItem
                    onClick={onChangeProfile}
                    className="gap-2 cursor-pointer"
                    data-ocid="header.change_profile_button"
                  >
                    <UserCog className="w-4 h-4 text-clinic-blue" />
                    Change Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onManageNursing}
                    className="gap-2 cursor-pointer"
                    data-ocid="header.manage_nursing_button"
                  >
                    <Users className="w-4 h-4 text-violet-600" />
                    Manage Nursing Users
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onShowLicence}
                    className="gap-2 cursor-pointer"
                    data-ocid="header.licence_button"
                  >
                    <ScrollText className="w-4 h-4 text-amber-600" />
                    App Licence
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={onLogout}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                data-ocid="header.logout_button"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}

// ── Front Desk ─────────────────────────────────────────────────────────────

function FrontDeskPage({
  session,
  onNavigate,
  onLogout,
  onExportExcel,
  onExportBillingReport,
  onBackup,
  onRestoreTrigger,
  onChangeProfile,
  onBillingClick,
  onManageNursing,
  onShowLicence,
}: {
  session: AuthSession;
  onNavigate: (p: Page) => void;
  onLogout: () => void;
  onExportExcel: () => void;
  onExportBillingReport: () => void;
  onBackup: () => void;
  onRestoreTrigger: () => void;
  onChangeProfile: () => void;
  onBillingClick: () => void;
  onManageNursing: () => void;
  onShowLicence: () => void;
}) {
  return (
    <div
      className="min-h-screen clinic-header-gradient flex flex-col items-center justify-center relative overflow-hidden"
      data-ocid="frontdesk.page"
    >
      {/* Decorative background circles */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/3 blur-3xl" />
      </div>

      {/* Content card */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 py-10 text-center">
        {/* Logo */}
        <div className="w-28 h-28 rounded-full bg-white shadow-2xl flex items-center justify-center overflow-hidden ring-4 ring-white/30">
          <img
            src="/assets/generated/logo-white-circle.dim_400x400.png"
            alt="Shreeji Clinic Logo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight drop-shadow-md">
            Shreeji Clinic
          </h1>
          <p className="text-white/70 text-lg sm:text-xl font-medium">
            OPD Management System
          </p>
          {session && (
            <p className="text-white/50 text-sm mt-2 flex items-center justify-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" />
              {session.displayName}
            </p>
          )}
        </div>

        {/* Enter Dropdown Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="mt-2 px-10 py-4 text-lg font-semibold bg-white text-clinic-blue hover:bg-white/90 shadow-xl gap-2 rounded-xl h-auto"
              data-ocid="frontdesk.enter_button"
            >
              Enter
              <ChevronDown className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            side="bottom"
            sideOffset={8}
            className="w-64"
          >
            {/* Patient Registration — primary */}
            <DropdownMenuItem
              onClick={() => onNavigate("register")}
              className="gap-2 cursor-pointer py-3 font-semibold text-clinic-red focus:text-clinic-red focus:bg-clinic-red/10"
              data-ocid="frontdesk.register_link"
            >
              <Plus className="w-5 h-5 text-clinic-red" />
              Patient Registration
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Navigation */}
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide pb-1">
              Navigation
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onBillingClick}
              className="gap-2 cursor-pointer"
              data-ocid="frontdesk.billing_link"
            >
              <Receipt className="w-4 h-4 text-emerald-600" />
              Billing
            </DropdownMenuItem>

            {session.role === "doctor" && (
              <>
                <DropdownMenuItem
                  onClick={() => onNavigate("dashboard")}
                  className="gap-2 cursor-pointer"
                  data-ocid="frontdesk.dashboard_link"
                >
                  <Users className="w-4 h-4 text-clinic-blue" />
                  Patients / Dashboard
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Data — doctor only */}
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide pb-1">
                  Data
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={onExportExcel}
                  className="gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-muted-foreground" />
                  Export Patients (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onExportBillingReport}
                  className="gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Export Billing Report
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onBackup}
                  className="gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-clinic-blue" />
                  Backup
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onRestoreTrigger}
                  className="gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  Restore
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />

            {/* Account */}
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide pb-1">
              Account
            </DropdownMenuLabel>
            {session.role === "doctor" && (
              <>
                <DropdownMenuItem
                  onClick={onChangeProfile}
                  className="gap-2 cursor-pointer"
                >
                  <UserCog className="w-4 h-4 text-clinic-blue" />
                  Change Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onManageNursing}
                  className="gap-2 cursor-pointer"
                  data-ocid="frontdesk.manage_nursing_button"
                >
                  <Users className="w-4 h-4 text-violet-600" />
                  Manage Nursing Users
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onShowLicence}
                  className="gap-2 cursor-pointer"
                  data-ocid="frontdesk.licence_button"
                >
                  <ScrollText className="w-4 h-4 text-amber-600" />
                  App Licence
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem
              onClick={onLogout}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Footer attribution */}
      <p className="absolute bottom-5 text-white/40 text-xs">
        © {new Date().getFullYear()}.{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/70 transition-colors"
        >
          Built with ❤️ using caffeine.ai
        </a>
      </p>
    </div>
  );
}

// ── Edit Patient Dialog ────────────────────────────────────────────────────

function EditPatientDialog({
  patient,
  open,
  onClose,
  onSave,
}: {
  patient: LocalPatient | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: LocalPatient) => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [contact, setContact] = useState("");
  const [doctorName, setDoctorName] = useState("");

  useEffect(() => {
    if (patient) {
      setName(patient.name);
      setAge(String(patient.age));
      setSex(patient.sex);
      setContact(patient.contact);
      setDoctorName(patient.doctorName);
    }
  }, [patient]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) return;
    if (!name.trim() || !age || !sex || !doctorName) {
      toast.error("Please fill all required fields");
      return;
    }
    onSave({
      ...patient,
      name: name.trim(),
      age: Number(age),
      sex,
      contact: contact.trim(),
      doctorName,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" data-ocid="edit_patient.dialog">
        <DialogHeader>
          <DialogTitle>Edit Patient Details</DialogTitle>
        </DialogHeader>
        {patient && (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>UID (Read-only)</Label>
              <Input
                value={patient.uid}
                disabled
                className="font-mono text-sm bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-name">Full Name *</Label>
              <Input
                id="ep-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Patient name"
                required
                data-ocid="edit_patient.name_input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ep-age">Age *</Label>
                <Input
                  id="ep-age"
                  type="number"
                  min="0"
                  max="150"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Age"
                  required
                  data-ocid="edit_patient.age_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sex *</Label>
                <Select value={sex} onValueChange={setSex}>
                  <SelectTrigger data-ocid="edit_patient.sex_select">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-contact">Contact</Label>
              <Input
                id="ep-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Phone number"
                data-ocid="edit_patient.contact_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Doctor *</Label>
              <Select value={doctorName} onValueChange={setDoctorName}>
                <SelectTrigger data-ocid="edit_patient.doctor_select">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr. Dhravid Patel">
                    Dr. Dhravid Patel
                  </SelectItem>
                  <SelectItem value="Dr. Zeel Patel">Dr. Zeel Patel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-ocid="edit_patient.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-clinic-red hover:bg-clinic-red/90 text-white"
                data-ocid="edit_patient.save_button"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
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
  onBill,
  onCertificate,
  onReferral,
  onEditPatient,
  isNursing,
}: {
  patients: LocalPatient[];
  isLoading: boolean;
  onNewPatient: () => void;
  onViewPrescription: (p: LocalPatient) => void;
  onDeletePatient: (uid: string) => void;
  onViewHistory: (p: LocalPatient) => void;
  onFollowUp: (p: LocalPatient) => void;
  onBill: (p: LocalPatient) => void;
  onCertificate: (p: LocalPatient) => void;
  onReferral: (p: LocalPatient) => void;
  onEditPatient: (p: LocalPatient) => void;
  isNursing?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.uid.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" data-ocid="dashboard.page">
      {/* Page Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Patient Dashboard
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {patients.length} registered patient
            {patients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={onNewPatient}
          className="gap-2 bg-clinic-red hover:bg-clinic-red/90 text-white flex-shrink-0"
          data-ocid="dashboard.new_registration_button"
        >
          <Plus className="w-4 h-4" />
          New Registration
        </Button>
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
                    {formatDate(patient.registrationDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {!isNursing && (
                        <>
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
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                        onClick={() => onBill(patient)}
                        data-ocid={`dashboard.bill_button.${idx + 1}`}
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Bill
                      </Button>
                      {!isNursing && (
                        <>
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
                            variant="outline"
                            className="gap-1.5 text-xs text-violet-700 border-violet-300 hover:bg-violet-50 hover:text-violet-800"
                            onClick={() => onCertificate(patient)}
                            data-ocid={`dashboard.certificate_button.${idx + 1}`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            Certificate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs text-teal-700 border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                            onClick={() => onReferral(patient)}
                            data-ocid={`dashboard.referral_button.${idx + 1}`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            Referral
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-clinic-blue hover:text-clinic-blue hover:bg-clinic-blue/10 w-8 h-8 p-0"
                        onClick={() => onEditPatient(patient)}
                        title="Edit patient"
                        data-ocid={`dashboard.patient.edit_button.${idx + 1}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
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
    doctorName: "Dr. Dhravid Patel",
    vitals: { bp: "", pulse: "", spo2: "" },
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
                <SelectItem value="Dr. Dhravid Patel">
                  Dr. Dhravid Patel
                </SelectItem>
                <SelectItem value="Dr. Zeel Patel">Dr. Zeel Patel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vitals (Optional) */}
        <div className="space-y-3 border border-border rounded-lg p-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Vitals{" "}
            <span className="font-normal normal-case text-xs">
              (Optional — shown on prescription)
            </span>
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bp">Blood Pressure</Label>
              <Input
                id="bp"
                placeholder="120/80 mmHg"
                value={form.vitals?.bp ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    vitals: {
                      ...(form.vitals ?? { bp: "", pulse: "", spo2: "" }),
                      bp: e.target.value,
                    },
                  })
                }
                data-ocid="registration.bp_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pulse">Pulse</Label>
              <Input
                id="pulse"
                placeholder="72 bpm"
                value={form.vitals?.pulse ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    vitals: {
                      ...(form.vitals ?? { bp: "", pulse: "", spo2: "" }),
                      pulse: e.target.value,
                    },
                  })
                }
                data-ocid="registration.pulse_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spo2">SpO2</Label>
              <Input
                id="spo2"
                placeholder="98%"
                value={form.vitals?.spo2 ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    vitals: {
                      ...(form.vitals ?? { bp: "", pulse: "", spo2: "" }),
                      spo2: e.target.value,
                    },
                  })
                }
                data-ocid="registration.spo2_input"
              />
            </div>
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
  const [zoom, setZoom] = useState(1.0);
  const [locked, setLocked] = useState(false);
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
    if (locked) return;
    if (e.pointerType !== "pen") return;
    e.preventDefault();
    pushSnapshot();
    isDrawing.current = true;
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    lastPoint.current = getPos(e);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (locked) return;
    if (e.pointerType !== "pen") return;
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
    if (locked) return;
    if (e.pointerType !== "pen") return;
    e.preventDefault();
    isDrawing.current = false;
    lastPoint.current = null;
    if (canvasRef.current) {
      onSnapshot(canvasRef.current.toDataURL("image/png"));
    }
  }

  function handlePointerLeave(e: React.PointerEvent<HTMLCanvasElement>) {
    if (locked) return;
    if (e.pointerType !== "pen") return;
    e.preventDefault();
    if (isDrawing.current && canvasRef.current) {
      onSnapshot(canvasRef.current.toDataURL("image/png"));
    }
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

  const clampedZoom = Math.min(3.0, Math.max(0.5, zoom));

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

      {/* Zoom + Lock Controls */}
      <div className="no-print flex flex-wrap items-center gap-2 px-3 py-2 bg-secondary/30 rounded-lg border border-border">
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8"
            onClick={() =>
              setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))
            }
            disabled={clampedZoom <= 0.5}
            title="Zoom Out"
            data-ocid="prescription.zoom_out_button"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs font-semibold text-foreground tabular-nums w-12 text-center">
            {Math.round(clampedZoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8"
            onClick={() =>
              setZoom((z) => Math.min(3.0, Math.round((z + 0.25) * 100) / 100))
            }
            disabled={clampedZoom >= 3.0}
            title="Zoom In"
            data-ocid="prescription.zoom_in_button"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 px-1 transition-colors"
            onClick={() => setZoom(1.0)}
            data-ocid="prescription.zoom_reset_button"
          >
            Reset
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* Lock toggle */}
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
            locked
              ? "bg-destructive text-white border-destructive hover:bg-destructive/90"
              : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground"
          }`}
          onClick={() => setLocked((l) => !l)}
          title={locked ? "Click to unlock canvas" : "Click to lock canvas"}
          data-ocid="prescription.lock_toggle"
        >
          {locked ? (
            <>
              <Unlock className="w-3.5 h-3.5" />
              Locked
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              Lock
            </>
          )}
        </button>

        {locked && (
          <span className="text-xs text-muted-foreground italic">
            Canvas is locked — scroll freely without drawing
          </span>
        )}
      </div>

      {/* Canvas — A4 aspect ratio (794 × 1123 px @ 96 dpi) */}
      <div className="border border-border rounded-lg bg-white overflow-hidden">
        <div
          style={{
            width: `${794 * clampedZoom}px`,
            height: `${1123 * clampedZoom}px`,
            transformOrigin: "top left",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <canvas
            ref={canvasRef}
            width={794}
            height={1123}
            style={{
              touchAction: locked ? "auto" : "none",
              cursor: locked
                ? "default"
                : tool === "eraser"
                  ? "cell"
                  : "crosshair",
              transform: `scale(${clampedZoom})`,
              transformOrigin: "top left",
              display: "block",
              pointerEvents: locked ? "none" : "auto",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            data-ocid="prescription.canvas_target"
          />
        </div>
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
        <p className="font-medium text-sm">Upload Image or PDF from Gallery</p>
        <p className="text-xs text-muted-foreground mt-1">
          Tap to browse photos or PDF files
        </p>
        <input
          id="image-upload-input"
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
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
              {img.startsWith("data:application/pdf") ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-secondary p-2 text-center">
                  <FileText className="w-8 h-8 text-clinic-red mb-1" />
                  <p className="text-xs text-muted-foreground truncate w-full text-center">
                    PDF File
                  </p>
                </div>
              ) : (
                <img
                  src={img}
                  alt={`Upload ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
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
  patient,
  open,
  onClose,
  onEdit,
}: {
  patient: LocalPatient | null;
  open: boolean;
  onClose: () => void;
  onEdit: (record: PrescriptionRecord) => void;
}) {
  const [selectedRecord, setSelectedRecord] =
    useState<PrescriptionRecord | null>(null);
  const uid = patient?.uid ?? "";
  const patientName = patient?.name ?? "";
  const history = uid ? loadPrescriptionHistory(uid) : [];

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (!open) setSelectedRecord(null);
  }, [open]);

  function handleWhatsApp(record: PrescriptionRecord) {
    if (!patient?.contact) {
      toast.error("No contact number available");
      return;
    }
    const phone = patient.contact.replace(/\D/g, "");
    const message = `Dear ${patient.name},\n\nYour OPD prescription from Shreeji Clinic is ready.\n\nPatient Details:\nUID: ${patient.uid}\nName: ${patient.name}\nAge/Sex: ${patient.age} yrs / ${patient.sex}\nContact: ${patient.contact}\nDoctor: ${patient.doctorName}\nVisit Date: ${formatDate(record.date)}\n\nPlease visit the clinic as advised.\n- Shreeji Clinic`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  }

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
                        {formatDate(record.date)}
                      </p>
                      {record.followUpDate && (
                        <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full leading-none">
                          Follow-up
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Saved: {formatDateTime(record.savedAt)}
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
                    Prescription on {formatDate(selectedRecord.date)}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(selectedRecord.savedAt)}
                  </span>
                </div>
                {/* Typed content preview (read-only) */}
                {selectedRecord.typedContent &&
                  Object.values(selectedRecord.typedContent).some((v) =>
                    v.trim(),
                  ) && (
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2 mb-3">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Keyboard className="w-3.5 h-3.5 text-clinic-blue" />
                        Typed Prescription
                      </p>
                      {[
                        {
                          label: "Chief Complaint",
                          value: selectedRecord.typedContent.chiefComplaint,
                        },
                        {
                          label: "Diagnosis",
                          value: selectedRecord.typedContent.diagnosis,
                        },
                        {
                          label: "Medicines / Rx",
                          value: selectedRecord.typedContent.medicines,
                        },
                        {
                          label: "Advice",
                          value: selectedRecord.typedContent.advice,
                        },
                        {
                          label: "Next Visit",
                          value: selectedRecord.typedContent.nextVisit,
                        },
                      ]
                        .filter((s) => s.value.trim())
                        .map((s) => (
                          <div key={s.label}>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              {s.label}
                            </p>
                            <p className="text-xs text-foreground whitespace-pre-wrap mt-0.5">
                              {s.value}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}

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
                    {/* Action buttons */}
                    <Button
                      className="w-full gap-2 bg-clinic-blue hover:bg-clinic-blue/90 text-white mt-2"
                      onClick={() => onEdit(selectedRecord)}
                      data-ocid="history.open_edit_button"
                    >
                      <PenLine className="w-4 h-4" />
                      Open &amp; Edit
                    </Button>
                    <Button
                      className="w-full gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                      onClick={() => handleWhatsApp(selectedRecord)}
                      data-ocid="history.whatsapp_button"
                    >
                      <MessageSquare className="w-4 h-4" />
                      WhatsApp
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
                    <Button
                      className="w-full gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                      onClick={() => handleWhatsApp(selectedRecord)}
                      data-ocid="history.whatsapp_button"
                    >
                      <MessageSquare className="w-4 h-4" />
                      WhatsApp
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
  onConfirm: (
    followUpDate: string,
    doctorName: string,
    vitals: { bp: string; pulse: string; spo2: string },
  ) => void;
}) {
  const [followUpDate, setFollowUpDate] = useState(todayStr());
  const [doctorName, setDoctorName] = useState(
    patient?.doctorName ?? "Dr. Dhravid Patel",
  );
  const [vitals, setVitals] = useState({ bp: "", pulse: "", spo2: "" });

  // Sync doctor name when patient changes
  useEffect(() => {
    if (patient) {
      setDoctorName(patient.doctorName);
      setFollowUpDate(todayStr());
      setVitals({
        bp: patient.vitals?.bp ?? "",
        pulse: patient.vitals?.pulse ?? "",
        spo2: patient.vitals?.spo2 ?? "",
      });
    }
  }, [patient]);

  function handleConfirm() {
    if (!followUpDate) {
      toast.error("Please select a follow-up date");
      return;
    }
    onConfirm(followUpDate, doctorName, vitals);
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
                  <SelectItem value="Dr. Dhravid Patel">
                    Dr. Dhravid Patel
                  </SelectItem>
                  <SelectItem value="Dr. Zeel Patel">Dr. Zeel Patel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vitals (Optional) */}
            <div className="space-y-3 border border-border rounded-lg p-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Vitals{" "}
                <span className="font-normal normal-case text-xs">
                  (Optional — shown on prescription)
                </span>
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="followup-bp">Blood Pressure</Label>
                  <Input
                    id="followup-bp"
                    placeholder="120/80 mmHg"
                    value={vitals.bp}
                    onChange={(e) =>
                      setVitals({ ...vitals, bp: e.target.value })
                    }
                    data-ocid="followup.bp_input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="followup-pulse">Pulse</Label>
                  <Input
                    id="followup-pulse"
                    placeholder="72 bpm"
                    value={vitals.pulse}
                    onChange={(e) =>
                      setVitals({ ...vitals, pulse: e.target.value })
                    }
                    data-ocid="followup.pulse_input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="followup-spo2">SpO2</Label>
                  <Input
                    id="followup-spo2"
                    placeholder="98%"
                    value={vitals.spo2}
                    onChange={(e) =>
                      setVitals({ ...vitals, spo2: e.target.value })
                    }
                    data-ocid="followup.spo2_input"
                  />
                </div>
              </div>
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
  initialTypedContent,
}: {
  patient: LocalPatient;
  onBack: () => void;
  onUpdate: (p: LocalPatient) => void;
  followUpDate?: string;
  initialPages?: string[];
  initialTypedContent?: TypedContent;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPatient, setCurrentPatient] = useState<LocalPatient>(patient);
  const [activeTab, setActiveTab] = useState("draw");
  const [typedContent, setTypedContent] = useState<TypedContent>(
    () => initialTypedContent ?? EMPTY_TYPED_CONTENT,
  );

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
    const hasTypedContent = Object.values(typedContent).some((v) => v.trim());
    const newRecord: PrescriptionRecord = {
      date: followUpDate ?? currentPatient.registrationDate,
      canvasData: firstPageData,
      pages: allPages,
      savedAt: new Date().toISOString(),
      ...(followUpDate ? { followUpDate } : {}),
      ...(hasTypedContent ? { typedContent } : {}),
    };
    const updatedHistory = [...history, newRecord].slice(-20);
    savePrescriptionHistory(currentPatient.uid, updatedHistory);
    toast.success("Prescription saved successfully");
  }

  const visitDate = followUpDate ?? currentPatient.registrationDate;
  const visitDateDisplay = formatDate(visitDate);

  // Patient info band items (no Doctor name)
  const patientInfoItems = [
    { label: "UID", value: currentPatient.uid },
    { label: "Name", value: currentPatient.name },
    { label: "Age", value: `${currentPatient.age} yrs` },
    { label: "Sex", value: currentPatient.sex },
    { label: "Contact", value: currentPatient.contact || "—" },
    { label: followUpDate ? "Follow-up" : "Date", value: visitDateDisplay },
  ];

  const vitalsDisplay = (() => {
    const v = currentPatient.vitals;
    if (!v) return "";
    const parts: string[] = [];
    if (v.bp) parts.push(`BP: ${v.bp}`);
    if (v.pulse) parts.push(`Pulse: ${v.pulse}`);
    if (v.spo2) parts.push(`SpO2: ${v.spo2}`);
    return parts.join("  |  ");
  })();

  // ── Generate Prescription PDF ─────────────────────────────────────────────
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  async function handleGeneratePDF() {
    setIsGeneratingPdf(true);
    try {
      const jsPDF = await loadJsPDF();
      const allPages = captureAllPages();
      const uploadedImages: string[] = (() => {
        try {
          return JSON.parse(currentPatient.imageData);
        } catch {
          return [];
        }
      })();

      // A4 dimensions in mm
      const A4_W = 210;
      const A4_H = 297;
      const MARGIN = 8; // mm side margin
      const CONTENT_W = A4_W - MARGIN * 2;

      // Load logo as base64
      let logoBase64 = "";
      try {
        const logoResp = await fetch(
          "/assets/generated/logo-white-circle.dim_400x400.png",
        );
        const blob = await logoResp.blob();
        logoBase64 = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch {
        /* skip logo if unavailable */
      }

      // Load doctor stamp as base64
      const stampFile =
        currentPatient.doctorName === "Dr. Dhravid Patel"
          ? "/assets/generated/stamp-dhravid-transparent.dim_300x120.png"
          : "/assets/generated/stamp-zeel-transparent.dim_300x120.png";
      let stampBase64 = "";
      try {
        const stampResp = await fetch(stampFile);
        const stampBlob = await stampResp.blob();
        stampBase64 = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(stampBlob);
        });
      } catch {
        /* skip stamp if unavailable */
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Helper: draw the full header (first page style) — returns y after header
      function drawFullHeader(isFirstPage: boolean) {
        if (!isFirstPage) pdf.addPage();

        // Header band height to fit logo + info
        const HEADER_H = 52;
        // Background gradient band (simulate with solid fill)
        pdf.setFillColor(26, 58, 138); // clinic-blue
        pdf.rect(0, 0, A4_W, HEADER_H, "F");
        pdf.setFillColor(192, 57, 43); // clinic-red accent
        pdf.rect(A4_W * 0.6, 0, A4_W * 0.4, HEADER_H, "F");

        // Logo — normal size 22x22 mm
        const LOGO_SIZE = 22;
        if (logoBase64) {
          try {
            pdf.addImage(logoBase64, "PNG", MARGIN, 4, LOGO_SIZE, LOGO_SIZE);
          } catch {
            /* skip */
          }
        }

        // Clinic name
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("Shreeji Clinic", MARGIN + LOGO_SIZE + 4, 14);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text("OPD Prescription", MARGIN + LOGO_SIZE + 4, 21);

        // Doctor + credentials + Date on right
        const doctorCreds = getDoctorCredentials(currentPatient.doctorName);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text(currentPatient.doctorName, A4_W - MARGIN, 14, {
          align: "right",
        });
        if (doctorCreds) {
          pdf.setFontSize(7.5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(220, 230, 255);
          pdf.text(doctorCreds, A4_W - MARGIN, 21, { align: "right" });
          pdf.setTextColor(255, 255, 255);
        }
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(255, 255, 255);
        pdf.text(visitDateDisplay, A4_W - MARGIN, 28, { align: "right" });

        // Patient info band
        const bandY = 34;
        pdf.setFillColor(15, 40, 100);
        pdf.rect(0, bandY, A4_W, 18, "F");

        const fields = [
          { label: "UID", value: currentPatient.uid },
          { label: "Name", value: currentPatient.name },
          { label: "Age", value: `${currentPatient.age} yrs` },
          { label: "Sex", value: currentPatient.sex },
          { label: "Contact", value: currentPatient.contact || "—" },
          {
            label: followUpDate ? "Follow-up" : "Date",
            value: visitDateDisplay,
          },
        ];

        const cellW = CONTENT_W / fields.length;
        fields.forEach((f, i) => {
          const cx = MARGIN + i * cellW + cellW / 2;
          pdf.setFontSize(6);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(180, 200, 255);
          pdf.text(f.label.toUpperCase(), cx, bandY + 5, { align: "center" });
          pdf.setFontSize(7.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(255, 255, 255);
          // Truncate long values
          const maxChars = Math.floor(cellW / 1.8);
          const val =
            f.value.length > maxChars
              ? `${f.value.slice(0, maxChars)}…`
              : f.value;
          pdf.text(val, cx, bandY + 11, { align: "center" });
        });

        let yAfterBand = bandY + 18 + 4;

        // Vitals row if present
        const pv = currentPatient.vitals;
        if (pv && (pv.bp || pv.pulse || pv.spo2)) {
          const vParts: string[] = [];
          if (pv.bp) vParts.push(`BP: ${pv.bp}`);
          if (pv.pulse) vParts.push(`Pulse: ${pv.pulse}`);
          if (pv.spo2) vParts.push(`SpO2: ${pv.spo2}`);
          pdf.setFillColor(230, 240, 255);
          pdf.rect(0, yAfterBand - 2, A4_W, 8, "F");
          pdf.setFontSize(7.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(26, 58, 138);
          pdf.text(
            `Vitals:  ${vParts.join("   |   ")}`,
            MARGIN,
            yAfterBand + 3.5,
          );
          yAfterBand += 10;
        }

        return yAfterBand; // return y position after header + small gap
      }

      // Helper: draw mini header for subsequent canvas pages
      function drawMiniHeader(pageNum: number, totalPages: number) {
        pdf.addPage();
        const miniH = 32;
        pdf.setFillColor(26, 58, 138);
        pdf.rect(0, 0, A4_W, miniH, "F");
        // Logo normal size on mini header
        if (logoBase64) {
          try {
            pdf.addImage(logoBase64, "PNG", MARGIN, 5, 20, 20);
          } catch {
            /* skip */
          }
        }
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("Shreeji Clinic", MARGIN + 25, 14);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Page ${pageNum} / ${totalPages}`, A4_W / 2, 14, {
          align: "center",
        });
        // Doctor + credentials on right
        const miniCreds = getDoctorCredentials(currentPatient.doctorName);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text(currentPatient.doctorName, A4_W - MARGIN, 14, {
          align: "right",
        });
        if (miniCreds) {
          pdf.setFontSize(6.5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(200, 215, 255);
          pdf.text(miniCreds, A4_W - MARGIN, 21, { align: "right" });
          pdf.setTextColor(255, 255, 255);
        }
        return miniH + 4;
      }

      // Helper: draw semi-transparent logo watermark in center of page (80mm)
      function drawLogoWatermark(pageContentY: number) {
        if (!logoBase64) return;
        try {
          const wmSize = 80; // mm — matches user requirement
          const wmX = (A4_W - wmSize) / 2;
          const wmY = pageContentY + (A4_H - pageContentY - wmSize) / 2;
          // jsPDF doesn't support native transparency for images, so we use a
          // small GState workaround via internal API if available, otherwise skip
          const pdfAny = pdf as any;
          if (
            pdfAny.saveGraphicsState &&
            pdfAny.restoreGraphicsState &&
            pdfAny.setGState &&
            pdfAny.GState
          ) {
            pdfAny.saveGraphicsState();
            pdfAny.setGState(new pdfAny.GState({ opacity: 0.12 }));
            pdf.addImage(logoBase64, "PNG", wmX, wmY, wmSize, wmSize);
            pdfAny.restoreGraphicsState();
          }
          // If no GState support, skip watermark rather than drawing opaque
        } catch {
          /* skip watermark if anything fails */
        }
      }

      // ── Typed content page (if any) ──────────────────────────────────────
      const hasTypedContent = Object.values(typedContent).some((v) => v.trim());
      let firstCanvasIsFirstPage = true;
      if (hasTypedContent) {
        // Typed content on first page — full header
        const contentY = drawFullHeader(true);
        let ty = contentY + 2;
        firstCanvasIsFirstPage = false; // canvas pages follow as subsequent pages

        const typedSections = [
          {
            label: "Chief Complaint / Symptoms",
            value: typedContent.chiefComplaint,
          },
          { label: "Diagnosis", value: typedContent.diagnosis },
          { label: "Rx — Medicines", value: typedContent.medicines },
          { label: "Advice / Instructions", value: typedContent.advice },
          { label: "Next Visit", value: typedContent.nextVisit },
        ].filter((s) => s.value.trim());

        const pdfAny = pdf as any;
        for (const section of typedSections) {
          // Section label band
          pdf.setFillColor(238, 241, 251);
          pdf.rect(MARGIN, ty, CONTENT_W, 7, "F");
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(26, 58, 138);
          pdf.text(section.label.toUpperCase(), MARGIN + 3, ty + 5);
          ty += 9;

          // Section content
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(40, 40, 40);
          const lines: string[] = pdfAny.splitTextToSize
            ? pdfAny.splitTextToSize(section.value, CONTENT_W - 6)
            : [section.value];
          for (const line of lines) {
            if (ty > A4_H - MARGIN - 6) {
              // Overflow to new page with mini header
              ty = drawMiniHeader(allPages.length + 1, allPages.length + 1);
            }
            pdf.text(line, MARGIN + 3, ty);
            ty += 6;
          }
          ty += 4; // gap between sections
        }
      }

      // Render canvas pages
      for (let i = 0; i < allPages.length; i++) {
        let contentY: number;
        if (i === 0 && firstCanvasIsFirstPage) {
          contentY = drawFullHeader(true);
        } else {
          contentY = drawMiniHeader(i + 1, allPages.length);
        }

        const pageData = allPages[i];
        // Draw watermark first (behind canvas content)
        drawLogoWatermark(contentY);
        if (pageData) {
          // Calculate image dimensions to fit page width while keeping aspect
          const availH = A4_H - contentY - MARGIN;
          const imgAspect = 794 / 1123; // canvas aspect ratio (W/H)
          let imgW = CONTENT_W;
          let imgH = imgW / imgAspect;
          if (imgH > availH) {
            imgH = availH;
            imgW = imgH * imgAspect;
          }
          const imgX = MARGIN + (CONTENT_W - imgW) / 2;
          try {
            pdf.addImage(pageData, "PNG", imgX, contentY, imgW, imgH);
          } catch {
            /* skip blank/corrupt pages */
          }
        }

        // Add doctor stamp on the last canvas page (bottom-right)
        if (i === allPages.length - 1 && stampBase64) {
          try {
            const STAMP_W = 55; // mm
            const STAMP_H = 22; // mm
            const STAMP_FOOTER_OFFSET = 14; // above footer
            const stampX = A4_W - MARGIN - STAMP_W;
            const stampY = A4_H - STAMP_FOOTER_OFFSET - STAMP_H;
            pdf.addImage(stampBase64, "PNG", stampX, stampY, STAMP_W, STAMP_H);
          } catch {
            /* skip stamp */
          }
        }
      }

      // Render uploaded image pages
      for (let i = 0; i < uploadedImages.length; i++) {
        pdf.addPage();
        const imgHeaderH = 18;
        pdf.setFillColor(26, 58, 138);
        pdf.rect(0, 0, A4_W, imgHeaderH, "F");
        if (logoBase64) {
          try {
            pdf.addImage(logoBase64, "PNG", MARGIN, 2, 14, 14);
          } catch {
            /* skip */
          }
        }
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("Shreeji Clinic", MARGIN + 17, 9);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Image ${i + 1} / ${uploadedImages.length}`, A4_W / 2, 9, {
          align: "center",
        });
        const imgMiniCreds = getDoctorCredentials(currentPatient.doctorName);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text(currentPatient.doctorName, A4_W - MARGIN, 8, {
          align: "right",
        });
        if (imgMiniCreds) {
          pdf.setFontSize(6.5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(200, 215, 255);
          pdf.text(imgMiniCreds, A4_W - MARGIN, 14, { align: "right" });
          pdf.setTextColor(255, 255, 255);
        }

        const imgContentY = imgHeaderH + 3;
        drawLogoWatermark(imgContentY);
        const availH = A4_H - imgContentY - MARGIN;
        // Load image to get natural dimensions
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const aspect = img.naturalWidth / img.naturalHeight;
            let iW = CONTENT_W;
            let iH = iW / aspect;
            if (iH > availH) {
              iH = availH;
              iW = iH * aspect;
            }
            const iX = MARGIN + (CONTENT_W - iW) / 2;
            const iY = imgContentY + (availH - iH) / 2;
            try {
              pdf.addImage(uploadedImages[i], "JPEG", iX, iY, iW, iH);
            } catch {
              try {
                pdf.addImage(uploadedImages[i], "PNG", iX, iY, iW, iH);
              } catch {
                /* skip */
              }
            }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = uploadedImages[i];
        });
      }

      // Add footer to every page
      const totalPDFPages =
        (pdf as any).getNumberOfPages?.() ??
        (pdf as any).internal?.getNumberOfPages?.() ??
        1;
      for (let p = 1; p <= totalPDFPages; p++) {
        (pdf as any).setPage(p);
        const footerH = 12;
        const footerY = A4_H - footerH;
        pdf.setFillColor(26, 58, 138);
        pdf.rect(0, footerY, A4_W, footerH, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("We listen, We Care, We Heal.", A4_W / 2, footerY + 8, {
          align: "center",
        });
      }

      // Direct download — no print dialog
      const safeUid = currentPatient.uid.replace(/[^a-zA-Z0-9-]/g, "-");
      const safeDateForFile = visitDate.replace(/-/g, "");
      pdf.save(`Prescription-${safeUid}-${safeDateForFile}.pdf`);
      toast.success("Prescription PDF downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate prescription PDF");
    }
    setIsGeneratingPdf(false);
  }

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
                className="w-10 h-10 object-cover rounded-full"
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
              {getDoctorCredentials(currentPatient.doctorName) && (
                <p className="text-white/70 text-xs mt-0.5">
                  {getDoctorCredentials(currentPatient.doctorName)}
                </p>
              )}
              <p className="text-white/70 mt-1">{visitDateDisplay}</p>
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
          {/* Vitals Bar */}
          {vitalsDisplay && (
            <div className="mt-3 bg-white/10 rounded-lg px-3 py-2">
              <p className="text-white/60 text-xs uppercase tracking-wide mb-0.5">
                Vitals
              </p>
              <p className="text-white font-semibold text-sm">
                {vitalsDisplay}
              </p>
            </div>
          )}
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
                  value="type"
                  className="gap-1.5"
                  data-ocid="prescription.type_tab"
                >
                  <Keyboard className="w-4 h-4" />
                  Type
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

          {/* Type Tab */}
          {activeTab === "type" && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5" />
                Type your prescription details below. This will be included in
                the saved record and PDF.
              </p>

              {/* Chief Complaint */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="typed-chief-complaint"
                  className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
                >
                  <span className="w-5 h-5 rounded-full bg-clinic-red/15 flex items-center justify-center text-clinic-red text-[10px] font-bold">
                    C
                  </span>
                  Chief Complaint / Symptoms
                </Label>
                <Textarea
                  id="typed-chief-complaint"
                  placeholder="Describe the patient's chief complaint and symptoms..."
                  rows={3}
                  value={typedContent.chiefComplaint}
                  onChange={(e) =>
                    setTypedContent((prev) => ({
                      ...prev,
                      chiefComplaint: e.target.value,
                    }))
                  }
                  className="resize-none text-sm leading-relaxed"
                  data-ocid="prescription.chief_complaint_textarea"
                />
              </div>

              {/* Diagnosis */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="typed-diagnosis"
                  className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
                >
                  <span className="w-5 h-5 rounded-full bg-clinic-blue/15 flex items-center justify-center text-clinic-blue text-[10px] font-bold">
                    D
                  </span>
                  Diagnosis
                </Label>
                <Textarea
                  id="typed-diagnosis"
                  placeholder="Enter diagnosis..."
                  rows={2}
                  value={typedContent.diagnosis}
                  onChange={(e) =>
                    setTypedContent((prev) => ({
                      ...prev,
                      diagnosis: e.target.value,
                    }))
                  }
                  className="resize-none text-sm leading-relaxed"
                  data-ocid="prescription.diagnosis_textarea"
                />
              </div>

              {/* Medicines / Rx */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="typed-medicines"
                  className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                    <Pill className="w-3 h-3" />
                  </span>
                  Medicines / Rx
                </Label>
                <Textarea
                  id="typed-medicines"
                  placeholder={
                    "Rx:\n1. Medicine name \u2013 dose \u2013 frequency \u2013 duration\n2. ..."
                  }
                  rows={5}
                  value={typedContent.medicines}
                  onChange={(e) =>
                    setTypedContent((prev) => ({
                      ...prev,
                      medicines: e.target.value,
                    }))
                  }
                  className="resize-none text-sm font-mono leading-relaxed"
                  data-ocid="prescription.medicines_textarea"
                />
              </div>

              {/* Advice */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="typed-advice"
                  className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
                >
                  <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-[10px] font-bold">
                    A
                  </span>
                  Advice / Instructions
                </Label>
                <Textarea
                  id="typed-advice"
                  placeholder="Diet, rest, lifestyle advice, and special instructions..."
                  rows={3}
                  value={typedContent.advice}
                  onChange={(e) =>
                    setTypedContent((prev) => ({
                      ...prev,
                      advice: e.target.value,
                    }))
                  }
                  className="resize-none text-sm leading-relaxed"
                  data-ocid="prescription.advice_textarea"
                />
              </div>

              {/* Next Visit */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="typed-next-visit"
                  className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
                >
                  <span className="w-5 h-5 rounded-full bg-clinic-blue/15 flex items-center justify-center text-clinic-blue flex-shrink-0">
                    <Clock className="w-3 h-3" />
                  </span>
                  Next Visit
                </Label>
                <Input
                  id="typed-next-visit"
                  placeholder="e.g. After 7 days / 15/04/2026 / As needed"
                  value={typedContent.nextVisit}
                  onChange={(e) =>
                    setTypedContent((prev) => ({
                      ...prev,
                      nextVisit: e.target.value,
                    }))
                  }
                  className="text-sm"
                  data-ocid="prescription.next_visit_input"
                />
              </div>
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

          {/* Doctor Stamp — bottom right of prescription paper */}
          <div className="flex justify-end mt-4 pt-3 border-t border-border/40">
            <img
              src={
                currentPatient.doctorName === "Dr. Dhravid Patel"
                  ? "/assets/generated/stamp-dhravid-transparent.dim_300x120.png"
                  : "/assets/generated/stamp-zeel-transparent.dim_300x120.png"
              }
              alt="Doctor Stamp"
              className="h-16 object-contain opacity-90"
              data-ocid="prescription.doctor_stamp"
            />
          </div>
        </div>
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
              const message = `Dear ${currentPatient.name},\n\nYour OPD prescription from Shreeji Clinic is ready.\n\nPatient Details:\nUID: ${currentPatient.uid}\nName: ${currentPatient.name}\nAge/Sex: ${currentPatient.age} yrs / ${currentPatient.sex}\nContact: ${currentPatient.contact}\nDoctor: ${currentPatient.doctorName}\nVisit Date: ${visitDateDisplay}\n\nPlease visit the clinic as advised.\n- Shreeji Clinic`;
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
            className="gap-2 border-clinic-blue/40 text-clinic-blue hover:bg-clinic-blue/10"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPdf}
            data-ocid="prescription.generate_pdf_button"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Generate PDF
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

// ── Doctor credentials helper ──────────────────────────────────────────────

function getDoctorCredentials(doctorName: string): string {
  if (doctorName === "Dr. Dhravid Patel") return "BHMS, CCH G-32387";
  if (doctorName === "Dr. Zeel Patel") return "BHMS, CCH G-34069";
  return "";
}

// ── jsPDF CDN loader ───────────────────────────────────────────────────────

type JsPDFClass = new (options?: {
  orientation?: string;
  unit?: string;
  format?: string;
}) => {
  addPage(): void;
  save(filename: string): void;
  setFillColor(r: number, g: number, b: number): void;
  setTextColor(r: number, g: number, b: number): void;
  setFontSize(size: number): void;
  setFont(fontName: string, fontStyle?: string): void;
  rect(x: number, y: number, w: number, h: number, style?: string): void;
  text(text: string, x: number, y: number, options?: { align?: string }): void;
  addImage(
    imageData: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void;
};

let _jsPDFLoaded = false;
async function loadJsPDF(): Promise<JsPDFClass> {
  if (!_jsPDFLoaded) {
    await new Promise<void>((resolve, reject) => {
      const win = window as any;
      if (win.jspdf || win.jsPDF) {
        _jsPDFLoaded = true;
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => {
        _jsPDFLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  const win = window as any;
  return (win.jspdf?.jsPDF ?? win.jsPDF) as JsPDFClass;
}

// ── Billing Dialog ─────────────────────────────────────────────────────────

function generateBillId(): string {
  const now = new Date();
  const ts = now.getTime().toString(36).toUpperCase();
  return `BILL-${ts}`;
}

function computeBillTotals(
  items: BillItem[],
  discount: number,
  discountType: "amount" | "percent",
  gstPercent: number,
): Pick<
  Bill,
  "subtotal" | "discountAmount" | "taxableAmount" | "gstAmount" | "grandTotal"
> {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const discountAmount =
    discountType === "percent"
      ? Math.min((subtotal * discount) / 100, subtotal)
      : Math.min(discount, subtotal);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const gstAmount = (taxableAmount * gstPercent) / 100;
  const grandTotal = taxableAmount + gstAmount;
  return { subtotal, discountAmount, taxableAmount, gstAmount, grandTotal };
}

async function generateBillPDF(
  patient: LocalPatient,
  bill: Bill,
): Promise<void> {
  const jsPDF = await loadJsPDF();

  const A4_W = 210;
  const A4_H = 297;
  const MARGIN = 10;
  const CONTENT_W = A4_W - MARGIN * 2;

  // Load logo
  let logoBase64 = "";
  try {
    const logoResp = await fetch(
      "/assets/generated/logo-white-circle.dim_400x400.png",
    );
    const blob = await logoResp.blob();
    logoBase64 = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    /* skip */
  }

  // Load stamp for bill
  const billStampFile =
    patient.doctorName === "Dr. Dhravid Patel"
      ? "/assets/generated/stamp-dhravid-transparent.dim_300x120.png"
      : "/assets/generated/stamp-zeel-transparent.dim_300x120.png";
  let billStampBase64 = "";
  try {
    const billStampResp = await fetch(billStampFile);
    const billStampBlob = await billStampResp.blob();
    billStampBase64 = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsDataURL(billStampBlob);
    });
  } catch {
    /* skip */
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Header band ──────────────────────────────────────────────
  const BILL_LOGO_SIZE = 22;
  const BILL_HEADER_H = 36;
  pdf.setFillColor(26, 58, 138);
  pdf.rect(0, 0, A4_W, BILL_HEADER_H, "F");
  pdf.setFillColor(192, 57, 43);
  pdf.rect(A4_W * 0.6, 0, A4_W * 0.4, BILL_HEADER_H, "F");

  // Logo — normal size 22x22 mm
  if (logoBase64) {
    try {
      pdf.addImage(
        logoBase64,
        "PNG",
        MARGIN,
        7,
        BILL_LOGO_SIZE,
        BILL_LOGO_SIZE,
      );
    } catch {
      /* skip */
    }
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Shreeji Clinic", MARGIN + BILL_LOGO_SIZE + 4, 16);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("OPD — Patient Bill", MARGIN + BILL_LOGO_SIZE + 4, 23);

  // Doctor name + credentials + Bill ID on right
  const billDoctorCreds = getDoctorCredentials(patient.doctorName);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(patient.doctorName, A4_W - MARGIN, 14, { align: "right" });
  if (billDoctorCreds) {
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(220, 230, 255);
    pdf.text(billDoctorCreds, A4_W - MARGIN, 21, { align: "right" });
    pdf.setTextColor(255, 255, 255);
  }
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(220, 220, 255);
  pdf.text(`${bill.billId}  |  ${formatDate(bill.date)}`, A4_W - MARGIN, 29, {
    align: "right",
  });

  // ── Patient info band ─────────────────────────────────────────
  const bandY = BILL_HEADER_H;
  pdf.setFillColor(15, 40, 100);
  pdf.rect(0, bandY, A4_W, 18, "F");

  const ptFields = [
    { label: "UID", value: patient.uid },
    { label: "Name", value: patient.name },
    { label: "Age/Sex", value: `${patient.age}y / ${patient.sex}` },
    { label: "Contact", value: patient.contact || "—" },
    { label: "Date", value: formatDate(bill.date) },
  ];
  const cellW = CONTENT_W / ptFields.length;
  ptFields.forEach((f, i) => {
    const cx = MARGIN + i * cellW + cellW / 2;
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(180, 200, 255);
    pdf.text(f.label.toUpperCase(), cx, bandY + 5, { align: "center" });
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    const maxChars = Math.floor(cellW / 1.8);
    const val =
      f.value.length > maxChars ? `${f.value.slice(0, maxChars)}…` : f.value;
    pdf.text(val, cx, bandY + 11, { align: "center" });
  });

  // ── Logo watermark in center of page (80mm semi-transparent) ────
  if (logoBase64) {
    try {
      const wmSize = 80; // mm — matches user requirement
      const wmX = (A4_W - wmSize) / 2;
      const wmY = (A4_H - wmSize) / 2;
      const pdfAny = pdf as any;
      if (
        pdfAny.saveGraphicsState &&
        pdfAny.restoreGraphicsState &&
        pdfAny.setGState &&
        pdfAny.GState
      ) {
        pdfAny.saveGraphicsState();
        pdfAny.setGState(new pdfAny.GState({ opacity: 0.12 }));
        pdf.addImage(logoBase64, "PNG", wmX, wmY, wmSize, wmSize);
        pdfAny.restoreGraphicsState();
      } else {
        pdf.addImage(logoBase64, "PNG", wmX, wmY, wmSize, wmSize);
      }
    } catch {
      /* skip watermark */
    }
  }

  // ── Items table ───────────────────────────────────────────────
  let y = bandY + 18 + 6;

  // Table header
  pdf.setFillColor(238, 241, 251);
  pdf.rect(MARGIN, y, CONTENT_W, 8, "F");
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 50, 120);
  const COL = {
    num: MARGIN,
    desc: MARGIN + 10,
    qty: MARGIN + CONTENT_W - 54,
    unit: MARGIN + CONTENT_W - 36,
    amt: MARGIN + CONTENT_W,
  };
  pdf.text("#", COL.num + 1, y + 5.5);
  pdf.text("Description", COL.desc + 1, y + 5.5);
  pdf.text("Qty", COL.qty + 6, y + 5.5, { align: "center" });
  pdf.text("Unit Rs.", COL.unit + 9, y + 5.5, { align: "right" });
  pdf.text("Amount", COL.amt, y + 5.5, { align: "right" });

  y += 8;

  // Item rows
  bill.items.forEach((item, idx) => {
    const rowH = 7;
    if (idx % 2 === 0) {
      pdf.setFillColor(248, 250, 255);
      pdf.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 60);
    pdf.text(String(idx + 1), COL.num + 1, y + 4.5);
    // Truncate description to fit
    const descMax = 55;
    const descText =
      item.description.length > descMax
        ? `${item.description.slice(0, descMax)}…`
        : item.description;
    pdf.text(descText, COL.desc + 1, y + 4.5);
    pdf.text(String(item.quantity), COL.qty + 6, y + 4.5, { align: "center" });
    pdf.text(`Rs.${item.unitPrice.toFixed(2)}`, COL.unit + 9, y + 4.5, {
      align: "right",
    });
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(26, 58, 138);
    pdf.text(
      `Rs.${(item.quantity * item.unitPrice).toFixed(2)}`,
      COL.amt,
      y + 4.5,
      { align: "right" },
    );
    y += rowH;
  });

  // ── Totals ────────────────────────────────────────────────────
  y += 4;
  const totalsX = MARGIN + CONTENT_W * 0.5;
  const totalsW = CONTENT_W * 0.5;

  function drawTotalRow(
    label: string,
    value: string,
    isFinal = false,
    isRed = false,
  ) {
    if (isFinal) {
      pdf.setFillColor(26, 58, 138);
      pdf.rect(totalsX, y, totalsW, 9, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(label, totalsX + 3, y + 6.5);
      pdf.text(value, totalsX + totalsW - 3, y + 6.5, { align: "right" });
      y += 9;
    } else {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(isRed ? 180 : 100, isRed ? 30 : 100, isRed ? 30 : 100);
      pdf.text(label, totalsX + 3, y + 5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(isRed ? 180 : 40, isRed ? 30 : 40, isRed ? 30 : 40);
      pdf.text(value, totalsX + totalsW - 3, y + 5, { align: "right" });
      y += 7;
    }
  }

  drawTotalRow("Subtotal", `Rs.${bill.subtotal.toFixed(2)}`);
  if (bill.discountAmount > 0) {
    const discLabel =
      bill.discountType === "percent"
        ? `Discount (${bill.discount}%)`
        : "Discount (Amount)";
    drawTotalRow(
      discLabel,
      `-Rs.${bill.discountAmount.toFixed(2)}`,
      false,
      true,
    );
  }
  if (bill.gstAmount > 0) {
    drawTotalRow(
      `GST (${bill.gstPercent}%)`,
      `Rs.${bill.gstAmount.toFixed(2)}`,
    );
  }
  drawTotalRow("Grand Total", `Rs.${bill.grandTotal.toFixed(2)}`, true);

  // ── Attending Doctor stamp & name ──────────────────────────────
  const attendingY = y + 8;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(80, 80, 80);
  pdf.text("Attending Doctor:", MARGIN, attendingY + 4);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(26, 58, 138);
  pdf.text(patient.doctorName, MARGIN + 35, attendingY + 4);
  const billDocCreds2 = getDoctorCredentials(patient.doctorName);
  if (billDocCreds2) {
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(80, 80, 80);
    pdf.text(billDocCreds2, MARGIN + 35, attendingY + 10);
  }
  if (billStampBase64) {
    try {
      const STAMP_W = 50;
      const STAMP_H = 20;
      const stampX = A4_W - MARGIN - STAMP_W;
      const stampY = attendingY - 2;
      pdf.addImage(billStampBase64, "PNG", stampX, stampY, STAMP_W, STAMP_H);
    } catch {
      /* skip */
    }
  }

  // ── Footer ─────────────────────────────────────────────────────
  const footerY = A4_H - 18;
  pdf.setFillColor(26, 58, 138);
  pdf.rect(0, footerY, A4_W, 18, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("We listen, We Care, We Heal.", A4_W / 2, footerY + 8, {
    align: "center",
  });
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("Thank you for visiting Shreeji Clinic", A4_W / 2, footerY + 14, {
    align: "center",
  });

  // Direct download
  const safeName = patient.name.replace(/[^a-zA-Z0-9]/g, "_");
  const safeDate = bill.date.replace(/-/g, "");
  pdf.save(`Bill_${safeName}_${bill.billId}_${safeDate}.pdf`);
}

// ── Certificate PDF Generator ──────────────────────────────────────────────

async function generateCertificatePDF(
  patient: LocalPatient,
  certType: "rest" | "fitness",
  fields: {
    diagnosis?: string;
    restFrom?: string;
    restTo?: string;
    examinedOn?: string;
    purpose?: string;
    remarks?: string;
    doctorName: string;
  },
): Promise<void> {
  const jsPDF = await loadJsPDF();

  const A4_W = 210;
  const A4_H = 297;
  const MARGIN = 14;

  // Load logo
  let logoBase64 = "";
  try {
    const resp = await fetch(
      "/assets/generated/logo-white-circle.dim_400x400.png",
    );
    const blob = await resp.blob();
    logoBase64 = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    /* skip */
  }

  // Load stamp
  const stampFile =
    fields.doctorName === "Dr. Dhravid Patel"
      ? "/assets/generated/stamp-dhravid-transparent.dim_300x120.png"
      : "/assets/generated/stamp-zeel-transparent.dim_300x120.png";
  let stampBase64 = "";
  try {
    const stampResp = await fetch(stampFile);
    const stampBlob = await stampResp.blob();
    stampBase64 = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsDataURL(stampBlob);
    });
  } catch {
    /* skip */
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Header band ──────────────────────────────────────────────
  const LOGO_SIZE = 22;
  const HEADER_H = 36;
  pdf.setFillColor(26, 58, 138);
  pdf.rect(0, 0, A4_W, HEADER_H, "F");
  pdf.setFillColor(192, 57, 43);
  pdf.rect(A4_W * 0.6, 0, A4_W * 0.4, HEADER_H, "F");

  if (logoBase64) {
    try {
      pdf.addImage(logoBase64, "PNG", MARGIN, 7, LOGO_SIZE, LOGO_SIZE);
    } catch {
      /* skip */
    }
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Shreeji Clinic", MARGIN + LOGO_SIZE + 4, 16);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("OPD — Medical Certificate", MARGIN + LOGO_SIZE + 4, 23);

  const doctorCreds = getDoctorCredentials(fields.doctorName);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text(fields.doctorName, A4_W - MARGIN, 14, { align: "right" });
  if (doctorCreds) {
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(220, 230, 255);
    pdf.text(doctorCreds, A4_W - MARGIN, 21, { align: "right" });
    pdf.setTextColor(255, 255, 255);
  }
  const todayLabel = new Date()
    .toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "/");
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(220, 220, 255);
  pdf.text(todayLabel, A4_W - MARGIN, 29, { align: "right" });

  // ── Patient info band ─────────────────────────────────────────
  const bandY = HEADER_H;
  const CONTENT_W = A4_W - MARGIN * 2;
  pdf.setFillColor(15, 40, 100);
  pdf.rect(0, bandY, A4_W, 18, "F");

  const ptFields = [
    { label: "UID", value: patient.uid },
    { label: "Name", value: patient.name },
    { label: "Age/Sex", value: `${patient.age}y / ${patient.sex}` },
    { label: "Contact", value: patient.contact || "—" },
    { label: "Date", value: todayLabel },
  ];
  const cellW = CONTENT_W / ptFields.length;
  ptFields.forEach((f, i) => {
    const cx = MARGIN + i * cellW + cellW / 2;
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(180, 200, 255);
    pdf.text(f.label.toUpperCase(), cx, bandY + 5, { align: "center" });
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    const maxChars = Math.floor(cellW / 1.8);
    const val =
      f.value.length > maxChars ? `${f.value.slice(0, maxChars)}…` : f.value;
    pdf.text(val, cx, bandY + 11, { align: "center" });
  });

  // ── Certificate Title ─────────────────────────────────────────
  let yPos = bandY + 18 + 18;
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(26, 58, 138);
  const title =
    certType === "rest" ? "REST CERTIFICATE" : "FITNESS CERTIFICATE";
  pdf.text(title, A4_W / 2, yPos, { align: "center" });

  // Underline
  yPos += 3;
  pdf.setFillColor(192, 57, 43);
  pdf.rect(MARGIN + 20, yPos, CONTENT_W - 40, 1, "F");

  // ── Certificate Body ──────────────────────────────────────────
  yPos += 12;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(30, 30, 30);

  const formatDateDisplay = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  let bodyLines: string[] = [];
  if (certType === "rest") {
    const diagnosis = fields.diagnosis || "illness";
    const from = fields.restFrom ? formatDateDisplay(fields.restFrom) : "—";
    const to = fields.restTo ? formatDateDisplay(fields.restTo) : "—";
    const examDate = fields.restFrom
      ? formatDateDisplay(fields.restFrom)
      : todayLabel;
    bodyLines = [
      `This is to certify that ${patient.name}, Age ${patient.age} years, UID ${patient.uid},`,
      `was examined by ${fields.doctorName} on ${examDate}.`,
      "",
      `The patient has been diagnosed with ${diagnosis} and is advised`,
      `complete rest from ${from} to ${to}.`,
    ];
  } else {
    const examined = fields.examinedOn
      ? formatDateDisplay(fields.examinedOn)
      : todayLabel;
    const purpose = fields.purpose || "general purposes";
    bodyLines = [
      `This is to certify that ${patient.name}, Age ${patient.age} years, UID ${patient.uid},`,
      `was examined by ${fields.doctorName} on ${examined}`,
      `and found medically fit for ${purpose}.`,
    ];
  }

  const LINE_H = 8;
  for (const line of bodyLines) {
    if (line === "") {
      yPos += LINE_H / 2;
    } else {
      pdf.text(line, MARGIN, yPos);
      yPos += LINE_H;
    }
  }

  if (fields.remarks) {
    yPos += 6;
    pdf.setFont("helvetica", "bold");
    pdf.text("Remarks: ", MARGIN, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(fields.remarks, MARGIN + 22, yPos);
    yPos += LINE_H;
  }

  // ── Signature area ────────────────────────────────────────────
  const sigY = A4_H - 55;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text("Authorised Signatory", A4_W - MARGIN, sigY, { align: "right" });
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(26, 58, 138);
  pdf.text(fields.doctorName, A4_W - MARGIN, sigY + 7, { align: "right" });
  if (doctorCreds) {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(80, 80, 80);
    pdf.text(doctorCreds, A4_W - MARGIN, sigY + 13, { align: "right" });
  }

  if (stampBase64) {
    try {
      const STAMP_W = 50;
      const STAMP_H = 20;
      pdf.addImage(
        stampBase64,
        "PNG",
        A4_W - MARGIN - STAMP_W,
        sigY + 17,
        STAMP_W,
        STAMP_H,
      );
    } catch {
      /* skip */
    }
  }

  // ── Footer ────────────────────────────────────────────────────
  const footerY = A4_H - 10;
  pdf.setFillColor(26, 58, 138);
  pdf.rect(0, footerY - 8, A4_W, 18, "F");
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(255, 255, 255);
  pdf.text("We listen, We Care, We Heal.", A4_W / 2, footerY, {
    align: "center",
  });

  // Save
  const safeName = patient.name.replace(/[^a-zA-Z0-9]/g, "_");
  const certLabel =
    certType === "rest" ? "RestCertificate" : "FitnessCertificate";
  pdf.save(`${certLabel}_${safeName}_${patient.uid}.pdf`);
}

// ── generateReferralPDF ───────────────────────────────────────────────────

async function generateReferralPDF(
  patient: LocalPatient,
  fields: {
    doctorName: string;
    referredToDoctor: string;
    referredToDept: string;
    referredToHospital?: string;
    referralDoctorPhone?: string;
    reason: string;
    urgency: "normal" | "urgent";
    remarks?: string;
  },
): Promise<void> {
  const jsPDF = await loadJsPDF();

  const A4_W = 210;
  const A4_H = 297;
  const MARGIN = 14;

  // Load logo
  let logoBase64 = "";
  try {
    const resp = await fetch(
      "/assets/generated/logo-white-circle.dim_400x400.png",
    );
    const blob = await resp.blob();
    logoBase64 = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    /* skip */
  }

  // Load stamp
  const stampFile =
    fields.doctorName === "Dr. Dhravid Patel"
      ? "/assets/generated/stamp-dhravid-transparent.dim_300x120.png"
      : "/assets/generated/stamp-zeel-transparent.dim_300x120.png";
  let stampBase64 = "";
  try {
    const stampResp = await fetch(stampFile);
    const stampBlob = await stampResp.blob();
    stampBase64 = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsDataURL(stampBlob);
    });
  } catch {
    /* skip */
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pdfAny = pdf as any;
  // ── Header band ──────────────────────────────────────────────
  const LOGO_SIZE = 22;
  const HEADER_H = 36;
  pdf.setFillColor(26, 58, 138);
  pdf.rect(0, 0, A4_W, HEADER_H, "F");
  pdf.setFillColor(192, 57, 43);
  pdf.rect(A4_W * 0.6, 0, A4_W * 0.4, HEADER_H, "F");

  if (logoBase64) {
    try {
      pdf.addImage(logoBase64, "PNG", MARGIN, 7, LOGO_SIZE, LOGO_SIZE);
    } catch {
      /* skip */
    }
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Shreeji Clinic", MARGIN + LOGO_SIZE + 4, 16);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("OPD — Referral Letter", MARGIN + LOGO_SIZE + 4, 23);

  const doctorCreds = getDoctorCredentials(fields.doctorName);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text(fields.doctorName, A4_W - MARGIN, 14, { align: "right" });
  if (doctorCreds) {
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    pdf.text(doctorCreds, A4_W - MARGIN, 20, { align: "right" });
  }
  const todayFormatted = new Date().toLocaleDateString("en-GB");
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Date: ${todayFormatted}`, A4_W - MARGIN, 30, { align: "right" });

  // ── Patient info band ─────────────────────────────────────────
  let yPos = HEADER_H + 8;
  pdf.setFillColor(240, 245, 255);
  pdf.rect(0, HEADER_H + 2, A4_W, 18, "F");
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(40, 40, 40);
  const patInfo = [
    `UID: ${patient.uid}`,
    `Name: ${patient.name}`,
    `Age/Sex: ${patient.age}Y / ${patient.sex}`,
    `Contact: ${patient.contact}`,
  ];
  const colW = (A4_W - MARGIN * 2) / 2;
  patInfo.forEach((info, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    pdf.text(info, MARGIN + col * colW, HEADER_H + 8 + row * 6);
  });
  yPos = HEADER_H + 26;

  // ── Title ─────────────────────────────────────────────────────
  yPos += 8;
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 128, 128);
  pdf.text("REFERRAL LETTER", A4_W / 2, yPos, { align: "center" });
  yPos += 3;
  pdfAny.setDrawColor(220, 50, 50);
  pdfAny.setLineWidth(0.8);
  pdfAny.line(MARGIN + 30, yPos, A4_W - MARGIN - 30, yPos);
  yPos += 10;

  // ── Body ─────────────────────────────────────────────────────
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(30, 30, 30);
  const LINE_H = 7;

  const lines: string[] = [
    `Dear Dr. ${fields.referredToDoctor},`,
    "",
    `We are referring our patient ${patient.name}, Age ${patient.age} years,`,
    `UID: ${patient.uid}, for your expert opinion and management.`,
    "",
    `Department / Speciality: ${fields.referredToDept}`,
  ];
  if (fields.referredToHospital) {
    lines.push(`Hospital / Clinic: ${fields.referredToHospital}`);
  }
  if (fields.referralDoctorPhone) {
    lines.push(`Contact: ${fields.referralDoctorPhone}`);
  }
  lines.push("");
  lines.push("Reason for Referral / Diagnosis:");

  for (const line of lines) {
    if (line === "") {
      yPos += LINE_H / 2;
    } else {
      pdf.text(line, MARGIN, yPos);
      yPos += LINE_H;
    }
  }

  // Wrapped reason
  const wrappedReason = pdfAny.splitTextToSize(
    fields.reason,
    A4_W - MARGIN * 2 - 4,
  );
  for (const rline of wrappedReason) {
    pdf.text(`  ${rline}`, MARGIN, yPos);
    yPos += LINE_H;
  }

  yPos += LINE_H / 2;
  pdf.setFont("helvetica", "bold");
  pdf.text("Urgency: ", MARGIN, yPos);
  pdf.setFont("helvetica", "normal");
  const urgencyText = fields.urgency === "urgent" ? "URGENT" : "Normal";
  if (fields.urgency === "urgent") {
    pdf.setTextColor(200, 30, 30);
  }
  pdf.text(urgencyText, MARGIN + 22, yPos);
  pdf.setTextColor(30, 30, 30);
  yPos += LINE_H;

  if (fields.remarks) {
    yPos += 4;
    pdf.setFont("helvetica", "bold");
    pdf.text("Remarks: ", MARGIN, yPos);
    pdf.setFont("helvetica", "normal");
    const wrappedRemarks = pdfAny.splitTextToSize(
      fields.remarks,
      A4_W - MARGIN * 2 - 25,
    );
    pdf.text(wrappedRemarks[0], MARGIN + 22, yPos);
    yPos += LINE_H;
  }

  // ── Signature area ─────────────────────────────────────────────
  const sigY = A4_H - 55;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text("Authorised Signatory", A4_W - MARGIN, sigY, { align: "right" });
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(26, 58, 138);
  pdf.text(fields.doctorName, A4_W - MARGIN, sigY + 7, { align: "right" });
  if (doctorCreds) {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(80, 80, 80);
    pdf.text(doctorCreds, A4_W - MARGIN, sigY + 13, { align: "right" });
  }

  if (stampBase64) {
    try {
      const STAMP_W = 50;
      const STAMP_H = 20;
      pdf.addImage(
        stampBase64,
        "PNG",
        A4_W - MARGIN - STAMP_W,
        sigY + 17,
        STAMP_W,
        STAMP_H,
      );
    } catch {
      /* skip */
    }
  }

  // ── Footer ────────────────────────────────────────────────────
  const footerY = A4_H - 10;
  pdf.setFillColor(26, 58, 138);
  pdf.rect(0, footerY - 8, A4_W, 18, "F");
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(255, 255, 255);
  pdf.text("We listen, We Care, We Heal.", A4_W / 2, footerY, {
    align: "center",
  });

  pdf.save(`ReferralLetter_${patient.uid}.pdf`);
}

// ── CertificateDialog ─────────────────────────────────────────────────────

function CertificateDialog({
  patient,
  open,
  onClose,
}: {
  patient: LocalPatient | null;
  open: boolean;
  onClose: () => void;
}) {
  const [certType, setCertType] = useState<"rest" | "fitness">("rest");
  const [diagnosis, setDiagnosis] = useState("");
  const [restFrom, setRestFrom] = useState(todayStr());
  const [restTo, setRestTo] = useState("");
  const [examinedOn, setExaminedOn] = useState(todayStr());
  const [purpose, setPurpose] = useState("");
  const [remarks, setRemarks] = useState("");
  const [doctorName, setDoctorName] = useState("Dr. Dhravid Patel");
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset when patient changes
  useEffect(() => {
    if (patient) {
      setDoctorName(patient.doctorName || "Dr. Dhravid Patel");
      setCertType("rest");
      setDiagnosis("");
      setRestFrom(todayStr());
      setRestTo("");
      setExaminedOn(todayStr());
      setPurpose("");
      setRemarks("");
    }
  }, [patient]);

  async function handleGenerate() {
    if (!patient) return;
    setIsGenerating(true);
    try {
      await generateCertificatePDF(patient, certType, {
        diagnosis,
        restFrom,
        restTo,
        examinedOn,
        purpose,
        remarks,
        doctorName,
      });
      toast.success("Certificate downloaded!");
      onClose();
    } catch {
      toast.error("Failed to generate certificate");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" data-ocid="certificate.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-violet-600" />
            Generate Certificate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Certificate Type Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${certType === "rest" ? "bg-violet-600 text-white" : "hover:bg-accent text-muted-foreground"}`}
              onClick={() => setCertType("rest")}
              data-ocid="certificate.rest_tab"
            >
              Rest Certificate
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${certType === "fitness" ? "bg-emerald-600 text-white" : "hover:bg-accent text-muted-foreground"}`}
              onClick={() => setCertType("fitness")}
              data-ocid="certificate.fitness_tab"
            >
              Fitness Certificate
            </button>
          </div>

          {/* Doctor Select */}
          <div className="space-y-1.5">
            <Label>Doctor</Label>
            <Select value={doctorName} onValueChange={setDoctorName}>
              <SelectTrigger data-ocid="certificate.doctor_select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dr. Dhravid Patel">
                  Dr. Dhravid Patel
                </SelectItem>
                <SelectItem value="Dr. Zeel Patel">Dr. Zeel Patel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {certType === "rest" ? (
            <>
              <div className="space-y-1.5">
                <Label>Diagnosis</Label>
                <Input
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Viral fever, Acute gastritis"
                  data-ocid="certificate.diagnosis_input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Rest From</Label>
                  <Input
                    type="date"
                    value={restFrom}
                    onChange={(e) => setRestFrom(e.target.value)}
                    data-ocid="certificate.rest_from_input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rest To</Label>
                  <Input
                    type="date"
                    value={restTo}
                    onChange={(e) => setRestTo(e.target.value)}
                    data-ocid="certificate.rest_to_input"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Examined On</Label>
                <Input
                  type="date"
                  value={examinedOn}
                  onChange={(e) => setExaminedOn(e.target.value)}
                  data-ocid="certificate.examined_on_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Purpose of Certificate</Label>
                <Input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. school, office, sports"
                  data-ocid="certificate.purpose_input"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Doctor Remarks (Optional)</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Additional remarks..."
              rows={2}
              data-ocid="certificate.remarks_textarea"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="certificate.cancel_button"
          >
            Cancel
          </Button>
          <Button
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            onClick={handleGenerate}
            disabled={isGenerating}
            data-ocid="certificate.generate_button"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Generate & Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ReferralDialog ────────────────────────────────────────────────────────

function ReferralDialog({
  patient,
  open,
  onClose,
}: {
  patient: LocalPatient | null;
  open: boolean;
  onClose: () => void;
}) {
  const [doctorName, setDoctorName] = useState("Dr. Dhravid Patel");
  const [referredToDoctor, setReferredToDoctor] = useState("");
  const [referredToDept, setReferredToDept] = useState("");
  const [referredToHospital, setReferredToHospital] = useState("");
  const [referralDoctorPhone, setReferralDoctorPhone] = useState("");
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [remarks, setRemarks] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (patient) {
      setDoctorName(patient.doctorName || "Dr. Dhravid Patel");
      setReferredToDoctor("");
      setReferredToDept("");
      setReferredToHospital("");
      setReferralDoctorPhone("");
      setReason("");
      setUrgency("normal");
      setRemarks("");
    }
  }, [patient]);

  function handleSendWhatsApp() {
    if (!patient || !referralDoctorPhone) {
      toast.error("Please enter the referral doctor contact number");
      return;
    }
    const phone = referralDoctorPhone.replace(/\D/g, "");
    const msg = `Dear ${referredToDoctor || "Doctor"},

We are referring the following patient from Shreeji Clinic:

UID: ${patient.uid}
Patient: ${patient.name}
Age/Sex: ${patient.age} yrs / ${patient.sex}

Reason: ${reason}

Referred by: ${doctorName}

Kindly provide expert opinion and management.

Thank you.`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  }

  async function handleGenerate() {
    if (!patient || !referredToDoctor || !referredToDept || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsGenerating(true);
    try {
      await generateReferralPDF(patient, {
        doctorName,
        referredToDoctor,
        referredToDept,
        referredToHospital: referredToHospital || undefined,
        referralDoctorPhone: referralDoctorPhone || undefined,
        reason,
        urgency,
        remarks: remarks || undefined,
      });
      toast.success("Referral letter downloaded!");
      onClose();
    } catch {
      toast.error("Failed to generate referral letter");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" data-ocid="referral.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-teal-600" />
            Generate Referral Letter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Doctor Select */}
          <div className="space-y-1.5">
            <Label>From Doctor</Label>
            <Select value={doctorName} onValueChange={setDoctorName}>
              <SelectTrigger data-ocid="referral.doctor_select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dr. Dhravid Patel">
                  Dr. Dhravid Patel
                </SelectItem>
                <SelectItem value="Dr. Zeel Patel">Dr. Zeel Patel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Referred To Doctor */}
          <div className="space-y-1.5">
            <Label>
              Referred To Doctor Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={referredToDoctor}
              onChange={(e) => setReferredToDoctor(e.target.value)}
              placeholder="e.g. Dr. Rahul Sharma"
              data-ocid="referral.referred_to_input"
            />
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label>
              Department / Speciality <span className="text-red-500">*</span>
            </Label>
            <Input
              value={referredToDept}
              onChange={(e) => setReferredToDept(e.target.value)}
              placeholder="e.g. Orthopedics, Cardiology"
              data-ocid="referral.department_input"
            />
          </div>

          {/* Hospital */}
          <div className="space-y-1.5">
            <Label>Hospital / Clinic Name (Optional)</Label>
            <Input
              value={referredToHospital}
              onChange={(e) => setReferredToHospital(e.target.value)}
              placeholder="e.g. City General Hospital"
              data-ocid="referral.hospital_input"
            />
          </div>

          {/* Referral Doctor Phone */}
          <div className="space-y-1.5">
            <Label>Referral Doctor Contact Number</Label>
            <Input
              value={referralDoctorPhone}
              onChange={(e) => setReferralDoctorPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              type="tel"
              data-ocid="referral.doctor_phone_input"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>
              Reason for Referral / Diagnosis{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for referral..."
              rows={3}
              data-ocid="referral.reason_textarea"
            />
          </div>

          {/* Urgency */}
          <div className="space-y-1.5">
            <Label>Urgency</Label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${urgency === "normal" ? "bg-gray-600 text-white" : "hover:bg-accent text-muted-foreground"}`}
                onClick={() => setUrgency("normal")}
                data-ocid="referral.urgency_normal_toggle"
              >
                Normal
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${urgency === "urgent" ? "bg-red-600 text-white" : "hover:bg-accent text-muted-foreground"}`}
                onClick={() => setUrgency("urgent")}
                data-ocid="referral.urgency_urgent_toggle"
              >
                Urgent
              </button>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label>Remarks (Optional)</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Additional remarks..."
              rows={2}
              data-ocid="referral.remarks_textarea"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="referral.cancel_button"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            className="gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
            onClick={handleSendWhatsApp}
            disabled={!referralDoctorPhone}
            data-ocid="referral.whatsapp_button"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-label="WhatsApp"
              role="img"
            >
              <title>WhatsApp</title>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Send to Doctor
          </Button>
          <Button
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleGenerate}
            disabled={isGenerating}
            data-ocid="referral.generate_button"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Generate & Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BillingDialog({
  patient,
  open,
  onClose,
}: {
  patient: LocalPatient | null;
  open: boolean;
  onClose: () => void;
}) {
  const uid = patient?.uid ?? "";
  const [activeTab, setActiveTab] = useState("new");
  const [items, setItems] = useState<BillItem[]>([
    {
      id: crypto.randomUUID(),
      category: "consulting",
      description: "Consulting Fees",
      quantity: 1,
      unitPrice: 0,
    },
  ]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    "amount",
  );
  const [gstPercent, setGstPercent] = useState(0);
  const [pastBills, setPastBills] = useState<Bill[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [_isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Load past bills when opened
  useEffect(() => {
    if (open && uid) {
      setPastBills(loadBills(uid).slice().reverse());
      // Reset new bill form
      setItems([
        {
          id: crypto.randomUUID(),
          category: "consulting",
          description: "Consulting Fees",
          quantity: 1,
          unitPrice: 0,
        },
      ]);
      setDiscount(0);
      setDiscountType("amount");
      setGstPercent(0);
      setActiveTab("new");
    }
  }, [open, uid]);

  const totals = computeBillTotals(items, discount, discountType, gstPercent);

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        category: "other",
        description: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem(
    id: string,
    field: keyof BillItem,
    value: string | number,
  ) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function buildBill(): Bill {
    return {
      billId: generateBillId(),
      date: todayStr(),
      savedAt: new Date().toISOString(),
      items: items.filter((i) => i.description.trim()),
      discount,
      discountType,
      gstPercent,
      ...totals,
      status: "pending" as const,
    };
  }

  function handleSave() {
    if (!patient) return;
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }
    setIsSaving(true);
    const bill = buildBill();
    const existing = loadBills(uid);
    saveBills(uid, [...existing, bill]);
    setPastBills([bill, ...loadBills(uid).slice(0, -1)]);
    toast.success("Bill saved successfully");
    setActiveTab("past");
    setIsSaving(false);
  }

  async function handleDownloadPDF(bill?: Bill) {
    if (!patient) return;
    setIsGeneratingPDF(true);
    try {
      const targetBill = bill ?? buildBill();
      if (!bill) {
        const validItems = items.filter((i) => i.description.trim());
        if (validItems.length === 0) {
          toast.error("Please add at least one item");
          setIsGeneratingPDF(false);
          return;
        }
      }
      await generateBillPDF(patient, targetBill);
      toast.success("Bill PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    }
    setIsGeneratingPDF(false);
  }

  async function handlePrintBill(bill?: Bill) {
    if (!patient) return;
    const targetBill = bill ?? buildBill();
    if (!bill) {
      const validItems = items.filter((i) => i.description.trim());
      if (validItems.length === 0) {
        toast.error("Please add at least one item");
        return;
      }
    }
    // Re-use the same HTML generator but without auto-print script — open print dialog
    const itemRows = targetBill.items
      .map(
        (item, idx) => `
        <tr style="background:${idx % 2 === 0 ? "#f8faff" : "#fff"}">
          <td style="padding:6px 8px;border-bottom:1px solid #e8eef8;color:#444">${idx + 1}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e8eef8;color:#222">${item.description}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e8eef8;text-align:center;color:#444">${item.quantity}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e8eef8;text-align:right;color:#444">Rs.${item.unitPrice.toFixed(2)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e8eef8;text-align:right;font-weight:600;color:#1a3a8a">Rs.${(item.quantity * item.unitPrice).toFixed(2)}</td>
        </tr>`,
      )
      .join("");
    const discountRow =
      targetBill.discountAmount > 0
        ? `<tr><td colspan="4" style="text-align:right;padding:5px 8px;color:#666">Discount (${targetBill.discountType === "percent" ? `${targetBill.discount}%` : "Amount"}):</td><td style="text-align:right;padding:5px 8px;color:#dc2626;font-weight:600">-Rs.${targetBill.discountAmount.toFixed(2)}</td></tr>`
        : "";
    const gstRow =
      targetBill.gstAmount > 0
        ? `<tr><td colspan="4" style="text-align:right;padding:5px 8px;color:#666">GST (${targetBill.gstPercent}%):</td><td style="text-align:right;padding:5px 8px;color:#444;font-weight:600">Rs.${targetBill.gstAmount.toFixed(2)}</td></tr>`
        : "";
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Bill - ${patient.name} - ${targetBill.billId}</title>
  <style>
    @media print { body { margin: 0; } @page { size: A4; margin: 0; } }
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #222; }
    .header { background: linear-gradient(135deg, #1a3a8a, #c0392b); color: #fff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo { width: 48px; height: 48px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.8); background: #fff; object-fit: cover; }
    .clinic-name { font-size: 20px; font-weight: 700; margin: 0; }
    .clinic-sub { font-size: 11px; opacity: 0.8; margin: 2px 0 0; }
    .bill-id { text-align: right; }
    .bill-id .id { font-size: 13px; font-weight: 700; }
    .bill-id .date { font-size: 11px; opacity: 0.8; margin-top: 3px; }
    .patient-band { background: #0f2864; display: flex; gap: 4px; padding: 8px 16px; }
    .pt-field { flex: 1; text-align: center; background: rgba(255,255,255,0.08); border-radius: 4px; padding: 5px 4px; }
    .pt-label { font-size: 9px; color: #b4c8ff; text-transform: uppercase; letter-spacing: 0.5px; }
    .pt-value { font-size: 11px; font-weight: 700; color: #fff; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .content { padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #eef1fb; }
    thead th { padding: 8px 8px; text-align: left; font-size: 11px; font-weight: 700; color: #1e3278; text-transform: uppercase; letter-spacing: 0.5px; }
    .totals-table { width: 50%; margin-left: auto; }
    .totals-table td { padding: 5px 8px; font-size: 12px; }
    .grand-total-row td { background: #1a3a8a; color: #fff; font-weight: 700; font-size: 15px; padding: 10px 12px; border-radius: 6px; }
    .footer { background: #1a3a8a; color: #fff; text-align: center; padding: 12px; margin-top: 30px; }
    .footer p { margin: 3px 0; }
    .footer .main { font-size: 14px; font-weight: 700; }
    .footer .sub { font-size: 11px; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${window.location.origin}/assets/generated/logo-white-circle.dim_400x400.png" alt="Logo" class="logo" />
      <div>
        <p class="clinic-name">Shreeji Clinic</p>
        <p class="clinic-sub">OPD — Patient Bill</p>
      </div>
    </div>
    <div class="bill-id">
      <div style="font-size:11px;font-weight:700;">${patient.doctorName}</div>
      <div style="font-size:9px;opacity:0.8;margin-top:2px;">${getDoctorCredentials(patient.doctorName)}</div>
      <div class="id" style="margin-top:4px;">${targetBill.billId}</div>
      <div class="date">${formatDate(targetBill.date)}</div>
    </div>
  </div>
  <div class="patient-band">
    <div class="pt-field"><div class="pt-label">UID</div><div class="pt-value">${patient.uid}</div></div>
    <div class="pt-field"><div class="pt-label">Name</div><div class="pt-value">${patient.name}</div></div>
    <div class="pt-field"><div class="pt-label">Age/Sex</div><div class="pt-value">${patient.age}y / ${patient.sex}</div></div>
    <div class="pt-field"><div class="pt-label">Contact</div><div class="pt-value">${patient.contact || "—"}</div></div>
    <div class="pt-field"><div class="pt-label">Date</div><div class="pt-value">${formatDate(targetBill.date)}</div></div>
  </div>
  <div class="content">
    <table>
      <thead>
        <tr>
          <th style="width:30px">#</th>
          <th>Description</th>
          <th style="width:60px;text-align:center">Qty</th>
          <th style="width:100px;text-align:right">Unit Price</th>
          <th style="width:100px;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <table class="totals-table">
      <tbody>
        <tr><td colspan="4" style="text-align:right;padding:5px 8px;color:#666">Subtotal:</td><td style="text-align:right;padding:5px 8px;font-weight:600">Rs.${targetBill.subtotal.toFixed(2)}</td></tr>
        ${discountRow}
        ${gstRow}
        <tr class="grand-total-row">
          <td colspan="4" style="text-align:right">Grand Total</td>
          <td style="text-align:right">Rs.${targetBill.grandTotal.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="footer">
    <p class="main">We listen, We Care, We Heal.</p>
    <p class="sub">Thank you for visiting Shreeji Clinic</p>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      toast.error("Could not open print window. Please allow popups.");
    }
  }

  function handleWhatsApp(bill?: Bill) {
    if (!patient) return;
    if (!patient.contact) {
      toast.error("No contact number for this patient");
      return;
    }
    const targetBill = bill ?? buildBill();
    const itemLines = targetBill.items
      .map(
        (it) =>
          `• ${it.description} x${it.quantity} = Rs.${(it.quantity * it.unitPrice).toFixed(2)}`,
      )
      .join("\n");
    const discLine =
      targetBill.discountAmount > 0
        ? `\nDiscount: -Rs.${targetBill.discountAmount.toFixed(2)}`
        : "";
    const gstLine =
      targetBill.gstAmount > 0
        ? `\nGST (${targetBill.gstPercent}%): Rs.${targetBill.gstAmount.toFixed(2)}`
        : "";
    const message = `Dear ${patient.name},\n\nYour bill from Shreeji Clinic (${formatDate(targetBill.date)}):\n\nPatient UID: ${patient.uid}\n\nItems:\n${itemLines}${discLine}${gstLine}\n\n*Grand Total: Rs.${targetBill.grandTotal.toFixed(2)}*\n\nThank you for visiting Shreeji Clinic!`;
    const phone = patient.contact.replace(/\D/g, "");
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  }

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
        data-ocid="billing.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Patient Billing
          </DialogTitle>
        </DialogHeader>

        {/* Patient info band */}
        <div className="clinic-header-gradient text-white rounded-lg px-4 py-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          <span>
            <span className="text-white/60 text-xs">UID</span>{" "}
            <span className="font-mono font-semibold">{patient.uid}</span>
          </span>
          <span>
            <span className="text-white/60 text-xs">Name</span>{" "}
            <span className="font-semibold">{patient.name}</span>
          </span>
          <span>
            <span className="text-white/60 text-xs">Age/Sex</span>{" "}
            <span className="font-semibold">
              {patient.age}y / {patient.sex}
            </span>
          </span>
          <span>
            <span className="text-white/60 text-xs">Doctor</span>{" "}
            <span className="font-semibold">{patient.doctorName}</span>
          </span>
          <span>
            <span className="text-white/60 text-xs">Date</span>{" "}
            <span className="font-semibold">{formatDate(todayStr())}</span>
          </span>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden min-h-0"
        >
          <TabsList className="w-full sm:w-auto flex-shrink-0">
            <TabsTrigger
              value="new"
              className="gap-1.5 flex-1 sm:flex-none"
              data-ocid="billing.new_tab"
            >
              <IndianRupee className="w-4 h-4" />
              New Bill
            </TabsTrigger>
            <TabsTrigger
              value="past"
              className="gap-1.5 flex-1 sm:flex-none"
              data-ocid="billing.past_tab"
            >
              <Receipt className="w-4 h-4" />
              Past Bills{pastBills.length > 0 ? ` (${pastBills.length})` : ""}
            </TabsTrigger>
          </TabsList>

          {/* New Bill Tab */}
          <TabsContent
            value="new"
            className="flex-1 overflow-y-auto space-y-4 mt-0 pt-3"
          >
            {/* Line items */}
            <div className="space-y-2">
              <div className="grid grid-cols-[120px_1fr_56px_76px_64px_32px] gap-1.5 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span>Category</span>
                <span>Description</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit ₹</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[120px_1fr_56px_76px_64px_32px] gap-1.5 items-center"
                  data-ocid={`billing.item.${idx + 1}`}
                >
                  {/* Category dropdown */}
                  <Select
                    value={item.category}
                    onValueChange={(v) => {
                      const cat = v as BillCategory;
                      const autoDesc =
                        cat === "medicine"
                          ? "Medicine"
                          : cat === "consulting"
                            ? "Consulting Fees"
                            : item.description;
                      setItems((prev) =>
                        prev.map((i) =>
                          i.id === item.id
                            ? { ...i, category: cat, description: autoDesc }
                            : i,
                        ),
                      );
                    }}
                  >
                    <SelectTrigger
                      className="h-9 text-xs"
                      data-ocid={`billing.item_category.${idx + 1}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consulting">
                        <span className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-clinic-blue" />
                          Consulting
                        </span>
                      </SelectItem>
                      <SelectItem value="medicine">
                        <span className="flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-emerald-600" />
                          Medicine
                        </span>
                      </SelectItem>
                      <SelectItem value="other">
                        <span className="flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                          Other
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Description — editable free text */}
                  <Input
                    placeholder={
                      item.category === "medicine"
                        ? "Medicine name"
                        : item.category === "consulting"
                          ? "Consulting Fees"
                          : "Description"
                    }
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                    className="text-sm h-9"
                    data-ocid={`billing.item_description.${idx + 1}`}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "quantity",
                        Math.max(1, Number(e.target.value)),
                      )
                    }
                    className="text-sm h-9 text-center"
                    data-ocid={`billing.item_qty.${idx + 1}`}
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "unitPrice",
                        Math.max(0, Number(e.target.value)),
                      )
                    }
                    className="text-sm h-9 text-right"
                    data-ocid={`billing.item_price.${idx + 1}`}
                  />
                  <div className="text-sm font-medium text-foreground text-right tabular-nums">
                    ₹{(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-md flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    title="Remove item"
                    data-ocid={`billing.item_delete.${idx + 1}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-dashed"
                onClick={addItem}
                data-ocid="billing.add_item_button"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </Button>
            </div>

            <Separator />

            {/* Discount + GST */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Discount</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={discount}
                    onChange={(e) =>
                      setDiscount(Math.max(0, Number(e.target.value)))
                    }
                    className="text-sm h-9"
                    data-ocid="billing.discount_input"
                  />
                  <div className="flex rounded-md overflow-hidden border border-border flex-shrink-0">
                    <button
                      type="button"
                      className={`px-2.5 py-1 text-xs font-medium transition-colors ${discountType === "amount" ? "bg-clinic-blue text-white" : "bg-card text-muted-foreground hover:bg-accent"}`}
                      onClick={() => setDiscountType("amount")}
                      data-ocid="billing.discount_amount_toggle"
                    >
                      ₹
                    </button>
                    <button
                      type="button"
                      className={`px-2.5 py-1 text-xs font-medium transition-colors ${discountType === "percent" ? "bg-clinic-blue text-white" : "bg-card text-muted-foreground hover:bg-accent"}`}
                      onClick={() => setDiscountType("percent")}
                      data-ocid="billing.discount_percent_toggle"
                    >
                      %
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">GST</Label>
                <Select
                  value={String(gstPercent)}
                  onValueChange={(v) => setGstPercent(Number(v))}
                >
                  <SelectTrigger
                    className="h-9 text-sm"
                    data-ocid="billing.gst_select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No GST (0%)</SelectItem>
                    <SelectItem value="5">GST 5%</SelectItem>
                    <SelectItem value="12">GST 12%</SelectItem>
                    <SelectItem value="18">GST 18%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Totals summary */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground tabular-nums">
                  ₹{totals.subtotal.toFixed(2)}
                </span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    Discount (
                    {discountType === "percent" ? `${discount}%` : "₹"})
                  </span>
                  <span className="font-medium text-destructive tabular-nums">
                    −₹{totals.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}
              {totals.gstAmount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>GST ({gstPercent}%)</span>
                  <span className="font-medium text-foreground tabular-nums">
                    ₹{totals.gstAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between items-center rounded-lg bg-clinic-blue px-3 py-2.5">
                <span className="text-white font-semibold text-base">
                  Grand Total
                </span>
                <span className="text-white font-bold text-xl tabular-nums">
                  ₹{totals.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pb-2">
              <Button
                className="gap-2 bg-clinic-red hover:bg-clinic-red/90 text-white flex-1 sm:flex-none"
                onClick={handleSave}
                disabled={isSaving}
                data-ocid="billing.save_button"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Receipt className="w-4 h-4" />
                )}
                Save Bill
              </Button>

              <Button
                variant="outline"
                className="gap-2 border-foreground/20 text-foreground hover:bg-accent flex-1 sm:flex-none"
                onClick={() => handlePrintBill()}
                data-ocid="billing.print_button"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button
                className="gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white flex-1 sm:flex-none"
                onClick={() => handleWhatsApp()}
                data-ocid="billing.whatsapp_button"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp Bill
              </Button>
            </div>
          </TabsContent>

          {/* Past Bills Tab */}
          <TabsContent
            value="past"
            className="flex-1 overflow-y-auto mt-0 pt-3"
          >
            {pastBills.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 text-center"
                data-ocid="billing.empty_state"
              >
                <Receipt className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  No bills saved yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create and save a bill to see it here
                </p>
              </div>
            ) : (
              <div className="space-y-2 pb-2">
                {pastBills.map((bill, idx) => (
                  <div
                    key={bill.billId}
                    className="rounded-lg border border-border bg-card p-3"
                    data-ocid={`billing.past_bill.item.${idx + 1}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
                            {bill.billId}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(bill.date)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {bill.items.length} item
                            {bill.items.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <IndianRupee className="w-4 h-4 text-emerald-600" />
                          <span className="text-lg font-bold text-emerald-700 tabular-nums">
                            {bill.grandTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                        {bill.status === "done" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs border-clinic-blue/40 text-clinic-blue hover:bg-clinic-blue/10"
                            onClick={() => handleDownloadPDF(bill)}
                            data-ocid={`billing.past_bill.download_button.${idx + 1}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs border-foreground/20 text-foreground hover:bg-accent"
                          onClick={() => handlePrintBill(bill)}
                          data-ocid={`billing.past_bill.print_button.${idx + 1}`}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1 text-xs bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                          onClick={() => handleWhatsApp(bill)}
                          data-ocid={`billing.past_bill.whatsapp_button.${idx + 1}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 w-8 h-8 p-0"
                          onClick={() => {
                            const existing = loadBills(uid);
                            const updated = existing.filter(
                              (b) => b.billId !== bill.billId,
                            );
                            saveBills(uid, updated);
                            setPastBills(updated.slice().reverse());
                            toast.success("Bill deleted");
                          }}
                          title="Delete bill"
                          data-ocid={`billing.past_bill.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`gap-1 text-xs ${bill.status === "done" ? "border-emerald-400 text-emerald-700 hover:bg-emerald-50" : "border-amber-400 text-amber-700 hover:bg-amber-50"}`}
                          onClick={() => {
                            const existing = loadBills(uid);
                            const updated = existing.map((b) =>
                              b.billId === bill.billId
                                ? {
                                    ...b,
                                    status:
                                      b.status === "done"
                                        ? ("pending" as const)
                                        : ("done" as const),
                                  }
                                : b,
                            );
                            saveBills(uid, updated);
                            setPastBills(updated.slice().reverse());
                            toast.success(
                              `Bill marked as ${bill.status === "done" ? "Pending" : "Done"}`,
                            );
                          }}
                          data-ocid={`billing.past_bill.toggle.${idx + 1}`}
                        >
                          {bill.status === "done" ? "✓ Done" : "⏳ Pending"}
                        </Button>
                      </div>
                    </div>
                    {bill.items.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {bill.items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="text-xs text-muted-foreground flex justify-between"
                          >
                            <span className="truncate max-w-[200px]">
                              {item.description}
                            </span>
                            <span className="flex-shrink-0 ml-2">
                              ₹{(item.quantity * item.unitPrice).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {bill.items.length > 3 && (
                          <p className="text-xs text-muted-foreground italic">
                            +{bill.items.length - 3} more items
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="billing.close_button"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Manage Nursing Users Dialog ───────────────────────────────────────────

function ManageNursingUsersDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [accounts, setAccounts] = useState<NursingAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<NursingAccount | null>(
    null,
  );

  // Form fields
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAccounts(getNursingAccounts());
      setShowAddForm(false);
      setEditingAccount(null);
      setFormDisplayName("");
      setFormUserId("");
      setFormPassword("");
      setFormError(null);
    }
  }, [open]);

  function openAdd() {
    setEditingAccount(null);
    setFormDisplayName("");
    setFormUserId("");
    setFormPassword("");
    setFormError(null);
    setShowAddForm(true);
  }

  function openEdit(account: NursingAccount) {
    setShowAddForm(false);
    setEditingAccount(account);
    setFormDisplayName(account.displayName);
    setFormUserId(account.userId);
    setFormPassword(account.password);
    setFormError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const trimName = formDisplayName.trim();
    const trimId = formUserId.trim().toLowerCase();
    const trimPw = formPassword.trim();
    if (!trimName || !trimId || !trimPw) {
      setFormError("All fields are required");
      return;
    }

    let updated: NursingAccount[];
    if (editingAccount) {
      // Check for duplicate userId (excluding self)
      const duplicate = accounts.find(
        (a) => a.userId === trimId && a.userId !== editingAccount.userId,
      );
      if (duplicate) {
        setFormError("User ID already in use");
        return;
      }
      updated = accounts.map((a) =>
        a.userId === editingAccount.userId
          ? { ...a, userId: trimId, displayName: trimName, password: trimPw }
          : a,
      );
      toast.success("Nursing user updated");
    } else {
      // Check for duplicate userId
      if (accounts.find((a) => a.userId === trimId)) {
        setFormError("User ID already in use");
        return;
      }
      const newAccount: NursingAccount = {
        userId: trimId,
        password: trimPw,
        displayName: trimName,
        role: "nursing",
      };
      updated = [...accounts, newAccount];
      toast.success("Nursing user added");
    }

    saveNursingAccounts(updated);
    // Sync to cloud
    if (_cloudActor) {
      for (const acc of updated) {
        _cloudActor
          .saveAccount(acc.userId, JSON.stringify({ ...acc, role: "nursing" }))
          .catch(() => {});
      }
    }
    setAccounts(updated);
    setShowAddForm(false);
    setEditingAccount(null);
    setFormDisplayName("");
    setFormUserId("");
    setFormPassword("");
  }

  function handleDelete(userId: string) {
    const updated = accounts.filter((a) => a.userId !== userId);
    saveNursingAccounts(updated);
    if (_cloudActor) {
      _cloudActor.deleteAccount(userId).catch(() => {});
    }
    setAccounts(updated);
    if (editingAccount?.userId === userId) {
      setEditingAccount(null);
    }
    toast.success("Nursing user removed");
  }

  const showForm = showAddForm || !!editingAccount;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg" data-ocid="manage_nursing.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-600" />
            Manage Nursing Users
          </DialogTitle>
          <DialogDescription>
            Add, edit, or remove nursing staff accounts. Nursing users can only
            access Patient Registration and Billing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Account list */}
          {accounts.length === 0 && !showForm && (
            <div
              className="text-center py-6 text-muted-foreground text-sm"
              data-ocid="manage_nursing.empty_state"
            >
              No nursing users yet. Add one below.
            </div>
          )}
          {accounts.length > 0 && (
            <div className="space-y-2">
              {accounts.map((account, idx) => (
                <div
                  key={account.userId}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 bg-secondary/30"
                  data-ocid={`manage_nursing.item.${idx + 1}`}
                >
                  <div>
                    <p className="font-medium text-sm">{account.displayName}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {account.userId}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-clinic-blue hover:text-clinic-blue hover:bg-clinic-blue/10"
                      onClick={() => openEdit(account)}
                      data-ocid={`manage_nursing.edit_button.${idx + 1}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(account.userId)}
                      data-ocid={`manage_nursing.delete_button.${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit Form */}
          {showForm && (
            <form
              onSubmit={handleSave}
              className="space-y-3 border border-border rounded-lg p-4 bg-background"
            >
              <h3 className="font-semibold text-sm">
                {editingAccount ? "Edit Nursing User" : "Add Nursing User"}
              </h3>
              <div className="space-y-1.5">
                <Label htmlFor="nu-name">Display Name *</Label>
                <Input
                  id="nu-name"
                  placeholder="e.g. Nurse Priya"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  required
                  data-ocid="manage_nursing.name_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nu-userid">User ID *</Label>
                <Input
                  id="nu-userid"
                  placeholder="e.g. nurse.priya"
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                  required
                  data-ocid="manage_nursing.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nu-password">Password *</Label>
                <Input
                  id="nu-password"
                  type="password"
                  placeholder="Password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required
                  data-ocid="manage_nursing.password_input"
                />
              </div>
              {formError && (
                <p
                  className="text-xs text-destructive"
                  data-ocid="manage_nursing.error_state"
                >
                  {formError}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-clinic-blue hover:bg-clinic-blue/90 text-white"
                  data-ocid="manage_nursing.save_button"
                >
                  {editingAccount ? "Save Changes" : "Add User"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingAccount(null);
                  }}
                  data-ocid="manage_nursing.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Add button */}
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2 text-clinic-blue border-clinic-blue/30 hover:bg-clinic-blue/10"
              onClick={openAdd}
              data-ocid="manage_nursing.open_modal_button"
            >
              <Plus className="w-4 h-4" />
              Add Nursing User
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="manage_nursing.close_button"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Change Profile Dialog ──────────────────────────────────────────────────

function ChangeProfileDialog({
  open,
  onClose,
  session,
  onSessionUpdate,
}: {
  open: boolean;
  onClose: () => void;
  session: AuthSession;
  onSessionUpdate: (newSession: AuthSession) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUserId, setNewUserId] = useState(session.userId);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentPassword("");
      setNewUserId(session.userId);
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, session.userId]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!newUserId.trim()) {
      newErrors.newUserId = "User ID cannot be blank";
    }

    if (newPassword && newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const accounts = getAccounts();
      const accountIndex = accounts.findIndex(
        (a) => a.userId === session.userId,
      );

      if (accountIndex === -1) {
        setErrors({
          currentPassword: "Account not found. Please log in again.",
        });
        setIsSubmitting(false);
        return;
      }

      const account = accounts[accountIndex];

      // Verify current password
      if (account.password !== currentPassword) {
        setErrors({ currentPassword: "Current password is incorrect" });
        setIsSubmitting(false);
        return;
      }

      const trimmedNewUserId = newUserId.trim().toLowerCase();

      // Check if new userId is taken by another account
      if (trimmedNewUserId !== session.userId) {
        const conflict = accounts.find(
          (a, i) =>
            i !== accountIndex && a.userId.toLowerCase() === trimmedNewUserId,
        );
        if (conflict) {
          setErrors({
            newUserId: "This User ID is already taken by another account",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Build updated account
      const updatedAccount = {
        ...account,
        userId: trimmedNewUserId,
        password: newPassword ? newPassword : account.password,
      };

      const updatedAccounts = [...accounts];
      updatedAccounts[accountIndex] = updatedAccount;
      saveAccounts(updatedAccounts);
      if (_cloudActor) {
        _cloudActor
          .saveAccount(
            updatedAccount.userId,
            JSON.stringify({ ...updatedAccount, role: "doctor" }),
          )
          .catch(() => {});
      }

      // Update session
      const updatedSession: AuthSession = {
        userId: updatedAccount.userId,
        displayName: account.displayName,
        role: session.role,
      };
      setSession(updatedSession);
      onSessionUpdate(updatedSession);

      toast.success("Profile updated successfully");
      onClose();
    }, 400);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-ocid="change_profile.dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <UserCog className="w-5 h-5 text-clinic-blue" />
            Change Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Current Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-current-password">
              Current Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="cp-current-password"
                type={showCurrentPwd ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, currentPassword: "" }));
                }}
                className="pr-10"
                autoComplete="current-password"
                data-ocid="change_profile.current_password_input"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowCurrentPwd((v) => !v)}
                aria-label={showCurrentPwd ? "Hide password" : "Show password"}
              >
                {showCurrentPwd ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p
                className="text-xs text-destructive"
                data-ocid="change_profile.current_password_error"
              >
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* New User ID */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-new-userid">
              New User ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cp-new-userid"
              type="text"
              placeholder="Enter new User ID"
              value={newUserId}
              onChange={(e) => {
                setNewUserId(e.target.value);
                setErrors((prev) => ({ ...prev, newUserId: "" }));
              }}
              autoComplete="username"
              data-ocid="change_profile.new_userid_input"
            />
            {errors.newUserId && (
              <p
                className="text-xs text-destructive"
                data-ocid="change_profile.userid_error"
              >
                {errors.newUserId}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-new-password">
              New Password{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (leave blank to keep current)
              </span>
            </Label>
            <div className="relative">
              <Input
                id="cp-new-password"
                type={showNewPwd ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                className="pr-10"
                autoComplete="new-password"
                data-ocid="change_profile.new_password_input"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowNewPwd((v) => !v)}
                aria-label={showNewPwd ? "Hide password" : "Show password"}
              >
                {showNewPwd ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm-password">Confirm New Password</Label>
            <Input
              id="cp-confirm-password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              autoComplete="new-password"
              data-ocid="change_profile.confirm_password_input"
            />
            {errors.confirmPassword && (
              <p
                className="text-xs text-destructive"
                data-ocid="change_profile.confirm_password_error"
              >
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="change_profile.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-clinic-blue hover:bg-clinic-blue/90 text-white"
              disabled={isSubmitting}
              data-ocid="change_profile.submit_button"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserCog className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Licence Dialog ────────────────────────────────────────────────────────

function LicenceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-2xl max-h-[80vh] overflow-y-auto"
        data-ocid="licence.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-clinic-blue">
            <ScrollText className="w-5 h-5 text-amber-600" />
            Software Licence Agreement
          </DialogTitle>
          <DialogDescription>
            Official licence for Shreeji Clinic OPD Management System
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm py-2">
          <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-amber-800 text-xs font-medium">
            Proprietary — Single Clinic Use &nbsp;|&nbsp; Issued To: Shreeji
            Clinic &nbsp;|&nbsp; Effective Date: 28 March 2026
          </div>

          <section>
            <h3 className="font-semibold text-base text-clinic-blue mb-1">
              1. Grant of Licence
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              This software is licensed exclusively to{" "}
              <strong>Shreeji Clinic</strong> for internal clinical operations
              including patient registration, prescription management, billing,
              and related workflows. This licence is non-transferable and
              non-sublicensable.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base text-clinic-blue mb-1">
              2. Permitted Use
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li>Use on any device owned or operated by Shreeji Clinic</li>
              <li>
                Installation as a Progressive Web App (PWA) on authorised clinic
                devices
              </li>
              <li>
                Access by authorised users (doctors and nursing staff managed by
                the clinic)
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base text-clinic-blue mb-1">
              3. Restrictions
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li>
                The application may not be copied, resold, or distributed to
                third parties
              </li>
              <li>
                Login credentials must not be shared outside authorised clinic
                staff
              </li>
              <li>
                Patient data stored within the app is confidential and subject
                to applicable medical privacy laws
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base text-clinic-blue mb-1">
              4. Data Ownership
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              All patient records, prescriptions, and billing data entered into
              the application belong exclusively to{" "}
              <strong>Shreeji Clinic</strong>. The clinic is responsible for
              data backup, security, and compliance with local health data
              regulations.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base text-clinic-blue mb-1">
              5. Platform
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              This application is hosted on the{" "}
              <strong>Internet Computer Protocol (ICP)</strong> via the Caffeine
              platform. Continued operation is subject to the Caffeine platform
              terms of service.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base text-clinic-blue mb-1">
              6. Disclaimer
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              This software is provided as-is for clinic management purposes. It
              does not replace professional medical judgement. The clinic is
              solely responsible for all clinical decisions made using this
              application.
            </p>
          </section>

          <div className="border rounded-md overflow-hidden mt-2">
            <table className="w-full text-xs">
              <thead className="bg-clinic-blue text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                  <th className="px-3 py-2 text-left font-semibold">Role</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Credentials
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2">Dr. Dhravid Patel</td>
                  <td className="px-3 py-2">Doctor</td>
                  <td className="px-3 py-2">BHMS, CCH G-32387</td>
                </tr>
                <tr className="border-t bg-muted/30">
                  <td className="px-3 py-2">Dr. Zeel Patel</td>
                  <td className="px-3 py-2">Doctor</td>
                  <td className="px-3 py-2">BHMS, CCH G-34069</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">Nursing Staff</td>
                  <td className="px-3 py-2">Nursing</td>
                  <td className="px-3 py-2">Managed by doctors</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-muted-foreground italic pt-1">
            "We listen, We Care, We Heal."
            <br />
            <span className="font-semibold not-italic text-clinic-blue">
              Shreeji Clinic — OPD Management System
            </span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  session: initialSession,
  onLogout,
}: {
  session: AuthSession;
  onLogout: () => void;
}) {
  const [session, setSessionState] = useState<AuthSession>(initialSession);
  const [page, setPage] = useState<Page>("frontdesk");
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
  const [editFromHistoryTypedContent, setEditFromHistoryTypedContent] =
    useState<TypedContent | undefined>(undefined);
  const [localPatients, setLocalPatients] = useState<LocalPatient[]>(
    loadLocalPatients(),
  );
  const [changeProfileOpen, setChangeProfileOpen] = useState(false);
  const [manageNursingOpen, setManageNursingOpen] = useState(false);
  const [licenceOpen, setLicenceOpen] = useState(false);
  const [billingPatient, setBillingPatient] = useState<LocalPatient | null>(
    null,
  );
  const [certificatePatient, setCertificatePatient] =
    useState<LocalPatient | null>(null);
  const [referralPatient, setReferralPatient] = useState<LocalPatient | null>(
    null,
  );
  const [editPatient, setEditPatient] = useState<LocalPatient | null>(null);
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();

  // ── Lifted data action refs (for header menu) ─────────────────────────────
  const headerRestoreInputRef = useRef<HTMLInputElement>(null);

  // Set module-level actor ref for fire-and-forget backend sync
  useEffect(() => {
    _cloudActor = actor;
  }, [actor]);

  // Fetch from backend on startup — loads ALL cloud data, merges with localStorage
  const { isLoading: backendLoading } = useQuery({
    queryKey: ["appState"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        // Init default accounts on first run
        (actor as any).initDefaultAccounts().catch(() => {});

        const appState = await (actor as any).getAppState();

        // ── Patients ──────────────────────────────────────────────────────
        const cloudPatients: LocalPatient[] = (appState.patients || []).map(
          toLocalPatient,
        );
        setLocalPatients((prevLocal) => {
          const localMap = new Map(
            prevLocal.map((p: LocalPatient) => [p.uid, p]),
          );
          for (const cp of cloudPatients) {
            // Merge patient extras (vitals) from cloud into patient record
            localMap.set(cp.uid, cp);
          }
          // Sync any local-only patients to backend
          for (const lp of prevLocal) {
            if (!cloudPatients.some((cp) => cp.uid === lp.uid)) {
              actor.register(toBackendPatient(lp)).catch(() => {});
            }
          }
          const merged = Array.from(localMap.values());
          saveLocalPatients(merged);
          return merged;
        });

        // ── Patient Extras (vitals) ────────────────────────────────────────
        for (const [uid, extrasJson] of appState.patientExtras || []) {
          try {
            const extras = JSON.parse(extrasJson as string);
            // Merge vitals into the patient record already in localStorage
            const patients = loadLocalPatients();
            const updated = patients.map((p: LocalPatient) => {
              if (p.uid === uid && extras) {
                return {
                  ...p,
                  vitals: {
                    bp: extras.vitalsBp || "",
                    pulse: extras.vitalsPulse || "",
                    spo2: extras.vitalsSpo2 || "",
                  },
                };
              }
              return p;
            });
            saveLocalPatients(updated);
          } catch {
            /* ignore */
          }
        }

        // ── Prescriptions ────────────────────────────────────────────────
        for (const [uid, rxJson] of appState.prescriptions || []) {
          try {
            const existingLocal = localStorage.getItem(
              `shreeji_rx_history_${uid}`,
            );
            const cloudRecords = JSON.parse(rxJson as string);
            if (
              !existingLocal ||
              existingLocal === "[]" ||
              existingLocal === "null"
            ) {
              localStorage.setItem(
                `shreeji_rx_history_${uid}`,
                rxJson as string,
              );
            } else {
              // Merge: take union by timestamp
              const localRecords = JSON.parse(existingLocal);
              const localTimes = new Set(
                localRecords.map((r: any) => r.timestamp || r.date),
              );
              const merged = [
                ...localRecords,
                ...cloudRecords.filter(
                  (r: any) => !localTimes.has(r.timestamp || r.date),
                ),
              ];
              try {
                localStorage.setItem(
                  `shreeji_rx_history_${uid}`,
                  JSON.stringify(merged),
                );
              } catch {}
            }
          } catch {
            /* ignore */
          }
        }

        // ── Bills ────────────────────────────────────────────────────────
        for (const [uid, billsJson] of appState.bills || []) {
          try {
            const existingLocal = localStorage.getItem(`shreeji_bills_${uid}`);
            const cloudBills = JSON.parse(billsJson as string);
            if (
              !existingLocal ||
              existingLocal === "[]" ||
              existingLocal === "null"
            ) {
              try {
                localStorage.setItem(
                  `shreeji_bills_${uid}`,
                  billsJson as string,
                );
              } catch {}
            } else {
              // Merge: take union by billId
              const localBills = JSON.parse(existingLocal);
              const localIds = new Set(localBills.map((b: any) => b.billId));
              const merged = [
                ...localBills,
                ...cloudBills.filter((b: any) => !localIds.has(b.billId)),
              ];
              try {
                localStorage.setItem(
                  `shreeji_bills_${uid}`,
                  JSON.stringify(merged),
                );
              } catch {}
            }
          } catch {
            /* ignore */
          }
        }

        // ── Accounts ────────────────────────────────────────────────────
        if ((appState.accounts || []).length > 0) {
          const doctorAccounts: any[] = [];
          const nursingAccounts: any[] = [];
          for (const [, accountJson] of appState.accounts) {
            try {
              const acc = JSON.parse(accountJson as string);
              if (acc.role === "nursing") nursingAccounts.push(acc);
              else doctorAccounts.push(acc);
            } catch {
              /* ignore */
            }
          }
          if (doctorAccounts.length > 0) {
            try {
              localStorage.setItem(
                "shreeji_doctor_accounts",
                JSON.stringify(doctorAccounts),
              );
            } catch {}
          }
          if (nursingAccounts.length > 0) {
            try {
              localStorage.setItem(
                "shreeji_nursing_accounts",
                JSON.stringify(nursingAccounts),
              );
            } catch {}
          }
        }

        // ── UID Counters ────────────────────────────────────────────────
        for (const [key, value] of appState.uidCounters || []) {
          try {
            localStorage.setItem(`shreeji_uid_counter_${key}`, String(value));
          } catch {}
        }

        return appState;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 2,
  });

  const registerMutation = useMutation({
    mutationFn: async (patient: LocalPatient) => {
      // Save locally first (always succeeds)
      const currentLocal = loadLocalPatients();
      const updated = [
        ...currentLocal.filter((p) => p.uid !== patient.uid),
        patient,
      ];
      saveLocalPatients(updated);
      setLocalPatients(updated);
      // Then try backend (fire-and-forget on failure)
      if (actor) {
        try {
          await actor.register(toBackendPatient(patient));
        } catch {
          // local save already succeeded — backend will sync later
        }
      }
      // Sync patient vitals/extras to cloud
      if (_cloudActor) {
        _cloudActor
          .savePatientExtras(
            patient.uid,
            JSON.stringify({
              vitalsBp: patient.vitals?.bp || "",
              vitalsPulse: patient.vitals?.pulse || "",
              vitalsSpo2: patient.vitals?.spo2 || "",
            }),
          )
          .catch(() => {});
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (patient: LocalPatient) => {
      // Save locally first
      const currentLocal = loadLocalPatients();
      const updated = currentLocal.map((p) =>
        p.uid === patient.uid ? patient : p,
      );
      saveLocalPatients(updated);
      setLocalPatients(updated);
      // Sync to backend (fire-and-forget on failure)
      if (actor) {
        try {
          await actor.updatePatient(toBackendPatient(patient));
        } catch {
          // If patient doesn't exist on backend yet, register it
          try {
            await actor.register(toBackendPatient(patient));
          } catch {
            // local save already succeeded
          }
        }
      }
      // Sync patient vitals/extras to cloud
      if (_cloudActor) {
        _cloudActor
          .savePatientExtras(
            patient.uid,
            JSON.stringify({
              vitalsBp: patient.vitals?.bp || "",
              vitalsPulse: patient.vitals?.pulse || "",
              vitalsSpo2: patient.vitals?.spo2 || "",
            }),
          )
          .catch(() => {});
      }
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
          if (isNursing) {
            setPage("dashboard");
          } else {
            setSelectedPatient(patient);
            setPage("prescription");
          }
          toast.success(`Patient ${patient.name} registered successfully`);
        },
        onError: () => {
          // Still navigate even if backend fails
          if (isNursing) {
            setPage("dashboard");
          } else {
            setSelectedPatient(patient);
            setPage("prescription");
          }
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

  // ── Auto-backup at 9:00 PM daily ──
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const now = new Date();
    const next9pm = new Date();
    next9pm.setHours(21, 0, 0, 0);
    if (now >= next9pm) {
      next9pm.setDate(next9pm.getDate() + 1);
    }
    const msUntil9pm = next9pm.getTime() - now.getTime();
    const timeoutId = setTimeout(() => {
      exportBackup(loadLocalPatients());
      toast.success("Auto backup downloaded at 9:00 PM");
      intervalId = setInterval(
        () => {
          exportBackup(loadLocalPatients());
          toast.success("Auto backup downloaded at 9:00 PM");
        },
        24 * 60 * 60 * 1000,
      );
    }, msUntil9pm);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // ── Lifted export / backup / restore (called from both header and dashboard) ──
  function handleExportExcel() {
    const headers = [
      "UID",
      "Name",
      "Age",
      "Sex",
      "Contact",
      "Doctor",
      "Registration Date",
    ];
    const rows = localPatients.map((p) => [
      p.uid,
      p.name,
      String(p.age),
      p.sex,
      p.contact,
      p.doctorName,
      formatDate(p.registrationDate),
    ]);
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shreeji-clinic-patients-${todayStr()}.csv`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("CSV file exported successfully");
  }

  function handleExportBillingReport() {
    // Collect all bills from all patients, sorted by date then patient name
    type BillingRow = {
      date: string;
      dateRaw: string;
      uid: string;
      patientName: string;
      age: string;
      sex: string;
      contact: string;
      doctor: string;
      billId: string;
      category: string;
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      subtotal: number;
      discount: number;
      discountType: string;
      discountAmount: number;
      gstPercent: number;
      gstAmount: number;
      grandTotal: number;
    };

    const allRows: BillingRow[] = [];

    for (const patient of localPatients) {
      const bills = loadBills(patient.uid);
      for (const bill of bills) {
        if (bill.items.length === 0) {
          // Bill with no items — still add one summary row
          allRows.push({
            date: formatDate(bill.date),
            dateRaw: bill.date,
            uid: patient.uid,
            patientName: patient.name,
            age: String(patient.age),
            sex: patient.sex,
            contact: patient.contact || "",
            doctor: patient.doctorName,
            billId: bill.billId,
            category: "",
            description: "(No items)",
            quantity: 0,
            unitPrice: 0,
            amount: 0,
            subtotal: bill.subtotal,
            discount: bill.discount,
            discountType: bill.discountType === "percent" ? "%" : "Rs.",
            discountAmount: bill.discountAmount,
            gstPercent: bill.gstPercent,
            gstAmount: bill.gstAmount,
            grandTotal: bill.grandTotal,
          });
        } else {
          for (const item of bill.items) {
            allRows.push({
              date: formatDate(bill.date),
              dateRaw: bill.date,
              uid: patient.uid,
              patientName: patient.name,
              age: String(patient.age),
              sex: patient.sex,
              contact: patient.contact || "",
              doctor: patient.doctorName,
              billId: bill.billId,
              category:
                item.category === "consulting"
                  ? "Consulting Fees"
                  : item.category === "medicine"
                    ? "Medicine"
                    : "Other",
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
              subtotal: bill.subtotal,
              discount: bill.discount,
              discountType: bill.discountType === "percent" ? "%" : "Rs.",
              discountAmount: bill.discountAmount,
              gstPercent: bill.gstPercent,
              gstAmount: bill.gstAmount,
              grandTotal: bill.grandTotal,
            });
          }
        }
      }
    }

    // Sort by date ascending, then patient name
    allRows.sort((a, b) => {
      const dateCmp = a.dateRaw.localeCompare(b.dateRaw);
      if (dateCmp !== 0) return dateCmp;
      return a.patientName.localeCompare(b.patientName);
    });

    if (allRows.length === 0) {
      toast.info("No billing data found to export");
      return;
    }

    const headers = [
      "Date",
      "UID",
      "Patient Name",
      "Age",
      "Sex",
      "Contact",
      "Doctor",
      "Bill ID",
      "Category",
      "Description",
      "Qty",
      "Unit Price (Rs.)",
      "Amount (Rs.)",
      "Subtotal (Rs.)",
      "Discount",
      "Discount Type",
      "Discount Amount (Rs.)",
      "GST %",
      "GST Amount (Rs.)",
      "Grand Total (Rs.)",
    ];

    const rows = allRows.map((r) => [
      r.date,
      r.uid,
      r.patientName,
      r.age,
      r.sex,
      r.contact,
      r.doctor,
      r.billId,
      r.category,
      r.description,
      String(r.quantity),
      r.unitPrice.toFixed(2),
      r.amount.toFixed(2),
      r.subtotal.toFixed(2),
      String(r.discount),
      r.discountType,
      r.discountAmount.toFixed(2),
      String(r.gstPercent),
      r.gstAmount.toFixed(2),
      r.grandTotal.toFixed(2),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shreeji-billing-report-${todayStr()}.csv`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(
      `Billing report exported — ${allRows.length} row(s) across ${localPatients.length} patient(s)`,
    );
  }

  function handleBackup() {
    exportBackup(localPatients);
  }

  function handleRestoreTrigger() {
    headerRestoreInputRef.current?.click();
  }

  function handleRestorePatients(restoredPatients: LocalPatient[]) {
    setLocalPatients(restoredPatients);
    if (actor) {
      for (const p of restoredPatients) {
        actor.register(toBackendPatient(p)).catch(() => {});
      }
    }
  }

  const isLoading = backendLoading && localPatients.length === 0;
  const isSyncing = backendLoading && localPatients.length > 0;
  const isNursing = session.role === "nursing";

  // Shared action props used by both Header and FrontDeskPage
  const sharedActions = {
    onLogout,
    onExportExcel: handleExportExcel,
    onExportBillingReport: handleExportBillingReport,
    onBackup: handleBackup,
    onRestoreTrigger: handleRestoreTrigger,
    onChangeProfile: () => setChangeProfileOpen(true),
    onManageNursing: () => setManageNursingOpen(true),
    onShowLicence: () => setLicenceOpen(true),
    onBillingClick: () => {
      toast.info("Select a patient from the dashboard to create a bill", {
        description: "Click the 'Bill' button next to a patient row",
      });
    },
  };

  // Front Desk: full-screen standalone page (no Header)
  if (page === "frontdesk") {
    return (
      <>
        {/* Hidden file input for restore must remain in DOM even on frontdesk */}
        <input
          ref={headerRestoreInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importBackupFile(file, handleRestorePatients);
            e.target.value = "";
          }}
          data-ocid="header.restore_input"
        />
        <FrontDeskPage
          session={session}
          onNavigate={(p) => setPage(p)}
          {...sharedActions}
        />
        <PatientHistoryModal
          patient={historyPatient}
          open={!!historyPatient}
          onClose={() => setHistoryPatient(null)}
          onEdit={(record) => {
            if (!historyPatient) return;
            const editPages =
              record.pages && record.pages.length > 0
                ? record.pages
                : record.canvasData
                  ? [record.canvasData]
                  : [];
            setEditFromHistoryPages(editPages);
            setEditFromHistoryTypedContent(record.typedContent ?? undefined);
            setFollowUpDate(record.followUpDate ?? undefined);
            setSelectedPatient(historyPatient);
            setHistoryPatient(null);
            setPage("prescription");
          }}
        />
        <ChangeProfileDialog
          open={changeProfileOpen}
          onClose={() => setChangeProfileOpen(false)}
          session={session}
          onSessionUpdate={(updatedSession) => {
            setSessionState(updatedSession);
          }}
        />
        <ManageNursingUsersDialog
          open={manageNursingOpen}
          onClose={() => setManageNursingOpen(false)}
        />
        <LicenceDialog
          open={licenceOpen}
          onClose={() => setLicenceOpen(false)}
        />
        <BillingDialog
          patient={billingPatient}
          open={!!billingPatient}
          onClose={() => setBillingPatient(null)}
        />
        <PWAInstallBanner />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hidden file input for restore (triggered from header menu) */}
      <input
        ref={headerRestoreInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importBackupFile(file, handleRestorePatients);
          e.target.value = "";
        }}
        data-ocid="header.restore_input"
      />

      <Header
        onNavigate={(p) => setPage(p)}
        currentPage={page}
        session={session}
        {...sharedActions}
      />

      {/* Cloud sync indicator */}
      {isSyncing && (
        <div className="no-print bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2 text-blue-700 text-sm">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          <span>Syncing data from cloud...</span>
        </div>
      )}

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
            onBill={(p) => setBillingPatient(p)}
            onCertificate={(p) => setCertificatePatient(p)}
            onReferral={(p) => setReferralPatient(p)}
            onEditPatient={(p) => setEditPatient(p)}
            isNursing={isNursing}
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
              setEditFromHistoryTypedContent(undefined);
            }}
            onUpdate={handlePatientUpdate}
            followUpDate={followUpDate}
            initialPages={editFromHistoryPages}
            initialTypedContent={editFromHistoryTypedContent}
          />
        )}
      </main>

      <PatientHistoryModal
        patient={historyPatient}
        open={!!historyPatient}
        onClose={() => setHistoryPatient(null)}
        onEdit={(record) => {
          if (!historyPatient) return;
          const editPages =
            record.pages && record.pages.length > 0
              ? record.pages
              : record.canvasData
                ? [record.canvasData]
                : [];
          setEditFromHistoryPages(editPages);
          setEditFromHistoryTypedContent(record.typedContent ?? undefined);
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
        onConfirm={(date, doctor, newVitals) => {
          if (!followUpTarget) return;
          // Use the same patient but with the chosen doctor for this visit
          const patientForFollowUp: LocalPatient = {
            ...followUpTarget,
            doctorName: doctor,
            vitals: newVitals,
          };
          setSelectedPatient(patientForFollowUp);
          setFollowUpDate(date);
          setFollowUpDialogOpen(false);
          setFollowUpTarget(null);
          setPage("prescription");
          toast.success(`Follow-up for ${followUpTarget.name} on ${date}`);
        }}
      />

      <ChangeProfileDialog
        open={changeProfileOpen}
        onClose={() => setChangeProfileOpen(false)}
        session={session}
        onSessionUpdate={(updatedSession) => {
          setSessionState(updatedSession);
        }}
      />
      <ManageNursingUsersDialog
        open={manageNursingOpen}
        onClose={() => setManageNursingOpen(false)}
      />
      <LicenceDialog open={licenceOpen} onClose={() => setLicenceOpen(false)} />

      <BillingDialog
        patient={billingPatient}
        open={!!billingPatient}
        onClose={() => setBillingPatient(null)}
      />

      <EditPatientDialog
        patient={editPatient}
        open={!!editPatient}
        onClose={() => setEditPatient(null)}
        onSave={(updated) => {
          updateMutation.mutate(updated);
          setEditPatient(null);
          toast.success("Patient updated successfully");
        }}
      />

      <CertificateDialog
        patient={certificatePatient}
        open={!!certificatePatient}
        onClose={() => setCertificatePatient(null)}
      />

      <ReferralDialog
        patient={referralPatient}
        open={!!referralPatient}
        onClose={() => setReferralPatient(null)}
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
