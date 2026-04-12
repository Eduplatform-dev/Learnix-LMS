import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import {
  FileText, CheckCircle, XCircle, Clock, Eye, Search,
  AlertCircle, X, Filter
} from "lucide-react";
import {
  getAllDocuments, verifyDocument, DOC_LABELS,
  type Document, type DocStatus, type DocType
} from "../../../services/documentService";

const STATUS_CONFIG = {
  pending:  { label: "Pending",  badge: "bg-amber-100 text-amber-700", icon: Clock },
  verified: { label: "Verified", badge: "bg-green-100 text-green-700",  icon: CheckCircle },
  rejected: { label: "Rejected", badge: "bg-red-100 text-red-700",      icon: XCircle },
};

export function AdminDocuments() {
  const [docs,          setDocs]          = useState<Document[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<DocStatus | "all">("all");
  const [typeFilter,    setTypeFilter]    = useState<DocType | "all">("all");
  const [actionDoc,     setActionDoc]     = useState<Document | null>(null);
  const [actionStatus,  setActionStatus]  = useState<DocStatus>("verified");
  const [rejNote,       setRejNote]       = useState("");
  const [acting,        setActing]        = useState(false);
  const [selectedDoc,   setSelectedDoc]   = useState<Document | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all")   params.type   = typeFilter;
      const data = await getAllDocuments(params);
      setDocs(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async () => {
    if (!actionDoc) return;
    setActing(true);
    try {
      const updated = await verifyDocument(actionDoc._id, actionStatus, rejNote);
      setDocs(prev => prev.map(d => d._id === updated._id ? updated : d));
      setActionDoc(null);
      setRejNote("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActing(false);
    }
  };

  const filtered = docs.filter(d => {
    const student = typeof d.student === "object" ? d.student : { username: "", email: "" };
    const q = search.toLowerCase();
    return !q || (student as any).username?.toLowerCase().includes(q) ||
      (student as any).email?.toLowerCase().includes(q) || d.title.toLowerCase().includes(q);
  });

  const counts = {
    all: docs.length,
    pending: docs.filter(d => d.status === "pending").length,
    verified: docs.filter(d => d.status === "verified").length,
    rejected: docs.filter(d => d.status === "rejected").length,
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Document Verification</h1>
        <p className="text-gray-500">Review and verify student-uploaded documents</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {(["all","pending","verified","rejected"] as const).map(s => {
          const Icon = s === "all" ? FileText : STATUS_CONFIG[s as DocStatus].icon;
          return (
            <Card
              key={s}
              className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === s ? "ring-2 ring-indigo-500" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  s === "pending"  ? "bg-amber-50" :
                  s === "verified" ? "bg-green-50" :
                  s === "rejected" ? "bg-red-50"   : "bg-indigo-50"
                }`}>
                  <Icon className={`w-5 h-5 ${
                    s === "pending"  ? "text-amber-600" :
                    s === "verified" ? "text-green-600" :
                    s === "rejected" ? "text-red-600"   : "text-indigo-600"
                  }`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{counts[s]}</p>
                  <p className="text-xs text-gray-500 capitalize">{s}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} className="pl-9" placeholder="Search student or document..." />
        </div>
        <select
          className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as DocType | "all")}
        >
          <option value="all">All Types</option>
          {Object.entries(DOC_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No documents found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Student","Document","Type","Uploaded","Status","Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(doc => {
                    const cfg     = STATUS_CONFIG[doc.status];
                    const Icon    = cfg.icon;
                    const student = typeof doc.student === "object" ? doc.student : { username: "—", email: "—" };
                    return (
                      <tr key={doc._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{(student as any).username}</p>
                          <p className="text-xs text-gray-400">{(student as any).email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900">{doc.title}</p>
                          {doc.rejectionNote && (
                            <p className="text-xs text-red-500 mt-0.5 truncate max-w-[160px]">{doc.rejectionNote}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{DOC_LABELS[doc.type]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(doc.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs ${cfg.badge}`}>
                            <Icon className="w-3 h-3 mr-1" />{cfg.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                              <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                                <Eye className="w-3 h-3" />View
                              </a>
                            </Button>
                            {doc.status !== "verified" && (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => { setActionDoc(doc); setActionStatus("verified"); setRejNote(""); }}
                              >
                                Verify
                              </Button>
                            )}
                            {doc.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => { setActionDoc(doc); setActionStatus("rejected"); setRejNote(""); }}
                              >
                                Reject
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action modal */}
      {actionDoc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className={`font-bold ${actionStatus === "verified" ? "text-green-700" : "text-red-700"}`}>
                {actionStatus === "verified" ? "✅ Verify Document" : "❌ Reject Document"}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setActionDoc(null)}><X /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-900">{actionDoc.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{DOC_LABELS[actionDoc.type]}</p>
              </div>
              {actionStatus === "rejected" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Rejection Reason *</label>
                  <Textarea
                    rows={3}
                    placeholder="Explain why the document is being rejected..."
                    value={rejNote}
                    onChange={e => setRejNote(e.target.value)}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setActionDoc(null)}>Cancel</Button>
                <Button
                  onClick={handleVerify}
                  disabled={acting || (actionStatus === "rejected" && !rejNote.trim())}
                  className={actionStatus === "verified" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                >
                  {acting ? "Processing..." : actionStatus === "verified" ? "Verify" : "Reject"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
