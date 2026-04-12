import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Upload, X, Trash2, ExternalLink } from "lucide-react";
import { createContent, deleteContent, getContents } from "../../../services/contentService";

type ContentType = "video" | "pdf" | "image";

export function AdminContent() {
  const [contents,    setContents]    = useState<any[]>([]);
  const [activeType,  setActiveType]  = useState<ContentType | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [showUpload,  setShowUpload]  = useState(false);
  const [title,       setTitle]       = useState("");
  const [type,        setType]        = useState<ContentType>("video");
  const [file,        setFile]        = useState<File | null>(null);
  const [error,       setError]       = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadContents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getContents();
      setContents((data || []).map((i: any) => ({ id: i._id, title: i.title, type: i.type, url: i.url })));
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
      fd.append("title", title.trim()); fd.append("type", type); fd.append("file", file);
      await createContent(fd);
      setTitle(""); setFile(null); setShowUpload(false);
      if (fileRef.current) fileRef.current.value = "";
      await loadContents();
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally { setUploading(false); }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      setDeletingId(item.id);
      await deleteContent(item.id);
      setContents((prev) => prev.filter((c) => c.id !== item.id));
    } catch { alert("Delete failed."); }
    finally { setDeletingId(null); }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  const counts = { video: contents.filter((c) => c.type === "video").length, pdf: contents.filter((c) => c.type === "pdf").length, image: contents.filter((c) => c.type === "image").length };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-semibold">Content Library</h1><p className="text-gray-500">Manage all platform content</p></div>
        <Button onClick={() => setShowUpload(true)}><Upload className="w-4 h-4 mr-2" />Upload</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[["video","Videos",counts.video],["pdf","Documents",counts.pdf],["image","Images",counts.image]].map(([key, label, count]) => (
          <Card key={key as string} className={`cursor-pointer transition-all hover:shadow-md ${activeType === key ? "ring-2 ring-indigo-500" : ""}`} onClick={() => setActiveType(activeType === key ? null : key as ContentType)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{count as number}</p>
              <p className="text-sm text-gray-500">{label as string}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload Form */}
      {showUpload && (
        <Card className="border-2 border-indigo-200">
          <CardContent className="p-5">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Upload New Content</h3><Button variant="ghost" size="icon" onClick={() => setShowUpload(false)}><X /></Button></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Title *</label><Input placeholder="e.g., Week 1 Lecture" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Type</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value as ContentType)}>
                  <option value="video">Video</option><option value="pdf">PDF</option><option value="image">Image</option>
                </select>
              </div>
            </div>
            <div className="mt-3"><label className="text-sm font-medium text-gray-700 block mb-1">File *</label>
              <input ref={fileRef} type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleUpload} disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button>
              <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content list */}
      {activeType && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 capitalize">{activeType === "pdf" ? "Documents" : `${activeType}s`}</h2>
          {contents.filter((c) => c.type === activeType).map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium text-gray-900">{c.title}</p><p className="text-xs text-gray-400 capitalize">{c.type}</p></div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline"><a href={c.url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-1" />Open</a></Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(c)} disabled={deletingId === c.id}>{deletingId === c.id ? "..." : <Trash2 className="w-4 h-4" />}</Button>
                  </div>
                </div>
                {c.type === "video" && <video src={c.url} controls className="w-full mt-3 rounded-lg max-h-48 object-cover" />}
                {c.type === "image" && <img src={c.url} alt={c.title} className="w-full mt-3 rounded-lg max-h-48 object-cover" />}
              </CardContent>
            </Card>
          ))}
          {contents.filter((c) => c.type === activeType).length === 0 && (
            <div className="text-center py-8 text-gray-400">No {activeType} content yet.</div>
          )}
        </div>
      )}
    </div>
  );
}