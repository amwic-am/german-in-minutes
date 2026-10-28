import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, ChevronDown, Download, Globe2, GraduationCap, LayoutGrid, LogOut, Mail, Menu, Search, Settings, ShieldCheck, Tag, User, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useDbCourses } from "@/hooks/use-courses";
import { useSiteContent } from "@/hooks/use-site-content";
import { api, errorMessage } from "@/lib/api";
import { BrandLogo } from "@/components/brand-logo";
import { Button, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";

const exploreLinks = [
  { to: "/categories", label: "Explore categories", description: "Beginner, conversation, business & exams", icon: LayoutGrid },
  { to: "/courses", label: "Courses", description: "German courses from A1 to C1", icon: BookOpen },
  { to: "/resources", label: "Free PDF Download", description: "Downloadable grammar and vocabulary PDFs", icon: Download },
  { to: "/goethe", label: "Exam Preparation", description: "Goethe exam preparation from A1 to C1", icon: GraduationCap },
  { to: "/practice", label: "Speaking Practice", description: "Conversations, role-plays and pronunciation", icon: Globe2 },
  { to: "/about", label: "About", description: "Our mission and learning approach", icon: User },
  { to: "/pricing", label: "Pricing", description: "Free start, simple plans", icon: Tag },
  { to: "/contact", label: "Contact", description: "Contact form and social media links", icon: Mail },
];

const levelLinks = [
  ["a1", "German A1 — Beginner"],
  ["a2", "German A2 — Elementary"],
  ["b1", "German B1 — Intermediate"],
  ["b2", "German B2 — Upper intermediate"],
  ["c1", "German C1 — Advanced"],
] as const;

const categoryLinks = [
  ["beginner", "Beginner German"],
  ["conversation", "Conversation & fluency"],
  ["professional", "Business & professional"],
  ["exam", "Exam preparation"],
] as const;

export function PublicLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const userContainer = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, isStaff, logout } = useAuth();
  const { data: courses = [] } = useDbCourses();

  useEffect(() => {
    setMenuOpen(false);
    setExploreOpen(false);
    setSuggestOpen(false);
    setUserOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setSuggestOpen(false);
      if (event.target instanceof Node && !userContainer.current?.contains(event.target)) setUserOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const results = query.trim()
    ? courses.filter((course) =>
        `${course.title} ${course.level} ${course.description}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : courses;

  function submitSearch(event?: FormEvent) {
    event?.preventDefault();
    setSuggestOpen(false);
    navigate(query.trim() ? `/courses?q=${encodeURIComponent(query.trim())}` : "/courses");
  }

  async function signOut() {
    await logout();
    toast.success("Signed out");
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="audience-bar">
        <div className="discovery-container flex items-center gap-7 overflow-x-auto whitespace-nowrap text-sm">
          <NavLink to="/" end className={({ isActive }) => cn(isActive && "audience-active")}>For Individuals</NavLink>
          <NavLink to="/business" className={({ isActive }) => cn(isActive && "audience-active")}>For Businesses</NavLink>
          <NavLink to="/educators" className={({ isActive }) => cn(isActive && "audience-active")}>For Educators</NavLink>
          <NavLink to="/resources" className={({ isActive }) => cn(isActive && "audience-active")}>Free PDF Download</NavLink>
          <span className="ml-auto hidden items-center gap-1.5 sm:flex"><Globe2 className="size-3.5" /> English</span>
        </div>
      </div>

      <header className="discovery-header">
        <div className="discovery-container main-header">
          <Link to="/" className="shrink-0"><BrandLogo /></Link>
          <div className="hidden items-center gap-2 lg:flex">
            <div className="relative">
              <Button variant="ghost" onClick={() => setExploreOpen((open) => !open)} aria-expanded={exploreOpen}>
                Explore <ChevronDown className={cn("size-4 transition", exploreOpen && "rotate-180")} />
              </Button>
              {exploreOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-[720px] rounded-xl border border-border bg-card p-5 shadow-xl">
                  <div className="grid gap-5 sm:grid-cols-3">
                    <div>
                      <h2 className="mb-3 text-sm font-bold">Learn German</h2>
                      <div className="grid gap-2">{levelLinks.map(([code, label]) => <Link key={code} to={`/levels/${code}`} className="text-sm hover:text-primary hover:underline">{label}</Link>)}</div>
                    </div>
                    <div>
                      <h2 className="mb-3 text-sm font-bold">Categories</h2>
                      <div className="grid gap-2">{categoryLinks.map(([slug, label]) => <Link key={slug} to={`/categories?category=${slug}`} className="text-sm hover:text-primary hover:underline">{label}</Link>)}</div>
                      <h2 className="mb-3 mt-5 text-sm font-bold">Practice</h2>
                      <div className="grid gap-2">
                        <Link to="/practice" className="text-sm hover:text-primary hover:underline">Practice hub</Link>
                        <Link to="/goethe" className="text-sm hover:text-primary hover:underline">Goethe exam</Link>
                        <Link to="/resources" className="text-sm hover:text-primary hover:underline">Free PDF library</Link>
                      </div>
                    </div>
                    <div>
                      <h2 className="mb-3 text-sm font-bold">German In Minutes</h2>
                      <div className="grid gap-2">
                        <Link to="/about" className="text-sm hover:text-primary hover:underline">About</Link>
                        <Link to="/pricing" className="text-sm hover:text-primary hover:underline">Pricing</Link>
                        <Link to="/blog" className="text-sm hover:text-primary hover:underline">Blog</Link>
                        <Link to="/faq" className="text-sm hover:text-primary hover:underline">FAQ</Link>
                        <Link to="/contact" className="text-sm hover:text-primary hover:underline">Contact</Link>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-sm">
                    <span>Not sure where to begin?</span>
                    <Link to="/courses" className="underline">Browse courses</Link>
                    <span>or</span>
                    <Link to="/pricing" className="underline">see plans</Link>
                  </div>
                </div>
              )}
            </div>
            <Button onClick={() => navigate(user ? "/student" : "/courses")}>Start Learning</Button>
          </div>

          <div ref={container} className="search-container">
            <form onSubmit={submitSearch} className="search-form">
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setSuggestOpen(true); }}
                onFocus={() => setSuggestOpen(true)}
                onKeyDown={(event) => { if (event.key === "Escape") setSuggestOpen(false); }}
                placeholder="What do you want to learn?"
                aria-label="Search courses"
                autoComplete="off"
              />
              <Button type="submit" size="icon" className="rounded-full" aria-label="Search"><Search className="size-4" /></Button>
            </form>
            {suggestOpen && (
              <div className="search-suggestions">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{query ? "Recommended courses" : "Explore courses"}</h2>
                  <Button variant="ghost" size="icon" aria-label="Close suggestions" onClick={() => setSuggestOpen(false)}><X className="size-4" /></Button>
                </div>
                {!query && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["A1", "A2", "B1", "B2", "C1", "Goethe"].map((topic) => (
                      <Button key={topic} variant="outline" size="sm" onClick={() => { setQuery(topic); submitSearch(); }}>{topic}</Button>
                    ))}
                  </div>
                )}
                <p className="mb-2 mt-4 text-sm font-semibold">{query ? `${results.length} matching courses` : "Start with these learner favourites"}</p>
                <div className="space-y-1">
                  {results.slice(0, 4).map((course) => (
                    <Link key={course.id} to={`/courses/${course.slug}`} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted" onClick={() => setSuggestOpen(false)}>
                      <img src={course.image} alt="" className="h-10 w-16 rounded object-cover" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{course.title}</div>
                        <div className="text-xs text-muted-foreground">{course.level} · ${course.price_eur}</div>
                      </div>
                    </Link>
                  ))}
                </div>
                {results.length === 0 && <p className="py-4 text-sm text-muted-foreground">No courses found. Try “A1”, “speaking” or “Goethe”.</p>}
                <button type="button" onClick={() => submitSearch()} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">View all results <ArrowRight className="size-4" /></button>
              </div>
            )}
          </div>

          <div className="header-actions">
            {user ? (
              <div ref={userContainer} className="relative flex items-center gap-2">
                <Button variant="outline" onClick={() => navigate("/student")}>My learning</Button>
                <button onClick={() => setUserOpen((open) => !open)} aria-label="Profile menu" className="flex size-9 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                  {(user.full_name || user.email).charAt(0).toUpperCase()}
                </button>
                {userOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-xl">
                    <div className="border-b border-border px-3 py-2">
                      <div className="truncate text-sm font-semibold">{user.full_name}</div>
                      <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    </div>
                    <Link to="/student" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"><GraduationCap className="size-4" /> My learning</Link>
                    <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"><Settings className="size-4" /> Purchases & settings</Link>
                    {isStaff && <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"><ShieldCheck className="size-4" /> Admin portal</Link>}
                    <button onClick={signOut} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"><LogOut className="size-4" /> Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="hidden text-sm font-semibold text-primary sm:block">Log in</Link>
                <Link to="/register" className="inline-flex h-10 items-center rounded-md border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/10">Join for free</Link>
              </>
            )}
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Toggle menu" onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>
        {menuOpen && (
          <nav className="discovery-container grid gap-1 border-t border-border py-3 lg:hidden">
            {exploreLinks.map((item) => {
              const Icon = item.icon;
              return <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-md px-2 py-2.5 text-sm font-medium hover:bg-muted"><Icon className="size-4 text-primary" />{item.label}</Link>;
            })}
            {!user && <Link to="/login" className="px-2 py-2.5 text-sm font-medium">Log in</Link>}
            <Button className="mt-1 rounded-full" onClick={() => navigate(user ? "/student" : "/courses")}>Start Learning</Button>
          </nav>
        )}
      </header>

      <Outlet />
      <SiteFooter />
    </div>
  );
}

const emailSchema = z.string().trim().email("Enter a valid email").max(255);

function Newsletter() {
  const { content } = useSiteContent();
  const newsletter = content.footer.newsletter;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      await api.post("/newsletter", { email: parsed.data.toLowerCase() });
      setDone(true);
      setEmail("");
      toast.success(newsletter.success);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="footer-subscribe">
      <div className="min-w-0">
        <h3 className="text-xl font-bold">{newsletter.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{newsletter.description}</p>
      </div>
      {done ? (
        <p className="flex items-center gap-2 font-semibold text-primary"><CheckCircle2 className="size-5" /> {newsletter.success}</p>
      ) : (
        <form onSubmit={submit} className="flex w-full max-w-md gap-2">
          <label className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@email.com" aria-label="Email address" className={cn(inputClass, "h-11 pl-9")} />
          </label>
          <Button type="submit" disabled={busy} className="h-11 px-5">{busy ? "Subscribing…" : newsletter.button}</Button>
        </form>
      )}
    </div>
  );
}

const socials = [
  ["Facebook", "facebook.png"],
  ["LinkedIn", "linkedin.png"],
  ["Twitter", "twitter.png"],
  ["YouTube", "youtube.png"],
  ["Instagram", "instagram.png"],
  ["TikTok", "tiktok.png"],
] as const;

function safeWebLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function footerHref(link: { to: string; params?: Record<string, string>; search?: Record<string, string> }) {
  let href = link.to;
  for (const [key, value] of Object.entries(link.params ?? {})) href = href.replace(`$${key}`, value);
  if (link.search && Object.keys(link.search).length) {
    const params = new URLSearchParams(link.search);
    href += `?${params.toString()}`;
  }
  return href;
}

function SiteFooter() {
  const { content } = useSiteContent();
  const footer = content.footer;
  return (
    <footer className="mt-16 border-t border-border bg-frost">
      <div className="discovery-container">
        <Link to="/" className="mt-8 inline-block"><BrandLogo /></Link>
        <Newsletter />
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {footer.columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-lg font-bold">{column.title}</h3>
              <ul className="mt-3 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={footerHref(link)} className="text-sm hover:text-primary hover:underline">{link.label}</Link>
                    {link.badge && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{link.badge}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-8 border-t border-border py-8">
          <div className="flex flex-wrap gap-3" aria-label="Social media">
            {socials.map(([name, file]) => {
              const url = footer.socials[name];
              return url && safeWebLink(url) ? (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={name} className="grid size-10 place-items-center rounded-full hover:bg-muted">
                  <img src={`/images/${file}`} alt="" width={29} height={30} />
                </a>
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-4">
            {[["App Store", "app-store.png"], ["Google Play", "google-play.png"]].map(([name, file]) => (
              <div key={name} className="flex flex-col items-center gap-2">
                <img src={`/images/${file}`} alt={name} width={153} height={47} className="h-11 w-auto rounded-md opacity-80" />
                <span className="text-xs font-semibold text-muted-foreground">Coming soon</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            {footer.bottom.lead} <Link to={footer.bottom.first.to} className="underline hover:text-primary">{footer.bottom.first.label}</Link>{" "}
            {footer.bottom.join} <Link to={footer.bottom.second.to} className="underline hover:text-primary">{footer.bottom.second.label}</Link>
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground">
            {footer.legal.map((item) => <Link key={item.doc} to={`/legal/${item.doc}`} className="hover:text-foreground">{item.label}</Link>)}
            <span>© {new Date().getFullYear()} {footer.copyright}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
