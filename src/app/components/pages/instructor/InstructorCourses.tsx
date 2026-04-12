import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, BookOpen, Users, Clock, Edit, Trash2, X, Star,
  GripVertical, Video, FileText, Type, HelpCircle, ChevronDown,
  ChevronRight, Eye, Upload, Link, ToggleLeft, ToggleRight, Layers,
} from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  getCourses, createCourse, deleteCourse, updateCourse, type Course,
} from "../../../services/courseService";
import {
  getCourseLessons, createLesson, updateLesson, deleteLesson,
  reorderLessons, type Lesson,
} from "../../../services/lessonService";

type LessonType = "video" | "pdf" | "text" | "quiz";

const TYPE_META = {
  video: { icon: Video,      label: "Video",    color: "text-blue-600 bg-blue-50",    desc: "Upload or link a video" },
  pdf:   { icon: FileText,  label: "PDF",     color: "text-red-600 bg-red-50",     desc: "Upload or link a PDF document" },
  text:  { icon: Type,       label: "Text",     color: "text-green-600 bg-green-50",   desc: "Write text content" },
  quiz:  { icon: HelpCircle, label: "Quiz",     color: "text-purple-600 bg-purple-50", desc: "Multiple choice questions" },
};

/* ─── Lesson Editor Modal ─────────────────────────────── */
function LessonModal({
  courseId,
  lesson,
  onClose,
  onSave,
}: {
  courseId: string;
  lesson: Lesson | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [type, setType] = useState<LessonType>(lesson?.type || "video");
  const [title, setTitle] = useState(lesson?.title || "");
  const [description, setDescription] = useState(lesson?.description || "");
  const [contentUrl, setContentUrl] = useState(lesson?.contentUrl || "");
  const [textContent, setTextContent] = useState(lesson?.textContent || "");
  const [duration, setDuration] = useState(lesson?.duration?.toString() || "");
  const [isPreview, setIsPreview] = useState(lesson?.isPreview || false);
  const [file, setFile] = useState<File | null>(null);
  const [quiz, setQuiz] = useState(lesson?.quiz || [{ question: "", options: ["", "", "", ""], correctIndex: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      if (file) {
        const fd = new FormData();
        fd.append("title", title.trim());
        fd.append("description", description.trim());
        fd.append("type", type);
        fd.append("isPreview", String(isPreview));
        fd.append("duration", duration || "0");
        if (type === "text") fd.append("textContent", textContent);
        if (type === "quiz") fd.append("quiz", JSON.stringify(quiz));
        fd.append("file", file);
        if (lesson) await updateLesson(lesson._id, fd);
        else await createLesson(courseId, fd);
      } else {
        const data = {
          title: title.trim(), description: description.trim(),
          type, contentUrl, textContent, isPreview,
          duration: parseInt(duration) || 0,
          quiz: type === "quiz" ? quiz : [],
        };
        if (lesson) await updateLesson(lesson._id, data);
        else await createLesson(courseId, data);
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => setQuiz(q => [...q, { question: "", options: ["", "", "", ""], correctIndex: 0 }]);
  const removeQuestion = (i: number) => setQuiz(q => q.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, field: string, val: any) =>
    setQuiz(q => q.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const updateOption = (qi: number, oi: number, val: string) =>
    setQuiz(q => q.map((item, idx) => idx === qi ? { ...item, options: item.options.map((o, oidx) => oidx === oi ? val : o) } : item));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
          <h3 className="font-semibold text-lg">{lesson ? "Edit Lesson" : "Add New Lesson"}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Type Selector */}
          <div>
            <Label className="mb-2 block">Lesson Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(TYPE_META) as [LessonType, typeof TYPE_META.video][]).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setType(key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                      type === key
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Title *</Label>
            <Input className="mt-1" placeholder="e.g., Introduction to React Hooks" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={2} placeholder="What will students learn?" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Content by type */}
          {(type === "video" || type === "pdf") && (
            <div className="space-y-3">
              <div>
                <Label>Upload File</Label>
                <input
                  type="file"
                  accept={type === "video" ? "video/*" : "application/pdf"}
                  className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or paste URL</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div>
                <div className="flex items-center gap-2 mt-1">
                  <Link className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <Input placeholder={`${type === "video" ? "https://..." : "https://.../file.pdf"}`} value={contentUrl} onChange={e => setContentUrl(e.target.value)} />
                </div>
              </div>
              {type === "video" && (
                <div>
                  <Label>Duration (seconds)</Label>
                  <Input className="mt-1" type="number" placeholder="e.g., 600 for 10 minutes" value={duration} onChange={e => setDuration(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {type === "text" && (
            <div>
              <Label>Content</Label>
              <Textarea
                className="mt-1 font-mono text-sm"
                rows={10}
                placeholder="Write your lesson content here..."
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
              />
            </div>
          )}

          {type === "quiz" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Questions</Label>
                <Button size="sm" variant="outline" onClick={addQuestion}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Question
                </Button>
              </div>
              {quiz.map((q, qi) => (
                <div key={qi} className="border rounded-xl p-4 space-y-3 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-medium text-gray-500">Question {qi + 1}</span>
                    {quiz.length > 1 && (
                      <button onClick={() => removeQuestion(qi)} className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Input
                    placeholder="Enter question..."
                    value={q.question}
                    onChange={e => updateQuestion(qi, "question", e.target.value)}
                  />
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Options (mark correct one)</p>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuestion(qi, "correctIndex", oi)}
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                            q.correctIndex === oi ? "border-green-500 bg-green-500" : "border-gray-300"
                          }`}
                        />
                        <Input
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          value={opt}
                          onChange={e => updateOption(qi, oi, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settings */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Free Preview</p>
              <p className="text-xs text-gray-500">Allow non-enrolled students to view</p>
            </div>
            <button onClick={() => setIsPreview(v => !v)} className="text-indigo-600">
              {isPreview ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 p-6 border-t flex-shrink-0">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : lesson ? "Update Lesson" : "Add Lesson"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Course Card with expandable lessons ─────────────── */
function CourseRow({
  course,
  onEdit,
  onDelete,
}: {
  course: Course;
  onEdit: (c: Course) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [lessonModal, setLessonModal] = useState<Lesson | null | "new">(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const loadLessons = async () => {
    if (loadingLessons) return;
    setLoadingLessons(true);
    try {
      const data = await getCourseLessons(course._id);
      setLessons(data.lessons);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLessons(false);
    }
  };

  const toggle = () => {
    if (!expanded) loadLessons();
    setExpanded(e => !e);
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Delete this lesson?")) return;
    try {
      await deleteLesson(id);
      setLessons(prev => prev.filter(l => l._id !== id));
    } catch (err: any) {
      alert(err.message || "Delete failed");
    }
  };

  const handleDrop = async (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    const from = lessons.findIndex(l => l._id === dragging);
    const to = lessons.findIndex(l => l._id === targetId);
    const reordered = [...lessons];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setLessons(reordered);
    try {
      await reorderLessons(course._id, reordered.map(l => l._id));
    } catch (err) {
      console.error(err);
      loadLessons();
    }
    setDragging(null);
  };

  return (
    <Card className="overflow-hidden">
      {/* Course Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">{course.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{course.duration}</p>
              </div>
              <Badge className={course.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                {course.status || "active"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{course.students ?? 0} students</span>
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{course.rating ?? 4.5}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Layers className="w-4 h-4" />
            {expanded ? "Hide" : "Manage"} Lessons
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => onEdit(course)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => onDelete(course._id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Lessons Panel */}
      {expanded && (
        <div className="border-t bg-gray-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">
                {lessons.length} Lesson{lessons.length !== 1 ? "s" : ""}
              </p>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                onClick={() => setLessonModal("new")}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Lesson
              </Button>
            </div>

            {loadingLessons ? (
              <div className="py-4 text-center text-gray-400 text-sm">Loading...</div>
            ) : lessons.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-xl">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No lessons yet.</p>
                <button onClick={() => setLessonModal("new")} className="text-indigo-600 text-xs mt-1 hover:underline">
                  Add your first lesson →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {lessons.map((lesson, idx) => {
                  const meta = TYPE_META[lesson.type] || TYPE_META.text;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={lesson._id}
                      draggable
                      onDragStart={() => setDragging(lesson._id)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => handleDrop(lesson._id)}
                      className={`flex items-center gap-3 bg-white rounded-xl p-3 border transition-all ${
                        dragging === lesson._id ? "opacity-50 border-indigo-300" : "border-gray-200 hover:border-indigo-200"
                      }`}
                    >
                      <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0" />
                      <span className="text-xs text-gray-400 w-5 flex-shrink-0">{idx + 1}.</span>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{lesson.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                          {lesson.isPreview && (
                            <span className="text-xs text-amber-600 flex items-center gap-0.5">
                              <Eye className="w-3 h-3" />
                              Preview
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setLessonModal(lesson)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                          onClick={() => handleDeleteLesson(lesson._id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {lessonModal !== null && (
        <LessonModal
          courseId={course._id}
          lesson={lessonModal === "new" ? null : lessonModal}
          onClose={() => setLessonModal(null)}
          onSave={loadLessons}
        />
      )}
    </Card>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export function InstructorCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [courseModal, setCourseModal] = useState<Course | "new" | null>(null);
  const [form, setForm] = useState({ title: "", duration: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setCourses(await getCourses() || []);
    } catch { console.error("Load failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = courses.filter(c =>
    c.title?.toLowerCase().includes(query.toLowerCase())
  );

  const openCreate = () => {
    setCourseModal("new");
    setForm({ title: "", duration: "", description: "" });
    setFormError("");
  };

  const openEdit = (course: Course) => {
    setCourseModal(course);
    setForm({ title: course.title, duration: course.duration, description: "" });
    setFormError("");
  };

  const handleSaveCourse = async () => {
    if (!form.title.trim() || !form.duration.trim()) {
      setFormError("Title and duration are required");
      return;
    }
    setSaving(true);
    try {
      if (courseModal === "new") {
        await createCourse({ title: form.title, duration: form.duration });
      } else if (courseModal && typeof courseModal !== "string") {
        await updateCourse(courseModal._id, form);
      }
      setCourseModal(null);
      await load();
    } catch {
      setFormError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Delete this course and all its lessons?")) return;
    setCourses(prev => prev.filter(c => c._id !== id));
    try { await deleteCourse(id); } catch { await load(); }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-500 text-sm mt-1">Build and manage your course curriculum</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Course
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Courses", value: courses.length },
          { label: "Active",        value: courses.filter(c => c.status === "active").length },
          { label: "Total Students", value: courses.reduce((s, c) => s + (c.students || 0), 0) },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input className="pl-9" placeholder="Search courses..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {/* Course List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No courses found.</p>
          <button onClick={openCreate} className="text-indigo-600 text-sm mt-2 hover:underline">
            Create your first course →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(course => (
            <CourseRow
              key={course._id}
              course={course}
              onEdit={openEdit}
              onDelete={handleDeleteCourse}
            />
          ))}
        </div>
      )}

      {/* Course Modal */}
      {courseModal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold text-lg">
                {courseModal === "new" ? "Create New Course" : "Edit Course"}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setCourseModal(null)}><X /></Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Course Title *</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g., Complete React Developer Course"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Duration *</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g., 8 weeks or 24 hours"
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  placeholder="What will students learn?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            {formError && <p className="text-red-500 text-sm mt-3">{formError}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setCourseModal(null)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSaveCourse} disabled={saving}>
                {saving ? "Saving..." : courseModal === "new" ? "Create Course" : "Update Course"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}