import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  User, Briefcase, ChevronRight, ChevronLeft,
  CheckCircle, AlertCircle, Upload,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface Department {
  _id:  string;
  name: string;
  code: string;
}

interface Props {
  onComplete: () => void;
}

const STEPS = [
  { id: 1, label: "Personal Info",     icon: User },
  { id: 2, label: "Professional Info", icon: Briefcase },
];

export function InstructorOnboarding({ onComplete }: Props) {
  const [step,       setStep]       = useState(1);
  const [departments, setDepts]     = useState<Department[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const photoRef                    = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName:         "",
    dateOfBirth:      "",
    gender:           "",
    bloodGroup:       "unknown",
    phoneNumber:      "",
    photo:            null as File | null,
    "address.street":  "",
    "address.city":    "",
    "address.state":   "",
    "address.pincode": "",
    employeeId:        "",
    department:        "",
    designation:       "",
    qualification:     "",
    specialization:    "",
    experienceYears:   "0",
    joiningDate:       "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_BASE_URL}/api/departments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setDepts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const set = (k: string, v: string | File | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    set("photo", file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (): boolean => {
    setError("");
    if (step === 1) {
      if (!form.fullName.trim()) { setError("Full name is required"); return false; }
      if (!form.gender)          { setError("Gender is required");    return false; }
    }
    if (step === 2) {
      if (!form.designation.trim()) { setError("Designation is required"); return false; }
      if (!form.joiningDate)        { setError("Joining date is required"); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const fd    = new FormData();

      Object.entries(form).forEach(([k, v]) => {
        if (k === "photo") return;
        fd.append(k, String(v ?? ""));
      });
      if (form.photo) fd.append("photo", form.photo);

      const res  = await fetch(`${API_BASE_URL}/api/profiles/instructor`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      onComplete();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Briefcase className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">
            This is a one-time form. Once submitted, only your administrator can make changes.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const done   = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    active  ? "bg-emerald-600 text-white shadow-md" :
                    done    ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-px w-8 mx-1 ${step > s.id ? "bg-green-300" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8">

            {/* ── Step 1: Personal ── */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>

                {/* Photo */}
                <div className="flex items-center gap-6 mb-6">
                  <div
                    onClick={() => photoRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-300 flex items-center justify-center cursor-pointer hover:border-emerald-500 overflow-hidden bg-emerald-50 transition-colors"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                        <span className="text-xs text-emerald-400">Photo</span>
                      </div>
                    )}
                  </div>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Profile Photo</p>
                    <p className="text-xs text-gray-500 mt-1">JPG or PNG · Optional</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Full Name *</Label>
                    <Input className="mt-1" placeholder="e.g., Dr. Priya Mehta"
                      value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input className="mt-1" type="date"
                      value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
                  </div>
                  <div>
                    <Label>Gender *</Label>
                    <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label>Blood Group</Label>
                    <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>
                      {["unknown","A+","A-","B+","B-","AB+","AB-","O+","O-"].map((g) => (
                        <option key={g} value={g}>{g === "unknown" ? "Not known" : g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input className="mt-1" placeholder="e.g., 9876543210"
                      value={form.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} />
                  </div>
                  <div>
                    <Label>Street / Area</Label>
                    <Input className="mt-1" placeholder="Street / Colony"
                      value={form["address.street"]} onChange={(e) => set("address.street", e.target.value)} />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input className="mt-1" placeholder="City"
                      value={form["address.city"]} onChange={(e) => set("address.city", e.target.value)} />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input className="mt-1" placeholder="State"
                      value={form["address.state"]} onChange={(e) => set("address.state", e.target.value)} />
                  </div>
                  <div>
                    <Label>PIN Code</Label>
                    <Input className="mt-1" placeholder="PIN Code"
                      value={form["address.pincode"]} onChange={(e) => set("address.pincode", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Professional ── */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Professional Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Employee ID</Label>
                    <Input className="mt-1" placeholder="e.g., EMP2022001"
                      value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} />
                  </div>
                  <div>
                    <Label>Joining Date *</Label>
                    <Input className="mt-1" type="date"
                      value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.department} onChange={(e) => set("department", e.target.value)}>
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                    {departments.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No departments added yet — ask admin first.</p>
                    )}
                  </div>
                  <div>
                    <Label>Designation *</Label>
                    <Input className="mt-1" placeholder="e.g., Assistant Professor"
                      value={form.designation} onChange={(e) => set("designation", e.target.value)} />
                  </div>
                  <div>
                    <Label>Qualification</Label>
                    <Input className="mt-1" placeholder="e.g., M.Tech, PhD"
                      value={form.qualification} onChange={(e) => set("qualification", e.target.value)} />
                  </div>
                  <div>
                    <Label>Specialization</Label>
                    <Input className="mt-1" placeholder="e.g., Machine Learning"
                      value={form.specialization} onChange={(e) => set("specialization", e.target.value)} />
                  </div>
                  <div>
                    <Label>Years of Experience</Label>
                    <Input className="mt-1" type="number" min="0" max="50"
                      value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 text-sm">Review before submitting</p>
                      <p className="text-amber-700 text-xs mt-1">
                        Once submitted, your profile is locked. Only an administrator can make changes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  {[
                    ["Name",        form.fullName],
                    ["Designation", form.designation],
                    ["Experience",  form.experienceYears ? `${form.experienceYears} yrs` : "—"],
                    ["Joining",     form.joiningDate ? new Date(form.joiningDate).toLocaleDateString() : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{k}</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{v || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mt-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-4 border-t">
              <Button
                variant="outline"
                disabled={step === 1}
                onClick={() => { setError(""); setStep((s) => s - 1); }}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>

              {step < STEPS.length ? (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => { if (validateStep()) setStep((s) => s + 1); }}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Profile"}
                  {!submitting && <CheckCircle className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}