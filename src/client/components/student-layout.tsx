import { useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, ChevronDown, GraduationCap, LayoutDashboard, LifeBuoy, LogOut, Settings, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-frost">
      <span className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" aria-label="Loading" />
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}

const navItems = [
  { to: "/student", label: "My learning", icon: LayoutDashboard, end: true },
  { to: "/courses", label: "Browse courses", icon: BookOpen, end: false },
  { to: "/resources", label: "PDF library", icon: GraduationCap, end: false },
  { to: "/support", label: "Support", icon: LifeBuoy, end: false },
  { to: "/settings", label: "Personal settings", icon: Settings, end: false },
];

export function StudentLayout() {
  const { user, isStaff, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  async function signOut() {
    await logout();
    toast.success("Signed out");
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-frost">
      <header className="student-header sticky top-0 z-40 border-b border-border bg-background">
        <div className="discovery-container">
          <div className="main-header min-h-[72px] gap-4">
            <Link to="/" className="shrink-0" aria-label="German In Minutes home"><BrandLogo /></Link>
            <nav className="hidden items-center gap-1 lg:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                        isActive && "bg-primary/10 text-foreground",
                      )
                    }
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              {isStaff && (
                <Link to="/admin" className="hidden items-center gap-1.5 rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 sm:flex">
                  <ShieldCheck className="size-4" /> Admin
                </Link>
              )}
              <div className="relative">
                <button
                  onClick={() => setUserOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm font-semibold hover:bg-muted"
                  aria-expanded={userOpen}
                >
                  <span className="grid size-8 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
                    {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-32 truncate sm:block">{user?.full_name?.split(" ")[0] ?? "Account"}</span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
                {userOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-xl">
                    <div className="border-b border-border px-3 py-2">
                      <div className="truncate text-sm font-semibold">{user?.full_name}</div>
                      <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
                    </div>
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.to} to={item.to} onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                          <Icon className="size-4" /> {item.label}
                        </Link>
                      );
                    })}
                    {isStaff && (
                      <Link to="/admin" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary hover:bg-muted">
                        <ShieldCheck className="size-4" /> Admin portal
                      </Link>
                    )}
                    <button onClick={signOut} className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm hover:bg-muted">
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMenuOpen((open) => !open)}>
                Menu
              </Button>
            </div>
          </div>
          {menuOpen && (
            <nav className="grid gap-1 border-t border-border py-3 lg:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted">
                    <Icon className="size-4 text-primary" /> {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      <main><Outlet /></main>

      <footer className="mt-16 border-t border-border bg-background">
        <div className="discovery-container flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} German In Minutes</span>
          <div className="flex flex-wrap gap-4">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/faq" className="hover:text-foreground">FAQ</Link>
            <Link to="/legal/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/legal/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
