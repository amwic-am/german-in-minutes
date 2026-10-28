import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileQuestion, Layers, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ContentStatus } from "@shared/types";
import { AdminCard, AdminPageHeader } from "@/components/admin-layout";
import { Badge, Button, Empty, Field, Input, Modal, Select, Spinner, StatusBadge, Textarea } from "@/components/ui";
import { usePageMeta } from "@/hooks/use-page-meta";
import { api, errorMessage } from "@/lib/api";
import { price } from "@/lib/money";
import { STATUS_OPTIONS, type AdminCourse, type AdminCourseDetail, type AdminLesson, type AdminQuiz } from "@/lib/admin-types";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
const LESSON_KINDS = ["video", "vocabulary", "grammar", "listening", "exercise", "reading", "writing", "quiz"];

type CourseForm = {
  title: string;
  slug: string;
  level: string;
  description: string;
  coverUrl: string;
  priceEur: string;
  estimatedWeeks: string;
  status: ContentStatus;
  featured: boolean;
};

function emptyCourse(): CourseForm {
  return { title: "", slug: "", level: "A1", description: "", coverUrl: "", priceEur: "29", estimatedWeeks: "8", status: "draft", featured: false };
}

/* ------------------------------- Course list -------------------------------- */

export function AdminCoursesPage() {
  usePageMeta("Courses | Admin | German In Minutes");
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CourseForm>(emptyCourse());
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "courses"], queryFn: () => api.get<{ courses: AdminCourse[] }>("/admin/courses") });

  const courses = useMemo(() => {
    const list = data?.courses ?? [];
    return list.filter((course) => {
      if (status !== "all" && course.status !== status) return false;
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return `${course.title} ${course.slug} ${course.level}`.toLowerCase().includes(needle);
    });
  }, [data, query, status]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/courses", {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        level: form.level,
        description: form.description.trim(),
        coverUrl: form.coverUrl.trim() || null,
        priceEur: Number(form.priceEur),
        estimatedWeeks: Number(form.estimatedWeeks),
        status: form.status,
        featured: form.featured,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      setOpen(false);
      setForm(emptyCourse());
      toast.success("Course created");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove(course: AdminCourse) {
    if (!window.confirm(`Delete “${course.title}”? Lessons, quizzes and enrolments for this course are removed.`)) return;
    try {
      await api.del(`/admin/courses/${course.id}`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course deleted");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Courses"
        description="Create courses, build curricula and publish lessons."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New course</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search courses…" className="pl-9" />
        </label>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </Select>
      </div>

      <AdminCard>
        {isLoading ? <Spinner /> : courses.length === 0 ? (
          <div className="p-6"><Empty title="No courses found">Create a course to start building your curriculum.</Empty></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-frost text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Level</th>
                  <th className="px-5 py-3">Lessons</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-t border-border hover:bg-frost/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={course.image} alt="" className="h-10 w-16 rounded object-cover" />
                        <div className="min-w-0">
                          <Link to={`/admin/courses/${course.id}`} className="block max-w-[260px] truncate font-semibold hover:text-primary">{course.title}</Link>
                          <span className="text-xs text-muted-foreground">/{course.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><Badge tone="gold">{course.level}</Badge></td>
                    <td className="px-5 py-3">{course.lesson_count}</td>
                    <td className="px-5 py-3">{price(course.price_eur)}</td>
                    <td className="px-5 py-3"><StatusBadge status={course.status} /></td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{course.featured ? "Featured" : "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Link to={`/admin/courses/${course.id}`} className="rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10">Edit</Link>
                        <button onClick={() => remove(course)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${course.title}`}><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New course"
        wide
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button form="new-course" type="submit" disabled={busy}>{busy ? "Creating…" : "Create course"}</Button></>}
      >
        <form id="new-course" onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} placeholder="German Foundations" /></Field>
          <Field label="Slug" hint="Leave blank to generate from the title."><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="german-foundations-a1" /></Field>
          <Field label="Level"><Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{LEVELS.map((level) => <option key={level}>{level}</option>)}</Select></Field>
          <Field label="Price (USD)"><Input type="number" min={0} step="0.01" value={form.priceEur} onChange={(e) => setForm({ ...form, priceEur: e.target.value })} required /></Field>
          <Field label="Estimated weeks"><Input type="number" min={1} max={52} value={form.estimatedWeeks} onChange={(e) => setForm({ ...form, estimatedWeeks: e.target.value })} required /></Field>
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}>{STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Select></Field>
          <Field label="Featured"><label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Show on the homepage</label></Field>
          <Field label="Cover image URL" className="sm:col-span-2" hint="Use /images/… or an HTTPS URL."><Input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} placeholder="/images/learning-banner.jpg" /></Field>
          <Field label="Description" className="sm:col-span-2"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
        </form>
      </Modal>
    </>
  );
}

/* ------------------------------ Course detail ------------------------------- */

type LessonForm = {
  title: string;
  summary: string;
  kind: string;
  durationMinutes: string;
  mediaUrl: string;
  status: ContentStatus;
  text: string;
  exerciseQuestion: string;
  exerciseOptions: string;
  exerciseAnswer: string;
};

function emptyLesson(): LessonForm {
  return { title: "", summary: "", kind: "video", durationMinutes: "10", mediaUrl: "", status: "draft", text: "", exerciseQuestion: "", exerciseOptions: "", exerciseAnswer: "0" };
}

function lessonToForm(lesson: AdminLesson): LessonForm {
  const exercise = lesson.body.exercise;
  return {
    title: lesson.title,
    summary: lesson.summary,
    kind: lesson.kind,
    durationMinutes: String(lesson.duration_minutes),
    mediaUrl: lesson.media_url ?? "",
    status: lesson.status,
    text: String(lesson.body.text ?? ""),
    exerciseQuestion: exercise?.question ?? "",
    exerciseOptions: exercise?.options.join("\n") ?? "",
    exerciseAnswer: String(exercise?.answer ?? 0),
    };
}

export function AdminCourseDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "course", id], queryFn: () => api.get<{ course: AdminCourseDetail }>(`/admin/courses/${id}`) });
  const [settings, setSettings] = useState<CourseForm>(emptyCourse());
  const [saving, setSaving] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleBusy, setModuleBusy] = useState(false);

  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonModuleId, setLessonModuleId] = useState("");
  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonForm>(emptyLesson());
  const [lessonBusy, setLessonBusy] = useState(false);

  const [quizLesson, setQuizLesson] = useState<AdminLesson | null>(null);

  usePageMeta(data ? `${data.course.title} | Admin courses` : "Admin course");

  useEffect(() => {
    if (!data) return;
    setSettings({
      title: data.course.title,
      slug: data.course.slug,
      level: data.course.level,
      description: data.course.description,
      coverUrl: data.course.cover_url ?? "",
      priceEur: String(data.course.price_eur),
      estimatedWeeks: String(data.course.estimated_weeks),
      status: data.course.status,
      featured: data.course.featured,
    });
  }, [data]);

  if (isLoading) return <Spinner label="Loading course…" />;
  if (!data) return <Empty title="Course not found"><Link to="/admin/courses" className="text-primary underline">Back to courses</Link></Empty>;

  const course = data.course;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin", "course", id] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    await queryClient.invalidateQueries({ queryKey: ["courses"] });
  }

  async function saveCourse(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/admin/courses/${id}`, {
        title: settings.title.trim(),
        slug: settings.slug.trim(),
        level: settings.level,
        description: settings.description,
        coverUrl: settings.coverUrl.trim() || null,
        priceEur: Number(settings.priceEur),
        estimatedWeeks: Number(settings.estimatedWeeks),
        status: settings.status,
        featured: settings.featured,
      });
      await refresh();
      toast.success("Course saved");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function addModule(event: FormEvent) {
    event.preventDefault();
    if (moduleTitle.trim().length < 2) return;
    setModuleBusy(true);
    try {
      await api.post(`/admin/courses/${id}/modules`, { title: moduleTitle.trim(), status: "published" });
      setModuleTitle("");
      await refresh();
      toast.success("Module added");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setModuleBusy(false);
    }
  }

  async function toggleModuleStatus(moduleId: string, current: ContentStatus) {
    try {
      await api.patch(`/admin/modules/${moduleId}`, { status: current === "published" ? "draft" : "published" });
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function removeModule(moduleId: string, title: string) {
    if (!window.confirm(`Delete module “${title}” and all its lessons?`)) return;
    try {
      await api.del(`/admin/modules/${moduleId}`);
      await refresh();
      toast.success("Module deleted");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  function openNewLesson(moduleId: string) {
    setLessonModuleId(moduleId);
    setEditingLesson(null);
    setLessonForm(emptyLesson());
    setLessonOpen(true);
  }

  function openEditLesson(lesson: AdminLesson) {
    setEditingLesson(lesson);
    setLessonModuleId(lesson.module_id);
    setLessonForm(lessonToForm(lesson));
    setLessonOpen(true);
  }

  async function saveLesson(event: FormEvent) {
    event.preventDefault();
    setLessonBusy(true);
    const exerciseOptions = lessonForm.exerciseOptions.split("\n").map((line) => line.trim()).filter(Boolean);
    const body: Record<string, unknown> = { text: lessonForm.text };
    if (lessonForm.exerciseQuestion.trim() && exerciseOptions.length >= 2) {
      body.exercise = {
        question: lessonForm.exerciseQuestion.trim(),
        options: exerciseOptions,
        answer: Math.min(Math.max(0, Number(lessonForm.exerciseAnswer)), exerciseOptions.length - 1),
      };
    }
    const payload = {
      title: lessonForm.title.trim(),
      summary: lessonForm.summary.trim(),
      kind: lessonForm.kind,
      durationMinutes: Number(lessonForm.durationMinutes),
      mediaUrl: lessonForm.mediaUrl.trim() || null,
      body,
      status: lessonForm.status,
    };
    try {
      if (editingLesson) {
        await api.patch(`/admin/lessons/${editingLesson.id}`, payload);
      } else {
        await api.post(`/admin/modules/${lessonModuleId}/lessons`, payload);
      }
      setLessonOpen(false);
      await refresh();
      toast.success(editingLesson ? "Lesson updated" : "Lesson created");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLessonBusy(false);
    }
  }

  async function removeLesson(lesson: AdminLesson) {
    if (!window.confirm(`Delete lesson “${lesson.title}”?`)) return;
    try {
      await api.del(`/admin/lessons/${lesson.id}`);
      await refresh();
      toast.success("Lesson deleted");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function toggleLessonStatus(lesson: AdminLesson) {
    try {
      await api.patch(`/admin/lessons/${lesson.id}`, { status: lesson.status === "published" ? "draft" : "published" });
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function deleteCourse() {
    if (!window.confirm(`Delete “${course.title}” permanently?`)) return;
    try {
      await api.del(`/admin/courses/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      toast.success("Course deleted");
      navigate("/admin/courses");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0);

  return (
    <>
      <AdminPageHeader
        title={course.title}
        description={`${course.level} · ${course.modules.length} modules · ${totalLessons} lessons · ${price(course.price_eur)}`}
        actions={
          <Button variant="outline" onClick={() => navigate("/admin/courses")}><ArrowLeft className="size-4" /> All courses</Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <AdminCard title="Curriculum" description="Modules and lessons shown to enrolled students.">
            <div className="p-5">
              {course.modules.length === 0 && <Empty title="No modules yet">Add a module below to start structuring the course.</Empty>}
              <div className="space-y-4">
                {course.modules.map((module) => (
                  <div key={module.id} className="rounded-xl border border-border">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-frost/60 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Layers className="size-4 text-primary" />
                        <span className="font-semibold">{module.title}</span>
                        <StatusBadge status={module.status} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => toggleModuleStatus(module.id, module.status)}>{module.status === "published" ? "Unpublish" : "Publish"}</Button>
                        <button onClick={() => removeModule(module.id, module.title)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Delete module"><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                    <div className="divide-y divide-border">
                      {module.lessons.map((lesson) => (
                        <div key={lesson.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                          <span className="w-5 text-xs font-semibold text-muted-foreground">{lesson.position}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{lesson.title}</p>
                            <p className="text-xs text-muted-foreground">{lesson.kind} · {lesson.duration_minutes} min · {lesson.status}</p>
                          </div>
                          {lesson.quiz ? <Badge tone="gold"><FileQuestion className="size-3" /> Quiz</Badge> : <span className="text-xs text-muted-foreground">No quiz</span>}
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setQuizLesson(lesson)}>Quiz</Button>
                            <Button size="sm" variant="ghost" onClick={() => openEditLesson(lesson)}>Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleLessonStatus(lesson)}>{lesson.status === "published" ? "Hide" : "Show"}</Button>
                            <button onClick={() => removeLesson(lesson)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Delete lesson"><Trash2 className="size-4" /></button>
                          </div>
                        </div>
                      ))}
                      <div className="px-4 py-2">
                        <button onClick={() => openNewLesson(module.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Plus className="size-3.5" /> Add lesson</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={addModule} className="mt-5 flex gap-2 border-t border-border pt-5">
                <Input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="New module title" required minLength={2} />
                <Button type="submit" disabled={moduleBusy}><Plus className="size-4" /> Add module</Button>
              </form>
            </div>
          </AdminCard>
        </div>

        <aside className="space-y-6">
          <AdminCard title="Course settings">
            <form onSubmit={saveCourse} className="grid gap-4 p-5">
              <Field label="Title"><Input value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} required /></Field>
              <Field label="Slug"><Input value={settings.slug} onChange={(e) => setSettings({ ...settings, slug: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Level"><Select value={settings.level} onChange={(e) => setSettings({ ...settings, level: e.target.value })}>{LEVELS.map((level) => <option key={level}>{level}</option>)}</Select></Field>
                <Field label="Status"><Select value={settings.status} onChange={(e) => setSettings({ ...settings, status: e.target.value as ContentStatus })}>{STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Select></Field>
                <Field label="Price"><Input type="number" min={0} step="0.01" value={settings.priceEur} onChange={(e) => setSettings({ ...settings, priceEur: e.target.value })} /></Field>
                <Field label="Weeks"><Input type="number" min={1} max={52} value={settings.estimatedWeeks} onChange={(e) => setSettings({ ...settings, estimatedWeeks: e.target.value })} /></Field>
              </div>
              <Field label="Cover URL"><Input value={settings.coverUrl} onChange={(e) => setSettings({ ...settings, coverUrl: e.target.value })} placeholder="/images/…" /></Field>
              <Field label="Description"><Textarea rows={4} value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.featured} onChange={(e) => setSettings({ ...settings, featured: e.target.checked })} /> Featured course</label>
              <Button type="submit" disabled={saving}><Save className="size-4" /> {saving ? "Saving…" : "Save course"}</Button>
            </form>
          </AdminCard>

          <AdminCard title="Danger zone">
            <div className="p-5">
              <p className="text-xs leading-relaxed text-muted-foreground">Deleting a course removes modules, lessons, quizzes and enrolments.</p>
              <Button variant="danger" className="mt-3 w-full" onClick={deleteCourse}><Trash2 className="size-4" /> Delete course</Button>
            </div>
          </AdminCard>
        </aside>
      </div>

      <Modal
        open={lessonOpen}
        onClose={() => setLessonOpen(false)}
        title={editingLesson ? "Edit lesson" : "New lesson"}
        wide
        footer={<><Button variant="outline" onClick={() => setLessonOpen(false)}>Cancel</Button><Button form="lesson-form" type="submit" disabled={lessonBusy}>{lessonBusy ? "Saving…" : "Save lesson"}</Button></>}
      >
        <form id="lesson-form" onSubmit={saveLesson} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2"><Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} required minLength={2} /></Field>
          <Field label="Kind"><Select value={lessonForm.kind} onChange={(e) => setLessonForm({ ...lessonForm, kind: e.target.value })}>{LESSON_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</Select></Field>
          <Field label="Duration (minutes)"><Input type="number" min={1} max={600} value={lessonForm.durationMinutes} onChange={(e) => setLessonForm({ ...lessonForm, durationMinutes: e.target.value })} required /></Field>
          <Field label="Status"><Select value={lessonForm.status} onChange={(e) => setLessonForm({ ...lessonForm, status: e.target.value as ContentStatus })}>{STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Select></Field>
          <Field label="Media URL"><Input value={lessonForm.mediaUrl} onChange={(e) => setLessonForm({ ...lessonForm, mediaUrl: e.target.value })} placeholder="https://…" /></Field>
          <Field label="Summary" className="sm:col-span-2"><Input value={lessonForm.summary} onChange={(e) => setLessonForm({ ...lessonForm, summary: e.target.value })} /></Field>
          <Field label="Lesson text" className="sm:col-span-2" hint="Separate paragraphs with a blank line."><Textarea rows={5} value={lessonForm.text} onChange={(e) => setLessonForm({ ...lessonForm, text: e.target.value })} /></Field>
          <Field label="Exercise question" className="sm:col-span-2" hint="Leave blank for no exercise."><Input value={lessonForm.exerciseQuestion} onChange={(e) => setLessonForm({ ...lessonForm, exerciseQuestion: e.target.value })} /></Field>
          <Field label="Exercise options" hint="One option per line."><Textarea rows={4} value={lessonForm.exerciseOptions} onChange={(e) => setLessonForm({ ...lessonForm, exerciseOptions: e.target.value })} /></Field>
          <Field label="Correct option" hint="0 = first option."><Input type="number" min={0} value={lessonForm.exerciseAnswer} onChange={(e) => setLessonForm({ ...lessonForm, exerciseAnswer: e.target.value })} /></Field>
        </form>
      </Modal>

      {quizLesson && (
        <QuizEditorModal
          lesson={quizLesson}
          onClose={() => setQuizLesson(null)}
          onSaved={async () => { setQuizLesson(null); await refresh(); }}
        />
      )}
    </>
  );
}

/* -------------------------------- Quiz editor ------------------------------- */

type QuizQuestionForm = { prompt: string; points: string; options: { label: string; correct: boolean }[] };

function emptyQuestion(): QuizQuestionForm {
  return { prompt: "", points: "1", options: [{ label: "", correct: true }, { label: "", correct: false }] };
}

function QuizEditorModal({ lesson, onClose, onSaved }: { lesson: AdminLesson; onClose: () => void; onSaved: () => Promise<void> }) {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "quiz", lesson.id], queryFn: () => api.get<{ quiz: AdminQuiz | null }>(`/admin/lessons/${lesson.id}/quiz`) });
  const [title, setTitle] = useState(`${lesson.title} — assessment`);
  const [passingScore, setPassingScore] = useState("70");
  const [attemptsAllowed, setAttemptsAllowed] = useState("3");
  const [timeLimit, setTimeLimit] = useState("10");
  const [status, setStatus] = useState("published");
  const [questions, setQuestions] = useState<QuizQuestionForm[]>([emptyQuestion()]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (!data.quiz) return;
    setTitle(data.quiz.title);
    setPassingScore(String(data.quiz.passing_score));
    setAttemptsAllowed(String(data.quiz.attempts_allowed));
    setTimeLimit(data.quiz.time_limit_minutes ? String(data.quiz.time_limit_minutes) : "");
    setStatus(data.quiz.status);
    setQuestions(data.quiz.questions.map((question) => ({
      prompt: question.prompt,
      points: String(question.points),
      options: question.options.map((option) => ({ label: option.label, correct: option.is_correct })),
    })));
  }, [data]);

  function updateQuestion(index: number, patch: Partial<QuizQuestionForm>) {
    setQuestions((current) => current.map((question, i) => (i === index ? { ...question, ...patch } : question)));
  }

  function updateOption(qIndex: number, oIndex: number, patch: Partial<{ label: string; correct: boolean }>) {
    setQuestions((current) => current.map((question, i) => {
      if (i !== qIndex) return question;
      return { ...question, options: question.options.map((option, j) => (j === oIndex ? { ...option, ...patch } : option)) };
    }));
  }

  function setCorrect(qIndex: number, oIndex: number) {
    setQuestions((current) => current.map((question, i) => {
      if (i !== qIndex) return question;
      return { ...question, options: question.options.map((option, j) => ({ ...option, correct: j === oIndex })) };
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.put(`/admin/lessons/${lesson.id}/quiz`, {
        title: title.trim(),
        passingScore: Number(passingScore),
        attemptsAllowed: Number(attemptsAllowed),
        timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
        status,
        questions: questions.map((question) => ({
          prompt: question.prompt.trim(),
          points: Number(question.points),
          options: question.options.map((option) => ({ label: option.label.trim(), isCorrect: option.correct })),
        })),
      });
      toast.success("Quiz saved");
      await onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this quiz?")) return;
    try {
      await api.del(`/admin/lessons/${lesson.id}/quiz`);
      toast.success("Quiz deleted");
      await onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Quiz — ${lesson.title}`}
      wide
      footer={
        <>
          {data?.quiz && <Button variant="danger" onClick={remove}><Trash2 className="size-4" /> Delete</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button form="quiz-form" type="submit" disabled={busy}>{busy ? "Saving…" : "Save quiz"}</Button>
        </>
      }
    >
      {isLoading ? <Spinner label="Loading quiz…" /> : (
        <form id="quiz-form" onSubmit={save} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" className="sm:col-span-2"><Input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} /></Field>
            <Field label="Passing score (%)"><Input type="number" min={1} max={100} value={passingScore} onChange={(e) => setPassingScore(e.target.value)} required /></Field>
            <Field label="Attempts allowed"><Input type="number" min={1} max={20} value={attemptsAllowed} onChange={(e) => setAttemptsAllowed(e.target.value)} required /></Field>
            <Field label="Time limit (minutes)" hint="Leave blank for none."><Input type="number" min={1} max={180} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} /></Field>
            <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Select></Field>
          </div>

          <div className="space-y-4">
            {questions.map((question, qIndex) => (
              <div key={qIndex} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">Question {qIndex + 1}</p>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">Points <input type="number" min={1} max={20} value={question.points} onChange={(e) => updateQuestion(qIndex, { points: e.target.value })} className="w-16 rounded border border-border px-2 py-1" /></label>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => setQuestions((current) => current.filter((_, i) => i !== qIndex))} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Remove question"><Trash2 className="size-4" /></button>
                    )}
                  </div>
                </div>
                <Input className="mt-2" value={question.prompt} onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })} placeholder="Question prompt" required minLength={3} />
                <div className="mt-3 space-y-2">
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${qIndex}`} checked={option.correct} onChange={() => setCorrect(qIndex, oIndex)} aria-label={`Option ${oIndex + 1} correct`} />
                      <Input value={option.label} onChange={(e) => updateOption(qIndex, oIndex, { label: e.target.value })} placeholder={`Option ${oIndex + 1}`} required />
                      {question.options.length > 2 && (
                        <button type="button" onClick={() => setQuestions((current) => current.map((item, i) => i === qIndex ? { ...item, options: item.options.filter((_, j) => j !== oIndex) } : item))} className="rounded p-1 text-muted-foreground hover:text-red-600" aria-label="Remove option"><Trash2 className="size-4" /></button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setQuestions((current) => current.map((item, i) => i === qIndex ? { ...item, options: [...item.options, { label: "", correct: false }] } : item))} className="text-xs font-semibold text-primary hover:underline">+ Add option</button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setQuestions((current) => [...current, emptyQuestion()])}><Plus className="size-4" /> Add question</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
