import { useEffect, useState, useCallback } from "react";
import { Plus, X, Calendar, BookOpen, Edit, Trash2, Search } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { getAssignments, createAssignment, deleteAssignment, updateAssignmentStatus } from "../../../services/assignmentService";
import { getCourses } from "../../../services/courseService";

export function InstructorAssignments() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", course: "", dueDate: "", maxMarks: "100",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [a, c] = await Promise.all([getAssignments(), getCourses()]);
      setAssignments(a || []);
      setCourses(c || []);
    } catch {
      console.error("Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = assignments.filter((a) =>
    a.title?.toLowerCase().includes(query.toLowerCase()) ||
    (typeof a.course === "string" ? a.course : a.course?.title || "").toLowerCase().includes(query.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.title.trim() || !form.dueDate) {
      setFormError("Title and due date are required.");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      await createAssignment({
        title: form.title,
        description: form.description,
        course: form.course,
        dueDate: form.dueDate,
        type: "Project",
        status: "Not Started",
        priority: "medium",
      } as any);
      setModalOpen(false);
      setForm({ title: "", description: "", course: "", dueDate: "", maxMarks: "100" });
      await load();
    } catch (err: any) {
      setFormError(err.message || "Failed to create assignment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    setAssignments((prev) => prev.filter((a) => a._id !== id));
    try { await deleteAssignment(id); } catch { await load(); }
  };

  const statusColor = (s: string) => {
    if (s === "Submitted") return "bg-green-100 text-green-700";
    if (s === "In Progress") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-600";
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Assignments</h1>
          <p className="text-gray-500">Create and manage course assignments</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Assignment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: assignments.length, color: "text-indigo-600" },
          { label: "Active", value: assignments.filter((a) => a.status !== "Submitted").length, color: "text-amber-600" },
          { label: "Submitted", value: assignments.filter((a) => a.status === "Submitted").length, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input className="pl-10" placeholder="Search assignments..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-3" />
          <p>No assignments yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Card key={a._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{a.title}</h3>
                      <Badge className={statusColor(a.status)}>{a.status}</Badge>
                    </div>
                    {a.description && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{a.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Due: {new Date(a.dueDate).toLocaleDateString()}
                      </span>
                      {a.course && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {typeof a.course === "object" ? a.course.title : a.course}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(a._id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">New Assignment</h3>
              <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}><X /></Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input className="mt-1" placeholder="e.g., Build a REST API" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea className="mt-1" placeholder="Assignment instructions..." rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Course</Label>
                  <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.course} onChange={(e) => setForm((f) => ({ ...f, course: e.target.value }))}>
                    <option value="">Select course</option>
                    {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Due Date *</Label>
                  <Input type="date" className="mt-1" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Max Marks</Label>
                <Input type="number" className="mt-1" value={form.maxMarks} onChange={(e) => setForm((f) => ({ ...f, maxMarks: e.target.value }))} />
              </div>
            </div>
            {formError && <p className="text-red-500 text-sm mt-3">{formError}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleCreate} disabled={saving}>
                {saving ? "Creating..." : "Create Assignment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
