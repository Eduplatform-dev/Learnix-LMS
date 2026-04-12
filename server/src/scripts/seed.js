import mongoose from "mongoose";
import bcrypt from "bcrypt";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { connectDB } from "../config/db.js";
import User       from "../models/User.js";
import Course     from "../models/Course.js";
import Assignment from "../models/Assignment.js";
import Content    from "../models/Content.js";
import Fee        from "../models/Fee.js";

async function seed() {
  await connectDB();

  /* ─── ADMIN ──────────────────────────────────────────── */
  let admin = await User.findOne({ role: "admin" });
  if (!admin) {
    admin = await User.create({
      email:    "admin@learnix.com",
      username: "Admin",
      password: await bcrypt.hash("admin123", 10),
      role:     "admin",
    });
    console.log("  ✅  Admin created: admin@learnix.com / admin123");
  } else {
    console.log("  ℹ️   Admin already exists");
  }

  /* ─── INSTRUCTOR ─────────────────────────────────────── */
  let instructor = await User.findOne({ email: "instructor@learnix.com" });
  if (!instructor) {
    instructor = await User.create({
      email:    "instructor@learnix.com",
      username: "DrSmith",
      password: await bcrypt.hash("instructor123", 10),
      role:     "instructor",
    });
    console.log("  ✅  Instructor created: instructor@learnix.com / instructor123");
  } else {
    console.log("  ℹ️   Instructor already exists");
  }

  /* ─── STUDENT ────────────────────────────────────────── */
  let student = await User.findOne({ email: "student@learnix.com" });
  if (!student) {
    student = await User.create({
      email:    "student@learnix.com",
      username: "Student",
      password: await bcrypt.hash("student123", 10),
      role:     "student",
    });
    console.log("  ✅  Student created: student@learnix.com / student123");
  } else {
    console.log("  ℹ️   Student already exists");
  }

  /* ─── COURSES ─────────────────────────────────────────── */
  let courses = await Course.find();
  if (courses.length === 0) {
    courses = await Course.insertMany([
      {
        title:            "React Fundamentals",
        description:      "Learn React basics including hooks, state management, and component patterns.",
        instructor:       instructor._id,
        duration:         "6 weeks",
        rating:           4.8,
        status:           "active",
        enrolledStudents: [student._id],
      },
      {
        title:            "Data Structures & Algorithms",
        description:      "Master essential data structures and algorithm design techniques.",
        instructor:       instructor._id,
        duration:         "8 weeks",
        rating:           4.6,
        status:           "active",
        enrolledStudents: [student._id],
      },
      {
        title:       "Node.js & Express",
        description: "Build scalable backend APIs with Node.js and Express.",
        instructor:  admin._id,
        duration:    "5 weeks",
        rating:      4.7,
        status:      "active",
      },
      {
        title:       "Database Design",
        description: "Learn SQL and NoSQL database design principles.",
        instructor:  instructor._id,
        duration:    "4 weeks",
        rating:      4.5,
        status:      "active",
        enrolledStudents: [student._id],
      },
    ]);
    console.log(`  ✅  ${courses.length} courses seeded`);
  } else {
    console.log(`  ℹ️   ${courses.length} courses already exist`);
  }

  /* ─── ASSIGNMENTS ─────────────────────────────────────── */
  if ((await Assignment.countDocuments()) === 0) {
    await Assignment.insertMany([
      {
        title:       "React Todo App",
        description: "Build a fully functional Todo app using React hooks and local state management.",
        course:      courses[0]._id,
        instructor:  instructor._id,
        dueDate:     new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxMarks:    100,
      },
      {
        title:       "Binary Search Tree",
        description: "Implement a BST with insert, search, and traversal methods.",
        course:      courses[1]?._id || courses[0]._id,
        instructor:  instructor._id,
        dueDate:     new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxMarks:    100,
      },
      {
        title:       "REST API Design",
        description: "Design and implement a RESTful API with proper authentication.",
        course:      courses[2]?._id || courses[0]._id,
        instructor:  admin._id,
        dueDate:     new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        maxMarks:    100,
      },
    ]);
    console.log("  ✅  Assignments seeded");
  } else {
    console.log("  ℹ️   Assignments already exist");
  }

  /* ─── CONTENT ─────────────────────────────────────────── */
  if ((await Content.countDocuments()) === 0) {
    await Content.insertMany([
      {
        title:      "React Hooks Guide",
        type:       "pdf",
        url:        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        course:     String(courses[0]._id),
        uploadedBy: instructor._id,
      },
      {
        title:      "DSA Lecture Notes",
        type:       "pdf",
        url:        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        course:     String(courses[1]._id),
        uploadedBy: instructor._id,
      },
      {
        title:      "Welcome to Learnix",
        type:       "pdf",
        url:        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        uploadedBy: admin._id,
      },
    ]);
    console.log("  ✅  Content seeded");
  } else {
    console.log("  ℹ️   Content already exists");
  }

  /* ─── FEES ────────────────────────────────────────────── */
  if ((await Fee.countDocuments({ student: student._id })) === 0) {
    const now = new Date();
    await Fee.insertMany([
      {
        student:     student._id,
        description: "Tuition Fee - Spring 2026",
        amount:      2850.00,
        status:      "paid",
        dueDate:     new Date(now.getFullYear(), now.getMonth() - 1, 15),
        paidAt:      new Date(now.getFullYear(), now.getMonth() - 1, 10),
        invoice:     "INV-2026-0001",
        semester:    "Spring 2026",
        category:    "tuition",
      },
      {
        student:     student._id,
        description: "Technology Fee",
        amount:      250.00,
        status:      "paid",
        dueDate:     new Date(now.getFullYear(), now.getMonth() - 1, 15),
        paidAt:      new Date(now.getFullYear(), now.getMonth() - 1, 10),
        invoice:     "INV-2026-0002",
        semester:    "Spring 2026",
        category:    "technology",
      },
      {
        student:     student._id,
        description: "Tuition Fee - Summer 2026",
        amount:      2850.00,
        status:      "pending",
        dueDate:     new Date(now.getFullYear(), now.getMonth() + 1, 15),
        invoice:     "INV-2026-0003",
        semester:    "Summer 2026",
        category:    "tuition",
      },
      {
        student:     student._id,
        description: "Lab Fee",
        amount:      200.00,
        status:      "pending",
        dueDate:     new Date(now.getFullYear(), now.getMonth() + 1, 15),
        invoice:     "INV-2026-0004",
        semester:    "Summer 2026",
        category:    "lab",
      },
    ]);
    console.log("  ✅  Fees seeded");
  } else {
    console.log("  ℹ️   Fees already exist for student");
  }

  await mongoose.connection.close();

  console.log("\n  🎉  Seed complete!");
  console.log("\n  Demo accounts:");
  console.log("    Admin:      admin@learnix.com      / admin123");
  console.log("    Instructor: instructor@learnix.com / instructor123");
  console.log("    Student:    student@learnix.com    / student123\n");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});