import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowRight, BookOpen, DollarSign, LogIn, ShoppingBag, UserPlus, Users } from "lucide-react";
import type { AdminOverview } from "@shared/types";
import { AdminCard, AdminPageHeader } from "@/components/admin-layout";
import { Empty, Spinner, StatusBadge } from "@/components/ui";
import { usePageMeta } from "@/hooks/use-page-meta";
import { api, errorMessage } from "@/lib/api";
import { relativeDate } from "@/lib/format";
import { price } from "@/lib/money";

export function AdminOverviewPage() {
  usePageMeta("Admin overview | German In Minutes");
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "overview"], queryFn: () => api.get<AdminOverview>("/admin/overview") });

  if (isLoading) return <Spinner label="Loading dashboard…" />;
  if (error || !data) return <Empty title="Couldn't load the overview">{errorMessage(error)}</Empty>;

  const totals = [
    { label: "Students", value: String(data.totals.students), hint: `${data.totals.new7} new in 7 days`, icon: Users, to: "/admin/students" },
    { label: "Published courses", value: String(data.totals.publishedCourses), hint: `${data.totals.courses} total`, icon: BookOpen, to: "/admin/courses" },
    { label: "Revenue", value: price(data.totals.revenue), hint: "Paid orders", icon: DollarSign, to: "/admin/orders" },
    { label: "Pending orders", value: String(data.totals.pendingOrders), hint: "Awaiting payment", icon: ShoppingBag, to: "/admin/orders" },
  ];

  return (
    <>
      <AdminPageHeader title="Overview" description="Platform health, revenue and recent activity." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {totals.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.to} className="group rounded-xl bg-card p-5 ring-1 ring-border transition hover:ring-primary">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</span>
                <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary"><Icon className="size-4" /></span>
              </div>
              <div className="mt-3 font-display text-3xl font-extrabold">{item.value}</div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                {item.hint}
                <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <AdminCard title="Revenue" description="Paid orders, last six months">
          <div className="h-72 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenue}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF55" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#D4AF55" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={48} />
                <Tooltip formatter={(value) => price(Number(value ?? 0))} />
                <Area type="monotone" dataKey="v" stroke="#D4AF55" strokeWidth={2} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard title="New students" description="Signups in the last seven days">
          <div className="h-72 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.new7}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
                <Tooltip />
                <Bar dataKey="v" fill="#252525" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminCard title="Students by level" description="Current level selected in profiles">
          <div className="space-y-4 p-5">
            {data.studentBuckets.map((bucket) => {
              const max = Math.max(1, ...data.studentBuckets.map((item) => item.v));
              return (
                <div key={bucket.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{bucket.name}</span>
                    <span className="text-muted-foreground">{bucket.v}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(bucket.v / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </AdminCard>

        <AdminCard title="Recent orders" actions={<Link to="/admin/orders" className="text-xs font-semibold text-primary hover:underline">All orders</Link>}>
          {data.recentOrders.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{order.student_name ?? order.student_email}</p>
                    <p className="truncate text-xs text-muted-foreground">{order.course_title ?? "German course"} · {relativeDate(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{price(Number(order.amount))}</p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AdminCard title="Recent students" actions={<Link to="/admin/students" className="text-xs font-semibold text-primary hover:underline">All students</Link>}>
          <div className="divide-y divide-border">
            {data.recentStudents.map((student) => (
              <Link key={student.id} to={`/admin/students/${student.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-xs font-bold text-background">{student.full_name.charAt(0).toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{student.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{student.email} · {student.current_level}</p>
                </div>
                <span className="ml-auto text-xs text-muted-foreground">{relativeDate(student.created_at)}</span>
              </Link>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Recent logins">
          <div className="divide-y divide-border">
            {data.recentLogins.length === 0 && <p className="p-5 text-sm text-muted-foreground">No login events yet.</p>}
            {data.recentLogins.map((login) => (
              <div key={login.id} className="flex items-start gap-3 px-5 py-3">
                <LogIn className="mt-0.5 size-4 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{login.email ?? "Unknown"}</p>
                  <p className="truncate text-xs text-muted-foreground">{login.user_agent ?? "Unknown device"}</p>
                </div>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{relativeDate(login.created_at)}</span>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Activity" actions={<Link to="/admin/audit" className="text-xs font-semibold text-primary hover:underline">Audit log</Link>}>
          <div className="divide-y divide-border">
            {data.activity.length === 0 && <p className="p-5 text-sm text-muted-foreground">No activity yet.</p>}
            {data.activity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                <Activity className="mt-0.5 size-4 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">{entry.entity_type} · {relativeDate(entry.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link to="/admin/courses" className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-border hover:ring-primary">
          <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary"><BookOpen className="size-4" /></span>
          <div><p className="text-sm font-semibold">Manage curriculum</p><p className="text-xs text-muted-foreground">Courses, modules, lessons, quizzes</p></div>
        </Link>
        <Link to="/admin/broadcast" className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-border hover:ring-primary">
          <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary"><UserPlus className="size-4" /></span>
          <div><p className="text-sm font-semibold">Send an announcement</p><p className="text-xs text-muted-foreground">Notify all students or one level</p></div>
        </Link>
        <Link to="/admin/pdfs" className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-border hover:ring-primary">
          <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary"><ShoppingBag className="size-4" /></span>
          <div><p className="text-sm font-semibold">PDF library</p><p className="text-xs text-muted-foreground">Upload and publish free resources</p></div>
        </Link>
      </div>
    </>
  );
}
