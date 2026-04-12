import { Bell, Menu, Palette } from "lucide-react";
import { Button } from "./ui/button";
import { Badge }  from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const TITLES: Record<string, string> = {
  "/dashboard": "Home",      "/dashboard/courses": "My Courses",
  "/dashboard/videos":       "Video Library", "/dashboard/library": "Resources",
  "/dashboard/progress":     "My Progress", "/dashboard/assignments": "Assignments",
  "/dashboard/submissions":  "Submissions", "/dashboard/fees": "Fee Payment",
  "/dashboard/ai-chat":      "AI Assistant", "/admin/dashboard": "Admin Dashboard",
  "/admin/users":            "User Management", "/admin/courses": "Course Management",
  "/admin/analytics":        "Analytics", "/admin/content": "Content Library",
  "/admin/fees":             "Fee Management", "/admin/submissions": "Submissions Review",
  "/admin/settings":         "System Settings", "/instructor/dashboard": "Instructor Dashboard",
  "/instructor/courses":     "My Courses", "/instructor/assignments": "Assignments",
  "/instructor/submissions": "Grade Submissions", "/instructor/students": "My Students",
  "/instructor/content":     "Content Library", "/instructor/ai-chat": "AI Assistant",
  "/dashboard/attendance":   "My Attendance",
  "/dashboard/documents":    "Document Hub",
  "/dashboard/timetable":    "Timetable",
  "/instructor/attendance":  "Attendance",
  "/admin/documents":        "Document Verification",
  "/admin/timetable":        "Timetable Management",
  "/admin/departments":      "Departments",
};

type ThemeKey = "default" | "aesthetic" | "dark-glass";
const THEMES: { key: ThemeKey; label: string; dot: string }[] = [
  { key: "default",    label: "Default",    dot: "#6366f1" },
  { key: "aesthetic",  label: "Aesthetic",  dot: "#C8956C" },
  { key: "dark-glass", label: "Dark Glass", dot: "#3B82F6" },
];

type NotifItem = {
  _id: string; title: string; message: string;
  isRead: boolean; createdAt: string; type: string;
};

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [theme, setThemeState] = useState<ThemeKey>(
    () => (localStorage.getItem("learnix-theme") as ThemeKey) || "default"
  );

  const cleanPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  const title = TITLES[cleanPath] || "Dashboard";
  const initials = user?.username?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || "U";
  const displayName = user?.username || user?.email || "User";

  const applyTheme = (t: ThemeKey) => {
    document.documentElement.removeAttribute("data-theme");
    if (t !== "default") document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("learnix-theme", t);
    setThemeState(t);
  };

  useEffect(() => {
    const saved = localStorage.getItem("learnix-theme") as ThemeKey | null;
    if (saved && saved !== "default") document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/notifications?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const id = setInterval(fetchNotifications, 60_000);
      return () => clearInterval(id);
    }
  }, [user]);

  const markRead = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const typeLabel = (type: string) => ({
    assignment: "Assignment", fee_due: "Fee Due", fee_paid: "Fee Paid",
    submission_graded: "Graded", course_enrolled: "Enrolled",
    attendance_warning: "Attendance", announcement: "Notice", system: "System",
  }[type] || "Notice");

  const currentTheme = THEMES.find(t => t.key === theme)!;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 ae-header dg-header">
      <div className="px-4 md:px-6 py-3.5 flex items-center justify-between">

        {/* Left */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onMenuClick}>
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{title}</h2>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">

          {/* Theme switcher */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Switch theme" className="relative">
                <Palette style={{ width: "1rem", height: "1rem" }} />
                <span
                  className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: currentTheme.dot }}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs uppercase tracking-wider text-slate-400 pb-1">
                Theme
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {THEMES.map(t => (
                <DropdownMenuItem
                  key={t.key}
                  className="flex items-center gap-2.5 cursor-pointer text-sm"
                  onClick={() => applyTheme(t.key)}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.dot }} />
                  <span className={theme === t.key ? "font-semibold" : ""}>{t.label}</span>
                  {theme === t.key && <span className="ml-auto text-xs opacity-60">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu
            modal={false}
            open={notifOpen}
            onOpenChange={o => { setNotifOpen(o); if (o) fetchNotifications(); }}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell style={{ width: "1rem", height: "1rem" }} />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center p-0 px-1 bg-red-500 text-white text-[10px] pointer-events-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between px-2 py-1.5">
                <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <button className="text-xs text-indigo-600 hover:underline" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-slate-400 text-sm">No notifications yet</div>
              ) : notifications.map(n => (
                <DropdownMenuItem
                  key={n._id}
                  className={`flex flex-col items-start gap-0.5 px-3 py-2.5 cursor-pointer ${!n.isRead ? "bg-indigo-50/60" : ""}`}
                  onClick={() => !n.isRead && markRead(n._id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-xs text-indigo-600 font-semibold">{typeLabel(n.type)}</span>
                    {!n.isRead && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full ml-auto shrink-0" />}
                  </div>
                  <p className="text-sm font-medium text-slate-900 leading-snug">{n.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-1 pr-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium text-slate-700 max-w-[100px] truncate">
                  {displayName}
                </span>
              </Button>
            </DropdownMenuTrigger>
           <DropdownMenuContent align="end" className="w-48">
  <DropdownMenuLabel>
    <p className="font-semibold">{displayName}</p>
    <p className="text-xs text-slate-400 font-normal capitalize">{user?.role}</p>
  </DropdownMenuLabel>

  <DropdownMenuSeparator />

  {/* 👤 PROFILE BUTTON */}
  <DropdownMenuItem
    className="cursor-pointer"
    onClick={() => navigate("/dashboard/profile")}
  >
    Profile
  </DropdownMenuItem>

  <DropdownMenuSeparator />

  {/* 🚪 LOGOUT */}
  <DropdownMenuItem
    className="text-red-600 font-medium cursor-pointer"
    onClick={() => { logout(); navigate("/login"); }}
  >
    Sign Out
  </DropdownMenuItem>
</DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}