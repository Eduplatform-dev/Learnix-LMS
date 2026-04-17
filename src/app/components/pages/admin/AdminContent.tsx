// src/app/components/pages/admin/AdminContent.tsx
// FIXED: Supports PPT, DOCX, XLSX, and all file types
// Better file type detection and preview

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import {
  Upload, X, Trash2, ExternalLink, FileText, Video,
  Image as ImageIcon, FileSpreadsheet, Presentation, File,
  Search, Filter, Plus, Eye
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { Authorization: `Bearer ${t}` };
}

type ContentItem = {
  id: string;
  title: string;
  type: string;
  url: string;
  mimeType?: string;
  originalName?: string;
};

// Extended content types
const CONTENT_TYPES = [
  { value: "video",        label: "Video",       icon: Video,         accept: "video/*", color: "text-purple-600 bg-purple-50" },
  { value: "pdf",          label: "PDF",          icon: FileText,      accept: ".pdf", color: "text-red-600 bg-red-50" },
  { value: "image",        label: "Image",        icon: ImageIcon,     accept: "image/*", color: "text-blue-600 bg-blue-50" },
  { value: "pptx",         label: "PowerPoint",   icon: Presentation,  accept: ".ppt,.pptx", color: "text-orange-600 bg-orange-50" },
  { value: "docx",         label: "Word Doc",     icon: FileText,      accept: ".doc,.docx", color: "text-blue-800 bg-blue-50" },
  { value: "xlsx",         label: "Spreadsheet",  icon: FileSpreadsheet, accept: ".xls,.xlsx,.csv", color: "text-green-600 bg-green-50" },
  { value: "document",     label: "Document",     icon: File,          accept: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip", color: "text-gray-600 bg-gray-50" },
];

function getTypeInfo(type: string, url?: string) {
  const found = CONTENT_TYPES.find(t => t.value === type);
  if (found) return found;
  // Fallback by URL extension
  if (url) {
    const ext = url.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return CONTENT_TYPES.find(t => t.value === "pdf")!;
    if (["ppt","pptx"].includes(ext || "")) return CONTENT_TYPES.find(t => t.value === "pptx")!;
    if (["doc","docx"].includes(ext || "")) return CONTENT_TYPES.find(t => t.value === "docx")!;
    if (["xls","xlsx","csv"].includes(ext || "")) return CONTENT_TYPES.find(t => t.value === "xlsx")!;
    if (["mp4","webm","ogg","mov"].includes(ext || "")) return CONTENT_TYPES.find(t => t.value === "video")!;
    if (["jpg","jpeg","png","gif","webp"].includes(ext || "")) return CONTENT_TYPES.find(t => t.value === "image")!;
  }
  return CONTENT_TYPES.find(t => t.value === "document")!;
}

function FilePreview({ item }: { item: ContentItem }) {
  const typeInfo = getTypeInfo(item.type, item.url);
  const Icon = typeInfo.icon;
  const ext = item.url?.split(".").pop()?.toLowerCase() || "";

  if (item.type === "video" || ["mp4","webm","ogg"].includes(ext)) {
    return (
      <video src={item.url} controls className="w-full mt-3 rounded-xl max-h-52 object-cover bg-black" />
    );
  }
  if (item.type === "image" || ["jpg","jpeg","png","gif","webp"].includes(ext)) {
    return (
      <img src={item.url} alt={item.title} className="w-full mt-3 rounded-xl max-h-52 object-cover" />
    );
  }
  if (item.type === "pdf" || ext === "pdf") {
    return (
      <div className="mt-3 flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
        <FileText className="w-8 h-8 text-red-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-800">PDF Document</p>
          <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-red-600 hover:underline">
            Open in browser ↗
          </a>
        </div>
      </div>
    );
  }
  if (["ppt","pptx"].includes(ext) || item.type === "pptx") {
    return (
      <div className="mt-3 flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
        <Presentation className="w-8 h-8 text-orange-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-orange-800">PowerPoint Presentation</p>
          <a
            href={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(item.url)}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-orange-600 hover:underline"
          >
            Open in Office Online ↗
          </a>
        </div>
      </div>
    );
  }
  if (["doc","docx"].includes(ext) || item.type === "docx") {
    return (
      <div className="mt-3 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <FileText className="w-8 h-8 text-blue-700 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">Word Document</p>
          <a
            href={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(item.url)}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Open in Office Online ↗
          </a>
        </div>
      </div>
    );
  }
  if (["xls","xlsx","csv"].includes(ext) || item.type === "xlsx") {
    return (
      <div className="mt-3 flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
        <FileSpreadsheet className="w-8 h-8 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">Spreadsheet</p>
          <a
            href={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(item.url)}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-green-600 hover:underline"
          >
            Open in Office Online ↗
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className={`mt-3 flex items-center gap-3 p-3 rounded-xl border ${typeInfo.color} border-current/20`}>
      <Icon className="w-8 h-8 shrink-0" />
      <div>
        <p className="text-sm font-medium">{typeInfo.label}</p>
        <a href={item.url} target="_blank" rel="noreferrer" className="text-xs hover:underline">
          Download / Open ↗
        </a>
      </div>
    </div>
  );
}

export function AdminContent() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadContents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/content?limit=200`, { headers: authHeader() });
      const data = await res.json();
      const items = (Array.isArray(data) ? data : []).map((i: any) => ({
        id: i._id,
        title: i.title,
        type: i.type,
        url: i.url,
        mimeType: i.mimeType,
        originalName: i.originalName,
      }));
      setContents(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContents(); }, [loadContents]);

  const handleUpload = async () => {
    if (!file || !title.trim()) { setError("Title and file are required"); return; }
    try {
      setUploading(true); setError("");
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("type", type);
      fd.append("file", file);

      const res = await fetch(`${API_BASE_URL}/api/content`, {
        method: "POST",
        headers: authHeader() as any,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setTitle(""); setFile(null); setShowUpload(false);
      if (fileRef.current) fileRef.current.value = "";
      await loadContents();
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally { setUploading(false); }
  };

  const handleDelete = async (item: ContentItem) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      setDeletingId(item.id);
      const res = await fetch(`${API_BASE_URL}/api/content/${item.id}`, {
        method: "DELETE",
        headers: authHeader() as any,
      });
      if (!res.ok) throw new Error("Delete failed");
      setContents(prev => prev.filter(c => c.id !== item.id));
    } catch { alert("Delete failed."); }
    finally { setDeletingId(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Count by type
  const typeCounts = CONTENT_TYPES.reduce((acc, t) => {
    acc[t.value] = contents.filter(c => {
      const ext = c.url?.split(".").pop()?.toLowerCase() || "";
      if (t.value === "pptx") return c.type === "pptx" || ["ppt","pptx"].includes(ext);
      if (t.value === "docx") return c.type === "docx" || ["doc","docx"].includes(ext);
      if (t.value === "xlsx") return c.type === "xlsx" || ["xls","xlsx","csv"].includes(ext);
      return c.type === t.value;
    }).length;
    return acc;
  }, {} as Record<string, number>);

  const filteredContents = contents.filter(c => {
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase());
    const matchType = !activeType || (() => {
      const ext = c.url?.split(".").pop()?.toLowerCase() || "";
      if (activeType === "pptx") return c.type === "pptx" || ["ppt","pptx"].includes(ext);
      if (activeType === "docx") return c.type === "docx" || ["doc","docx"].includes(ext);
      if (activeType === "xlsx") return c.type === "xlsx" || ["xls","xlsx","csv"].includes(ext);
      return c.type === activeType;
    })();
    return matchSearch && matchType;
  });

  const selectedTypeInfo = CONTENT_TYPES.find(t => t.value === type);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Content Library</h1>
          <p className="text-gray-500">Upload videos, PDFs, presentations, Word docs, spreadsheets and more</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="gap-2">
          <Plus className="w-4 h-4" />Upload Content
        </Button>
      </div>

      {/* Type filter cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {CONTENT_TYPES.map(({ value, label, icon: Icon, color }) => (
          <Card
            key={value}
            className={`cursor-pointer transition-all hover:shadow-md ${activeType === value ? "ring-2 ring-indigo-500 shadow-md" : ""}`}
            onClick={() => setActiveType(activeType === value ? null : value)}
          >
            <CardContent className="p-3 text-center">
              <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mx-auto mb-1.5`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-gray-900">{typeCounts[value] || 0}</p>
              <p className="text-xs text-gray-500 leading-tight">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search content by title..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Upload Form */}
      {showUpload && (
        <Card className="border-2 border-indigo-200 bg-indigo-50/20">
          <CardContent className="p-5">
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Upload New Content</h3>
              <Button variant="ghost" size="icon" onClick={() => { setShowUpload(false); setError(""); }}><X /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input className="mt-1" placeholder="e.g., Week 3 - Data Structures Notes" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Content Type</Label>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={type}
                  onChange={e => { setType(e.target.value); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                >
                  {CONTENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <Label>File *</Label>
              <div
                className="mt-1 border-2 border-dashed border-indigo-300 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors cursor-pointer bg-white"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    {selectedTypeInfo && <selectedTypeInfo.icon className={`w-8 h-8 ${selectedTypeInfo.color}`} />}
                    <div className="text-left">
                      <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="ml-auto text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Click to browse or drop file here</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedTypeInfo
                        ? `Accepts: ${selectedTypeInfo.accept}`
                        : "PDF, DOCX, PPTX, XLSX, MP4, Images and more · Max 50MB"}
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept={selectedTypeInfo?.accept || "*/*"}
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </div>

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            <div className="flex gap-2 mt-4">
              <Button onClick={handleUpload} disabled={uploading} className="bg-indigo-600 hover:bg-indigo-700">
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button variant="outline" onClick={() => { setShowUpload(false); setError(""); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {activeType
              ? `${filteredContents.length} ${CONTENT_TYPES.find(t => t.value === activeType)?.label || ""} file${filteredContents.length !== 1 ? "s" : ""}`
              : `${filteredContents.length} total items`}
          </p>
          {activeType && (
            <Button size="sm" variant="ghost" onClick={() => setActiveType(null)} className="text-xs text-gray-500">
              Clear filter <X className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>

        {filteredContents.length === 0 ? (
          <Card><CardContent className="p-12 text-center">
            <Upload className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">
              {activeType
                ? `No ${CONTENT_TYPES.find(t => t.value === activeType)?.label || ""} content yet.`
                : "No content uploaded yet."}
            </p>
            <Button size="sm" className="mt-3" onClick={() => setShowUpload(true)}>
              <Plus className="w-4 h-4 mr-1" />Upload now
            </Button>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredContents.map(item => {
              const typeInfo = getTypeInfo(item.type, item.url);
              const Icon = typeInfo.icon;
              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-9 h-9 ${typeInfo.color} rounded-lg flex items-center justify-center shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{item.title}</p>
                          <Badge variant="outline" className="text-xs capitalize mt-0.5">{typeInfo.label}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600 shrink-0 ml-1"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? "..." : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>

                    <FilePreview item={item} />

                    <div className="flex gap-2 mt-3">
                      <Button asChild size="sm" variant="outline" className="flex-1 gap-1 text-xs">
                        <a href={item.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3 h-3" />Open / Download
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}