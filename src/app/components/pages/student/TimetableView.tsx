import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Calendar, Clock, MapPin, User, BookOpen, Beaker, ChevronLeft, ChevronRight } from "lucide-react";
import { getTimetables, type Timetable, type TimetableSlot, type DayOfWeek } from "../../../services/timetableService";

const DAYS: DayOfWeek[] = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  lecture:  { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200", icon: BookOpen },
  lab:      { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200", icon: Beaker },
  tutorial: { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",   icon: User },
  break:    { bg: "bg-gray-50",    text: "text-gray-500",    border: "border-gray-200",   icon: Clock },
  free:     { bg: "bg-slate-50",   text: "text-slate-400",   border: "border-slate-200",  icon: Clock },
};

const TIME_SLOTS = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30","17:00"
];

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const getCurrentDayIndex = () => {
  const day = new Date().getDay(); // 0=Sun
  return day === 0 ? 0 : day - 1; // Mon=0
};

function SlotCard({ slot }: { slot: TimetableSlot }) {
  const style = TYPE_STYLES[slot.type] || TYPE_STYLES.lecture;
  const Icon  = style.icon;
  const instructor = typeof slot.instructor === "object" && slot.instructor ? slot.instructor.username : "";

  if (slot.type === "free" || slot.type === "break") return (
    <div className={`rounded-lg px-3 py-2 ${style.bg} border ${style.border} flex items-center gap-2`}>
      <Clock className={`w-3.5 h-3.5 ${style.text} opacity-50`} />
      <span className={`text-xs ${style.text} font-medium capitalize`}>{slot.type}</span>
    </div>
  );

  return (
    <div
      className={`rounded-xl px-3 py-2.5 ${style.bg} border-l-4 border-l-current ${style.text} ${style.border} shadow-sm`}
      style={{ borderLeftColor: slot.color }}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-bold truncate leading-tight">{slot.subject}</p>
        {slot.subjectCode && (
          <span className={`text-xs font-mono shrink-0 opacity-60`}>{slot.subjectCode}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
        <span className={`text-xs flex items-center gap-0.5 opacity-70`}>
          <Clock className="w-3 h-3" />{slot.startTime} – {slot.endTime}
        </span>
        {slot.room && (
          <span className={`text-xs flex items-center gap-0.5 opacity-70`}>
            <MapPin className="w-3 h-3" />{slot.room}
          </span>
        )}
        {instructor && (
          <span className={`text-xs flex items-center gap-0.5 opacity-70`}>
            <User className="w-3 h-3" />{instructor}
          </span>
        )}
      </div>
      <Badge className={`mt-1.5 text-xs capitalize ${style.bg} ${style.text} border ${style.border} py-0`}>
        <Icon className="w-2.5 h-2.5 mr-0.5" />{slot.type}
      </Badge>
    </div>
  );
}

function DayColumn({ day, slots, isToday }: { day: DayOfWeek; slots: TimetableSlot[]; isToday: boolean }) {
  const daySlots = slots
    .filter(s => s.day === day)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  return (
    <div className={`rounded-xl overflow-hidden border ${isToday ? "border-indigo-300 shadow-md" : "border-gray-200"}`}>
      <div className={`px-3 py-2 text-center ${isToday ? "bg-indigo-600" : "bg-gray-50 border-b"}`}>
        <p className={`text-sm font-bold ${isToday ? "text-white" : "text-gray-900"}`}>{day.slice(0,3)}</p>
        {isToday && <p className="text-indigo-200 text-xs">Today</p>}
      </div>
      <div className="p-2 space-y-2 bg-white min-h-[120px]">
        {daySlots.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-gray-300 text-xs">No classes</div>
        ) : daySlots.map((slot, i) => (
          <SlotCard key={i} slot={slot} />
        ))}
      </div>
    </div>
  );
}

export function TimetableView() {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selected,   setSelected]   = useState<Timetable | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [viewDay,    setViewDay]    = useState(getCurrentDayIndex());

  useEffect(() => {
    getTimetables()
      .then(data => {
        setTimetables(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center p-16">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (timetables.length === 0) return (
    <div className="text-center py-20 text-gray-400">
      <Calendar className="w-14 h-14 mx-auto mb-3 opacity-30" />
      <p className="font-medium">No timetable published yet.</p>
      <p className="text-sm mt-1">Your timetable will appear here once admin publishes it.</p>
    </div>
  );

  const todayIdx   = getCurrentDayIndex();
  const days       = selected?.slots[0] ? DAYS.filter(d => d !== "Saturday" || selected.slots.some(s => s.day === "Saturday")) : DAYS.slice(0, 5);
  const todaySlots = selected ? selected.slots.filter(s => s.day === DAYS[todayIdx]).sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
          <p className="text-gray-500 mt-1">Your weekly class schedule</p>
        </div>
        {timetables.length > 1 && (
          <select
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            value={selected?._id || ""}
            onChange={e => setSelected(timetables.find(t => t._id === e.target.value) || null)}
          >
            {timetables.map(t => (
              <option key={t._id} value={t._id}>
                {typeof t.department === "object" ? t.department?.name : ""} · Year {t.year} Div {t.division}
              </option>
            ))}
          </select>
        )}
      </div>

      {selected && (
        <>
          {/* Today's schedule highlight */}
          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Today — {DAYS[todayIdx]}</p>
                  <p className="text-xs text-gray-500">{new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
                </div>
              </div>
              {todaySlots.length === 0 ? (
                <p className="text-gray-400 text-sm">No classes today 🎉</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {todaySlots.map((slot, i) => <SlotCard key={i} slot={slot} />)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile: day navigator */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setViewDay(d => Math.max(0, d-1))} className="p-1 rounded-lg hover:bg-gray-100">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <p className="font-semibold text-gray-900">{DAYS[viewDay]}</p>
              <button onClick={() => setViewDay(d => Math.min(DAYS.length-1, d+1))} className="p-1 rounded-lg hover:bg-gray-100">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <DayColumn
              day={DAYS[viewDay]}
              slots={selected.slots}
              isToday={viewDay === todayIdx}
            />
          </div>

          {/* Desktop: full week grid */}
          <div className="hidden sm:grid gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map((day, i) => (
              <DayColumn
                key={day}
                day={day}
                slots={selected.slots}
                isToday={DAYS.indexOf(day) === todayIdx}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(TYPE_STYLES).filter(([k]) => k !== "free").map(([type, style]) => {
              const Icon = style.icon;
              return (
                <div key={type} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${style.bg} ${style.text} border ${style.border}`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="capitalize font-medium">{type}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
