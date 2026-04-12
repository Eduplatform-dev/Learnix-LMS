import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    certificateId: {
      type: String,
      unique: true,
      default: () => `CERT-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
    },
    studentName: { type: String, required: true },
    courseName: { type: String, required: true },
    instructorName: { type: String, default: "" },
    completionDate: { type: Date, required: true },
    grade: { type: String, default: "" },
    percentage: { type: Number, default: null },
    issuedAt: { type: Date, default: Date.now },
    verificationUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

certificateSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model("Certificate", certificateSchema);
