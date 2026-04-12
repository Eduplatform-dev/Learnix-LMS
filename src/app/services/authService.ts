export type UserRole = "student" | "admin" | "instructor";

export type User = {
  _id:      string;
  email:    string;
  username: string;
  role:     UserRole;
};

export type AuthResponse = {
  user:  User;
  token: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API = `${API_BASE_URL}/api/auth`;

/* ─── TOKEN HELPERS ─────────────────────────────────────── */
export const getToken = (): string | null => localStorage.getItem("token");

/** Returns auth + JSON content-type headers */
export const getAuthHeader = (): Record<string, string> => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Auth header WITHOUT Content-Type.
 * Use when sending FormData — browser sets the multipart boundary automatically.
 */
export const getAuthHeaderNoContentType = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* ─── RESPONSE HANDLER ─────────────────────────────────── */
const handleAuthResponse = async (res: Response): Promise<AuthResponse> => {
  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server error (${res.status})`);
  }
  if (!res.ok) {
    throw new Error((data.error as string) || `Request failed (${res.status})`);
  }
  if (data.token && data.user) {
    localStorage.setItem("token", data.token as string);
    localStorage.setItem("user",  JSON.stringify(data.user));
  }
  return { user: data.user as User, token: data.token as string };
};

/* ─── REGISTER ─────────────────────────────────────────── */
export const registerUser = async (
  email:    string,
  password: string,
  username: string,
  role:     UserRole = "student"
): Promise<AuthResponse> => {
  const res = await fetch(`${API}/register`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password, username, role }),
  });
  return handleAuthResponse(res);
};

/* ─── LOGIN ────────────────────────────────────────────── */
export const loginUser = async (
  email:    string,
  password: string
): Promise<AuthResponse> => {
  const res = await fetch(`${API}/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password }),
  });
  return handleAuthResponse(res);
};

/* ─── CURRENT USER ─────────────────────────────────────── */
export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem("user");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
};

/* ─── LOGOUT ───────────────────────────────────────────── */
export const logoutUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};