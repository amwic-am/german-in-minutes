import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { LEVELS } from "@shared/data";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Field, Input, Select } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { usePageMeta } from "@/hooks/use-page-meta";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const highlights = [
  "Free A1 starter lessons and PDF library",
  "Structured paths from A1 to C1",
  "Goethe-style mock exams and feedback",
  "Progress tracking and completion certificates",
];

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-frost">
      <div className="mx-auto grid min-h-screen max-w-[1240px] lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden overflow-hidden bg-charcoal lg:flex lg:flex-col lg:justify-between">
          <img
            src="/images/learning-banner.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/70 to-charcoal/30" />
          <div className="relative p-10">
            <Link to="/" aria-label="German In Minutes home">
              <img src="/images/gim-logo.png" alt="German In Minutes" className="h-9 w-auto brightness-0 invert" />
            </Link>
            <div className="mt-16 max-w-md">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 ring-1 ring-white/15">
                <Sparkles className="size-3.5 text-brand" /> Learn German in minutes a day
              </span>
              <h2 className="mt-5 font-display text-4xl font-extrabold leading-tight text-white">
                Small lessons. Real progress.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70">
                Build the German you need for study, work or life abroad — with a clear path and feedback at every step.
              </p>
              <ul className="mt-7 space-y-3">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/85">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="relative flex gap-6 border-t border-white/10 p-10 text-white/70">
            <div className="flex items-center gap-2 text-xs"><GraduationCap className="size-4 text-brand" /> A1–C1 curriculum</div>
            <div className="flex items-center gap-2 text-xs"><ShieldCheck className="size-4 text-brand" /> Certificates included</div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-5 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link to="/"><BrandLogo /></Link>
            </div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Back to site
            </Link>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-7">{children}</div>
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              By continuing you accept our <Link to="/legal/terms" className="underline hover:text-foreground">Terms of Use</Link> and{" "}
              <Link to="/legal/privacy" className="underline hover:text-foreground">Privacy Notice</Link>. Need help?{" "}
              <Link to="/contact" className="underline hover:text-foreground">Contact us</Link>.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function useRedirectTarget() {
  const [params] = useSearchParams();
  const target = params.get("redirect") ?? params.get("next") ?? "";
  return target.startsWith("/") && !target.startsWith("//") ? target : "";
}

function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{message}</p>;
}

/* ----------------------------------- Login ---------------------------------- */

export function LoginPage() {
  usePageMeta("Log in | German In Minutes", "Log in to continue your German course, practice streak and Goethe exam preparation.");
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const redirect = useRedirectTarget();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={redirect || (user.roles.length ? "/admin" : "/student")} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const signedIn = await login(email.trim(), password);
      toast.success(`Welcome back, ${signedIn.full_name.split(" ")[0] || "learner"}`);
      navigate(redirect || (signedIn.roles.length ? "/admin" : "/student"), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Log in" subtitle="Pick up your German course where you left off.">
      <form onSubmit={submit} className="grid gap-4">
        <AuthError message={error} />
        <Field label="Email">
          <Input type="email" autoFocus autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-semibold text-primary hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
        <p className="text-center text-sm text-muted-foreground">
          New here? <Link to="/register" className="font-semibold text-primary hover:underline">Create a free account</Link>
        </p>
      </form>
    </AuthShell>
  );
}

/* --------------------------------- Register --------------------------------- */

export function RegisterPage() {
  usePageMeta("Create your free account | German In Minutes", "Create a free German In Minutes account to start A1 lessons and track your progress.");
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState("A1");
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState("15");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/student" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) { setError("Please enter your full name."); return; }
    if (password.length < 8) { setError("Use a password of at least 8 characters."); return; }
    setBusy(true);
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password, level, dailyGoalMinutes: Number(dailyGoalMinutes) });
      toast.success("Your account is ready — let's set up your learning plan.");
      navigate("/welcome", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Start learning free" subtitle="No card required. Your first A1 lessons are waiting.">
      <form onSubmit={submit} className="grid gap-4">
        <AuthError message={error} />
        <Field label="Full name">
          <Input autoFocus autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Anna Müller" />
        </Field>
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current level">
            <Select value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((item) => <option key={item.code} value={item.label}>{item.label} — {item.name}</option>)}
            </Select>
          </Field>
          <Field label="Daily goal">
            <Select value={dailyGoalMinutes} onChange={(e) => setDailyGoalMinutes(e.target.value)}>
              {[10, 15, 20, 30, 45].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
            </Select>
          </Field>
        </div>
        <Button type="submit" size="lg" disabled={busy} className={cn(busy && "opacity-70")}>
          {busy ? "Creating account…" : "Create free account"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

/* ------------------------------ Forgot password ----------------------------- */

export function ForgotPasswordPage() {
  usePageMeta("Reset your password | German In Minutes", "Request a password reset link for your German In Minutes account.");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.post<{ ok: boolean; resetToken?: string }>("/auth/forgot", { email: email.trim() });
      setSent(true);
      setResetToken(result.resetToken ?? null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we'll help you set a new one.">
      {sent ? (
        <div className="grid gap-4">
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            If an account exists for <strong>{email}</strong>, a reset link is on its way.
          </p>
          {resetToken && (
            <div className="rounded-md border border-dashed border-primary/50 bg-primary/10 p-4 text-sm">
              <p className="font-semibold">Local build: no email provider configured.</p>
              <p className="mt-1 text-muted-foreground">Use this one-time link to choose a new password:</p>
              <Link to={`/reset-password?token=${encodeURIComponent(resetToken)}`} className="mt-2 inline-block break-all font-semibold text-primary underline">
                Continue to reset password
              </Link>
            </div>
          )}
          <Link to="/login" className="text-center text-sm font-semibold text-primary hover:underline">Back to log in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Email">
            <Input type="email" autoFocus autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
          </Field>
          <Button type="submit" size="lg" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
          <Link to="/login" className="text-center text-sm font-semibold text-primary hover:underline">Back to log in</Link>
        </form>
      )}
    </AuthShell>
  );
}

/* ------------------------------- Reset password ----------------------------- */

export function ResetPasswordPage() {
  usePageMeta("Choose a new password | German In Minutes", "Set a new password for your German In Minutes account.");
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!token) { setError("This reset link is incomplete. Request a new one."); return; }
    if (password.length < 8) { setError("Use a password of at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      await api.post("/auth/reset", { token, password });
      toast.success("Password updated — log in with your new password.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Pick something you'll remember — at least 8 characters.">
      <form onSubmit={submit} className="grid gap-4">
        <AuthError message={error} />
        <Field label="New password">
          <Input type="password" autoFocus autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
        </Field>
        <Field label="Confirm password">
          <Input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the password" />
        </Field>
        <Button type="submit" size="lg" disabled={busy || !token}>{busy ? "Updating…" : "Update password"}</Button>
        {!token && <p className="text-sm text-destructive">This link is missing its reset token. Request a new link.</p>}
        <Link to="/forgot-password" className="text-center text-sm font-semibold text-primary hover:underline">Request a new link</Link>
      </form>
    </AuthShell>
  );
}
