import { useEffect, useState } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Play, VideoOff, Download } from "lucide-react";
import { getContents, type Content } from "../../../services/contentService";

export function Videos() {
  const [videos,  setVideos]  = useState<Content[]>([]);
  const [current, setCurrent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    getContents()
      .then((data) => {
        const onlyVideos = data.filter((c) => c.type === "video");
        setVideos(onlyVideos);
        setCurrent(onlyVideos[0] ?? null);
      })
      .catch(() => setError("Unable to load videos. Please check your connection."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <VideoOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="p-8 text-center">
        <VideoOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No videos available yet.</p>
        <p className="text-gray-400 text-sm mt-1">Check back later or ask your instructor to upload content.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Player */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="overflow-hidden border border-gray-200 shadow-sm">
          <div className="aspect-video bg-black">
            <video
              key={current._id}
              src={current.url}
              controls
              autoPlay={false}
              className="w-full h-full object-contain"
            />
          </div>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">{current.title}</h2>
                <p className="text-sm text-gray-500">Watch this lesson before moving to the next one.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button asChild variant="outline" size="sm">
                  <a href={current.url} target="_blank" rel="noreferrer">Open</a>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <a href={current.url} download>
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Playlist */}
      <div>
        <Card className="border border-gray-200 shadow-sm h-full">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">Video Library</h3>
            <p className="text-xs text-gray-500 mt-0.5">{videos.length} video{videos.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {videos.map((v, index) => {
              const isActive = v._id === current._id;
              return (
                <div
                  key={v._id}
                  onClick={() => setCurrent(v)}
                  className={`p-4 cursor-pointer border-b transition-colors ${
                    isActive
                      ? "bg-indigo-50 border-l-4 border-l-indigo-600"
                      : "hover:bg-gray-50 border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-indigo-100" : "bg-gray-100"}`}>
                      <Play className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-gray-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-indigo-700" : "text-gray-900"}`}>
                        {v.title}
                      </p>
                      <p className="text-xs text-gray-400">Lesson {index + 1}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

    </div>
  );
}