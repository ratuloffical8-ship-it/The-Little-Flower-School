// src/App.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '@/layouts/PublicLayout';
import AdminLayout from '@/layouts/AdminLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProtectedRoute from '@/components/ProtectedRoute';

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
const LoginPage = lazy(() => import('@/pages/admin/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const AdmissionsPage = lazy(() => import('@/pages/admin/AdmissionsPage'));
const AdmissionDetailPage = lazy(() => import('@/pages/admin/AdmissionDetailPage'));
const StudentsPage = lazy(() => import('@/pages/admin/StudentsPage'));
const StudentDetailPage = lazy(() => import('@/pages/admin/StudentDetailPage'));
const ClassesPage = lazy(() => import('@/pages/admin/ClassesPage'));
const TeachersPage = lazy(() => import('@/pages/admin/TeachersPage'));
const AttendancePage = lazy(() => import('@/pages/admin/AttendancePage'));
const ExamsPage = lazy(() => import('@/pages/admin/ExamsPage'));
const ResultsAdminPage = lazy(() => import('@/pages/admin/ResultsAdminPage'));
const FeesPage = lazy(() => import('@/pages/admin/FeesPage'));
const PaymentVerificationPage = lazy(() => import('@/pages/admin/PaymentVerificationPage'));
const ExpensesPage = lazy(() => import('@/pages/admin/ExpensesPage'));
const NoticesAdminPage = lazy(() => import('@/pages/admin/NoticesAdminPage'));
const FAQsAdminPage = lazy(() => import('@/pages/admin/FAQsAdminPage'));
const GalleryAdminPage = lazy(() => import('@/pages/admin/GalleryAdminPage'));
const ContactMessagesPage = lazy(() => import('@/pages/admin/ContactMessagesPage'));
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AuditLogsPage = lazy(() => import('@/pages/admin/AuditLogsPage'));
const BackupPage = lazy(() => import('@/pages/admin/BackupPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* ── Admin redirect ── */}
        <Route path="/admin" element={<Navigate to="/admine" replace />} />

        {/* ── Admin login (no layout) ── */}
        <Route path="/admine" element={<LoginPage />} />

        {/* ── Admin panel (protected) ── */}
        <Route
          path="/admine/*"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="admissions" element={<AdmissionsPage />} />
          <Route path="admissions/:id" element={<AdmissionDetailPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/:id" element={<StudentDetailPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="results" element={<ResultsAdminPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="payments" element={<PaymentVerificationPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="notices" element={<NoticesAdminPage />} />
          <Route path="faqs" element={<FAQsAdminPage />} />
          <Route path="gallery" element={<GalleryAdminPage />} />
          <Route path="contacts" element={<ContactMessagesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admins" element={<AdminUsersPage />} />
          <Route path="logs" element={<AuditLogsPage />} />
          <Route path="backup" element={<BackupPage />} />
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
