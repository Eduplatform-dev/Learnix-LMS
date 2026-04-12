import { useEffect, useState } from "react";
import { Calendar, Clock, BookOpen, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import {
  getAssignments,
  updateAssignmentStatus,
  type Assignment,
  type AssignmentStatus,
} from "../../../services/assignmentService";

const statusStyles: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-600",
  "In Progress":  "bg-blue-100 text-blue-700",
  "Submitted":    "bg-green-100 text-green-700",
};

const priorityDot: Record<string, string> = {
  high:   "bg-red-500",
  medium: "bg-amber-500",
  low:    "bg-green-500",
};

export function Assignments() {
  const { user } = useCurrentUser();
  const [items,   setItems]   = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"all" | AssignmentStatus>("all");

  useEffect(() => {
    if (!user) return;
    getAssignments()
      .then((data) => setItems(data || []))
      .finally(() => setLoading(false));
  }, [user]);

  const handleStatus = async (id: string, status: AssignmentStatus) => {
    await updateAssignmentStatus(id, { status });
    setItems((prev) => prev.map((a) => (a._id === id ? { ...a, status } : a)));
  };

  const filtered = filter === "all" ? items : items.filter((a) => a.status === filter);

  const counts = {
    all:           items.length,
    "Not Started": items.filter((a) => a.status === "Not Started").length,
    "In Progress":  items.filter((a) => a.status === "In Progress").length,
    "Submitted":    items.filter((a) => a.status === "Submitted").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Assignments</h1>
        <p className="text-gray-500">Track and manage your assignments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["all", "Not Started", "In Progress", "Submitted"] as const).map((s) => (
          <Card
            key={s}
            className={`cursor-pointer transition-all hover:shadow-md ${filter === s ? "ring-2 ring-indigo-500" : ""}`}
            onClick={() => setFilter(s)}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{counts[s]}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s === "all" ? "Total" : s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">
              {filter === "all" ? "No assignments yet." : `No ${filter.toLowerCase()} assignments.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const due      = new Date(a.dueDate);
            const isOverdue = due < new Date() && a.status !== "Submitted";
            const daysLeft  = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            return (
              <Card key={a._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">

                    {/* Priority dot */}
                    <div className="pt-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${priorityDot[a.priority] || priorityDot.medium}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-gray-900">{a.title}</h3>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3.5 h-3.5" />
                              Due {due.toLocaleDateString()}
                            </span>
                            {typeof a.course === "object" && a.course?.title ? (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <BookOpen className="w-3.5 h-3.5" />
                                {a.course.title}
                              </span>
                            ) : a.course ? (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <BookOpen className="w-3.5 h-3.5" />
                                {a.course as string}
                              </span>
                            ) : null}
                            {isOverdue && (
                              <span className="flex items-center gap-1 text-xs text-red-600">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Overdue
                              </span>
                            )}
                            {!isOverdue && a.status !== "Submitted" && daysLeft <= 3 && daysLeft >= 0 && (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <Clock className="w-3.5 h-3.5" />
                                {daysLeft === 0 ? "Due today" : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-xs ${statusStyles[a.status] || statusStyles["Not Started"]}`}>
                            {a.status}
                          </Badge>
                          {a.status === "Not Started" && (
                            <Button
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => handleStatus(a._id, "In Progress")}
                            >
                              Start
                            </Button>
                          )}
                          {a.status === "In Progress" && (
                            <Button
                              size="sm"
                              className="text-xs h-7 bg-green-600 hover:bg-green-700"
                              onClick={() => handleStatus(a._id, "Submitted")}
                            >
                              Mark Submitted
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}