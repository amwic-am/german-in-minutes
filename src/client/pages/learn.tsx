import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, FileQuestion, PlayCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { CourseDetail, Enrollment, Lesson } from "@shared/types";
import { Badge, Button, Empty, Progress, Spinner } from "@/components/ui";
import { usePageMeta } from "@/hooks/use-page-meta";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

type LearnResponse = {
  course: CourseDetail;
  enrollment: Enrollment | null;
  progress: Record<string, { completed: boolean; completed_at: string | null }>;
  quizzes: Record<string, string>;
  certificate: { id: string; certificate_number: string; issued_at: string } | null;
  completedCount: number;
  totalLessons: number;
  nextLessonId: string | null;
};

type QuizQuestion = { id: string; prompt: string; points: number; options: { id: string; label: string }[] };
type QuizResponse = {
  quiz: { id: string; title: string; passing_score: number; time_limit_minutes: number | null; attempts_allowed: number; questions: QuizQuestion[] };
  attemptsUsed: number;
  attempts: { score: number; passed: boolean; submitted_at: string }[];
  bestScore: number;
  passed: boolean;
};
type QuizResult = {
  score: number;
  passed: boolean;
  passingScore: number;
  results: { questionId: string; prompt: string; selectedOptionId: string | null; correctOptionId: string | null; correct: boolean; points: number }[];
  certificate: { id: string; certificate_number: string } | null;
};

export function LearnPage() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["learn", slug],
    queryFn: () => api.get<LearnResponse>(`/learn/${slug}`),
    enabled: Boolean(slug),
  });
  usePageMeta(data ? `${data.course.title} | My learning` : "Learning | German In Minutes");

  const [selected, setSelected] = useState(params.get("lesson") ?? "");
  const lessons = useMemo(
    () => (data ? data.course.modules.flatMap((module) => (module.lessons ?? []).map((lesson) => ({ ...lesson, moduleTitle: module.title }))) : []),
    [data],
  );

  useEffect(() => {
    if (!data) return;
    const exists = lessons.some((lesson) => lesson.id === selected);
    if (!exists) {
      const fallback = data.nextLessonId ?? lessons[0]?.id ?? "";
      setSelected(fallback);
      if (fallback) setParams({ lesson: fallback }, { replace: true });
    }
  }, [data, lessons, selected, setParams]);

  if (isLoading) return <div className="discovery-container"><Spinner label="Opening your course…" /></div>;
  if (error || !data) {
    return (
      <div className="discovery-container py-16">
        <Empty title="This course isn't available to your account">{errorMessage(error)}</Empty>
        <div className="mt-4 text-center"><Link to="/courses" className="text-sm font-semibold text-primary underline">Browse courses</Link></div>
      </div>
    );
  }

  const current = lessons.find((lesson) => lesson.id === selected) ?? lessons[0];
  const currentIndex = current ? lessons.findIndex((lesson) => lesson.id === current.id) : -1;
  const completed = current ? Boolean(data.progress[current.id]?.completed) : false;
  const quizId = current ? data.quizzes[current.id] : undefined;
  const percent = data.totalLessons ? Math.round((data.completedCount / data.totalLessons) * 100) : 0;

  function choose(lessonId: string) {
    setSelected(lessonId);
    setParams({ lesson: lessonId }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function markComplete() {
    if (!current) return;
    try {
      const result = await api.post<{ certificate: { id: string; certificate_number: string } | null }>(`/lessons/${current.id}/complete`);
      await queryClient.invalidateQueries({ queryKey: ["learn", slug] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(result.certificate ? "Course complete — your certificate is ready!" : "Lesson completed");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function quizPassed() {
    await queryClient.invalidateQueries({ queryKey: ["learn", slug] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <div className="discovery-container py-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/student" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> My learning
        </Link>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Course progress</span>
          <div className="w-40"><Progress value={percent} /></div>
          <span className="font-semibold text-foreground">{percent}%</span>
        </div>
      </div>

      {data.certificate && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/12 p-4 ring-1 ring-primary/30">
          <div className="flex items-center gap-3">
            <Award className="size-6 text-primary" />
            <div>
              <p className="font-semibold">You completed this course.</p>
              <p className="text-xs text-muted-foreground">Certificate {data.certificate.certificate_number}</p>
            </div>
          </div>
          <Link to={`/certificate/${data.certificate.id}`} className="rounded-md bg-charcoal px-4 py-2 text-sm font-semibold text-white">View certificate</Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl bg-card p-4 ring-1 ring-border">
            <div className="flex items-center gap-3">
              <img src={data.course.image} alt="" className="h-14 w-20 rounded object-cover" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-primary">{data.course.level}</div>
                <h1 className="truncate text-sm font-bold">{data.course.title}</h1>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{data.completedCount} of {data.totalLessons} lessons completed</p>
            <Progress value={percent} className="mt-2" />
          </div>

          <div className="mt-4 max-h-[calc(100vh-260px)] space-y-4 overflow-y-auto pr-1">
            {data.course.modules.map((module) => (
              <div key={module.id}>
                <h2 className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{module.title}</h2>
                <div className="mt-2 space-y-1">
                  {(module.lessons ?? []).map((lesson) => {
                    const done = Boolean(data.progress[lesson.id]?.completed);
                    const active = lesson.id === current?.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => choose(lesson.id)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition",
                          active ? "bg-primary/12 font-semibold text-foreground ring-1 ring-primary/30" : "hover:bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px]",
                            done ? "border-emerald-600 bg-emerald-600 text-white" : active ? "border-primary text-primary" : "border-border text-muted-foreground",
                          )}
                        >
                          {done ? <Check className="size-3" /> : lesson.position}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block leading-snug">{lesson.title}</span>
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            {lesson.kind === "quiz" ? <FileQuestion className="size-3" /> : <PlayCircle className="size-3" />}
                            {lesson.kind === "quiz" ? "Final quiz" : `${lesson.duration_minutes} min`}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {current && (
          <article className="min-w-0">
            <div className="rounded-xl bg-card ring-1 ring-border">
              <div className="border-b border-border p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="gold">{current.moduleTitle}</Badge>
                  <Badge>{current.kind === "quiz" ? "Final assessment" : `${current.duration_minutes} min`}</Badge>
                  {completed && <Badge tone="success"><CheckCircle2 className="size-3" /> Completed</Badge>}
                </div>
                <h2 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">{current.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{current.summary}</p>
              </div>

              <div className="space-y-6 p-5 sm:p-7">
                {current.media_url ? (
                  <div className="overflow-hidden rounded-lg bg-charcoal">
                    <iframe src={current.media_url} title={current.title} className="aspect-video w-full" allowFullScreen />
                  </div>
                ) : (
                  <div className="relative flex aspect-[2.2] items-center justify-center overflow-hidden rounded-lg bg-charcoal">
                    <img src={data.course.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
                    <div className="relative grid place-items-center gap-2 text-white">
                      <span className="grid size-14 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur">
                        <PlayCircle className="size-7 text-brand" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Lesson audio & notes</span>
                    </div>
                  </div>
                )}

                {current.body.text && (
                  <div className="space-y-4 text-[15px] leading-7 text-foreground/85">
                    {String(current.body.text).split(/\n\n+/).map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                )}

                {current.body.exercise && (
                  <ExerciseBlock exercise={current.body.exercise} />
                )}

                {quizId && <QuizBlock lessonId={current.id} onPassed={quizPassed} />}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={currentIndex <= 0} onClick={() => choose(lessons[currentIndex - 1]!.id)}>
                      <ChevronLeft className="size-4" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={currentIndex >= lessons.length - 1} onClick={() => choose(lessons[currentIndex + 1]!.id)}>
                      Next <ChevronRight className="size-4" />
                    </Button>
                  </div>
                  {current.kind === "quiz" ? (
                    <span className="text-xs text-muted-foreground">Pass the assessment to complete this lesson.</span>
                  ) : completed ? (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" /> Lesson complete</span>
                  ) : (
                    <Button onClick={markComplete}><Check className="size-4" /> Mark lesson complete</Button>
                  )}
                </div>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

function ExerciseBlock({ exercise }: { exercise: { question: string; options: string[]; answer: number } }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = checked && choice === exercise.answer;
  return (
    <div className="rounded-xl border border-border bg-frost p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold"><BookOpen className="size-4 text-primary" /> Quick check</h3>
      <p className="mt-3 text-sm font-medium">{exercise.question}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {exercise.options.map((option, index) => (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm",
              checked && index === exercise.answer && "border-emerald-600 bg-emerald-50",
              checked && choice === index && index !== exercise.answer && "border-red-400 bg-red-50",
              !checked && choice === index && "border-primary",
            )}
          >
            <input type="radio" name={exercise.question} checked={choice === index} onChange={() => { setChoice(index); setChecked(false); }} />
            {option}
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" variant="outline" disabled={choice === null} onClick={() => setChecked(true)}>Check answer</Button>
        {checked && <span className={cn("text-sm font-semibold", correct ? "text-emerald-700" : "text-red-600")}>{correct ? "Correct!" : "Not quite — try again."}</span>}
      </div>
    </div>
  );
}

function QuizBlock({ lessonId, onPassed }: { lessonId: string; onPassed: () => Promise<void> }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["quiz", lessonId], queryFn: () => api.get<QuizResponse>(`/lessons/${lessonId}/quiz`) });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <Spinner label="Loading quiz…" />;
  if (!data) return null;
  const { quiz } = data;
  const answered = quiz.questions.filter((question) => answers[question.id]).length;
  const attemptsLeft = Math.max(0, quiz.attempts_allowed - data.attemptsUsed);

  async function submit() {
    setBusy(true);
    try {
      const response = await api.post<QuizResult>(`/quizzes/${quiz.id}/submit`, { answers });
      setResult(response);
      if (response.passed) {
        toast.success(`Passed with ${response.score}%`);
        await onPassed();
      } else {
        toast.error(`You scored ${response.score}%. Passing score is ${response.passingScore}%.`);
      }
      await queryClient.invalidateQueries({ queryKey: ["quiz", lessonId] });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setAnswers({});
    setResult(null);
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold"><FileQuestion className="size-4 text-primary" /> {quiz.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Pass mark {quiz.passing_score}% · {attemptsLeft} of {quiz.attempts_allowed} attempts left
            {data.bestScore > 0 && <> · Best {data.bestScore}%</>}
          </p>
        </div>
        {data.passed && <Badge tone="success"><CheckCircle2 className="size-3" /> Passed</Badge>}
      </div>

      {result ? (
        <div className="mt-4 space-y-3">
          <div className={cn("rounded-lg p-4 text-sm font-semibold", result.passed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700")}>
            {result.passed ? `Passed — ${result.score}%` : `Not passed — ${result.score}% (need ${result.passingScore}%)`}
          </div>
          {result.results.map((item) => {
            const question = quiz.questions.find((q) => q.id === item.questionId);
            const correctLabel = question?.options.find((option) => option.id === item.correctOptionId)?.label;
            return (
              <div key={item.questionId} className="rounded-lg bg-card p-3 ring-1 ring-border">
                <p className="text-sm font-semibold">{item.prompt}</p>
                <p className={cn("mt-1 text-xs font-semibold", item.correct ? "text-emerald-700" : "text-red-600")}>
                  {item.correct ? "Correct" : `Correct answer: ${correctLabel ?? "—"}`}
                </p>
              </div>
            );
          })}
          {attemptsLeft > 0 && !result.passed && (
            <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="size-4" /> Try again ({attemptsLeft} left)</Button>
          )}
          {result.passed && (
            <Link to="/student" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Back to my learning <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-4">
            {quiz.questions.map((question, index) => (
              <div key={question.id} className="rounded-lg bg-card p-4 ring-1 ring-border">
                <p className="text-sm font-semibold">{index + 1}. {question.prompt}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                        answers[question.id] === option.id ? "border-primary bg-primary/10" : "border-border",
                      )}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={answers[question.id] === option.id}
                        onChange={() => setAnswers((previous) => ({ ...previous, [question.id]: option.id }))}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={submit} disabled={busy || answered < quiz.questions.length || attemptsLeft === 0}>
              {busy ? "Submitting…" : "Submit quiz"}
            </Button>
            <span className="text-xs text-muted-foreground">{answered} of {quiz.questions.length} answered</span>
            {attemptsLeft === 0 && <span className="text-xs font-semibold text-red-600">No attempts left</span>}
          </div>
        </>
      )}
    </div>
  );
}
