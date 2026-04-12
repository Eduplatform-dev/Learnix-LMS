import { getAuthHeader, getAuthHeaderNoContentType } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API = `${API_BASE_URL}/api/documents`;

const handle = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Request failed (${res.status})`);
  return data as T;
};

export type DocType =
  | "caste_certificate" | "income_certificate" | "scholarship"
  | "bonafide" | "marksheet" | "transfer_certificate"
  | "aadhar" | "photo" | "other";

export type DocStatus = "pending" | "verified" | "rejected";

export type Document = {
  _id: string;
  student: { _id: string; username: string; email: string } | string;
  title: string;
  type: DocType;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: DocStatus;
  verifiedBy: { username: string } | null;
  verifiedAt: string | null;
  rejectionNote: string;
  expiresAt: string | null;
  notes: string;
  createdAt: string;
};

export const DOC_LABELS: Record<DocType, string> = {
  caste_certificate:    "Caste Certificate",
  income_certificate:   "Income Certificate",
  scholarship:          "Scholarship Letter",
  bonafide:             "Bonafide Certificate",
  marksheet:            "Mark Sheet",
  transfer_certificate: "Transfer Certificate",
  aadhar:               "Aadhaar Card",
  photo:                "Passport Photo",
  other:                "Other",
};

export const getMyDocuments = async (): Promise<Document[]> => {
  const res = await fetch(`${API}/my`, { headers: getAuthHeader() });
  return handle<Document[]>(res);
};

export const getAllDocuments = async (params?: {
  status?: DocStatus;
  type?: DocType;
}): Promise<Document[]> => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.type)   qs.set("type",   params.type);
  const res = await fetch(`${API}${qs.toString() ? "?" + qs : ""}`, { headers: getAuthHeader() });
  return handle<Document[]>(res);
};

export const uploadDocument = async (formData: FormData): Promise<Document> => {
  const res = await fetch(API, {
    method: "POST",
    headers: getAuthHeaderNoContentType(),
    body: formData,
  });
  return handle<Document>(res);
};

export const verifyDocument = async (
  id: string,
  status: DocStatus,
  rejectionNote?: string
): Promise<Document> => {
  const res = await fetch(`${API}/${id}/verify`, {
    method: "PATCH",
    headers: getAuthHeader(),
    body: JSON.stringify({ status, rejectionNote }),
  });
  return handle<Document>(res);
};

export const deleteDocument = async (id: string): Promise<void> => {
  const res = await fetch(`${API}/${id}`, { method: "DELETE", headers: getAuthHeader() });
  if (!res.ok) throw new Error("Delete failed");
};
