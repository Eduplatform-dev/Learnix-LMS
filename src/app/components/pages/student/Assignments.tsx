// src/app/components/pages/student/Assignments.tsx
// MERGED: Assignments + Submissions in one page
// Assignment types: Quiz (MCQ), Theoretical, Attachment-based

import { useEffect, useState, useRef } from "react";
import {
  Calendar, Clock, BookOpen, CheckCircle, AlertCircle,
  Upload, File, X, Save, Send, ChevronDown, ChevronRight,
  HelpCircle, FileText, Paperclip, Plus, Minus, Eye, EyeOff,
  Download, Star, RotateCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import {
  getAssignments,
  updateAssignmentStatus,
  type Assignment,
  type AssignmentStatus,
} from "../../../services/assignmentService";
import {
  createSubmission,
  getSubmissions,
  type Submission,
} from "../../../services/submissionService";

/* ─── Types ─────────────────────────────────────────────── */
type AssignmentTypeUI = "quiz" | "theoretical" | "attachment";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  selectedOption: number | null;
}

/* ─── Helpers ────────────────────────────────────────────── */
const statusStyles: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-600 border-gray-200",
  "In Progress":  "bg-blue-100 text-blue-700 border-blue-200",
  "Submitted":    "bg-green-100 text-green-700 border-green-200",
};

const priorityDot: Record<string, string> = {
  high:   "bg-red-500",
  medium: "bg-amber-500",
  low:    "bg-green-500",
};

const typeIcon = (type: AssignmentTypeUI | string) => {
  if (type === "quiz")        return <HelpCircle className="w-4 h-4 text-purple-600" />;
  if (type === "theoretical") return <FileText className="w-4 h-4 text-blue-600" />;
  if (type === "attachment")  return <Paperclip className="w-4 h-4 text-amber-600" />;
  return <BookOpen className="w-4 h-4 text-indigo-600" />;
};

const typeLabel: Record<string, string> = {
  quiz:         "Quiz (MCQ)",
  theoretical:  "Theoretical",
  attachment:   "Attachment",
};

const typeColors: Record<string, string> = {
  quiz:        "bg-purple-50 text-purple-700 border-purple-200",
  theoretical: "bg-blue-50 text-blue-700 border-blue-200",
  attachment:  "bg-amber-50 text-amber-700 border-amber-200",
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* ─── Quiz Submission Component ──────────────────────────── */
function QuizForm({
  assignment,
  onSubmit,
  onSaveDraft,
  existing,
}: {
  assignment: Assignment;
  onSubmit: (answers: string) => void;
  onSaveDraft: (answers: string) => void;
  existing?: Submission | null;
}) {
  // Parse quiz questions from description or generate sample
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => {
    try {
      const parsed = JSON.parse(assignment.description || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((q: any, i: number) => ({
          id: String(i),
          question: q.question || "",
          options: q.options || ["", "", "", ""],
          selectedOption: null,
        }));
      }
    } catch {}
    // Fallback: create 3 sample questions
    return [
      { id: "1", question: "Sample Question 1 (Admin sets real questions)", options: ["Option A", "Option B", "Option C", "Option D"], selectedOption: null },
      { id: "2", question: "Sample Question 2", options: ["Option A", "Option B", "Option C", "Option D"], selectedOption: null },
      { id: "3", question: "Sample Question 3", options: ["Option A", "Option B", "Option C", "Option D"], selectedOption: null },
    ];
  });

  const [submitted, setSubmitted] = useState(false);

  const allAnswered = questions.every(q => q.selectedOption !== null);
  const answeredCount = questions.filter(q => q.selectedOption !== null).length;

  const serializeAnswers = () =>
    JSON.stringify(questions.map(q => ({
      question: q.question,
      selected: q.selectedOption,
      answer: q.selectedOption !== null ? q.options[q.selectedOption] : null,
    })));

  const handleSelect = (qIdx: number, optIdx: number) => {
    setQuestions(prev =>
      prev.map((q, i) => i === qIdx ? { ...q, selectedOption: optIdx } : q)
    );
  };

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between bg-purple-50 rounded-xl px-4 py-3">
        <span className="text-sm font-medium text-purple-700">
          {answeredCount} of {questions.length} answered
        </span>
        <div className="flex gap-1">
          {questions.map((q, i) => (
            <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${q.selectedOption !== null ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"}`}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Questions */}
      {questions.map((q, qi) => (
        <div key={q.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="font-semibold text-gray-900 text-sm">
            <span className="text-purple-600 mr-2">Q{qi + 1}.</span>
            {q.question}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => handleSelect(qi, oi)}
                className={`text-left px-4 py-2.5 rounded-lg border-2 transition-all text-sm ${
                  q.selectedOption === oi
                    ? "border-purple-500 bg-purple-50 text-purple-900 font-medium"
                    : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                }`}
              >
                <span className="font-bold mr-2 text-purple-500">{String.fromCharCode(65 + oi)}.</span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <Button
          className="flex-1 bg-purple-600 hover:bg-purple-700 gap-2"
          disabled={!allAnswered}
          onClick={() => { onSubmit(serializeAnswers()); setSubmitted(true); }}
        >
          <Send className="w-4 h-4" />Submit Quiz
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => onSaveDraft(serializeAnswers())}>
          <Save className="w-4 h-4" />Save Draft
        </Button>
      </div>
      {!allAnswered && (
        <p className="text-xs text-amber-600 text-center">
          Answer all {questions.length} questions before submitting
        </p>
      )}
    </div>
  );
}

/* ─── Theoretical Submission Component ───────────────────── */
function TheoreticalForm({
  onSubmit,
  onSaveDraft,
  existing,
}: {
  onSubmit: (text: string) => void;
  onSaveDraft: (text: string) => void;
  existing?: Submission | null;
}) {
  const [text, setText] = useState(existing?.text || "");
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Your Answer</Label>
        <span className="text-xs text-gray-400">{wordCount} words</span>
      </div>
      <Textarea
        rows={10}
        placeholder="Write your detailed answer here..."
        value={text}
        onChange={e => setText(e.target.value)}
        className="font-sans leading-relaxed resize-y"
      />
      <div className="flex gap-3">
        <Button
          className="flex-1 gap-2"
          disabled={text.trim().length < 10}
          onClick={() => onSubmit(text)}
        >
          <Send className="w-4 h-4" />Submit Answer
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => onSaveDraft(text)}>
          <Save className="w-4 h-4" />Save Draft
        </Button>
      </div>
    </div>
  );
}

/* ─── Attachment Submission Component ────────────────────── */
function AttachmentForm({
  onSubmit,
  onSaveDraft,
  existing,
}: {
  onSubmit: (files: File[], note: string) => void;
  onSaveDraft: (files: File[], note: string) => void;
  existing?: Submission | null;
}) {
  const [files, setFiles]   = useState<File[]>([]);
  const [note,  setNote]    = useState(existing?.description || "");
  const fileRef             = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer bg-indigo-50/30"
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.zip,.txt,.png,.jpg,.jpeg"
          className="hidden"
          onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
        />
        <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700">Drop files or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">PDF, DOC, ZIP, TXT, PNG, JPG — max 50 MB each</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <File className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                <p className="text-xs text-gray-400">{formatSize(f.size)}</p>
              </div>
              <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <Label>Note (optional)</Label>
        <Textarea
          rows={3}
          placeholder="Add any notes or comments about your submission..."
          className="mt-1"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <Button
          className="flex-1 gap-2"
          disabled={files.length === 0}
          onClick={() => onSubmit(files, note)}
        >
          <Send className="w-4 h-4" />Submit Files
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => onSaveDraft(files, note)}>
          <Save className="w-4 h-4" />Save Draft
        </Button>
      </div>
    </div>
  );
}

/* ─── Submission Detail View ─────────────────────────────── */
function SubmissionDetail({ sub }: { sub: Submission }) {
  const [expanded, setExpanded] = useState(false);
  const isGraded = sub.status === "graded";

  return (
    <div className={`rounded-xl border p-4 ${isGraded ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isGraded ? "bg-green-100" : "bg-blue-100"}`}>
            {isGraded ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-blue-600" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {isGraded ? "Graded" : "Submitted"} — {new Date(sub.createdAt).toLocaleDateString()}
            </p>
            {isGraded && sub.grade && (
              <p className="text-xs text-green-700 font-medium">Grade: {sub.grade}</p>
            )}
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-2">
          {sub.text && <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.text}</p>}
          {sub.feedback && (
            <div className="bg-white rounded-lg px-3 py-2 text-sm">
              <span className="font-medium text-gray-700">Feedback: </span>
              <span className="text-gray-600">{sub.feedback}</span>
            </div>
          )}
          {sub.files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {sub.files.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline bg-white rounded-lg px-2 py-1 border border-indigo-200">
                  <Download className="w-3 h-3" />
                  {f.originalName.slice(0, 20)}{f.originalName.length > 20 ? "…" : ""}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Assignment Card ─────────────────────────────────────── */
function AssignmentCard({
  assignment,
  submission,
  onStatusUpdate,
  onSubmit,
}: {
  assignment: Assignment;
  submission: Submission | null;
  onStatusUpdate: (id: string, status: AssignmentStatus) => void;
  onSubmit: (asgn: Assignment, data: FormData | string) => Promise<void>;
}) {
  const [expanded,   setExpanded]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft,setSavingDraft] = useState(false);
  const [successMsg, setSuccessMsg]  = useState("");
  const [errorMsg,   setErrorMsg]    = useState("");

  const due      = new Date(assignment.dueDate);
  const isOverdue = due < new Date() && assignment.status !== "Submitted";
  const daysLeft  = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const aType    = (assignment as any).assignmentType as AssignmentTypeUI || "theoretical";
  const alreadySubmitted = assignment.status === "Submitted" || submission?.status === "submitted" || submission?.status === "graded";

  const handleSubmit = async (data: FormData | string) => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      await onSubmit(assignment, data);
      onStatusUpdate(assignment._id, "Submitted");
      setSuccessMsg("Submitted successfully!");
      setExpanded(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e: any) {
      setErrorMsg(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDraft = async (data: FormData | string) => {
    setSavingDraft(true);
    try {
      await onSubmit(assignment, data);
      setSuccessMsg("Draft saved!");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch {}
    finally { setSavingDraft(false); }
  };

  const buildFormData = (textOrFiles: string | File[], note?: string, status: "draft" | "submitted" = "submitted") => {
    const fd = new FormData();
    fd.append("assignmentId", assignment._id);
    fd.append("title",        assignment.title);
    fd.append("status",       status);

    if (typeof textOrFiles === "string") {
      fd.append("text", textOrFiles);
    } else {
      if (note) fd.append("description", note);
      textOrFiles.forEach(f => fd.append("files", f));
    }
    return fd;
  };

  return (
    <Card className={`transition-all hover:shadow-md ${isOverdue ? "border-l-4 border-l-red-400" : alreadySubmitted ? "border-l-4 border-l-green-400" : ""}`}>
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="pt-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${priorityDot[(assignment as any).priority] || priorityDot.medium}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                  <Badge className={`text-xs border ${typeColors[aType] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {typeIcon(aType)}
                    <span className="ml-1">{typeLabel[aType] || "General"}</span>
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />Due {due.toLocaleDateString()}
                  </span>
                  {typeof assignment.course === "object" && (assignment.course as any)?.title ? (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <BookOpen className="w-3.5 h-3.5" />{(assignment.course as any).title}
                    </span>
                  ) : null}
                  {isOverdue && (
                    <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />Overdue
                    </span>
                  )}
                  {!isOverdue && !alreadySubmitted && daysLeft <= 3 && daysLeft >= 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="w-3.5 h-3.5" />
                      {daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`text-xs border ${statusStyles[assignment.status] || statusStyles["Not Started"]}`}>
                  {assignment.status}
                </Badge>
                {!alreadySubmitted && (
                  <Button
                    size="sm"
                    variant={expanded ? "default" : "outline"}
                    className="text-xs h-7 gap-1"
                    onClick={() => setExpanded(e => !e)}
                  >
                    {expanded ? <><EyeOff className="w-3 h-3" />Close</> : <><Eye className="w-3 h-3" />Attempt</>}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Success / error messages */}
        {successMsg && (
          <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-sm">
            <CheckCircle className="w-4 h-4" />{successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">
            <AlertCircle className="w-4 h-4" />{errorMsg}
          </div>
        )}

        {/* Submission form */}
        {expanded && !alreadySubmitted && (
          <div className="mt-5 pt-5 border-t space-y-4">
            <div className="flex items-center gap-2">
              {typeIcon(aType)}
              <h4 className="font-semibold text-gray-900 text-sm">
                {typeLabel[aType] || "Submit"} Answer
              </h4>
            </div>

            {aType === "quiz" && (
              <QuizForm
                assignment={assignment}
                onSubmit={text => handleSubmit(buildFormData(text, undefined, "submitted"))}
                onSaveDraft={text => handleDraft(buildFormData(text, undefined, "draft"))}
                existing={submission}
              />
            )}
            {aType === "theoretical" && (
              <TheoreticalForm
                onSubmit={text => handleSubmit(buildFormData(text, undefined, "submitted"))}
                onSaveDraft={text => handleDraft(buildFormData(text, undefined, "draft"))}
                existing={submission}
              />
            )}
            {aType === "attachment" && (
              <AttachmentForm
                onSubmit={(files, note) => handleSubmit(buildFormData(files, note, "submitted"))}
                onSaveDraft={(files, note) => handleDraft(buildFormData(files, note, "draft"))}
                existing={submission}
              />
            )}
            {/* Fallback for untyped */}
            {!["quiz", "theoretical", "attachment"].includes(aType) && (
              <TheoreticalForm
                onSubmit={text => handleSubmit(buildFormData(text, undefined, "submitted"))}
                onSaveDraft={text => handleDraft(buildFormData(text, undefined, "draft"))}
                existing={submission}
              />
            )}
          </div>
        )}

        {/* Already submitted — show submission details */}
        {alreadySubmitted && submission && (
          <div className="mt-4 pt-4 border-t">
            <SubmissionDetail sub={submission} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────────────── */
export function Assignments() {
  const { user }   = useCurrentUser();
  const [items,    setItems]    = useState<Assignment[]>([]);
  const [subs,     setSubs]     = useState<Submission[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<"all" | AssignmentStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | AssignmentTypeUI>("all");
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getAssignments().then(d => setItems(d || [])),
      getSubmissions().then(d => setSubs(d || [])),
    ]).finally(() => setLoading(false));
  }, [user]);

  const handleStatusUpdate = (id: string, status: AssignmentStatus) => {
    setItems(prev => prev.map(a => a._id === id ? { ...a, status } : a));
  };

  const handleSubmit = async (asgn: Assignment, data: FormData | string) => {
    let fd: FormData;
    if (data instanceof FormData) {
      fd = data;
    } else {
      fd = new FormData();
      fd.append("assignmentId", asgn._id);
      fd.append("title", asgn.title);
      fd.append("text", data);
      fd.append("status", "submitted");
    }
    await createSubmission(fd);
    const updated = await getSubmissions();
    setSubs(updated);
  };

  const filtered = items.filter(a => {
    const mf = filter === "all" || a.status === filter;
    const mt = typeFilter === "all" || ((a as any).assignmentType || "theoretical") === typeFilter;
    const mq = !search || a.title.toLowerCase().includes(search.toLowerCase());
    return mf && mt && mq;
  });

  const counts = {
    all:           items.length,
    "Not Started": items.filter(a => a.status === "Not Started").length,
    "In Progress":  items.filter(a => a.status === "In Progress").length,
    "Submitted":    items.filter(a => a.status === "Submitted").length,
  };

  const submissionMap = Object.fromEntries(
    subs.map(s => [s.assignmentId, s])
  );

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
        <h1 className="text-2xl font-semibold text-gray-900">Assignments</h1>
        <p className="text-gray-500 text-sm mt-1">Submit your work — quizzes, theoretical answers, and file uploads</p>
      </div>

      {/* Status stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["all", "Not Started", "In Progress", "Submitted"] as const).map(s => (
          <Card
            key={s}
            className={`cursor-pointer transition-all hover:shadow-md ${filter === s ? "ring-2 ring-indigo-500" : ""}`}
            onClick={() => setFilter(s)}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{counts[s]}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s === "all" ? "Total" : s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search assignments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "quiz", "theoretical", "attachment"] as const).map(t => (
            <Button
              key={t}
              size="sm"
              variant={typeFilter === t ? "default" : "outline"}
              onClick={() => setTypeFilter(t)}
              className="text-xs gap-1.5"
            >
              {t !== "all" && typeIcon(t)}
              {t === "all" ? "All Types" : typeLabel[t]}
            </Button>
          ))}
        </div>
      </div>

      {/* Assignment list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">
              {filter === "all" ? "No assignments yet." : `No ${filter.toLowerCase()} assignments.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <AssignmentCard
              key={a._id}
              assignment={a}
              submission={submissionMap[a._id] || null}
              onStatusUpdate={handleStatusUpdate}
              onSubmit={handleSubmit}
            />
          ))}
        </div>
      )}
    </div>
  );
}