import { getAuthHeader } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API          = `${API_BASE_URL}/api/fees`;

export type FeeStatus   = "paid" | "pending" | "overdue";
export type FeeCategory = "tuition" | "lab" | "technology" | "certification" | "other";

export type Fee = {
  _id:         string;
  description: string;
  amount:      number;
  status:      FeeStatus;
  dueDate:     string;
  paidAt:      string | null;
  invoice:     string;
  semester:    string;
  category:    FeeCategory;
  createdAt:   string;
};

export type MyFeesResponse = {
  fees:         Fee[];
  totalPaid:    number;
  totalPending: number;
  nextFee:      Fee | null;
};

export type AllFeesResponse = {
  fees:            Fee[];
  totalRevenue:    number;
  pendingPayments: number;
  total:           number;
  page:            number;
};

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

/* ─── STUDENT: get own fees ──────────────────────────── */
export const getMyFees = async (): Promise<MyFeesResponse> => {
  const res = await fetch(`${API}/my`, { headers: getAuthHeader() });
  return handle<MyFeesResponse>(res);
};

/* ─── STUDENT/ADMIN: mark as paid ───────────────────── */
export const markFeePaid = async (id: string): Promise<Fee> => {
  const res = await fetch(`${API}/${id}/pay`, {
    method:  "PATCH",
    headers: getAuthHeader(),
  });
  return handle<Fee>(res);
};

/* ─── ADMIN: get all fees ────────────────────────────── */
export const getAllFees = async (params?: {
  page?:      number;
  limit?:     number;
  status?:    FeeStatus;
  studentId?: string;
}): Promise<AllFeesResponse> => {
  const qs = new URLSearchParams();
  if (params?.page)      qs.set("page",      String(params.page));
  if (params?.limit)     qs.set("limit",     String(params.limit));
  if (params?.status)    qs.set("status",    params.status);
  if (params?.studentId) qs.set("studentId", params.studentId);

  const url = `${API}${qs.toString() ? "?" + qs : ""}`;
  const res = await fetch(url, { headers: getAuthHeader() });
  return handle<AllFeesResponse>(res);
};

/* ─── ADMIN: create fee ──────────────────────────────── */
export const createFee = async (data: {
  studentId:   string;
  description: string;
  amount:      number;
  dueDate:     string;
  category?:   FeeCategory;
  semester?:   string;
}): Promise<Fee> => {
  const res = await fetch(API, {
    method:  "POST",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<Fee>(res);
};

/* ─── ADMIN: delete fee ──────────────────────────────── */
export const deleteFeeRecord = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || "Delete failed");
  }
};