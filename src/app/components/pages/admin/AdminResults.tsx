import { useEffect, useState, useCallback } from "react";
import {
  Plus, X, AlertCircle, Download, Eye, EyeOff, CheckCircle,
  GraduationCap, BarChart2, Search, Edit, Trash2, FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

type SubjectResult = {
  subject: string; subjectCode: string; internalMarks: number; externalMarks: number;
  totalMarks: number; maxMarks: number; grade: string; gradePoints: number;
  credits: number; status: string;
};

type Result = {
  _id: string;
  student: { _id: string; username: string; email: string };
  department?: { name: string; code: string } | null;
  academicYear: string; semesterNumber: number; enrollmentNumber: string;
  subjects: SubjectResult[];
  totalMarksObtained: number; totalMaxMarks: number; percentage: number;
  sgpa: number; cgpa: number; totalCredits: number; earnedCredits: number;
  result: string; rank: number | null; remarks: string; isPublished: boolean;
  declaredOn: string | null;
};

const RESULT_COLORS: Record<string, string> = {
  distinction:    "bg-purple-100 text-purple-700",
  first_class:    "bg-green-100 text-green-700",
  second_class:   "bg-blue-100 text-blue-700",
  pass_class:     "bg-amber-100 text-amber-700",
  pass:           "bg-green-100 text-green-700",
  fail:           "bg-red-100 text-red-700",
  atkt:           "bg-orange-100 text-orange-700",
  detained:       "bg-gray-100 text-gray-600",
};

// ─── PDF Marksheet Generator ───────────────────────────────────
function generateMarksheetPDF(result: Result, instituteName = "Learnix University") {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Marksheet - Sem ${result.semesterNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; background: #fff; color: #000; padding: 20px; }
    .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 16px; }
    .institute-name { font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
    .subtitle { font-size: 13px; color: #444; margin-top: 4px; }
    .cert-title { font-size: 16px; font-weight: bold; margin-top: 8px; text-decoration: underline; letter-spacing: 1px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; font-size: 13px; }
    .info-row { display: flex; gap: 8px; }
    .info-label { font-weight: bold; min-width: 140px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
    th { background: #1a1a2e; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 7px 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background: #f8f8f8; }
    .pass { color: #16a34a; font-weight: bold; }
    .fail { color: #dc2626; font-weight: bold; }
    .summary { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 14px; margin: 16px 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; text-align: center; }
    .summary-val { font-size: 20px; font-weight: bold; color: #1a1a2e; }
    .summary-lbl { font-size: 10px; color: #666; text-transform: uppercase; }
    .result-badge { display: inline-block; padding: 4px 14px; border-radius: 4px; font-weight: bold; font-size: 13px;
      background: ${result.result === "fail" ? "#fee2e2" : "#dcfce7"}; color: ${result.result === "fail" ? "#dc2626" : "#16a34a"}; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; }
    .sig-line { border-top: 1px solid #000; padding-top: 4px; min-width: 120px; text-align: center; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-45deg);
      font-size: 80px; opacity: 0.03; font-weight: bold; pointer-events: none; z-index: 0; }
    @media print { body { padding: 0; } .watermark { display: none; } }
  </style>
</head>
<body>
  <div class="watermark">${instituteName}</div>
  <div class="header">
    <div class="institute-name">${instituteName}</div>
    <div class="subtitle">Affiliated to State University | NAAC Accredited</div>
    <div class="cert-title">SEMESTER MARKSHEET</div>
  </div>

  <div class="info-grid">
    <div>
      <div class="info-row"><span class="info-label">Student Name:</span><span>${result.student?.username || "—"}</span></div>
      <div class="info-row"><span class="info-label">Enrollment No.:</span><span>${result.enrollmentNumber || "—"}</span></div>
      <div class="info-row"><span class="info-label">Department:</span><span>${result.department?.name || "—"}</span></div>
    </div>
    <div>
      <div class="info-row"><span class="info-label">Academic Year:</span><span>${result.academicYear}</span></div>
      <div class="info-row"><span class="info-label">Semester:</span><span>${result.semesterNumber}</span></div>
      <div class="info-row"><span class="info-label">Date Declared:</span><span>${result.declaredOn ? new Date(result.declaredOn).toLocaleDateString("en-IN") : "—"}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th><th>Subject</th><th>Code</th><th>Internal</th><th>External</th>
        <th>Total</th><th>Max</th><th>Grade</th><th>Credits</th><th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${result.subjects.map((s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${s.subject}</td>
          <td>${s.subjectCode || "—"}</td>
          <td>${s.internalMarks}</td>
          <td>${s.externalMarks}</td>
          <td><strong>${s.totalMarks}</strong></td>
          <td>${s.maxMarks}</td>
          <td>${s.grade || "—"}</td>
          <td>${s.credits}</td>
          <td class="${s.status === "pass" ? "pass" : "fail"}">${s.status.toUpperCase()}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-grid">
      <div><div class="summary-val">${result.totalMarksObtained}/${result.totalMaxMarks}</div><div class="summary-lbl">Marks Obtained</div></div>
      <div><div class="summary-val">${result.percentage}%</div><div class="summary-lbl">Percentage</div></div>
      <div><div class="summary-val">${result.sgpa?.toFixed(2) || "—"}</div><div class="summary-lbl">SGPA</div></div>
      <div><div class="summary-val">${result.cgpa?.toFixed(2) || "—"}</div><div class="summary-lbl">CGPA</div></div>
    </div>
    <div style="text-align:center; margin-top:12px;">
      <span class="result-badge">${result.result.replace("_", " ").toUpperCase()}</span>
      ${result.rank ? `<span style="margin-left:12px;font-size:12px;">Rank: <strong>#${result.rank}</strong></span>` : ""}
    </div>
  </div>

  ${result.remarks ? `<p style="font-size:12px;color:#666;margin-top:8px;"><strong>Remarks:</strong> ${result.remarks}</p>` : ""}

  <div class="footer">
    <div class="sig-line">Controller of Examinations</div>
    <div style="text-align:center;font-size:10px;color:#888;">This is a computer-generated marksheet.<br>Verify at: learnix.edu/verify</div>
    <div class="sig-line">Principal / Dean</div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Marksheet_Sem${result.semesterNumber}_${result.enrollmentNumber || result.student?.username || "student"}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Add/Edit Result Modal ─────────────────────────────────────
function ResultModal({ result, students, departments, onClose, onSaved }: any) {
  const emptySubject = () => ({ subject: "", subjectCode: "", internalMarks: 0, externalMarks: 0, totalMarks: 0, maxMarks: 100, grade: "", gradePoints: 0, credits: 3, status: "pass" });

  const [form, setForm] = useState({
    student:        result?.student?._id       || "",
    department:     result?.department?._id    || "",
    academicYear:   result?.academicYear       || `${new Date().getFullYear()-1}-${new Date().getFullYear()}`,
    semesterNumber: String(result?.semesterNumber || "1"),
    enrollmentNumber: result?.enrollmentNumber || "",
    subjects:       result?.subjects?.length ? result.subjects : [emptySubject()],
    sgpa:           String(result?.sgpa   || ""),
    cgpa:           String(result?.cgpa   || ""),
    result:         result?.result        || "pass",
    rank:           String(result?.rank   || ""),
    remarks:        result?.remarks       || "",
    isPublished:    result?.isPublished   || false,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const setSubject = (i: number, k: string, v: any) => {
    setForm(f => {
      const subs   = [...f.subjects];
      subs[i]      = { ...subs[i], [k]: v };
      // Auto-calc total
      if (k === "internalMarks" || k === "externalMarks") {
        const int = k === "internalMarks" ? Number(v) : Number(subs[i].internalMarks);
        const ext = k === "externalMarks" ? Number(v) : Number(subs[i].externalMarks);
        subs[i].totalMarks = int + ext;
        subs[i].status     = subs[i].totalMarks >= subs[i].maxMarks * 0.35 ? "pass" : "fail";
      }
      return { ...f, subjects: subs };
    });
  };

  const addSubject  = () => setForm(f => ({ ...f, subjects: [...f.subjects, emptySubject()] }));
  const rmSubject   = (i: number) => setForm(f => ({ ...f, subjects: f.subjects.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.student || !form.academicYear) { setError("Student and academic year required"); return; }
    setSaving(true); setError("");
    try {
      const url    = result ? `${API_BASE_URL}/api/results/${result._id}` : `${API_BASE_URL}/api/results`;
      const method = result ? "PUT" : "POST";
      const res    = await fetch(url, {
        method, headers: authHeader(),
        body: JSON.stringify({
          ...form,
          semesterNumber: Number(form.semesterNumber),
          sgpa: form.sgpa ? Number(form.sgpa) : 0,
          cgpa: form.cgpa ? Number(form.cgpa) : 0,
          rank: form.rank ? Number(form.rank) : null,
          department: form.department || null,
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
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg">{result ? "Edit Result" : "Add Result"}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Student *</Label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.student} onChange={e => setForm(f => ({ ...f, student: e.target.value }))}>
                <option value="">Select student</option>
                {students.map((s: any) => <option key={s._id} value={s._id}>{s.username} ({s.email})</option>)}
              </select>
            </div>
            <div>
              <Label>Enrollment No.</Label>
              <Input className="mt-1" value={form.enrollmentNumber} onChange={e => setForm(f => ({ ...f, enrollmentNumber: e.target.value }))} />
            </div>
            <div>
              <Label>Academic Year *</Label>
              <Input className="mt-1" placeholder="2024-2025" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} />
            </div>
            <div>
              <Label>Semester *</Label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.semesterNumber} onChange={e => setForm(f => ({ ...f, semesterNumber: e.target.value }))}>
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n}</option>)}
              </select>
            </div>
            <div>
              <Label>Department</Label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                <option value="">— Select —</option>
                {departments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Overall Result</Label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}>
                {["pass","fail","distinction","first_class","second_class","pass_class","atkt","detained"].map(r =>
                  <option key={r} value={r}>{r.replace("_"," ").toUpperCase()}</option>
                )}
              </select>
            </div>
            <div>
              <Label>SGPA</Label>
              <Input type="number" step="0.01" max="10" className="mt-1" value={form.sgpa} onChange={e => setForm(f => ({ ...f, sgpa: e.target.value }))} />
            </div>
            <div>
              <Label>CGPA</Label>
              <Input type="number" step="0.01" max="10" className="mt-1" value={form.cgpa} onChange={e => setForm(f => ({ ...f, cgpa: e.target.value }))} />
            </div>
            <div>
              <Label>Rank (optional)</Label>
              <Input type="number" className="mt-1" value={form.rank} onChange={e => setForm(f => ({ ...f, rank: e.target.value }))} />
            </div>
          </div>

          {/* Subjects */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Subjects ({form.subjects.length})</h4>
              <Button size="sm" variant="outline" onClick={addSubject}><Plus className="w-3.5 h-3.5 mr-1" />Add Subject</Button>
            </div>
            <div className="space-y-3">
              {form.subjects.map((sub: any, i: number) => (
                <div key={i} className="border rounded-xl p-3 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                    <div className="col-span-2">
                      <Input placeholder="Subject name *" value={sub.subject} onChange={e => setSubject(i, "subject", e.target.value)} />
                    </div>
                    <Input placeholder="Code" value={sub.subjectCode} onChange={e => setSubject(i, "subjectCode", e.target.value)} />
                    <div className="flex items-center gap-2">
                      <Input type="number" placeholder="Credits" value={sub.credits} onChange={e => setSubject(i, "credits", Number(e.target.value))} />
                      <Button size="sm" variant="ghost" className="text-red-500 p-1" onClick={() => rmSubject(i)}><X className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <div><Label className="text-xs">Internal</Label><Input type="number" value={sub.internalMarks} onChange={e => setSubject(i, "internalMarks", Number(e.target.value))} /></div>
                    <div><Label className="text-xs">External</Label><Input type="number" value={sub.externalMarks} onChange={e => setSubject(i, "externalMarks", Number(e.target.value))} /></div>
                    <div><Label className="text-xs">Total</Label><Input type="number" value={sub.totalMarks} onChange={e => setSubject(i, "totalMarks", Number(e.target.value))} /></div>
                    <div><Label className="text-xs">Max</Label><Input type="number" value={sub.maxMarks} onChange={e => setSubject(i, "maxMarks", Number(e.target.value))} /></div>
                    <div><Label className="text-xs">Grade</Label><Input placeholder="A,B,C..." value={sub.grade} onChange={e => setSubject(i, "grade", e.target.value)} /></div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <select className="w-full border rounded px-2 py-1.5 text-xs" value={sub.status} onChange={e => setSubject(i, "status", e.target.value)}>
                        <option value="pass">Pass</option><option value="fail">Fail</option>
                        <option value="absent">Absent</option><option value="detained">Detained</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="published" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} />
            <label htmlFor="published" className="text-sm font-medium">Publish result immediately (visible to student)</label>
          </div>

          {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : result ? "Update Result" : "Create Result"}</Button>
        </div>
      </div>
    </div>
  );
}

export function AdminResults() {
  const [results,     setResults]     = useState<Result[]>([]);
  const [students,    setStudents]    = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<Result | "new" | null>(null);
  const [search,      setSearch]      = useState("");
  const [semFilter,   setSemFilter]   = useState("all");
  const [pubFilter,   setPubFilter]   = useState("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [rRes, uRes, dRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/results`, { headers: authHeader() }),
        fetch(`${API_BASE_URL}/api/users?role=student&limit=500`, { headers: authHeader() }),
        fetch(`${API_BASE_URL}/api/departments`, { headers: authHeader() }),
      ]);
      setResults(rRes.ok ? await rRes.json() : []);
      const u = await uRes.json();
      setStudents(Array.isArray(u) ? u : []);
      setDepartments(dRes.ok ? await dRes.json() : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePublish = async (result: Result) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/results/${result._id}/publish`, {
        method: "PATCH", headers: authHeader(),
        body: JSON.stringify({ isPublished: !result.isPublished }),
      });
      if (res.ok) load();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this result permanently?")) return;
    await fetch(`${API_BASE_URL}/api/results/${id}`, { method: "DELETE", headers: authHeader() });
    setResults(prev => prev.filter(r => r._id !== id));
  };

  const filtered = results.filter(r => {
    const name = r.student?.username || "";
    const mq = !search || name.toLowerCase().includes(search.toLowerCase()) || r.enrollmentNumber.includes(search);
    const ms = semFilter === "all" || String(r.semesterNumber) === semFilter;
    const mp = pubFilter === "all" || (pubFilter === "published" ? r.isPublished : !r.isPublished);
    return mq && ms && mp;
  });

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Result Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage semester results and marksheets</p>
        </div>
        <Button onClick={() => setModal("new")}><Plus className="w-4 h-4 mr-2" />Add Result</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Results", value: results.length },
          { label: "Published",     value: results.filter(r => r.isPublished).length },
          { label: "Draft",         value: results.filter(r => !r.isPublished).length },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search student or enrollment no." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-lg px-3 py-2 text-sm" value={semFilter} onChange={e => setSemFilter(e.target.value)}>
          <option value="all">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Sem {n}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={pubFilter} onChange={e => setPubFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No results found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Student","Enrollment","Sem","Year","%","SGPA","Result","Status","Actions"].map(h =>
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(r => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.student?.username || "—"}</td>
                      <td className="px-4 py-3 text-sm font-mono text-indigo-700">{r.enrollmentNumber || "—"}</td>
                      <td className="px-4 py-3 text-sm">{r.semesterNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{r.academicYear}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{r.percentage}%</td>
                      <td className="px-4 py-3 text-sm">{r.sgpa?.toFixed(2) || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${RESULT_COLORS[r.result] || "bg-gray-100 text-gray-600"}`}>
                          {r.result.replace("_"," ").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={r.isPublished ? "bg-green-100 text-green-700 text-xs" : "bg-gray-100 text-gray-500 text-xs"}>
                          {r.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" title="Download marksheet" onClick={() => generateMarksheetPDF(r)}>
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" title={r.isPublished ? "Unpublish" : "Publish"} onClick={() => togglePublish(r)}>
                            {r.isPublished ? <EyeOff className="w-3.5 h-3.5 text-gray-500" /> : <Eye className="w-3.5 h-3.5 text-indigo-600" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setModal(r)}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(r._id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {modal !== null && (
        <ResultModal
          result={modal === "new" ? null : modal}
          students={students}
          departments={departments}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
