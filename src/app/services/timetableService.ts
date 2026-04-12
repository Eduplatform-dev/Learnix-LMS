import { getAuthHeader } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API = `${API_BASE_URL}/api/timetable`;

const handle = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Request failed (${res.status})`);
  return data as T;
};

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
export type SlotType  = "lecture" | "lab" | "tutorial" | "break" | "free";

export type TimetableSlot = {
  _id?: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  subject: string;
  subjectCode: string;
  instructor: { _id: string; username: string } | string | null;
  room: string;
  type: SlotType;
  color: string;
};

export type Timetable = {
  _id: string;
  department: { _id: string; name: string; code: string } | null;
  year: number;
  division: string;
  academicYear: string;
  semester: number;
  slots: TimetableSlot[];
  isPublished: boolean;
  createdBy: { username: string } | null;
  createdAt: string;
};

export const getTimetables = async (params?: {
  department?: string;
  year?: number;
  division?: string;
  semester?: number;
  academicYear?: string;
}): Promise<Timetable[]> => {
  const qs = new URLSearchParams();
  if (params?.department)   qs.set("department",   params.department);
  if (params?.year)         qs.set("year",         String(params.year));
  if (params?.division)     qs.set("division",     params.division);
  if (params?.semester)     qs.set("semester",     String(params.semester));
  if (params?.academicYear) qs.set("academicYear", params.academicYear);
  const res = await fetch(`${API}${qs.toString() ? "?" + qs : ""}`, { headers: getAuthHeader() });
  return handle<Timetable[]>(res);
};

export const getTimetableById = async (id: string): Promise<Timetable> => {
  const res = await fetch(`${API}/${id}`, { headers: getAuthHeader() });
  return handle<Timetable>(res);
};

export const createOrUpdateTimetable = async (data: {
  department: string;
  year: number;
  division?: string;
  academicYear: string;
  semester: number;
  slots: TimetableSlot[];
  isPublished?: boolean;
}): Promise<Timetable> => {
  const res = await fetch(API, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify(data),
  });
  return handle<Timetable>(res);
};

export const updateTimetable = async (id: string, data: Partial<Timetable>): Promise<Timetable> => {
  const res = await fetch(`${API}/${id}`, {
    method: "PUT",
    headers: getAuthHeader(),
    body: JSON.stringify(data),
  });
  return handle<Timetable>(res);
};

export const publishTimetable = async (id: string, isPublished: boolean): Promise<Timetable> => {
  const res = await fetch(`${API}/${id}/publish`, {
    method: "PATCH",
    headers: getAuthHeader(),
    body: JSON.stringify({ isPublished }),
  });
  return handle<Timetable>(res);
};

export const deleteTimetable = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}`, { method: "DELETE", headers: getAuthHeader() });
  if (!res.ok) throw new Error("Delete failed");
};
