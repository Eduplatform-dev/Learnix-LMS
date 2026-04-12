import { useEffect, useState, useCallback } from "react";
import {
  BookOpen, Users, Clock, Trash2, Star, Archive, ArchiveRestore,
  Layers, X, CheckCircle, XCircle, AlertCircle, Eye,
  Lock, Unlock, DollarSign, GraduationCap, Search,
} from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";

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

type Lesson = {
  _id:        string;
  title:      string;
  type:       string;
  isPreview:  boolean;
  duration:   number;
  order:      number;
};

const approvalBadge = (status: string) => {
  if (status === "approved")         return <Badge className="bg-green-100 text-green-700 text-xs">Approved</Badge>;
  if (status === "pending_approval") return <Badge className="bg-amber-100 text-amber-700 text-xs">Pending Approval</Badge>;
  if (status === "rejected")         return <Badge className="bg-red-100 text-red-700 text-xs">Rejected</Badge>;
  return null;
};

const typeIcon = (type: string) => {
  if (type === "video") return "🎬";
  if (type === "pdf")   return "📄";
  if (type === "quiz")  return "❓";
  return "📝";
};

/* ─── Lessons Panel (fixed: loads all lessons for admin) ─ */
function LessonsPanel({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/api/lessons/course/${courseId}`, {
          headers: authHeader(),
        });
        const data = await res.json();
        // API returns { lessons, progress } — extract lessons array
        setLessons(Array.isArray(data) ? data : (data.lessons ?? []));
      } catch {
        setLessons([]);
      } finally {
        setLoading(false);
      }
    };
    load();
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
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No lessons added yet.</p>
            </div>
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
                      {lesson.isPreview && (
                        <span className="text-xs text-amber-600 flex items-center gap-0.5">
                          <Eye className="w-3 h-3" />Preview
                        </span>
                      )}
                      {lesson.duration > 0 && (
                        <span className="text-xs text-gray-400">
                          {Math.floor(lesson.duration / 60)}m {lesson.duration % 60}s
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={`text-xs ${lesson.isPreview ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                    {lesson.isPreview ? "Free" : "Enrolled"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Reject Modal ────────────────────────────────────── */
function RejectModal({
  course,
  onConfirm,
  onClose,
}: {
  course: Course;
  onConfirm: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl">
        <h3 className="font-semibold text-lg mb-1">Reject Course</h3>
        <p className="text-sm text-gray-500 mb-4">
          Provide a reason so the instructor knows what to fix in <strong>{course.title}</strong>.
        </p>
        <Textarea
          rows={3}
          placeholder="e.g. Please add a proper course description and at least 3 lessons before resubmitting."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => onConfirm(note)}
            disabled={!note.trim()}
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────────── */
export function AdminCourses() {
  const [courses,      setCourses]      = useState<Course[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [query,        setQuery]        = useState("");
  const [filter,       setFilter]       = useState<"all" | "pending_approval" | "approved" | "rejected">("all");
  const [typeFilter,   setTypeFilter]   = useState<"all" | "academic" | "private">("all");
  const [lessonsFor,   setLessonsFor]   = useState<string | null>(null);
  const [rejectCourse, setRejectCourse] = useState<Course | null>(null);
  const [acting,       setActing]       = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_BASE_URL}/api/courses?limit=200`, { headers: authHeader() });
      const data = await res.json();
      const raw: any[] = Array.isArray(data) ? data : (data.courses ?? []);
      setCourses(raw as Course[]);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (course: Course) => {
    setActing(course._id);
    try {
      await fetch(`${API_BASE_URL}/api/courses/${course._id}/approve`, {
        method:  "PATCH",
        headers: authHeader(),
        body:    JSON.stringify({ action: "approve" }),
      });
      await load();
    } finally { setActing(null); }
  };

  const handleReject = async (course: Course, note: string) => {
    setActing(course._id);
    setRejectCourse(null);
    try {
      await fetch(`${API_BASE_URL}/api/courses/${course._id}/approve`, {
        method:  "PATCH",
        headers: authHeader(),
        body:    JSON.stringify({ action: "reject", rejectionNote: note }),
      });
      await load();
    } finally { setActing(null); }
  };

  const handleArchive = async (course: Course) => {
    const newStatus = course.status === "archived" ? "active" : "archived";
    setActing(course._id);
    try {
      await fetch(`${API_BASE_URL}/api/courses/${course._id}`, {
        method:  "PUT",
        headers: authHeader(),
        body:    JSON.stringify({ status: newStatus }),
      });
      await load();
    } finally { setActing(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this course?")) return;
    setCourses((prev) => prev.filter((c) => c._id !== id));
    try {
      await fetch(`${API_BASE_URL}/api/courses/${id}`, {
        method: "DELETE", headers: authHeader(),
      });
    } catch { await load(); }
  };

  const filtered = courses.filter((c) => {
    const mq = !query ||
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      (typeof c.instructor === "object" ? c.instructor.username : "").toLowerCase().includes(query.toLowerCase());
    const mf = filter === "all" || c.approvalStatus === filter;
    const mt = typeFilter === "all" || c.courseType === typeFilter;
    return mq && mf && mt;
  });

  const counts = {
    all:              courses.length,
    pending_approval: courses.filter((c) => c.approvalStatus === "pending_approval").length,
    approved:         courses.filter((c) => c.approvalStatus === "approved").length,
    rejected:         courses.filter((c) => c.approvalStatus === "rejected").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Course Management</h1>
        <p className="text-gray-500 text-sm mt-1">
          Review, approve and manage all platform courses.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          ["all",              "Total",            "bg-gray-100 text-gray-700"],
          ["pending_approval", "Pending Approval",  "bg-amber-100 text-amber-700"],
          ["approved",         "Approved",          "bg-green-100 text-green-700"],
          ["rejected",         "Rejected",          "bg-red-100 text-red-700"],
        ] as const).map(([key, label, cls]) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all hover:shadow-md ${filter === key ? "ring-2 ring-indigo-500" : ""}`}
            onClick={() => setFilter(key)}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{counts[key]}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" placeholder="Search by title or instructor..." />
        </div>
        <div className="flex gap-2">
          {(["all","academic","private"] as const).map((t) => (
            <Button key={t} size="sm" variant={typeFilter === t ? "default" : "outline"} onClick={() => setTypeFilter(t)} className="capitalize">
              {t === "all" ? "All Types" : t}
            </Button>
          ))}
        </div>
      </div>

      {/* Pending approval banner */}
      {counts.pending_approval > 0 && filter !== "pending_approval" && (
        <div
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 cursor-pointer"
          onClick={() => setFilter("pending_approval")}
        >
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {counts.pending_approval} course{counts.pending_approval > 1 ? "s" : ""} waiting for your approval
          </p>
          <span className="ml-auto text-xs text-amber-600 underline">Review now →</span>
        </div>
      )}

      {/* Course List */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No courses found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((course) => {
            const instructorName = typeof course.instructor === "object"
              ? course.instructor.username
              : "—";
            const enrolled = course.enrolledStudents?.length ?? 0;

            return (
              <Card key={course._id} className={`hover:shadow-md transition-shadow ${course.status === "archived" ? "opacity-60" : ""}`}>
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        course.courseType === "academic" ? "bg-indigo-100" : "bg-purple-100"
                      }`}>
                        {course.courseType === "academic"
                          ? <GraduationCap className="w-5 h-5 text-indigo-600" />
                          : <Lock className="w-5 h-5 text-purple-600" />
                        }
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                        <p className="text-sm text-gray-500 truncate">{instructorName}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      {approvalBadge(course.approvalStatus)}
                      <Badge className={`text-xs ${course.courseType === "academic" ? "bg-indigo-50 text-indigo-600" : "bg-purple-50 text-purple-600"}`}>
                        {course.courseType}
                      </Badge>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 mb-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{enrolled} students</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{course.duration}</span>
                    <span className="flex items-center gap-1 text-amber-500"><Star className="w-3.5 h-3.5 fill-current" />{course.rating}</span>
                    {course.courseType === "private" && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        {course.isFree ? "Free" : `₹${course.price}`}
                      </span>
                    )}
                    {course.courseType === "academic" && course.department && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        {(course.department as any).name} · Sem {course.semesterNumber}
                      </span>
                    )}
                  </div>

                  {/* Rejection note */}
                  {course.approvalStatus === "rejected" && course.rejectionNote && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs text-red-600"><span className="font-medium">Rejection note:</span> {course.rejectionNote}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t flex-wrap">
                    <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => setLessonsFor(course._id)}>
                      <Layers className="w-3.5 h-3.5" />Lessons
                    </Button>

                    {/* Approve / Reject — only for pending */}
                    {course.approvalStatus === "pending_approval" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-xs gap-1"
                          disabled={acting === course._id}
                          onClick={() => handleApprove(course)}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {acting === course._id ? "..." : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 text-xs gap-1"
                          disabled={acting === course._id}
                          onClick={() => setRejectCourse(course)}
                        >
                          <XCircle className="w-3.5 h-3.5" />Reject
                        </Button>
                      </>
                    )}

                    {/* Re-approve rejected course */}
                    {course.approvalStatus === "rejected" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-xs gap-1"
                        disabled={acting === course._id}
                        onClick={() => handleApprove(course)}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {acting === course._id ? "..." : "Approve"}
                      </Button>
                    )}

                    {/* Archive toggle — only for approved */}
                    {course.approvalStatus === "approved" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1"
                        disabled={acting === course._id}
                        onClick={() => handleArchive(course)}
                      >
                        {course.status === "archived"
                          ? <><ArchiveRestore className="w-3.5 h-3.5" />Restore</>
                          : <><Archive className="w-3.5 h-3.5" />Archive</>
                        }
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(course._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lessons Panel */}
      {lessonsFor && (
        <LessonsPanel courseId={lessonsFor} onClose={() => setLessonsFor(null)} />
      )}

      {/* Reject Modal */}
      {rejectCourse && (
        <RejectModal
          course={rejectCourse}
          onConfirm={(note) => handleReject(rejectCourse, note)}
          onClose={() => setRejectCourse(null)}
        />
      )}
    </div>
  );
}