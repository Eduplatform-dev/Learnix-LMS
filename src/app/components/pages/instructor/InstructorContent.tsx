import { useEffect, useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Video, Image as ImageIcon, Trash2 } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { createContent, deleteContent, getContents } from "../../../services/contentService";
import { getCourses } from "../../../services/courseService";

type ContentType = "video" | "pdf" | "image";

const typeIcon = (t: ContentType) => {
  if (t === "video") return <Video className="w-5 h-5 text-purple-600" />;
  if (t === "pdf") return <FileText className="w-5 h-5 text-red-600" />;
  return <ImageIcon className="w-5 h-5 text-blue-600" />;
};

const typeBg = (t: ContentType) => {
  if (t === "video") return "bg-purple-50";
  if (t === "pdf") return "bg-red-50";
  return "bg-blue-50";
};

export function InstructorContent() {
  const [contents, setContents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ContentType>("video");
  const [course, setCourse] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<ContentType | "all">("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [data, c] = await Promise.all([getContents(), getCourses()]);
      setContents((data || []).map((i: any) => ({ id: i._id, title: i.title, type: i.type, url: i.url, course: i.course })));
      setCourses(c || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async () => {
    if (!file || !title.trim()) { setError("Title and file are required."); return; }
    try {
      setUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("type", type);
      formData.append("file", file);
      if (course) formData.append("course", course);
      await createContent(formData);
      setTitle(""); setFile(null); setCourse(""); setShowForm(false);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this content?")) return;
    try {
      setDeletingId(id);
      await deleteContent(id);
      setContents((prev) => prev.filter((c) => c.id !== id));
    } catch { alert("Delete failed."); }
    finally { setDeletingId(null); }
  };

  const filtered = activeFilter === "all" ? contents : contents.filter((c) => c.type === activeFilter);

  const counts = {
    all: contents.length,
    video: contents.filter((c) => c.type === "video").length,
    pdf: contents.filter((c) => c.type === "pdf").length,
    image: contents.filter((c) => c.type === "image").length,
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Content Library</h1>
          <p className="text-gray-500">Upload and manage course materials</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowForm(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Content
        </Button>
      </div>

      {/* Upload Form */}
      {showForm && (
        <Card className="border-2 border-indigo-200 bg-indigo-50/30">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Upload New Content</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input className="mt-1" placeholder="e.g., Week 1 - Introduction" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Content Type</Label>
                <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={type} onChange={(e) => setType(e.target.value as ContentType)}>
                  <option value="video">Video</option>
                  <option value="pdf">PDF / Document</option>
                  <option value="image">Image</option>
                </select>
              </div>
              <div>
                <Label>Assign to Course (optional)</Label>
                <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={course} onChange={(e) => setCourse(e.target.value)}>
                  <option value="">No course</option>
                  {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <Label>File *</Label>
                <input ref={fileRef} type="file" className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <div className="flex gap-3 mt-4">
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "video", "pdf", "image"] as const).map((f) => (
          <Button key={f} size="sm" variant={activeFilter === f ? "default" : "outline"} onClick={() => setActiveFilter(f)} className="capitalize">
            {f === "all" ? `All (${counts.all})` : `${f === "pdf" ? "PDFs" : f.charAt(0).toUpperCase() + f.slice(1) + "s"} (${counts[f]})`}
          </Button>
        ))}
      </div>

      {/* Content Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Upload className="w-12 h-12 mx-auto mb-3" />
          <p>No content uploaded yet. Upload your first resource!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 ${typeBg(item.type)} rounded-lg flex items-center justify-center`}>
                    {typeIcon(item.type)}
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 -mr-1 -mt-1" onClick={() => handleDelete(item.id)}>
                    {deletingId === item.id ? "..." : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">{item.title}</p>
                <Badge variant="outline" className="text-xs capitalize mb-3">{item.type}</Badge>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 text-xs">
                    <a href={item.url} target="_blank" rel="noreferrer">Open</a>
                  </Button>
                </div>
                {/* Preview */}
                {item.type === "video" && (
                  <video src={item.url} className="w-full rounded mt-3 max-h-32 object-cover" />
                )}
                {item.type === "image" && (
                  <img src={item.url} alt={item.title} className="w-full rounded mt-3 max-h-32 object-cover" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
