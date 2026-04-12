import { useEffect, useState, useCallback } from "react";
import {
  GraduationCap, Briefcase, Search, X,
  ChevronRight, BookOpen, FileText, CheckCircle, Clock,
  Award, AlertCircle, Building2,
  Hash, Calendar, Edit, Trash2, Save, Users,
  ArrowLeft, TrendingUp, Star, BarChart2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];

type Role = "student" | "instructor";

type UserRow = {
  _id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  department?: any;
  currentSemesterNumber?: number | null;
};

type StudentProfile = {
  _id: string;
  fullName: string;
  enrollmentNumber: string | null;
  department: { name: string; code: string } | null;
  year: number | null;
  division: string;
  rollNumber: string;
  gender: string;
  bloodGroup: string;
  phoneNumber: string;
  category: string;
  photo: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  parentOccupation: string;
  isSubmitted: boolean;
  admissionYear: number | null;
  address?: { street: string; city: string; state: string; pincode: string };
};

type InstructorProfile = {
  _id: string;
  fullName: string;
  employeeId: string;
  department: { name: string; code: string } | null;
  designation: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
  gender: string;
  bloodGroup: string;
  phoneNumber: string;
  photo: string;
  joiningDate: string;
  isSubmitted: boolean;
  address?: { street: string; city: string; state: string; pincode: string };
};

type Analysis = {
  totalSubmissions: number;
  gradedSubmissions: number;
  averageGrade: number | null;
  submissionTrend: { month: string; count: number }[];
  gradeDistribution: { range: string; count: number }[];
  coursesCreated?: number;
  totalStudentsTaught?: number;
  pendingToGrade?: number;
  gradedTotal?: number;
  avgGradeGiven?: number | null;
  courseBreakdown?: { name: string; percent: number }[];
};

function authHeader() {
  const t = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Edit Modal ────────────────────────────────────────────────────────────
function EditUserModal({
  user,
  profile,
  onClose,
  onSave,
}: {
  user: UserRow;
  profile: StudentProfile | InstructorProfile | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isStudent = user.role === "student";
  const sp = isStudent ? (profile as StudentProfile | null) : null;
  const ip = !isStudent ? (profile as InstructorProfile | null) : null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [userForm, setUserForm] = useState({
    username: user.username,
    email: user.email,
  });
  const [profileForm, setProfileForm] = useState<Record<string, any>>({
    fullName: (profile as any)?.fullName || "",
    phoneNumber: (profile as any)?.phoneNumber || "",
    gender: (profile as any)?.gender || "",
    bloodGroup: (profile as any)?.bloodGroup || "unknown",
    // student fields
    enrollmentNumber: sp?.enrollmentNumber || "",
    year: sp?.year || "",
    division: sp?.division || "",
    rollNumber: sp?.rollNumber || "",
    department: (profile as any)?.department?._id || (profile as any)?.department || "",
    parentName: sp?.parentName || "",
    parentPhone: sp?.parentPhone || "",
    parentEmail: sp?.parentEmail || "",
    parentOccupation: sp?.parentOccupation || "",
    // instructor fields
    employeeId: ip?.employeeId || "",
    designation: ip?.designation || "",
    qualification: ip?.qualification || "",
    specialization: ip?.specialization || "",
    experienceYears: ip?.experienceYears || 0,
  });

  const setP = (k: string, v: any) => setProfileForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      // Update user basics
      const token = localStorage.getItem("token");
      const userRes = await fetch(`${API_BASE_URL}/api/users/${user._id}`, {
        method: "PUT",
        headers: authHeader(),
        body: JSON.stringify({ username: userForm.username, email: userForm.email }),
      });
      if (!userRes.ok) {
        const d = await userRes.json().catch(() => ({}));
        throw new Error(d.error || "Failed to update user");
      }

      // Update profile if exists
      if (profile) {
        const profileEndpoint = isStudent
          ? `/api/profiles/students/${user._id}`
          : `/api/profiles/instructors/${user._id}`;

        const updates: Record<string, any> = {
          fullName: profileForm.fullName,
          phoneNumber: profileForm.phoneNumber,
          gender: profileForm.gender,
          bloodGroup: profileForm.bloodGroup,
        };

        if (isStudent) {
          updates.enrollmentNumber = profileForm.enrollmentNumber || undefined;
          updates.year = profileForm.year ? Number(profileForm.year) : undefined;
          updates.division = profileForm.division;
          updates.rollNumber = profileForm.rollNumber;
          updates.parentName = profileForm.parentName;
          updates.parentPhone = profileForm.parentPhone;
          updates.parentEmail = profileForm.parentEmail;
          updates.parentOccupation = profileForm.parentOccupation;
          if (profileForm.department) updates.department = profileForm.department;
        } else {
          updates.employeeId = profileForm.employeeId;
          updates.designation = profileForm.designation;
          updates.qualification = profileForm.qualification;
          updates.specialization = profileForm.specialization;
          updates.experienceYears = Number(profileForm.experienceYears);
          if (profileForm.department) updates.department = profileForm.department;
        }

        const profRes = await fetch(`${API_BASE_URL}${profileEndpoint}`, {
          method: "PUT",
          headers: authHeader(),
          body: JSON.stringify(updates),
        });
        if (!profRes.ok) {
          const d = await profRes.json().catch(() => ({}));
          throw new Error(d.error || "Failed to update profile");
        }
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isStudent ? "bg-indigo-100" : "bg-emerald-100"}`}>
              {isStudent ? <GraduationCap className={`w-5 h-5 text-indigo-600`} /> : <Briefcase className="w-5 h-5 text-emerald-600" />}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Edit {isStudent ? "Student" : "Instructor"}</h2>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Account */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Username</label>
                <Input value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Personal */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
                <Input value={profileForm.fullName} onChange={e => setP("fullName", e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
                <Input value={profileForm.phoneNumber} onChange={e => setP("phoneNumber", e.target.value)} placeholder="Phone number" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Gender</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={profileForm.gender} onChange={e => setP("gender", e.target.value)}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Blood Group</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={profileForm.bloodGroup} onChange={e => setP("bloodGroup", e.target.value)}>
                  {["unknown","A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <option key={g} value={g}>{g === "unknown" ? "Not known" : g}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Student-specific */}
          {isStudent && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Academic</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Enrollment No.</label>
                  <Input value={profileForm.enrollmentNumber} onChange={e => setP("enrollmentNumber", e.target.value)} placeholder="Admin assigns this" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Year</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm" value={profileForm.year} onChange={e => setP("year", e.target.value)}>
                    <option value="">Select</option>
                    {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Division</label>
                  <Input value={profileForm.division} onChange={e => setP("division", e.target.value)} placeholder="e.g. A" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Roll Number</label>
                  <Input value={profileForm.rollNumber} onChange={e => setP("rollNumber", e.target.value)} placeholder="e.g. 42" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Parent Name</label>
                  <Input value={profileForm.parentName} onChange={e => setP("parentName", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Parent Phone</label>
                  <Input value={profileForm.parentPhone} onChange={e => setP("parentPhone", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Parent Email</label>
                  <Input type="email" value={profileForm.parentEmail} onChange={e => setP("parentEmail", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Parent Occupation</label>
                  <Input value={profileForm.parentOccupation} onChange={e => setP("parentOccupation", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Instructor-specific */}
          {!isStudent && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Professional</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Employee ID</label>
                  <Input value={profileForm.employeeId} onChange={e => setP("employeeId", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Designation</label>
                  <Input value={profileForm.designation} onChange={e => setP("designation", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Qualification</label>
                  <Input value={profileForm.qualification} onChange={e => setP("qualification", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Specialization</label>
                  <Input value={profileForm.specialization} onChange={e => setP("specialization", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Experience (years)</label>
                  <Input type="number" min="0" value={profileForm.experienceYears} onChange={e => setP("experienceYears", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t flex-shrink-0">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Student Analysis Modal ────────────────────────────────────────────────
function StudentAnalysisModal({ user, profile, onClose }: { user: UserRow; profile: StudentProfile | null; onClose: () => void }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const subs = await apiFetch<any[]>(`/api/submissions?limit=200`).catch(() => []);
        const arr = (Array.isArray(subs) ? subs : []).filter((s: any) =>
          String(s.studentId?._id || s.studentId) === String(user._id)
        );
        const graded = arr.filter((s: any) => s.status === "graded");
        const grades = graded.map((s: any) => {
          const m = String(s.grade || "").match(/(\d+)\s*\/\s*(\d+)/);
          if (m) return Math.round((+m[1] / +m[2]) * 100);
          const n = parseFloat(s.grade);
          return isNaN(n) ? null : n;
        }).filter((g): g is number => g !== null);

        const avgGrade = grades.length ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null;
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const now = new Date();
        const trend = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          return {
            month: months[d.getMonth()],
            count: arr.filter((s: any) => {
              const c = new Date(s.createdAt);
              return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
            }).length,
          };
        });

        const gradeDistribution = [
          { range: "90-100", min: 90, max: 100 },
          { range: "75-89", min: 75, max: 89 },
          { range: "60-74", min: 60, max: 74 },
          { range: "< 60", min: 0, max: 59 },
        ].map(({ range, min, max }) => ({ range, count: grades.filter(g => g >= min && g <= max).length }));

        setAnalysis({ totalSubmissions: arr.length, gradedSubmissions: graded.length, averageGrade: avgGrade, submissionTrend: trend, gradeDistribution });
      } finally { setLoading(false); }
    };
    load();
  }, [user._id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{profile?.fullName || user.username}</h2>
              <p className="text-sm text-gray-500">Student Analytics · {user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Profile summary */}
            {profile && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-indigo-50 rounded-xl p-4">
                {[
                  ["Enrollment", profile.enrollmentNumber || "Not assigned"],
                  ["Department", profile.department?.name || "—"],
                  ["Year", profile.year ? `Year ${profile.year}` : "—"],
                  ["Division", profile.division || "—"],
                  ["Category", profile.category?.toUpperCase() || "—"],
                  ["Blood Group", profile.bloodGroup || "—"],
                  ["Parent", profile.parentName || "—"],
                  ["Parent Phone", profile.parentPhone || "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-indigo-400 font-medium">{k}</p>
                    <p className="text-sm font-semibold text-indigo-900 truncate">{v}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Submissions", value: analysis?.totalSubmissions ?? 0, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "Graded", value: analysis?.gradedSubmissions ?? 0, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
                { label: "Pending", value: (analysis?.totalSubmissions ?? 0) - (analysis?.gradedSubmissions ?? 0), icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Avg Grade", value: analysis?.averageGrade != null ? `${analysis.averageGrade}%` : "N/A", icon: Award, color: "text-purple-600", bg: "bg-purple-50" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.label}><CardContent className="p-4">
                    <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-2`}><Icon className={`w-4 h-4 ${s.color}`} /></div>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </CardContent></Card>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card>
                <CardHeader><CardTitle className="text-sm">Submission Activity (6 months)</CardTitle></CardHeader>
                <CardContent>
                  {analysis?.submissionTrend.some(d => d.count > 0) ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={analysis.submissionTrend}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
                        <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} name="Submissions" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No submissions yet</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Grade Distribution</CardTitle></CardHeader>
                <CardContent>
                  {analysis?.gradeDistribution.some(d => d.count > 0) ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={analysis.gradeDistribution.filter(d => d.count > 0)} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={70} label={(p: any) => `${p.payload.range}: ${p.payload.count}`}>
                          {analysis.gradeDistribution.filter(d => d.count > 0).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie><Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No graded submissions</div>}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Instructor Analysis Modal ─────────────────────────────────────────────
function InstructorAnalysisModal({ user, profile, onClose }: { user: UserRow; profile: InstructorProfile | null; onClose: () => void }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [coursesRes, subsRes] = await Promise.all([
          apiFetch<any>(`/api/courses?limit=200`).catch(() => ({ courses: [] })),
          apiFetch<any[]>(`/api/submissions?limit=500`).catch(() => []),
        ]);
        const allCourses = (coursesRes?.courses ?? []).filter(
          (c: any) => String(c.instructor?._id || c.instructor) === String(user._id)
        );
        const subs = Array.isArray(subsRes) ? subsRes : [];
        const graded = subs.filter((s: any) => s.status === "graded");
        const totalStudents = new Set(allCourses.flatMap((c: any) => c.enrolledStudents || [])).size;
        const grades = graded.map((s: any) => {
          const m = String(s.grade || "").match(/(\d+)\s*\/\s*(\d+)/);
          if (m) return Math.round((+m[1] / +m[2]) * 100);
          const n = parseFloat(s.grade);
          return isNaN(n) ? null : n;
        }).filter((g): g is number => g !== null);

        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const now = new Date();
        const trend = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          return {
            month: months[d.getMonth()],
            count: graded.filter((s: any) => {
              const c = new Date(s.gradedAt || s.updatedAt);
              return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
            }).length,
          };
        });

        setAnalysis({
          totalSubmissions: subs.length, gradedSubmissions: graded.length, averageGrade: null,
          submissionTrend: trend, gradeDistribution: [],
          coursesCreated: allCourses.length, totalStudentsTaught: totalStudents,
          pendingToGrade: subs.filter((s: any) => s.status === "submitted").length,
          gradedTotal: graded.length,
          avgGradeGiven: grades.length ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null,
          courseBreakdown: allCourses.slice(0, 5).map((c: any) => ({
            name: c.title.length > 18 ? c.title.slice(0, 16) + "…" : c.title,
            percent: c.enrolledStudents?.length ?? 0,
          })),
        });
      } finally { setLoading(false); }
    };
    load();
  }, [user._id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{profile?.fullName || user.username}</h2>
              <p className="text-sm text-gray-500">Instructor Analytics · {user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Profile summary */}
            {profile && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-emerald-50 rounded-xl p-4">
                {[
                  ["Employee ID", profile.employeeId || "—"],
                  ["Department", profile.department?.name || "—"],
                  ["Designation", profile.designation || "—"],
                  ["Qualification", profile.qualification || "—"],
                  ["Specialization", profile.specialization || "—"],
                  ["Experience", profile.experienceYears ? `${profile.experienceYears} yrs` : "—"],
                  ["Blood Group", profile.bloodGroup || "—"],
                  ["Joining", profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-emerald-400 font-medium">{k}</p>
                    <p className="text-sm font-semibold text-emerald-900 truncate">{v}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Courses Created", value: analysis?.coursesCreated ?? 0, icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "Students Taught", value: analysis?.totalStudentsTaught ?? 0, icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Graded", value: analysis?.gradedTotal ?? 0, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
                { label: "Pending Grade", value: analysis?.pendingToGrade ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.label}><CardContent className="p-4">
                    <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-2`}><Icon className={`w-4 h-4 ${s.color}`} /></div>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </CardContent></Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card>
                <CardHeader><CardTitle className="text-sm">Grading Activity (6 months)</CardTitle></CardHeader>
                <CardContent>
                  {analysis?.submissionTrend.some(d => d.count > 0) ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={analysis.submissionTrend}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
                        <Bar dataKey="count" fill="#10b981" radius={[4,4,0,0]} name="Graded" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No grading activity yet</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Students per Course</CardTitle></CardHeader>
                <CardContent>
                  {analysis?.courseBreakdown && analysis.courseBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={analysis.courseBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                        <Tooltip /><Bar dataKey="percent" fill="#6366f1" radius={[0,4,4,0]} name="Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No courses yet</div>}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Overview Analytics View ───────────────────────────────────────────────
function OverviewAnalytics({ counts, users }: { counts: { students: number; instructors: number; total: number }; users: UserRow[] }) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();

  const registrationTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const students = users.filter(u => u.role === "student" && new Date(u.createdAt) >= d && new Date(u.createdAt) < next).length;
    const instructors = users.filter(u => u.role === "instructor" && new Date(u.createdAt) >= d && new Date(u.createdAt) < next).length;
    return { month: months[d.getMonth()], students, instructors };
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle className="text-sm">Registration Trend (last 6 months)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={registrationTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="students" fill="#6366f1" name="Students" radius={[4,4,0,0]} />
              <Bar dataKey="instructors" fill="#10b981" name="Instructors" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, StudentProfile | InstructorProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // "overview" | "student" | "instructor"
  const [activeView, setActiveView] = useState<"overview" | "student" | "instructor">("overview");

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [analysisUser, setAnalysisUser] = useState<UserRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<UserRow[]>("/api/users?limit=200");
      // Exclude admins from display
      setUsers(Array.isArray(data) ? data.filter(u => u.role !== "admin") : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    if (activeView === "overview") return;
    const loadProfiles = async () => {
      try {
        const endpoint = activeView === "student"
          ? "/api/profiles/students?limit=200"
          : "/api/profiles/instructors";
        const res = await apiFetch<any>(endpoint);
        const list = activeView === "student" ? (res.profiles ?? res) : res;
        const map = new Map<string, StudentProfile | InstructorProfile>();
        (Array.isArray(list) ? list : []).forEach((p: any) => {
          const uid = p.user?._id || p.user;
          if (uid) map.set(String(uid), p);
        });
        setProfiles(map);
      } catch {}
    };
    loadProfiles();
  }, [activeView]);

  const handleDelete = async (userId: string) => {
    if (!confirm("Permanently delete this user? This cannot be undone.")) return;
    setDeletingId(userId);
    try {
      await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      setUsers(prev => prev.filter(u => u._id !== userId));
    } catch {
      alert("Delete failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    if (activeView !== "overview" && u.role !== activeView) return false;
    if (!search) return true;
    const profile = profiles.get(String(u._id));
    const fullName = (profile as any)?.fullName || "";
    return (
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      fullName.toLowerCase().includes(search.toLowerCase())
    );
  });

  const counts = {
    total: users.length,
    students: users.filter(u => u.role === "student").length,
    instructors: users.filter(u => u.role === "instructor").length,
  };

  const editProfile = editUser ? (profiles.get(String(editUser._id)) ?? null) : null;
  const analysisProfile = analysisUser ? (profiles.get(String(analysisUser._id)) ?? null) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm mt-1">
          {counts.total} registered users · {counts.students} students · {counts.instructors} instructors
        </p>
      </div>

      {/* Tab Cards — clickable */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: "overview" as const, label: "All Users", count: counts.total, icon: Users, gradient: "from-slate-600 to-gray-700", desc: "Overview & trends" },
          { key: "student" as const, label: "Students", count: counts.students, icon: GraduationCap, gradient: "from-indigo-500 to-blue-600", desc: "Individual analytics" },
          { key: "instructor" as const, label: "Instructors", count: counts.instructors, icon: Briefcase, gradient: "from-emerald-500 to-teal-600", desc: "Course performance" },
        ].map(({ key, label, count, icon: Icon, gradient, desc }) => (
          <Card
            key={key}
            onClick={() => setActiveView(key)}
            className={`cursor-pointer transition-all hover:shadow-lg ${activeView === key ? "ring-2 ring-offset-1 ring-indigo-500 shadow-md" : ""}`}
          >
            <CardContent className="py-5 pr-12  flex items-center gap-2">
  {/* Left - Icon */}
  <div className={`w-15 h-15 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center shrink-0`}>
    <Icon className="w-9 h-9 text-white" />
  </div>

  {/* Right - Text */}
  <div className="flex flex-col flex-1 items-end text-right">
    <p className="text-2xl font-bold text-gray-900 leading-tight">{count}</p>
    <p className="text-sm font-bold text-gray-900 leading-tight">{label}</p>
    <p className="text-xs text-gray-400 leading-tight">{desc}</p>
  </div>
</CardContent>
          </Card>
        ))}
      </div>

      {/* Overview panel */}
      {activeView === "overview" && (
        <OverviewAnalytics counts={counts} users={users} />
      )}

      {/* Student / Instructor table */}
      {activeView !== "overview" && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              className="pl-10"
              placeholder={`Search ${activeView === "student" ? "students" : "instructors"} by name or email...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No {activeView === "student" ? "students" : "instructors"} found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                        {activeView === "student" ? (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year / Div</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrollment No.</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                          </>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredUsers.map(user => {
                        const profile = profiles.get(String(user._id));
                        const sp = activeView === "student" ? (profile as StudentProfile | undefined) : undefined;
                        const ip = activeView === "instructor" ? (profile as InstructorProfile | undefined) : undefined;

                        return (
                          <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                            {/* User */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-9 h-9 flex-shrink-0">
                                  <AvatarFallback className={`font-semibold text-sm ${activeView === "student" ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"}`}>
                                    {((sp?.fullName || ip?.fullName || user.username) || "U").slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <button
                                    onClick={() => setAnalysisUser(user)}
                                    className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline truncate max-w-[150px] text-left block"
                                  >
                                    {sp?.fullName || ip?.fullName || user.username}
                                  </button>
                                  <p className="text-xs text-gray-400 truncate max-w-[150px]">{user.email}</p>
                                </div>
                              </div>
                            </td>

                            {/* Department */}
                            <td className="px-4 py-3">
                              {(sp?.department || ip?.department) ? (
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="text-sm text-gray-700">{sp?.department?.name || ip?.department?.name || "—"}</span>
                                  <Badge variant="outline" className="text-xs ml-1">{sp?.department?.code || ip?.department?.code}</Badge>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Not set</span>
                              )}
                            </td>

                            {/* Student: Year+Div / Instructor: Designation */}
                            {activeView === "student" ? (
                              <>
                                <td className="px-4 py-3">
                                  {sp?.year ? (
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                      <span className="text-sm text-gray-700">Year {sp.year}</span>
                                      {sp.division && <span className="text-xs text-gray-400">· {sp.division}</span>}
                                    </div>
                                  ) : <span className="text-xs text-gray-400 italic">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                  {sp?.enrollmentNumber ? (
                                    <div className="flex items-center gap-1.5">
                                      <Hash className="w-3.5 h-3.5 text-indigo-400" />
                                      <span className="text-sm font-mono font-medium text-indigo-700">{sp.enrollmentNumber}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-amber-600 italic">Not assigned</span>
                                  )}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-700">{ip?.designation || <span className="text-xs text-gray-400 italic">—</span>}</span>
                                </td>
                                <td className="px-4 py-3">
                                  {ip?.employeeId ? (
                                    <div className="flex items-center gap-1.5">
                                      <Hash className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-sm font-mono font-medium text-emerald-700">{ip.employeeId}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-amber-600 italic">Not assigned</span>
                                  )}
                                </td>
                              </>
                            )}

                            {/* Joined */}
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                                  title="View analytics"
                                  onClick={() => setAnalysisUser(user)}
                                >
                                  <BarChart2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                  title="Edit user"
                                  onClick={() => setEditUser(user)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                  title="Delete user"
                                  disabled={deletingId === user._id}
                                  onClick={() => handleDelete(user._id)}
                                >
                                  {deletingId === user._id
                                    ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                    : <Trash2 className="w-4 h-4" />
                                  }
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          profile={editProfile}
          onClose={() => setEditUser(null)}
          onSave={loadUsers}
        />
      )}

      {/* Analysis Modal */}
      {analysisUser && analysisUser.role === "student" && (
        <StudentAnalysisModal
          user={analysisUser}
          profile={analysisProfile as StudentProfile | null}
          onClose={() => setAnalysisUser(null)}
        />
      )}
      {analysisUser && analysisUser.role === "instructor" && (
        <InstructorAnalysisModal
          user={analysisUser}
          profile={analysisProfile as InstructorProfile | null}
          onClose={() => setAnalysisUser(null)}
        />
      )}
    </div>
  );
}