import { getAuthHeader } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API          = `${API_BASE_URL}/api/academic-years`;

export type Semester = {
  _id:       string;
  number:    number;
  label:     string;
  startDate: string;
  endDate:   string;
  isActive:  boolean;
};

export type AcademicYear = {
  _id:       string;
  label:     string;
  startDate: string;
  endDate:   string;
  isCurrent: boolean;
  semesters: Semester[];
  createdAt: string;
};

const handle = async <T>(res: Response): Promise<T> => {
  let data: Record<string, unknown>;
  try { data = await res.json(); }
  catch { throw new Error(`Server error (${res.status})`); }
  if (!res.ok) throw new Error((data.error as string) || `Request failed (${res.status})`);
  return data as T;
};

export const getAcademicYears = async (): Promise<AcademicYear[]> => {
  const res = await fetch(API, { headers: getAuthHeader() });
  return handle<AcademicYear[]>(res);
};

export const getCurrentAcademicYear = async (): Promise<AcademicYear> => {
  const res = await fetch(`${API}/current`, { headers: getAuthHeader() });
  return handle<AcademicYear>(res);
};

export const createAcademicYear = async (data: {
  label:     string;
  startDate: string;
  endDate:   string;
  isCurrent?: boolean;
  semesters?: Omit<Semester, "_id">[];
}): Promise<AcademicYear> => {
  const res = await fetch(API, {
    method:  "POST",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<AcademicYear>(res);
};

export const updateAcademicYear = async (
  id:   string,
  data: Partial<AcademicYear>
): Promise<AcademicYear> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "PUT",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<AcademicYear>(res);
};

export const setCurrentYear = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}/set-current`, {
    method:  "PATCH",
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || "Failed");
  }
};

export const setActiveSemester = async (
  yearId:     string,
  semesterId: string
): Promise<void> => {
  const res = await fetch(
    `${API}/${yearId}/semesters/${semesterId}/set-active`,
    { method: "PATCH", headers: getAuthHeader() }
  );
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || "Failed");
  }
};

export const deleteAcademicYear = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || "Delete failed");
  }
};
