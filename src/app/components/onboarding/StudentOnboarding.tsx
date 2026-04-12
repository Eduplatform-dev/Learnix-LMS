import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  User, GraduationCap, Users, ChevronRight, ChevronLeft,
  CheckCircle, AlertCircle, Upload, Info,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface Props {
  onComplete: () => void;
}

const STEPS = [
  { id: 1, label: "Personal Info",      icon: User },
  { id: 2, label: "Academic Info",      icon: GraduationCap },
  { id: 3, label: "Parent / Guardian",  icon: Users },
];

export function StudentOnboarding({ onComplete }: Props) {
  const [step, setStep]           = useState(1);
  const [departments, setDepts]   = useState<Department[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const photoRef                  = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    // Personal
    fullName:    "",
    dateOfBirth: "",
    gender:      "",
    bloodGroup:  "unknown",
    phoneNumber: "",
    photo:       null as File | null,
    // Address
    "address.street":  "",
    "address.city":    "",
    "address.state":   "",
    "address.pincode": "",
    // Academic
    department:    "",
    year:          "",
    division:      "",
    rollNumber:    "",
    admissionYear: String(new Date().getFullYear()),
    category:      "general",
    // Parent
    parentName:       "",
    parentPhone:      "",
    parentEmail:      "",
    parentOccupation: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_BASE_URL}/api/departments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setDepts(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Failed to load departments:", err);
        setError("Unable to load department options. Refresh the page.");
      });
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

  const validateStep = () => {
    setError("");
    if (step === 1) {
      if (!form.fullName.trim())   return setError("Full name is required"), false;
      if (!form.dateOfBirth)       return setError("Date of birth is required"), false;
      if (!form.gender)            return setError("Gender is required"), false;
    }
    if (step === 2) {
      if (!form.department)    return setError("Department is required"), false;
      if (!form.year)          return setError("Year is required"), false;
      if (!form.admissionYear) return setError("Admission year is required"), false;
    }
    if (step === 3) {
      if (!form.parentName.trim()) return setError("Parent / guardian name is required"), false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep((s) => s + 1);
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

      // FIX: endpoint matches profileRoutes.js POST /student
      const res  = await fetch(`${API_BASE_URL}/api/profiles/student`, {
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-gray-500 mt-2">
            This is a one-time form. Information cannot be changed after submission.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, idx) => {
            const Icon   = s.icon;
            const done   = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    active ? "bg-indigo-600 text-white shadow-md" :
                    done   ? "bg-green-100 text-green-700" :
                             "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-px w-6 mx-1 ${step > s.id ? "bg-green-300" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8">

            {/* ── Step 1: Personal Info ── */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>

                {/* Photo upload */}
                <div className="flex items-center gap-6 mb-6">
                  <div
                    onClick={() => photoRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-indigo-300 flex items-center justify-center cursor-pointer hover:border-indigo-500 overflow-hidden bg-indigo-50 transition-colors"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-1" />
                        <span className="text-xs text-indigo-400">Photo</span>
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
                    <Input className="mt-1" placeholder="e.g., Rahul Sharma" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
                  </div>
                  <div>
                    <Label>Date of Birth *</Label>
                    <Input className="mt-1" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
                  </div>
                  <div>
                    <Label>Gender *</Label>
                    <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label>Blood Group</Label>
                    <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>
                      {["unknown","A+","A-","B+","B-","AB+","AB-","O+","O-"].map((g) => (
                        <option key={g} value={g}>{g === "unknown" ? "Not known" : g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input className="mt-1" placeholder="e.g., 9876543210" value={form.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} />
                  </div>
                  <div>
                    <Label>Street / Area</Label>
                    <Input className="mt-1" placeholder="Street / Colony" value={form["address.street"]} onChange={(e) => set("address.street", e.target.value)} />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input className="mt-1" placeholder="City" value={form["address.city"]} onChange={(e) => set("address.city", e.target.value)} />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input className="mt-1" placeholder="State" value={form["address.state"]} onChange={(e) => set("address.state", e.target.value)} />
                  </div>
                  <div>
                    <Label>PIN Code</Label>
                    <Input className="mt-1" placeholder="PIN Code" value={form["address.pincode"]} onChange={(e) => set("address.pincode", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Academic Info ── */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Academic Information</h2>

                {/* FIX: enrollment number info banner — explains it's assigned by admin */}
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Enrollment Number</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Your enrollment number will be assigned by the administrator after your profile is verified. You do not need to enter it here.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Admission Year *</Label>
                    <Input className="mt-1" type="number" placeholder="e.g., 2022" value={form.admissionYear} onChange={(e) => set("admissionYear", e.target.value)} />
                  </div>
                  <div>
                    <Label>Department *</Label>
                    <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.department} onChange={(e) => set("department", e.target.value)}>
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                    {departments.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No departments yet — ask admin to add them</p>
                    )}
                  </div>
                  <div>
                    <Label>Year *</Label>
                    <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.year} onChange={(e) => set("year", e.target.value)}>
                      <option value="">Select year</option>
                      {[1,2,3,4,5,6].map((y) => (
                        <option key={y} value={y}>Year {y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Division / Section</Label>
                    <Input className="mt-1" placeholder="e.g., A" value={form.division} onChange={(e) => set("division", e.target.value)} />
                  </div>
                  <div>
                    <Label>Roll Number</Label>
                    <Input className="mt-1" placeholder="e.g., 42" value={form.rollNumber} onChange={(e) => set("rollNumber", e.target.value)} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.category} onChange={(e) => set("category", e.target.value)}>
                      {[
                        ["general","General"],["obc","OBC"],["sc","SC"],
                        ["st","ST"],["nt","NT"],["other","Other"],
                      ].map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Parent/Guardian ── */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Parent / Guardian Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Parent / Guardian Full Name *</Label>
                    <Input className="mt-1" placeholder="e.g., Ramesh Sharma" value={form.parentName} onChange={(e) => set("parentName", e.target.value)} />
                  </div>
                  <div>
                    <Label>Parent Phone</Label>
                    <Input className="mt-1" placeholder="e.g., 9876543210" value={form.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} />
                  </div>
                  <div>
                    <Label>Parent Email</Label>
                    <Input className="mt-1" type="email" placeholder="e.g., parent@email.com" value={form.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} />
                  </div>
                  <div>
                    <Label>Parent Occupation</Label>
                    <Input className="mt-1" placeholder="e.g., Business" value={form.parentOccupation} onChange={(e) => set("parentOccupation", e.target.value)} />
                  </div>
                </div>

                {/* Review summary */}
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 text-sm">Review before submitting</p>
                      <p className="text-amber-700 text-xs mt-1">
                        Once submitted, your profile is locked. Only an administrator can make changes.
                        Make sure all information is accurate.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick summary */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {[
                    ["Name",        form.fullName],
                    ["Year",        form.year ? `Year ${form.year}` : "—"],
                    ["Category",    form.category],
                    ["Enroll. No.", "Assigned by admin"],
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

            {/* Navigation */}
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
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleNext}>
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