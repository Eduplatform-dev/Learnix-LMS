import { useEffect, useState } from "react";
import { Users, BookOpen, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard data AND actual user list to get correct counts (no admins)
    Promise.all([
      fetch(`${API_BASE_URL}/api/admin/dashboard`, { headers: authHeader() }).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/users?limit=200`, { headers: authHeader() }).then(r => r.json()),
    ]).then(([dashboard, users]) => {
      const allUsers = Array.isArray(users) ? users : [];
      // Override student count to exclude admins
      const studentCount = allUsers.filter((u: any) => u.role === "student").length;
      setData({
        ...dashboard,
        stats: {
          ...dashboard.stats,
          students: studentCount,
        },
      });
    }).catch(err => console.error("Dashboard error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return <div className="p-6 text-center text-gray-400">No dashboard data available.</div>;

  const cards = [
    { title: "Students",   value: data.stats.students,                     icon: Users,      color: "from-indigo-500 to-blue-600" },
    { title: "Courses",    value: data.stats.courses,                      icon: BookOpen,   color: "from-emerald-500 to-teal-600" },
    { title: "Revenue",    value: `$${(data.stats.revenue ?? 0).toFixed(2)}`, icon: DollarSign, color: "from-violet-500 to-purple-600" },
    { title: "Completion", value: `${data.stats.completionRate ?? 0}%`,    icon: TrendingUp, color: "from-amber-500 to-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-0 shadow-md">
              <CardContent className="p-5 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`bg-gradient-to-br ${card.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Student Enrollment Trend (Last 6 Months)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.enrollmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={3} dot={{ fill: "#6366f1" }} name="New Students" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}