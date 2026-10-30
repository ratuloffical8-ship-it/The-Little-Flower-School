// src/App.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PublicLayout from '@/layouts/PublicLayout';
import AdminLayout from '@/layouts/AdminLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';

/* ── Public pages (lazy) ── */
const HomePage = lazy(() => import('@/pages/HomePage'));
const SchoolInfoPage = lazy(() => import('@/pages/SchoolInfoPage'));
const AdmissionPage = lazy(() => import('@/pages/AdmissionPage'));
const AdmissionStatusPage = lazy(() => import('@/pages/AdmissionStatusPage'));
const ResultsPage = lazy(() => import('@/pages/ResultsPage'));
const NoticesPage = lazy(() => import('@/pages/NoticesPage'));
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'));
const GalleryPage = lazy(() => import('@/pages/GalleryPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const FAQPage = lazy(() => import('@/pages/FAQPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

/* ── Admin pages (lazy) ── */
const LoginPage = lazy(() => import('@/features/admin/LoginPage'));
const AdminDashboard = lazy(() => import('@/features/admin/AdminDashboard'));
const AdmissionsListPage = lazy(() => import('@/features/admin/admissions/AdmissionsListPage'));
const AdmissionDetailPage = lazy(() => import('@/features/admin/admissions/AdmissionDetailPage'));
const StudentsListPage = lazy(() => import('@/features/admin/students/StudentsListPage'));
const StudentDetailPage = lazy(() => import('@/features/admin/students/StudentDetailPage'));
const TeachersListPage = lazy(() => import('@/features/admin/teachers/TeachersListPage'));
const AttendancePage = lazy(() => import('@/features/admin/attendance/AttendancePage'));
const ExamsListPage = lazy(() => import('@/features/admin/exams/ExamsListPage'));
const ResultsEntryPage = lazy(() => import('@/features/admin/exams/ResultsEntryPage'));
const NoticesListPage = lazy(() => import('@/features/admin/notices/NoticesListPage'));
const GalleryListPage = lazy(() => import('@/features/admin/gallery/GalleryListPage'));
const FAQListPage = lazy(() => import('@/features/admin/faq/FAQListPage'));
const ContactMessagesPage = lazy(() => import('@/features/admin/contact/ContactMessagesPage'));
const PaymentsListPage = lazy(() => import('@/features/admin/payments/PaymentsListPage'));
const InvoicesListPage = lazy(() => import('@/features/admin/payments/InvoicesListPage'));
const ExpensesListPage = lazy(() => import('@/features/admin/expenses/ExpensesListPage'));
const ReportsPage = lazy(() => import('@/features/admin/reports/ReportsPage'));
const SettingsPage = lazy(() => import('@/features/admin/settings/SettingsPage'));
const UsersListPage = lazy(() => import('@/features/admin/users/UsersListPage'));

/* ── Admin guard: only signed-in admins reach the admin shell ── */
function RequireAdmin() {
  const { user, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!user || !isAdmin) {
    return <Navigate to="/admine/login" state={{ from: location }} replace />;
  }
  return <AdminLayout />;
}

function App() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* ── Admin redirect ── */}
        <Route path="/admin" element={<Navigate to="/admine" replace />} />

        {/* ── Admin login (no layout) ── */}
        <Route path="/admine/login" element={<LoginPage />} />

        {/* ── Admin panel (protected) ── */}
        <Route path="/admine" element={<RequireAdmin />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<Navigate to="/admine" replace />} />

          <Route path="admissions" element={<AdmissionsListPage />} />
          <Route path="admissions/:id" element={<AdmissionDetailPage />} />
          <Route path="students" element={<StudentsListPage />} />
          <Route path="students/:id" element={<StudentDetailPage />} />
          <Route path="teachers" element={<TeachersListPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="exams" element={<ExamsListPage />} />
          <Route path="exams/:examId/results" element={<ResultsEntryPage />} />
          <Route path="notices" element={<NoticesListPage />} />
          <Route path="gallery" element={<GalleryListPage />} />
          <Route path="faq" element={<FAQListPage />} />
          <Route path="contact" element={<ContactMessagesPage />} />
          <Route path="payments" element={<PaymentsListPage />} />
          <Route path="invoices" element={<InvoicesListPage />} />
          <Route path="expenses" element={<ExpensesListPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="users" element={<UsersListPage />} />

          {/* Old menu links → new pages */}
          <Route path="fees" element={<Navigate to="/admine/invoices" replace />} />
          <Route path="faqs" element={<Navigate to="/admine/faq" replace />} />
          <Route path="contacts" element={<Navigate to="/admine/contact" replace />} />
          <Route path="admins" element={<Navigate to="/admine/users" replace />} />
          <Route path="results" element={<Navigate to="/admine/exams" replace />} />
          <Route path="classes" element={<Navigate to="/admine" replace />} />
          <Route path="logs" element={<Navigate to="/admine" replace />} />
          <Route path="backup" element={<Navigate to="/admine" replace />} />
        </Route>

        {/* ── Public site ── */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/school-info" element={<SchoolInfoPage />} />
          <Route path="/admission" element={<AdmissionPage />} />
          <Route path="/admission/status" element={<AdmissionStatusPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/notices" element={<NoticesPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/faq" element={<FAQPage />} />
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
