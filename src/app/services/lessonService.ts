import { getAuthHeader, getAuthHeaderNoContentType } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API = `${API_BASE_URL}/api/lessons`;

export type LessonType = "video" | "pdf" | "text" | "quiz";

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

export type Lesson = {
  _id: string;
  title: string;
  description: string;
  course: string;
  type: LessonType;
  contentUrl: string;
  textContent: string;
  duration: number;
  quiz: QuizQuestion[];
  order: number;
  isPreview: boolean;
  uploadedBy: string;
  createdAt: string;
  completed?: boolean;
};

export type CourseProgress = {
  completedLessons: string[];
  lastLessonId: string | null;
  completedAt: string | null;
  completedCount: number;
  total: number;
  percent: number;
};

export type LessonsResponse = {
  lessons: Lesson[];
  progress: CourseProgress | null;
};

const handle = async <T>(res: Response): Promise<T> => {
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server error (${res.status})`);
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
};

/* ─── GET LESSONS FOR A COURSE ─────────────────────── */
export const getCourseLessons = async (courseId: string): Promise<LessonsResponse> => {
  const res = await fetch(`${API}/course/${courseId}`, { headers: getAuthHeader() });
  return handle<LessonsResponse>(res);
};

/* ─── GET SINGLE LESSON ─────────────────────────────── */
export const getLessonById = async (id: string): Promise<Lesson> => {
  const res = await fetch(`${API}/${id}`, { headers: getAuthHeader() });
  return handle<Lesson>(res);
};

/* ─── CREATE LESSON (form data for file upload) ─────── */
export const createLesson = async (courseId: string, data: FormData | Record<string, any>): Promise<Lesson> => {
  let body: FormData | string;
  let headers: Record<string, string>;

  if (data instanceof FormData) {
    body = data;
    headers = getAuthHeaderNoContentType();
  } else {
    body = JSON.stringify(data);
    headers = getAuthHeader();
  }

  const res = await fetch(`${API}/course/${courseId}`, {
    method: "POST",
    headers,
    body,
  });
  return handle<Lesson>(res);
};

/* ─── UPDATE LESSON ─────────────────────────────────── */
export const updateLesson = async (id: string, data: FormData | Partial<Lesson>): Promise<Lesson> => {
  let body: FormData | string;
  let headers: Record<string, string>;

  if (data instanceof FormData) {
    body = data;
    headers = getAuthHeaderNoContentType();
  } else {
    body = JSON.stringify(data);
    headers = getAuthHeader();
  }

  const res = await fetch(`${API}/${id}`, {
    method: "PUT",
    headers,
    body,
  });
  return handle<Lesson>(res);
};

/* ─── DELETE LESSON ─────────────────────────────────── */
export const deleteLesson = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || "Delete failed");
  }
};

/* ─── REORDER LESSONS ───────────────────────────────── */
export const reorderLessons = async (courseId: string, orderedIds: string[]): Promise<Lesson[]> => {
  const res = await fetch(`${API}/course/${courseId}/reorder`, {
    method: "PUT",
    headers: getAuthHeader(),
    body: JSON.stringify({ orderedIds }),
  });
  return handle<Lesson[]>(res);
};

/* ─── MARK LESSON COMPLETE ──────────────────────────── */
export const markLessonComplete = async (lessonId: string): Promise<CourseProgress> => {
  const res = await fetch(`${API}/${lessonId}/complete`, {
    method: "POST",
    headers: getAuthHeader(),
  });
  return handle<CourseProgress>(res);
};

/* ─── GET MY PROGRESS ───────────────────────────────── */
export const getCourseProgress = async (courseId: string): Promise<CourseProgress> => {
  const res = await fetch(`${API}/course/${courseId}/my-progress`, {
    headers: getAuthHeader(),
  });
  return handle<CourseProgress>(res);
};