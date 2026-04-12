import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import {
  User, MapPin, Users, GraduationCap, BookOpen,
  CheckCircle, AlertCircle, Save,
} from "lucide-react";
// FIX: import updated service functions with correct signatures
import { getMyProfile, updateMyProfile } from "../../../services/studentProfileService";
import { getDepartments, type Department } from "../../../services/departmentService";
import { useAuth } from "../../../providers/AuthProvider";

const BLOOD_GROUPS = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS      = ["", "male", "female", "other"];
const CATEGORIES   = ["", "general", "obc", "sc", "st", "nt", "other"];

export function StudentProfilePage() {
  const { user } = useAuth();
  const [profile,     setProfile]     = useState<any>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState("");
  const [form,        setForm]        = useState<Record<string, any>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [p, depts] = await Promise.all([
          getMyProfile(),
          getDepartments(),
        ]);
        setProfile(p);
        setForm(p ?? {});
        setDepartments(depts);
      } catch (e: any) {
        setError(e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const set = (path: string, value: any) => {
    setForm((prev) => {
      const parts = path.split(".");
      if (parts.length === 1) return { ...prev, [path]: value };
      const [top, sub] = parts;
      return { ...prev, [top]: { ...(prev[top] || {}), [sub]: value } };
    });
  };

  const handleSave = async () => {
    if (!user?._id) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      // FIX: pass userId as first argument — updateMyProfile(userId, data)
      const updated = await updateMyProfile(user._id, form);
      setProfile(updated);
      setForm(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            Update your personal and academic details.
          </p>
        </div>
        {profile?.isSubmitted && (
          <Badge className="bg-green-100 text-green-700">Profile Submitted</Badge>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle className="w-4 h-4" />
          Profile saved successfully.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <Tabs defaultValue="personal">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="personal"><User className="w-4 h-4 mr-1" />Personal</TabsTrigger>
          <TabsTrigger value="address"><MapPin className="w-4 h-4 mr-1" />Address</TabsTrigger>
          <TabsTrigger value="guardian"><Users className="w-4 h-4 mr-1" />Guardian</TabsTrigger>
          <TabsTrigger value="academic"><GraduationCap className="w-4 h-4 mr-1" />Academic</TabsTrigger>
        </TabsList>

        {/* ─── PERSONAL ──────────────────────────────────────── */}
        <TabsContent value="personal">
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Full Name</Label>
                  {/* FIX: field is 'fullName' in both model and service */}
                  <Input className="mt-1" value={form.fullName || ""}
                    onChange={(e) => set("fullName", e.target.value)} />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" className="mt-1"
                    value={form.dateOfBirth ? new Date(form.dateOfBirth).toISOString().split("T")[0] : ""}
                    onChange={(e) => set("dateOfBirth", e.target.value)} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.gender || ""}
                    onChange={(e) => set("gender", e.target.value)}>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g ? g.charAt(0).toUpperCase() + g.slice(1) : "— Select —"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Blood Group</Label>
                  <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.bloodGroup || ""}
                    onChange={(e) => set("bloodGroup", e.target.value)}>
                    {BLOOD_GROUPS.map((g) => (
                      <option key={g} value={g}>{g || "— Select —"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  {/* FIX: model field is 'phoneNumber', not 'phone' */}
                  <Label>Phone Number</Label>
                  <Input className="mt-1" value={form.phoneNumber || ""}
                    onChange={(e) => set("phoneNumber", e.target.value)} />
                </div>
                <div>
                  <Label>Category</Label>
                  <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.category || ""}
                    onChange={(e) => set("category", e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c ? c.toUpperCase() : "— Select —"}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ADDRESS ───────────────────────────────────────── */}
        <TabsContent value="address">
          <Card>
            <CardHeader><CardTitle>Address</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {/* FIX: model uses 'address.street/city/state/pincode' (single address object) */}
              <div>
                <Label>Street / House No.</Label>
                <Input className="mt-1" value={form.address?.street || ""}
                  onChange={(e) => set("address.street", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input className="mt-1" value={form.address?.city || ""}
                    onChange={(e) => set("address.city", e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input className="mt-1" value={form.address?.state || ""}
                    onChange={(e) => set("address.state", e.target.value)} />
                </div>
                <div>
                  {/* FIX: model field is 'pincode' (lowercase), not 'pinCode' */}
                  <Label>PIN Code</Label>
                  <Input className="mt-1" value={form.address?.pincode || ""}
                    onChange={(e) => set("address.pincode", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── GUARDIAN ──────────────────────────────────────── */}
        <TabsContent value="guardian">
          <Card>
            <CardHeader><CardTitle>Parent / Guardian Details</CardTitle></CardHeader>
            {/* FIX: model uses flat parentName/parentPhone/parentEmail/parentOccupation fields */}
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Parent / Guardian Name</Label>
                <Input className="mt-1" value={form.parentName || ""}
                  onChange={(e) => set("parentName", e.target.value)} />
              </div>
              <div>
                <Label>Parent Phone</Label>
                <Input className="mt-1" value={form.parentPhone || ""}
                  onChange={(e) => set("parentPhone", e.target.value)} />
              </div>
              <div>
                <Label>Parent Email</Label>
                <Input type="email" className="mt-1" value={form.parentEmail || ""}
                  onChange={(e) => set("parentEmail", e.target.value)} />
              </div>
              <div>
                <Label>Parent Occupation</Label>
                <Input className="mt-1" value={form.parentOccupation || ""}
                  onChange={(e) => set("parentOccupation", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ACADEMIC ──────────────────────────────────────── */}
        <TabsContent value="academic">
          <Card>
            <CardHeader><CardTitle>Academic Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Department</Label>
                <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.department?._id || form.department || ""}
                  onChange={(e) => set("department", e.target.value)}>
                  <option value="">— Select Department —</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Year</Label>
                <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.year || ""}
                  onChange={(e) => set("year", Number(e.target.value))}>
                  <option value="">— Select Year —</option>
                  {[1,2,3,4,5,6].map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Division</Label>
                <Input className="mt-1" value={form.division || ""}
                  onChange={(e) => set("division", e.target.value)} />
              </div>
              <div>
                <Label>Roll Number</Label>
                <Input className="mt-1" value={form.rollNumber || ""}
                  onChange={(e) => set("rollNumber", e.target.value)} />
              </div>
              <div>
                <Label>Admission Year</Label>
                <Input type="number" className="mt-1" value={form.admissionYear || ""}
                  onChange={(e) => set("admissionYear", Number(e.target.value))} />
              </div>
              <div>
                <Label>Enrollment Number</Label>
                <Input className="mt-1 bg-gray-50 cursor-not-allowed" readOnly value={form.enrollmentNumber || ""}
                  placeholder="Assigned by admin" />
                <p className="text-xs text-gray-400 mt-1">Set by administrator only</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-2">
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 gap-2 px-8"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}