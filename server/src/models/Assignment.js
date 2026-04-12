import mongoose from "mongoose";

/**
 * Assignment Model — updated to link with Department and Semester.
 */
const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type:     String,
      required: true,
      trim:     true,
    },
    description: {
      type:    String,
      default: "",
      trim:    true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Course",
    },
    instructor: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    dueDate: {
      type:     Date,
      required: true,
    },
    maxMarks: {
      type:    Number,
      default: 100,
    },
    attachments: {
      type:    String,
      default: "",
    },
    status: {
      type:    String,
      default: "Not Started",
    },

    // ── NEW: College structure fields ──────────────────────────
    department: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Department",
      default: null,
    },
    academicYear: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "AcademicYear",
      default: null,
    },
    semesterNumber: {
      type:    Number,
      min:     1,
      max:     8,
      default: null,
    },
  },
  { timestamps: true }
);

assignmentSchema.index({ department: 1, semesterNumber: 1 });

export default mongoose.model("Assignment", assignmentSchema);