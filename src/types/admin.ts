// src/types/admin.ts
import type { AdminRole, PermissionKey } from './index';

/* ── Admin User ── */

export interface AdminUser {
  uid: string; // Firebase Auth UID
  email: string;
  displayName?: string;
  role: AdminRole;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Auth State (frontend) ── */

export interface AuthState {
  user: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  } | null;
  role: AdminRole | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

/* ── Dashboard Stats ── */

export interface DashboardStats {
  activeStudents: number;
  newApplicationsThisMonth: number;
  awaitingReview: number;
  todayAttendanceRate: number; // percentage
  outstandingFees: number;
  verifiedCollectionsThisMonth: number;
  monthlyIncome: number;
  monthlyExpense: number;
  recentActivities: RecentActivity[];
}

export interface RecentActivity {
  id: string;
  action: string;
  actorEmail: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
}

/* ── Stats Aggregate Doc (Firestore) ── */

export interface StatsAggregate {
  id: string; // e.g. "global", "session_2025"
  activeStudents: number;
  totalApplications: number;
  pendingApplications: number;
  totalRevenue: number;
  totalExpenses: number;
  lastUpdated: string;
}

/* ── Permission Matrix ── */

export type PermissionMatrix = Record<AdminRole, PermissionKey[]>;

/* ── Login Request/Response ── */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  uid: string;
  email: string;
  role: AdminRole;
  token: string;
}
