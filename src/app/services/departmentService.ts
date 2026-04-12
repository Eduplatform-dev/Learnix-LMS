import { getAuthHeader } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API          = `${API_BASE_URL}/api/departments`;

export type Department = {
  _id:          string;
  name:         string;
  code:         string;
  description:  string;
  hodId:        { _id: string; username: string; email: string } | null;
  totalIntake:  number;
  isActive:     boolean;
  studentCount?: number;
  courseCount?:  number;
  createdAt:    string;
};

const handle = async <T>(res: Response): Promise<T> => {
  let data: Record<string, unknown>;
  try { data = await res.json(); }
  catch { throw new Error(`Server error (${res.status})`); }
  if (!res.ok) throw new Error((data.error as string) || `Request failed (${res.status})`);
  return data as T;
};

/* ─── GET ALL (active only — for dropdowns) ─────────────── */
export const getDepartments = async (): Promise<Department[]> => {
  const res = await fetch(API, { headers: getAuthHeader() });
  return handle<Department[]>(res);
};

/* ─── GET ALL including inactive (admin) ─────────────────── */
export const getAllDepartments = async (): Promise<Department[]> => {
  const res = await fetch(`${API}/all`, { headers: getAuthHeader() });
  return handle<Department[]>(res);
};

/* ─── GET BY ID ───────────────────────────────────────────── */
export const getDepartmentById = async (id: string): Promise<Department> => {
  const res = await fetch(`${API}/${id}`, { headers: getAuthHeader() });
  return handle<Department>(res);
};

/* ─── CREATE ──────────────────────────────────────────────── */
export const createDepartment = async (data: {
  name:         string;
  code:         string;
  description?: string;
  hodId?:       string | null;
  totalIntake?: number;
}): Promise<Department> => {
  const res = await fetch(API, {
    method:  "POST",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<Department>(res);
};

/* ─── UPDATE ──────────────────────────────────────────────── */
export const updateDepartment = async (
  id:   string,
  data: Partial<Department>
): Promise<Department> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "PUT",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<Department>(res);
};

/* ─── DELETE (soft deactivate) ────────────────────────────── */
export const deleteDepartment = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || "Delete failed");
  }
};

/* ─── GET STUDENTS IN DEPT ────────────────────────────────── */
export const getDepartmentStudents = async (
  id:       string,
  semester?: number
): Promise<any[]> => {
  const url = semester
    ? `${API}/${id}/students?semester=${semester}`
    : `${API}/${id}/students`;
  const res = await fetch(url, { headers: getAuthHeader() });
  return handle<any[]>(res);
};
