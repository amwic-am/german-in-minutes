import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Level } from "@shared/data";
import { BookOpen, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { price } from "@/lib/money";
import type { CourseSummary } from "@shared/types";
import { BrandLogo } from "@/components/brand-logo";

export function PrimaryLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={cn("inline-block rounded-md bg-brand py-2.5 pl-3.5 pr-4 text-sm font-semibold text-primary-foreground ring-1 ring-brand/40 transition-transform hover:-translate-y-0.5", className)}>
      {children}
    </Link>
  );
}

export function GhostLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={cn("inline-block rounded-md bg-ice/5 py-2.5 pl-3.5 pr-4 text-sm font-semibold text-ice ring-1 ring-ice/15 transition-transform hover:-translate-y-0.5", className)}>
      {children}
    </Link>
  );
}

export function SectionHeading({ kicker, title, kickerTone = "brand", className }: { kicker: string; title: string; kickerTone?: "brand" | "gold" | "ice"; className?: string }) {
  const tone = kickerTone === "gold" ? "text-gold" : kickerTone === "ice" ? "text-ice/50" : "text-brand";
  return (
    <div className={cn("reveal max-w-[56ch]", className)}>
      <span className={cn("text-xs font-semibold uppercase tracking-[0.18em]", tone)}>{kicker}</span>
      <h2 className="mt-3 font-display text-3xl font-bold text-ice sm:text-4xl">{title}</h2>
    </div>
  );
}

export function DiagonalPanels({ variant = "hero" }: { variant?: "hero" | "cta" }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-brand/5" />
      {variant === "hero" && <div className="panel-diagonal left-[-6%] top-10 h-[80%] w-[22%] bg-gold/10 ring-1 ring-gold/20" />}
    </>
  );
}

export function PageHero({ kicker, title, description, children }: { kicker: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-ink">
      <DiagonalPanels />
      <div className="relative mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-24">
        <div className="reveal max-w-[22ch]">
          <span className="inline-flex items-center gap-2 rounded-full bg-ice/5 px-3 py-1 text-xs font-medium text-ice/70 ring-1 ring-ice/10">{kicker}</span>
        </div>
        <h1 className="reveal-d1 mt-6 max-w-[22ch] font-display text-[clamp(2.2rem,6vw,4rem)] font-extrabold leading-none tracking-tight text-ice">{title}</h1>
        {description && <p className="reveal-d2 mt-6 max-w-[48ch] text-base leading-relaxed text-ice/70 text-pretty sm:text-lg">{description}</p>}
        {children && <div className="reveal-d3 mt-8 flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-ink py-20 sm:py-28">
      <DiagonalPanels variant="cta" />
      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="reveal max-w-[40ch]">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ice/50">Start today</span>
          <h2 className="mt-3 max-w-[24ch] font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-none tracking-tight text-ice">Your German starts with one minute.</h2>
          <p className="mt-5 max-w-[48ch] text-base leading-relaxed text-ice/70 text-pretty">No card required. Pick your level and speak your first sentence tonight.</p>
        </div>
        <div className="reveal-d1 mt-8 flex flex-wrap gap-3">
          <PrimaryLink to="/register">Start Learning Free</PrimaryLink>
          <GhostLink to="/courses">Explore Courses</GhostLink>
        </div>
      </div>
    </section>
  );
}

export function LevelCard({ level, index }: { level: Level; index: number }) {
  return (
    <Link
      to={`/levels/${level.code}`}
      className={cn("reveal rounded-lg p-5 ring-1 transition-transform hover:-translate-y-1", index === 2 ? "bg-brand/10 ring-brand/30" : "bg-ice/5 ring-ice/10")}
      style={{ animationDelay: `${0.08 * index}s` }}
    >
      <div className="font-display text-2xl font-extrabold text-ice">{level.label}</div>
      <div className="mt-1 text-sm text-ice/60">{level.name} · {level.tagline}</div>
    </Link>
  );
}

export function CourseCard({ course, index = 0 }: { course: CourseSummary; index?: number }) {
  return (
    <article className="course-discovery group flex flex-col" style={{ animationDelay: `${0.08 * index}s` }}>
      <div className="discovery-image">
        <img src={course.image} alt={course.title} width={1536} height={768} loading="lazy" />
        <span className="image-level">{course.level}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><BrandLogo className="brand-logo-small" /> German In Minutes</div>
        <h3 className="text-lg font-semibold leading-tight">{course.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="size-3" /> {course.estimated_weeks} weeks <span>·</span> {price(course.price_eur)}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
          <span>{course.lesson_count} lessons</span>
          <ArrowUpRight className="size-4 text-primary transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>
    </article>
  );
}

export function CompactCourse({ course }: { course: CourseSummary }) {
  return (
    <Link to={`/courses/${course.slug}`} className="course-compact group">
      <div className="compact-image">
        <img src={course.image} alt={course.title} width={1536} height={768} loading="lazy" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><BrandLogo className="brand-logo-small" /> German In Minutes</div>
        <h3 className="truncate text-sm font-semibold">{course.title}</h3>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><BookOpen className="size-3" /> {course.estimated_weeks} weeks <span>·</span> {price(course.price_eur)}</div>
      </div>
      <ArrowRight className="size-4 shrink-0 text-primary" />
    </Link>
  );
}
