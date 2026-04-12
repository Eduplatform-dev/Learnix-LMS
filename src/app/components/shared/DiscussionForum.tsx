import { useEffect, useState, useRef } from "react";
import {
  MessageSquare, Plus, X, ThumbsUp, Pin, CheckCircle2, Eye,
  Hash, HelpCircle, Megaphone, Link2, Send, AlertCircle,
  ChevronDown, ChevronRight, MoreHorizontal, Bookmark,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

type Reply = {
  _id: string;
  author: { _id: string; username: string; role: string };
  content: string;
  likes: string[];
  isInstructor: boolean;
  createdAt: string;
};

type Discussion = {
  _id: string;
  title: string;
  content: string;
  type: string;
  author: { _id: string; username: string; role: string };
  replies: Reply[];
  likes: string[];
  isPinned: boolean;
  isResolved: boolean;
  views: number;
  tags: string[];
  createdAt: string;
};

const TYPE_META = {
  question:     { icon: HelpCircle,  label: "Question",     color: "bg-amber-100 text-amber-700" },
  discussion:   { icon: MessageSquare, label: "Discussion", color: "bg-blue-100 text-blue-700"   },
  announcement: { icon: Megaphone,   label: "Announcement", color: "bg-red-100 text-red-700"     },
  resource:     { icon: Link2,       label: "Resource",     color: "bg-green-100 text-green-700" },
};

function timeAgo(dateStr: string) {
  const d    = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-IN");
}

function DiscussionCard({
  disc,
  currentUserId,
  currentUserRole,
  onUpdate,
}: {
  disc: Discussion;
  currentUserId: string;
  currentUserRole: string;
  onUpdate: () => void;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting,setSubmitting]= useState(false);
  const meta = TYPE_META[disc.type as keyof typeof TYPE_META] || TYPE_META.discussion;
  const Icon = meta.icon;

  const toggleLike = async () => {
    await fetch(`${API_BASE_URL}/api/discussions/${disc._id}/like`, { method: "PATCH", headers: authHeader() });
    onUpdate();
  };

  const toggleResolve = async () => {
    await fetch(`${API_BASE_URL}/api/discussions/${disc._id}/resolve`, { method: "PATCH", headers: authHeader() });
    onUpdate();
  };

  const togglePin = async () => {
    await fetch(`${API_BASE_URL}/api/discussions/${disc._id}/pin`, { method: "PATCH", headers: authHeader() });
    onUpdate();
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE_URL}/api/discussions/${disc._id}/replies`, {
        method: "POST", headers: authHeader(),
        body: JSON.stringify({ content: replyText }),
      });
      setReplyText(""); onUpdate(); setExpanded(true);
    } finally { setSubmitting(false); }
  };

  const isLiked  = disc.likes.includes(currentUserId);
  const isStaff  = ["admin","instructor"].includes(currentUserRole);
  const isAuthor = disc.author._id === currentUserId;

  return (
    <Card className={`hover:shadow-md transition-shadow ${disc.isPinned ? "border-l-4 border-l-amber-400" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
              {disc.author.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {disc.isPinned && <span className="flex items-center gap-1 text-xs text-amber-600"><Pin className="w-3 h-3" />Pinned</span>}
                <Badge className={`text-xs ${meta.color}`}><Icon className="w-3 h-3 mr-1" />{meta.label}</Badge>
                {disc.isResolved && <Badge className="text-xs bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Resolved</Badge>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {isStaff && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={disc.isPinned ? "Unpin" : "Pin"} onClick={togglePin}>
                    <Pin className="w-3.5 h-3.5 text-gray-400" />
                  </Button>
                )}
                {(isAuthor || isStaff) && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={disc.isResolved ? "Unresolve" : "Mark Resolved"} onClick={toggleResolve}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${disc.isResolved ? "text-green-500" : "text-gray-400"}`} />
                  </Button>
                )}
              </div>
            </div>

            <h4 className="font-semibold text-gray-900 mt-1 leading-snug">{disc.title}</h4>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{disc.content}</p>

            {disc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {disc.tags.map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    <Hash className="w-2.5 h-2.5 inline mr-0.5" />{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span className="font-medium text-gray-600">{disc.author.username}</span>
              <span className="capitalize text-indigo-400">{disc.author.role}</span>
              <span>{timeAgo(disc.createdAt)}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{disc.views}</span>
              <Button size="sm" variant="ghost" className="h-6 px-2 gap-1 text-xs" onClick={toggleLike}>
                <ThumbsUp className={`w-3 h-3 ${isLiked ? "fill-indigo-600 text-indigo-600" : ""}`} />
                {disc.likes.length}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 gap-1 text-xs" onClick={() => setExpanded(e => !e)}>
                <MessageSquare className="w-3 h-3" />{disc.replies.length} replies
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </Button>
            </div>

            {/* Replies */}
            {expanded && (
              <div className="mt-4 space-y-3 border-t pt-3">
                {disc.replies.map(reply => (
                  <div key={reply._id} className={`flex gap-2 ${reply.isInstructor ? "bg-indigo-50 rounded-xl p-3" : ""}`}>
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarFallback className={`text-xs font-bold ${reply.isInstructor ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                        {reply.author.username.slice(0,2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-900">{reply.author.username}</span>
                        {reply.isInstructor && <Badge className="text-xs bg-indigo-600 text-white py-0 px-1.5">Instructor</Badge>}
                        <span className="text-xs text-gray-400">{timeAgo(reply.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">{reply.content}</p>
                    </div>
                  </div>
                ))}

                {/* Reply input */}
                <div className="flex gap-2 pt-1">
                  <Textarea
                    rows={2}
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value)}
                    className="flex-1 text-sm"
                    onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(); }}
                  />
                  <Button size="sm" onClick={sendReply} disabled={submitting || !replyText.trim()} className="self-end">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DiscussionForum({ courseId, lessonId }: { courseId: string; lessonId?: string }) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [showNew,     setShowNew]     = useState(false);
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [form,        setForm]        = useState({ title: "", content: "", type: "discussion", tags: "" });
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  const userData = localStorage.getItem("user");
  const currentUser = userData ? JSON.parse(userData) : {};

  const load = async () => {
    try {
      setLoading(true);
      const qs  = new URLSearchParams({ limit: "30" });
      if (lessonId)           qs.set("lesson", lessonId);
      if (typeFilter !== "all") qs.set("type", typeFilter);
      const res  = await fetch(`${API_BASE_URL}/api/discussions/course/${courseId}?${qs}`, { headers: authHeader() });
      const data = await res.json();
      setDiscussions(data.discussions || []);
      setTotal(data.total || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [courseId, lessonId, typeFilter]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) { setError("Title and content are required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/discussions`, {
        method: "POST", headers: authHeader(),
        body: JSON.stringify({
          course: courseId,
          lesson: lessonId || null,
          title: form.title,
          content: form.content,
          type: form.type,
          tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setShowNew(false);
      setForm({ title: "", content: "", type: "discussion", tags: "" });
      load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            Discussion Forum
            <Badge className="bg-indigo-100 text-indigo-700 text-xs">{total}</Badge>
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Ask questions, share resources, discuss ideas</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-1" />New Post
        </Button>
      </div>

      {/* New post modal */}
      {showNew && (
        <Card className="border-2 border-indigo-200 bg-indigo-50/30">
          <CardContent className="p-5">
            <div className="flex justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Create New Post</h4>
              <Button variant="ghost" size="icon" onClick={() => setShowNew(false)}><X /></Button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                {Object.entries(TYPE_META).map(([key, m]) => {
                  const Icon = m.icon;
                  return (
                    <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${form.type === key ? "border-indigo-500 bg-white" : "border-transparent bg-white/60"}`}>
                      <Icon className="w-3.5 h-3.5" />{m.label}
                    </button>
                  );
                })}
              </div>
              <Input placeholder="Title *" value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, title: e.target.value }))} />
              <Textarea rows={3} placeholder="Describe your question or discussion..." value={form.content} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, content: e.target.value }))} />
              <Input placeholder="Tags (comma-separated): algorithms, sorting, complexity" value={form.tags} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, tags: e.target.value }))} />
              {error && <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving}>{saving ? "Posting..." : "Post"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {[["all","All Posts"], ...Object.entries(TYPE_META).map(([k, m]) => [k, m.label])].map(([key, label]) => (
          <Button key={key} size="sm" variant={typeFilter === key ? "default" : "outline"}
            className="text-xs" onClick={() => setTypeFilter(key)}>
            {label}
          </Button>
        ))}
      </div>

      {/* Discussions */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : discussions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No discussions yet. Be the first to start one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.map(disc => (
            <DiscussionCard key={disc._id} disc={disc} currentUserId={currentUser._id}
              currentUserRole={currentUser.role} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  );
}
