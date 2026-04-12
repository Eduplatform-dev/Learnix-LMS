import { useEffect, useState } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { FileText, Image as ImageIcon, FolderOpen, ExternalLink } from "lucide-react";
import { getContents, type Content, type ContentType } from "../../../services/contentService";
import { ImageWithFallback } from "../ImageWithFallback";

type Category = "pdf" | "image" | null;

export function ContentLibrary() {
  const [items,           setItems]           = useState<Content[]>([]);
  const [activeCategory,  setActiveCategory]  = useState<Category>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");

  useEffect(() => {
    getContents()
      .then((data) => setItems(data.filter((c) => c.type === "pdf" || c.type === "image")))
      .catch(() => setError("Unable to load resources."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pdfs   = items.filter((i) => i.type === "pdf");
  const images = items.filter((i) => i.type === "image");

  const categories = [
    { key: "pdf" as Category,   label: "Documents",  icon: FileText,   count: pdfs.length,   color: "text-red-600",   bg: "bg-red-50" },
    { key: "image" as Category, label: "Images",     icon: ImageIcon,  count: images.length, color: "text-blue-600",  bg: "bg-blue-50" },
  ];

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Learning Resources</h1>
        <p className="text-gray-500">Course documents, study materials and images</p>
      </div>

      {error && <p className="text-red-500 bg-red-50 rounded-lg px-4 py-3 text-sm">{error}</p>}

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map(({ key, label, icon: Icon, count, color, bg }) => (
          <Card
            key={key}
            onClick={() => setActiveCategory(activeCategory === key ? null : key)}
            className={`cursor-pointer transition-all hover:shadow-md ${activeCategory === key ? "ring-2 ring-indigo-500" : ""}`}
          >
            <CardContent className="p-6 text-center">
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="opacity-50 cursor-not-allowed">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <FolderOpen className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-300">—</p>
            <p className="text-sm text-gray-400">Folders (soon)</p>
          </CardContent>
        </Card>
      </div>

      {/* Content list */}
      {activeCategory && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {activeCategory === "pdf" ? "Documents" : "Images"}
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({activeCategory === "pdf" ? pdfs.length : images.length} items)
            </span>
          </h2>

          {items.filter((i) => i.type === activeCategory).length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">No {activeCategory === "pdf" ? "documents" : "images"} uploaded yet.</p>
            </div>
          ) : (
            items.filter((i) => i.type === activeCategory).map((item) => (
              <Card key={item._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <a href={item.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                      </a>
                    </Button>
                  </div>

                  {item.type === "pdf" && (
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(item.url)}&embedded=true`}
                      className="w-full h-[480px] rounded border border-gray-100"
                      title={item.title}
                    />
                  )}

                  {item.type === "image" && (
                    <ImageWithFallback
                      src={item.url}
                      alt={item.title}
                      className="w-full max-w-lg rounded-lg border border-gray-100"
                    />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}