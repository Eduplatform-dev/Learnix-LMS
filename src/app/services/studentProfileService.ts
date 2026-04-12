import { getAuthHeader } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API          = `${API_BASE_URL}/api/profiles`;

/* ── Types ─────────────────────────────────────────────────── */
export type Address = {
  street:  string;
  city:    string;
  state:   string;
  // FIX: model uses 'pincode' (lowercase), not 'pinCode'
  pincode: string;
  country?: string;
};

export type Guardian = {
  name:         string;
  occupation:   string;
  phone:        string;
  email:        string;
  annualIncome?: number;
};

// FIX: field names now match StudentProfile Mongoose model exactly
export type StudentProfile = {
  _id:    string;
  user:   { _id: string; username: string; email: string } | string;

  // Personal — matches model field names
  fullName:     string;
  enrollmentNumber: string | null;
  dateOfBirth:  Date | string | null;
  gender:       string;
  bloodGroup:   string;
  // FIX: model uses 'phoneNumber', not 'phone'
  phoneNumber:  string;
  // FIX: model uses 'photo', not 'photoUrl'
  photo:        string;

  // Address — model uses nested { street, city, state, pincode }
  address: Address;

  // Parent / Guardian — model uses flat fields, not father/mother objects
  parentName:       string;
  parentPhone:      string;
  parentEmail:      string;
  parentOccupation: string;

  // Academic
  department:    { _id: string; name: string; code: string } | null;
  semester:      { _id: string; name: string; academicYear: string } | null;
  year:          number | null;
  division:      string;
  rollNumber:    string;
  admissionYear: number | null;
  category:      string;

  // Status
  isSubmitted:  boolean;
  submittedAt:  string | null;
  createdAt:    string;
  updatedAt:    string;
};

export type ProfilesResponse = {
  profiles: StudentProfile[];
  total:    number;
  page:     number;
};

/* ── Helpers ─────────────────────────────────────────────── */
const handle = async <T>(res: Response): Promise<T> => {
  let data: Record<string, unknown>;
  try { data = await res.json(); }
  catch { throw new Error(`Server error (${res.status})`); }
  if (!res.ok) throw new Error((data.error as string) || `Request failed (${res.status})`);
  return data as T;
};

/* ── Student: own profile ───────────────────────────────── */
export const getMyProfile = async (): Promise<StudentProfile | null> => {
  const res = await fetch(`${API}/student/me`, { headers: getAuthHeader() });
  if (res.status === 404) return null;
  return handle<StudentProfile>(res);
};

/**
 * FIX: Submission (POST /api/profiles/student) locks the profile permanently.
 * This function is for the one-time onboarding form only.
 * For subsequent updates, use updateMyProfile (PUT via admin endpoint).
 */
export const submitOnboardingProfile = async (
  data: Partial<StudentProfile>
): Promise<StudentProfile> => {
  const res = await fetch(`${API}/student`, {
    method:  "POST",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<StudentProfile>(res);
};

/**
 * FIX: updateMyProfile now calls PUT /api/profiles/students/:userId
 * instead of re-POSTing to the submission endpoint (which locks the profile).
 * Requires the user's own _id.
 */
export const updateMyProfile = async (
  userId: string,
  data: Partial<StudentProfile>
): Promise<StudentProfile> => {
  const res = await fetch(`${API}/students/${userId}`, {
    method:  "PUT",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<StudentProfile>(res);
};

/* ── Admin / Instructor: view a student ─────────────────── */
export const getProfileByUserId = async (
  userId: string
): Promise<StudentProfile> => {
  const res = await fetch(`${API}/students/${userId}`, { headers: getAuthHeader() });
  return handle<StudentProfile>(res);
};

/* ── Admin: list all profiles ────────────────────────────── */
export const getAllProfiles = async (params?: {
  page?:       number;
  limit?:      number;
  department?: string;
  year?:       number;
}): Promise<ProfilesResponse> => {
  const qs = new URLSearchParams();
  if (params?.page)       qs.set("page",       String(params.page));
  if (params?.limit)      qs.set("limit",      String(params.limit));
  if (params?.department) qs.set("department", params.department);
  if (params?.year)       qs.set("year",       String(params.year));

  const url = `${API}/students${qs.toString() ? "?" + qs : ""}`;
  const res = await fetch(url, { headers: getAuthHeader() });
  return handle<ProfilesResponse>(res);
};

/* ── Admin: update a student's profile ──────────────────── */
export const adminUpdateProfile = async (
  userId: string,
  data:   Partial<StudentProfile>
): Promise<StudentProfile> => {
  const res = await fetch(`${API}/students/${userId}`, {
    method:  "PUT",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<StudentProfile>(res);
};