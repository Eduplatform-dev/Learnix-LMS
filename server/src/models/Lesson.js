import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    type: {
      type: String,
      enum: ["video", "pdf", "text", "quiz"],
      required: true,
      default: "video",
    },
    // For video/pdf: URL to file
    contentUrl: {
      type: String,
      default: "",
    },
    // For text lessons: rich text content
    textContent: {
      type: String,
      default: "",
    },
    // For video: duration in seconds
    duration: {
      type: Number,
      default: 0,
    },
    // For quiz: array of questions
    quiz: [
      {
        question: String,
        options: [String],
        correctIndex: Number,
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    isPreview: {
      type: Boolean,
      default: false,
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

lessonSchema.index({ course: 1, order: 1 });

export default mongoose.model("Lesson", lessonSchema);