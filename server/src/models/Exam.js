import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    subjectCode: { type: String, trim: true, default: "" },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    semesterNumber: { type: Number, min: 1, max: 8, default: null },
    examDate: { type: Date, required: true },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "12:00"
    duration: { type: Number, default: 180 },    // minutes
    room: { type: String, trim: true, default: "" },
    building: { type: String, trim: true, default: "" },
    totalMarks: { type: Number, default: 100 },
    passingMarks: { type: Number, default: 40 },
    examType: {
      type: String,
      enum: ["midterm", "final", "unit_test", "practical", "viva", "internal"],
      default: "midterm",
    },
    status: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "cancelled"],
      default: "scheduled",
    },
    instructions: { type: String, default: "" },
    invigilators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

examSchema.index({ department: 1, semesterNumber: 1, examDate: 1 });
examSchema.index({ examDate: 1, status: 1 });

export default mongoose.model("Exam", examSchema);
