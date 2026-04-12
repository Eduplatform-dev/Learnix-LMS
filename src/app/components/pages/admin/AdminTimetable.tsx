import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import {
  Plus, Trash2, Eye, EyeOff, Save, Calendar, Clock, MapPin, User, BookOpen, X
} from "lucide-react";
import {
  getTimetables, createOrUpdateTimetable, publishTimetable, deleteTimetable,
  type Timetable, type TimetableSlot, type DayOfWeek, type SlotType
} from "../../../services/timetableService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const DAYS: DayOfWeek[] = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SLOT_COLORS = ["#6366f1","#10b981","#f59e0b","#ec4899","#8b5cf6","#14b8a6","#f97316","#3b82f6","#ef4444","#84cc16"];

const TYPE_STYLES: Record<SlotType, { bg: string; text: string }> = {
  lecture:  { bg: "bg-indigo-50",  text: "text-indigo-700" },
  lab:      { bg: "bg-purple-50",  text: "text-purple-700" },
  tutorial: { bg: "bg-teal-50",    text: "text-teal-700" },
  break:    { bg: "bg-gray-100",   text: "text-gray-500" },
  free:     { bg: "bg-slate-50",   text: "text-slate-400" },
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

function SlotRow({
  slot, index, onChange, onRemove,
}: {
  slot: TimetableSlot;
  index: number;
  onChange: (i: number, updated: TimetableSlot) => void;
  onRemove: (i: number) => void;
}) {
  const set = (key: keyof TimetableSlot, val: any) =>
    onChange(index, { ...slot, [key]: val });

  const style = TYPE_STYLES[slot.type];

  return (
    <div className={`border rounded-xl p-4 ${style.bg} border-gray-200`}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Day</label>
          <select className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white" value={slot.day} onChange={e => set("day", e.target.value)}>
            {DAYS.map(d => <option key={d} value={d}>{d.slice(0,3)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Start</label>
          <input type="time" className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white" value={slot.startTime} onChange={e => set("startTime", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">End</label>
          <input type="time" className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white" value={slot.endTime} onChange={e => set("endTime", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
          <select className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white" value={slot.type} onChange={e => set("type", e.target.value)}>
            {(["lecture","lab","tutorial","break","free"] as SlotType[]).map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 md:col-span-3 lg:col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Subject</label>
          <Input
            className="bg-white"
            placeholder="Subject name"
            value={slot.subject}
            onChange={e => set("subject", e.target.value)}
            disabled={slot.type === "break" || slot.type === "free"}
          />
        </div>
      </div>

      {slot.type !== "break" && slot.type !== "free" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Subject Code</label>
            <Input className="bg-white" placeholder="CS101" value={slot.subjectCode}
              onChange={e => set("subjectCode", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Room</label>
            <Input className="bg-white" placeholder="A-201" value={slot.room}
              onChange={e => set("room", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {SLOT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  className={`w-5 h-5 rounded-full transition-transform ${slot.color === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-end justify-end">
            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 gap-1" onClick={() => onRemove(index)}>
              <Trash2 className="w-4 h-4" />Remove
            </Button>
          </div>
        </div>
      )}

      {(slot.type === "break" || slot.type === "free") && (
        <div className="flex justify-end mt-2">
          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 gap-1" onClick={() => onRemove(index)}>
            <Trash2 className="w-4 h-4" />Remove
          </Button>
        </div>
      )}
    </div>
  );
}

export function AdminTimetable() {
  const [timetables,  setTimetables]  = useState<Timetable[]>([]);
  const [selected,    setSelected]    = useState<Timetable | null>(null);
  const [slots,       setSlots]       = useState<TimetableSlot[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  // New timetable form
  const [newForm, setNewForm] = useState({
    department: "", year: "1", division: "A",
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear()+1}`,
    semester: "1",
  });
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [tt, depts] = await Promise.all([
        getTimetables(),
        fetch(`${API_BASE_URL}/api/departments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
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

  const handleSelectTimetable = (tt: Timetable) => {
    setSelected(tt);
    setSlots(tt.slots || []);
    setSaved(false);
  };

  const handleAddSlot = () => setSlots(prev => [...prev, EMPTY_SLOT() as TimetableSlot]);

  const handleChangeSlot = (i: number, updated: TimetableSlot) =>
    setSlots(prev => prev.map((s, idx) => idx === i ? updated : s));

  const handleRemoveSlot = (i: number) =>
    setSlots(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
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
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handlePublish = async (id: string, publish: boolean) => {
    try {
      const updated = await publishTimetable(id, publish);
      setTimetables(prev => prev.map(t => t._id === updated._id ? updated : t));
      if (selected?._id === id) setSelected(updated);
    } catch (e: any) { alert(e.message); }
  };

  const handleCreate = async () => {
    try {
      const tt = await createOrUpdateTimetable({
        department:   newForm.department,
        year:         Number(newForm.year),
        division:     newForm.division,
        academicYear: newForm.academicYear,
        semester:     Number(newForm.semester),
        slots:        [],
      });
      setTimetables(prev => [tt, ...prev]);
      setSelected(tt);
      setSlots([]);
      setShowCreateForm(false);
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this timetable?")) return;
    await deleteTimetable(id);
    const remaining = timetables.filter(t => t._id !== id);
    setTimetables(remaining);
    if (selected?._id === id) { setSelected(remaining[0] || null); setSlots(remaining[0]?.slots || []); }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Timetable Management</h1>
          <p className="text-gray-500">Create and publish weekly timetables for departments</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4" />New Timetable
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Timetable list */}
        <div className="lg:col-span-1">
          <div className="space-y-2">
            {timetables.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No timetables yet</div>
            ) : timetables.map(tt => {
              const dept = typeof tt.department === "object" ? tt.department?.name || "—" : "—";
              const isActive = selected?._id === tt._id;
              return (
                <div
                  key={tt._id}
                  className={`rounded-xl border p-3 cursor-pointer transition-all ${isActive ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white hover:shadow-sm"}`}
                  onClick={() => handleSelectTimetable(tt)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{dept}</p>
                      <p className="text-xs text-gray-500">Year {tt.year} Div {tt.division} · Sem {tt.semester}</p>
                      <p className="text-xs text-gray-400">{tt.academicYear}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge className={tt.isPublished ? "bg-green-100 text-green-700 text-xs" : "bg-gray-100 text-gray-500 text-xs"}>
                        {tt.isPublished ? "Published" : "Draft"}
                      </Badge>
                      <span className="text-xs text-gray-400">{tt.slots.length} slots</span>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-6 text-xs gap-1 ${tt.isPublished ? "text-amber-600" : "text-green-600"}`}
                      onClick={() => handlePublish(tt._id, !tt.isPublished)}
                    >
                      {tt.isPublished ? <><EyeOff className="w-3 h-3" />Unpublish</> : <><Eye className="w-3 h-3" />Publish</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs text-red-500"
                      onClick={() => handleDelete(tt._id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Slot editor */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select or create a timetable to edit</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {typeof selected.department === "object" ? selected.department?.name : "—"} —
                    Year {selected.year} Div {selected.division} · Sem {selected.semester}
                  </h2>
                  <p className="text-sm text-gray-500">{slots.length} time slots configured</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={handleAddSlot}>
                    <Plus className="w-4 h-4" />Add Slot
                  </Button>
                  {saved ? (
                    <Badge className="bg-green-100 text-green-700 px-3 py-1.5">✓ Saved!</Badge>
                  ) : (
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1" onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4" />{saving ? "Saving..." : "Save"}
                    </Button>
                  )}
                </div>
              </div>

              {slots.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl text-gray-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No slots yet. Click "Add Slot" to build the timetable.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {[...slots]
                    .sort((a,b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime))
                    .map((slot, i) => (
                      <SlotRow
                        key={i}
                        slot={slot}
                        index={i}
                        onChange={handleChangeSlot}
                        onRemove={handleRemoveSlot}
                      />
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create new timetable modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold">New Timetable</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateForm(false)}><X /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Department *</Label>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newForm.department}
                  onChange={e => setNewForm(f => ({ ...f, department: e.target.value }))}
                >
                  <option value="">Select department</option>
                  {departments.map((d: any) => (
                    <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Year *</Label>
                  <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={newForm.year}
                    onChange={e => setNewForm(f => ({ ...f, year: e.target.value }))}>
                    {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Division</Label>
                  <Input className="mt-1" value={newForm.division}
                    onChange={e => setNewForm(f => ({ ...f, division: e.target.value }))} />
                </div>
                <div>
                  <Label>Semester *</Label>
                  <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={newForm.semester}
                    onChange={e => setNewForm(f => ({ ...f, semester: e.target.value }))}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Academic Year *</Label>
                <Input className="mt-1" placeholder="e.g., 2025-2026" value={newForm.academicYear}
                  onChange={e => setNewForm(f => ({ ...f, academicYear: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newForm.department} className="bg-indigo-600 hover:bg-indigo-700">Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
