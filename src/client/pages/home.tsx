import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Globe2, GraduationCap, LayoutGrid, List, MessagesSquare, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { FAQS } from "@shared/data";
import { categories } from "@shared/discovery";
import type { CourseSummary } from "@shared/types";
import { useSiteContent } from "@/hooks/use-site-content";
import { useDbCourses } from "@/hooks/use-courses";
import { price } from "@/lib/money";
import { api, errorMessage } from "@/lib/api";
import { BrandLogo } from "@/components/brand-logo";
import { Button, inputClass } from "@/components/ui";
import { CompactCourse, CourseCard } from "@/components/site-blocks";

function CategoryTiles() {
  const icons = [BookOpen, MessagesSquare, BriefcaseBusiness, GraduationCap];
  return (
    <div className="category-grid">
      {categories.map((category, index) => {
        const Icon = icons[index] ?? BookOpen;
        return (
          <Link key={category.slug} to={`/categories?category=${category.slug}`} className={`category-tile category-tone-${index}`}>
            <Icon className="size-7" />
            <h3 className="mt-5 text-lg font-semibold">{category.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
            <ArrowRight className="mt-5 size-5 text-primary" />
          </Link>
        );
      })}
    </div>
  );
}

function bySlugs(courses: CourseSummary[], slugs: string[]) {
  const map = new Map(courses.map((course) => [course.slug, course]));
  return slugs.flatMap((slug) => {
    const course = map.get(slug);
    return course ? [course] : [];
  });
}

function HomeNewsletter() {
  const { content } = useSiteContent();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post("/newsletter", { email });
      setDone(true);
      toast.success(content.footer.newsletter.success);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="discovery-container discovery-section">
      <div className="rounded-2xl bg-charcoal px-6 py-10 text-white sm:px-10">
        <div className="grid items-center gap-6 md:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="text-2xl font-bold">{content.footer.newsletter.title}</h2>
            <p className="mt-2 text-sm text-white/70">{content.footer.newsletter.description}</p>
          </div>
          {done ? (
            <p className="flex items-center gap-2 font-semibold text-gold"><CheckCircle2 className="size-5" /> {content.footer.newsletter.success}</p>
          ) : (
            <form onSubmit={submit} className="flex gap-2">
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@email.com" aria-label="Email address" className={`${inputClass} h-11 border-white/20 bg-white/10 text-white placeholder:text-white/50`} />
              <Button type="submit" variant="gold" className="h-11" disabled={busy}>{busy ? "…" : content.footer.newsletter.button}</Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const { content } = useSiteContent();
  const { data: courses = [], isLoading } = useDbCourses();
  const home = content.home;
  const promotions = home.banners;
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (paused || promotions.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % promotions.length), 8000);
    return () => window.clearInterval(timer);
  }, [paused, promotions.length]);

  const current = promotions[slide] ?? promotions[0];
  const popularGroups = useMemo(
    () =>
      home.popular.groups
        .map((group, index) => {
          const chosen = bySlugs(courses, group.courses);
          const perGroup = Math.max(2, Math.ceil(courses.length / home.popular.groups.length));
          return { title: group.title, courses: chosen.length ? chosen : courses.slice(index * perGroup, index * perGroup + perGroup) };
        })
        .filter((group) => group.courses.length > 0),
    [courses, home.popular.groups],
  );
  const pathCourses = bySlugs(courses, home.path.courses).slice(0, 4);
  const findPools = [
    bySlugs(courses, home.find.tabs[0]?.courses ?? []),
    bySlugs(courses, home.find.tabs[1]?.courses ?? []),
    bySlugs(courses, home.find.tabs[2]?.courses ?? []),
  ];
  const findCourses = (findPools[tab]?.length ? findPools[tab] : courses).slice(0, 4);

  if (!current) return null;

  return (
    <div className="discovery-home">
      <section className="discovery-container pt-6" aria-label="Featured learning opportunities">
        <div className="promo-layout">
          <div
            className="main-promotion"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <img key={current.image} src={current.image} alt="Students learning German online" width={1536} height={768} className="promo-photo" />
            <div className="promo-copy" key={slide}>
              <span className="text-xs font-semibold text-primary">{current.kicker}</span>
              <h1>{current.title}</h1>
              <h2>{current.copy}</h2>
              <p>{current.body}</p>
              <Link to={current.to} className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-105">
                {current.action} <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <aside className="secondary-promotion">
            <span className="flex items-center gap-2 text-sm font-semibold"><Globe2 className="size-5" /> {home.secondary.kicker}</span>
            <h2>{home.secondary.title}</h2>
            <p>{home.secondary.body}</p>
            <Link to={home.secondary.to} className="mt-5 inline-flex items-center gap-2 font-semibold text-primary">{home.secondary.action} <ArrowRight className="size-4" /></Link>
            <div className="mt-auto flex items-end gap-3 pt-6">
              <span className="level-block">A1</span>
              <span className="level-block">B1</span>
              <span className="level-block">C1 <ArrowUpRight className="size-5" /></span>
            </div>
          </aside>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {promotions.map((promotion, index) => (
              <Button key={promotion.title} variant="ghost" aria-label={`Show banner ${index + 1}`} aria-pressed={slide === index} className={`slide-dot ${slide === index ? "slide-dot-active" : ""}`} onClick={() => setSlide(index)} />
            ))}
            <Button variant="ghost" size="icon" aria-label={paused ? "Play slideshow" : "Pause slideshow"} onClick={() => setPaused(!paused)}>{paused ? <Play className="size-4" /> : <Pause className="size-4" />}</Button>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" aria-label="Previous banner" onClick={() => setSlide((slide + promotions.length - 1) % promotions.length)}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="icon" aria-label="Next banner" onClick={() => setSlide((slide + 1) % promotions.length)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </section>

      {popularGroups.length > 0 && (
        <section className="discovery-container discovery-section popular-section" aria-label={home.popular.title}>
          <div className="section-title-row">
            <h2 className="min-w-0">{home.popular.title}</h2>
            <div className="view-switch shrink-0">
              <Button variant={view === "grid" ? "dark" : "ghost"} size="icon" title="Grid view" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}><LayoutGrid className="size-4" /></Button>
              <Button variant={view === "list" ? "dark" : "ghost"} size="icon" title="List view" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List className="size-4" /></Button>
            </div>
          </div>
          <div className={`popular-groups ${view === "list" ? "popular-list" : ""}`}>
            {popularGroups.map((group) => (
              <div className="popular-group" key={group.title}>
                <Link to="/courses" className="mb-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-base font-semibold">
                  <span className="min-w-0 break-words">{group.title}</span> <ArrowRight className="size-4 shrink-0" />
                </Link>
                <div className="space-y-2">
                  {group.courses.map((course) => <CompactCourse key={course.id} course={course} />)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="discovery-container discovery-section" aria-label="Free PDF downloads">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-primary/5 p-6 shadow-sm sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">100% Free</span>
              <h2 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">Get your free German PDF guides</h2>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">Grammar cheat sheets, vocabulary lists and practice worksheets — download them free and start learning German today.</p>
              <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                {["Grammar cheat sheets", "Essential vocabulary lists", "A1–C1 practice worksheets", "Print or study on any device"].map((item) => (
                  <li key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />{item}</li>
                ))}
              </ul>
              <Link to="/resources" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground hover:brightness-105">Get free PDF <ArrowRight className="size-4" /></Link>
            </div>
            <div className="relative mx-auto hidden h-56 w-48 md:block">
              <div className="absolute inset-0 translate-x-6 rotate-6 rounded-xl border bg-card shadow-md" />
              <div className="absolute inset-0 translate-x-3 rotate-3 rounded-xl border bg-card shadow-md" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-primary bg-card p-4 text-center shadow-lg">
                <BookOpen className="size-12 text-primary" />
                <span className="text-sm font-bold">German Starter Pack</span>
                <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">PDF · FREE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="standards-section">
        <div className="discovery-container">
          <h2 className="text-center text-lg font-semibold">An international approach to language learning</h2>
          <div className="standards-row">
            <span><Globe2 /> CEFR levels A1–C1</span>
            <span><GraduationCap /> Goethe exam preparation</span>
            <span><MessagesSquare /> Real-world conversations</span>
            <span><CheckCircle2 /> Structured learning</span>
          </div>
        </div>
      </section>

      {pathCourses.length > 0 && (
        <section className="series-section">
          <div className="discovery-container">
            <div className="section-title-row">
              <div>
                <span className="text-xs font-semibold uppercase text-series-accent">{home.path.kicker}</span>
                <h2 className="mt-2">{home.path.title} <ArrowRight className="inline size-5" /></h2>
                <p className="mt-2 text-sm text-series-foreground/75">{home.path.body}</p>
              </div>
              <Link to={home.path.to} className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold hover:bg-muted">{home.path.action}</Link>
            </div>
            <div className="series-grid">{pathCourses.map((course) => <CourseCard key={course.id} course={course} />)}</div>
          </div>
        </section>
      )}

      {findCourses.length > 0 && (
        <section className="discovery-container discovery-section">
          <div className="section-title-row">
            <h2>{home.find.title}</h2>
            <Link to={home.find.to} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">{home.find.action} <ArrowRight className="size-4" /></Link>
          </div>
          <div className="course-tabs" role="tablist" aria-label="Course selection">
            {home.find.tabs.map((item, index) => (
              <Button key={item.label} variant="ghost" role="tab" aria-selected={tab === index} className={tab === index ? "course-tab-active" : ""} onClick={() => setTab(index)}>{item.label}</Button>
            ))}
          </div>
          <div className="series-grid">{findCourses.map((course) => <CourseCard key={course.id} course={course} />)}</div>
        </section>
      )}

      <section className="discovery-container discovery-section">
        <div className="section-title-row">
          <h2>Explore categories</h2>
          <Link to="/categories" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">Explore all <ArrowRight className="size-4" /></Link>
        </div>
        <CategoryTiles />
      </section>

      {isLoading && <div className="discovery-container pb-8 text-sm text-muted-foreground">Loading courses…</div>}

      <HomeNewsletter />

      <section className="discovery-container discovery-section pb-16">
        <h2 className="mb-5 text-2xl font-semibold">Frequently asked questions</h2>
        {FAQS.slice(0, 5).map((faq) => (
          <details key={faq.q} className="discovery-faq">
            <summary>{faq.q}</summary>
            <p>{faq.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
