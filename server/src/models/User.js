import mongoose from "mongoose";

/**
 * User Model — updated to include Department and Semester references.
 * These are denormalized here for fast querying (e.g., "all students in CSE Sem 3")
 * without always joining StudentProfile.
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    username: {
      type:      String,
      required:  true,
      unique:    true,
      trim:      true,
      minlength: 3,
      maxlength: 30,
    },
    password: {
      type:      String,
      required:  true,
      minlength: 6,
      select:    false,
    },
    role: {
      type:    String,
      enum:    ["student", "admin", "instructor"],
      default: "student",
    },

    // ── NEW: College structure fields ──────────────────────────
    department: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Department",
      default: null,
      // Populated for students and instructors
    },
    // Shortcut: current semester number on the user doc itself so
    // list queries (e.g. filter by semester) don't need a join.
    currentSemesterNumber: {
      type:    Number,
      min:     1,
      max:     8,
      default: null,
    },
    academicYear: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "AcademicYear",
      default: null,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);