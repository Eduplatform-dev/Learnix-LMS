import mongoose from "mongoose";

const slotSchema = new mongoose.Schema({
  day:         { type: String, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], required: true },
  startTime:   { type: String, required: true },   // "09:00"
  endTime:     { type: String, required: true },   // "10:00"
  subject:     { type: String, trim: true, required: true },
  subjectCode: { type: String, trim: true, default: "" },
  instructor:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  room:        { type: String, trim: true, default: "" },
  type:        { type: String, enum: ["lecture","lab","tutorial","break","free"], default: "lecture" },
  color:       { type: String, default: "#6366f1" },
}, { _id: true });

const timetableSchema = new mongoose.Schema(
  {
    department:   { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    year:         { type: Number, min: 1, max: 6, required: true },
    division:     { type: String, trim: true, default: "A" },
    academicYear: { type: String, trim: true, required: true },
    semester:     { type: Number, min: 1, max: 8, required: true },
    slots:        [slotSchema],
    isPublished:  { type: Boolean, default: false },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

timetableSchema.index({ department: 1, year: 1, division: 1, academicYear: 1, semester: 1 }, { unique: true });

export default mongoose.model("Timetable", timetableSchema);
