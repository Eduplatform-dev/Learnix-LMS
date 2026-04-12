import User from "../models/User.js";
import Course from "../models/Course.js";
import Assignment from "../models/Assignment.js";
import Content from "../models/Content.js";
import Setting from "../models/Setting.js";
import Submission from "../models/Submission.js";
import Fee from "../models/Fee.js";

/* ─── HELPERS ─────────────────────────────────────────── */
const defaultSettings = {
  general:      { platformName: "Learnix", supportEmail: "", logoUrl: "" },
  notifications:{ emailUpdates: true, productUpdates: false, billingAlerts: true },
  security:     { enforceTwoFactor: false, allowGoogleLogin: true, sessionTimeout: "30" },
  localization: { language: "en", timezone: "UTC", dateFormat: "MM/DD/YYYY" },
  emailConfig:  { smtpHost: "", smtpPort: "587", smtpUser: "", fromName: "", fromEmail: "", footer: "" },
  backup:       { autoBackup: true, retentionDays: "30", backupWindow: "02:00-04:00" },
};

// Non-admin roles only
const NON_ADMIN = { role: { $ne: "admin" } };

const lastNMonths = (n) => {
  const now    = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      date:  d,
      next:  new Date(d.getFullYear(), d.getMonth() + 1, 1),
    });
  }
  return months;
};

/* ─── ADMIN STATS ─────────────────────────────────────── */
export const getAdminStats = async (req, res) => {
  try {
    const [totalStudents, totalCourses, totalAssignments, totalSubmissions, paidFees] =
      await Promise.all([
        // FIX: only count students, never admins or instructors
        User.countDocuments({ role: "student" }),
        Course.countDocuments(),
        Assignment.countDocuments(),
        Submission.countDocuments(),
        Fee.aggregate([
          { $match: { status: "paid" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

    const revenue = paidFees[0]?.total ?? 0;

    res.json({ totalStudents, totalCourses, totalAssignments, totalSubmissions, revenue });
  } catch (err) {
    console.error("getAdminStats error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ─── DASHBOARD ───────────────────────────────────────── */
export const getDashboard = async (req, res) => {
  try {
    const [students, courses, totalAssignments, submittedAssignments, revenueResult] =
      await Promise.all([
        // FIX: exclude admins - only count actual students
        User.countDocuments({ role: "student" }),
        Course.countDocuments(),
        Submission.countDocuments(),
        Submission.countDocuments({ status: { $in: ["submitted", "graded"] } }),
        Fee.aggregate([
          { $match: { status: "paid" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

    const revenue        = revenueResult[0]?.total ?? 0;
    const completionRate = totalAssignments === 0
      ? 0
      : Math.round((submittedAssignments / totalAssignments) * 100);

    const months = lastNMonths(6);

    const enrollmentData = await Promise.all(
      months.map(async ({ label, date, next }) => {
        // FIX: only count students registered in that month
        const count = await User.countDocuments({
          role:      "student",
          createdAt: { $gte: date, $lt: next },
        });
        return { month: label, students: count };
      })
    );

    res.json({
      stats: { students, courses, revenue, completionRate },
      enrollmentData,
    });
  } catch (err) {
    console.error("getDashboard error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ─── ANALYTICS ───────────────────────────────────────── */
export const getAnalytics = async (req, res) => {
  try {
    const [
      totalStudents,
      totalInstructors,
      totalCourses,
      totalContent,
      totalSubmissions,
    ] = await Promise.all([
      // FIX: separate counts by role, never mix admin into "users"
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "instructor" }),
      Course.countDocuments(),
      Content.countDocuments(),
      Submission.countDocuments(),
    ]);

    // Total non-admin users
    const totalUsers = totalStudents + totalInstructors;

    const months = lastNMonths(6);

    // Monthly growth: only students + instructors (not admins)
    const monthlyGrowth = await Promise.all(
      months.map(async ({ label, date, next }) => {
        const users = await User.countDocuments({
          role: { $in: ["student", "instructor"] },
          createdAt: { $gte: date, $lt: next },
        });
        return { month: label, users };
      })
    );

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const userEngagement = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const d     = new Date();
        d.setDate(d.getDate() - (6 - i));
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const end   = new Date(start.getTime() + 86_400_000);
        const active = await Submission.countDocuments({ createdAt: { $gte: start, $lt: end } });
        return { day: days[start.getDay()], active };
      })
    );

    const courses = await Course.find({}, "title rating enrolledStudents").lean();
    const courseRatings = courses.map((c) => ({
      name:     c.title.length > 20 ? c.title.slice(0, 18) + "…" : c.title,
      rating:   c.rating ?? 4.5,
      students: c.enrolledStudents?.length ?? 0,
    }));

    const [drafted, submitted, graded] = await Promise.all([
      Submission.countDocuments({ status: "draft" }),
      Submission.countDocuments({ status: "submitted" }),
      Submission.countDocuments({ status: "graded" }),
    ]);

    const completionRates = [
      { name: "Draft",     value: drafted   },
      { name: "Submitted", value: submitted },
      { name: "Graded",    value: graded    },
    ].filter((d) => d.value > 0);

    const trafficSources = [
      { source: "Direct",   visits: Math.floor(totalUsers * 0.40) },
      { source: "Search",   visits: Math.floor(totalUsers * 0.35) },
      { source: "Referral", visits: Math.floor(totalUsers * 0.25) },
    ];

    // FIX: kpiMetrics now shows students and instructors separately, not "Users" (which wrongly included admins)
    const kpiMetrics = [
      { label: "Students",    value: totalStudents    },
      { label: "Instructors", value: totalInstructors },
      { label: "Courses",     value: totalCourses     },
      { label: "Submissions", value: totalSubmissions },
    ];

    res.json({
      monthlyGrowth,
      userEngagement,
      courseRatings,
      completionRates,
      trafficSources,
      kpiMetrics,
      // expose raw counts for frontend to use
      counts: {
        students:    totalStudents,
        instructors: totalInstructors,
        totalUsers,
        courses:     totalCourses,
        submissions: totalSubmissions,
      },
    });
  } catch (err) {
    console.error("getAnalytics error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ─── FEES STATS ──────────────────────────────────────── */
export const getFeesStats = async (req, res) => {
  try {
    const [revenueResult, pendingResult, paidStudentCount] = await Promise.all([
      Fee.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Fee.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Fee.distinct("student", { status: "paid" }),
    ]);

    res.json({
      totalRevenue:    revenueResult[0]?.total  ?? 0,
      pendingPayments: pendingResult[0]?.total  ?? 0,
      paidStudents:    paidStudentCount.length,
      growthRate:      0,
    });
  } catch (err) {
    console.error("getFeesStats error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ─── GET SETTINGS ────────────────────────────────────── */
export const getSettings = async (req, res) => {
  try {
    const settings = await Setting.findOne().sort({ createdAt: -1 });
    res.json(settings ?? defaultSettings);
  } catch (err) {
    console.error("getSettings error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ─── SAVE SETTINGS ───────────────────────────────────── */
export const saveSettings = async (req, res) => {
  try {
    const payload = req.body ?? {};
    const updated = await Setting.findOneAndUpdate(
      {},
      { ...defaultSettings, ...payload },
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (err) {
    console.error("saveSettings error:", err);
    res.status(500).json({ error: err.message });
  }
};