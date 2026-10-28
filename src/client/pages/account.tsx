import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, CheckCircle2, CreditCard, Download, KeyRound, LifeBuoy, Lock, Mail, MessageSquare, Receipt, ShieldCheck, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { LEVELS } from "@shared/data";
import type { Certificate, DashboardData, Order, SupportTicket } from "@shared/types";
import { Badge, Button, Empty, Field, Input, Select, Spinner, StatusBadge, Textarea } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { useDbCourses } from "@/hooks/use-courses";
import { usePageMeta } from "@/hooks/use-page-meta";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { price } from "@/lib/money";
import { cn } from "@/lib/utils";

/* --------------------------------- Checkout --------------------------------- */

type CheckoutOrder = { id: string; provider_reference: string | null; amount: number; provider: string | null };

export function CheckoutPage() {
  usePageMeta("Checkout | German In Minutes");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: courses = [], isLoading } = useDbCourses();
  const { data: dashboard } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/me/dashboard") });
  const courseKey = params.get("course") ?? "";
  const course = courses.find((item) => item.id === courseKey || item.slug === courseKey);
  const enrolled = Boolean(course && dashboard?.enrollments.some((item) => item.course_id === course.id));
  const [provider, setProvider] = useState<"stripe_test" | "paypal_test">("stripe_test");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);

  if (isLoading) return <div className="discovery-container"><Spinner label="Preparing checkout…" /></div>;
  if (!course) {
    return (
      <div className="discovery-container py-16">
        <Empty title="Choose a course first">
          <Link to="/courses" className="font-semibold text-primary underline">Browse all courses</Link>
        </Empty>
      </div>
    );
  }

  async function pay() {
    if (!course) return;
    setBusy(true);
    try {
      const result = await api.post<{ order: CheckoutOrder }>("/checkout", { courseId: course.id, provider });
      setOrder(result.order);
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Test payment approved — you're enrolled");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (order) {
    return (
      <div className="discovery-container py-14">
        <div className="mx-auto max-w-xl rounded-2xl bg-card p-8 text-center ring-1 ring-border">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold">You're enrolled in {course.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Test order {order.provider_reference ?? order.id} · {price(order.amount)} · {order.provider === "paypal_test" ? "PayPal (test)" : "Card (test)"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">No real money was taken. This is a sandbox checkout for the demo build.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to={`/learn/${course.slug}`} className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Start learning</Link>
            <a href={`/api/orders/${order.id}/receipt`} className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted">
              Download receipt
            </a>
            <button onClick={() => navigate("/settings")} className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted">Purchases</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="discovery-container py-10">
      <h1 className="font-display text-3xl font-extrabold">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">Secure test checkout — no real payment is taken in this demo.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-xl bg-card p-6 ring-1 ring-border">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><CreditCard className="size-4 text-primary" /> Payment method</h2>
          {enrolled ? (
            <div className="mt-4 rounded-lg bg-primary/10 p-4 text-sm ring-1 ring-primary/30">
              <p className="font-semibold">You already have access to this course.</p>
              <Link to={`/learn/${course.slug}`} className="mt-2 inline-block font-semibold text-primary underline">Open the course</Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {[
                { key: "stripe_test" as const, title: "Card (test)", body: "Visa · Mastercard · Amex — simulated approval" },
                { key: "paypal_test" as const, title: "PayPal (test)", body: "Simulated PayPal redirect approval" },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setProvider(option.key)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-4 text-left transition",
                    provider === option.key ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/60",
                  )}
                >
                  <span className={cn("mt-1 grid size-4 place-items-center rounded-full border", provider === option.key ? "border-primary" : "border-muted-foreground")}>
                    {provider === option.key && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{option.title}</span>
                    <span className="block text-xs text-muted-foreground">{option.body}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-lg bg-frost p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="flex items-center gap-1.5 font-semibold text-foreground"><Lock className="size-3.5 text-primary" /> Sandbox checkout</p>
            <p className="mt-1">
              Orders, enrolments and receipts are stored in the PostgreSQL/PGlite database so you can test the full
              student journey — lessons, quizzes, certificates — without a payment provider.
            </p>
          </div>

          {!enrolled && (
            <Button className="mt-6 w-full" size="lg" onClick={pay} disabled={busy}>
              {busy ? "Processing test payment…" : `Pay ${price(course.price_eur)} (test)`}
            </Button>
          )}
        </section>

        <aside className="self-start rounded-xl bg-card p-6 ring-1 ring-border">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <div className="mt-4 flex gap-3">
            <img src={course.image} alt="" className="h-20 w-28 rounded-md object-cover" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-primary">{course.level}</div>
              <h3 className="mt-1 text-sm font-bold">{course.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{course.lesson_count} lessons · {course.estimated_weeks} weeks</p>
            </div>
          </div>
          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Course price</dt><dd>{price(course.price_eur)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd>Included</dd></div>
            <div className="flex justify-between border-t border-border pt-2 font-bold"><dt>Total</dt><dd>{price(course.price_eur)}</dd></div>
          </dl>
          <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
            <li className="flex gap-2"><CheckCircle2 className="size-3.5 text-primary" /> Full course access</li>
            <li className="flex gap-2"><CheckCircle2 className="size-3.5 text-primary" /> Certificate on completion</li>
            <li className="flex gap-2"><CheckCircle2 className="size-3.5 text-primary" /> Receipt in personal settings</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

/* --------------------------------- Settings --------------------------------- */

type SettingsTab = "profile" | "purchases" | "security";

export function SettingsPage() {
  usePageMeta("Personal settings | German In Minutes", "Manage your profile, purchases, certificates and password.");
  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<SettingsTab>("profile");
  const { data: ordersData } = useQuery({ queryKey: ["orders"], queryFn: () => api.get<{ orders: Order[] }>("/orders") });
  const { data: certificatesData } = useQuery({ queryKey: ["certificates"], queryFn: () => api.get<{ certificates: Certificate[] }>("/certificates") });

  const [fullName, setFullName] = useState(user?.profile.full_name ?? "");
  const [phone, setPhone] = useState(user?.profile.phone ?? "");
  const [level, setLevel] = useState(user?.profile.current_level ?? "A1");
  const [learningGoal, setLearningGoal] = useState(user?.profile.learning_goal ?? "");
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(String(user?.profile.daily_goal_minutes ?? 15));
  const [busy, setBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.profile.full_name);
    setPhone(user.profile.phone ?? "");
    setLevel(user.profile.current_level);
    setLearningGoal(user.profile.learning_goal ?? "");
    setDailyGoalMinutes(String(user.profile.daily_goal_minutes));
  }, [user]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.patch("/auth/profile", {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        level,
        learningGoal: learningGoal.trim() || null,
        dailyGoalMinutes: Number(dailyGoalMinutes),
      });
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) { toast.error("Use a password of at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match."); return; }
    setPasswordBusy(true);
    try {
      await api.post("/auth/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPasswordBusy(false);
    }
  }

  const orders = ordersData?.orders ?? [];
  const certificates = certificatesData?.certificates ?? [];

  return (
    <div className="discovery-container py-10">
      <h1 className="font-display text-3xl font-extrabold">Personal settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your profile, receipts, certificates and account security.</p>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-border">
        {[
          { key: "profile" as const, label: "Profile", icon: Sparkles },
          { key: "purchases" as const, label: "Purchases & certificates", icon: Receipt },
          { key: "security" as const, label: "Password", icon: KeyRound },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold",
                tab === item.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" /> {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "profile" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <form onSubmit={saveProfile} className="rounded-xl bg-card p-6 ring-1 ring-border">
              <h2 className="font-display text-lg font-bold">Your details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Full name" className="sm:col-span-2"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} /></Field>
                <Field label="Email" hint="Contact support to change your login email.">
                  <Input value={user?.email ?? ""} disabled />
                </Field>
                <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251 …" /></Field>
                <Field label="Current level">
                  <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                    {LEVELS.map((item) => <option key={item.code} value={item.label}>{item.label} — {item.name}</option>)}
                  </Select>
                </Field>
                <Field label="Daily goal">
                  <Select value={dailyGoalMinutes} onChange={(e) => setDailyGoalMinutes(e.target.value)}>
                    {[10, 15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
                  </Select>
                </Field>
                <Field label="Learning goal" className="sm:col-span-2">
                  <Textarea value={learningGoal} onChange={(e) => setLearningGoal(e.target.value)} rows={3} placeholder="Pass the Goethe B1 exam, move to Germany…" />
                </Field>
              </div>
              <Button type="submit" className="mt-5" disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
            </form>
            <aside className="rounded-xl bg-card p-6 ring-1 ring-border">
              <h2 className="font-display text-lg font-bold">Learning snapshot</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Member since</span><span className="font-semibold">{formatDate(user?.profile.created_at)}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Level</span><span className="font-semibold">{user?.profile.current_level}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Streak</span><span className="font-semibold">{user?.profile.streak_days ?? 0} days</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Certificates</span><span className="font-semibold">{certificates.length}</span></div>
              </div>
              <div className="mt-5 rounded-lg bg-primary/10 p-4 text-xs leading-relaxed text-muted-foreground ring-1 ring-primary/25">
                <p className="flex items-center gap-1.5 font-semibold text-foreground"><Target className="size-3.5 text-primary" /> Daily goal</p>
                <p className="mt-1">Small daily sessions beat long weekly ones. Your dashboard tracks progress against your {dailyGoalMinutes}-minute goal.</p>
              </div>
            </aside>
          </div>
        )}

        {tab === "purchases" && (
          <div className="grid gap-6">
            <section className="rounded-xl bg-card ring-1 ring-border">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Receipt className="size-4 text-primary" /> Orders & receipts</h2>
                <span className="text-xs text-muted-foreground">{orders.length} orders</span>
              </div>
              {orders.length === 0 ? (
                <div className="p-6"><Empty title="No purchases yet">Browse courses to start learning.</Empty></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-frost text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Course</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Receipt</th></tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-t border-border">
                          <td className="px-5 py-3">{formatDate(order.created_at)}</td>
                          <td className="px-5 py-3 font-medium">{order.course_title ?? "German course"}</td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{order.provider_reference ?? order.id}</td>
                          <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                          <td className="px-5 py-3 text-right">{price(Number(order.amount))}</td>
                          <td className="px-5 py-3 text-right">
                            <a href={`/api/orders/${order.id}/receipt`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                              <Download className="size-3.5" /> PDF
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-xl bg-card ring-1 ring-border">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Award className="size-4 text-primary" /> Certificates</h2>
                <span className="text-xs text-muted-foreground">{certificates.length} earned</span>
              </div>
              {certificates.length === 0 ? (
                <div className="p-6"><Empty title="No certificates yet">Complete every lesson in a course to earn one.</Empty></div>
              ) : (
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  {certificates.map((certificate) => (
                    <div key={certificate.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="gold">{certificate.course_level}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(certificate.issued_at)}</span>
                      </div>
                      <h3 className="mt-2 text-sm font-bold">{certificate.course_title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{certificate.certificate_number}</p>
                      <div className="mt-3 flex gap-3 text-xs font-semibold">
                        <Link to={`/certificate/${certificate.id}`} className="text-primary hover:underline">View</Link>
                        <a href={`/api/certificates/${certificate.id}/pdf`} className="inline-flex items-center gap-1 text-primary hover:underline"><Download className="size-3" /> PDF</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "security" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <form onSubmit={savePassword} className="rounded-xl bg-card p-6 ring-1 ring-border">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold"><ShieldCheck className="size-4 text-primary" /> Change password</h2>
              <div className="mt-4 grid gap-4">
                <Field label="Current password"><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" /></Field>
                <Field label="New password" hint="At least 8 characters."><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></Field>
                <Field label="Confirm new password"><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></Field>
              </div>
              <Button type="submit" className="mt-5" disabled={passwordBusy}>{passwordBusy ? "Updating…" : "Update password"}</Button>
            </form>
            <aside className="rounded-xl bg-card p-6 ring-1 ring-border">
              <h2 className="font-display text-lg font-bold">Account</h2>
              <p className="mt-2 text-sm text-muted-foreground">Signed in as</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold"><Mail className="size-4 text-primary" /> {user?.email}</p>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Changing your password signs out other devices. To delete your account, contact support and we'll remove your data.
              </p>
              <Link to="/support" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <LifeBuoy className="size-4" /> Contact support
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- Support --------------------------------- */

type SupportResponse = { tickets: SupportTicket[] };

export function SupportPage() {
  usePageMeta("Support | German In Minutes", "Ask the German In Minutes team about courses, certificates or billing.");
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["support"], queryFn: () => api.get<SupportResponse>("/support") });
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Courses");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post("/support", { subject: subject.trim(), category, message: message.trim() });
      setSubject("");
      setMessage("");
      await queryClient.invalidateQueries({ queryKey: ["support"] });
      toast.success("Ticket created — we'll reply by email");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const tickets = data?.tickets ?? [];

  return (
    <div className="discovery-container py-10">
      <h1 className="font-display text-3xl font-extrabold">Support</h1>
      <p className="mt-1 text-sm text-muted-foreground">Questions about courses, certificates or billing — we reply within two working days.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <form onSubmit={submit} className="self-start rounded-xl bg-card p-6 ring-1 ring-border">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><MessageSquare className="size-4 text-primary" /> New ticket</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={4} placeholder="Short summary" /></Field>
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {["Courses", "Billing", "Certificates", "Technical", "Other"].map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Message"><Textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} rows={5} placeholder="Describe your question with as much detail as you can." /></Field>
          </div>
          <Button type="submit" className="mt-4" disabled={busy}>{busy ? "Sending…" : "Create ticket"}</Button>
          <div className="mt-6 rounded-lg bg-frost p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">Faster answers</p>
            <p className="mt-1">Check the <Link to="/faq" className="text-primary underline">FAQ</Link> for billing, certificates and Goethe questions.</p>
          </div>
        </form>

        <section>
          <h2 className="font-display text-lg font-bold">Your tickets</h2>
          {isLoading ? (
            <Spinner label="Loading tickets…" />
          ) : tickets.length === 0 ? (
            <div className="mt-4"><Empty title="No tickets yet">Create one on the left and we'll get back to you.</Empty></div>
          ) : (
            <div className="mt-4 space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-xl bg-card p-5 ring-1 ring-border">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">{ticket.subject}</h3>
                    <div className="flex items-center gap-2">
                      <Badge>{ticket.category}</Badge>
                      <StatusBadge status={ticket.status} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ticket.message}</p>
                  {ticket.admin_reply && (
                    <div className="mt-3 rounded-lg bg-primary/8 p-3 ring-1 ring-primary/20">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Team reply</p>
                      <p className="mt-1 text-sm">{ticket.admin_reply}</p>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">Opened {formatDateTime(ticket.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------------------------------- Welcome --------------------------------- */

export function WelcomePage() {
  usePageMeta("Set up your learning plan | German In Minutes");
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState(user?.profile.current_level ?? "A1");
  const [goal, setGoal] = useState(user?.profile.learning_goal ?? "Speak German with confidence");
  const [minutes, setMinutes] = useState(String(user?.profile.daily_goal_minutes ?? 15));
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  async function finish() {
    setBusy(true);
    try {
      await api.patch("/auth/profile", { level, learningGoal: goal, dailyGoalMinutes: Number(minutes), onboardingCompleted: true });
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Your learning plan is ready");
      navigate("/student", { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    {
      title: "What's your current German level?",
      body: "We'll start you at the right place — you can change this any time in settings.",
      content: (
        <div className="grid gap-2 sm:grid-cols-2">
          {LEVELS.map((item) => (
            <button
              key={item.code}
              onClick={() => setLevel(item.label)}
              className={cn("rounded-lg border p-4 text-left transition", level === item.label ? "border-primary bg-primary/10" : "border-border hover:border-primary/60")}
            >
              <div className="font-display text-lg font-bold">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.name} · {item.tagline}</div>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "What are you working towards?",
      body: "Your goal shapes the recommendations on your dashboard.",
      content: (
        <div className="grid gap-2">
          {["Pass a Goethe exam", "Speak German with confidence", "Move to Germany", "Use German at work", "Study in Germany"].map((option) => (
            <button
              key={option}
              onClick={() => setGoal(option)}
              className={cn("rounded-lg border px-4 py-3 text-left text-sm font-medium transition", goal === option ? "border-primary bg-primary/10" : "border-border hover:border-primary/60")}
            >
              {option}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "How much time can you give each day?",
      body: "Ten focused minutes a day beats a three-hour weekend session.",
      content: (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[10, 15, 20, 30, 45, 60].map((option) => (
            <button
              key={option}
              onClick={() => setMinutes(String(option))}
              className={cn("rounded-lg border px-4 py-3 text-sm font-semibold transition", minutes === String(option) ? "border-primary bg-primary/10" : "border-border hover:border-primary/60")}
            >
              {option} min
            </button>
          ))}
        </div>
      ),
    },
  ];
  const current = steps[step]!;

  return (
    <div className="discovery-container py-12">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Step {step + 1} of {steps.length}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">{current.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{current.body}</p>
        <div className="mt-6 flex gap-1">
          {steps.map((_, index) => <span key={index} className={cn("h-1 flex-1 rounded-full", index <= step ? "bg-primary" : "bg-border")} />)}
        </div>
        <div className="mt-6 rounded-xl bg-card p-6 ring-1 ring-border">{current.content}</div>
        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((value) => value + 1)}>Continue</Button>
          ) : (
            <Button onClick={finish} disabled={busy}>{busy ? "Setting up…" : "Start learning"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Certificate -------------------------------- */

export function CertificatePage() {
  const { id = "" } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ["certificates"], queryFn: () => api.get<{ certificates: Certificate[] }>("/certificates") });
  const certificate = data?.certificates.find((item) => item.id === id);
  usePageMeta(certificate ? `${certificate.course_title} certificate | German In Minutes` : "Certificate | German In Minutes");

  if (isLoading) return <div className="discovery-container"><Spinner label="Loading certificate…" /></div>;
  if (!certificate) {
    return (
      <div className="discovery-container py-16">
        <Empty title="Certificate not found">
          <Link to="/settings" className="font-semibold text-primary underline">Back to settings</Link>
        </Empty>
      </div>
    );
  }

  return (
    <div className="discovery-container py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/settings" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Back to settings</Link>
        <div className="flex gap-2">
          <a href={`/api/certificates/${certificate.id}/pdf`} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Download className="size-4" /> Download PDF</a>
        </div>
      </div>

      <div className="mx-auto max-w-4xl rounded-xl bg-[#fffdf7] p-2 shadow-sm ring-1 ring-[#d4af55]/50 print:shadow-none">
        <div className="border-2 border-[#d4af55] p-8 sm:p-14">
          <div className="flex items-start justify-between">
            <img src="/images/gim-logo.png" alt="German In Minutes" className="h-10 w-auto" />
            <span className="text-right text-xs uppercase tracking-[0.2em] text-[#6e6e6e]">Certificate of completion</span>
          </div>
          <p className="mt-12 text-sm uppercase tracking-[0.24em] text-[#6e6e6e]">This certifies that</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-[#252525] sm:text-5xl">{certificate.student_name ?? "German learner"}</h1>
          <p className="mt-6 text-sm text-[#6e6e6e]">has successfully completed</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-[#252525] sm:text-3xl">{certificate.course_title}</h2>
          <p className="mt-2 text-sm text-[#6e6e6e]">Level {certificate.course_level} · German In Minutes online learning</p>

          <div className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t border-[#d4af55]/40 pt-6 text-sm">
            <div>
              <p className="font-semibold text-[#252525]">{formatDate(certificate.issued_at)}</p>
              <p className="text-xs text-[#6e6e6e]">Date issued</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs font-semibold text-[#252525]">{certificate.certificate_number}</p>
              <p className="text-xs text-[#6e6e6e]">Certificate number</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-4xl text-xs text-muted-foreground">
        This certificate confirms completion of a German In Minutes course. The Goethe-Zertifikat is issued only by the Goethe-Institut —
        our courses prepare you to pass it.
      </p>
    </div>
  );
}
