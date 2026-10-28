export type Role =
  | "super_admin"
  | "content_admin"
  | "instructor"
  | "exam_admin"
  | "support_admin"
  | "finance_admin"
  | "marketing_admin";

export type ContentStatus = "draft" | "published" | "archived";

export type CourseSummary = {
  id: string;
  slug: string;
  title: string;
  level: string;
  description: string;
  price_eur: number;
  estimated_weeks: number;
  cover_url: string | null;
  image: string;
  status: ContentStatus;
  featured: boolean;
  lesson_count: number;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  summary: string;
  kind: string;
  position: number;
  duration_minutes: number;
  media_url: string | null;
  download_url: string | null;
  body: { text?: string; exercise?: { question: string; options: string[]; answer: number } } & Record<string, unknown>;
  status: ContentStatus;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  position: number;
  status: ContentStatus;
  lessons?: Lesson[];
};

export type CourseDetail = CourseSummary & {
  modules: Module[];
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  current_level: string;
  preferred_language: string;
  learning_goal: string | null;
  daily_goal_minutes: number;
  streak_days: number;
  account_status: "active" | "suspended";
  preferences: Record<string, unknown>;
  onboarding_completed: boolean;
  created_at: string;
};

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  roles: Role[];
  profile: Profile;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress_percent: number;
  last_lesson_id: string | null;
  course: CourseSummary;
};

export type Certificate = {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
  course_title: string;
  course_level: string;
  student_name?: string;
};

export type Order = {
  id: string;
  user_id: string;
  course_id: string | null;
  amount: string | number;
  currency: string;
  status: "pending" | "paid" | "refunded" | "failed";
  provider: string | null;
  provider_reference: string | null;
  created_at: string;
  course_title?: string | null;
  course_level?: string | null;
  student_name?: string;
  student_email?: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  kind: string;
  read_at: string | null;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_email?: string;
};

export type PdfResource = {
  id: string;
  name: string;
  description: string;
  tag: string;
  file_path: string;
  cover_path: string;
  status: "published" | "archived" | "pending";
  created_at: string;
  downloads?: number;
};

export type DashboardData = {
  profile: Profile;
  enrollments: Enrollment[];
  certificates: Certificate[];
  notifications: Notification[];
  stats: { courses: number; avgProgress: number; certificates: number };
  recommended: CourseSummary[];
};

export type AdminOverview = {
  totals: {
    students: number;
    newToday: number;
    new7: number;
    courses: number;
    publishedCourses: number;
    revenue: number;
    pendingOrders: number;
  };
  studentBuckets: { name: string; v: number }[];
  new7: { name: string; v: number }[];
  revenue: { name: string; v: number }[];
  recentStudents: Profile[];
  recentOrders: Order[];
  recentLogins: { id: string; email: string | null; user_agent: string | null; created_at: string }[];
  activity: { id: string; action: string; entity_type: string; created_at: string }[];
};
