// src/app/components/pages/admin/ContentList.tsx

import { useEffect, useState } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { AlertCircle } from "lucide-react";
import { ImageWithFallback } from "../ImageWithFallback";
import {
  getContents,
  deleteContent,
  updateContent,
  type Content,
  type ContentType,
} from "../../../services/contentService";

type Props = {
  activeType: ContentType | null;
  activeFolder?: string | null;
};

export function ContentList({ activeType, activeFolder }: Props) {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getContents();
      setItems(data);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (!activeType) {
    return (
      <p className="text-gray-500 text-center py-8">
        Select a category above to view content.
      </p>
    );
  }

  if (loading) return <p className="text-center py-8 text-gray-500">Loading content...</p>;

  if (loadError) {
    return (
      <div className="flex items-center gap-2 text-red-500 py-4">
        <AlertCircle className="w-5 h-5" />
        <p>{loadError}</p>
      </div>
    );
  }

  const filtered = items.filter(
    (i) =>
      i.type === activeType &&
      (!activeFolder || (i as any).folder === activeFolder)
  );

  if (filtered.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        No {activeType} content available.
      </p>
    );
  }

  const handleSaveTitle = async (id: string) => {
    try {
      setSavingId(id);
      setActionError(null);
      await updateContent(id, { title: newTitle });
      setEditId(null);
      await load();
    } catch (err: any) {
      setActionError(err?.message || "Failed to update title.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (item: Content) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;

    try {
      setDeletingId(item._id);
      setActionError(null);
      await deleteContent(item._id);
      // Optimistic update
      setItems((prev) => prev.filter((c) => c._id !== item._id));
    } catch (err: any) {
      setActionError(err?.message || "Failed to delete content.");
      // Re-load to restore correct state
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{actionError}</p>
          <button className="ml-auto" onClick={() => setActionError(null)}>
            <span className="text-xs">Dismiss</span>
          </button>
        </div>
      )}

      {filtered.map((c) => (
        <Card key={c._id} className="border border-gray-200 shadow-sm">
          <CardContent className="p-4 space-y-4">
            {/* TITLE ROW */}
            {editId === c._id ? (
              <div className="flex gap-2">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="border rounded px-2 py-1 flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle(c._id);
                    if (e.key === "Escape") setEditId(null);
                  }}
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => handleSaveTitle(c._id)}
                  disabled={savingId === c._id}
                >
                  {savingId === c._id ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditId(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.title}</h3>
                  <p className="text-xs text-gray-500">
                    {c.type} {(c as any).folder ? `· ${(c as any).folder}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditId(c._id);
                      setNewTitle(c.title);
                    }}
                  >
                    Edit
                  </Button>
                  <Button asChild size="sm">
                    <a href={c.url} target="_blank" rel="noreferrer">Open</a>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(c)}
                    disabled={deletingId === c._id}
                  >
                    {deletingId === c._id ? "..." : "Delete"}
                  </Button>
                </div>
              </div>
            )}

            {/* PREVIEW */}
            {c.type === "video" && (
              <video src={c.url} controls className="w-full rounded" />
            )}

            {c.type === "image" && (
              <ImageWithFallback
                src={c.url}
                alt={c.title}
                className="w-full max-w-md rounded"
              />
            )}

            {c.type === "pdf" && (
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(c.url)}&embedded=true`}
                className="w-full h-[500px] rounded border"
                title={c.title}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
