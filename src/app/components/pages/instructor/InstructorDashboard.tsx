import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { BookOpen, Users, FileText, TrendingUp, Clock, CheckCircle, Star, GraduationCap } from "lucide-react";
import { useAuth } from "../../../providers/AuthProvider";
import { getCourses } from "../../../services/courseService";
import { getAssignments } from "../../../services/assignmentService";
import { getSubmissions } from "../../../services/submissionService";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";

export function InstructorDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, a, s] = await Promise.allSettled([
          getCourses(),
          getAssignments(),
          getSubmissions(),
        ]);
        if (c.status === "fulfilled") setCourses(c.value);
        if (a.status === "fulfilled") setAssignments(a.value);
        if (s.status === "fulfilled") setSubmissions(s.value);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pendingGrading = submissions.filter((s) => s.status === "submitted").length;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;

  // FIX: count unique enrolled students across instructor's courses only
  // enrolledStudents is an array on each course
  const enrolledSet = new Set<string>();
  courses.forEach(c => {
    (c.enrolledStudents || []).forEach((sid: any) => {
      enrolledSet.add(String(sid?._id || sid));
    });
  });
  const totalStudents = enrolledSet.size;

  // Count only approved courses
  const activeCourses = courses.filter(c => c.approvalStatus === "approved" || c.status === "active");

  const stats = [
    { label: "My Courses",     value: courses.length,    icon: BookOpen,  color: "from-indigo-500 to-blue-600",  bg: "bg-indigo-50",  iconColor: "text-indigo-600"  },
    { label: "Enrolled Students", value: totalStudents,  icon: Users,     color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Assignments",    value: assignments.length, icon: FileText,  color: "from-violet-500 to-purple-600",bg: "bg-violet-50",  iconColor: "text-violet-600"  },
    { label: "Pending Review", value: pendingGrading,    icon: Clock,     color: "from-amber-500 to-orange-600", bg: "bg-amber-50",   iconColor: "text-amber-600"   },
  ];

  // Submission trend (last 7 days)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const trend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const count = submissions.filter((sub) => {
      const created = new Date(sub.createdAt);
      return created.toDateString() === d.toDateString();
    }).length;
    return { day: days[d.getDay()], submissions: count };
  });

  // Per-course enrollment data
  const courseData = courses.slice(0, 5).map((c) => ({
    name:     c.title.length > 15 ? c.title.slice(0, 13) + "…" : c.title,
    students: c.enrolledStudents?.length ?? c.students ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.username}! 👋</h1>
        <p className="text-indigo-100">
          {activeCourses.length > 0
            ? `You have ${activeCourses.length} active course${activeCourses.length !== 1 ? "s" : ""} with ${totalStudents} enrolled student${totalStudents !== 1 ? "s" : ""}.`
            : "Create your first course to get started."}
        </p>
        {pendingGrading > 0 && (
          <div className="mt-3 bg-white/20 rounded-lg px-4 py-2 inline-flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
              {pendingGrading} submission{pendingGrading !== 1 ? "s" : ""} awaiting grading
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} w-12 h-12 rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Submission Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trend.some((d) => d.submissions > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="submissions" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                No submissions this week yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Enrollment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Students per Course
            </CardTitle>
          </CardHeader>
          <CardContent>
            {courseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={courseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="students" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                No courses yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Courses needing approval */}
      {courses.filter(c => c.approvalStatus === "pending_approval").length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-amber-700 font-medium mb-3">
              <Clock className="w-4 h-4" />
              {courses.filter(c => c.approvalStatus === "pending_approval").length} course{courses.filter(c => c.approvalStatus === "pending_approval").length !== 1 ? "s" : ""} awaiting admin approval
            </div>
            {courses.filter(c => c.approvalStatus === "pending_approval").map(c => (
              <div key={c._id} className="flex items-center justify-between py-2 border-b border-amber-100 last:border-0">
                <p className="text-sm font-medium text-amber-900">{c.title}</p>
                <Badge className="bg-amber-100 text-amber-700 text-xs">Pending Approval</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Submissions to Grade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-violet-600" />
            Recent Submissions — Needs Review
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {submissions.filter((s) => s.status === "submitted").length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
              <p>All caught up! No pending submissions.</p>
            </div>
          ) : (
            <div className="divide-y">
              {submissions.filter((s) => s.status === "submitted").slice(0, 5).map((sub) => (
                <div key={sub._id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{sub.studentName}</p>
                    <p className="text-xs text-gray-500">{sub.assignmentTitle} · {sub.course}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{new Date(sub.createdAt).toLocaleDateString()}</span>
                    <Badge className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}