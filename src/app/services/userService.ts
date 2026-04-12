import { getAuthHeader } from "./authService";

export type UserRole = "student" | "admin" | "instructor";

export type AdminUser = {
  _id:      string;
  email:    string;
  username: string;
  role:     UserRole;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API          = `${API_BASE_URL}/api/users`;

const handle = async <T>(res: Response): Promise<T> => {
  let data: Record<string, unknown>;
  try { data = await res.json(); }
  catch { throw new Error(`Server error (${res.status})`); }
  if (!res.ok) throw new Error((data.error as string) || "Request failed");
  return data as T;
};

/* ─── GET ALL ─────────────────────────────────────────── */
export const getUsers = async (): Promise<AdminUser[]> => {
  const res = await fetch(API, { headers: getAuthHeader() });
  return handle<AdminUser[]>(res);
};

/* ─── CREATE ──────────────────────────────────────────── */
export const createUserDoc = async (data: {
  email:     string;
  password:  string;
  username:  string;
  role?:     UserRole;
}): Promise<AdminUser> => {
  const res = await fetch(API, {
    method:  "POST",
    headers: getAuthHeader(),
    body:    JSON.stringify(data),
  });
  return handle<AdminUser>(res);
};

/* ─── UPDATE ROLE ─────────────────────────────────────── */
export const updateUserRole = async (
  id:   string,
  role: UserRole
): Promise<AdminUser> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "PATCH",
    headers: getAuthHeader(),
    body:    JSON.stringify({ role }),
  });
  return handle<AdminUser>(res);
};

/* ─── DELETE ──────────────────────────────────────────── */
export const deleteUser = async (id: string): Promise<boolean> => {
  const res = await fetch(`${API}/${id}`, {
    method:  "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Delete failed");
  return true;
};