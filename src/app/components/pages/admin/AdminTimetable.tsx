// src/app/components/pages/admin/AdminTimetable.tsx
// FIXED: Full timetable management with visual weekly grid preview
// Admin can create timetables, add/remove slots, publish/unpublish

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import {
  Plus, Trash2, Eye, EyeOff, Save, Calendar, Clock, MapPin,
  User, BookOpen, X, GraduationCap, Beaker, Coffee, AlertCircle,
  ChevronDown, ChevronUp, Edit, Check,
} from "lucide-react";
import {
  getTimetables, createOrUpdateTimetable, publishTimetable, deleteTimetable,
  type Timetable, type TimetableSlot, type DayOfWeek, type SlotType,
} from "../../../services/timetableService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SLOT_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ec4899",
  "#8b5cf6", "#14b8a6", "#f97316", "#3b82f6", "#ef4444", "#84cc16",
];

const TYPE_META: Record<SlotType, { label: string; icon: any; color: string; bg: string }> = {
  lecture:  { label: "Lecture",  icon: BookOpen,  color: "text-indigo-700",  bg: "bg-indigo-50  border-indigo-200"  },
  lab:      { label: "Lab",      icon: Beaker,    color: "text-purple-700",  bg: "bg-purple-50  border-purple-200"  },
  tutorial: { label: "Tutorial", icon: User,      color: "text-teal-700",    bg: "bg-teal-50    border-teal-200"    },
  break:    { label: "Break",    icon: Coffee,    color: "text-gray-500",    bg: "bg-gray-100   border-gray-200"    },
  free:     { label: "Free",     icon: Clock,     color: "text-slate-400",   bg: "bg-slate-50   border-slate-200"   },
};

const EMPTY_SLOT = (): Omit<TimetableSlot, "_id"> => ({
  day:         "Monday",
  startTime:   "09:00",
  endTime:     "10:00",
  subject:     "",
  subjectCode: "",
  instructor:  null,
  room:        "",
  type:        "lecture",
  color:       "#6366f1",
});

/* ── Weekly Grid Preview ──────────────────────────────────── */
function WeeklyGrid({ slots }: { slots: TimetableSlot[] }) {
  const today = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()] as DayOfWeek;

  return (
    <div className="overflow-x-auto">
      <div className="grid gap-2 min-w-[700px]" style={{ gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)` }}>
        {/* Header */}
        <div className="text-xs font-semibold text-gray-400 uppercase py-2" />
        {DAYS.map(day => (
          <div key={day} className={`text-center py-2 rounded-lg text-xs font-bold ${day === today ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            {day.slice(0, 3)}
            {day === today && <div className="text-indigo-200 text-[9px]">Today</div>}
          </div>
        ))}

        {/* Time slots from 8:00 to 17:00 */}
        {Array.from({ length: 9 }, (_, h) => {
          const hour = h + 8;
          const timeStr = `${String(hour).padStart(2, "0")}:00`;
          return (
            <>
              <div key={`t-${hour}`} className="text-xs text-gray-400 text-right pr-2 pt-1">{timeStr}</div>
              {DAYS.map(day => {
                const daySlots = slots.filter(s =>
                  s.day === day &&
                  parseInt(s.startTime.split(":")[0]) === hour
                );
                return (
                  <div key={`${day}-${hour}`} className="min-h-[48px] border-t border-gray-100 relative">
                    {daySlots.map((slot, i) => {
                      const meta = TYPE_META[slot.type] || TYPE_META.lecture;
                      const Icon = meta.icon;
                      return (
                        <div
                          key={i}
                          className={`rounded-lg px-2 py-1 border text-xs ${meta.bg} ${meta.color} mb-1`}
                          style={{ borderLeftColor: slot.color, borderLeftWidth: 3 }}
                        >
                          <p className="font-semibold truncate">{slot.subject || slot.type}</p>
                          <p className="opacity-70">{slot.startTime}–{slot.endTime}</p>
                          {slot.room && <p className="opacity-60 truncate">📍{slot.room}</p>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          );
        })}
      </div>
    </div>
  );
}

/* ── Slot Row Editor ──────────────────────────────────────── */
function SlotEditor({
  slot, index, onChange, onRemove,
}: {
  slot: TimetableSlot;
  index: number;
  onChange: (i: number, s: TimetableSlot) => void;
  onRemove: (i: number) => void;
}) {
  const set = (k: keyof TimetableSlot, v: any) => onChange(index, { ...slot, [k]: v });
  const meta = TYPE_META[slot.type] || TYPE_META.lecture;

  return (
    <div className={`rounded-xl border-2 p-4 ${meta.bg.split(" ")[0]} border-gray-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{index + 1}</span>
          <Badge className={`text-xs ${meta.bg} ${meta.color} border`}>{meta.label}</Badge>
        </div>
        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 h-7 w-7 p-0" onClick={() => onRemove(index)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Day *</label>
          <select className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            value={slot.day} onChange={e => set("day", e.target.value)}>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Type *</label>
          <select className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            value={slot.type} onChange={e => set("type", e.target.value as SlotType)}>
            {(Object.entries(TYPE_META) as [SlotType, any][]).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Start *</label>
          <input type="time" className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            value={slot.startTime} onChange={e => set("startTime", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">End *</label>
          <input type="time" className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            value={slot.endTime} onChange={e => set("endTime", e.target.value)} />
        </div>
      </div>

      {slot.type !== "break" && slot.type !== "free" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-600 block mb-1">Subject *</label>
            <Input className="bg-white" placeholder="e.g., Data Structures"
              value={slot.subject} onChange={e => set("subject", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Code</label>
            <Input className="bg-white" placeholder="CS301"
              value={slot.subjectCode} onChange={e => set("subjectCode", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Room</label>
            <Input className="bg-white" placeholder="A-201"
              value={slot.room} onChange={e => set("room", e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-gray-600 block mb-1">Color Tag</label>
            <div className="flex flex-wrap gap-1.5">
              {SLOT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set("color", c)}
                  className={`w-6 h-6 rounded-full transition-all ${slot.color === c ? "ring-2 ring-offset-1 ring-gray-500 scale-125" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Create Timetable Modal ───────────────────────────────── */
function CreateModal({
  departments,
  onClose,
  onCreated,
}: {
  departments: any[];
  onClose: () => void;
  onCreated: (tt: Timetable) => void;
}) {
  const [form, setForm] = useState({
    department: "", year: "1", division: "A",
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    semester: "1",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const handleCreate = async () => {
    if (!form.department) { setError("Please select a department"); return; }
    setSaving(true); setError("");
    try {
      const tt = await createOrUpdateTimetable({
        department:   form.department,
        year:         Number(form.year),
        division:     form.division,
        academicYear: form.academicYear,
        semester:     Number(form.semester),
        slots:        [],
      });
      onCreated(tt);
      onClose();
    } catch (e: any) { setError(e.message || "Failed to create"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">New Timetable</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Label>Department *</Label>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            >
              <option value="">Select department</option>
              {departments.map((d: any) => (
                <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
              ))}
            </select>
            {departments.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No departments yet. Add them in the Departments page first.</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Year *</Label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
                {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div>
              <Label>Division</Label>
              <Input className="mt-1" value={form.division} maxLength={5}
                onChange={e => setForm(f => ({ ...f, division: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <Label>Semester *</Label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.semester}
                onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Academic Year *</Label>
            <Input className="mt-1" placeholder="e.g., 2025-2026" value={form.academicYear}
              onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.department}
              className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? "Creating..." : "Create Timetable"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN PAGE ────────────────────────────────────────────── */
export function AdminTimetable() {
  const [timetables,   setTimetables]   = useState<Timetable[]>([]);
  const [selected,     setSelected]     = useState<Timetable | null>(null);
  const [slots,        setSlots]        = useState<TimetableSlot[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState("");
  const [departments,  setDepartments]  = useState<any[]>([]);
  const [showCreate,   setShowCreate]   = useState(false);
  const [previewMode,  setPreviewMode]  = useState(false);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [tt, depts] = await Promise.all([
        getTimetables(),
        fetch(`${API_BASE_URL}/api/departments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }).then(r => r.json()),
      ]);
      setTimetables(tt);
      setDepartments(Array.isArray(depts) ? depts : []);
      if (tt.length > 0 && !selected) {
        setSelected(tt[0]);
        setSlots(tt[0].slots || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSelect = (tt: Timetable) => {
    setSelected(tt);
    setSlots(tt.slots || []);
    setSaved(false);
    setError("");
    setPreviewMode(false);
  };

  const handleAddSlot = () => {
    setSlots(prev => [...prev, EMPTY_SLOT() as TimetableSlot]);
    setPreviewMode(false);
    // Scroll to bottom
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
  };

  const handleChangeSlot = (i: number, updated: TimetableSlot) =>
    setSlots(prev => prev.map((s, idx) => idx === i ? updated : s));

  const handleRemoveSlot = (i: number) =>
    setSlots(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true); setError("");
    try {
      const dept = typeof selected.department === "object" ? selected.department?._id : selected.department;
      const updated = await createOrUpdateTimetable({
        department:   dept || "",
        year:         selected.year,
        division:     selected.division,
        academicYear: selected.academicYear,
        semester:     selected.semester,
        slots,
        isPublished:  selected.isPublished,
      });
      setTimetables(prev => prev.map(t => t._id === updated._id ? updated : t));
      setSelected(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setError(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const handlePublish = async (id: string, publish: boolean) => {
    try {
      const updated = await publishTimetable(id, publish);
      setTimetables(prev => prev.map(t => t._id === updated._id ? updated : t));
      if (selected?._id === id) setSelected(updated);
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this timetable?")) return;
    await deleteTimetable(id);
    const remaining = timetables.filter(t => t._id !== id);
    setTimetables(remaining);
    if (selected?._id === id) {
      setSelected(remaining[0] || null);
      setSlots(remaining[0]?.slots || []);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Timetable Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create and publish weekly schedules for departments</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus className="w-4 h-4" />New Timetable
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4" />{error}
        </div>
      )}

      {timetables.length === 0 ? (
        /* ── Empty state ── */
        <Card>
          <CardContent className="p-16 text-center">
            <Calendar className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Timetables Yet</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
              Create a timetable for a department, add time slots, then publish it so students can view their schedule.
            </p>
            <Button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="w-4 h-4" />Create First Timetable
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Left: Timetable list ── */}
          <div className="lg:col-span-1 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">All Timetables</p>
            {timetables.map(tt => {
              const dept = typeof tt.department === "object" ? tt.department?.name || "—" : "—";
              const code = typeof tt.department === "object" ? (tt.department as any)?.code || "" : "";
              const isActive = selected?._id === tt._id;
              return (
                <div
                  key={tt._id}
                  className={`rounded-xl border p-3.5 cursor-pointer transition-all ${isActive ? "border-indigo-500 bg-indigo-50 shadow-sm" : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm"}`}
                  onClick={() => handleSelect(tt)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{dept}</p>
                      {code && <p className="text-xs font-mono text-indigo-600">{code}</p>}
                      <p className="text-xs text-gray-500 mt-0.5">
                        Year {tt.year} · Div {tt.division} · Sem {tt.semester}
                      </p>
                      <p className="text-xs text-gray-400">{tt.academicYear}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge className={`text-xs ${tt.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {tt.isPublished ? "Published" : "Draft"}
                      </Badge>
                      <span className="text-xs text-gray-400">{tt.slots.length} slots</span>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-1 mt-2.5" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost"
                      className={`h-6 text-xs gap-1 flex-1 ${tt.isPublished ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"}`}
                      onClick={() => handlePublish(tt._id, !tt.isPublished)}>
                      {tt.isPublished ? <><EyeOff className="w-3 h-3" />Unpublish</> : <><Eye className="w-3 h-3" />Publish</>}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-red-400 hover:text-red-600"
                      onClick={() => handleDelete(tt._id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Right: Slot editor ── */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Select a timetable to edit its slots</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="font-bold text-gray-900">
                      {typeof selected.department === "object" ? (selected.department as any)?.name : "—"}
                      {" · "}Year {selected.year} Div {selected.division} · Sem {selected.semester}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {slots.length} slot{slots.length !== 1 ? "s" : ""} configured · {selected.academicYear}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setPreviewMode(p => !p)}>
                      {previewMode ? <><Edit className="w-3.5 h-3.5" />Edit</>  : <><Eye className="w-3.5 h-3.5" />Preview</>}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={handleAddSlot}>
                      <Plus className="w-4 h-4" />Add Slot
                    </Button>
                    {saved ? (
                      <Badge className="bg-green-100 text-green-700 px-3 py-1.5 text-sm">
                        <Check className="w-3.5 h-3.5 mr-1" />Saved!
                      </Badge>
                    ) : (
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1" onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4" />{saving ? "Saving..." : "Save Changes"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Preview mode: weekly grid */}
                {previewMode ? (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-4 text-sm">Weekly Schedule Preview</h3>
                      {slots.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          No slots yet. Switch to Edit mode and add slots.
                        </div>
                      ) : (
                        <WeeklyGrid slots={slots} />
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  /* Edit mode: slot editors */
                  <>
                    {slots.length === 0 ? (
                      <div
                        className="text-center py-12 border-2 border-dashed border-indigo-300 rounded-2xl bg-indigo-50/30 cursor-pointer hover:border-indigo-500 transition-colors"
                        onClick={handleAddSlot}
                      >
                        <Plus className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                        <p className="font-medium text-indigo-700">Click to add your first time slot</p>
                        <p className="text-sm text-indigo-400 mt-1">
                          Add lectures, labs, tutorials and breaks
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {slots
                          .map((slot, i) => ({ slot, i }))
                          .sort((a, b) => {
                            const dayDiff = DAYS.indexOf(a.slot.day) - DAYS.indexOf(b.slot.day);
                            if (dayDiff !== 0) return dayDiff;
                            return a.slot.startTime.localeCompare(b.slot.startTime);
                          })
                          .map(({ slot, i }) => (
                            <SlotEditor
                              key={i}
                              slot={slot}
                              index={i}
                              onChange={handleChangeSlot}
                              onRemove={handleRemoveSlot}
                            />
                          ))
                        }
                        {/* Add more slot button at bottom */}
                        <button
                          onClick={handleAddSlot}
                          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />Add Another Slot
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Quick tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1.5">Quick Tips</p>
                  <ul className="text-xs text-blue-600 space-y-0.5">
                    <li>• Add all slots then click <strong>Save Changes</strong> to persist them</li>
                    <li>• Use <strong>Preview</strong> to see the weekly grid before publishing</li>
                    <li>• Click <strong>Publish</strong> to make it visible to students</li>
                    <li>• Students see timetables based on their department, year & semester</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          departments={departments}
          onClose={() => setShowCreate(false)}
          onCreated={tt => {
            setTimetables(prev => [tt, ...prev]);
            setSelected(tt);
            setSlots([]);
          }}
        />
      )}
    </div>
  );
}
