import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, Users, Star, Search, BookOpen, PlayCircle,
  CheckCircle, Lock, Unlock, Zap, TrendingUp, Award,
  GraduationCap, DollarSign, Eye, AlertCircle, X, CreditCard,
} from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { getCourses, type Course } from "../../../services/courseService";
import { getCourseProgress } from "../../../services/lessonService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

type CourseExt = Course & {
  progressPercent: number;
  lessonCount:     number;
};

/* ── Demo Payment Modal ─────────────────────────────────── */
function PaymentModal({
  course,
  onClose,
  onSuccess,
}: {
  course: CourseExt;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: "", upi: "", note: "" });
  const [paying,  setPaying]  = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handlePay = async () => {
    if (!form.name.trim()) return setError("Please enter your full name");
    if (!form.upi.trim())  return setError("Please enter a transaction/UPI reference");
    setPaying(true);
    setError("");
    await new Promise((r) => setTimeout(r, 1500));
    setDone(true);
    setPaying(false);
  };

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Recorded!</h2>
          <p className="text-gray-500 text-sm mb-1">
            Your payment of <strong>₹{course.price}</strong> for <strong>{course.title}</strong> has been recorded.
          </p>
          <p className="text-gray-400 text-xs mb-6">This is a demo — no real transaction was processed.</p>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={onSuccess}>
            Start Learning
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-bold text-gray-900">Complete Enrollment</h3>
            <p className="text-xs text-gray-400">Demo payment — no real transaction</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{course.title}</p>
              <p className="text-xs text-gray-500">
                {typeof course.instructor === "string" ? course.instructor : (course.instructor as any)?.username}
              </p>
            </div>
            <p className="text-lg font-bold text-indigo-600 shrink-0">₹{course.price}</p>
          </div>
          <div>
            <Label>Full Name *</Label>
            <Input className="mt-1" placeholder="Your full name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>UPI ID / Transaction Reference *</Label>
            <Input className="mt-1" placeholder="e.g., user@upi or TXN123456" value={form.upi} onChange={(e) => set("upi", e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Demo mode — enter any reference number</p>
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input className="mt-1" placeholder="Any additional note" value={form.note} onChange={(e) => set("note", e.target.value)} />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
            disabled={paying}
            onClick={handlePay}
          >
            <CreditCard className="w-4 h-4" />
            {paying ? "Processing..." : `Pay ₹${course.price} & Enroll`}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Courses Page ──────────────────────────────────── */
export function Courses() {
  const navigate = useNavigate();
  const [courses,   setCourses]   = useState<CourseExt[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [filter,    setFilter]    = useState<"all" | "enrolled" | "completed" | "academic" | "private">("all");
  const [payModal,  setPayModal]  = useState<CourseExt | null>(null);

  // Get the current logged-in user's ID for enrollment checks
  const currentUserId = (() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u)._id : null;
    } catch { return null; }
  })();

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await getCourses();
        const enriched = await Promise.all(
          raw.map(async (c) => {
            try {
              const prog = await getCourseProgress(c._id);
              return { ...c, progressPercent: prog.percent, lessonCount: prog.total } as CourseExt;
            } catch {
              return { ...c, progressPercent: 0, lessonCount: 0 } as CourseExt;
            }
          })
        );
        setCourses(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const doEnroll = async (courseId: string) => {
    setEnrolling(courseId);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_BASE_URL}/api/courses/${courseId}/enroll`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrollment failed");
      // Add current user to enrolledStudents locally so UI updates immediately
      setCourses((prev) =>
        prev.map((c) =>
          c._id === courseId
            ? { ...c, enrolledStudents: [...c.enrolledStudents, currentUserId] }
            : c
        )
      );
    } catch (err: any) {
      alert(err?.message || "Enrollment failed");
    } finally {
      setEnrolling(null);
    }
  };

  const handleEnrollClick = (course: CourseExt) => {
    if (course.courseType === "private" && !course.isFree) {
      setPayModal(course);
      return;
    }
    doEnroll(course._id);
  };

  const handlePaymentSuccess = async () => {
    if (!payModal) return;
    setPayModal(null);
    await doEnroll(payModal._id);
    navigate(`/dashboard/courses/${payModal._id}`);
  };

  // FIX: isEnrolled checks if the current user's ID is in enrolledStudents array.
  // Previously this checked `c.status === "active"` which is true for ALL courses —
  // making every course appear enrolled. Now we check actual enrollment.
  const isEnrolled = (c: CourseExt): boolean => {
    if (!currentUserId) return false;
    return c.enrolledStudents.includes(currentUserId);
  };

  // A course is "completed" only if the student has finished all lessons (100%)
  const isCompleted = (c: CourseExt): boolean =>
    isEnrolled(c) && c.progressPercent === 100;

  const filtered = courses.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (typeof c.instructor === "string"
        ? c.instructor
        : (c as any).instructor?.username || ""
      ).toLowerCase().includes(search.toLowerCase());

    if (filter === "enrolled")  return matchSearch && isEnrolled(c);
    if (filter === "completed") return matchSearch && isCompleted(c);
    if (filter === "academic")  return matchSearch && c.courseType === "academic";
    if (filter === "private")   return matchSearch && c.courseType === "private";
    return matchSearch;
  });

  const stats = {
    total:     courses.length,
    enrolled:  courses.filter(isEnrolled).length,
    completed: courses.filter(isCompleted).length,
    avgProg:   courses.length
      ? Math.round(
          courses
            .filter(isEnrolled)
            .reduce((s, c) => s + c.progressPercent, 0) /
            Math.max(courses.filter(isEnrolled).length, 1)
        )
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <p className="text-gray-500 mt-1">Browse, enroll and continue learning</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total",        value: stats.total,            icon: BookOpen,   color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Enrolled",     value: stats.enrolled,         icon: Zap,        color: "text-blue-600",   bg: "bg-blue-50" },
          { label: "Completed",    value: stats.completed,        icon: Award,      color: "text-green-600",  bg: "bg-green-50" },
          { label: "Avg Progress", value: `${stats.avgProg}%`,    icon: TrendingUp, color: "text-amber-600",  bg: "bg-amber-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "enrolled", "completed", "academic", "private"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize text-xs"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No courses found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((course) => {
            const enrolled  = isEnrolled(course);
            const completed = isCompleted(course);
            const isPaid    = course.courseType === "private" && !course.isFree;
            const isAcademic = course.courseType === "academic";
            const price     = course.price ?? 0;

            return (
              <Card
                key={course._id}
                className="border border-gray-200 overflow-hidden hover:shadow-lg transition-all flex flex-col"
              >
                {/* Thumbnail */}
                <div className="relative h-44 overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600">
                  {course.image && (
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    {completed ? (
                      <Badge className="bg-green-500 text-white border-0 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />Completed
                      </Badge>
                    ) : enrolled ? (
                      <Badge className="bg-blue-500 text-white border-0 text-xs">
                        <PlayCircle className="w-3 h-3 mr-1" />Enrolled
                      </Badge>
                    ) : (
                      <Badge className="bg-white/20 text-white border-white/30 backdrop-blur text-xs">
                        {isPaid
                          ? <><DollarSign className="w-3 h-3 mr-1" />Paid</>
                          : <><Unlock className="w-3 h-3 mr-1" />Free</>}
                      </Badge>
                    )}
                    <Badge className={`text-xs border-0 ${isAcademic ? "bg-indigo-600 text-white" : "bg-purple-600 text-white"}`}>
                      {isAcademic
                        ? <><GraduationCap className="w-3 h-3 mr-1" />Academic</>
                        : "Private"}
                    </Badge>
                  </div>

                  {/* Lesson count */}
                  {course.lessonCount > 0 && (
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {course.lessonCount} lesson{course.lessonCount !== 1 ? "s" : ""}
                    </div>
                  )}

                  {/* Preview tag for unenrolled courses */}
                  {!enrolled && (
                    <div className="absolute bottom-3 left-3 bg-amber-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Eye className="w-3 h-3" />Preview available
                    </div>
                  )}

                  {/* Progress bar */}
                  {enrolled && course.progressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div
                        className="h-full bg-green-400 transition-all"
                        style={{ width: `${course.progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                <CardContent className="p-5 flex flex-col flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {typeof course.instructor === "string"
                      ? course.instructor
                      : (course as any).instructor?.username || "—"}
                  </p>

                  {/* Academic department/semester info */}
                  {isAcademic && course.department && (
                    <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-2 py-1 mb-3 w-fit">
                      <GraduationCap className="w-3 h-3" />
                      {course.department?.name || course.department} · Sem {course.semesterNumber || "—"}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />{course.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />{course.students}
                    </span>
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />{course.rating}
                    </span>
                    {isPaid && !enrolled && (
                      <span className="flex items-center gap-1 font-semibold text-indigo-600">
                        <DollarSign className="w-3.5 h-3.5" />₹{price}
                      </span>
                    )}
                  </div>

                  {/* Progress bar for enrolled */}
                  {enrolled && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>Progress</span>
                        <span className="font-medium text-gray-700">{course.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${completed ? "bg-green-500" : "bg-indigo-600"}`}
                          style={{ width: `${course.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* CTA Buttons */}
                  <div className="mt-auto space-y-2">
                    {enrolled ? (
                      /* Already enrolled — go directly to the course */
                      <Button
                        className="w-full"
                        variant={completed ? "outline" : "default"}
                        onClick={() => navigate(`/dashboard/courses/${course._id}`)}
                      >
                        {completed ? (
                          <><CheckCircle className="w-4 h-4 mr-2" />Review Course</>
                        ) : course.progressPercent > 0 ? (
                          <><PlayCircle className="w-4 h-4 mr-2" />Continue Learning</>
                        ) : (
                          <><PlayCircle className="w-4 h-4 mr-2" />Start Course</>
                        )}
                      </Button>
                    ) : (
                      /* Not enrolled — show Preview + Enroll */
                      <>
                        <Button
                          variant="outline"
                          className="w-full text-sm gap-2"
                          onClick={() => navigate(`/dashboard/courses/${course._id}`)}
                        >
                          <Eye className="w-4 h-4" />Preview Free Lessons
                        </Button>
                        <Button
                          className={`w-full gap-2 ${isPaid ? "bg-purple-600 hover:bg-purple-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
                          disabled={enrolling === course._id}
                          onClick={() => handleEnrollClick(course)}
                        >
                          {enrolling === course._id
                            ? "Enrolling..."
                            : isPaid
                              ? <><DollarSign className="w-4 h-4" />Pay ₹{price} & Enroll</>
                              : <><Unlock className="w-4 h-4" />Enroll Free</>}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Demo Payment Modal */}
      {payModal && (
        <PaymentModal
          course={payModal}
          onClose={() => setPayModal(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}