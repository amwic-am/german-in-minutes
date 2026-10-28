import { useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Award,
  BookOpen,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Learning",
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/admin/courses", label: "Courses", icon: BookOpen },
      { to: "/admin/students", label: "Students", icon: Users },
      { to: "/admin/certificates", label: "Certificates", icon: Award },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/orders", label: "Orders", icon: Receipt },
      { to: "/admin/support", label: "Support", icon: LifeBuoy },
      { to: "/admin/pdfs", label: "PDF library", icon: FileText },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/admin/staff", label: "Staff & roles", icon: ShieldCheck },
      { to: "/admin/settings", label: "Site settings", icon: Settings },
      { to: "/admin/broadcast", label: "Broadcast", icon: Mail },
      { to: "/admin/audit", label: "Audit log", icon: Activity },
    ],
  },
];

function StaffGate({ children }: { children: ReactNode }) {
  const { user, loading, isStaff } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-frost">
        <span className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" aria-label="Loading" />
      </div>
    );
  }
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isStaff) {
    return (
      <div className="grid min-h-screen place-items-center bg-frost px-5">
        <div className="max-w-md rounded-xl bg-card p-8 text-center ring-1 ring-border">
          <ShieldCheck className="mx-auto size-9 text-primary" />
          <h1 className="mt-3 font-display text-xl font-bold">Staff access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account doesn't have an admin role. Ask a super administrator to grant access.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link to="/student" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">My learning</Link>
            <Link to="/" className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Back to site</Link>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function AdminLayout() {
  return (
    <StaffGate>
      <AdminShell />
    </StaffGate>
  );
}

function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await logout();
    toast.success("Signed out");
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-frost lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-[270px] overflow-y-auto bg-charcoal text-white transition-transform lg:static lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/admin" aria-label="Admin home" onClick={() => setOpen(false)}>
            <img src="/images/gim-logo.png" alt="German In Minutes" className="h-9 w-auto brightness-0 invert" />
          </Link>
          <button onClick={() => setOpen(false)} className="rounded p-1 text-white/70 hover:text-white lg:hidden" aria-label="Close menu"><X className="size-5" /></button>
        </div>
        <div className="mx-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">
          <span className="font-semibold text-brand">Admin portal</span>
          <p className="mt-0.5 truncate">{user?.email}</p>
        </div>
        <nav className="mt-5 space-y-5 px-3 pb-8">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">{group.label}</p>
              <div className="mt-2 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white",
                          isActive && "bg-brand/15 text-white ring-1 ring-brand/30",
                        )
                      }
                    >
                      <Icon className={cn("size-4", location.pathname === item.to && "text-brand")} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <Link to="/student" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">
            <Users className="size-4" /> Student view
          </Link>
          <Link to="/" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">
            <BookOpen className="size-4" /> View website
          </Link>
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></Button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">German In Minutes</p>
            <p className="truncate text-sm font-bold">Administration</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary sm:block">{user?.roles[0]?.replace(/_/g, " ")}</span>
            <Link to="/student" className="grid size-8 place-items-center rounded-full bg-foreground text-sm font-bold text-background" aria-label="Student view">
              {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
            </Link>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AdminCard({ title, description, actions, children, className }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl bg-card ring-1 ring-border", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="font-display text-base font-bold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function AdminBadge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "gold" | "success" | "danger" | "dark" }) {
  return <span className={cn(
    "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
    tone === "gold" && "bg-primary/15 text-primary",
    tone === "success" && "bg-emerald-100 text-emerald-800",
    tone === "danger" && "bg-red-100 text-red-700",
    tone === "dark" && "bg-foreground text-background",
    tone === "muted" && "bg-muted text-muted-foreground",
  )}>{children}</span>;
}
