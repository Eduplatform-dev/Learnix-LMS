import express from "express";
import { z } from "zod";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import Notification from "../models/Notification.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

/* ── GET my attendance summary (student) ──────────────── */
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user._id;

    // Find all attendance records for this student
    const records = await Attendance.find({ "records.student": studentId })
      .populate("course", "title subjectCode")
      .sort({ date: -1 })
      .lean();

    // Build per-subject summary
    const subjectMap = new Map();
    for (const session of records) {
      const key = String(session.course?._id || session.subject || "Unknown");
      const label = session.course?.title || session.subject || "Unknown";
      const code  = session.course?.subjectCode || "";
      const myRecord = session.records.find(r => String(r.student) === String(studentId));
      if (!myRecord) continue;

      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          courseId: session.course?._id,
          name: label,
          code,
          total: 0, present: 0, absent: 0, late: 0,
          sessions: [],
        });
      }
      const s = subjectMap.get(key);
      s.total++;
      if (myRecord.status === "present") s.present++;
      else if (myRecord.status === "absent") s.absent++;
      else if (myRecord.status === "late")   s.late++;
      s.sessions.push({
        date: session.date,
        status: myRecord.status,
        topic: session.topic,
        type: session.lectureType,
      });
    }

    const subjects = Array.from(subjectMap.values()).map(s => ({
      ...s,
      percentage: s.total === 0 ? 100 : Math.round((s.present + s.late * 0.5) / s.total * 100),
      shortage: s.total === 0 ? false : Math.round((s.present + s.late * 0.5) / s.total * 100) < 75,
    }));

    const totalSessions = subjects.reduce((a, s) => a + s.total, 0);
    const totalPresent  = subjects.reduce((a, s) => a + s.present, 0);
    const overallPct    = totalSessions === 0 ? 100 : Math.round(totalPresent / totalSessions * 100);

    res.json({ subjects, overallPercentage: overallPct });
  } catch (err) {
    console.error("getMyAttendance error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ── GET sessions for a course (instructor/admin) ─────── */
router.get("/course/:courseId", authenticateToken, async (req, res) => {
  try {
    const sessions = await Attendance.find({ course: req.params.courseId })
      .populate("markedBy", "username")
      .sort({ date: -1 })
      .lean();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET all attendance for dept/year (admin) ─────────── */
router.get("/", authenticateToken, authorize(["admin", "instructor"]), async (req, res) => {
  try {
    const filter = {};
    if (req.query.course)     filter.course     = req.query.course;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.year)       filter.year       = Number(req.query.year);
    if (req.query.date) {
      const d = new Date(req.query.date);
      filter.date = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) };
    }

    const sessions = await Attendance.find(filter)
      .populate("course", "title")
      .populate("department", "name code")
      .populate("markedBy", "username")
      .sort({ date: -1 })
      .limit(200)
      .lean();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST: mark attendance for a session ──────────────── */
router.post("/", authenticateToken, authorize(["admin", "instructor"]), async (req, res) => {
  try {
    const { courseId, date, records, lectureType, topic, department, year } = req.body;
    if (!courseId || !date || !Array.isArray(records)) {
      return res.status(400).json({ error: "courseId, date, and records are required" });
    }

    // Upsert: if session already marked for this course+date, update it
    const sessionDate = new Date(date);
    const startOfDay  = new Date(sessionDate); startOfDay.setHours(0,0,0,0);
    const endOfDay    = new Date(sessionDate); endOfDay.setHours(23,59,59,999);

    let session = await Attendance.findOne({
      course: courseId,
      date:   { $gte: startOfDay, $lte: endOfDay },
    });

    if (session) {
      session.records     = records;
      session.lectureType = lectureType || "lecture";
      session.topic       = topic || "";
      session.markedBy    = req.user._id;
      if (department) session.department = department;
      if (year)       session.year       = year;
      await session.save();
    } else {
      session = await Attendance.create({
        course:      courseId,
        date:        sessionDate,
        records,
        lectureType: lectureType || "lecture",
        topic:       topic || "",
        markedBy:    req.user._id,
        department:  department || null,
        year:        year || null,
      });
    }

    // Auto-notify students with < 75% attendance
    const absentStudentIds = records
      .filter(r => r.status === "absent")
      .map(r => r.student);

    for (const studentId of absentStudentIds) {
      // Count attendance for this course
      const allSessions = await Attendance.find({ course: courseId, "records.student": studentId });
      let present = 0, total = 0;
      for (const s of allSessions) {
        const rec = s.records.find(r => String(r.student) === String(studentId));
        if (rec) { total++; if (rec.status === "present" || rec.status === "late") present++; }
      }
      const pct = total === 0 ? 100 : Math.round(present / total * 100);
      if (pct < 75) {
        const course = await Course.findById(courseId).lean();
        await Notification.create({
          recipient: studentId,
          title:     "Attendance Warning ⚠️",
          message:   `Your attendance in ${course?.title || "a course"} has dropped to ${pct}%. Minimum required is 75%.`,
          type:      "attendance_warning",
          link:      "/dashboard/attendance",
        });
      }
    }

    res.status(201).json(session);
  } catch (err) {
    console.error("markAttendance error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ── GET summary report for a course ─────────────────── */
router.get("/report/:courseId", authenticateToken, async (req, res) => {
  try {
    const sessions = await Attendance.find({ course: req.params.courseId }).lean();
    const course   = await Course.findById(req.params.courseId).populate("enrolledStudents", "username email").lean();

    if (!course) return res.status(404).json({ error: "Course not found" });

    const studentSummary = course.enrolledStudents.map(student => {
      let present = 0, absent = 0, late = 0, total = 0;
      const sessionDetails = [];
      for (const session of sessions) {
        const rec = session.records.find(r => String(r.student) === String(student._id));
        if (rec) {
          total++;
          if (rec.status === "present") present++;
          else if (rec.status === "absent") absent++;
          else if (rec.status === "late") late++;
          sessionDetails.push({ date: session.date, status: rec.status });
        }
      }
      const pct = total === 0 ? 100 : Math.round(((present + late * 0.5) / total) * 100);
      return {
        student: { _id: student._id, username: student.username, email: student.email },
        present, absent, late, total,
        percentage: pct,
        shortage: pct < 75,
        sessions: sessionDetails,
      };
    });

    res.json({
      course: { _id: course._id, title: course.title },
      totalSessions: sessions.length,
      students: studentSummary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE a session ─────────────────────────────────── */
router.delete("/:id", authenticateToken, authorize(["admin", "instructor"]), async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
