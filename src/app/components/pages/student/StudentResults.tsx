import { useEffect, useState } from "react";
import {
  GraduationCap, Download, TrendingUp, BookOpen, Award,
  CheckCircle, XCircle, AlertCircle, BarChart2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { Authorization: `Bearer ${t}` };
}

type SubjectResult = {
  subject: string; subjectCode: string; internalMarks: number; externalMarks: number;
  totalMarks: number; maxMarks: number; grade: string; gradePoints: number;
  credits: number; status: string;
};

type Result = {
  _id: string; academicYear: string; semesterNumber: number; enrollmentNumber: string;
  subjects: SubjectResult[]; totalMarksObtained: number; totalMaxMarks: number;
  percentage: number; sgpa: number; cgpa: number; totalCredits: number; earnedCredits: number;
  result: string; rank: number | null; remarks: string; isPublished: boolean;
  declaredOn: string | null;
  department?: { name: string; code: string } | null;
};

const RESULT_COLORS: Record<string, string> = {
  distinction: "bg-purple-100 text-purple-700 border-purple-200",
  first_class: "bg-green-100 text-green-700 border-green-200",
  second_class: "bg-blue-100 text-blue-700 border-blue-200",
  pass_class: "bg-amber-100 text-amber-700 border-amber-200",
  pass: "bg-green-100 text-green-700 border-green-200",
  fail: "bg-red-100 text-red-700 border-red-200",
  atkt: "bg-orange-100 text-orange-700 border-orange-200",
};

function downloadMarksheet(result: Result) {
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : {};

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Marksheet Sem ${result.semesterNumber}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Times New Roman',serif; background:#fff; color:#000; padding:30px; max-width:800px; margin:auto; }
.header { text-align:center; border-bottom:3px double #1a1a2e; padding-bottom:16px; margin-bottom:20px; }
.logo { width:60px; height:60px; background:#1a1a2e; border-radius:12px; margin:0 auto 8px; display:flex; align-items:center; justify-content:center; }
h1 { font-size:24px; font-weight:900; text-transform:uppercase; letter-spacing:3px; color:#1a1a2e; }
.sub { font-size:12px; color:#666; margin-top:4px; }
.badge { display:inline-block; background:#1a1a2e; color:#fff; padding:3px 12px; font-size:12px; font-weight:bold; margin-top:8px; border-radius:4px; letter-spacing:1px; }
.info { display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:13px; margin:16px 0; padding:12px; background:#f8f8f8; border-radius:8px; }
.lbl { font-weight:bold; color:#444; }
table { width:100%; border-collapse:collapse; margin:16px 0; font-size:12px; }
th { background:#1a1a2e; color:#fff; padding:8px; text-align:center; font-size:11px; text-transform:uppercase; }
td { padding:8px; border:1px solid #ddd; text-align:center; }
tr:nth-child(even) td { background:#f9f9f9; }
.pass-row td:first-child { border-left:3px solid #16a34a; }
.fail-row td:first-child { border-left:3px solid #dc2626; }
.pass-label { color:#16a34a; font-weight:bold; }
.fail-label { color:#dc2626; font-weight:bold; }
.summary { background:linear-gradient(135deg,#1a1a2e,#2d2b50); color:#fff; border-radius:12px; padding:20px; margin:16px 0; display:grid; grid-template-columns:repeat(4,1fr); gap:16px; text-align:center; }
.sum-val { font-size:24px; font-weight:900; }
.sum-lbl { font-size:10px; opacity:0.7; text-transform:uppercase; margin-top:4px; }
.result-wrap { text-align:center; margin:16px 0; }
.result-pill { display:inline-block; padding:8px 24px; border-radius:40px; font-size:16px; font-weight:900; letter-spacing:1px; }
.result-pass { background:#dcfce7; color:#16a34a; border:2px solid #16a34a; }
.result-fail { background:#fee2e2; color:#dc2626; border:2px solid #dc2626; }
.footer { margin-top:50px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; text-align:center; font-size:11px; }
.sig { border-top:1px solid #000; padding-top:6px; }
.remarks { font-size:12px; color:#666; font-style:italic; margin:8px 0; padding:8px; border-left:3px solid #6366f1; background:#f8f8ff; }
.verify { font-size:10px; color:#aaa; text-align:center; margin-top:20px; }
@media print { body { padding:0; } }
</style></head><body>
<div class="header">
  <h1>Learnix University</h1>
  <p class="sub">Affiliated to State University | NAAC Accredited | ISO 9001:2015</p>
  <span class="badge">SEMESTER GRADE REPORT</span>
</div>

<div class="info">
  <div><span class="lbl">Student Name:</span> ${user.username || "—"}</div>
  <div><span class="lbl">Academic Year:</span> ${result.academicYear}</div>
  <div><span class="lbl">Enrollment No.:</span> ${result.enrollmentNumber || "—"}</div>
  <div><span class="lbl">Semester:</span> ${result.semesterNumber}</div>
  <div><span class="lbl">Department:</span> ${result.department?.name || "—"}</div>
  <div><span class="lbl">Date Declared:</span> ${result.declaredOn ? new Date(result.declaredOn).toLocaleDateString("en-IN") : "—"}</div>
</div>

<table>
  <thead>
    <tr><th>Sr.</th><th>Subject</th><th>Code</th><th>Int.</th><th>Ext.</th><th>Total</th><th>Max</th><th>Grade</th><th>GrPts</th><th>Credits</th><th>Status</th></tr>
  </thead>
  <tbody>
    ${result.subjects.map((s, i) => `
    <tr class="${s.status === "pass" ? "pass-row" : "fail-row"}">
      <td>${i+1}</td><td style="text-align:left">${s.subject}</td><td>${s.subjectCode||"—"}</td>
      <td>${s.internalMarks}</td><td>${s.externalMarks}</td>
      <td><strong>${s.totalMarks}</strong></td><td>${s.maxMarks}</td>
      <td>${s.grade||"—"}</td><td>${s.gradePoints||"—"}</td><td>${s.credits}</td>
      <td class="${s.status==="pass"?"pass-label":"fail-label"}">${s.status.toUpperCase()}</td>
    </tr>`).join("")}
  </tbody>
</table>

<div class="summary">
  <div><div class="sum-val">${result.totalMarksObtained}/${result.totalMaxMarks}</div><div class="sum-lbl">Marks Obtained</div></div>
  <div><div class="sum-val">${result.percentage}%</div><div class="sum-lbl">Percentage</div></div>
  <div><div class="sum-val">${result.sgpa?.toFixed(2)||"—"}</div><div class="sum-lbl">SGPA</div></div>
  <div><div class="sum-val">${result.cgpa?.toFixed(2)||"—"}</div><div class="sum-lbl">CGPA</div></div>
</div>

<div class="result-wrap">
  <span class="result-pill ${result.result==="fail"?"result-fail":"result-pass"}">
    ${result.result.replace(/_/g," ").toUpperCase()}
  </span>
  ${result.rank ? `&nbsp;&nbsp;<span style="font-size:13px">🏆 Rank #${result.rank}</span>` : ""}
</div>

${result.remarks ? `<div class="remarks"><strong>Remarks:</strong> ${result.remarks}</div>` : ""}

<div class="footer">
  <div class="sig">Controller of Examinations<br><small>Signature & Stamp</small></div>
  <div class="sig">Examination Cell<br><small>Official Seal</small></div>
  <div class="sig">Principal / Dean<br><small>Signature</small></div>
</div>
<div class="verify">Certificate ID: LRN-${result._id.slice(-8).toUpperCase()} | Verify at learnix.edu/verify | This is a digitally generated document</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) {
    win.onload = () => { win.print(); };
  } else {
    const a = document.createElement("a");
    a.href = url; a.download = `Marksheet_Sem${result.semesterNumber}.html`; a.click();
  }
  URL.revokeObjectURL(url);
}

export function StudentResults() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Result | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/results/my`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { setResults(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  const currentCgpa = results.length > 0 ? results[results.length - 1].cgpa : null;
  const bestSgpa    = Math.max(...results.map(r => r.sgpa || 0), 0);
  const passed      = results.filter(r => r.result !== "fail").length;
  const cgpaHistory = results.map(r => ({ sem: `Sem ${r.semesterNumber}`, sgpa: r.sgpa, cgpa: r.cgpa }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Results</h1>
        <p className="text-gray-500 mt-1">Semester-wise marksheets and academic performance</p>
      </div>

      {results.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No results published yet.</p>
          <p className="text-gray-300 text-sm mt-1">Results will appear here once declared by the examination cell.</p>
        </CardContent></Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Current CGPA",  value: currentCgpa?.toFixed(2) || "—", icon: TrendingUp,  color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Best SGPA",     value: bestSgpa?.toFixed(2)  || "—", icon: Award,        color: "text-amber-600",  bg: "bg-amber-50"  },
              { label: "Semesters",     value: String(results.length),        icon: BookOpen,     color: "text-blue-600",   bg: "bg-blue-50"   },
              { label: "Sems Cleared",  value: `${passed}/${results.length}`, icon: CheckCircle,  color: "text-green-600",  bg: "bg-green-50"  },
            ].map(s => {
              const Icon = s.icon;
              return (
                <Card key={s.label}><CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  </div>
                </CardContent></Card>
              );
            })}
          </div>

          {/* Performance trend */}
          {cgpaHistory.length > 1 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 className="w-5 h-5 text-indigo-600" />SGPA / CGPA Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={cgpaHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sem" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="sgpa" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} name="SGPA" />
                    <Line type="monotone" dataKey="cgpa" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "#10b981" }} name="CGPA" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Results list */}
          <div className="space-y-4">
            {results.map(r => (
              <Card key={r._id} className={`hover:shadow-md transition-shadow cursor-pointer ${selected?._id === r._id ? "ring-2 ring-indigo-500" : ""}`}
                onClick={() => setSelected(selected?._id === r._id ? null : r)}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <span className="font-bold text-indigo-600">S{r.semesterNumber}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Semester {r.semesterNumber} — {r.academicYear}</h3>
                        <p className="text-sm text-gray-500">{r.subjects.length} subjects · {r.totalMarksObtained}/{r.totalMaxMarks} marks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="font-bold text-gray-900">{r.percentage}%</p>
                        <p className="text-xs text-gray-400">SGPA: {r.sgpa?.toFixed(2) || "—"}</p>
                      </div>
                      <Badge className={`text-xs border ${RESULT_COLORS[r.result] || "bg-gray-100 text-gray-600"}`}>
                        {r.result.replace(/_/g," ").toUpperCase()}
                      </Badge>
                      <Button size="sm" variant="outline" className="gap-1 text-xs"
                        onClick={e => { e.stopPropagation(); downloadMarksheet(r); }}>
                        <Download className="w-3.5 h-3.5" />Download
                      </Button>
                    </div>
                  </div>

                  {/* Expanded subject table */}
                  {selected?._id === r._id && (
                    <div className="mt-4 border-t pt-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {["Subject","Code","Internal","External","Total","Max","Grade","Credits","Status"].map(h =>
                                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {r.subjects.map((s, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-gray-900">{s.subject}</td>
                                <td className="px-3 py-2 text-gray-500 font-mono">{s.subjectCode || "—"}</td>
                                <td className="px-3 py-2">{s.internalMarks}</td>
                                <td className="px-3 py-2">{s.externalMarks}</td>
                                <td className="px-3 py-2 font-bold">{s.totalMarks}</td>
                                <td className="px-3 py-2 text-gray-400">{s.maxMarks}</td>
                                <td className="px-3 py-2 font-semibold">{s.grade || "—"}</td>
                                <td className="px-3 py-2">{s.credits}</td>
                                <td className="px-3 py-2">
                                  {s.status === "pass"
                                    ? <span className="flex items-center gap-1 text-green-600 text-xs font-semibold"><CheckCircle className="w-3.5 h-3.5" />PASS</span>
                                    : <span className="flex items-center gap-1 text-red-600 text-xs font-semibold"><XCircle className="w-3.5 h-3.5" />FAIL</span>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {r.remarks && <p className="text-sm text-gray-500 italic mt-3 p-3 bg-amber-50 rounded-lg">Remarks: {r.remarks}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
