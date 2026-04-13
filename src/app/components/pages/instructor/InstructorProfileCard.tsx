// src/app/components/pages/instructor/InstructorProfileCard.tsx
// Read-only profile card for instructors

import { useEffect, useState } from "react";
import { useAuth } from "../../../providers/AuthProvider";
import {
  X, Briefcase, Phone, Mail, MapPin, Calendar,
  Hash, GraduationCap, Building2, Award, Clock, Star
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { Authorization: `Bearer ${t}` };
}

interface ProfileCardProps {
  onClose: () => void;
}

export function InstructorProfileCard({ onClose }: ProfileCardProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/profiles/instructor/me`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setProfile(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative h-36 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full bg-white/5" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="absolute -bottom-10 left-6">
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-emerald-100 flex items-center justify-center">
              {profile?.photo ? (
                <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-emerald-600">
                  {(profile?.fullName || user?.username || "I").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className={`absolute top-4 left-4 text-xs font-semibold px-2.5 py-1 rounded-full border ${profile?.isSubmitted ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
            {profile?.isSubmitted ? "✓ Verified" : "Pending"}
          </div>
        </div>

        <div className="pt-14 px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-2xl font-black text-gray-900 leading-tight">
                  {profile?.fullName || user?.username}
                </h2>
                <p className="text-emerald-600 font-semibold text-sm mt-0.5">
                  {profile?.designation || "Instructor"}
                </p>
                {profile?.employeeId && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Hash className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm font-mono text-gray-600">{profile.employeeId}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoTile icon={Mail} label="Email" value={user?.email} color="emerald" />
                <InfoTile icon={Phone} label="Phone" value={profile?.phoneNumber || "—"} color="emerald" />
                <InfoTile
                  icon={Building2}
                  label="Department"
                  value={profile?.department?.name || "Not set"}
                  color="emerald"
                />
                <InfoTile
                  icon={Award}
                  label="Qualification"
                  value={profile?.qualification || "—"}
                  color="emerald"
                />
                <InfoTile
                  icon={Star}
                  label="Specialization"
                  value={profile?.specialization || "—"}
                  color="emerald"
                />
                <InfoTile
                  icon={Clock}
                  label="Experience"
                  value={profile?.experienceYears ? `${profile.experienceYears} years` : "—"}
                  color="emerald"
                />
                <InfoTile
                  icon={Calendar}
                  label="Joined On"
                  value={profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString("en-IN", { year: "numeric", month: "short" }) : "—"}
                  color="emerald"
                />
                <InfoTile
                  icon={GraduationCap}
                  label="Blood Group"
                  value={profile?.bloodGroup === "unknown" ? "—" : profile?.bloodGroup || "—"}
                  color="emerald"
                />
              </div>

              {(profile?.address?.city || profile?.address?.state) && (
                <div className="mt-3 flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-600">
                    {[profile.address.street, profile.address.city, profile.address.state, profile.address.pincode]
                      .filter(Boolean).join(", ")}
                  </p>
                </div>
              )}

              {!profile?.isSubmitted && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  Profile not yet submitted. Complete your onboarding to fill in details.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value, color = "indigo" }: { icon: any; label: string; value?: string; color?: string }) {
  const iconColor = color === "emerald" ? "text-emerald-400" : "text-indigo-400";
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900 truncate">{value || "—"}</p>
    </div>
  );
}
