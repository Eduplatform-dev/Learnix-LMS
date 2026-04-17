import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { getAnalyticsData } from "../../../services/adminService";
import { Users, GraduationCap, Briefcase, BookOpen, Upload, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];

function authHeader() {
  const t = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Parse a grade string like "85/100", "A", "90", "Pass" → 0-100 number or null */
function parseGrade(g: string | null | undefined): number | null {
  if (!g) return null;
  const str = String(g).trim();
  // "85/100" or "85 / 100"
  const fraction = str.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (fraction) {
    const num = +fraction[1], den = +fraction[2];
    return den > 0 ? Math.round((num / den) * 100) : null;
  }
  // plain number
  const num = parseFloat(str);
  if (!isNaN(num) && num >= 0 && num <= 100) return Math.round(num);
  // letter grades
  const letter: Record<string, number> = { "A+": 97, "A": 93, "A-": 90, "B+": 87, "B": 83, "B-": 80, "C+": 77, "C": 73, "D": 60, "F": 40 };
  return letter[str.toUpperCase()] ?? null;
}

function monthTrendLast6(items: any[], dateField = "createdAt") {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      month: months[d.getMonth()],
      count: items.filter(x => {
        const c = new Date(x[dateField]);
        return c >= d && c < next;
      }).length,
    };
  });
}

// ─── Sub-views ─────────────────────────────────────────────────────────────

function UsersView({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any[]>("/api/users?limit=500")
      .then(d => setUsers(Array.isArray(d) ? d.filter((u: any) => u.role !== "admin") : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      month: months[d.getMonth()],
      students: users.filter(u => u.role === "student" && new Date(u.createdAt) >= d && new Date(u.createdAt) < next).length,
      instructors: users.filter(u => u.role === "instructor" && new Date(u.createdAt) >= d && new Date(u.createdAt) < next).length,
    };
  });

  const students = users.filter(u => u.role === "student").length;
  const instructors = users.filter(u => u.role === "instructor").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="w-4 h-4" />Back</Button>
        <h2 className="font-semibold text-gray-900">All Users Overview</h2>
        <Badge className="bg-indigo-100 text-indigo-700">{students + instructors} total</Badge>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total (excl. admin)", value: students + instructors, color: "text-slate-600" },
          { label: "Students",            value: students,              color: "text-indigo-600" },
          { label: "Instructors",         value: instructors,           color: "text-emerald-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className={`text-3xl font-bold ${s.color}`}>{loading ? "…" : s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Registration Trend (6 months)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
              <Bar dataKey="students" fill="#6366f1" name="Students" radius={[4,4,0,0]} />
              <Bar dataKey="instructors" fill="#10b981" name="Instructors" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function StudentsView({ onBack }: { onBack: () => void }) {
  const [students,    setStudents]    = useState<any[]>([]);
  const [profiles,    setProfiles]    = useState<any[]>([]);
  const [allSubs,     setAllSubs]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<any>("/api/users?limit=500&role=student"),
      apiFetch<any>("/api/profiles/students?limit=500"),
      apiFetch<any[]>("/api/submissions?limit=2000"),
    ]).then(([users, profs, subs]) => {
      const studentList = Array.isArray(users) ? users.filter((u: any) => u.role === "student") : [];
      setStudents(studentList);
      setProfiles(Array.isArray(profs) ? profs : (profs?.profiles ?? []));
      setAllSubs(Array.isArray(subs) ? subs : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (selected) {
    const sid = String(selected._id);
    // Match by studentId field (which is the user's _id)
    const studentSubs = allSubs.filter((s: any) => {
      const subStudentId = String(s.studentId?._id ?? s.studentId ?? "");
      return subStudentId === sid;
    });
    const graded = studentSubs.filter((s: any) => s.status === "graded");
    const grades = graded.map((s: any) => parseGrade(s.grade)).filter((g): g is number => g !== null);
    const avg    = grades.length ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null;
    const trend  = monthTrendLast6(studentSubs, "createdAt").map(d => ({ ...d, submissions: d.count }));

    const gradeRanges = [
      { range: "90-100", min: 90, max: 100 },
      { range: "75-89",  min: 75, max: 89  },
      { range: "60-74",  min: 60, max: 74  },
      { range: "< 60",   min: 0,  max: 59  },
    ].map(({ range, min, max }) => ({ range, count: grades.filter(g => g >= min && g <= max).length }));

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1"><ArrowLeft className="w-4 h-4" />Back to Students</Button>
          <h2 className="font-semibold text-gray-900">{selected.profile?.fullName || selected.username}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Submissions",    value: studentSubs.length },
            { label: "Graded",         value: graded.length },
            { label: "Pending Review", value: studentSubs.filter((s: any) => s.status === "submitted").length },
            { label: "Avg Grade",      value: avg != null ? `${avg}%` : "N/A" },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <CardHeader><CardTitle className="text-sm">Submission Activity (6 months)</CardTitle></CardHeader>
            <CardContent>
              {trend.some(d => d.submissions > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
                    <Bar dataKey="submissions" fill="#6366f1" radius={[4,4,0,0]} name="Submissions" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No submissions yet</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Grade Distribution</CardTitle></CardHeader>
            <CardContent>
              {gradeRanges.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={gradeRanges.filter(d => d.count > 0)} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={70} label={p => `${p.payload.range}: ${p.payload.count}`}>
                      {gradeRanges.filter(d => d.count > 0).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie><Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No graded submissions</div>}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Submissions</CardTitle></CardHeader>
          <CardContent className="p-0">
            {studentSubs.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">No submissions yet</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>{["Assignment","Status","Grade","Date"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {studentSubs.slice(0, 10).map((s: any) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{s.assignmentTitle || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge className={s.status === "graded" ? "bg-green-100 text-green-700" : s.status === "submitted" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}>{s.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{s.grade || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="w-4 h-4" />Back</Button>
        <h2 className="font-semibold text-gray-900">Students</h2>
        <Badge className="bg-indigo-100 text-indigo-700">{students.length} students</Badge>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>{["Student","Department","Enrollment","Submissions","Graded","Status"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student: any) => {
                const profile  = profiles.find(p => String(p.user?._id ?? p.user) === String(student._id));
                const sid      = String(student._id);
                const subs     = allSubs.filter((s: any) => String(s.studentId?._id ?? s.studentId ?? "") === sid);
                const gradedN  = subs.filter((s: any) => s.status === "graded").length;
                const pending  = subs.some((s: any) => s.status === "submitted");
                return (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected({ ...student, profile })} className="text-sm font-medium text-indigo-600 hover:underline text-left">
                        {profile?.fullName || student.username}
                      </button>
                      <p className="text-xs text-gray-400">{student.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{profile?.department?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm font-mono text-indigo-700">{profile?.enrollmentNumber || <span className="text-amber-600 italic text-xs">Not assigned</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{subs.length}</td>
                    <td className="px-4 py-3 text-sm text-green-700 font-medium">{gradedN}</td>
                    <td className="px-4 py-3">
                      <Badge className={pending ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}>
                        {pending ? "Has pending" : "Up to date"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No students yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function CoursesView({ onBack }: { onBack: () => void }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any>("/api/courses?limit=200")
      .then(d => setCourses(Array.isArray(d) ? d : (d?.courses ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  const approved      = courses.filter(c => c.approvalStatus === "approved").length;
  const totalEnrolled = courses.reduce((s, c) => s + (c.enrolledStudents?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="w-4 h-4" />Back</Button>
        <h2 className="font-semibold text-gray-900">Course Performance</h2>
        <Badge className="bg-blue-100 text-blue-700">{courses.length} courses</Badge>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Courses",   value: courses.length },
          { label: "Approved",        value: approved },
          { label: "Total Enrolled",  value: totalEnrolled },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>
      {courses.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Enrollment by Course (top 10)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, Math.min(courses.length, 10) * 44)}>
              <BarChart
                data={[...courses].sort((a, b) => (b.enrolledStudents?.length ?? 0) - (a.enrolledStudents?.length ?? 0)).slice(0, 10).map(c => ({
                  name:     c.title.length > 22 ? c.title.slice(0, 20) + "…" : c.title,
                  enrolled: c.enrolledStudents?.length ?? 0,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="enrolled" fill="#6366f1" radius={[0,4,4,0]} name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SubmissionsView({ onBack }: { onBack: () => void }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [allSubs,     setAllSubs]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<any[]>("/api/assignments?limit=200"),
      apiFetch<any[]>("/api/submissions?limit=2000"),
    ]).then(([asgn, subs]) => {
      setAssignments(Array.isArray(asgn) ? asgn : []);
      setAllSubs(Array.isArray(subs) ? subs : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (selected) {
    const aid     = String(selected._id);
    const asgnSubs = allSubs.filter((s: any) => String(s.assignmentId?._id ?? s.assignmentId ?? "") === aid);
    const submitted = asgnSubs.filter((s: any) => s.status !== "draft");
    const graded    = asgnSubs.filter((s: any) => s.status === "graded");

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1"><ArrowLeft className="w-4 h-4" />Back to Assignments</Button>
          <h2 className="font-semibold text-gray-900">{selected.title}</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Submitted",      value: submitted.length },
            { label: "Graded",         value: graded.length },
            { label: "Pending Grade",  value: asgnSubs.filter((s: any) => s.status === "submitted").length },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </CardContent></Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>{["Student","Status","Grade","Files","Date"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {asgnSubs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No submissions for this assignment</td></tr>
                ) : asgnSubs.map((s: any) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.studentName || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={s.status === "graded" ? "bg-green-100 text-green-700" : s.status === "submitted" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">{s.grade || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.files?.length ?? 0} file(s)</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="w-4 h-4" />Back</Button>
        <h2 className="font-semibold text-gray-900">Submission Tracker</h2>
        <Badge className="bg-amber-100 text-amber-700">{assignments.length} assignments · {allSubs.length} total submissions</Badge>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>{["Assignment","Due Date","Total Subs","Submitted","Graded","Pending","Grade Rate"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {assignments.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No assignments yet</td></tr>
              ) : assignments.map((a: any) => {
                const aid      = String(a._id);
                const asgnSubs = allSubs.filter((s: any) => String(s.assignmentId?._id ?? s.assignmentId ?? "") === aid);
                const submitted = asgnSubs.filter((s: any) => s.status !== "draft").length;
                const graded    = asgnSubs.filter((s: any) => s.status === "graded").length;
                const pending   = asgnSubs.filter((s: any) => s.status === "submitted").length;
                const rate      = submitted > 0 ? `${Math.round((graded / submitted) * 100)}%` : "—";
                return (
                  <tr key={a._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(a)} className="text-sm font-medium text-indigo-600 hover:underline text-left">{a.title}</button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(a.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm font-medium">{asgnSubs.length}</td>
                    <td className="px-4 py-3 text-sm font-medium">{submitted}</td>
                    <td className="px-4 py-3 text-sm text-green-700 font-medium">{graded}</td>
                    <td className="px-4 py-3 text-sm text-amber-700 font-medium">{pending}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{rate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MAIN ANALYTICS PAGE ───────────────────────────────────────────────────
export function AdminAnalytics() {
  const [data,       setData]       = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [realCounts, setRealCounts] = useState({ students: 0, instructors: 0, courses: 0, submissions: 0 });
  const [view, setView] = useState<"main" | "users" | "students" | "courses" | "submissions">("main");

  useEffect(() => {
    Promise.all([
      getAnalyticsData(),
      apiFetch<any[]>("/api/users?limit=500"),
      apiFetch<any>("/api/courses?limit=200"),
      apiFetch<any[]>("/api/submissions?limit=2000"),
    ]).then(([analytics, users, courses, subs]) => {
      setData(analytics);
      const allUsers    = Array.isArray(users) ? users : [];
      const allCourses  = Array.isArray(courses) ? courses : (courses?.courses ?? []);
      const allSubs     = Array.isArray(subs) ? subs : [];
      setRealCounts({
        students:    allUsers.filter((u: any) => u.role === "student").length,
        instructors: allUsers.filter((u: any) => u.role === "instructor").length,
        courses:     allCourses.length,
        submissions: allSubs.length,
      });
    }).catch(err => console.error("Analytics error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (view === "users")       return <UsersView       onBack={() => setView("main")} />;
  if (view === "students")    return <StudentsView     onBack={() => setView("main")} />;
  if (view === "courses")     return <CoursesView      onBack={() => setView("main")} />;
  if (view === "submissions") return <SubmissionsView  onBack={() => setView("main")} />;

  if (!data) return <div className="p-6 text-center text-gray-400">No analytics data available.</div>;

  const kpiCards = [
    {
      label:   "Total Users",
      value:   realCounts.students + realCounts.instructors,
      desc:    `${realCounts.students} students · ${realCounts.instructors} instructors`,
      icon:    Users,
      color:   "from-slate-600 to-gray-700",
      onClick: () => setView("users"),
    },
    {
      label:   "Students",
      value:   realCounts.students,
      desc:    "Click to view individual analytics",
      icon:    GraduationCap,
      color:   "from-indigo-500 to-blue-600",
      onClick: () => setView("students"),
    },
    {
      label:   "Courses",
      value:   realCounts.courses,
      desc:    "Click to see course performance",
      icon:    BookOpen,
      color:   "from-violet-500 to-purple-600",
      onClick: () => setView("courses"),
    },
    {
      label:   "Submissions",
      value:   realCounts.submissions,
      desc:    "Click to track by assignment",
      icon:    Upload,
      color:   "from-amber-500 to-orange-600",
      onClick: () => setView("submissions"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Clickable KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} onClick={card.onClick} className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm font-medium text-gray-700 mt-0.5">{card.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Platform Growth */}
      <Card>
        <CardHeader><CardTitle>Platform Growth — New Users per Month</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.monthlyGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip /><Legend />
              <Area type="monotone" dataKey="users" stroke="#6366f1" fill="#e0e7ff" fillOpacity={0.4} name="New Users" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity */}
        <Card>
          <CardHeader><CardTitle>Daily Submissions This Week</CardTitle></CardHeader>
          <CardContent>
            {(data.userEngagement || []).some((d: any) => d.active > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.userEngagement || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip />
                  <Bar dataKey="active" fill="#6366f1" name="Submissions" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">No activity this week.</div>
            )}
          </CardContent>
        </Card>

        {/* Submission Status */}
        <Card>
          <CardHeader><CardTitle>Submission Status Distribution</CardTitle></CardHeader>
          <CardContent>
            {(data.completionRates || []).some((d: any) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.completionRates || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {(data.completionRates || []).map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">No submissions yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Course Ratings */}
      {(data.courseRatings || []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Course Ratings</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.courseRatings} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 5]} tickCount={6} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [`${v}/5`, "Rating"]} />
                <Bar dataKey="rating" fill="#8b5cf6" name="Rating" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}