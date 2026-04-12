import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Upload, File, X, Save, Send, CheckCircle, Clock, AlertCircle, Download } from "lucide-react";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { getAssignments, type Assignment } from "../../../services/assignmentService";
import { createSubmission, getSubmissions, type Submission } from "../../../services/submissionService";

const statusBadge = (status: string) => {
  if (status === "graded")    return <Badge className="bg-green-100 text-green-700">Graded</Badge>;
  if (status === "submitted") return <Badge className="bg-blue-100 text-blue-700">Submitted</Badge>;
  return <Badge className="bg-gray-100 text-gray-600">Draft</Badge>;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function Submissions() {
  const { user } = useCurrentUser();
  const [assignments,      setAssignments]      = useState<Assignment[]>([]);
  const [pastSubmissions,  setPastSubmissions]  = useState<Submission[]>([]);
  const [selected,         setSelected]         = useState<Assignment | null>(null);
  const [loadingData,      setLoadingData]      = useState(true);
  const [loadError,        setLoadError]        = useState("");
  const [docTitle,         setDocTitle]         = useState("");
  const [description,      setDescription]      = useState("");
  const [textContent,      setTextContent]      = useState("");
  const [uploadedFiles,    setUploadedFiles]    = useState<File[]>([]);
  const [submitting,       setSubmitting]       = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [submitError,      setSubmitError]      = useState("");
  const [successMsg,       setSuccessMsg]       = useState("");
  const fileInputRef                            = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [a, s] = await Promise.allSettled([getAssignments(), getSubmissions()]);
        if (a.status === "fulfilled") {
          setAssignments(a.value);
          const pending = a.value.filter((x) => x.status !== "Submitted");
          setSelected(pending[0] ?? a.value[0] ?? null);
        } else setLoadError("Failed to load assignments.");
        if (s.status === "fulfilled") setPastSubmissions(s.value);
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [user]);

  const resetForm = () => {
    setDocTitle(""); setDescription(""); setTextContent(""); setUploadedFiles([]); setSubmitError("");
  };

  const buildFormData = (status: "draft" | "submitted") => {
    if (!selected) return null;
    const fd = new FormData();
    fd.append("assignmentId", selected._id);
    fd.append("title",       docTitle.trim() || selected.title);
    fd.append("description", description.trim());
    fd.append("text",        textContent.trim());
    fd.append("status",      status);
    uploadedFiles.forEach((f) => fd.append("files", f));
    return fd;
  };

  const handleSaveDraft = async () => {
    if (!selected) return;
    setSaving(true); setSubmitError(""); setSuccessMsg("");
    try {
      const fd = buildFormData("draft");
      if (!fd) return;
      await createSubmission(fd);
      setSuccessMsg("Draft saved successfully.");
      const updated = await getSubmissions();
      setPastSubmissions(updated);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to save draft.");
    } finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!selected) return;
    if (!docTitle.trim() && !textContent.trim() && uploadedFiles.length === 0) {
      setSubmitError("Add a title, some content, or at least one file before submitting.");
      return;
    }
    setSubmitting(true); setSubmitError(""); setSuccessMsg("");
    try {
      const fd = buildFormData("submitted");
      if (!fd) return;
      await createSubmission(fd);
      setAssignments((prev) => prev.map((a) => a._id === selected._id ? { ...a, status: "Submitted" } : a));
      const updated = await getSubmissions();
      setPastSubmissions(updated);
      resetForm();
      setSuccessMsg(`"${selected.title}" submitted successfully!`);
      const remaining = assignments.filter((a) => a._id !== selected._id && a.status !== "Submitted");
      setSelected(remaining[0] ?? null);
    } catch (err: any) {
      setSubmitError(err?.message || "Submission failed. Please try again.");
    } finally { setSubmitting(false); }
  };

  if (loadingData) {
    return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium flex-1">{successMsg}</p>
          <button onClick={() => setSuccessMsg("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {loadError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{loadError}</p>
        </div>
      )}

      {/* Assignment selector */}
      {assignments.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Select Assignment</h3>
            <div className="space-y-2">
              {assignments.map((a) => (
                <div
                  key={a._id}
                  onClick={() => { setSelected(a); resetForm(); }}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selected?._id === a._id ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-200 hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                  </div>
                  <Badge className={a.status === "Submitted" ? "bg-green-100 text-green-700 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission form */}
      {selected && selected.status !== "Submitted" && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{selected.title}</h3>
                <p className="text-sm text-gray-400 mt-0.5">Due: {new Date(selected.dueDate).toLocaleDateString()}</p>
              </div>
              <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs">In Progress</Badge>
            </div>

            <div>
              <Label>Document Title</Label>
              <Input className="mt-1" placeholder={`e.g., ${selected.title} — Final Version`} value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" placeholder="Briefly describe your submission..." rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div>
              <Label>Content</Label>
              <Textarea className="mt-1" placeholder="Write your submission content here..." rows={6} value={textContent} onChange={(e) => setTextContent(e.target.value)} />
            </div>

            {/* File upload */}
            <div>
              <Label>Upload Files</Label>
              <div
                className="mt-1 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.zip,.txt,.png,.jpg" className="hidden" onChange={(e) => setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files || [])])} />
                <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">Drop files or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC, ZIP, TXT, PNG, JPG — max 50 MB</p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <File className="w-5 h-5 text-indigo-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                      </div>
                      <button onClick={() => setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {submitError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-sm">{submitError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={submitting || saving}>
                <Send className="w-4 h-4" />
                {submitting ? "Submitting..." : "Submit Assignment"}
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleSaveDraft} disabled={submitting || saving}>
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Draft"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selected && selected.status === "Submitted" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-5 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Already submitted</p>
              <p className="text-sm text-green-600">{selected.title} — waiting for grading</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past submissions */}
      {pastSubmissions.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">My Submissions</h3>
            <div className="space-y-3">
              {pastSubmissions.map((sub) => (
                <div
                  key={sub._id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    sub.status === "graded" ? "bg-green-50 border-green-200"
                    : sub.status === "submitted" ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${sub.status === "graded" ? "bg-green-100" : "bg-blue-100"}`}>
                      {sub.status === "graded" ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sub.title || sub.assignmentTitle}</p>
                      <p className="text-xs text-gray-400">{new Date(sub.createdAt).toLocaleDateString()}{sub.files.length > 0 ? ` · ${sub.files.length} file(s)` : ""}</p>
                      {sub.feedback && <p className="text-xs text-gray-500 italic mt-0.5">Feedback: {sub.feedback}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.grade && <span className="text-sm font-bold text-green-700">{sub.grade}</span>}
                    {statusBadge(sub.status)}
                    {sub.files.slice(0, 1).map((f, i) => (
                      <Button key={i} asChild size="sm" variant="ghost" className="p-1">
                        <a href={f.url} target="_blank" rel="noreferrer"><Download className="w-4 h-4" /></a>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loadingData && assignments.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-gray-400">
            <File className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No assignments found yet.</p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}