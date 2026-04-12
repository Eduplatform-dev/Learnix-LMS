import { useEffect, useState, useCallback } from "react";
import {
  Calendar, Clock, MapPin, Plus, X, Trash2, Edit, Filter,
  BookOpen, Users, AlertCircle, CheckCircle, Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Textarea } from "../../ui/textarea";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

type Exam = {
  _id: string;
  title: string;
  subject: string;
  subjectCode: string;
  examDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  room: string;
  building: string;
  totalMarks: number;
  passingMarks: number;
  examType: string;
  status: string;
  instructions: string;
  department?: { _id: string; name: string; code: string } | null;
  semesterNumber?: number | null;
};

const EXAM_TYPE_COLORS: Record<string, string> = {
  midterm:    "bg-blue-100 text-blue-700",
  final:      "bg-purple-100 text-purple-700",
  unit_test:  "bg-amber-100 text-amber-700",
  practical:  "bg-green-100 text-green-700",
  viva:       "bg-pink-100 text-pink-700",
  internal:   "bg-slate-100 text-slate-700",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled:  "bg-blue-100 text-blue-700",
  ongoing:    "bg-green-100 text-green-700",
  completed:  "bg-gray-100 text-gray-600",
  cancelled:  "bg-red-100 text-red-700",
};

function ExamModal({
  exam,
  departments,
  onClose,
  onSaved,
}: {
  exam: Exam | null;
  departments: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title:          exam?.title          || "",
    subject:        exam?.subject        || "",
    subjectCode:    exam?.subjectCode    || "",
    department:     exam?.department?._id || "",
    semesterNumber: exam?.semesterNumber != null ? String(exam.semesterNumber) : "",
    examDate:       exam?.examDate ? new Date(exam.examDate).toISOString().split("T")[0] : "",
    startTime:      exam?.startTime      || "09:00",
    endTime:        exam?.endTime        || "12:00",
    duration:       String(exam?.duration || 180),
    room:           exam?.room           || "",
    building:       exam?.building       || "",
    totalMarks:     String(exam?.totalMarks   || 100),
    passingMarks:   String(exam?.passingMarks || 40),
    examType:       exam?.examType       || "midterm",
    instructions:   exam?.instructions   || "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title || !form.subject || !form.examDate) {
      setError("Title, subject, and date are required"); return;
    }
    setSaving(true); setError("");
    try {
      const url    = exam ? `${API_BASE_URL}/api/exams/${exam._id}` : `${API_BASE_URL}/api/exams`;
      const method = exam ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: authHeader(),
        body: JSON.stringify({
          ...form,
          semesterNumber: form.semesterNumber ? Number(form.semesterNumber) : null,
          duration:       Number(form.duration),
          totalMarks:     Number(form.totalMarks),
          passingMarks:   Number(form.passingMarks),
          department:     form.department || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved(); onClose();
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg text-gray-900">{exam ? "Edit Exam" : "Schedule Exam"}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Exam Title *</Label>
              <Input className="mt-1" placeholder="e.g., Mid-Semester Examination" value={form.title} onChange={e => set("title", e.target.value)} />
            </div>
            <div>
              <Label>Subject *</Label>
              <Input className="mt-1" placeholder="e.g., Data Structures" value={form.subject} onChange={e => set("subject", e.target.value)} />
            </div>
            <div>
              <Label>Subject Code</Label>
              <Input className="mt-1" placeholder="e.g., CS301" value={form.subjectCode} onChange={e => set("subjectCode", e.target.value)} />
            </div>
            <div>
              <Label>Department</Label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.department} onChange={e => set("department", e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Semester</Label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.semesterNumber} onChange={e => set("semesterNumber", e.target.value)}>
                <option value="">All Semesters</option>
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n}</option>)}
              </select>
            </div>
            <div>
              <Label>Exam Date *</Label>
              <Input type="date" className="mt-1" value={form.examDate} onChange={e => set("examDate", e.target.value)} />
            </div>
            <div>
              <Label>Exam Type</Label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.examType} onChange={e => set("examType", e.target.value)}>
                <option value="midterm">Mid-Term</option>
                <option value="final">Final</option>
                <option value="unit_test">Unit Test</option>
                <option value="practical">Practical</option>
                <option value="viva">Viva</option>
                <option value="internal">Internal</option>
              </select>
            </div>
            <div>
              <Label>Start Time *</Label>
              <Input type="time" className="mt-1" value={form.startTime} onChange={e => set("startTime", e.target.value)} />
            </div>
            <div>
              <Label>End Time *</Label>
              <Input type="time" className="mt-1" value={form.endTime} onChange={e => set("endTime", e.target.value)} />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" className="mt-1" value={form.duration} onChange={e => set("duration", e.target.value)} />
            </div>
            <div>
              <Label>Room Number</Label>
              <Input className="mt-1" placeholder="e.g., Lab 204, Hall A" value={form.room} onChange={e => set("room", e.target.value)} />
            </div>
            <div>
              <Label>Building</Label>
              <Input className="mt-1" placeholder="e.g., Main Block" value={form.building} onChange={e => set("building", e.target.value)} />
            </div>
            <div>
              <Label>Total Marks</Label>
              <Input type="number" className="mt-1" value={form.totalMarks} onChange={e => set("totalMarks", e.target.value)} />
            </div>
            <div>
              <Label>Passing Marks</Label>
              <Input type="number" className="mt-1" value={form.passingMarks} onChange={e => set("passingMarks", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Instructions / Notes</Label>
              <Textarea className="mt-1" rows={3} placeholder="Exam instructions, allowed materials, etc." value={form.instructions} onChange={e => set("instructions", e.target.value)} />
            </div>
          </div>
          {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : exam ? "Update Exam" : "Schedule Exam"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminExams() {
  const [exams,       setExams]       = useState<Exam[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<Exam | "new" | null>(null);
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [statusFilter,setStatusFilter]= useState("all");
  const [deleting,    setDeleting]    = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [exRes, deptRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/exams`, { headers: authHeader() }),
        fetch(`${API_BASE_URL}/api/departments`, { headers: authHeader() }),
      ]);
      setExams(exRes.ok    ? await exRes.json()    : []);
      setDepartments(deptRes.ok ? await deptRes.json() : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this exam?")) return;
    setDeleting(id);
    try {
      await fetch(`${API_BASE_URL}/api/exams/${id}`, { method: "DELETE", headers: authHeader() });
      setExams(prev => prev.filter(e => e._id !== id));
    } finally { setDeleting(null); }
  };

  const filtered = exams.filter(e => {
    const mq = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.subject.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter   === "all" || e.examType === typeFilter;
    const ms = statusFilter === "all" || e.status   === statusFilter;
    return mq && mt && ms;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, Exam[]>>((acc, exam) => {
    const d = new Date(exam.examDate).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!acc[d]) acc[d] = [];
    acc[d].push(exam);
    return acc;
  }, {});

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Exam Schedule</h1>
          <p className="text-gray-500 text-sm mt-1">Manage exam dates, times, rooms and instructions</p>
        </div>
        <Button onClick={() => setModal("new")}>
          <Plus className="w-4 h-4 mr-2" />Schedule Exam
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Scheduled", value: exams.length,                                       color: "text-gray-900" },
          { label: "Upcoming",        value: exams.filter(e => e.status === "scheduled").length,  color: "text-blue-600" },
          { label: "Completed",       value: exams.filter(e => e.status === "completed").length,  color: "text-green-600" },
          { label: "Cancelled",       value: exams.filter(e => e.status === "cancelled").length,  color: "text-red-600"  },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search exams..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="border rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="midterm">Mid-Term</option>
            <option value="final">Final</option>
            <option value="unit_test">Unit Test</option>
            <option value="practical">Practical</option>
            <option value="viva">Viva</option>
            <option value="internal">Internal</option>
          </select>
          <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Exam Timeline */}
      {Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No exams scheduled yet.</p>
          <Button className="mt-4" onClick={() => setModal("new")}><Plus className="w-4 h-4 mr-2" />Schedule First Exam</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayExams]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{date}</h3>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{dayExams.length} exam{dayExams.length > 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-13">
                {dayExams.map(exam => (
                  <Card key={exam._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{exam.title}</h4>
                          <p className="text-sm text-gray-600">{exam.subject} {exam.subjectCode && `(${exam.subjectCode})`}</p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Badge className={`text-xs ${EXAM_TYPE_COLORS[exam.examType] || "bg-gray-100 text-gray-600"}`}>
                            {exam.examType.replace("_", " ")}
                          </Badge>
                          <Badge className={`text-xs ${STATUS_COLORS[exam.status] || "bg-gray-100"}`}>
                            {exam.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{exam.startTime} – {exam.endTime}</span>
                        {exam.room && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{exam.room}{exam.building ? `, ${exam.building}` : ""}</span>}
                        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{exam.totalMarks} marks (pass: {exam.passingMarks})</span>
                        {exam.semesterNumber && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Sem {exam.semesterNumber}</span>}
                      </div>
                      {exam.instructions && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2 italic">"{exam.instructions}"</p>
                      )}
                      <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                        <Button size="sm" variant="ghost" onClick={() => setModal(exam)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500" disabled={deleting === exam._id} onClick={() => handleDelete(exam._id)}>
                          {deleting === exam._id ? "..." : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <ExamModal
          exam={modal === "new" ? null : modal}
          departments={departments}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
