// AdminFees.tsx — re-export from full original, this is the complete version
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { DollarSign, TrendingUp, Users, CreditCard, Plus, X, AlertCircle } from "lucide-react";
import { getAllFees, type Fee } from "../../../services/feeService";
import { getAuthHeader } from "../../../services/authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const statusColor  = (s: string) => s === "paid" ? "bg-green-100 text-green-700" : s === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";

export function AdminFees() {
  const [fees,       setFees]       = useState<Fee[]>([]);
  const [stats,      setStats]      = useState({ totalRevenue: 0, pendingPayments: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState({ studentId: "", description: "", amount: "", dueDate: "", category: "tuition", semester: "" });
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await getAllFees();
      setFees(data.fees);
      setStats({ totalRevenue: data.totalRevenue, pendingPayments: data.pendingPayments });
    } catch (err: any) {
      setError(err.message || "Failed to load fee data.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.studentId || !form.description || !form.amount || !form.dueDate) { setFormError("All fields required."); return; }
    setSaving(true); setFormError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/fees`, { method: "POST", headers: getAuthHeader(), body: JSON.stringify({ studentId: form.studentId, description: form.description.trim(), amount: parseFloat(form.amount), dueDate: form.dueDate, category: form.category, semester: form.semester.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setShowModal(false); setForm({ studentId: "", description: "", amount: "", dueDate: "", category: "tuition", semester: "" });
      await load();
    } catch (err: any) { setFormError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this fee record?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/fees/${id}`, { method: "DELETE", headers: getAuthHeader() });
      if (!res.ok) throw new Error("Delete failed");
      setFees((prev) => prev.filter((f) => f._id !== id));
    } catch (err: any) { setError(err.message); }
  };

  const paidStudents = [...new Set(fees.filter((f) => f.status === "paid").map((f: any) => f.student?._id || f._id))].length;
  const statCards = [
    { label: "Total Revenue",    value: `$${stats.totalRevenue.toFixed(2)}`,    icon: DollarSign,  color: "text-green-600",  bg: "bg-green-50" },
    { label: "Pending Payments", value: `$${stats.pendingPayments.toFixed(2)}`, icon: CreditCard,  color: "text-amber-600",  bg: "bg-amber-50" },
    { label: "Paid Students",    value: String(paidStudents),                    icon: Users,       color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "Total Records",    value: String(fees.length),                     icon: TrendingUp,  color: "text-purple-600", bg: "bg-purple-50" },
  ];

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Fee Management</h1><p className="text-gray-500">Track all student fee transactions</p></div>
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />Add Fee</Button>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => { const Icon = c.icon; return (
          <Card key={c.label}><CardContent className="p-5"><div className={`${c.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-3`}><Icon className={`w-6 h-6 ${c.color}`} /></div><p className="text-2xl font-bold text-gray-900">{c.value}</p><p className="text-sm text-gray-500">{c.label}</p></CardContent></Card>
        ); })}
      </div>

      <Card>
        <CardHeader><CardTitle>All Fee Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          {fees.length === 0 ? (
            <div className="p-12 text-center text-gray-400"><DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No fee records. Click "Add Fee" to create one.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b"><tr>{["Student","Description","Amount","Due Date","Status","Invoice",""].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {fees.map((fee) => (
                    <tr key={fee._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{(fee as any).student?.username || (fee as any).student?.email || "—"}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{fee.description}</td>
                      <td className="px-4 py-4 text-sm font-semibold">${fee.amount.toFixed(2)}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{new Date(fee.dueDate).toLocaleDateString()}</td>
                      <td className="px-4 py-4"><Badge className={`text-xs ${statusColor(fee.status)}`}>{fee.status}</Badge></td>
                      <td className="px-4 py-4 text-sm text-gray-400">{fee.invoice || "—"}</td>
                      <td className="px-4 py-4 text-right"><Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 text-xs" onClick={() => handleDelete(fee._id)}>Delete</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-lg">Add Fee Record</h3><Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X /></Button></div>
            <div className="space-y-3">
              <div><Label>Student ID</Label><Input className="mt-1" placeholder="MongoDB ObjectId of student" value={form.studentId} onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))} /></div>
              <div><Label>Description</Label><Input className="mt-1" placeholder="e.g., Tuition Fee - Fall 2026" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount ($)</Label><Input type="number" className="mt-1" placeholder="0.00" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></div>
                <div><Label>Due Date</Label><Input type="date" className="mt-1" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Category</Label>
                  <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                    <option value="tuition">Tuition</option><option value="lab">Lab</option><option value="technology">Technology</option><option value="certification">Certification</option><option value="other">Other</option>
                  </select>
                </div>
                <div><Label>Semester</Label><Input className="mt-1" placeholder="e.g., Fall 2026" value={form.semester} onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))} /></div>
              </div>
            </div>
            {formError && <p className="text-red-500 text-sm mt-3">{formError}</p>}
            <div className="flex justify-end gap-2 mt-5"><Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Create"}</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}