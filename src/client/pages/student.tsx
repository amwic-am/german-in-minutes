import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Award, Bell, BookOpen, CheckCheck, Flame, Play, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { DashboardData } from "@shared/types";
import { Badge, Button, Empty, Progress, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { usePageMeta } from "@/hooks/use-page-meta";
import { api, errorMessage } from "@/lib/api";
import { price } from "@/lib/money";
import { cn } from "@/lib/utils";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function StudentDashboardPage() {
  usePageMeta("My learning | German In Minutes", "Your German courses, progress and certificates.");
  const { user, isStaff } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/me/dashboard"),
  });

  if (isLoading) return <div className="discovery-container"><Spinner label="Loading your learning…" /></div>;
  if (error || !data) {
    return (
      <div className="discovery-container py-20">
        <Empty title="We couldn't load your dashboard">{errorMessage(error)}</Empty>
      </div>
    );
  }

  const active = data.enrollments.filter((item) => item.progress_percent < 100);
  const completed = data.enrollments.filter((item) => item.progress_percent >= 100);
  const continueCourse = active.slice().sort((a, b) => b.progress_percent - a.progress_percent)[0] ?? data.enrollments[0];
  const unread = data.notifications.filter((item) => !item.read_at).length;

  async function markAllRead() {
    try {
      await api.post("/notifications/read-all");
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Notifications marked as read");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="discovery-container py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">My learning</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {greeting()}, {user?.full_name?.split(" ")[0] ?? "learner"}.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Level {data.profile.current_level} · {data.profile.daily_goal_minutes} min daily goal
            {data.profile.streak_days > 0 && <> · {data.profile.streak_days}-day streak</>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/courses" className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-semibold hover:bg-muted">
            Browse courses
          </Link>
          {isStaff && (
            <Link to="/admin" className="inline-flex h-10 items-center rounded-md bg-charcoal px-4 text-sm font-semibold text-white">
              Admin portal
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Courses" value={String(data.stats.courses)} hint={`${completed.length} completed`} />
        <StatCard icon={TrendingUp} label="Average progress" value={`${data.stats.avgProgress}%`} hint="Across active courses" />
        <StatCard icon={Award} label="Certificates" value={String(data.stats.certificates)} hint="Download any time" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {continueCourse ? (
            <section className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
              <div className="relative h-40 sm:h-48">
                <img src={continueCourse.course.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/60 to-transparent" />
                <div className="relative flex h-full flex-col justify-between p-5">
                  <Badge tone="gold">{continueCourse.course.level}</Badge>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                      {continueCourse.progress_percent > 0 ? "Continue learning" : "Start learning"}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-white">{continueCourse.course.title}</h2>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{continueCourse.progress_percent}% complete</span>
                  <span className="text-muted-foreground">{continueCourse.course.lesson_count} lessons · {continueCourse.course.estimated_weeks} weeks</span>
                </div>
                <Progress value={continueCourse.progress_percent} className="mt-2" />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Test checkout courses include a completion certificate.</span>
                  <Link
                    to={`/learn/${continueCourse.course.slug}`}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    <Play className="size-4" /> {continueCourse.progress_percent > 0 ? "Resume course" : "Open course"}
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <Empty title="You haven't started a course yet">
              <Link to="/courses" className="font-semibold text-primary underline">Find your first course</Link>
            </Empty>
          )}

          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Your courses</h2>
              <Link to="/courses" className="text-sm font-semibold text-primary hover:underline">Find more</Link>
            </div>
            {data.enrollments.length === 0 ? (
              <div className="mt-4">
                <Empty title="No enrolments yet">Pick a level and start with the free A1 lessons.</Empty>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {data.enrollments.map((item) => (
                  <Link
                    key={item.course_id}
                    to={`/learn/${item.course.slug}`}
                    className="group flex flex-col rounded-xl bg-card p-4 ring-1 ring-border transition hover:ring-primary"
                  >
                    <div className="flex items-center gap-3">
                      <img src={item.course.image} alt="" className="h-14 w-20 shrink-0 rounded-md object-cover" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-primary">{item.course.level}</div>
                        <h3 className="truncate text-sm font-semibold">{item.course.title}</h3>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{item.progress_percent}% complete</span>
                      <span>{item.progress_percent >= 100 ? "Completed" : "In progress"}</span>
                    </div>
                    <Progress value={item.progress_percent} className="mt-2" />
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                      Open course <ArrowRight className="size-4" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {data.recommended.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-bold">Recommended next</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {data.recommended.map((course) => (
                  <Link key={course.id} to={`/courses/${course.slug}`} className="rounded-xl bg-card p-4 ring-1 ring-border transition hover:ring-primary">
                    <img src={course.image} alt="" className="aspect-[1.75] w-full rounded-md object-cover" />
                    <div className="mt-3 text-xs font-semibold text-primary">{course.level}</div>
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold">{course.title}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">{course.lesson_count} lessons · {price(course.price_eur)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl bg-card p-5 ring-1 ring-border">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <Bell className="size-4 text-primary" /> Notifications
                {unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{unread}</span>}
              </h2>
              {unread > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead}><CheckCheck className="size-4" /> Mark read</Button>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {data.notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
              {data.notifications.map((item) => (
                <div key={item.id} className={cn("rounded-lg border p-3", item.read_at ? "border-border" : "border-primary/40 bg-primary/5")}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{item.title}</p>
                    {!item.read_at && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.message}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-card p-5 ring-1 ring-border">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Award className="size-4 text-primary" /> Certificates</h2>
              <Link to="/settings" className="text-xs font-semibold text-primary hover:underline">View all</Link>
            </div>
            {data.certificates.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Finish a course to earn your first certificate.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {data.certificates.slice(0, 3).map((certificate) => (
                  <Link key={certificate.id} to={`/certificate/${certificate.id}`} className="block rounded-lg border border-border p-3 hover:border-primary">
                    <p className="text-sm font-semibold">{certificate.course_title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{certificate.certificate_number}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-primary/10 p-5 ring-1 ring-primary/25">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Target className="size-4 text-primary" /> Today's goal</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.profile.daily_goal_minutes} minutes of focused practice. A single lesson usually takes 8–12 minutes.
            </p>
            {continueCourse && (
              <Link to={`/learn/${continueCourse.course.slug}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <Flame className="size-4" /> Continue now
              </Link>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-border">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="size-4 text-primary" /> {label}
      </div>
      <div className="mt-3 font-display text-3xl font-extrabold">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
