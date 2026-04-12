import { useEffect, useState } from "react";
import { Award, Download, Share2, CheckCircle, BookOpen, Calendar, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

type Certificate = {
  _id: string;
  certificateId: string;
  courseName: string;
  instructorName: string;
  completionDate: string;
  grade: string;
  percentage: number | null;
  issuedAt: string;
  course: { _id: string; title: string; duration: string } | null;
};

function downloadCertificate(cert: Certificate) {
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : {};

  const completionDate = new Date(cert.completionDate).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric"
  });

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Certificate of Completion</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Lato',sans-serif; background:#fff; }
.page { width:1122px; height:793px; position:relative; background:#fff; overflow:hidden; }
.bg-border { position:absolute; inset:0; border:16px solid #1a1a2e; }
.bg-border::after { content:''; position:absolute; inset:8px; border:2px solid #c8956c; }
.gold-strip { position:absolute; top:0; left:60px; right:60px; height:8px; background:linear-gradient(90deg,transparent,#c8956c,#f5d58a,#c8956c,transparent); }
.gold-strip-b { position:absolute; bottom:0; left:60px; right:60px; height:8px; background:linear-gradient(90deg,transparent,#c8956c,#f5d58a,#c8956c,transparent); }
.corner { position:absolute; width:60px; height:60px; }
.corner svg { width:100%; height:100%; }
.tl { top:16px; left:16px; }
.tr { top:16px; right:16px; transform:scaleX(-1); }
.bl { bottom:16px; left:16px; transform:scaleY(-1); }
.br { bottom:16px; right:16px; transform:scale(-1); }
.content { position:absolute; inset:50px; display:flex; flex-direction:column; align-items:center; justify-content:space-between; text-align:center; }
.logo-area { display:flex; align-items:center; gap:12px; }
.logo-box { width:48px; height:48px; background:#1a1a2e; border-radius:10px; display:flex; align-items:center; justify-content:center; }
.logo-text { font-family:'Playfair Display',serif; font-size:22px; font-weight:900; color:#1a1a2e; letter-spacing:3px; }
.main { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; }
.cert-label { font-size:13px; letter-spacing:6px; text-transform:uppercase; color:#c8956c; font-weight:700; }
.cert-title { font-family:'Playfair Display',serif; font-size:52px; font-weight:900; color:#1a1a2e; line-height:1; }
.presents { font-size:14px; letter-spacing:3px; color:#666; text-transform:uppercase; }
.student-name { font-family:'Playfair Display',serif; font-size:42px; color:#1a1a2e; border-bottom:2px solid #c8956c; padding-bottom:8px; line-height:1.2; }
.desc { font-size:15px; color:#666; max-width:600px; line-height:1.8; }
.course-name { font-family:'Playfair Display',serif; font-size:20px; color:#1a1a2e; font-weight:700; }
.meta { display:flex; gap:48px; align-items:center; }
.meta-item { text-align:center; }
.meta-val { font-family:'Playfair Display',serif; font-size:16px; font-weight:700; color:#1a1a2e; }
.meta-lbl { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:2px; margin-top:2px; }
.sigs { display:grid; grid-template-columns:1fr auto 1fr; gap:20px; align-items:end; width:100%; padding:0 40px; }
.sig-block { text-align:center; }
.sig-line { border-top:1px solid #1a1a2e; padding-top:8px; font-size:12px; color:#666; }
.sig-name { font-family:'Playfair Display',serif; font-size:14px; color:#1a1a2e; font-weight:700; }
.seal { width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg,#1a1a2e,#2d2b50); display:flex; flex-direction:column; align-items:center; justify-content:center; }
.seal svg { width:32px; height:32px; color:white; }
.cert-id { font-size:10px; color:#aaa; letter-spacing:2px; text-align:center; }
@media print { body { -webkit-print-color-adjust:exact; } }
</style></head>
<body><div class="page">
  <div class="bg-border"></div>
  <div class="gold-strip"></div>
  <div class="gold-strip-b"></div>
  <svg class="corner tl" viewBox="0 0 60 60"><path d="M0,60 L0,0 L60,0" fill="none" stroke="#c8956c" stroke-width="2"/><path d="M8,52 L8,8 L52,8" fill="none" stroke="#c8956c" stroke-width="1" opacity="0.5"/><circle cx="8" cy="8" r="4" fill="#c8956c"/></svg>
  <svg class="corner tr" viewBox="0 0 60 60"><path d="M0,60 L0,0 L60,0" fill="none" stroke="#c8956c" stroke-width="2"/><path d="M8,52 L8,8 L52,8" fill="none" stroke="#c8956c" stroke-width="1" opacity="0.5"/><circle cx="8" cy="8" r="4" fill="#c8956c"/></svg>
  <svg class="corner bl" viewBox="0 0 60 60"><path d="M0,60 L0,0 L60,0" fill="none" stroke="#c8956c" stroke-width="2"/><path d="M8,52 L8,8 L52,8" fill="none" stroke="#c8956c" stroke-width="1" opacity="0.5"/><circle cx="8" cy="8" r="4" fill="#c8956c"/></svg>
  <svg class="corner br" viewBox="0 0 60 60"><path d="M0,60 L0,0 L60,0" fill="none" stroke="#c8956c" stroke-width="2"/><path d="M8,52 L8,8 L52,8" fill="none" stroke="#c8956c" stroke-width="1" opacity="0.5"/><circle cx="8" cy="8" r="4" fill="#c8956c"/></svg>

  <div class="content">
    <div class="logo-area">
      <div class="logo-box"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
      <div class="logo-text">LEARNIX</div>
    </div>

    <div class="main">
      <div class="cert-label">Certificate of Completion</div>
      <div class="presents">This is to certify that</div>
      <div class="student-name">${user.username || "Student"}</div>
      <div class="desc">has successfully completed the course</div>
      <div class="course-name">${cert.courseName}</div>
      ${cert.instructorName ? `<div style="font-size:13px;color:#888;">Instructed by <strong>${cert.instructorName}</strong></div>` : ""}
    </div>

    <div class="meta">
      <div class="meta-item">
        <div class="meta-val">${completionDate}</div>
        <div class="meta-lbl">Completion Date</div>
      </div>
      ${cert.grade ? `<div class="meta-item"><div class="meta-val">${cert.grade}</div><div class="meta-lbl">Final Grade</div></div>` : ""}
      ${cert.percentage != null ? `<div class="meta-item"><div class="meta-val">${cert.percentage}%</div><div class="meta-lbl">Score</div></div>` : ""}
    </div>

    <div class="sigs">
      <div class="sig-block">
        <div class="sig-name">Dr. Academic Head</div>
        <div class="sig-line">Controller of Academics</div>
      </div>
      <div style="text-align:center">
        <div class="seal">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
      </div>
      <div class="sig-block">
        <div class="sig-name">Learnix University</div>
        <div class="sig-line">Platform Director</div>
      </div>
    </div>

    <div class="cert-id">Certificate ID: ${cert.certificateId} | Issued: ${new Date(cert.issuedAt).toLocaleDateString("en-IN")}</div>
  </div>
</div></body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) win.onload = () => win.print();
  URL.revokeObjectURL(url);
}

export function StudentCertificates() {
  const [certs,   setCerts]   = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/certificates/my`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { setCerts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Certificates</h1>
        <p className="text-gray-500 mt-1">Download and share your earned certificates</p>
      </div>

      {certs.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Award className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">No certificates yet</p>
          <p className="text-gray-400 text-sm mt-1">Complete a course to earn your first certificate!</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certs.map(cert => (
            <Card key={cert._id} className="overflow-hidden hover:shadow-xl transition-all group">
              {/* Certificate preview header */}
              <div className="h-32 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 relative overflow-hidden">
                {/* Decorative */}
                <div className="absolute inset-0 opacity-10">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="absolute w-32 h-32 border border-white rounded-full"
                      style={{ top: `${i*15-30}px`, left: `${i*40-20}px`, opacity: 0.3 }} />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Award className="w-10 h-10 text-amber-400 mx-auto mb-1" />
                    <p className="text-white font-bold text-lg">Certificate of Completion</p>
                    <p className="text-indigo-300 text-xs tracking-widest uppercase">Learnix University</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              </div>

              <CardContent className="p-5">
                <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1">{cert.courseName}</h3>
                {cert.instructorName && <p className="text-sm text-gray-500 mb-3">by {cert.instructorName}</p>}

                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(cert.completionDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</span>
                  {cert.grade && <span className="font-semibold text-indigo-600">Grade: {cert.grade}</span>}
                  {cert.percentage != null && <span className="font-semibold text-green-600">{cert.percentage}%</span>}
                </div>

                <div className="flex items-center gap-1 mb-4">
                  <span className="text-xs text-gray-400">ID:</span>
                  <span className="text-xs font-mono text-gray-600">{cert.certificateId}</span>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={() => downloadCertificate(cert)}>
                    <Download className="w-4 h-4" />Download Certificate
                  </Button>
                  <Button variant="outline" size="icon" title="Copy certificate ID"
                    onClick={() => navigator.clipboard.writeText(cert.certificateId)}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
