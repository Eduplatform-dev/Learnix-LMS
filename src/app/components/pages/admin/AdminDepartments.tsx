import { useEffect, useState, useCallback } from "react";
import { Plus, X, Edit, Trash2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

type Department = {
  _id:         string;
  name:        string;
  code:        string;
  description: string;
  isActive:    boolean;
};

export function AdminDepartments() {
  const [depts,    setDepts]    = useState<Department[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<Department | "new" | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState("");
  const [form,     setForm]     = useState({ name: "", code: "", description: "" });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_BASE_URL}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();
      setDepts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setModal("new");
    setForm({ name: "", code: "", description: "" });
    setFormErr("");
  };

  const openEdit = (d: Department) => {
    setModal(d);
    setForm({ name: d.name, code: d.code, description: d.description });
    setFormErr("");
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      return setFormErr("Name and code are required");
    }
    setSaving(true);
    setFormErr("");
    try {
      const token  = localStorage.getItem("token");
      const isEdit = typeof modal === "object" && modal !== null;
      const url    = isEdit
        ? `${API_BASE_URL}/api/departments/${(modal as Department)._id}`
        : `${API_BASE_URL}/api/departments`;

      const res  = await fetch(url, {
        method:  isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setModal(null);
      await load();
    } catch (err: any) {
      setFormErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this department? It won't be deleted permanently.")) return;
    const token = localStorage.getItem("token");
    await fetch(`${API_BASE_URL}/api/departments/${id}`, {
      method:  "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Departments</h1>
          <p className="text-gray-500">Manage academic departments</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </Button>
      </div>

      {depts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No departments yet.</p>
            <p className="text-gray-300 text-sm mt-1">
              Add departments so students and instructors can select them during onboarding.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Department
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {depts.map((d) => (
            <Card key={d._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{d.name}</p>
                      <p className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {d.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(d)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(d._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {d.description && (
                  <p className="text-sm text-gray-500 mt-3 line-clamp-2">{d.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold text-lg">
                {modal === "new" ? "Add Department" : "Edit Department"}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setModal(null)}>
                <X />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Department Name *</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g., Computer Engineering"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Short Code *</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g., CE"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                  }
                />
                <p className="text-xs text-gray-400 mt-1">
                  Uppercase abbreviation shown on student profiles
                </p>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  className="mt-1"
                  placeholder="Optional description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            {formErr && (
              <p className="text-red-500 text-sm mt-3">{formErr}</p>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : modal === "new" ? "Create" : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}