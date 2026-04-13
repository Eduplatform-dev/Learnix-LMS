// src/app/components/Sidebar.tsx
// UPDATED: Clicking the bottom-left profile area opens the ID card for students/instructors

import {
  Home, BookOpen, PlayCircle, LineChart, FileText,
  Upload, DollarSign, MessageSquare, Users, Settings,
  BarChart3, FolderOpen, Shield, GraduationCap, CheckSquare,
  Award, Calendar, ClipboardList, Building2, CreditCard
} from "lucide-react";
import { Badge }    from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useAuth }  from "../providers/AuthProvider";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { IDCard } from "./IDCard";

type UserRole = "student" | "admin" | "instructor";
type MenuItem  = { path: string; label: string; icon: LucideIcon; badge?: number; exact?: boolean; };
interface SidebarProps { isOpen: boolean; onClose: () => void; }

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user }  = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [showIDCard, setShowIDCard] = useState(false);

  const userRole = user?.role as UserRole | undefined;
  if (!userRole) return null;

  const activePath = location.pathname;
  const initials = user?.username
    ? user.username.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "U";

  const studentMenu: MenuItem[] = [
    { path: "/dashboard",              label: "Home",          icon: Home, exact: true },
    { path: "/dashboard/courses",      label: "My Courses",    icon: BookOpen },
    { path: "/dashboard/videos",       label: "Video Library", icon: PlayCircle },
    { path: "/dashboard/library",      label: "Resources",     icon: FolderOpen },
    { path: "/dashboard/progress",     label: "My Progress",   icon: LineChart },
    { path: "/dashboard/assignments",  label: "Assignments",   icon: FileText },
    { path: "/dashboard/submissions",  label: "Submissions",   icon: Upload },
    { path: "/dashboard/attendance",   label: "Attendance",    icon: CheckSquare },
    { path: "/dashboard/exams",        label: "Exam Schedule", icon: Calendar },
    { path: "/dashboard/results",      label: "My Results",    icon: ClipboardList },
    { path: "/dashboard/certificates", label: "Certificates",  icon: Award },
    { path: "/dashboard/fees",         label: "Fee Payment",   icon: DollarSign },
    { path: "/dashboard/ai-chat",      label: "AI Assistant",  icon: MessageSquare },
    { path: "/dashboard/documents",    label: "Documents",     icon: FolderOpen },
    { path: "/dashboard/timetable",    label: "Timetable",     icon: Calendar },
  ];

  const adminMenu: MenuItem[] = [
    { path: "/admin/dashboard",   label: "Dashboard",   icon: BarChart3, exact: true },
    { path: "/admin/users",       label: "Users",       icon: Users },
    { path: "/admin/courses",     label: "Courses",     icon: BookOpen },
    { path: "/admin/exams",       label: "Exam Schedule", icon: Calendar },
    { path: "/admin/results",     label: "Results",     icon: ClipboardList },
    { path: "/admin/analytics",   label: "Analytics",   icon: LineChart },
    { path: "/admin/content",     label: "Content",     icon: FolderOpen },
    { path: "/admin/fees",        label: "Fees",        icon: DollarSign },
    { path: "/admin/submissions", label: "Submissions", icon: Upload },
    { path: "/admin/audit-logs",  label: "Audit Logs",  icon: Shield },
    { path: "/admin/settings",    label: "Settings",    icon: Settings },
    { path: "/admin/departments", label: "Departments", icon: Building2 },
  ];

  const instructorMenu: MenuItem[] = [
    { path: "/instructor/dashboard",   label: "Dashboard",    icon: Home, exact: true },
    { path: "/instructor/courses",     label: "My Courses",   icon: BookOpen },
    { path: "/instructor/assignments", label: "Assignments",  icon: FileText },
    { path: "/instructor/submissions", label: "Grade Work",   icon: CheckSquare },
    { path: "/instructor/students",    label: "Students",     icon: Users },
    { path: "/instructor/content",     label: "Content",      icon: FolderOpen },
    { path: "/instructor/ai-chat",     label: "AI Assistant", icon: MessageSquare },
    { path: "/instructor/attendance",  label: "Attendance",   icon: CheckSquare },
  ];

  const menuItems =
    userRole === "admin"      ? adminMenu :
    userRole === "instructor" ? instructorMenu :
    studentMenu;

  const portalLabel =
    userRole === "admin"      ? "Admin Portal" :
    userRole === "instructor" ? "Instructor Portal" :
    "Student Portal";

  const logoIcon =
    userRole === "admin"      ? <Shield className="w-5 h-5 text-white" /> :
    userRole === "instructor" ? <GraduationCap className="w-5 h-5 text-white" /> :
    <BookOpen className="w-5 h-5 text-white" />;

  const accentGradient =
    userRole === "admin"      ? "from-violet-600 to-purple-600" :
    userRole === "instructor" ? "from-emerald-600 to-teal-600"  :
    "from-indigo-600 to-blue-600";

  const canShowIDCard = userRole === "student" || userRole === "instructor";

  const handleFooterClick = () => {
    if (canShowIDCard) {
      setShowIDCard(true);
    }
  };

  return (
    <>
      <div className={[
        "w-64 flex flex-col h-screen fixed left-0 top-0 z-50",
        "bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800",
        "transition-transform duration-300 shadow-sm",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
      ].join(" ")}>

        {/* Logo */}
        <div className="p-5 border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br ${accentGradient}`}>
              {logoIcon}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 dark:text-white text-base truncate">Learnix</h1>
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{portalLabel}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = item.exact
              ? activePath === item.path
              : activePath === item.path || activePath.startsWith(item.path + "/");

            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); onClose(); }}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800",
                ].join(" ")}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer — clickable for ID card (students/instructors) */}
        <div
          className={`p-4 border-t ${canShowIDCard ? "cursor-pointer hover:bg-slate-50 transition-colors group" : ""}`}
          onClick={handleFooterClick}
          title={canShowIDCard ? "View ID Card" : undefined}
        >
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarFallback className={`bg-gradient-to-br ${accentGradient} text-white text-xs font-bold`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.username || "User"}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
            {canShowIDCard && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <CreditCard className="w-4 h-4 text-indigo-500" />
              </div>
            )}
          </div>
          {canShowIDCard && (
            <p className="text-[10px] text-gray-400 mt-1.5 ml-12 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to view ID card
            </p>
          )}
        </div>
      </div>

      {/* ID Card Modal */}
      {showIDCard && <IDCard onClose={() => setShowIDCard(false)} />}
    </>
  );
}