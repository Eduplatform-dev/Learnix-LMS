// src/app/components/IDCard.tsx
// Beautiful ID card modal for students and instructors
// Triggered by clicking the profile area in sidebar bottom-left

import { useEffect, useState, useRef } from "react";
import { useAuth } from "../providers/AuthProvider";
import { X, Download, GraduationCap, Briefcase, Hash, Building2, Calendar, Shield, QrCode } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { Authorization: `Bearer ${t}` };
}

interface IDCardProps {
  onClose: () => void;
}

export function IDCard({ onClose }: IDCardProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const isStudent    = user?.role === "student";
  const isInstructor = user?.role === "instructor";

  useEffect(() => {
    if (!user || user.role === "admin") { setLoading(false); return; }
    const endpoint = isStudent ? "/api/profiles/student/me" : "/api/profiles/instructor/me";
    fetch(`${API_BASE_URL}${endpoint}`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setProfile(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const downloadCard = () => {
    if (!cardRef.current) return;
    // Generate a printable version
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    const style = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',sans-serif; background:#fff; display:flex; justify-content:center; align-items:center; min-height:100vh; }
        .card { width:380px; }
      </style>
    `;
    printWin.document.write(`<html><head>${style}</head><body>${cardRef.current.outerHTML}</body></html>`);
    printWin.document.close();
    printWin.print();
  };

  const accent  = isStudent ? { bg: "from-indigo-700 to-indigo-900", light: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200" } :
                  isInstructor ? { bg: "from-emerald-700 to-teal-900", light: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" } :
                  { bg: "from-violet-700 to-purple-900", light: "bg-violet-50", text: "text-violet-600", border: "border-violet-200" };

  const displayName  = profile?.fullName || user?.username || "User";
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const roleLabel    = isStudent ? "Student" : isInstructor ? "Faculty" : "Administrator";
  const idNumber     = isStudent ? profile?.enrollmentNumber : profile?.employeeId;
  const department   = isStudent ? profile?.department?.name : profile?.department?.name;
  const designation  = isInstructor ? (profile?.designation || "Faculty") : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>

        {/* Card */}
        <div
          ref={cardRef}
          className="w-80 bg-white rounded-2xl shadow-2xl overflow-hidden select-none"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {/* Top colored band */}
          <div className={`bg-gradient-to-r ${accent.bg} px-5 py-4 relative overflow-hidden`}>
            {/* Geometric decoration */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute top-8 -right-2 w-12 h-12 rounded-full bg-white/5" />
            <div className="absolute -top-2 right-16 w-8 h-8 bg-white/5 rotate-45" />

            {/* Institution name */}
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center">
                  {isStudent ? (
                    <GraduationCap className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Briefcase className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <span className="text-white/90 text-xs font-bold tracking-widest uppercase">Learnix University</span>
              </div>
              <p className="text-white/50 text-[10px] tracking-wider uppercase">
                {isStudent ? "Student Identity Card" : "Faculty Identity Card"}
              </p>
            </div>
          </div>

          {/* Avatar + name section */}
          <div className="px-5 pt-5 pb-3 flex items-start gap-4">
            <div className={`w-16 h-16 rounded-xl ${accent.light} flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-white overflow-hidden`}>
              {profile?.photo ? (
                <img src={profile.photo} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className={`text-2xl font-black ${accent.text}`}>{avatarLetter}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h3 className="font-black text-gray-900 text-lg leading-tight truncate">{displayName}</h3>
              <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${accent.light} ${accent.text} mt-1`}>
                {designation || roleLabel}
              </span>
            </div>
          </div>

          {/* Info rows */}
          <div className="px-5 pb-4 space-y-2.5">
            <IDRow
              icon={Hash}
              label="ID Number"
              value={idNumber || "Not assigned"}
              mono
              accent={accent.text}
            />
            {department && (
              <IDRow icon={Building2} label="Department" value={department} accent={accent.text} />
            )}
            <IDRow icon={Shield} label="Email" value={user?.email || "—"} accent={accent.text} />
            {isStudent && profile?.year && (
              <IDRow
                icon={Calendar}
                label="Year / Division"
                value={`Year ${profile.year}${profile.division ? ` – ${profile.division}` : ""}`}
                accent={accent.text}
              />
            )}
            {isInstructor && profile?.experienceYears > 0 && (
              <IDRow
                icon={Calendar}
                label="Experience"
                value={`${profile.experienceYears} years`}
                accent={accent.text}
              />
            )}
          </div>

          {/* Bottom strip */}
          <div className={`mx-4 mb-4 rounded-xl ${accent.light} border ${accent.border} px-4 py-3 flex items-center justify-between`}>
            {/* Fake barcode */}
            <div className="flex gap-px">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`${accent.text} opacity-60`}
                  style={{ width: i % 3 === 0 ? "3px" : "1.5px", height: "28px", background: "currentColor" }}
                />
              ))}
            </div>
            <div className="text-right">
              <p className={`text-xs font-bold ${accent.text}`}>
                {isStudent ? "STUDENT" : "FACULTY"}
              </p>
              <p className="text-[10px] text-gray-400 font-mono">
                {new Date().getFullYear()}-{String(new Date().getFullYear() + 1).slice(2)}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t px-5 py-2.5 flex justify-between items-center">
            <p className="text-[10px] text-gray-400">Valid for current academic year</p>
            <p className="text-[10px] text-gray-400 font-mono">
              {user?._id?.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={downloadCard}
            className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold shadow hover:shadow-md transition-all hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Print / Save
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-white/10 text-white border border-white/20 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/20 transition-all"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function IDRow({
  icon: Icon, label, value, mono, accent
}: {
  icon: any; label: string; value: string; mono?: boolean; accent: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
      </div>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        <span className="text-xs text-gray-400 shrink-0">{label}</span>
        <span className={`text-xs font-bold text-gray-900 truncate ${mono ? "font-mono" : ""}`}>{value}</span>
      </div>
    </div>
  );
}
