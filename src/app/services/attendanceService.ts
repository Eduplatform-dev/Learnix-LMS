import { getAuthHeader } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API = `${API_BASE_URL}/api/attendance`;

const handle = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Request failed (${res.status})`);
  return data as T;
};

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type AttendanceRecord = {
  student: string;
  status: AttendanceStatus;
};

export type AttendanceSession = {
  _id: string;
  course: { _id: string; title: string } | null;
  date: string;
  records: AttendanceRecord[];
  lectureType: "lecture" | "lab" | "tutorial";
  topic: string;
  markedBy: { username: string } | null;
};

export type SubjectSummary = {
  courseId: string | null;
  name: string;
  code: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
  shortage: boolean;
  sessions: { date: string; status: AttendanceStatus; topic: string; type: string }[];
};

export type MyAttendance = {
  subjects: SubjectSummary[];
  overallPercentage: number;
};

export type StudentReport = {
  student: { _id: string; username: string; email: string };
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
  shortage: boolean;
};

export type CourseReport = {
  course: { _id: string; title: string };
  totalSessions: number;
  students: StudentReport[];
};

/* ── Student ─── */
export const getMyAttendance = async (): Promise<MyAttendance> => {
  const res = await fetch(`${API}/my`, { headers: getAuthHeader() });
  return handle<MyAttendance>(res);
};

/* ── Instructor / Admin ─── */
export const getCourseAttendanceSessions = async (courseId: string): Promise<AttendanceSession[]> => {
  const res = await fetch(`${API}/course/${courseId}`, { headers: getAuthHeader() });
  return handle<AttendanceSession[]>(res);
};

export const getCourseReport = async (courseId: string): Promise<CourseReport> => {
  const res = await fetch(`${API}/report/${courseId}`, { headers: getAuthHeader() });
  return handle<CourseReport>(res);
};

export const markAttendance = async (data: {
  courseId: string;
  date: string;
  records: AttendanceRecord[];
  lectureType?: string;
  topic?: string;
  department?: string;
  year?: number;
}): Promise<AttendanceSession> => {
  const res = await fetch(API, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify(data),
  });
  return handle<AttendanceSession>(res);
};

export const deleteAttendanceSession = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}`, { method: "DELETE", headers: getAuthHeader() });
  if (!res.ok) throw new Error("Delete failed");
};
