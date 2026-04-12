import { getAuthHeader } from "./authService";

export type AssignmentStatus   = "Not Started" | "In Progress" | "Submitted";
export type AssignmentPriority = "high" | "medium" | "low";
export type AssignmentType     = "Project" | "Quiz" | "Lab";

export type Assignment = {
  _id:         string;
  title:       string;
  description: string;
  course:      string | { _id: string; title: string };
  dueDate:     string;
  maxMarks:    number;
  type:        AssignmentType;
  status:      AssignmentStatus;
  priority:    AssignmentPriority;
  instructor:  string | { _id: string; username: string };
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API          = `${API_BASE_URL}/api/assignments`;

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

/* ─── GET ALL ────────────────────────────────────────────── */
export const getAssignments = async (params?: {
  course?: string;
  status?: string;
}): Promise<Assignment[]> => {
  const qs = new URLSearchParams();
  if (params?.course) qs.set("course", params.course);
  if (params?.status) qs.set("status", params.status);

  const url = `${API}${qs.toString() ? "?" + qs : ""}`;
  const res = await fetch(url, { headers: getAuthHeader() });
  return handle<Assignment[]>(res);
};

/* ─── GET BY ID ──────────────────────────────────────────── */
export const getAssignmentById = async (id: string): Promise<Assignment> => {
  const res = await fetch(`${API}/${id}`, { headers: getAuthHeader() });
  return handle<Assignment>(res);
};

/* ─── CREATE ─────────────────────────────────────────────── */
export const createAssignment = async (data: {
  title:        string;
  description?: string;
  course?:      string;
  dueDate:      string;
  maxMarks?:    number;
}): Promise<Assignment> => {
  const res = await fetch(API, {
    method:  "POST",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<Assignment>(res);
};

/* ─── UPDATE ─────────────────────────────────────────────── */
export const updateAssignmentStatus = async (
  id:   string,
  data: Partial<Assignment>
): Promise<Assignment> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "PUT",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<Assignment>(res);
};

/* ─── DELETE ─────────────────────────────────────────────── */
export const deleteAssignment = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || "Delete failed");
  }
};