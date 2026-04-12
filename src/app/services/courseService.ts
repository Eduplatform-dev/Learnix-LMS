import { getAuthHeader } from "./authService";

export type CourseStatus   = "In Progress" | "Completed" | "Not Started" | "active" | "archived";
export type CourseType     = "academic" | "private";
export type ApprovalStatus = "pending_approval" | "approved" | "rejected";

export type Course = {
  _id:              string;
  title:            string;
  instructor:       string | { _id: string; username: string; email: string };
  duration:         string;
  students:         number;
  rating:           number;
  progress:         number;
  status:           CourseStatus;
  image:            string;
  // FIX: always an array of plain string IDs after normalisation
  // so Courses.tsx `isEnrolled` check (.includes(currentUserId)) works correctly
  enrolledStudents: string[];
  description?:     string;
  courseType:       CourseType;
  isFree:           boolean;
  price:            number;
  approvalStatus:   ApprovalStatus;
  rejectionNote?:   string;
  department?:      any;
  semesterNumber?:  number | null;
  subjectCode?:     string;
  credits?:         number;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API          = `${API_BASE_URL}/api/courses`;

/**
 * FIX: normalise enrolledStudents to plain string IDs regardless of whether
 * the server returned them as populated objects or bare ObjectId strings.
 * This ensures Courses.tsx `isEnrolled` check works with .includes().
 */
const normaliseCourse = (c: any): Course => ({
  _id:        c._id,
  title:      c.title       || "",
  instructor: typeof c.instructor === "object" && c.instructor !== null
    ? c.instructor
    : (c.instructor || ""),
  duration:   c.duration    || "",
  students:   c.enrolledStudents?.length ?? c.students ?? 0,
  rating:     c.rating      ?? 4.5,
  progress:   c.progress    ?? 0,
  status:     c.status      || "active",
  image:      c.image       || "",
  // Always extract to string _id — handles both ObjectId strings and populated objects
  enrolledStudents: Array.isArray(c.enrolledStudents)
    ? c.enrolledStudents.map((s: any) =>
        typeof s === "string" ? s :
        (s?._id ? String(s._id) : String(s))
      )
    : [],
  description:    c.description     || "",
  courseType:     c.courseType      || "private",
  isFree:         c.isFree          ?? true,
  price:          c.price           ?? 0,
  approvalStatus: c.approvalStatus  || "pending_approval",
  rejectionNote:  c.rejectionNote   || "",
  department:     c.department      ?? null,
  semesterNumber: c.semesterNumber  ?? null,
  subjectCode:    c.subjectCode     || "",
  credits:        c.credits         ?? 0,
});

export const getCourses = async (): Promise<Course[]> => {
  const res = await fetch(`${API}?limit=100`, { headers: getAuthHeader() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || "Failed to fetch courses");
  }
  const data  = await res.json();
  const raw: any[] = Array.isArray(data) ? data : (data.courses ?? []);
  return raw.map(normaliseCourse);
};

export const getCourseById = async (id: string): Promise<Course> => {
  const res = await fetch(`${API}/${id}`, { headers: getAuthHeader() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || "Failed to fetch course");
  }
  return normaliseCourse(await res.json());
};

export const createCourse = async (data: {
  title:           string;
  duration:        string;
  description?:    string;
  courseType?:     CourseType;
  isFree?:         boolean;
  price?:          number;
  department?:     string | null;
  semesterNumber?: number | null;
  subjectCode?:    string;
  credits?:        number;
}): Promise<Course> => {
  const res = await fetch(API, {
    method:  "POST",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || "Create failed");
  }
  return normaliseCourse(await res.json());
};

export const updateCourse = async (
  id:   string,
  data: Partial<Course>
): Promise<Course> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "PUT",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || "Update failed");
  }
  return normaliseCourse(await res.json());
};

export const deleteCourse = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || "Delete failed");
  }
};

export const enrollInCourse = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}/enroll`, {
    method:  "POST",
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error || "Enroll failed");
  }
};