import { getAuthHeader, getAuthHeaderNoContentType } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API          = `${API_BASE_URL}/api/submissions`;

export type SubmissionStatus = "draft" | "submitted" | "graded";

export type Submission = {
  _id:             string;
  assignmentId:    string;
  assignmentTitle: string;
  course:          string;
  studentId:       string;
  studentName:     string;
  title:           string;
  description:     string;
  text:            string;
  files:           { originalName: string; filename: string; url: string; size: number }[];
  grade:           string | null;
  feedback:        string;
  gradedAt:        string | null;
  status:          SubmissionStatus;
  createdAt:       string;
  updatedAt:       string;
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

/* ─── GET SUBMISSIONS ─────────────────────────────────── */
export const getSubmissions = async (params?: {
  assignmentId?: string;
  status?:       SubmissionStatus;
}): Promise<Submission[]> => {
  const qs = new URLSearchParams();
  if (params?.assignmentId) qs.set("assignmentId", params.assignmentId);
  if (params?.status)       qs.set("status",       params.status);

  const url = `${API}${qs.toString() ? "?" + qs : ""}`;
  const res = await fetch(url, { headers: getAuthHeader() });
  const data = await handle<Submission[] | { submissions: Submission[] }>(res);
  return Array.isArray(data) ? data : (data as any).submissions ?? [];
};

/* ─── GET SINGLE ──────────────────────────────────────── */
export const getSubmissionById = async (id: string): Promise<Submission> => {
  const res = await fetch(`${API}/${id}`, { headers: getAuthHeader() });
  return handle<Submission>(res);
};

/* ─── CREATE SUBMISSION ───────────────────────────────── */
export const createSubmission = async (
  data: FormData | {
    assignmentId: string;
    title?:       string;
    description?: string;
    text?:        string;
    files?:       File[];
    status?:      SubmissionStatus;
  }
): Promise<Submission> => {
  let formData: FormData;
  if (data instanceof FormData) {
    formData = data;
  } else {
    formData = new FormData();
    formData.append("assignmentId", data.assignmentId);
    if (data.title)       formData.append("title",       data.title);
    if (data.description) formData.append("description", data.description);
    if (data.text)        formData.append("text",        data.text);
    if (data.status)      formData.append("status",      data.status);
    data.files?.forEach((f) => formData.append("files", f));
  }

  const res = await fetch(API, {
    method:  "POST",
    headers: getAuthHeaderNoContentType(),
    body:    formData,
  });
  return handle<Submission>(res);
};

/* ─── GRADE SUBMISSION ────────────────────────────────── */
export const gradeSubmission = async (
  id:   string,
  data: { grade: string; feedback?: string }
): Promise<Submission> => {
  const res = await fetch(`${API}/${id}/grade`, {
    method:  "PATCH",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<Submission>(res);
};

/* ─── DELETE SUBMISSION ───────────────────────────────── */
export const deleteSubmission = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || "Delete failed");
  }
};