import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Search, ShieldCheck, ShieldX, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@shared/types";
import { AdminCard, AdminPageHeader } from "@/components/admin-layout";
import { Badge, Button, Empty, Field, Input, Modal, Progress, Select, Spinner, StatusBadge } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { usePageMeta } from "@/hooks/use-page-meta";
import { api, errorMessage } from "@/lib/api";
import { ADMIN_ROLES, type AdminStaff, type AdminStudent, type AdminStudentDetail } from "@/lib/admin-types";
import { formatDate, formatDateTime } from "@/lib/format";
import { price } from "@/lib/money";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source.charAt(0).toUpperCase();
}

/* ------------------------------ Students list ------------------------------- */

export function AdminStudentsPage() {
  usePageMeta("Students | Admin | German In Minutes");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "students"],
    queryFn: () => api.get<{ students: AdminStudent[] }>("/admin/students"),
  });

  const students = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.students ?? []).filter((student) => {
      if (level !== "all" && student.current_level !== level) return false;
      if (status !== "all" && student.account_status !== status) return false;
      if (!needle) return true;
      return `${student.full_name} ${student.email}`.toLowerCase().includes(needle);
    });
  }, [data, query, level, status]);

  return (
    <>
      <AdminPageHeader
        title="Students"
        description="Every learner account, their level, spend and roles."
        actions={<Badge tone="gold">{students.length} shown</Badge>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email…" className="pl-9" />
        </label>
        <Select value={level} onChange={(event) => setLevel(event.target.value)} className="w-auto">
          <option value="all">All levels</option>
          {LEVELS.map((option) => <option key={option} value={option}>{option}</option>)}
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-auto">
          <option value="all">All statuses</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
        </Select>
      </div>

      <AdminCard>
        {isLoading ? <Spinner /> : students.length === 0 ? (
          <div className="p-6"><Empty title="No students found">Try a different search or filter.</Empty></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-frost text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Level</th>
                  <th className="px-5 py-3">Courses</th>
                  <th className="px-5 py-3">Spend</th>
                  <th className="px-5 py-3">Roles</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-t border-border hover:bg-frost/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-charcoal text-sm font-bold text-white">
                          {initials(student.full_name, student.email)}
                        </span>
                        <div className="min-w-0">
                          <Link to={`/admin/students/${student.id}`} className="block max-w-[220px] truncate font-semibold hover:text-primary">
                            {student.full_name || "Unnamed student"}
                          </Link>
                          <span className="block max-w-[220px] truncate text-xs text-muted-foreground">{student.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><Badge tone="gold">{student.current_level}</Badge></td>
                    <td className="px-5 py-3">{student.enrollment_count}</td>
                    <td className="px-5 py-3">{price(student.spend)}</td>
                    <td className="px-5 py-3">
                      {student.roles.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                        <div className="flex flex-wrap gap-1">
                          {student.roles.map((role) => <Badge key={role} tone="dark">{role.replace(/_/g, " ")}</Badge>)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={student.account_status} /></td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(student.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/admin/students/${student.id}`} className="rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </>
  );
}

/* ----------------------------- Student detail ------------------------------- */

export function AdminStudentDetailPage() {
  usePageMeta("Student | Admin | German In Minutes");
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = Boolean(user?.roles.includes("super_admin"));
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<Role>("content_admin");
  const [form, setForm] = useState<{ fullName: string; phone: string; level: string; dailyGoalMinutes: string; accountStatus: "active" | "suspended" } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "student", id],
    queryFn: () => api.get<{ student: AdminStudentDetail }>(`/admin/students/${id}`),
    enabled: Boolean(id),
  });
  const student = data?.student;

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      await api.patch(`/admin/students/${id}`, {
        fullName: form.fullName,
        phone: form.phone || null,
        level: form.level,
        dailyGoalMinutes: Number(form.dailyGoalMinutes),
        accountStatus: form.accountStatus,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "student", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
      toast.success("Student updated");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function grantRole(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post(`/admin/students/${id}/roles`, { role });
      await queryClient.invalidateQueries({ queryKey: ["admin", "student", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast.success(`Granted ${role.replace(/_/g, " ")}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function revokeRole(target: Role) {
    if (!window.confirm(`Revoke the ${target.replace(/_/g, " ")} role from this account?`)) return;
    try {
      await api.del(`/admin/students/${id}/roles/${target}`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "student", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast.success("Role revoked");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  if (isLoading) return <Spinner label="Loading student…" />;
  if (!student) return <Empty title="Student not found">This account may have been deleted.</Empty>;

  const values = form ?? {
    fullName: student.full_name,
    phone: student.phone ?? "",
    level: student.current_level,
    dailyGoalMinutes: String(student.daily_goal_minutes),
    accountStatus: student.account_status,
  };

  return (
    <>
      <Link to="/admin/students" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> All students
      </Link>
      <AdminPageHeader
        title={student.full_name || "Unnamed student"}
        description={student.email}
        actions={
          <>
            <StatusBadge status={student.account_status} />
            <Badge tone="gold">{student.current_level}</Badge>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <AdminCard title="Profile" description="Contact details, level and account status.">
            <form onSubmit={saveProfile} className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Full name"><Input value={values.fullName} onChange={(event) => setForm({ ...values, fullName: event.target.value })} required minLength={2} /></Field>
              <Field label="Email" hint="Email addresses cannot be changed here."><Input value={student.email} disabled /></Field>
              <Field label="Phone"><Input value={values.phone} onChange={(event) => setForm({ ...values, phone: event.target.value })} placeholder="+251 …" /></Field>
              <Field label="Current level">
                <Select value={values.level} onChange={(event) => setForm({ ...values, level: event.target.value })}>
                  {LEVELS.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </Field>
              <Field label="Daily goal (minutes)"><Input type="number" min={5} max={180} value={values.dailyGoalMinutes} onChange={(event) => setForm({ ...values, dailyGoalMinutes: event.target.value })} /></Field>
              <Field label="Account status">
                <Select value={values.accountStatus} onChange={(event) => setForm({ ...values, accountStatus: event.target.value as "active" | "suspended" })}>
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
              </div>
            </form>
          </AdminCard>

          <AdminCard title="Enrolments" description={`${student.enrollments.length} course${student.enrollments.length === 1 ? "" : "s"}`}>
            {student.enrollments.length === 0 ? (
              <div className="p-5"><Empty title="No enrolments yet" /></div>
            ) : (
              <ul className="divide-y divide-border">
                {student.enrollments.map((enrollment) => (
                  <li key={enrollment.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <Link to={`/admin/courses/${enrollment.course_id}`} className="font-semibold hover:text-primary">{enrollment.title}</Link>
                      <p className="text-xs text-muted-foreground">Enrolled {formatDate(enrollment.enrolled_at)}{enrollment.completed_at ? ` · Completed ${formatDate(enrollment.completed_at)}` : ""}</p>
                    </div>
                    <div className="flex w-40 items-center gap-2">
                      <Progress value={enrollment.progress_percent} className="flex-1" />
                      <span className="w-9 text-right text-xs font-semibold">{enrollment.progress_percent}%</span>
                    </div>
                    <Badge tone="gold">{enrollment.level}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          <AdminCard title="Orders" description="Payments and test checkout records.">
            {student.orders.length === 0 ? <div className="p-5"><Empty title="No orders" /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-frost text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr><th className="px-5 py-2.5">Course</th><th className="px-5 py-2.5">Amount</th><th className="px-5 py-2.5">Provider</th><th className="px-5 py-2.5">Status</th><th className="px-5 py-2.5">Date</th></tr>
                  </thead>
                  <tbody>
                    {student.orders.map((order) => (
                      <tr key={order.id} className="border-t border-border">
                        <td className="px-5 py-2.5">{order.course_title ?? "—"}</td>
                        <td className="px-5 py-2.5">{price(order.amount)}</td>
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">{order.provider ?? "—"}<br />{order.reference ?? ""}</td>
                        <td className="px-5 py-2.5"><StatusBadge status={order.status} /></td>
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          <div className="grid gap-5 md:grid-cols-2">
            <AdminCard title="Certificates">
              {student.certificates.length === 0 ? <div className="p-5"><Empty title="No certificates" /></div> : (
                <ul className="divide-y divide-border text-sm">
                  {student.certificates.map((certificate) => (
                    <li key={certificate.id} className="px-5 py-3">
                      <p className="font-semibold">{certificate.course_title}</p>
                      <p className="text-xs text-muted-foreground">{certificate.certificate_number} · {formatDate(certificate.issued_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>
            <AdminCard title="Support tickets">
              {student.tickets.length === 0 ? <div className="p-5"><Empty title="No tickets" /></div> : (
                <ul className="divide-y divide-border text-sm">
                  {student.tickets.map((ticket) => (
                    <li key={ticket.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(ticket.created_at)}</p>
                      </div>
                      <StatusBadge status={ticket.status} />
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>
          </div>

          <AdminCard title="Recent sign-ins">
            {student.logins.length === 0 ? <div className="p-5"><Empty title="No sign-in history" /></div> : (
              <ul className="divide-y divide-border text-sm">
                {student.logins.map((login) => (
                  <li key={login.id} className="px-5 py-2.5">
                    <p className="font-medium">{login.email ?? student.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{formatDateTime(login.created_at)} · {login.user_agent ?? "unknown device"}</p>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        <div className="space-y-5">
          <AdminCard title="Staff roles" description="Roles unlock the admin portal.">
            <div className="space-y-2 p-5">
              {student.roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">This account has no staff roles — it is a learner only.</p>
              ) : student.roles.map((item) => (
                <div key={item} className="flex items-center justify-between gap-2 rounded-md bg-frost px-3 py-2 text-sm">
                  <span className="font-semibold capitalize">{item.replace(/_/g, " ")}</span>
                  {isSuperAdmin && (
                    <button onClick={() => revokeRole(item)} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label={`Revoke ${item}`}>
                      <ShieldX className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {isSuperAdmin ? (
                <form onSubmit={grantRole} className="mt-3 space-y-2 border-t border-border pt-3">
                  <Field label="Grant role">
                    <Select value={role} onChange={(event) => setRole(event.target.value as Role)}>
                      {ADMIN_ROLES.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
                    </Select>
                  </Field>
                  <Button type="submit" disabled={busy} className="w-full"><ShieldCheck className="size-4" /> Grant role</Button>
                </form>
              ) : (
                <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Only super administrators can change roles.</p>
              )}
            </div>
          </AdminCard>

          <AdminCard title="Account facts">
            <dl className="divide-y divide-border text-sm">
              <div className="flex justify-between gap-3 px-5 py-2.5"><dt className="text-muted-foreground">Joined</dt><dd>{formatDate(student.created_at)}</dd></div>
              <div className="flex justify-between gap-3 px-5 py-2.5"><dt className="text-muted-foreground">Streak</dt><dd>{student.streak_days} days</dd></div>
              <div className="flex justify-between gap-3 px-5 py-2.5"><dt className="text-muted-foreground">Onboarding</dt><dd>{student.onboarding_completed ? "Complete" : "Pending"}</dd></div>
              <div className="flex justify-between gap-3 px-5 py-2.5"><dt className="text-muted-foreground">Language</dt><dd>{student.preferred_language}</dd></div>
              <div className="flex justify-between gap-3 px-5 py-2.5"><dt className="text-muted-foreground">Goal</dt><dd className="max-w-[180px] text-right">{student.learning_goal ?? "—"}</dd></div>
            </dl>
          </AdminCard>

          <AdminCard title="Contact">
            <div className="p-5 text-sm">
              <a href={`mailto:${student.email}`} className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
                <Mail className="size-4" /> Email student
              </a>
            </div>
          </AdminCard>
        </div>
      </div>
    </>
  );
}

/* -------------------------------- Staff ------------------------------------ */

export function AdminStaffPage() {
  usePageMeta("Staff & roles | Admin | German In Minutes");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = Boolean(user?.roles.includes("super_admin"));
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("content_admin");
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: () => api.get<{ staff: AdminStaff[] }>("/admin/staff"),
  });
  const staff = data?.staff ?? [];

  async function add(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/staff", { email, role });
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      setOpen(false);
      setEmail("");
      toast.success("Role granted");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(member: AdminStaff, target: string) {
    if (!window.confirm(`Revoke ${target.replace(/_/g, " ")} from ${member.email}?`)) return;
    try {
      await api.del(`/admin/students/${member.id}/roles/${target}`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast.success("Role revoked");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Staff & roles"
        description="Who can access the admin portal and what they can do."
        actions={isSuperAdmin ? <Button onClick={() => setOpen(true)}><UserPlus className="size-4" /> Grant role</Button> : undefined}
      />

      <AdminCard>
        {isLoading ? <Spinner /> : staff.length === 0 ? <div className="p-6"><Empty title="No staff accounts yet">Grant a role by email to add an administrator.</Empty></div> : (
          <ul className="divide-y divide-border">
            {staff.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-charcoal text-sm font-bold text-white">
                  {initials(member.full_name, member.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <Link to={`/admin/students/${member.id}`} className="font-semibold hover:text-primary">{member.full_name || "Unnamed"}</Link>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {member.roles.map((item) => (
                    <span key={item} className="inline-flex items-center gap-1 rounded-full bg-charcoal px-2.5 py-1 text-xs font-semibold capitalize text-white">
                      {item.replace(/_/g, " ")}
                      {isSuperAdmin && (
                        <button onClick={() => revoke(member, item)} className="text-white/60 hover:text-white" aria-label={`Revoke ${item}`}>
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Grant a staff role"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button form="grant-role" type="submit" disabled={busy}>{busy ? "Granting…" : "Grant role"}</Button></>}
      >
        <form id="grant-role" onSubmit={add} className="grid gap-4">
          <Field label="Account email" hint="The account must already exist.">
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="colleague@germaninminutes.com" />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(event) => setRole(event.target.value as Role)}>
              {ADMIN_ROLES.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
            </Select>
          </Field>
        </form>
      </Modal>
    </>
  );
}
