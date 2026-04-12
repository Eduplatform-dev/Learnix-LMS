import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Users, BarChart3, Save, BookOpen } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  markAttendance, getCourseReport,
  type AttendanceRecord, type AttendanceStatus, type CourseReport,
} from "../../../services/attendanceService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type EnrolledStudent = { _id: string; username: string; email: string };
type CourseWithStudents = { _id: string; title: string; enrolledStudents: EnrolledStudent[] };

/* status → button styles */
const STATUS_BTNS: Record<AttendanceStatus, { base: string; active: string; label: string }> = {
  present: { base: "bg-[#EAF3DE] text-[#3B6D11] border-[#97C459]", active: "bg-[#C0DD97] border-[#639922]", label: "P" },
  absent: { base: "bg-[#FCEBEB] text-[#A32D2D] border-[#F09595]", active: "bg-[#F7C1C1] border-[#E24B4A]", label: "A" },
  late: { base: "bg-[#FAEEDA] text-[#854F0B] border-[#FAC775]", active: "bg-[#FAC775] border-[#BA7517]", label: "Late" },
  excused: { base: "bg-[#E6F1FB] text-[#0C447C] border-[#85B7EB]", active: "bg-[#C0D8F5] border-[#5A96D8]", label: "Exc" },
};

export function InstructorAttendance() {
  const [courses, setCourses] = useState<CourseWithStudents[]>([]);
  const [selected, setSelected] = useState<CourseWithStudents | null>(null);
  const [view, setView] = useState<"mark" | "report">("mark");
  const [month, setMonth] = useState(() => {
    const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [markedDates, setMarkedDates] = useState<Record<string, boolean>>({});
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [topic, setTopic] = useState("");
  const [lectureType, setLectureType] = useState("lecture");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<CourseReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Load courses ── */
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setError("Unauthorized. Please login again.");
          return;
        }

        const listRes = await fetch(`${API_BASE_URL}/api/courses?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!listRes.ok) throw new Error("Failed to fetch courses");

        const listData = await listRes.json();
        const courseList: any[] = Array.isArray(listData)
          ? listData
          : listData.courses ?? [];

        const detailed = await Promise.all(
          courseList.map(async (c: any) => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/courses/${c._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              if (!res.ok) throw new Error("Failed course details");

              const full = await res.json();

              return {
                _id: full._id,
                title: full.title,
                enrolledStudents: Array.isArray(full.enrolledStudents)
                  ? full.enrolledStudents.map((s: any) =>
                    typeof s === "object"
                      ? {
                        _id: s._id,
                        username: s.username || s.email || "Student",
                        email: s.email || "",
                      }
                      : { _id: s, username: "Student", email: "" }
                  )
                  : [],
              } as CourseWithStudents;
            } catch (err) {
              console.error("Course fetch failed:", err);
              return {
                _id: c._id,
                title: c.title,
                enrolledStudents: [],
              } as CourseWithStudents;
            }
          })
        );

        setCourses(detailed);
        if (detailed.length > 0) setSelected(detailed[0]);

      } catch (err) {
        console.error(err);
        setError("Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ── Init records when course changes ── */
  useEffect(() => {
    if (!selected) return;
    const init: Record<string, AttendanceStatus> = {};
    selected.enrolledStudents.forEach(s => { init[s._id] = "present"; });
    setRecords(init);
    setSelectedDate(null);
  }, [selected]);

  /* ── Load report ── */
  const loadReport = useCallback(async () => {
    if (!selected) return;
    setLoadingReport(true);
    try {
      const data = await getCourseReport(selected._id);
      setReport(data);
    } catch (err) {
      console.error(err);
      setReport(null);
    }
    finally { setLoadingReport(false); }
  }, [selected]);

  useEffect(() => {
    if (view === "report") loadReport();
  }, [view, loadReport]);

  const yr = month.getFullYear();
  const mo = month.getMonth();
  const today = new Date();
  const firstDow = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const prevDays = new Date(yr, mo, 0).getDate();

  const handleDayClick = (day: number) => {
    const dt = new Date(yr, mo, day);
    if (dt.getDay() === 0) return; // skip Sundays
    setSelectedDate(dt);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selected || !selectedDate || Object.keys(records).length === 0) return;
    setSaving(true);
    try {
      const recArr: AttendanceRecord[] = Object.entries(records).map(([student, status]) => ({
        student,
        status,
      }));
      await markAttendance({
        courseId: selected._id,
        date: selectedDate.toISOString(),
        records: recArr,
        lectureType,
        topic,
      });
      const key = `${yr}-${mo}-${selectedDate.getDate()}`;
      setMarkedDates(prev => ({ ...prev, [key]: true }));
      setSaved(true);
      setTopic("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status: AttendanceStatus) => {
    if (!selected) return;
    const next: Record<string, AttendanceStatus> = {};
    selected.enrolledStudents.forEach(s => { next[s._id] = status; });
    setRecords(next);
  };

  if (error) {
    return (
      <div className="text-center text-red-500 py-10">
        {error}
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center p-16">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (courses.length === 0) return (
    <div className="text-center py-20 text-gray-400">
      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>No courses assigned to you yet.</p>
    </div>
  );

  const presentCount = Object.values(records).filter(s => s === "present").length;
  const absentCount = Object.values(records).filter(s => s === "absent").length;
  const lateCount = Object.values(records).filter(s => s === "late").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Attendance</h1>
        <p className="text-gray-500 text-sm mt-0.5">Mark and track student attendance</p>
      </div>

      {/* Course selector + view tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          value={selected?._id || ""}
          onChange={e => {
            const c = courses.find(x => x._id === e.target.value);
            setSelected(c || null);
            setView("mark");
            setReport(null);
            setSaved(false);
          }}
        >
          {courses.map(c => (
            <option key={c._id} value={c._id}>
              {c.title} ({c.enrolledStudents.length} students)
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => setView("mark")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${view === "mark"
              ? "bg-[#E6F1FB] text-[#0C447C] border-[#85B7EB]"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
          >
            <Users className="w-4 h-4" />Mark
          </button>
          <button
            onClick={() => setView("report")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${view === "report"
              ? "bg-[#E6F1FB] text-[#0C447C] border-[#85B7EB]"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
          >
            <BarChart3 className="w-4 h-4" />Report
          </button>
        </div>
      </div>

      {/* ═══════════════ MARK VIEW ═══════════════ */}
      {view === "mark" && selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Left: Calendar */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4">
              {[
                { color: "#C0DD97", label: "Session held" },
                { color: "#85B7EB", label: "Holiday" },
                { color: "#FAEEDA", label: "Selected" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm inline-block border-[1.5px] border-[#378ADD] bg-transparent" />
                Today
              </div>
            </div>

            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() =>
                  setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-base font-medium text-gray-900">{MONTHS[mo]} {yr}</span>
              <button
                onClick={() =>
                  setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-1">
                  {d.slice(0, 2)}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`p-${i}`} className="aspect-square rounded-lg flex items-center justify-center opacity-25">
                  <span className="text-xs text-gray-400">{prevDays - firstDow + 1 + i}</span>
                </div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dt = new Date(yr, mo, day);
                const isSun = dt.getDay() === 0;
                const isToday = dt.toDateString() === today.toDateString();
                const key = `${yr}-${mo}-${day}`;
                const isMarked = !!markedDates[key];
                const isSelected = selectedDate?.getDate() === day &&
                  selectedDate?.getMonth() === mo &&
                  selectedDate?.getFullYear() === yr;

                let bg = "bg-gray-50";
                let border = "border-transparent";
                let tag = "";

                if (isSelected) {
                  bg = "bg-[#FAEEDA]"; border = "border-[#FAC775]"; tag = "MARK";
                } else if (isMarked) {
                  bg = "bg-[#EAF3DE]"; border = "border-[#97C459]"; tag = "DONE";
                } else if (isSun) {
                  bg = "bg-[#E6F1FB]"; border = "border-[#85B7EB]"; tag = "HOL";
                }

                return (
                  <div
                    key={day}
                    onClick={() => !isSun && handleDayClick(day)}
                    className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center
                      border transition-all min-h-[44px] p-0.5
                      ${bg} ${border}
                      ${isToday ? "border-[#378ADD] border-[1.5px]" : ""}
                      ${isSun ? "cursor-default" : "cursor-pointer hover:border-gray-300"}
                    `}
                  >
                    <span className="text-xs font-medium leading-none text-gray-800">{day}</span>
                    {tag && (
                      <span className={`text-[8px] font-semibold mt-0.5 leading-none ${tag === "DONE" ? "text-[#3B6D11]" :
                        tag === "MARK" ? "text-[#854F0B]" : "text-[#185FA5]"
                        }`}>{tag}</span>
                    )}
                  </div>
                );
              })}

              {(() => {
                const total = firstDow + daysInMonth;
                const rem = 7 - (total % 7);
                if (rem === 7) return null;
                return Array.from({ length: rem }).map((_, i) => (
                  <div key={`n-${i}`} className="aspect-square rounded-lg flex items-center justify-center opacity-25">
                    <span className="text-xs text-gray-400">{i + 1}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Right: Attendance form (appears when date selected) */}
          <div>
            {!selectedDate ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-sm font-medium text-gray-500">Click a date on the calendar</p>
                <p className="text-xs text-gray-400 mt-1">to start marking attendance</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">

                {/* Date info strip */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="8" cy="8" r="6" /><line x1="8" y1="6" x2="8" y2="8.5" /><circle cx="8" cy="11" r=".5" fill="currentColor" stroke="none" />
                  </svg>
                  Marking for{" "}
                  <strong>
                    {selectedDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                  </strong>
                </div>

                {/* Session meta */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Lecture Type</Label>
                    <select
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={lectureType}
                      onChange={e => setLectureType(e.target.value)}
                    >
                      <option value="lecture">Lecture</option>
                      <option value="lab">Lab</option>
                      <option value="tutorial">Tutorial</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Topic (optional)</Label>
                    <Input
                      className="mt-1 text-sm"
                      placeholder="e.g., Arrays"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick marks summary + bulk actions */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="text-xs bg-[#EAF3DE] text-[#3B6D11] px-2 py-1 rounded-full font-medium">
                      ✓ {presentCount} Present
                    </span>
                    <span className="text-xs bg-[#FCEBEB] text-[#A32D2D] px-2 py-1 rounded-full font-medium">
                      ✗ {absentCount} Absent
                    </span>
                    {lateCount > 0 && (
                      <span className="text-xs bg-[#FAEEDA] text-[#854F0B] px-2 py-1 rounded-full font-medium">
                        ~ {lateCount} Late
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => markAll("present")}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[#EAF3DE] text-[#3B6D11] border border-[#97C459] hover:bg-[#C0DD97] transition-colors"
                    >
                      All P
                    </button>
                    <button
                      onClick={() => markAll("absent")}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[#FCEBEB] text-[#A32D2D] border border-[#F09595] hover:bg-[#F7C1C1] transition-colors"
                    >
                      All A
                    </button>
                  </div>
                </div>

                {/* Student list */}
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto -mx-5 px-5">
                  {selected.enrolledStudents.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">No enrolled students.</p>
                  ) : (
                    selected.enrolledStudents.map((student, idx) => {
                      const current = records[student._id] ?? "present";
                      return (
                        <div key={student._id} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{student.username}</p>
                            <p className="text-xs text-gray-400">Roll: {String(idx + 1).padStart(2, "0")}</p>
                          </div>
                          <div className="flex gap-1.5">
                            {(["present", "absent", "late"] as AttendanceStatus[]).map(st => {
                              const cfg = STATUS_BTNS[st];
                              const isActive = current === st;
                              return (
                                <button
                                  key={st}
                                  onClick={() => setRecords(prev => ({ ...prev, [student._id]: st }))}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${isActive ? cfg.active : cfg.base
                                    }`}
                                >
                                  {cfg.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Submit */}
                {saved ? (
                  <div className="flex items-center gap-2 bg-[#EAF3DE] border border-[#97C459] text-[#3B6D11] rounded-lg px-4 py-2.5 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Attendance saved for {selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}!
                  </div>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving || selected.enrolledStudents.length === 0}
                    className="w-full py-2.5 rounded-lg bg-[#0C447C] hover:bg-[#185FA5] disabled:opacity-50 disabled:cursor-default text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving…" : `Submit Attendance — ${selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ REPORT VIEW ═══════════════ */}
      {view === "report" && (
        <>
          {loadingReport ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : report ? (
            <>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge className="bg-[#E6F1FB] text-[#0C447C] border-[#85B7EB]">
                  {report.totalSessions} sessions
                </Badge>
                <Badge className="bg-[#FCEBEB] text-[#A32D2D] border-[#F09595]">
                  {report.students.filter(s => s.shortage).length} shortage
                </Badge>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {["Student", "Present", "Absent", "Late", "%", "Status"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...report.students]
                        .sort((a, b) => a.percentage - b.percentage)
                        .map(s => (
                          <tr key={s.student._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-900">{s.student.username}</p>
                              <p className="text-xs text-gray-400">{s.student.email}</p>
                            </td>
                            <td className="px-4 py-3 text-sm text-[#3B6D11] font-medium">{s.present}</td>
                            <td className="px-4 py-3 text-sm text-[#A32D2D] font-medium">{s.absent}</td>
                            <td className="px-4 py-3 text-sm text-[#854F0B] font-medium">{s.late}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${s.percentage}%`,
                                      background: s.percentage >= 85 ? "#639922" : s.percentage >= 75 ? "#F59E0B" : "#E24B4A",
                                    }}
                                  />
                                </div>
                                <span className={`text-sm font-semibold ${s.percentage >= 85 ? "text-[#3B6D11]" :
                                  s.percentage >= 75 ? "text-amber-600" : "text-[#A32D2D]"
                                  }`}>
                                  {s.percentage}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {s.shortage ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#FCEBEB] text-[#A32D2D] border border-[#F09595]">
                                  <AlertTriangle className="w-3 h-3" />Shortage
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#EAF3DE] text-[#3B6D11] border border-[#97C459]">
                                  <CheckCircle className="w-3 h-3" />OK
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm">
              No report data available for this course yet.
            </div>
          )}
        </>
      )}
    </div>
  );
} 