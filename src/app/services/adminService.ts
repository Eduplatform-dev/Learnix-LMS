import { getAuthHeader } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API          = `${API_BASE_URL}/api/admin`;

const handle = async <T>(res: Response): Promise<T> => {
  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server error (${res.status})`);
  }
  if (!res.ok) throw new Error((data.error as string) || `Request failed (${res.status})`);
  return data as T;
};

/* ─── TYPES ──────────────────────────────────────────── */
export type DashboardData = {
  stats: {
    students:       number;  // only role=student, no admins
    courses:        number;
    revenue:        number;
    completionRate: number;
  };
  enrollmentData: { month: string; students: number }[];
};

export type AnalyticsData = {
  monthlyGrowth:   { month: string; users: number }[];
  userEngagement:  { day: string; active: number }[];
  courseRatings:   { name: string; rating: number; students: number }[];
  completionRates: { name: string; value: number }[];
  trafficSources:  { source: string; visits: number }[];
  kpiMetrics:      { label: string; value: number }[];
  counts?: {
    students:    number;
    instructors: number;
    totalUsers:  number;
    courses:     number;
    submissions: number;
  };
};

export type Settings = {
  general:       { platformName: string; supportEmail: string; logoUrl: string };
  notifications: { emailUpdates: boolean; productUpdates: boolean; billingAlerts: boolean };
  security:      { enforceTwoFactor: boolean; allowGoogleLogin: boolean; sessionTimeout: string };
  localization:  { language: string; timezone: string; dateFormat: string };
  emailConfig:   { smtpHost: string; smtpPort: string; smtpUser: string; fromName: string; fromEmail: string; footer: string };
  backup:        { autoBackup: boolean; retentionDays: string; backupWindow: string };
};

/* ─── DASHBOARD ──────────────────────────────────────── */
export const getDashboardData = async (): Promise<DashboardData> => {
  const res = await fetch(`${API}/dashboard`, { headers: getAuthHeader() });
  return handle<DashboardData>(res);
};

/* ─── ANALYTICS ──────────────────────────────────────── */
export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  const res = await fetch(`${API}/analytics`, { headers: getAuthHeader() });
  return handle<AnalyticsData>(res);
};

/* ─── STATS ──────────────────────────────────────────── */
export const getAdminStats = async () => {
  const res = await fetch(`${API}/stats`, { headers: getAuthHeader() });
  return handle<Record<string, number>>(res);
};

/* ─── FEES STATS ─────────────────────────────────────── */
export const getFeesStats = async () => {
  const res = await fetch(`${API}/fees-stats`, { headers: getAuthHeader() });
  return handle<{ totalRevenue: number; pendingPayments: number; paidStudents: number; growthRate: number }>(res);
};

/* ─── SETTINGS ───────────────────────────────────────── */
export const getSettings = async (): Promise<Settings> => {
  const res = await fetch(`${API}/settings`, { headers: getAuthHeader() });
  return handle<Settings>(res);
};

export const saveSettings = async (data: Settings): Promise<Settings> => {
  const res = await fetch(`${API}/settings`, {
    method:  "POST",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<Settings>(res);
};