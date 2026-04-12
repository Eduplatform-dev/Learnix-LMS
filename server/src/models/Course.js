import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
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
    instructor: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    duration: {
      type:     String,
      required: true,
      trim:     true,
    },
    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  "User",
      },
    ],
    rating: {
      type:    Number,
      default: 4.5,
      min:     0,
      max:     5,
    },

    // ── Course Type ────────────────────────────────────────────
    // academic: free, linked to department + semester, only that branch/sem can enroll
    // private:  instructor-controlled, can be free or paid
    courseType: {
      type:    String,
      enum:    ["academic", "private"],
      default: "private",
    },

    // ── Pricing (only relevant for private courses) ────────────
    isFree: {
      type:    Boolean,
      default: true,
    },
    price: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Approval flow ──────────────────────────────────────────
    // pending_approval: instructor just created/submitted for review
    // approved:         admin approved, visible and enrollable
    // rejected:         admin rejected with a reason
    approvalStatus: {
      type:    String,
      enum:    ["pending_approval", "approved", "rejected"],
      default: "pending_approval",
    },
    rejectionNote: {
      type:    String,
      default: "",
      trim:    true,
    },

    // legacy status field kept for archive/active toggling by admin
    status: {
      type:    String,
      enum:    ["active", "completed", "archived", "pending_approval"],
      default: "active",
    },

    image: {
      type:    String,
      default: "",
    },

    // ── Academic course fields ─────────────────────────────────
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
    subjectCode: {
      type:    String,
      trim:    true,
      default: "",
    },
    credits: {
      type:    Number,
      default: 0,
      min:     0,
    },
  },
  { timestamps: true }
);

courseSchema.index({ department: 1, semesterNumber: 1 });
courseSchema.index({ academicYear: 1 });
courseSchema.index({ approvalStatus: 1 });

export default mongoose.model("Course", courseSchema);