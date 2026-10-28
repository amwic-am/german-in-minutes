import { useEffect } from "react";
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Compass } from "lucide-react";
import { ApiError } from "@/lib/api";
import { AuthProvider } from "@/hooks/use-auth";
import { PublicLayout } from "@/components/public-layout";
import { RequireAuth, StudentLayout } from "@/components/student-layout";
import { AdminLayout } from "@/components/admin-layout";
import { usePageMeta } from "@/hooks/use-page-meta";
import { HomePage } from "@/pages/home";
import {
  CategoriesPage,
  CourseDetailPage,
  CoursesPage,
  GoetheLevelPage,
  GoethePage,
  LevelDetailPage,
  LevelsPage,
} from "@/pages/catalog";
import {
  AboutPage,
  BlogPage,
  BlogPostPage,
  BusinessPage,
  ContactPage,
  EducatorsPage,
  FaqPage,
  LegalPage,
  PracticePage,
  PricingPage,
  ResourcesPage,
  SkillDetailPage,
} from "@/pages/content";
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from "@/pages/auth";
import { StudentDashboardPage } from "@/pages/student";
import { LearnPage } from "@/pages/learn";
import {
  CertificatePage,
  CheckoutPage,
  SettingsPage,
  SupportPage,
  WelcomePage,
} from "@/pages/account";
import { AdminOverviewPage } from "@/pages/admin-overview";
import { AdminCourseDetailPage, AdminCoursesPage } from "@/pages/admin-courses";
import { AdminStudentDetailPage, AdminStaffPage, AdminStudentsPage } from "@/pages/admin-people";
import { AdminCertificatesPage, AdminOrdersPage, AdminSupportPage } from "@/pages/admin-commerce";
import { AdminAuditPage, AdminBroadcastPage, AdminPdfsPage, AdminSettingsPage } from "@/pages/admin-content";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function StudentOnly() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}

function NotFoundPage() {
  usePageMeta("Page not found | German In Minutes");
  return (
    <div className="grid min-h-screen place-items-center bg-charcoal px-6 text-white">
      <div className="max-w-lg text-center">
        <Compass className="mx-auto size-10 text-brand" />
        <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-brand">Fehler 404</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold">This page took a wrong turn.</h1>
        <p className="mt-3 text-white/70">The page you're looking for doesn't exist — but your next German lesson does.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-charcoal">Back home</Link>
          <Link to="/courses" className="rounded-md border border-white/25 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Browse courses</Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="courses" element={<CoursesPage />} />
              <Route path="courses/:slug" element={<CourseDetailPage />} />
              <Route path="levels" element={<LevelsPage />} />
              <Route path="levels/:code" element={<LevelDetailPage />} />
              <Route path="goethe" element={<GoethePage />} />
              <Route path="goethe/:level" element={<GoetheLevelPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="practice" element={<PracticePage />} />
              <Route path="practice/:slug" element={<SkillDetailPage />} />
              <Route path="pricing" element={<PricingPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="blog" element={<BlogPage />} />
              <Route path="blog/:slug" element={<BlogPostPage />} />
              <Route path="faq" element={<FaqPage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="business" element={<BusinessPage />} />
              <Route path="educators" element={<EducatorsPage />} />
              <Route path="legal/:doc" element={<LegalPage />} />
            </Route>

            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />

            <Route element={<StudentOnly />}>
              <Route element={<StudentLayout />}>
                <Route path="student" element={<StudentDashboardPage />} />
                <Route path="learn/:slug" element={<LearnPage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="welcome" element={<WelcomePage />} />
                <Route path="certificate/:id" element={<CertificatePage />} />
              </Route>
            </Route>

            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminOverviewPage />} />
              <Route path="courses" element={<AdminCoursesPage />} />
              <Route path="courses/:id" element={<AdminCourseDetailPage />} />
              <Route path="students" element={<AdminStudentsPage />} />
              <Route path="students/:id" element={<AdminStudentDetailPage />} />
              <Route path="certificates" element={<AdminCertificatesPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="support" element={<AdminSupportPage />} />
              <Route path="pdfs" element={<AdminPdfsPage />} />
              <Route path="staff" element={<AdminStaffPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="broadcast" element={<AdminBroadcastPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster richColors position="top-center" />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
