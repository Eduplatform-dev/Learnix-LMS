import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["video", "pdf", "image"],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    course: {
      type: String,
      default: null,
    },
    folder: {
      type: String,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    filePath: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Content", contentSchema);