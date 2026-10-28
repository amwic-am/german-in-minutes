import type { Certificate, ContentStatus, CourseSummary, Lesson, Module, PdfResource, Profile, Role, SupportTicket } from "@shared/types";

export type AdminLesson = Omit<Lesson, "body"> & {
  body: Lesson["body"];
  quiz: { id: string; title: string; status: ContentStatus } | null;
};

export type AdminModule = Omit<Module, "lessons"> & { lessons: AdminLesson[] };
export type AdminCourseDetail = CourseSummary & { modules: AdminModule[] };
export type AdminCourse = CourseSummary;

export type AdminStudent = Profile & {
  roles: string[];
  enrollment_count: number;
  spend: number;
};

export type AdminStudentDetail = Profile & {
  roles: Role[];
  enrollments: { id: string; course_id: string; title: string; level: string; slug: string; progress_percent: number; enrolled_at: string; completed_at: string | null }[];
  orders: { id: string; amount: number; currency: string; status: string; provider: string | null; reference: string | null; created_at: string; course_title: string | null }[];
  certificates: { id: string; certificate_number: string; issued_at: string; course_title: string }[];
  tickets: { id: string; subject: string; status: string; created_at: string }[];
  logins: { id: string; email: string | null; user_agent: string | null; created_at: string }[];
};

export type AdminOrder = {
  id: string;
  user_id: string;
  course_id: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "refunded" | "failed";
  provider: string | null;
  provider_reference: string | null;
  created_at: string;
  updated_at: string;
  course_title: string | null;
  student_name: string;
  student_email: string;
};

export type AdminTicket = SupportTicket & {
  student_name: string;
  student_email: string;
};

export type AdminPdf = PdfResource & { downloads: number; status: PdfResource["status"] };

export type AdminStaff = Profile & { roles: string[] };

export type AdminCertificate = Certificate & { student_name: string };

export type AuditEntry = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type NewsletterData = {
  subscribers: { id: string; email: string; created_at: string }[];
  messages: { id: string; name: string; email: string; message: string; created_at: string }[];
};

export type AdminQuizQuestion = { id: string; prompt: string; points: number; options: { id: string; label: string; is_correct: boolean }[] };

export type AdminQuiz = {
  id: string;
  title: string;
  passing_score: number;
  time_limit_minutes: number | null;
  attempts_allowed: number;
  status: string;
  questions: AdminQuizQuestion[];
};

export const ADMIN_ROLES = [
  "super_admin",
  "content_admin",
  "instructor",
  "exam_admin",
  "support_admin",
  "finance_admin",
  "marketing_admin",
] as const;

export const STATUS_OPTIONS = ["draft", "published", "archived"] as const;
