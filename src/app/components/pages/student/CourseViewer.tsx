import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play, FileText, Type, HelpCircle, CheckCircle, Lock, ChevronLeft,
  ChevronRight, Menu, X, Clock, BookOpen, Award, BarChart3, ArrowLeft,
  Circle, PlayCircle, RefreshCw, ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Progress } from "../../ui/progress";
import {
  getCourseLessons,
  markLessonComplete,
  type Lesson,
  type CourseProgress,
} from "../../../services/lessonService";
import { getCourseById } from "../../../services/courseService";

/* ─── Helpers ── */
const formatDuration = (seconds: number) => {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const typeIcon = (type: string) => {
  switch (type) {
    case "video": return <Play className="w-4 h-4" />;
    case "pdf":   return <FileText className="w-4 h-4" />;
    case "text":  return <Type className="w-4 h-4" />;
    case "quiz":  return <HelpCircle className="w-4 h-4" />;
    default:      return <BookOpen className="w-4 h-4" />;
  }
};

const typeColor = (type: string) => {
  switch (type) {
    case "video": return "text-blue-600 bg-blue-50";
    case "pdf":   return "text-red-600 bg-red-50";
    case "text":  return "text-green-600 bg-green-50";
    case "quiz":  return "text-purple-600 bg-purple-50";
    default:      return "text-gray-600 bg-gray-50";
  }
};

/* ─── Quiz Component ── */
function QuizPlayer({ lesson, onComplete }: { lesson: Lesson; onComplete: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleSubmit = () => {
    let correct = 0;
    lesson.quiz.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    if (correct / lesson.quiz.length >= 0.6) onComplete();
  };

  if (submitted) {
    const pct = Math.round((score / lesson.quiz.length) * 100);
    const passed = pct >= 60;
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 p-8">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold ${passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
          {pct}%
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {passed ? "🎉 Passed!" : "Try Again"}
          </p>
          <p className="text-gray-500">{score} / {lesson.quiz.length} correct</p>
        </div>
        {!passed && (
          <Button onClick={() => { setAnswers({}); setSubmitted(false); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Quiz
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900">{lesson.title}</h2>
        <p className="text-gray-500 text-sm mt-1">{lesson.quiz.length} questions · Pass score: 60%</p>
      </div>
      {lesson.quiz.map((q, qi) => (
        <div key={qi} className="space-y-3">
          <p className="font-semibold text-gray-900">
            <span className="text-indigo-600 mr-2">Q{qi + 1}.</span>
            {q.question}
          </p>
          <div className="grid gap-2">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => setAnswers(a => ({ ...a, [qi]: oi }))}
                className={`text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                  answers[qi] === oi
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                }`}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
      <Button
        className="w-full"
        disabled={Object.keys(answers).length < lesson.quiz.length}
        onClick={handleSubmit}
      >
        Submit Quiz
      </Button>
    </div>
  );
}

/* ─── PDF Viewer Component ── */
function PdfViewer({ url, title, lessonId }: { url: string; title: string; lessonId: string }) {
  const [loadFailed, setLoadFailed] = useState(false);

  return (
    <div className="bg-gray-900 flex flex-col" style={{ height: "70vh" }}>
      {!loadFailed ? (
        <>
          <iframe
            key={lessonId}
            src={url}
            className="w-full flex-1 border-0"
            title={title}
            onError={() => setLoadFailed(true)}
          />
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-gray-400">
              If the PDF doesn't display, use the button to open it.
            </span>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in new tab
            </a>
          </div>
        </>
      ) : (
        /* Fallback UI when iframe fails */
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
          <div className="w-16 h-16 bg-red-900/30 rounded-2xl flex items-center justify-center">
            <FileText className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg mb-1">Unable to display PDF inline</p>
            <p className="text-gray-400 text-sm max-w-sm">
              Your browser blocked the embedded viewer. Open the PDF directly to view it.
            </p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open PDF
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ── */
export function CourseViewer() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [completing, setCompleting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const loadData = useCallback(async () => {
    if (!courseId) return;
    try {
      const [courseData, lessonsData] = await Promise.all([
        getCourseById(courseId),
        getCourseLessons(courseId),
      ]);
      setCourse(courseData);
      setLessons(lessonsData.lessons);
      setProgress(lessonsData.progress);

      // Resume last lesson or start first
      if (lessonsData.lessons.length > 0) {
        const lastId = lessonsData.progress?.lastLessonId;
        const resume = lastId
          ? lessonsData.lessons.find(l => l._id === lastId) || lessonsData.lessons[0]
          : lessonsData.lessons[0];
        setActiveLesson(resume);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleComplete = async () => {
    if (!activeLesson || completing) return;
    if (activeLesson.completed) return;
    setCompleting(true);
    try {
      const updated = await markLessonComplete(activeLesson._id);
      setProgress(prev => ({
        ...(prev || { lastLessonId: null, completedAt: null }),
        ...updated,
      }));
      setLessons(prev =>
        prev.map(l => l._id === activeLesson._id ? { ...l, completed: true } : l)
      );
      setActiveLesson(prev => prev ? { ...prev, completed: true } : prev);
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const goToLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    const idx = lessons.findIndex(l => l._id === activeLesson?._id);
    if (idx < lessons.length - 1) goToLesson(lessons[idx + 1]);
  };

  const goPrev = () => {
    const idx = lessons.findIndex(l => l._id === activeLesson?._id);
    if (idx > 0) goToLesson(lessons[idx - 1]);
  };

  const currentIdx = lessons.findIndex(l => l._id === activeLesson?._id);
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === lessons.length - 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Course not found.
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => navigate("/dashboard/courses")}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to courses
          </button>
          <h2 className="font-semibold text-white text-sm leading-snug line-clamp-2">
            {course.title}
          </h2>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span>{progress?.completedCount || 0}/{lessons.length} lessons</span>
              <span>{progress?.percent || 0}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all"
                style={{ width: `${progress?.percent || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Lesson List */}
        <div className="flex-1 overflow-y-auto py-2">
          {lessons.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No lessons yet.
            </div>
          ) : (
            lessons.map((lesson, idx) => {
              const isActive = lesson._id === activeLesson?._id;
              return (
                <button
                  key={lesson._id}
                  onClick={() => goToLesson(lesson)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-l-2 ${
                    isActive
                      ? "bg-indigo-900/40 border-indigo-500"
                      : "border-transparent hover:bg-gray-800"
                  }`}
                >
                  {/* Status icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {lesson.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : isActive ? (
                      <PlayCircle className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug line-clamp-2 ${isActive ? "text-white" : "text-gray-300"}`}>
                      <span className="text-gray-500 mr-1">{idx + 1}.</span>
                      {lesson.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full ${typeColor(lesson.type)}`}>
                        {typeIcon(lesson.type)}
                        {lesson.type}
                      </span>
                      {lesson.duration > 0 && (
                        <span className="text-xs text-gray-500">{formatDuration(lesson.duration)}</span>
                      )}
                      {lesson.isPreview && (
                        <span className="text-xs text-amber-500 font-medium">Free</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Completion Badge */}
        {progress?.completedAt && (
          <div className="p-4 border-t border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Award className="w-4 h-4" />
              <span className="font-medium">Course Completed!</span>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(s => !s)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1 min-w-0">
            {activeLesson && (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${typeColor(activeLesson.type)}`}>
                  {typeIcon(activeLesson.type)}
                  {activeLesson.type}
                </span>
                <h1 className="text-white font-semibold text-sm truncate">
                  {activeLesson.title}
                </h1>
                {activeLesson.completed && (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-gray-400 text-sm hidden sm:block">
              {progress?.percent || 0}% complete
            </span>
            {!activeLesson?.completed && (
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={completing || activeLesson?.type === "quiz"}
                className="bg-green-600 hover:bg-green-700 text-white text-xs"
              >
                {completing ? "Marking..." : "Mark Complete"}
              </Button>
            )}
          </div>
        </div>

        {/* Lesson Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-950">
          {!activeLesson ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Select a lesson to begin</p>
              </div>
            </div>
          ) : (
            <>
              {/* VIDEO */}
              {activeLesson.type === "video" && (
                <div className="bg-black">
                  {activeLesson.contentUrl ? (
                    <video
                      ref={videoRef}
                      key={activeLesson._id}
                      src={activeLesson.contentUrl}
                      controls
                      className="w-full max-h-[70vh] object-contain"
                      onEnded={handleComplete}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <Play className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No video URL provided</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PDF — uses native browser embed, no Google proxy needed */}
              {activeLesson.type === "pdf" && (
                activeLesson.contentUrl ? (
                  <PdfViewer
                    url={activeLesson.contentUrl}
                    title={activeLesson.title}
                    lessonId={activeLesson._id}
                  />
                ) : (
                  <div className="bg-gray-900 h-[70vh] flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No PDF URL provided</p>
                    </div>
                  </div>
                )
              )}

              {/* TEXT */}
              {activeLesson.type === "text" && (
                <div className="max-w-3xl mx-auto px-6 py-8">
                  <div
                    className="prose prose-invert prose-lg max-w-none text-gray-200 leading-relaxed"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {activeLesson.textContent || (
                      <p className="text-gray-500 italic">No content provided.</p>
                    )}
                  </div>
                </div>
              )}

              {/* QUIZ */}
              {activeLesson.type === "quiz" && (
                <div className="bg-white min-h-[60vh]">
                  {activeLesson.quiz && activeLesson.quiz.length > 0 ? (
                    <QuizPlayer lesson={activeLesson} onComplete={handleComplete} />
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No quiz questions yet</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Lesson Info Panel */}
              <div className="bg-gray-900 border-t border-gray-800 p-6">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">
                        {activeLesson.title}
                      </h2>
                      {activeLesson.description && (
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {activeLesson.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {activeLesson.duration > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDuration(activeLesson.duration)}
                        </span>
                      )}
                      {activeLesson.completed && (
                        <Badge className="bg-green-900 text-green-300 border-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isFirst}
                      onClick={goPrev}
                      className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>

                    <span className="text-gray-500 text-sm">
                      {currentIdx + 1} / {lessons.length}
                    </span>

                    <Button
                      size="sm"
                      disabled={isLast}
                      onClick={goNext}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}