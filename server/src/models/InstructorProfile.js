import mongoose from "mongoose";

/**
 * InstructorProfile — filled once at first login, locked after submission.
 * Only admins can edit after submission.
 */
const instructorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    /* ── Professional ──────────────────────────────────────────── */
    employeeId: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    designation: {
      type: String,
      trim: true,
      default: "",
    },
    qualification: {
      type: String,
      trim: true,
      default: "",
    },
    specialization: {
      type: String,
      trim: true,
      default: "",
    },
    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },
    joiningDate: {
      type: Date,
      default: null,
    },

    /* ── Personal ──────────────────────────────────────────────── */
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown", ""],
      default: "unknown",
    },
    photo: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      street:  { type: String, default: "" },
      city:    { type: String, default: "" },
      state:   { type: String, default: "" },
      pincode: { type: String, default: "" },
    },

    /* ── Submission lock ───────────────────────────────────────── */
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Sparse unique index on employeeId
instructorProfileSchema.index(
  { employeeId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { employeeId: { $gt: "" } } }
);

export default mongoose.model("InstructorProfile", instructorProfileSchema);