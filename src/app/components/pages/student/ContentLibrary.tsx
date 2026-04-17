import { useEffect, useState, useMemo } from "react";
import {
  Search, BookOpen, FileText, Video, Image, File,
  Download, ExternalLink, Clock, ChevronRight, Filter,
  GraduationCap, Lock, Play, Eye, Layers, X, Tag,
  FolderOpen, SortAsc, Star, AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { getCourses } from "../../../services/courseService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { Authorization: `Bearer ${t}` };
}

type ContentItem = {
  _id: string;
  title: string;
  type: "video" | "document" | "image" | "pdf" | "file" | string;
  url?: string;
  fileUrl?: string;
  description?: string;
  course?: { _id: string; title: string } | string | null;
  lesson?: { _id: string; title: string } | string | null;
  createdAt: string;
  size?: number;
  duration?: number;
  tags?: string[];
  uploadedBy?: { username: string } | string;
};

type CourseGroup = {
  courseId: string;
  courseTitle: string;
  items: ContentItem[];
};

// ── Content type helpers ──────────────────────────────────────────────────────
function getContentIcon(type: string) {
  if (type === "video") return Video;
  if (type === "pdf" || type === "document") return FileText;
  if (type === "image") return Image;
  return File;
}

function getContentColor(type: string) {
  if (type === "video") return "text-red-600 bg-red-50 border-red-200";
  if (type === "pdf") return "text-rose-600 bg-rose-50 border-rose-200";
  if (type === "document") return "text-blue-600 bg-blue-50 border-blue-200";
  if (type === "image") return "text-green-600 bg-green-50 border-green-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
}

function getTypeLabel(type: string) {
  if (type === "video") return "Video";
  if (type === "pdf") return "PDF";
  if (type === "document") return "Document";
  if (type === "image") return "Image";
  return "File";
}

function formatSize(bytes?: number) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(secs?: number) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Content Card ──────────────────────────────────────────────────────────────
function ContentCard({ item }: { item: ContentItem }) {
  const Icon = getContentIcon(item.type);
  const colorClass = getContentColor(item.type);
  const url = item.url || item.fileUrl;
  const courseTitle =
    typeof item.course === "object" && item.course !== null
      ? item.course.title
      : null;

  return (
    <Card className="border border-gray-200 hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col">
      <CardContent className="p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
              {item.title}
            </h3>
            {courseTitle && (
              <p className="text-xs text-indigo-600 mt-0.5 truncate flex items-center gap-1">
                <BookOpen className="w-3 h-3 flex-shrink-0" />
                {courseTitle}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(item.createdAt)}
          </span>
          {formatSize(item.size) && (
            <span>{formatSize(item.size)}</span>
          )}
          {formatDuration(item.duration) && (
            <span className="flex items-center gap-1">
              <Play className="w-3 h-3" />
              {formatDuration(item.duration)}
            </span>
          )}
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action */}
        <div className="mt-auto">
          {url ? (
            <a
              href={url.startsWith("http") ? url : `${API_BASE_URL}${url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2 transition-colors"
            >
              {item.type === "video" ? (
                <><Play className="w-3.5 h-3.5" />Watch</>
              ) : item.type === "image" ? (
                <><Eye className="w-3.5 h-3.5" />View</>
              ) : (
                <><Download className="w-3.5 h-3.5" />Open / Download</>
              )}
            </a>
          ) : (
            <div className="text-xs text-gray-400 italic text-center py-1">No file attached</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function ContentLibrary() {
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [viewMode, setViewMode] = useState<"grouped" | "grid">("grouped");

  // Fetch enrolled courses + all content
  useEffect(() => {
    const load = async () => {
      try {
        const [courses, contentRes] = await Promise.all([
          getCourses(),
          fetch(`${API_BASE_URL}/api/content`, { headers: authHeader() }),
        ]);

        const currentUserId = (() => {
          try {
            const u = localStorage.getItem("user");
            return u ? JSON.parse(u)._id : null;
          } catch { return null; }
        })();

        // Only enrolled courses
        const enrolled = (courses || []).filter(
          (c: any) => currentUserId && c.enrolledStudents?.includes(currentUserId)
        );
        setEnrolledCourses(enrolled);

        if (contentRes.ok) {
          const raw = await contentRes.json();
          const items: ContentItem[] = Array.isArray(raw) ? raw : (raw.content || raw.items || []);
          setAllContent(items);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Get enrolled course IDs for filtering
  const enrolledCourseIds = useMemo(
    () => new Set(enrolledCourses.map((c: any) => c._id)),
    [enrolledCourses]
  );

  // Filter: show content linked to enrolled courses OR unlinked general content
  const relevantContent = useMemo(() => {
    return allContent.filter(item => {
      const courseId =
        typeof item.course === "object" && item.course !== null
          ? item.course._id
          : typeof item.course === "string"
          ? item.course
          : null;
      // Show if linked to an enrolled course, or not linked to any course (general)
      return !courseId || enrolledCourseIds.has(courseId);
    });
  }, [allContent, enrolledCourseIds]);

  // Apply search + type + course filters
  const filtered = useMemo(() => {
    return relevantContent.filter(item => {
      const matchSearch =
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));

      const matchType = typeFilter === "all" || item.type === typeFilter;

      const courseId =
        typeof item.course === "object" && item.course !== null
          ? item.course._id
          : item.course;
      const matchCourse =
        courseFilter === "all" ||
        (courseFilter === "general" && !courseId) ||
        courseId === courseFilter;

      return matchSearch && matchType && matchCourse;
    });
  }, [relevantContent, search, typeFilter, courseFilter]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return a.title.localeCompare(b.title);
    });
  }, [filtered, sortBy]);

  // Group by course for grouped view
  const grouped = useMemo((): CourseGroup[] => {
    const map: Record<string, ContentItem[]> = {};
    const general: ContentItem[] = [];

    sorted.forEach(item => {
      const courseId =
        typeof item.course === "object" && item.course !== null
          ? item.course._id
          : item.course;
      if (courseId) {
        if (!map[courseId]) map[courseId] = [];
        map[courseId].push(item);
      } else {
        general.push(item);
      }
    });

    const groups: CourseGroup[] = [];

    // Add enrolled courses in order
    enrolledCourses.forEach((c: any) => {
      if (map[c._id]) {
        groups.push({ courseId: c._id, courseTitle: c.title, items: map[c._id] });
      }
    });

    // Add general content
    if (general.length > 0) {
      groups.push({ courseId: "general", courseTitle: "General Resources", items: general });
    }

    return groups;
  }, [sorted, enrolledCourses]);

  // Stats
  const stats = useMemo(() => {
    const byType = relevantContent.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});
    return { total: relevantContent.length, byType };
  }, [relevantContent]);

  const contentTypes = useMemo(() => {
    const types = new Set(relevantContent.map(c => c.type));
    return Array.from(types);
  }, [relevantContent]);

  if (loading) return (
    <div className="flex items-center justify-center p-16">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
          <p className="text-gray-500 mt-1">
            Learning materials for your {enrolledCourses.length} enrolled course{enrolledCourses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === "grouped" ? "default" : "outline"}
            onClick={() => setViewMode("grouped")}
            className="text-xs gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />By Course
          </Button>
          <Button
            size="sm"
            variant={viewMode === "grid" ? "default" : "outline"}
            onClick={() => setViewMode("grid")}
            className="text-xs gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5" />All Items
          </Button>
        </div>
      </div>

      {/* Stats pills */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full font-medium">
          <Layers className="w-3.5 h-3.5" />
          {stats.total} total items
        </span>
        {Object.entries(stats.byType).map(([type, count]) => {
          const Icon = getContentIcon(type);
          const colorClass = getContentColor(type);
          return (
            <span key={type} className={`inline-flex items-center gap-1 text-xs border px-2.5 py-1 rounded-full font-medium ${colorClass}`}>
              <Icon className="w-3 h-3" />
              {count} {getTypeLabel(type)}
            </span>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, description or tag..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="all">All Types</option>
            {contentTypes.map(t => (
              <option key={t} value={t}>{getTypeLabel(t)}</option>
            ))}
          </select>
          <select
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="all">All Courses</option>
            <option value="general">General Resources</option>
            {enrolledCourses.map((c: any) => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="border rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">A → Z</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FolderOpen className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-gray-500 text-lg">No content found</p>
          {search ? (
            <p className="text-sm mt-1">Try a different search term.</p>
          ) : enrolledCourses.length === 0 ? (
            <p className="text-sm mt-1">Enroll in courses to access their learning materials.</p>
          ) : (
            <p className="text-sm mt-1">Your instructors haven't uploaded content for your courses yet.</p>
          )}
        </div>
      ) : viewMode === "grouped" ? (
        /* Grouped by Course */
        <div className="space-y-8">
          {grouped.map(group => (
            <div key={group.courseId}>
              {/* Course heading */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${group.courseId === "general" ? "bg-gray-100" : "bg-indigo-100"}`}>
                  {group.courseId === "general"
                    ? <FolderOpen className="w-4 h-4 text-gray-600" />
                    : <GraduationCap className="w-4 h-4 text-indigo-600" />}
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-gray-900">{group.courseTitle}</h2>
                  <p className="text-xs text-gray-400">{group.items.length} item{group.items.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="h-px flex-1 bg-gray-200 max-w-xs" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.items.map(item => (
                  <ContentCard key={item._id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map(item => (
            <ContentCard key={item._id} item={item} />
          ))}
        </div>
      )}

      {/* No enrolled courses callout */}
      {enrolledCourses.length === 0 && allContent.length === 0 && !loading && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">No enrolled courses</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Enroll in courses to see their content here. Head to the Courses page to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}