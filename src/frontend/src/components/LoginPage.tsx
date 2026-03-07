import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Stethoscope, User } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

// ── Credentials ──────────────────────────────────────────────────────────────

const DOCTOR_ACCOUNTS = [
  {
    userId: "dr.dhravid",
    password: "dhravid@123",
    displayName: "Dr. Dhravid",
  },
  { userId: "dr.zeel", password: "zeel@123", displayName: "Dr. Zeel" },
] as const;

export interface AuthSession {
  userId: string;
  displayName: string;
}

const SESSION_KEY = "shreeji_auth";

export function getSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── LoginPage ────────────────────────────────────────────────────────────────

export function LoginPage({ onLogin }: { onLogin: (s: AuthSession) => void }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Simulate a brief authentication check
    setTimeout(() => {
      const account = DOCTOR_ACCOUNTS.find(
        (a) =>
          a.userId === userId.trim().toLowerCase() && a.password === password,
      );

      if (account) {
        const session: AuthSession = {
          userId: account.userId,
          displayName: account.displayName,
        };
        setSession(session);
        onLogin(session);
      } else {
        setError("Invalid User ID or Password");
        setIsSubmitting(false);
      }
    }, 500);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-0 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full opacity-[0.08] -translate-x-1/2 -translate-y-1/2 bg-clinic-red blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full opacity-[0.07] translate-x-1/3 translate-y-1/3 bg-clinic-blue blur-3xl" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.38 0.1 220) 1px, transparent 1px), linear-gradient(90deg, oklch(0.38 0.1 220) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          {/* Card Top Band */}
          <div className="clinic-header-gradient px-8 py-8 text-white text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.35, ease: "easeOut" }}
              className="flex justify-center mb-4"
            >
              <img
                src="/assets/generated/logo-white-circle.dim_400x400.png"
                alt="Shreeji Clinic Logo"
                className="w-20 h-20 object-cover rounded-full drop-shadow-lg"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }}
            >
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Shreeji Clinic
              </h1>
              <p className="text-white/70 text-sm mt-1">
                OPD Management System
              </p>
            </motion.div>
          </div>

          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35 }}
            className="px-8 py-7"
          >
            {/* Heading */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-clinic-blue/10 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-clinic-blue" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Doctor Login
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* User ID */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="login-userid"
                  className="text-sm font-medium text-foreground"
                >
                  User ID
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="login-userid"
                    type="text"
                    placeholder="Enter User ID"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value);
                      setError(null);
                    }}
                    className="pl-10 h-11"
                    autoComplete="username"
                    autoFocus
                    required
                    data-ocid="login.userid_input"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="login-password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    className="pl-10 pr-11 h-11"
                    autoComplete="current-password"
                    required
                    data-ocid="login.password_input"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    tabIndex={0}
                    data-ocid="login.toggle_password_button"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium"
                  role="alert"
                  aria-live="polite"
                  data-ocid="login.error_state"
                >
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 gap-2 bg-clinic-red hover:bg-clinic-red/90 text-white font-semibold text-sm mt-1"
                disabled={isSubmitting || !userId.trim() || !password}
                data-ocid="login.submit_button"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            {/* Privacy note */}
            <p className="text-center text-xs text-muted-foreground mt-5">
              🔒 Access restricted to authorized doctors only
            </p>
          </motion.div>
        </div>

        {/* Bottom footnote */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-clinic-blue transition-colors"
          >
            Built with ❤️ using caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
