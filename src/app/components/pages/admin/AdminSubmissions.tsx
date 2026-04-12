import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Upload, Clock, CheckCircle, AlertCircle, X, Download } from "lucide-react";
import { getSubmissions, gradeSubmission, type Submission } from "../../../services/submissionService";

const statusBadge = (s: string) => {
  if (s === "graded")    return <Badge className="bg-green-100 text-green-700 text-xs">Graded</Badge>;
  if (s === "submitted") return <Badge className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>;
  return <Badge className="bg-gray-100 text-gray-500 text-xs">Draft</Badge>;
};

export function AdminSubmissions() {
  const [submissions,  setSubmissions]  = useState<Submission[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<"all"|"submitted"|"graded"|"draft">("all");
  const [gradingId,    setGradingId]    = useState<string|null>(null);
  const [grade,        setGrade]        = useState("");
  const [feedback,     setFeedback]     = useState("");
  const [grading,      setGrading]      = useState(false);
  const [gradeError,   setGradeError]   = useState("");

  const load = useCallback(async () => {
    try { setLoading(true); setSubmissions(await getSubmissions()); }
    catch (err: any) { setError(err?.message || "Failed to load."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openGradeModal = (sub: Submission) => { setGradingId(sub._id); setGrade(sub.grade || ""); setFeedback(sub.feedback || ""); setGradeError(""); };

  const handleGrade = async () => {
    if (!gradingId || !grade.trim()) { setGradeError("Grade is required."); return; }
    try {
      setGrading(true);
      const updated = await gradeSubmission(gradingId, { grade: grade.trim(), feedback });
      setSubmissions((prev) => prev.map((s) => s._id === updated._id ? updated : s));
      setGradingId(null);
    } catch (err: any) { setGradeError(err?.message || "Failed."); }
    finally { setGrading(false); }
  };

  const filtered = submissions.filter((s) => {
    const ms = filterStatus === "all" || s.status === filterStatus;
    const mq = !search || s.studentName.toLowerCase().includes(search.toLowerCase()) || s.assignmentTitle.toLowerCase().includes(search.toLowerCase());
    return ms && mq;
  });

  const pending = submissions.filter((s) => s.status === "submitted").length;
  const graded  = submissions.filter((s) => s.status === "graded").length;

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Submissions Review</h1><p className="text-gray-500">Review and grade student submissions</p></div>
      {error && <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Needs Grading", value: pending, icon: Clock,         bg: "bg-amber-50",  color: "text-amber-600",  filter: "submitted" as const },
          { label: "Graded",        value: graded,  icon: CheckCircle,   bg: "bg-green-50",  color: "text-green-600",  filter: "graded"    as const },
          { label: "Total",         value: submissions.length, icon: Upload, bg: "bg-blue-50", color: "text-blue-600", filter: "all"       as const },
        ].map((s) => { const Icon = s.icon; return (
          <Card key={s.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus(s.filter)}>
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`${s.bg} w-12 h-12 rounded-xl flex items-center justify-center`}><Icon className={`w-6 h-6 ${s.color}`} /></div>
              <div><p className="text-2xl font-bold text-gray-900">{s.value}</p><p className="text-sm text-gray-500">{s.label}</p></div>
            </CardContent>
          </Card>
        ); })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input className="flex-1" placeholder="Search by student or assignment..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-2">
          {(["all","submitted","graded","draft"] as const).map((s) => (
            <Button key={s} size="sm" variant={filterStatus === s ? "default" : "outline"} onClick={() => setFilterStatus(s)} className="capitalize text-xs">
              {s === "submitted" ? "Pending" : s}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400"><Upload className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No submissions match your filter.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b"><tr>{["Student","Assignment","Submitted","Files","Status","Grade","Actions"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {filtered.map((sub) => (
                    <tr key={sub._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{sub.studentName}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 max-w-[160px]"><p className="truncate">{sub.assignmentTitle}</p><p className="text-xs text-gray-400">{sub.course}</p></td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(sub.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-4 text-sm">
                        {sub.files.length > 0 ? sub.files.slice(0,2).map((f,i) => (
                          <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline text-xs mb-0.5"><Download className="w-3 h-3" />{f.originalName.slice(0,14)}{f.originalName.length>14?"…":""}</a>
                        )) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-4">{statusBadge(sub.status)}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">{sub.grade || "—"}</td>
                      <td className="px-4 py-4">
                        {sub.status !== "draft" && <Button size="sm" variant={sub.status === "graded" ? "outline" : "default"} className="text-xs h-7" onClick={() => openGradeModal(sub)}>{sub.status === "graded" ? "Edit" : "Grade"}</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {gradingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-lg">Grade Submission</h3><Button variant="ghost" size="icon" onClick={() => setGradingId(null)}><X /></Button></div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Grade *</label><Input placeholder='e.g., "85/100" or "A" or "Pass"' value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Feedback</label><Textarea placeholder="Write feedback for the student..." rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></div>
            </div>
            {gradeError && <p className="text-red-500 text-sm mt-3">{gradeError}</p>}
            <div className="flex justify-end gap-2 mt-5"><Button variant="ghost" onClick={() => setGradingId(null)}>Cancel</Button><Button onClick={handleGrade} disabled={grading}>{grading ? "Saving..." : "Save Grade"}</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}