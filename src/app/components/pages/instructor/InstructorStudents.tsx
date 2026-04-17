// src/app/components/pages/instructor/InstructorStudents.tsx — FIXED VERSION
// Shows enrolled students in instructor's courses, not just those who submitted
import { useEffect, useState } from "react";
import { Users, Search, Mail, BookOpen, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import { getCourses } from "../../../services/courseService";
import { getSubmissions } from "../../../services/submissionService";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

export function InstructorStudents() {
  const { user } = useCurrentUser();
  const [courses, setCourses] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const load = async () => {
      try {
        const [c, s] = await Promise.allSettled([
          getCourses(), 
          getSubmissions(),
        ]);
        const allCourses = c.status === "fulfilled" ? c.value : [];
        const allSubs = s.status === "fulfilled" ? s.value : [];
        
        // Filter to only instructor's courses
        const myCourses = allCourses.filter((course: any) => 
          String(course.instructor?._id || course.instructor) === String(user._id)
        );
        
        setCourses(myCourses || []);
        setSubmissions(allSubs || []);
        
        // Set first course as selected
        if (myCourses.length > 0) {
          setSelectedCourse(myCourses[0]._id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Get students enrolled in selected course
  const getStudentsForCourse = (courseId: string | null) => {
    if (!courseId) return [];
    const course = courses.find(c => c._id === courseId);
    if (!course) return [];
    
    return course.enrolledStudents || [];
  };

  // Get submission stats for a student
  const getStudentStats = (studentId: string) => {
    const studentSubs = submissions.filter((sub) => 
      String(sub.studentId) === String(studentId)
    );
    return {
      total: studentSubs.length,
      submitted: studentSubs.filter(s => s.status !== "draft").length,
      graded: studentSubs.filter(s => s.status === "graded").length,
      pending: studentSubs.filter(s => s.status === "submitted").length,
      grades: studentSubs
        .filter(s => s.status === "graded" && s.grade)
        .map(s => {
          const match = String(s.grade).match(/(\d+)\s*\/\s*(\d+)/);
          if (match) return Math.round((+match[1] / +match[2]) * 100);
          const num = parseFloat(s.grade);
          return !isNaN(num) && num <= 100 ? num : null;
        })
        .filter((g): g is number => g !== null),
    };
  };

  const currentCourseStudents = selectedCourse ? getStudentsForCourse(selectedCourse) : [];
  
  const filtered = currentCourseStudents
    .map((studentId: any) => ({
      id: String(studentId),
      name: `Student ${String(studentId).slice(-4)}`, // Fallback
    }))
    .filter((s: { id: string; name: string }) => s.name.toLowerCase().includes(search.toLowerCase()));

  const totalEnrolled = currentCourseStudents.length;
  const withSubmissions = currentCourseStudents.filter((sid: any) =>
    submissions.some(sub => String(sub.studentId) === String(sid))
  ).length;
  const fullyGraded = currentCourseStudents.filter((sid: any) => {
    const stats = getStudentStats(String(sid));
    return stats.total > 0 && stats.graded === stats.total;
  }).length;

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (courses.length === 0) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium text-lg">No courses found</p>
        <p className="text-gray-500 text-sm mt-2">Create a course first to see enrolled students</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Students</h1>
        <p className="text-gray-500 mt-1">View and track enrolled students across your courses</p>
      </div>

      {/* Course Selector */}
      <Card>
        <CardContent className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Course</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedCourse || ""}
            onChange={e => setSelectedCourse(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title} ({(c.enrolledStudents || []).length} students)
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Enrolled", value: totalEnrolled, icon: Users, bg: "bg-indigo-50", color: "text-indigo-600" },
          { label: "With Submissions", value: withSubmissions, icon: TrendingUp, bg: "bg-green-50", color: "text-green-600" },
          { label: "Fully Graded", value: fullyGraded, icon: BookOpen, bg: "bg-amber-50", color: "text-amber-600" },
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
        <Input 
          className="pl-10" 
          placeholder="Search students by name..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>

      {/* Student List */}
      {filtered.length === 0 && currentCourseStudents.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center">
            <Users className="w-14 h-14 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 font-medium text-lg">No students enrolled</p>
            <p className="text-gray-500 text-sm mt-2">Students will appear here when they enroll in this course.</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No students match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {[
                      "Student ID", 
                      "Status", 
                      "Submitted", 
                      "Graded", 
                      "Avg. Grade", 
                      "Progress"
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((student: { id: string; name: string }) => {
                    const stats = getStudentStats(student.id);
                    const avgGrade = stats.grades.length 
                      ? Math.round(stats.grades.reduce((a, b) => a + b, 0) / stats.grades.length) 
                      : null;
                    const hasSubmissions = stats.total > 0;
                    const progressPct = stats.total === 0 ? 0 : Math.round((stats.graded / stats.total) * 100);

                    return (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold text-xs">
                                {student.id.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-gray-900 text-sm">{student.id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={hasSubmissions ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}>
                            {hasSubmissions ? "Active" : "No Activity"}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">{stats.submitted}/{stats.total}</td>
                        <td className="px-4 py-4 text-sm text-green-700 font-medium">{stats.graded}</td>
                        <td className="px-4 py-4 text-sm font-medium">
                          {avgGrade !== null ? `${avgGrade}%` : "—"}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full transition-all" 
                                style={{ width: `${progressPct}%` }} 
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8">{progressPct}%</span>
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

      {/* Course Summary */}
      {selectedCourse && courses.length > 0 && (
        <Card className="bg-blue-50 border border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">
                  {currentCourseStudents.length} students enrolled in {courses.find(c => c._id === selectedCourse)?.title}
                </p>
                <p className="text-blue-800 mt-1">
                  {withSubmissions} have submitted assignments • {fullyGraded} fully graded
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}