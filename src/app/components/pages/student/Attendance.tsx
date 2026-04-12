import { useEffect, useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { getMyAttendance, type SubjectSummary, type MyAttendance } from "../../../services/attendanceService";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SUBJECT_COLORS = [
  "#378ADD", "#1D9E75", "#D85A30", "#7F77DD",
  "#E6874A", "#2BA8A8", "#C4548A", "#5B9E44",
];

/* ── calendar status → cell style ── */
const STATUS_STYLES: Record<string, { bg: string; border: string; tagColor: string; tag: string }> = {
  present: { bg: "bg-[#EAF3DE]", border: "border-[#97C459]", tagColor: "text-[#3B6D11]", tag: "PRES" },
  absent: { bg: "bg-[#FCEBEB]", border: "border-[#F09595]", tagColor: "text-[#A32D2D]", tag: "ABS" },
  holiday: { bg: "bg-[#E6F1FB]", border: "border-[#85B7EB]", tagColor: "text-[#185FA5]", tag: "HOL" },
  late: { bg: "bg-[#FAEEDA]", border: "border-[#FAC775]", tagColor: "text-[#854F0B]", tag: "LATE" },
};

/* Build a map of {day: status} from SubjectSummary sessions for the visible month */
function buildDayMap(
  sessions: SubjectSummary["sessions"],
  year: number,
  month: number
): Record<number, string> {
  const map: Record<number, string> = {};
  sessions.forEach(s => {
    const d = new Date(s.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      map[d.getDate()] = s.status === "late" ? "late" : s.status;
    }
  });
  return map;
}

export function Attendance() {
  const [data, setData] = useState<MyAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(0);
  const [month, setMonth] = useState(() => {
    const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyAttendance()
      .then(setData)
      .catch(err => {
        console.error(err);
        setError("Failed to load attendance");
      })
      .finally(() => setLoading(false));
  }, []);
  const subjects = data?.subjects ?? [];
  const current = subjects[selectedSubject] ?? null;

  const pct = current?.percentage ?? 0;

  const yr = month.getFullYear();
  const mo = month.getMonth();
  const today = useMemo(() => new Date(), []);

  const dayMap = useMemo(() => {
    return current
      ? buildDayMap(current.sessions, yr, mo)
      : {};
  }, [current, yr, mo]);

  /* calendar grid helpers */
  const firstDow = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const prevDays = new Date(yr, mo, 0).getDate();

  if (error) {
    return (
      <div className="text-center text-red-500 py-10">
        {error}
      </div>
    );
  }
  if (loading) return (
    <div className="flex items-center justify-center p-16">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data || subjects.length === 0) return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-5xl mb-3">📅</div>
      <p className="font-medium">No attendance records yet.</p>
      <p className="text-sm mt-1">Your attendance will appear here once instructors start marking.</p>
    </div>
  );

  const shortageCount = subjects.filter(s => s.shortage).length;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-500 text-sm mt-0.5">Subject-wise · 75% minimum required</p>
      </div>

      {/* Shortage banner */}
      {shortageCount > 0 && (
        <div className="flex items-start gap-3 bg-[#FCEBEB] border border-[#F09595] rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-[#A32D2D] mt-0.5 shrink-0" />
          <p className="text-sm text-[#A32D2D] font-medium">
            Attendance shortage in {shortageCount} subject{shortageCount > 1 ? "s" : ""}. Students below 75% may be detained.
          </p>
        </div>
      )}

      {/* Subject pills */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">My subjects</p>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s, i) => {
            const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
            const active = i === selectedSubject;
            return (
              <button
                key={s.courseId || s.name}
                onClick={() => setSelectedSubject(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active
                  ? "bg-[#E6F1FB] text-[#0C447C] border-[#85B7EB]"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: color }}
                />
                {s.name}
                {s.code && <span className="opacity-60">({s.code})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      {current && (
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: "Present", value: current.present, color: "#3B6D11", bg: "#EAF3DE" },
            { label: "Absent", value: current.absent, color: "#A32D2D", bg: "#FCEBEB" },
            { label: "Late", value: current.late, color: "#854F0B", bg: "#FAEEDA" },
            { label: "Attendance", value: `${pct}%`, color: pct >= 75 ? "#3B6D11" : "#A32D2D", bg: pct >= 75 ? "#EAF3DE" : "#FCEBEB", isBar: true, pct },
          ].map(s => (
            <div key={s.label}
              className="rounded-xl p-3 text-center"
              style={{ background: s.bg }}>
              <div className="text-xl font-semibold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: s.color, opacity: 0.7 }}>{s.label}</div>
              {(s as any).isBar && (
                <div className="mt-1.5 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(s as any).pct}%`, background: s.color }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Status message */}
      {current && (() => {
        if (current.total === 0) {
          return (
            <div className="bg-gray-100 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-600">
              No classes conducted yet.
            </div>
          );
        }

        const requiredClasses = Math.max(
          0,
          Math.ceil(
            (0.75 * current.total - (current.present + current.late * 0.5)) / 0.75
          )
        );

        const canMiss = Math.max(
          0,
          Math.floor(
            (current.present + current.late * 0.5 - 0.75 * current.total) / 0.75
          )
        );

        return pct < 75 ? (
          <div className="bg-[#FCEBEB] border border-[#F09595] rounded-xl px-4 py-2.5 text-sm text-[#A32D2D]">
            ⚠️ Attendance {pct}% — below minimum. Attend{" "}
            <strong>
              {requiredClasses} more class
              {requiredClasses !== 1 ? "es" : ""}
            </strong>{" "}
            to reach 75%.
          </div>
        ) : (
          <div className="bg-[#EAF3DE] border border-[#97C459] rounded-xl px-4 py-2.5 text-sm text-[#3B6D11]">
            ✓ Attendance {pct}% — on track. You can miss up to{" "}
            <strong>
              {canMiss} more class
              {canMiss !== 1 ? "es" : ""}
            </strong>{" "}
            safely.
          </div>
        );
      })()}

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { color: "#C0DD97", label: "Present" },
          { color: "#F09595", label: "Absent" },
          { color: "#85B7EB", label: "Holiday" },
          { color: "#FAC775", label: "Late" },
          { color: "#F0F0F0", label: "No class" },
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

      {/* Calendar card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
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

        {/* Day name headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-1">
              {d.slice(0, 2)}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Prev month filler */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`prev-${i}`} className="aspect-square rounded-lg flex items-center justify-center opacity-25">
              <span className="text-xs text-gray-400">{prevDays - firstDow + 1 + i}</span>
            </div>
          ))}

          {/* Current month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dt = new Date(yr, mo, day);
            const isSun = dt.getDay() === 0;
            const isToday = dt.toDateString() === today.toDateString();
            const status = dayMap[day];
            const s = status ? STATUS_STYLES[status] : null;
            const isHol = status === "holiday";
            return (
              <div
                key={day}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center
                  relative border transition-all select-none min-h-[44px] p-0.5
                  ${isToday ? "border-[#378ADD] border-[1.5px]" : s ? `${s.bg} ${s.border} border` : isHol ? "bg-[#E6F1FB] border-[#85B7EB] border" : "bg-gray-50 border-transparent"}
                `}
              >
                <span className="text-xs font-medium leading-none text-gray-800">{day}</span>
                {s && (
                  <span className={`text-[8px] font-semibold mt-0.5 leading-none ${s.tagColor}`}>
                    {s.tag}
                  </span>
                )}
                {isHol && (
                  <span className="text-[8px] font-semibold mt-0.5 leading-none text-[#185FA5]">
                    HOL
                  </span>
                )}
              </div>
            );
          })}

          {/* Next month filler */}
          {(() => {
            const total = firstDow + daysInMonth;
            const rem = 7 - (total % 7);
            if (rem === 7) return null;
            return Array.from({ length: rem }).map((_, i) => (
              <div key={`next-${i}`} className="aspect-square rounded-lg flex items-center justify-center opacity-25">
                <span className="text-xs text-gray-400">{i + 1}</span>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Session log for selected subject */}
      {current && current.sessions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Recent sessions — {current.name}
            </p>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {[...current.sessions].reverse().slice(0, 12).map((s, i) => {
              const st = s.status === "late" ? STATUS_STYLES.late : STATUS_STYLES[s.status] ?? STATUS_STYLES.present;
              return (
                <div key={s.date} className="flex items-center justify-between px-5 py-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${s.status === "present" ? "bg-[#97C459]" :
                        s.status === "absent" ? "bg-[#F09595]" :
                          s.status === "late" ? "bg-[#FAC775]" : "bg-[#85B7EB]"
                        }`}
                    />
                    <span className="text-sm text-gray-600">
                      {new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    {s.topic && (
                      <span className="text-xs text-gray-400 truncate max-w-[140px]">— {s.topic}</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.tagColor} capitalize`}>
                    {s.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}