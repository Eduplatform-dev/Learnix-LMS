import { useEffect, useState } from "react";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { BookOpen, Award, Clock, TrendingUp } from "lucide-react";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { getCourses, type Course } from "../../../services/courseService";
import { getAssignments, type Assignment } from "../../../services/assignmentService";

export function Dashboard() {
  const { user } = useCurrentUser();
  const [courses,     setCourses]     = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [courseResult, assignmentResult] = await Promise.allSettled([
          getCourses(),
          getAssignments(),
        ]);
        if (courseResult.status    === "fulfilled") setCourses(courseResult.value);
        if (assignmentResult.status === "fulfilled") setAssignments(assignmentResult.value);
        if (courseResult.status === "rejected" && assignmentResult.status === "rejected") {
          setError("Unable to load dashboard data. Please refresh.");
        }
      } catch {
        setError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  const totalCourses   = courses.length;
  const activeCourses  = courses.filter((c) => c.status !== "Completed").length;
  const completedAsgn  = assignments.filter((a) => a.status === "Submitted").length;
  const assignmentPct  = assignments.length === 0 ? 0 : Math.round((completedAsgn / assignments.length) * 100);

  const stats = [
    { label: "Total Courses",   value: String(totalCourses),   icon: BookOpen, color: "from-indigo-500 to-blue-600" },
    { label: "Active Courses",  value: String(activeCourses),  icon: Award,    color: "from-emerald-500 to-teal-600" },
    { label: "Assignments",     value: String(assignments.length), icon: Clock, color: "from-violet-500 to-purple-600" },
    { label: "Completion",      value: `${assignmentPct}%`,    icon: TrendingUp, color: "from-orange-500 to-amber-600" },
  ];

  // Upcoming assignments (not yet submitted)
  const upcoming = assignments
    .filter((a) => a.status !== "Submitted")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <Badge className="mb-3 bg-white/20 text-white border-0 text-xs">Welcome Back!</Badge>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              Hi, {user?.username || "Student"}! 👋
            </h1>
            <p className="text-white/80 text-sm">
              Continue your learning journey — {activeCourses > 0 ? `${activeCourses} course${activeCourses > 1 ? 's' : ''} in progress` : "Explore courses to get started"}
            </p>
          </div>
          <Button className="bg-white text-indigo-600 hover:bg-white/90 font-semibold shrink-0">
            Continue Learning
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`bg-gradient-to-br ${stat.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Active Courses */}
        <Card>
          <div className="px-6 pt-5 pb-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">My Active Courses</h2>
          </div>
          <CardContent className="p-0">
            {courses.filter((c) => c.status !== "Completed").length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No active courses. Explore the course catalog!</p>
              </div>
            ) : (
              <div className="divide-y">
                {courses.filter((c) => c.status !== "Completed").slice(0, 4).map((course) => (
                  <div key={course._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{course.title}</p>
                      <p className="text-xs text-gray-400">{typeof course.instructor === "string" ? course.instructor : course.instructor.username} · {course.duration}</p>
                    </div>
                    <Badge className="text-xs bg-blue-100 text-blue-700 shrink-0">Active</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Assignments */}
        <Card>
          <div className="px-6 pt-5 pb-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Upcoming Assignments</h2>
          </div>
          <CardContent className="p-0">
            {upcoming.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">All assignments submitted! 🎉</p>
              </div>
            ) : (
              <div className="divide-y">
                {upcoming.map((a) => {
                  const due      = new Date(a.dueDate);
                  const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const urgent   = daysLeft <= 2;
                  return (
                    <div key={a._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${urgent ? "bg-red-100" : "bg-amber-100"}`}>
                        <Clock className={`w-5 h-5 ${urgent ? "text-red-600" : "text-amber-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{a.title}</p>
                        <p className="text-xs text-gray-400">Due: {due.toLocaleDateString()}</p>
                      </div>
                      <Badge className={`text-xs shrink-0 ${urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {daysLeft <= 0 ? "Overdue" : `${daysLeft}d left`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}