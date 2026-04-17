import { useEffect, useState, useCallback } from "react";
import {
  Plus, X, Calendar, BookOpen, Edit, Trash2, Search,
  GraduationCap, Lock, Filter, Clock, CheckCircle,
  AlertCircle, ChevronDown, Users, FileText, Tag,
} from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

type Course = {
  _id: string;
  title: string;
  courseType: "academic" | "private";
  department?: { name: string; code: string } | null;
  semesterNumber?: number | null;
  enrolledStudents: any[];
};

type Assignment = {
  _id: string;
  title: string;
  description: string;
  course: { _id: string; title: string; courseType?: string } | null;
  instructor: { _id: string; username: string } | string;
  dueDate: string;
  maxMarks: number;
  status: string;
  department?: { name: string; code: string } | null;
  semesterNumber?: number | null;
  createdAt: string;
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  "Not Started": { label: "Not Started", color: "text-gray-600",  bg: "bg-gray-100"   },
  "In Progress":  { label: "In Progress", color: "text-blue-700",  bg: "bg-blue-100"   },
  "Submitted":    { label: "Submitted",   color: "text-green-700", bg: "bg-green-100"  },
};

/* ─── Assignment Form Modal ─────────────────────────────── */
function AssignmentModal({
  assignment,
  courses,
  onClose,
  onSaved,
}: {
  assignment: Assignment | null;
  courses: Course[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title:       assignment?.title       || "",
    description: assignment?.description || "",
    course:      (assignment?.course as any)?._id || "",
    dueDate:     assignment?.dueDate
      ? new Date(assignment.dueDate).toISOString().split("T")[0]
      : "",
    maxMarks: String(assignment?.maxMarks ?? 100),
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const selectedCourse = courses.find(c => c._id === form.course);

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!form.dueDate)      { setError("Due date is required"); return; }
    setSaving(true); setError("");
    try {
      const url    = assignment ? `${API_BASE_URL}/api/assignments/${assignment._id}` : `${API_BASE_URL}/api/assignments`;
      const method = assignment ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: authHeader(),
        body: JSON.stringify({
          title:       form.title.trim(),
          description: form.description.trim(),
          course:      form.course || undefined,
          dueDate:     form.dueDate,
          maxMarks:    Number(form.maxMarks) || 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved(); onClose();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg text-gray-900">
            {assignment ? "Edit Assignment" : "New Assignment"}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>

        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <Label>Title *</Label>
            <Input
              className="mt-1"
              placeholder="e.g., Build a REST API"
              value={form.title}
              onChange={e => set("title", e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description / Instructions</Label>
            <Textarea
              className="mt-1"
              rows={3}
              placeholder="Describe the assignment requirements..."
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
          </div>

          {/* Course */}
          <div>
            <Label>Link to Course (optional)</Label>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.course}
              onChange={e => set("course", e.target.value)}
            >
              <option value="">— No specific course —</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>
                  {c.courseType === "academic" ? "🎓" : "🔒"} {c.title}
                  {c.semesterNumber ? ` · Sem ${c.semesterNumber}` : ""}
                </option>
              ))}
            </select>

            {/* Show course info if selected */}
            {selectedCourse && (
              <div className={`mt-2 flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 ${
                selectedCourse.courseType === "academic"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-purple-50 text-purple-700"
              }`}>
                {selectedCourse.courseType === "academic"
                  ? <GraduationCap className="w-3.5 h-3.5" />
                  : <Lock className="w-3.5 h-3.5" />}
                <span>
                  {selectedCourse.courseType === "academic" ? "Academic" : "Private"} course
                  {selectedCourse.department && ` · ${(selectedCourse.department as any).name}`}
                  {selectedCourse.semesterNumber && ` · Semester ${selectedCourse.semesterNumber}`}
                </span>
                <span className="ml-auto">{selectedCourse.enrolledStudents?.length ?? 0} students</span>
              </div>
            )}
          </div>

          {/* Due Date + Max Marks */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Due Date *</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.dueDate}
                onChange={e => set("dueDate", e.target.value)}
              />
            </div>
            <div>
              <Label>Max Marks</Label>
              <Input
                type="number"
                className="mt-1"
                placeholder="100"
                value={form.maxMarks}
                onChange={e => set("maxMarks", e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? "Saving..." : assignment ? "Update Assignment" : "Create Assignment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Assignment Card ───────────────────────────────────── */
function AssignmentCard({
  assignment,
  onEdit,
  onDelete,
}: {
  assignment: Assignment;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const due       = new Date(assignment.dueDate);
  const daysLeft  = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysLeft < 0 && assignment.status !== "Submitted";
  const isUrgent  = daysLeft >= 0 && daysLeft <= 3 && assignment.status !== "Submitted";

  const course     = assignment.course as any;
  const isAcademic = course?.courseType === "academic";
  const sc         = statusConfig[assignment.status] || statusConfig["Not Started"];

  return (
    <Card className={`hover:shadow-md transition-all ${isOverdue ? "border-l-4 border-l-red-400" : isUrgent ? "border-l-4 border-l-amber-400" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h3 className="font-semibold text-gray-900 truncate">{assignment.title}</h3>
              <Badge className={`text-xs ${sc.bg} ${sc.color}`}>{sc.label}</Badge>
            </div>

            {/* Description */}
            {assignment.description && (
              <p className="text-sm text-gray-500 mb-2 line-clamp-2">{assignment.description}</p>
            )}

            {/* Course badge */}
            {course && (
              <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full mb-2 ${
                isAcademic ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
              }`}>
                {isAcademic
                  ? <GraduationCap className="w-3 h-3" />
                  : <Lock className="w-3 h-3" />}
                {course.title}
                {assignment.semesterNumber && ` · Sem ${assignment.semesterNumber}`}
              </div>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-semibold" : isUrgent ? "text-amber-600 font-semibold" : ""}`}>
                <Calendar className="w-3.5 h-3.5" />
                {isOverdue
                  ? `Overdue · ${due.toLocaleDateString()}`
                  : daysLeft === 0
                    ? "Due today"
                    : daysLeft === 1
                      ? "Due tomorrow"
                      : `Due ${due.toLocaleDateString()}`}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Max: {assignment.maxMarks} marks
              </span>
              {isUrgent && (
                <span className="text-amber-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />{daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={onEdit} title="Edit">
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={onDelete} title="Delete">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────── */
export function InstructorAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses,     setCourses]     = useState<Course[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [query,       setQuery]       = useState("");
  const [courseFilter,setCourseFilter]= useState("all");
  const [typeFilter,  setTypeFilter]  = useState<"all" | "academic" | "private">("all");
  const [statusFilter,setStatusFilter]= useState("all");
  const [modal,       setModal]       = useState<Assignment | "new" | null>(null);
  const [deleting,    setDeleting]    = useState<string | null>(null);

  /* ── Load data ── */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [aRes, cRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/assignments?limit=200`, { headers: authHeader() }),
        fetch(`${API_BASE_URL}/api/courses?limit=200`,     { headers: authHeader() }),
      ]);
      const aData = await aRes.json();
      const cData = await cRes.json();
      setAssignments(Array.isArray(aData) ? aData : []);
      const allCourses: Course[] = Array.isArray(cData) ? cData : (cData.courses ?? []);
      setCourses(allCourses);
    } catch (err) {
      console.error("Load failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Delete ── */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assignment? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await fetch(`${API_BASE_URL}/api/assignments/${id}`, {
        method: "DELETE", headers: authHeader(),
      });
      setAssignments(prev => prev.filter(a => a._id !== id));
    } catch { alert("Delete failed. Please try again."); }
    finally { setDeleting(null); }
  };

  /* ── Filter ── */
  const filtered = assignments.filter(a => {
    const course = a.course as any;

    if (query) {
      const q = query.toLowerCase();
      if (
        !a.title.toLowerCase().includes(q) &&
        !(course?.title || "").toLowerCase().includes(q) &&
        !(a.description || "").toLowerCase().includes(q)
      ) return false;
    }

    if (courseFilter !== "all" && (course?._id || "") !== courseFilter) return false;

    if (typeFilter !== "all") {
      if (typeFilter === "academic" && course?.courseType !== "academic") return false;
      if (typeFilter === "private"  && course?.courseType !== "private")  return false;
    }

    if (statusFilter !== "all" && a.status !== statusFilter) return false;

    return true;
  });

  /* ── Stats ── */
  const counts = {
    total:      assignments.length,
    notStarted: assignments.filter(a => a.status === "Not Started").length,
    inProgress: assignments.filter(a => a.status === "In Progress").length,
    submitted:  assignments.filter(a => a.status === "Submitted").length,
    overdue:    assignments.filter(a => {
      const d = new Date(a.dueDate);
      return d < new Date() && a.status !== "Submitted";
    }).length,
  };

  const academicCourses = courses.filter(c => c.courseType === "academic");
  const privateCourses  = courses.filter(c => c.courseType === "private");

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create and manage assignments for all your courses
          </p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 gap-2 shrink-0"
          onClick={() => setModal("new")}
        >
          <Plus className="w-4 h-4" />
          New Assignment
        </Button>
      </div>

      {/* ── Course type info ── */}
      {(academicCourses.length > 0 || privateCourses.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {academicCourses.length > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <GraduationCap className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">{academicCourses.length} Academic Course{academicCourses.length !== 1 ? "s" : ""}</p>
                <p className="text-xs text-blue-600">Department-linked · Attendance tracked</p>
              </div>
            </div>
          )}
          {privateCourses.length > 0 && (
            <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
              <Lock className="w-5 h-5 text-purple-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-800">{privateCourses.length} Private Course{privateCourses.length !== 1 ? "s" : ""}</p>
                <p className="text-xs text-purple-600">Open enrollment · Lesson-based</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total",       value: counts.total,      color: "text-gray-900",   bg: "bg-white border"         },
          { label: "Not Started", value: counts.notStarted, color: "text-gray-600",   bg: "bg-gray-50 border"       },
          { label: "In Progress", value: counts.inProgress, color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
          { label: "Submitted",   value: counts.submitted,  color: "text-green-700",  bg: "bg-green-50 border-green-200" },
          { label: "Overdue",     value: counts.overdue,    color: "text-red-700",    bg: "bg-red-50 border-red-200"    },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search assignments..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* Course type filter */}
        <div className="flex gap-2">
          {(["all", "academic", "private"] as const).map(t => (
            <Button
              key={t}
              size="sm"
              variant={typeFilter === t ? "default" : "outline"}
              onClick={() => setTypeFilter(t)}
              className={`capitalize text-xs ${
                typeFilter === t && t === "academic" ? "bg-blue-600 hover:bg-blue-700" :
                typeFilter === t && t === "private"  ? "bg-purple-600 hover:bg-purple-700" : ""
              }`}
            >
              {t === "academic" && <GraduationCap className="w-3 h-3 mr-1" />}
              {t === "private"  && <Lock className="w-3 h-3 mr-1" />}
              {t === "all" ? "All Types" : t}
            </Button>
          ))}
        </div>

        {/* Status filter */}
        <select
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Submitted">Submitted</option>
        </select>

        {/* Course filter */}
        {courses.length > 0 && (
          <select
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
          >
            <option value="all">All Courses</option>
            <optgroup label="Academic Courses">
              {academicCourses.map(c => (
                <option key={c._id} value={c._id}>🎓 {c.title}</option>
              ))}
            </optgroup>
            <optgroup label="Private Courses">
              {privateCourses.map(c => (
                <option key={c._id} value={c._id}>🔒 {c.title}</option>
              ))}
            </optgroup>
          </select>
        )}
      </div>

      {/* ── Overdue alert ── */}
      {counts.overdue > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {counts.overdue} assignment{counts.overdue !== 1 ? "s are" : " is"} past the due date and not yet submitted.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto border-red-300 text-red-600 hover:bg-red-50 text-xs"
            onClick={() => setStatusFilter("Not Started")}
          >
            View overdue
          </Button>
        </div>
      )}

      {/* ── Assignment list ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {assignments.length === 0
              ? "No assignments yet. Create your first one!"
              : "No assignments match your filters."}
          </p>
          {assignments.length === 0 && (
            <Button
              className="mt-4 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setModal("new")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Assignment
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Showing {filtered.length} of {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {filtered
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .map(a => (
                <AssignmentCard
                  key={a._id}
                  assignment={a}
                  onEdit={() => setModal(a)}
                  onDelete={() => handleDelete(a._id)}
                />
              ))}
          </div>
        </>
      )}

      {/* ── Modal ── */}
      {modal !== null && (
        <AssignmentModal
          assignment={modal === "new" ? null : modal}
          courses={courses}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}