import mongoose from "mongoose";

const subjectResultSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  subjectCode: { type: String, default: "" },
  internalMarks: { type: Number, default: 0 },
  externalMarks: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  maxMarks: { type: Number, default: 100 },
  grade: { type: String, default: "" },
  gradePoints: { type: Number, default: 0 },
  credits: { type: Number, default: 3 },
  status: { type: String, enum: ["pass", "fail", "absent", "detained"], default: "pass" },
}, { _id: true });

const resultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    academicYear: { type: String, required: true },
    semesterNumber: { type: Number, min: 1, max: 8, required: true },
    enrollmentNumber: { type: String, trim: true, default: "" },
    subjects: [subjectResultSchema],

    // Aggregates
    totalMarksObtained: { type: Number, default: 0 },
    totalMaxMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    sgpa: { type: Number, default: 0 },   // Semester GPA
    cgpa: { type: Number, default: 0 },   // Cumulative GPA
    totalCredits: { type: Number, default: 0 },
    earnedCredits: { type: Number, default: 0 },

    result: {
      type: String,
      enum: ["pass", "fail", "distinction", "first_class", "second_class", "pass_class", "atkt", "detained"],
      default: "pass",
    },
    rank: { type: Number, default: null },
    remarks: { type: String, default: "" },
    declaredOn: { type: Date, default: null },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

resultSchema.index({ student: 1, semesterNumber: 1, academicYear: 1 }, { unique: true });
resultSchema.index({ department: 1, semesterNumber: 1, isPublished: 1 });

export default mongoose.model("Result", resultSchema);
