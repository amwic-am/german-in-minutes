import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen, Check, Clock, GraduationCap, Users } from "lucide-react";
import { COURSES, GOETHE_LEVELS, LEVELS, TESTIMONIALS } from "@shared/data";
import { categories } from "@shared/discovery";
import type { CourseDetail } from "@shared/types";
import { useDbCourses } from "@/hooks/use-courses";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { price } from "@/lib/money";
import { Button } from "@/components/ui";
import { CompactCourse, CourseCard, FinalCta, GhostLink, LevelCard, PageHero, PrimaryLink } from "@/components/site-blocks";

const INCLUDES = ["Full access to every lesson", "Video & audio lessons", "Quizzes after each module", "Downloadable PDFs", "Certificate of completion"];

export function CoursesPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const [level, setLevel] = useState("All");
  const { data: courses = [], isLoading } = useDbCourses();
  const filtered = useMemo(() => {
    const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return courses.filter((course) => {
      if (level !== "All" && course.level !== level) return false;
      if (!words.length) return true;
      const haystack = `${course.title} ${course.level} ${course.description}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [courses, q, level]);

  return (
    <>
      {!q ? (
        <PageHero kicker="Courses" title="Every level, one structured path." description="Video lessons, downloadable material, quizzes and speaking practice — each course ends with a certificate.">
          <PrimaryLink to="/register">Start free</PrimaryLink>
          <GhostLink to="/pricing">See pricing</GhostLink>
        </PageHero>
      ) : (
        <div className="discovery-container pt-10">
          <h1 className="text-3xl font-bold">Search results for “{q}”</h1>
          <p className="mt-2 text-muted-foreground">{filtered.length} courses found</p>
        </div>
      )}

      <section className="bg-frost py-12 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="mb-8 flex flex-wrap items-center gap-2">
            {["All", ...LEVELS.map((item) => item.label)].map((item) => (
              <Button key={item} size="sm" variant={level === item ? "primary" : "outline"} onClick={() => setLevel(item)} className="rounded-full">{item}</Button>
            ))}
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course, index) => <CourseCard key={course.id} course={course} index={index} />)}
          </div>
          {!isLoading && filtered.length === 0 && <p className="py-10 text-muted-foreground">No matching courses. Try searching for A1, speaking or Goethe.</p>}
        </div>
      </section>

      <FinalCta />
    </>
  );
}

function useCourseDetail(slug: string) {
  return useQuery({
    queryKey: ["course", slug],
    queryFn: async () => (await api.get<{ course: CourseDetail }>(`/courses/${slug}`)).course,
  });
}

export function CourseDetailPage() {
  const { slug = "" } = useParams();
  const { data: course, isLoading, error } = useCourseDetail(slug);
  const { user } = useAuth();
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<{ enrollments: { course_id: string }[] }>("/me/dashboard"),
    enabled: Boolean(user),
  });
  const { data: allCourses = [] } = useDbCourses();

  if (isLoading) return <div className="discovery-container py-24 text-center text-muted-foreground">Loading course…</div>;
  if (!course || error) return <div className="discovery-container py-24 text-center"><h1 className="text-2xl font-bold">Course not found</h1><Link to="/courses" className="mt-4 inline-block text-primary underline">Browse all courses</Link></div>;

  const enrolled = Boolean(dashboard?.enrollments.some((item) => item.course_id === course.id));
  const checkoutHref = user ? `/checkout?course=${course.id}` : `/login?next=${encodeURIComponent(`/checkout?course=${course.id}`)}`;
  const related = allCourses.filter((item) => item.id !== course.id && item.level === course.level).slice(0, 3);
  const levelName = LEVELS.find((item) => item.label === course.level)?.name ?? (course.level === "Goethe" ? "Exam prep" : "");

  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-foreground">{course.level}{levelName ? ` · ${levelName}` : ""}</span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl">{course.title}</h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">{course.description}</p>
            <div className="mt-6 flex flex-wrap gap-6 text-sm">
              <span className="inline-flex items-center gap-2"><BookOpen className="size-4 text-primary" /> {course.lesson_count} lessons</span>
              <span className="inline-flex items-center gap-2"><Clock className="size-4 text-primary" /> {course.estimated_weeks} weeks</span>
              <span className="inline-flex items-center gap-2"><Award className="size-4 text-primary" /> Certificate included</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {enrolled ? (
                <Link to={`/learn/${course.slug}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:brightness-105">Continue learning →</Link>
              ) : (
                <Link to={checkoutHref} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:brightness-105">Enrol — {price(course.price_eur)}</Link>
              )}
              <Link to="/courses" className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-muted">All courses</Link>
            </div>
          </div>
          <img src={course.image} alt={course.title} className="aspect-video w-full rounded-2xl object-cover shadow-lg ring-1 ring-border" />
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 sm:px-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-14">
            <div>
              <h2 className="font-display text-2xl font-bold">Course curriculum</h2>
              <div className="mt-6 space-y-3">
                {course.modules.length === 0 && <p className="text-muted-foreground">Curriculum will be available soon.</p>}
                {course.modules.map((module, index) => (
                  <details key={module.id} className="rounded-xl bg-card p-5 ring-1 ring-border" open={index === 0}>
                    <summary className="flex cursor-pointer list-none items-center gap-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-sm font-extrabold">{index + 1}</span>
                      <span>
                        <span className="block font-semibold">{module.title}</span>
                        <span className="block text-xs text-muted-foreground">{module.lessons?.length ?? 0} lessons · {module.description}</span>
                      </span>
                    </summary>
                    <ul className="mt-4 space-y-2 border-t border-border pt-4">
                      {module.lessons?.map((lesson) => (
                        <li key={lesson.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2"><BookOpen className="size-3.5 text-primary" /> {lesson.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{lesson.duration_minutes} min</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold">Your certificate</h2>
              <p className="mt-2 text-muted-foreground">After completing this course you'll receive this German In Minutes certificate — downloadable as a PDF and shareable on LinkedIn.</p>
              <div className="mt-6 rounded-xl bg-card p-3 shadow-lg ring-1 ring-border">
                <div className="relative rounded-lg border-4 border-double border-primary px-6 py-10 text-center">
                  <span className="absolute right-4 top-4 rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sample</span>
                  <img src="/images/gim-logo.png" alt="German In Minutes" className="mx-auto h-12 w-auto" />
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Certificate of completion</p>
                  <p className="mt-4 text-sm text-muted-foreground">This certifies that</p>
                  <p className="mt-2 font-display text-3xl font-extrabold italic">Your Name</p>
                  <p className="mt-3 text-sm text-muted-foreground">has successfully completed</p>
                  <p className="mt-1 font-display text-xl font-bold">{course.title} · {course.level}</p>
                  <div className="mx-auto mt-8 grid max-w-md grid-cols-3 items-end gap-4 text-xs text-muted-foreground">
                    <div className="border-t border-border pt-2">Date</div>
                    <Award className="mx-auto size-12 text-primary" />
                    <div className="border-t border-border pt-2">German In Minutes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-2xl bg-card p-6 shadow-md ring-1 ring-border lg:sticky lg:top-24">
            <div className="font-display text-4xl font-extrabold">{price(course.price_eur)}</div>
            <ul className="mt-6 space-y-2.5 text-sm">
              {INCLUDES.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{feature}</li>)}
            </ul>
            <Link to={enrolled ? `/learn/${course.slug}` : checkoutHref} className="mt-6 block rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground hover:brightness-105">
              {enrolled ? "Continue learning" : "Start this course"}
            </Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">Test checkout · no real payment is taken</p>
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-border bg-card py-16">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="flex items-end justify-between"><h2 className="font-display text-2xl font-bold">Recommended next</h2><Link to="/courses" className="text-sm font-semibold underline">See all</Link></div>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {related.map((item) => (
                <Link key={item.id} to={`/courses/${item.slug}`} className="group overflow-hidden rounded-xl bg-background ring-1 ring-border transition hover:-translate-y-1 hover:shadow-lg">
                  <img src={item.image} alt={item.title} loading="lazy" className="aspect-video w-full object-cover" />
                  <div className="p-5">
                    <div className="text-xs font-semibold text-muted-foreground">{item.level}</div>
                    <div className="mt-1 font-display text-lg font-bold group-hover:underline">{item.title}</div>
                    <div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">{item.estimated_weeks} weeks</span><span className="font-semibold">{price(item.price_eur)}</span></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <FinalCta />
    </>
  );
}

export function LevelsPage() {
  return (
    <>
      <PageHero kicker="Levels" title="Know exactly where you stand." description="Each CEFR level has a clear goal, a fixed vocabulary range and a realistic timeline. Pick yours and start.">
        <PrimaryLink to="/register">Take the placement quiz</PrimaryLink>
      </PageHero>
      <section className="bg-frost py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-4 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-5">
          {LEVELS.map((level, index) => <LevelCard key={level.code} level={level} index={index} />)}
        </div>
      </section>
      <FinalCta />
    </>
  );
}

export function LevelDetailPage() {
  const { code = "" } = useParams();
  const level = LEVELS.find((item) => item.code === code.toLowerCase());
  const { data: courses = [] } = useDbCourses();
  if (!level) return <div className="discovery-container py-24 text-center"><h1 className="text-2xl font-bold">Level not found</h1><Link to="/levels" className="mt-4 inline-block text-primary underline">All levels</Link></div>;
  const levelCourses = courses.filter((course) => course.level.toLowerCase() === level.label.toLowerCase());

  return (
    <>
      <PageHero kicker={`Level ${level.label}`} title={`${level.name} German`} description={`${level.tagline} — ${level.lessons} lessons across roughly ${level.weeks} weeks.`}>
        <PrimaryLink to="/register">Start at {level.label}</PrimaryLink>
        <GhostLink to="/levels">All levels</GhostLink>
      </PageHero>

      <section className="bg-frost py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <h2 className="font-display text-2xl font-bold text-ice">What you'll master</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {level.focus.map((item) => <li key={item} className="rounded-lg bg-ice/5 p-4 text-sm text-ice/75 ring-1 ring-ice/10">{item}</li>)}
          </ul>
        </div>
      </section>

      <section className="bg-frost py-12 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <h2 className="font-display text-2xl font-bold text-ice">Courses at {level.label}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {levelCourses.map((course, index) => <CourseCard key={course.id} course={course} index={index} />)}
            {levelCourses.length === 0 && <p className="text-muted-foreground">Courses for this level are being prepared. Browse all courses meanwhile.</p>}
          </div>
        </div>
      </section>

      <section className="bg-ink py-14">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <Link to={`/goethe/${level.code}`} className="text-sm font-semibold text-gold hover:underline">Preparing for the Goethe {level.label} exam? See the exam guide →</Link>
        </div>
      </section>
      <FinalCta />
    </>
  );
}

export function GoethePage() {
  return (
    <>
      <PageHero kicker="Exam preparation" title="Pass the Goethe exam with a plan." description="Understand the format, practice every section under timed conditions, and walk in knowing what the examiner expects.">
        <PrimaryLink to="/courses">See exam prep courses</PrimaryLink>
        <GhostLink to="/levels">Find your level</GhostLink>
      </PageHero>
      <section className="bg-frost py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-4 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-5">
          {GOETHE_LEVELS.map((level) => (
            <Link key={level.code} to={`/goethe/${level.code}`} className="reveal rounded-lg bg-card p-5 ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md">
              <div className="font-display text-2xl font-extrabold">{level.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{level.title.replace(`Goethe ${level.label} — `, "")}</div>
              <div className="mt-4 text-xs font-semibold text-primary">{level.sections.length} exam sections →</div>
            </Link>
          ))}
        </div>
      </section>
      <section className="bg-frost py-12">
        <div className="discovery-container grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="font-display text-2xl font-bold">Why our exam prep works</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {["Every section is practised in the official format and timing.", "Model answers show exactly what earns marks.", "Speaking practice covers presentation, discussion and planning tasks.", "Mock exams with feedback before exam day."].map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>)}
            </ul>
          </div>
          <div className="rounded-xl bg-card p-5 ring-1 ring-border">
            <div className="flex items-center gap-2 font-semibold"><Users className="size-5 text-primary" /> Learner result</div>
            <blockquote className="mt-3 text-sm italic text-muted-foreground">“{TESTIMONIALS[0]?.quote}”</blockquote>
            <div className="mt-3 text-xs font-semibold">{TESTIMONIALS[0]?.name} · {TESTIMONIALS[0]?.meta}</div>
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}

export function GoetheLevelPage() {
  const { level: code = "" } = useParams();
  const level = GOETHE_LEVELS.find((item) => item.code === code.toLowerCase());
  const { data: courses = [] } = useDbCourses();
  if (!level) return <div className="discovery-container py-24 text-center"><h1 className="text-2xl font-bold">Exam level not found</h1><Link to="/goethe" className="mt-4 inline-block text-primary underline">All Goethe levels</Link></div>;
  const prepCourses = courses.filter((course) => course.level === level.label || /goethe/i.test(course.title));

  return (
    <>
      <PageHero kicker={`Goethe ${level.label}`} title={level.title} description={level.overview}>
        <PrimaryLink to="/courses">Exam prep courses</PrimaryLink>
        <GhostLink to="/goethe">All exam levels</GhostLink>
      </PageHero>
      <section className="bg-frost py-20">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
          <h2 className="font-display text-2xl font-bold">Exam sections</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {level.sections.map((section) => (
              <div key={section.name} className="rounded-lg bg-card p-5 ring-1 ring-black/5">
                <div className="flex items-baseline justify-between"><h3 className="font-semibold">{section.name} · {section.german}</h3><span className="text-xs text-muted-foreground">{section.minutes} min</span></div>
                <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
              </div>
            ))}
          </div>
          <h2 className="mt-12 font-display text-2xl font-bold">Strategy checklist</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {level.strategy.map((item) => <li key={item} className="flex gap-2 rounded-lg bg-ice/5 p-4 text-sm ring-1 ring-ice/10"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>)}
          </ul>
        </div>
      </section>
      <section className="bg-frost py-12">
        <div className="discovery-container">
          <h2 className="font-display text-2xl font-bold">Recommended preparation</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prepCourses.slice(0, 3).map((course) => <CompactCourse key={course.id} course={course} />)}
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}

export function CategoriesPage() {
  const [params] = useSearchParams();
  const active = params.get("category") ?? "";
  const { data: courses = [] } = useDbCourses();
  const selected = categories.find((category) => category.slug === active);
  const map = new Map(courses.map((course) => [course.slug, course]));
  const selectedCourses = selected ? selected.courses.flatMap((slug) => (map.get(slug) ? [map.get(slug)!] : [])) : [];

  return (
    <>
      <PageHero kicker="Categories" title="Find the German you actually need." description="Start with beginners' essentials, build conversation confidence, prepare for work, or train for a Goethe exam." />
      <section className="bg-frost py-14">
        <div className="discovery-container">
          <div className="mb-8 flex flex-wrap gap-2">
            <Link to="/categories" className={active ? "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted" : "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"}>All categories</Link>
            {categories.map((category) => (
              <Link key={category.slug} to={`/categories?category=${category.slug}`} className={active === category.slug ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" : "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"}>{category.name}</Link>
            ))}
          </div>
          {!selected && (
            <div className="grid gap-4 sm:grid-cols-2">
              {categories.map((category) => (
                <Link key={category.slug} to={`/categories?category=${category.slug}`} className="rounded-xl bg-card p-6 ring-1 ring-border transition hover:-translate-y-1 hover:shadow-md">
                  <h2 className="font-display text-xl font-bold">{category.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
                  <div className="mt-4 text-sm font-semibold text-primary">Explore category →</div>
                </Link>
              ))}
            </div>
          )}
          {selected && (
            <>
              <h2 className="font-display text-2xl font-bold">{selected.name}</h2>
              <p className="mt-2 text-muted-foreground">{selected.description}</p>
              <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {selectedCourses.map((course, index) => <CourseCard key={course.id} course={course} index={index} />)}
                {selectedCourses.length === 0 && <p className="text-muted-foreground">Courses in this category are being prepared.</p>}
              </div>
            </>
          )}
        </div>
      </section>
      <FinalCta />
    </>
  );
}
