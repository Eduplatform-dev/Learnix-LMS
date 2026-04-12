import { getAuthHeader, getAuthHeaderNoContentType } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API          = `${API_BASE_URL}/api/content`;

export type ContentType = "pdf" | "video" | "image" | "document" | "other";

export type Content = {
  _id:        string;
  title:      string;
  type:       ContentType;
  url:        string;
  course:     string;
  uploadedBy: string;
  createdAt:  string;
};

const handle = async <T>(res: Response): Promise<T> => {
  let data: Record<string, unknown>;
  try { data = await res.json(); } catch { throw new Error(`Server error (${res.status})`); }
  if (!res.ok) throw new Error((data.error as string) || `Request failed (${res.status})`);
  return data as T;
};

/* ─── GET ALL ─────────────────────────────────────────────── */
export const getContent = async (): Promise<Content[]> => {
  const res = await fetch(`${API}?limit=100`, { headers: getAuthHeader() });
  const data = await handle<Content[] | { content: Content[] }>(res);
  return Array.isArray(data) ? data : (data as any).content ?? [];
};

export const getContents = getContent;

/* ─── GET BY COURSE ───────────────────────────────────────── */
export const getCourseContents = async (courseId: string): Promise<Content[]> => {
  const res = await fetch(`${API}/course/${courseId}`, { headers: getAuthHeader() });
  const data = await handle<Content[] | { content: Content[] }>(res);
  return Array.isArray(data) ? data : (data as any).content ?? [];
};

/* ─── GET SINGLE ──────────────────────────────────────────── */
export const getContentById = async (id: string): Promise<Content> => {
  const res = await fetch(`${API}/${id}`, { headers: getAuthHeader() });
  return handle<Content>(res);
};

/* ─── CREATE ──────────────────────────────────────────────── */
export const createContent = async (
  data: FormData | { title: string; course?: string; file: File }
): Promise<Content> => {
  let form: FormData;
  if (data instanceof FormData) {
    form = data;
  } else {
    form = new FormData();
    form.append("title", data.title);
    form.append("file",  data.file);
    if (data.course) form.append("course", data.course);
  }

  const res = await fetch(API, {
    method:  "POST",
    headers: getAuthHeaderNoContentType(),
    body:    form,
  });
  return handle<Content>(res);
};

export const uploadContent = createContent;

/* ─── UPDATE ──────────────────────────────────────────────── */
export const updateContent = async (
  id:   string,
  data: Partial<Pick<Content, "title" | "course">>
): Promise<Content> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "PUT",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<Content>(res);
};

/* ─── DELETE ──────────────────────────────────────────────── */
export const deleteContent = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || "Delete failed");
  }
};