import mongoose from "mongoose";

/**
 * StudentProfile — filled once at first login via onboarding form.
 * After submission (isSubmitted: true) only an admin can modify it.
 *
 * FIX: unified field name to `user` (was `userId` in controller, `user` in model — now consistent).
 * FIX: enrollmentNumber sparse unique index so multiple null values are allowed.
 */
const studentProfileSchema = new mongoose.Schema(
  {
    // ── Link to User account ─────────────────────────────────
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      unique:   true,
    },

    // ── Academic (enrollment number assigned by admin, NOT self-entered) ──
    enrollmentNumber: {
      type:    String,
      trim:    true,
      default: null,
      // sparse: allows multiple null values while still enforcing uniqueness
      // when a value IS set
    },
    department: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Department",
      default: null,
    },
    semester: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Semester",
      default: null,
    },
    year: {
      type:    Number,
      min:     1,
      max:     6,
      default: null,
    },
    division: {
      type:    String,
      trim:    true,
      default: "",
    },
    rollNumber: {
      type:    String,
      trim:    true,
      default: "",
    },
    admissionYear: {
      type:    Number,
      default: null,
    },

    // ── Personal ─────────────────────────────────────────────
    fullName: {
      type:    String,
      trim:    true,
      default: "",
    },
    dateOfBirth: {
      type:    Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },
    bloodGroup: {
      type:    String,
      enum:    ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"],
      default: "unknown",
    },
    photo: {
      type:    String,
      default: "",
    },
    phoneNumber: {
      type:    String,
      trim:    true,
      default: "",
    },
    address: {
      street:  { type: String, default: "" },
      city:    { type: String, default: "" },
      state:   { type: String, default: "" },
      pincode: { type: String, default: "" },
    },

    // ── Parent / Guardian ─────────────────────────────────────
    parentName: {
      type:    String,
      trim:    true,
      default: "",
    },
    parentPhone: {
      type:    String,
      trim:    true,
      default: "",
    },
    parentEmail: {
      type:    String,
      trim:    true,
      default: "",
    },
    parentOccupation: {
      type:    String,
      trim:    true,
      default: "",
    },

    // ── Category ──────────────────────────────────────────────
    category: {
      type:    String,
      enum:    ["general", "obc", "sc", "st", "nt", "other"],
      default: "general",
    },

    // ── Submission lock ───────────────────────────────────────
    // Once isSubmitted = true, only admin can update this document.
    isSubmitted: {
      type:    Boolean,
      default: false,
    },
    submittedAt: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Sparse unique index: allows many null enrollment numbers, but no two
// non-null documents can share the same enrollment number.
studentProfileSchema.index(
  { enrollmentNumber: 1 },
  { unique: true, sparse: true }
);

export default mongoose.model("StudentProfile", studentProfileSchema);