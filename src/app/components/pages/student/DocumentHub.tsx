// src/app/components/pages/student/DocumentHub.tsx — PROFESSIONAL REDESIGN
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import {
  Upload, FileText, CheckCircle, Clock, XCircle, Eye, Trash2,
  AlertCircle, X, Download, FolderOpen, Plus, Filter, Search
} from "lucide-react";
import {
  getMyDocuments, uploadDocument, deleteDocument,
  DOC_LABELS, type Document, type DocType, type DocStatus
} from "../../../services/documentService";

const statusConfig: Record<DocStatus, { label: string; icon: any; badge: string; desc: string }> = {
  pending:  { label: "Pending Review", icon: Clock,       badge: "bg-amber-100 text-amber-700", desc: "Awaiting admin verification" },
  verified: { label: "Verified",       icon: CheckCircle, badge: "bg-green-100 text-green-700", desc: "Approved and verified" },
  rejected: { label: "Rejected",       icon: XCircle,     badge: "bg-red-100 text-red-700",    desc: "Needs correction" },
};

const DOC_TYPES = Object.entries(DOC_LABELS) as [DocType, string][];

function DocCard({ doc, onDelete }: { doc: Document; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const config = statusConfig[doc.status];
  const Icon   = config.icon;

  const handleDelete = async () => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    setDeleting(true);
    try { await deleteDocument(doc._id); onDelete(doc._id); }
    catch (e: any) { alert(e.message); }
    finally { setDeleting(false); }
  };

  return (
    <Card className="hover:shadow-md transition-all border border-gray-200">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          
          {/* Document Type Icon */}
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100">
            <FileText className="w-7 h-7 text-indigo-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 truncate text-lg">{doc.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{DOC_LABELS[doc.type]}</p>
              </div>
              <Badge className={`text-xs shrink-0 ${config.badge}`}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
            </div>

            {/* Status message */}
            <p className="text-xs text-gray-600 mb-3">{config.desc}</p>

            {/* Rejection reason if rejected */}
            {doc.rejectionNote && (
              <div className="mb-3 flex items-start gap-2 text-sm bg-red-50 text-red-700 rounded-lg px-3.5 py-2.5 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Rejection Reason:</p>
                  <p className="text-sm mt-0.5">{doc.rejectionNote}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4">
              <span>📅 {new Date(doc.createdAt).toLocaleDateString("en-IN")}</span>
              {doc.fileName && <span>📄 {doc.fileName}</span>}
              {doc.expiresAt && (
                <span className={new Date(doc.expiresAt) < new Date() ? "text-red-600 font-medium" : ""}>
                  ⏰ Expires: {new Date(doc.expiresAt).toLocaleDateString("en-IN")}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <Button asChild size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2">
                <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                  <Eye className="w-4 h-4" />
                  View Document
                </a>
              </Button>
              {doc.status !== "verified" && (
                <Button
                  size="sm" 
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              )}
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
  const [search,    setSearch]    = useState("");
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

  const filtered = docs.filter(d => {
    if (filter !== "all" && d.status !== filter) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all:      docs.length,
    pending:  docs.filter(d => d.status === "pending").length,
    verified: docs.filter(d => d.status === "verified").length,
    rejected: docs.filter(d => d.status === "rejected").length,
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-16">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-600">Loading your documents...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl p-8 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Document Hub</h1>
            <p className="text-indigo-100 text-lg">Manage your official documents and certificates</p>
          </div>
          <Button 
            onClick={() => setShowModal(true)} 
            size="lg"
            className="gap-2 bg-white text-indigo-600 hover:bg-indigo-50 font-semibold"
          >
            <Upload className="w-5 h-5" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["all","pending","verified","rejected"] as const).map(s => (
          <Card
            key={s}
            className={`cursor-pointer transition-all hover:shadow-md ${filter === s ? "ring-2 ring-indigo-500 bg-indigo-50" : ""}`}
            onClick={() => setFilter(s)}
          >
            <CardContent className="p-4">
              <p className={`text-3xl font-bold mb-1 ${
                s === "verified" ? "text-green-600" :
                s === "rejected" ? "text-red-600"   :
                s === "pending"  ? "text-amber-600" : "text-indigo-600"
              }`}>{counts[s]}</p>
              <p className="text-sm text-gray-600 font-medium capitalize">{s === "all" ? "Total" : s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input 
            placeholder="Search documents by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 font-medium text-lg">
            {filter === "all" && search === "" ? "No documents uploaded yet." : "No matching documents found."}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {filter === "all" && search === "" && "Upload your certificates and official documents for admin verification."}
          </p>
          {filter === "all" && search === "" && (
            <Button 
              onClick={() => setShowModal(true)}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              Upload Your First Document
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(doc => (
            <DocCard
              key={doc._id}
              doc={doc}
              onDelete={id => setDocs(prev => prev.filter(d => d._id !== id))}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-indigo-50 to-blue-50">
              <div>
                <h3 className="font-bold text-gray-900 text-xl">Upload Document</h3>
                <p className="text-sm text-gray-600 mt-0.5">Upload your official certificates and documents</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { setShowModal(false); setError(""); }}
              >
                <X />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              <div>
                <Label className="font-semibold">Document Title *</Label>
                <Input 
                  className="mt-2" 
                  placeholder="e.g., Caste Certificate 2024"
                  value={form.title} 
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Document Type</Label>
                  <select
                    className="mt-2 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as DocType }))}
                  >
                    {DOC_TYPES.map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="font-semibold">Expiry Date (optional)</Label>
                  <Input 
                    type="date" 
                    className="mt-2"
                    value={form.expiresAt} 
                    onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} 
                  />
                </div>
              </div>

              <div>
                <Label className="font-semibold">Additional Notes (optional)</Label>
                <Input 
                  className="mt-2" 
                  placeholder="Any relevant details about this document..."
                  value={form.notes} 
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} 
                />
              </div>

              <div>
                <Label className="font-semibold mb-2 block">File Upload *</Label>
                <div className="border-2 border-dashed border-indigo-300 rounded-lg p-6 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.pptx"
                    className="w-full"
                    onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    {form.file ? `✓ ${form.file.name}` : "PDF, JPG, PNG, DOC, DOCX, XLSX, PPTX — max 50 MB"}
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3 border border-red-200">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-5 border-t bg-gray-50">
              <Button 
                variant="outline" 
                onClick={() => { setShowModal(false); setError(""); }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={uploading} 
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
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