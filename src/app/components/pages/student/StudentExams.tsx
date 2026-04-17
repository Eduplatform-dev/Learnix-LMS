import { useEffect, useState } from "react";
import {
  Calendar, Clock, MapPin, BookOpen, AlertTriangle,
  Download, Info, CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { Authorization: `Bearer ${t}` };
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
  status: string; // DB status — we override with date-based logic below
  instructions: string;
  department?: { name: string; code: string } | null;
  semesterNumber?: number | null;
};

const EXAM_TYPE_COLORS: Record<string, string> = {
  midterm:   "bg-blue-100 text-blue-700 border-blue-200",
  final:     "bg-purple-100 text-purple-700 border-purple-200",
  unit_test: "bg-amber-100 text-amber-700 border-amber-200",
  practical: "bg-green-100 text-green-700 border-green-200",
  viva:      "bg-pink-100 text-pink-700 border-pink-200",
  internal:  "bg-slate-100 text-slate-700 border-slate-200",
};

/**
 * Derive the display status from the exam date rather than the DB `status` field.
 * The DB status may not be updated by a cron job, so "scheduled" exams that have
 * passed will wrongly still show as "scheduled".
 *
 * Rules:
 *  - examDate is today  → "ongoing"
 *  - examDate is past   → "completed"
 *  - examDate is future → "scheduled" (or "cancelled" if DB says so)
 */
function deriveStatus(exam: Exam): "scheduled" | "ongoing" | "completed" | "cancelled" {
  if (exam.status === "cancelled") return "cancelled";

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const examDay = new Date(exam.examDate);
  const examDate = new Date(examDay.getFullYear(), examDay.getMonth(), examDay.getDate());

  if (examDate < today) return "completed";
  if (examDate.getTime() === today.getTime()) return "ongoing";
  return "scheduled";
}

function daysUntil(dateStr: string) {
  const d    = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const now  = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  ongoing:   "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

function exportTimetable(exams: Exam[]) {
  const rows = [
    ["Date", "Subject", "Code", "Type", "Time", "Duration (min)", "Room", "Building", "Total Marks", "Passing Marks", "Status"],
    ...exams.map(e => [
      new Date(e.examDate).toLocaleDateString("en-IN"),
      e.subject,
      e.subjectCode || "—",
      e.examType.replace("_", " "),
      `${e.startTime} – ${e.endTime}`,
      String(e.duration),
      e.room || "—",
      e.building || "—",
      String(e.totalMarks),
      String(e.passingMarks),
      deriveStatus(e),
    ]),
  ];
  const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "exam_timetable.csv"; a.click();
  URL.revokeObjectURL(url);
}

export function StudentExams() {
  const [exams,    setExams]    = useState<Exam[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Exam | null>(null);

  useEffect(() => {
    // Fetch ALL exams — we classify upcoming/completed client-side by date,
    // because the DB `status` field may not be updated automatically.
    fetch(`${API_BASE_URL}/api/exams`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { setExams(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Split using derived status (date-based), not DB status
  const upcoming  = exams.filter(e => deriveStatus(e) === "scheduled").sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
  const ongoing   = exams.filter(e => deriveStatus(e) === "ongoing");
  const completed = exams.filter(e => deriveStatus(e) === "completed").sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
  const nextExam  = upcoming[0] ?? ongoing[0] ?? null;

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Exam Timetable</h1>
          <p className="text-gray-500 mt-1">Upcoming exams, timings, and venue details</p>
        </div>
        {exams.length > 0 && (
          <Button variant="outline" onClick={() => exportTimetable(exams)}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
        )}
      </div>

      {/* Next exam countdown */}
      {nextExam && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
          <p className="text-indigo-200 text-sm font-medium mb-1">
            {deriveStatus(nextExam) === "ongoing" ? "ONGOING EXAM" : "NEXT EXAM"}
          </p>
          <h2 className="text-2xl font-bold mb-1">{nextExam.subject}</h2>
          <p className="text-indigo-200 text-sm mb-3">{nextExam.title}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(nextExam.examDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" })}
            </span>
            <span className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5">
              <Clock className="w-4 h-4" />
              {nextExam.startTime} – {nextExam.endTime}
            </span>
            {nextExam.room && (
              <span className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5">
                <MapPin className="w-4 h-4" />
                {nextExam.room}{nextExam.building ? `, ${nextExam.building}` : ""}
              </span>
            )}
          </div>
          {(() => {
            const d = daysUntil(nextExam.examDate);
            return (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
                {deriveStatus(nextExam) === "ongoing" ? (
                  <span className="font-bold text-green-300 animate-pulse">🟢 Exam is ongoing now!</span>
                ) : d === 0 ? (
                  <span className="font-bold text-yellow-300 animate-pulse">📢 Exam is TODAY!</span>
                ) : d === 1 ? (
                  <span className="font-bold text-yellow-300">⚡ Tomorrow!</span>
                ) : (
                  <span><strong className="text-2xl">{d}</strong> days remaining</span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Upcoming",  value: upcoming.length,  color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "This Week", value: upcoming.filter(e => daysUntil(e.examDate) >= 0 && daysUntil(e.examDate) <= 7).length, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Completed", value: completed.length, color: "text-green-600",  bg: "bg-green-50"  },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {exams.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No exams scheduled yet.</p>
        </CardContent></Card>
      ) : (
        <>
          {/* Ongoing exams */}
          {ongoing.length > 0 && (
            <div>
              <h2 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
                Ongoing Now
              </h2>
              <div className="space-y-3">
                {ongoing.map(exam => (
                  <ExamCard key={exam._id} exam={exam} selected={selected} onSelect={setSelected} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming exams */}
          {upcoming.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3">Upcoming Exams</h2>
              <div className="space-y-3">
                {upcoming.map(exam => (
                  <ExamCard key={exam._id} exam={exam} selected={selected} onSelect={setSelected} />
                ))}
              </div>
            </div>
          )}

          {/* Completed exams */}
          {completed.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-500 mb-3 text-sm uppercase tracking-wider">Completed Exams</h2>
              <div className="space-y-2 opacity-60">
                {completed.slice(0, 5).map(exam => (
                  <Card key={exam._id} className="hover:shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">{exam.subject}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(exam.examDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              {exam.room && ` · ${exam.room}`}
                            </p>
                          </div>
                        </div>
                        <Badge className="text-xs bg-gray-100 text-gray-500">Completed</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {completed.length > 5 && (
                  <p className="text-xs text-gray-400 text-center pt-1">+ {completed.length - 5} more completed exams</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ExamCard({ exam, selected, onSelect }: { exam: Exam; selected: Exam | null; onSelect: (e: Exam | null) => void }) {
  const d      = daysUntil(exam.examDate);
  const status = deriveStatus(exam);
  const urgent = status === "scheduled" && d <= 3;

  return (
    <Card
      className={`hover:shadow-md transition-all cursor-pointer ${urgent ? "border-l-4 border-l-amber-400" : ""} ${selected?._id === exam._id ? "ring-2 ring-indigo-500" : ""}`}
      onClick={() => onSelect(selected?._id === exam._id ? null : exam)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Date block */}
            <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center ${
              status === "ongoing" ? "bg-green-600 text-white" :
              urgent ? "bg-amber-600 text-white" : "bg-indigo-100"
            }`}>
              <span className={`text-xl font-black leading-none ${status === "ongoing" || urgent ? "text-white" : "text-indigo-700"}`}>
                {new Date(exam.examDate).getDate()}
              </span>
              <span className={`text-xs font-medium ${status === "ongoing" || urgent ? "text-white/80" : "text-indigo-500"}`}>
                {new Date(exam.examDate).toLocaleDateString("en-IN", { month: "short" })}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{exam.subject}</h3>
                {exam.subjectCode && <span className="text-xs font-mono text-gray-400">({exam.subjectCode})</span>}
                <Badge className={`text-xs border ${EXAM_TYPE_COLORS[exam.examType] || ""}`}>
                  {exam.examType.replace("_", " ")}
                </Badge>
                <Badge className={`text-xs ${STATUS_COLORS[status]}`}>{status}</Badge>
              </div>
              <p className="text-sm text-gray-500">{exam.title}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{exam.startTime} – {exam.endTime} ({exam.duration}min)</span>
                {exam.room && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{exam.room}{exam.building ? `, ${exam.building}` : ""}</span>}
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />Max: {exam.totalMarks} | Pass: {exam.passingMarks}</span>
                {exam.semesterNumber && <span>Sem {exam.semesterNumber}</span>}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 text-right">
            {status === "ongoing" ? (
              <Badge className="bg-green-600 text-white animate-pulse">ONGOING</Badge>
            ) : d === 0 ? (
              <Badge className="bg-red-600 text-white animate-pulse">TODAY</Badge>
            ) : d === 1 ? (
              <Badge className="bg-amber-500 text-white">Tomorrow</Badge>
            ) : status === "scheduled" && urgent ? (
              <Badge className="bg-amber-100 text-amber-700">{d} days</Badge>
            ) : status === "scheduled" ? (
              <span className="text-sm text-gray-400">{d} days</span>
            ) : null}
          </div>
        </div>

        {/* Expanded instructions */}
        {selected?._id === exam._id && exam.instructions && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-1">EXAM INSTRUCTIONS</p>
                <p className="text-sm text-blue-900 whitespace-pre-wrap">{exam.instructions}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}