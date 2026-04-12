import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status:  { type: String, enum: ["present", "absent", "late", "excused"], default: "absent" },
});

const attendanceSchema = new mongoose.Schema(
  {
    course:       { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    subject:      { type: String, trim: true, default: "" },
    date:         { type: Date, required: true },
    department:   { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    year:         { type: Number, min: 1, max: 6, default: null },
    markedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    records:      [attendanceRecordSchema],
    lectureType:  { type: String, enum: ["lecture", "lab", "tutorial"], default: "lecture" },
    topic:        { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

attendanceSchema.index({ course: 1, date: 1 });
attendanceSchema.index({ "records.student": 1, date: 1 });
attendanceSchema.index({ department: 1, year: 1, date: 1 });

export default mongoose.model("Attendance", attendanceSchema);
