// src/app/components/pages/admin/AdminCourses.tsx
// FIXED:
// - Admin can create BOTH academic and private courses
// - Academic: requires dept + semester, auto-approved, no price
// - Private: goes through approval flow, can be paid/free
// - Approval flow only shown for private courses

import { useEffect, useState, useCallback } from "react";
import {
  BookOpen, Users, Clock, Trash2, Star, Archive, ArchiveRestore,
  Layers, X, CheckCircle, XCircle, AlertCircle, Eye,
  Lock, DollarSign, GraduationCap, Search, Plus,
} from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

type Course = {
  _id:            string;
  title:          string;
  description:    string;
  instructor:     { _id: string; username: string; email: string } | string;
  duration:       string;
  enrolledStudents: any[];
  rating:         number;
  status:         string;
  approvalStatus: "pending_approval" | "approved" | "rejected";
  rejectionNote:  string;
  courseType:     "academic" | "private";
  isFree:         boolean;
  price:          number;
  department:     { _id: string; name: string; code: string } | null;
  semesterNumber: number | null;
  subjectCode:    string;
  createdAt:      string;
};

type Lesson = { _id: string; title: string; type: string; isPreview: boolean; duration: number; order: number; };
type Department = { _id: string; name: string; code: string };
type Instructor = { _id: string; username: string; email: string };

const approvalBadge = (status: string, type: string) => {
  if (type === "academic")     return <Badge className="bg-blue-100 text-blue-700 text-xs">Academic (Auto-approved)</Badge>;
  if (status === "approved")   return <Badge className="bg-green-100 text-green-700 text-xs">Approved</Badge>;
  if (status === "pending_approval") return <Badge className="bg-amber-100 text-amber-700 text-xs">Pending Approval</Badge>;
  if (status === "rejected")   return <Badge className="bg-red-100 text-red-700 text-xs">Rejected</Badge>;
  return null;
};

const typeIcon = (type: string) => {
  if (type === "video") return "🎬";
  if (type === "pdf")   return "📄";
  if (type === "quiz")  return "❓";
  return "📝";
};

/* ─── Lessons Panel ─────────────────────────────── */
function LessonsPanel({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/lessons/course/${courseId}`, { headers: authHeader() })
      .then(r => r.json())
      .then(data => setLessons(Array.isArray(data) ? data : (data.lessons ?? [])))
      .catch(() => setLessons([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg max-h-[75vh] overflow-y-auto rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white">
          <h3 className="font-semibold text-gray-900">Course Lessons</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-10 text-gray-400"><BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No lessons added yet.</p></div>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson, idx) => (
                <div key={lesson._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 text-xs w-5">{idx + 1}.</span>
                  <span className="text-lg">{typeIcon(lesson.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{lesson.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 capitalize">{lesson.type}</span>
                      {lesson.isPreview && <span className="text-xs text-amber-600 flex items-center gap-0.5"><Eye className="w-3 h-3" />Preview</span>}
                    </div>
                  </div>
                  <Badge className={`text-xs ${lesson.isPreview ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{lesson.isPreview ? "Free" : "Enrolled"}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Reject Modal ──────────────────────────────── */
function RejectModal({ course, onConfirm, onClose }: { course: Course; onConfirm: (note: string) => void; onClose: () => void }) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl">
        <h3 className="font-semibold text-lg mb-1">Reject Course</h3>
        <p className="text-sm text-gray-500 mb-4">Provide a reason for rejecting <strong>{course.title}</strong>.</p>
        <Textarea rows={3} placeholder="e.g., Please add a proper course description and at least 3 lessons." value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => onConfirm(note)} disabled={!note.trim()}>Reject</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Create Course Modal ────────────────────────── */
function CreateCourseModal({ departments, instructors, onClose, onSaved }: {
  departments: Department[];
  instructors: Instructor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [courseType, setCourseType] = useState<"academic" | "private">("private");
  const [form, setForm] = useState({
    title:          "",
    description:    "",
    duration:       "",
    instructor:     "",
    // Academic fields
    department:     "",
    semesterNumber: "",
    subjectCode:    "",
    credits:        "",
    // Private fields
    isFree:         true,
    price:          "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.duration.trim()) { setError("Title and duration are required"); return; }
    if (courseType === "academic" && (!form.department || !form.semesterNumber)) {
      setError("Department and semester are required for academic courses"); return;
    }
    setSaving(true); setError("");
    try {
      const payload: any = {
        title:       form.title.trim(),
        description: form.description.trim(),
        duration:    form.duration.trim(),
        courseType,
      };
      if (form.instructor) payload.instructor = form.instructor;
      if (courseType === "academic") {
        payload.department     = form.department;
        payload.semesterNumber = parseInt(form.semesterNumber);
        payload.subjectCode    = form.subjectCode;
        payload.credits        = form.credits ? parseInt(form.credits) : 0;
        payload.isFree         = true; // academic always free
        payload.price          = 0;
      } else {
        payload.isFree = form.isFree;
        payload.price  = form.isFree ? 0 : Number(form.price) || 0;
      }

      const res  = await fetch(`${API_BASE_URL}/api/courses`, { method: "POST", headers: authHeader(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      onSaved(); onClose();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg text-gray-900">Create New Course</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Course type selector */}
          <div>
            <Label className="mb-2 block">Course Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setCourseType("private")}
                className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all ${courseType === "private" ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-300"}`}>
                <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-purple-600" /><span className="font-semibold text-sm text-gray-900">Private Course</span></div>
                <p className="text-xs text-gray-500">Free or paid · Any student · Needs approval</p>
              </button>
              <button onClick={() => setCourseType("academic")}
                className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all ${courseType === "academic" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}>
                <div className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-blue-600" /><span className="font-semibold text-sm text-gray-900">Academic Course</span></div>
                <p className="text-xs text-gray-500">Free · Dept-linked · Auto-approved · With attendance</p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Title *</Label><Input className="mt-1" placeholder="e.g., Data Structures and Algorithms" value={form.title} onChange={e => set("title", e.target.value)} /></div>
            <div><Label>Duration *</Label><Input className="mt-1" placeholder="e.g., 6 weeks / 60 hours" value={form.duration} onChange={e => set("duration", e.target.value)} /></div>
            <div>
              <Label>Assign Instructor</Label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.instructor} onChange={e => set("instructor", e.target.value)}>
                <option value="">Self (Admin)</option>
                {instructors.map(i => <option key={i._id} value={i._id}>{i.username} ({i.email})</option>)}
              </select>
            </div>
            <div className="col-span-2"><Label>Description</Label><Textarea className="mt-1" rows={2} value={form.description} onChange={e => set("description", e.target.value)} /></div>
          </div>

          {/* Academic-specific fields */}
          {courseType === "academic" && (
            <div className="border border-blue-200 rounded-xl p-4 space-y-3 bg-blue-50/40">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Academic Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Department *</Label>
                  <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.department} onChange={e => set("department", e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                  </select>
                  {departments.length === 0 && <p className="text-xs text-amber-600 mt-1">No departments yet — add departments first.</p>}
                </div>
                <div>
                  <Label>Semester *</Label>
                  <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.semesterNumber} onChange={e => set("semesterNumber", e.target.value)}>
                    <option value="">Select Semester</option>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n} (Year {Math.ceil(n/2)})</option>)}
                  </select>
                </div>
                <div><Label>Subject Code</Label><Input className="mt-1" placeholder="e.g., CS301" value={form.subjectCode} onChange={e => set("subjectCode", e.target.value)} /></div>
                <div><Label>Credits</Label><Input type="number" className="mt-1" placeholder="e.g., 4" value={form.credits} onChange={e => set("credits", e.target.value)} /></div>
              </div>
              <p className="text-xs text-blue-600">Academic courses are always free and auto-approved. Students must be from the selected department.</p>
            </div>
          )}

          {/* Private-specific: pricing */}
          {courseType === "private" && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Pricing</p>
              <div className="flex gap-3">
                <button onClick={() => set("isFree", true)} className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.isFree ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500"}`}>Free</button>
                <button onClick={() => set("isFree", false)} className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${!form.isFree ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500"}`}>Paid</button>
              </div>
              {!form.isFree && <Input type="number" placeholder="Price in ₹" value={form.price} onChange={e => set("price", e.target.value)} />}
              <p className="text-xs text-gray-500">Private courses require admin approval before students can enroll.</p>
            </div>
          )}

          {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className={courseType === "academic" ? "bg-blue-600 hover:bg-blue-700" : "bg-indigo-600 hover:bg-indigo-700"}>
            {saving ? "Creating..." : courseType === "academic" ? "Create Academic Course" : "Create Private Course"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────── */
export function AdminCourses() {
  const [courses,      setCourses]      = useState<Course[]>([]);
  const [departments,  setDepartments]  = useState<Department[]>([]);
  const [instructors,  setInstructors]  = useState<Instructor[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [query,        setQuery]        = useState("");
  const [filter,       setFilter]       = useState<"all" | "pending_approval" | "approved" | "rejected">("all");
  const [typeFilter,   setTypeFilter]   = useState<"all" | "academic" | "private">("all");
  const [lessonsFor,   setLessonsFor]   = useState<string | null>(null);
  const [rejectCourse, setRejectCourse] = useState<Course | null>(null);
  const [acting,       setActing]       = useState<string | null>(null);
  const [showCreate,   setShowCreate]   = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [cRes, dRes, iRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/courses?limit=200`, { headers: authHeader() }),
        fetch(`${API_BASE_URL}/api/departments`,       { headers: authHeader() }),
        fetch(`${API_BASE_URL}/api/users?role=instructor&limit=100`, { headers: authHeader() }),
      ]);
      const cData = await cRes.json();
      const dData = await dRes.json();
      const iData = await iRes.json();
      setCourses(Array.isArray(cData) ? cData : (cData.courses ?? []));
      setDepartments(Array.isArray(dData) ? dData : []);
      setInstructors(Array.isArray(iData) ? iData : []);
    } catch { setCourses([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (course: Course) => {
    if (course.courseType === "academic") return; // academic auto-approved
    setActing(course._id);
    try {
      await fetch(`${API_BASE_URL}/api/courses/${course._id}/approve`, { method: "PATCH", headers: authHeader(), body: JSON.stringify({ action: "approve" }) });
      await load();
    } finally { setActing(null); }
  };

  const handleReject = async (course: Course, note: string) => {
    setActing(course._id); setRejectCourse(null);
    try {
      await fetch(`${API_BASE_URL}/api/courses/${course._id}/approve`, { method: "PATCH", headers: authHeader(), body: JSON.stringify({ action: "reject", rejectionNote: note }) });
      await load();
    } finally { setActing(null); }
  };

  const handleArchive = async (course: Course) => {
    const newStatus = course.status === "archived" ? "active" : "archived";
    setActing(course._id);
    try {
      await fetch(`${API_BASE_URL}/api/courses/${course._id}`, { method: "PUT", headers: authHeader(), body: JSON.stringify({ status: newStatus }) });
      await load();
    } finally { setActing(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this course?")) return;
    setCourses(prev => prev.filter(c => c._id !== id));
    try { await fetch(`${API_BASE_URL}/api/courses/${id}`, { method: "DELETE", headers: authHeader() }); }
    catch { await load(); }
  };

  const filtered = courses.filter(c => {
    const mq = !query || c.title.toLowerCase().includes(query.toLowerCase()) ||
      (typeof c.instructor === "object" ? c.instructor.username : "").toLowerCase().includes(query.toLowerCase());
    // For academic courses, approvalStatus is always "approved" — don't filter them out by approval filter
    const mf = filter === "all" ||
      (c.courseType === "academic" ? filter === "approved" : c.approvalStatus === filter);
    const mt = typeFilter === "all" || c.courseType === typeFilter;
    return mq && mf && mt;
  });

  const counts = {
    all:              courses.length,
    pending_approval: courses.filter(c => c.courseType === "private" && c.approvalStatus === "pending_approval").length,
    approved:         courses.filter(c => c.approvalStatus === "approved").length,
    rejected:         courses.filter(c => c.approvalStatus === "rejected").length,
    academic:         courses.filter(c => c.courseType === "academic").length,
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Course Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create academic courses · Approve instructor private courses</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />Create Course
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          ["all",              "Total",           "bg-gray-100 text-gray-700"],
          ["approved",         "Approved",        "bg-green-100 text-green-700"],
          ["pending_approval", "Pending Review",  "bg-amber-100 text-amber-700"],
          ["rejected",         "Rejected",        "bg-red-100 text-red-700"],
        ] as const).map(([key, label, cls]) => (
          <Card key={key} className={`cursor-pointer transition-all hover:shadow-md ${filter === key ? "ring-2 ring-indigo-500" : ""}`} onClick={() => setFilter(key)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{counts[key]}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{counts.academic}</p>
            <p className="text-xs text-blue-600 mt-1">Academic</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input value={query} onChange={e => setQuery(e.target.value)} className="pl-10" placeholder="Search by title or instructor..." />
        </div>
        <div className="flex gap-2">
          {(["all","academic","private"] as const).map(t => (
            <Button key={t} size="sm" variant={typeFilter === t ? "default" : "outline"} onClick={() => setTypeFilter(t)} className="capitalize">
              {t === "all" ? "All Types" : t}
            </Button>
          ))}
        </div>
      </div>

      {/* Pending approval alert for private courses */}
      {counts.pending_approval > 0 && filter !== "pending_approval" && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 cursor-pointer" onClick={() => setFilter("pending_approval")}>
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">{counts.pending_approval} private course{counts.pending_approval > 1 ? "s" : ""} waiting for approval</p>
          <span className="ml-auto text-xs text-amber-600 underline">Review now →</span>
        </div>
      )}

      {/* Course list */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No courses found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(course => {
            const instructorName = typeof course.instructor === "object" ? course.instructor.username : "—";
            const enrolled       = course.enrolledStudents?.length ?? 0;
            const isAcademic     = course.courseType === "academic";

            return (
              <Card key={course._id} className={`hover:shadow-md transition-shadow ${course.status === "archived" ? "opacity-60" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isAcademic ? "bg-blue-100" : "bg-purple-100"}`}>
                        {isAcademic ? <GraduationCap className="w-5 h-5 text-blue-600" /> : <Lock className="w-5 h-5 text-purple-600" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                        <p className="text-sm text-gray-500 truncate">{instructorName}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      {approvalBadge(course.approvalStatus, course.courseType)}
                      <Badge className={`text-xs ${isAcademic ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                        {isAcademic ? "Academic" : "Private"}
                      </Badge>
                    </div>
                  </div>

                  {/* Academic course details */}
                  {isAcademic && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-2 py-1 mb-3">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {(course.department as any)?.name || "—"} · Semester {course.semesterNumber || "—"}
                      {course.subjectCode && ` · ${course.subjectCode}`}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{enrolled} students</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{course.duration}</span>
                    <span className="flex items-center gap-1 text-amber-500"><Star className="w-3.5 h-3.5 fill-current" />{course.rating}</span>
                    {!isAcademic && (
                      <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{course.isFree ? "Free" : `₹${course.price}`}</span>
                    )}
                  </div>

                  {course.approvalStatus === "rejected" && course.rejectionNote && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs text-red-600"><span className="font-medium">Rejection note:</span> {course.rejectionNote}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t flex-wrap">
                    <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => setLessonsFor(course._id)}>
                      <Layers className="w-3.5 h-3.5" />Lessons
                    </Button>

                    {/* Approval only for private courses */}
                    {!isAcademic && course.approvalStatus === "pending_approval" && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs gap-1" disabled={acting === course._id} onClick={() => handleApprove(course)}>
                          <CheckCircle className="w-3.5 h-3.5" />{acting === course._id ? "..." : "Approve"}
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs gap-1" disabled={acting === course._id} onClick={() => setRejectCourse(course)}>
                          <XCircle className="w-3.5 h-3.5" />Reject
                        </Button>
                      </>
                    )}

                    {!isAcademic && course.approvalStatus === "rejected" && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs gap-1" disabled={acting === course._id} onClick={() => handleApprove(course)}>
                        <CheckCircle className="w-3.5 h-3.5" />{acting === course._id ? "..." : "Approve"}
                      </Button>
                    )}

                    {course.approvalStatus === "approved" && (
                      <Button size="sm" variant="ghost" className="text-xs gap-1" disabled={acting === course._id} onClick={() => handleArchive(course)}>
                        {course.status === "archived"
                          ? <><ArchiveRestore className="w-3.5 h-3.5" />Restore</>
                          : <><Archive className="w-3.5 h-3.5" />Archive</>}
                      </Button>
                    )}

                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(course._id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {lessonsFor && <LessonsPanel courseId={lessonsFor} onClose={() => setLessonsFor(null)} />}
      {rejectCourse && <RejectModal course={rejectCourse} onConfirm={note => handleReject(rejectCourse, note)} onClose={() => setRejectCourse(null)} />}
      {showCreate && <CreateCourseModal departments={departments} instructors={instructors} onClose={() => setShowCreate(false)} onSaved={load} />}
    </div>
  );
}
