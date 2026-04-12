import { useEffect, useState, useCallback } from "react";
import { CheckCircle, Clock, AlertCircle, X, Download, Search } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { getSubmissions, gradeSubmission, type Submission } from "../../../services/submissionService";

const statusBadge = (status: string) => {
  if (status === "graded") return <Badge className="bg-green-100 text-green-700">Graded</Badge>;
  if (status === "submitted") return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
  return <Badge className="bg-gray-100 text-gray-500">Draft</Badge>;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function InstructorSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "submitted" | "graded" | "draft">("all");
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSubmissions();
      setSubmissions(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openGrade = (sub: Submission) => {
    setGradingId(sub._id);
    setGrade(sub.grade || "");
    setFeedback(sub.feedback || "");
    setGradeError("");
  };

  const handleGrade = async () => {
    if (!gradingId || !grade.trim()) {
      setGradeError("Grade is required.");
      return;
    }
    try {
      setGrading(true);
      const updated = await gradeSubmission(gradingId, { grade: grade.trim(), feedback });
      setSubmissions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
      setGradingId(null);
    } catch (err: any) {
      setGradeError(err?.message || "Failed to save grade.");
    } finally {
      setGrading(false);
    }
  };

  const filtered = submissions.filter((s) => {
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    const matchSearch =
      !search ||
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.assignmentTitle.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pending = submissions.filter((s) => s.status === "submitted").length;
  const graded = submissions.filter((s) => s.status === "graded").length;
  const total = submissions.length;

  if (loading) return <div className="p-6 text-center text-gray-500">Loading submissions...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Grade Submissions</h1>
        <p className="text-gray-500">Review and grade student work</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Needs Grading", value: pending, icon: Clock, bg: "bg-amber-50", color: "text-amber-600", filter: "submitted" as const },
          { label: "Graded", value: graded, icon: CheckCircle, bg: "bg-green-50", color: "text-green-600", filter: "graded" as const },
          { label: "Total Submissions", value: total, icon: AlertCircle, bg: "bg-blue-50", color: "text-blue-600", filter: "all" as const },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus(s.filter)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`${s.bg} w-12 h-12 rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-sm text-gray-500">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input className="pl-10" placeholder="Search by student or assignment..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(["all", "submitted", "graded"] as const).map((s) => (
            <Button key={s} size="sm" variant={filterStatus === s ? "default" : "outline"} onClick={() => setFilterStatus(s)} className="capitalize">
              {s === "submitted" ? "Pending" : s}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">
                {search || filterStatus !== "all" ? "No results match your filter." : "No submissions yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Student", "Assignment", "Submitted", "Files", "Status", "Grade", "Action"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((sub) => (
                    <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{sub.studentName}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 max-w-[180px]">
                        <p className="truncate">{sub.assignmentTitle}</p>
                        <p className="text-xs text-gray-400">{sub.course}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {sub.files.length > 0 ? (
                          <div className="space-y-1">
                            {sub.files.slice(0, 2).map((f, i) => (
                              <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline text-xs">
                                <Download className="w-3 h-3" />
                                {f.originalName.slice(0, 16)}{f.originalName.length > 16 ? "…" : ""}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No files</span>
                        )}
                      </td>
                      <td className="px-4 py-4">{statusBadge(sub.status)}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">{sub.grade || "—"}</td>
                      <td className="px-4 py-4">
                        {sub.status !== "draft" && (
                          <Button size="sm" variant={sub.status === "graded" ? "outline" : "default"} onClick={() => openGrade(sub)}>
                            {sub.status === "graded" ? "Edit" : "Grade"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Modal */}
      {gradingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Grade Submission</h3>
              <Button variant="ghost" size="icon" onClick={() => setGradingId(null)}><X /></Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Grade *</label>
                <Input placeholder='e.g., "90/100" or "A" or "Pass"' value={grade} onChange={(e) => setGrade(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Feedback</label>
                <Textarea placeholder="Write feedback for the student..." rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
              </div>
            </div>
            {gradeError && <p className="text-red-500 text-sm mt-3">{gradeError}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setGradingId(null)}>Cancel</Button>
              <Button onClick={handleGrade} disabled={grading}>
                {grading ? "Saving..." : "Save Grade"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
