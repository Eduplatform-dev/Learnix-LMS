import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import {
  Upload, FileText, CheckCircle, Clock, XCircle, Eye, Trash2,
  AlertCircle, X, Download, FolderOpen, Plus
} from "lucide-react";
import {
  getMyDocuments, uploadDocument, deleteDocument,
  DOC_LABELS, type Document, type DocType, type DocStatus
} from "../../../services/documentService";

const statusConfig: Record<DocStatus, { label: string; icon: any; badge: string }> = {
  pending:  { label: "Pending Review", icon: Clock,        badge: "bg-amber-100 text-amber-700" },
  verified: { label: "Verified",       icon: CheckCircle,  badge: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected",       icon: XCircle,      badge: "bg-red-100 text-red-700" },
};

const DOC_TYPES = Object.entries(DOC_LABELS) as [DocType, string][];

function DocCard({ doc, onDelete }: { doc: Document; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const config = statusConfig[doc.status];
  const Icon   = config.icon;
  const isPdf  = doc.mimeType === "application/pdf";

  const handleDelete = async () => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    setDeleting(true);
    try { await deleteDocument(doc._id); onDelete(doc._id); }
    catch (e: any) { alert(e.message); }
    finally { setDeleting(false); }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{doc.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{DOC_LABELS[doc.type]}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge className={`text-xs ${config.badge}`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
            </div>

            {doc.rejectionNote && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-2 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span><strong>Rejected:</strong> {doc.rejectionNote}</span>
              </div>
            )}

            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-gray-400">
                {new Date(doc.createdAt).toLocaleDateString("en-IN")}
              </span>
              {doc.fileName && <span className="text-xs text-gray-400 truncate max-w-[140px]">{doc.fileName}</span>}
              <div className="ml-auto flex gap-1.5">
                <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                    <Eye className="w-3 h-3" />View
                  </a>
                </Button>
                {doc.status !== "verified" && (
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 text-xs text-red-500 hover:text-red-600"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DocumentHub() {
  const [docs,      setDocs]      = useState<Document[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState("");
  const [filter,    setFilter]    = useState<DocStatus | "all">("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", type: "other" as DocType, notes: "", expiresAt: "",
    file: null as File | null,
  });

  useEffect(() => {
    getMyDocuments().then(setDocs).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleUpload = async () => {
    if (!form.file || !form.title.trim()) { setError("Title and file are required"); return; }
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("title",   form.title.trim());
      fd.append("type",    form.type);
      fd.append("notes",   form.notes);
      fd.append("file",    form.file);
      if (form.expiresAt) fd.append("expiresAt", form.expiresAt);

      const doc = await uploadDocument(fd);
      setDocs(prev => [doc, ...prev]);
      setShowModal(false);
      setForm({ title: "", type: "other", notes: "", expiresAt: "", file: null });
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const filtered = filter === "all" ? docs : docs.filter(d => d.status === filter);
  const counts   = {
    all:      docs.length,
    pending:  docs.filter(d => d.status === "pending").length,
    verified: docs.filter(d => d.status === "verified").length,
    rejected: docs.filter(d => d.status === "rejected").length,
  };

  if (loading) return (
    <div className="flex items-center justify-center p-16">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Hub</h1>
          <p className="text-gray-500 mt-1">Upload and manage your certificates and documents</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4" />Upload
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {(["all","pending","verified","rejected"] as const).map(s => (
          <Card
            key={s}
            className={`cursor-pointer transition-all hover:shadow-sm ${filter === s ? "ring-2 ring-indigo-500" : ""}`}
            onClick={() => setFilter(s)}
          >
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${
                s === "verified" ? "text-green-600" :
                s === "rejected" ? "text-red-600"   :
                s === "pending"  ? "text-amber-600" : "text-gray-900"
              }`}>{counts[s]}</p>
              <p className="text-xs text-gray-500 capitalize">{s === "all" ? "Total" : s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen className="w-14 h-14 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {filter === "all" ? "No documents uploaded yet." : `No ${filter} documents.`}
          </p>
          {filter === "all" && (
            <p className="text-sm mt-1">Upload your certificates and documents for admin verification.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => (
            <DocCard
              key={doc._id}
              doc={doc}
              onDelete={id => setDocs(prev => prev.filter(d => d._id !== id))}
            />
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-gray-900">Upload Document</h3>
              <Button variant="ghost" size="icon" onClick={() => { setShowModal(false); setError(""); }}>
                <X />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Document Title *</Label>
                <Input className="mt-1" placeholder="e.g., Caste Certificate 2024"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <Label>Document Type</Label>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as DocType }))}
                >
                  {DOC_TYPES.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Expiry Date (optional)</Label>
                <Input type="date" className="mt-1"
                  value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input className="mt-1" placeholder="Any additional info..."
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div>
                <Label>File *</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer"
                  onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
                />
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC — max 50 MB</p>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4" />{error}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <Button variant="ghost" onClick={() => { setShowModal(false); setError(""); }}>Cancel</Button>
              <Button onClick={handleUpload} disabled={uploading} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
