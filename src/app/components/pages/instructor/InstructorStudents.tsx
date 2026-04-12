import { useEffect, useState } from "react";
import { Users, Search, Mail, BookOpen, TrendingUp } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import { getCourses } from "../../../services/courseService";
import { getSubmissions } from "../../../services/submissionService";

export function InstructorStudents() {
  const [courses, setCourses] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [c, s] = await Promise.all([getCourses(), getSubmissions()]);
        setCourses(c || []);
        setSubmissions(s || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Build unique students from submissions
  const studentMap = new Map<string, {
    id: string;
    name: string;
    course: string;
    submissionsCount: number;
    gradedCount: number;
    lastSubmission: string;
  }>();

  submissions.forEach((sub) => {
    if (!studentMap.has(sub.studentId)) {
      studentMap.set(sub.studentId, {
        id: sub.studentId,
        name: sub.studentName || "Unknown",
        course: sub.course || "—",
        submissionsCount: 0,
        gradedCount: 0,
        lastSubmission: sub.createdAt,
      });
    }
    const s = studentMap.get(sub.studentId)!;
    s.submissionsCount++;
    if (sub.status === "graded") s.gradedCount++;
    if (new Date(sub.createdAt) > new Date(s.lastSubmission)) {
      s.lastSubmission = sub.createdAt;
    }
  });

  const students = Array.from(studentMap.values());
  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.course.toLowerCase().includes(search.toLowerCase())
  );

  const totalStudents = courses.reduce((sum, c) => sum + (c.students || 0), 0);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading students...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Students</h1>
        <p className="text-gray-500">Track student engagement and progress</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Students", value: totalStudents, icon: Users, bg: "bg-indigo-50", color: "text-indigo-600" },
          { label: "Active Learners", value: students.length, icon: TrendingUp, bg: "bg-green-50", color: "text-green-600" },
          { label: "Courses Running", value: courses.length, icon: BookOpen, bg: "bg-amber-50", color: "text-amber-600" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`${s.bg} w-12 h-12 rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-sm text-gray-500">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input className="pl-10" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Student List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3" />
          <p>{students.length === 0 ? "No student submissions yet." : "No students match your search."}</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Student", "Course", "Submissions", "Graded", "Last Active", "Progress"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((student) => {
                    const progress = student.submissionsCount === 0
                      ? 0
                      : Math.round((student.gradedCount / student.submissionsCount) * 100);
                    return (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold text-sm">
                                {student.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{student.course || "—"}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">{student.submissionsCount}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{student.gradedCount}</td>
                        <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(student.lastSubmission).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[80px]">
                              <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-8">{progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course-wise breakdown */}
      {courses.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Course Enrollment Overview</h3>
            <div className="space-y-3">
              {courses.map((c) => (
                <div key={c._id} className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                  <p className="text-sm font-medium text-gray-900 flex-1">{c.title}</p>
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-200 rounded-full h-2 w-32">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min((c.students || 0) * 5, 100)}%` }} />
                    </div>
                    <span className="text-sm text-gray-500 w-20 text-right">{c.students || 0} students</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
