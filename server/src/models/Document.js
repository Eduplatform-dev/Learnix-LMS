import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    student:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title:        { type: String, trim: true, required: true },
    type: {
      type:    String,
      enum:    ["caste_certificate", "income_certificate", "scholarship", "bonafide", "marksheet", "transfer_certificate", "aadhar", "photo", "other"],
      default: "other",
    },
    fileUrl:      { type: String, required: true },
    fileName:     { type: String, default: "" },
    fileSize:     { type: Number, default: 0 },
    mimeType:     { type: String, default: "" },
    status: {
      type:    String,
      enum:    ["pending", "verified", "rejected"],
      default: "pending",
    },
    verifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    verifiedAt:   { type: Date, default: null },
    rejectionNote:{ type: String, default: "" },
    expiresAt:    { type: Date, default: null },
    isRequired:   { type: Boolean, default: false },
    notes:        { type: String, default: "" },
  },
  { timestamps: true }
);

documentSchema.index({ student: 1, type: 1 });
documentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Document", documentSchema);
