import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Assignment",
      required: true,
    },
    assignmentTitle: {
      type:    String,
      default: "",
    },
    course: {
      type:    String,
      default: "",
    },
    studentId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    studentName: {
      type:    String,
      default: "",
    },
    title:       { type: String, default: "" },
    description: { type: String, default: "" },
    text:        { type: String, default: "" },
    files: [
      {
        originalName: String,
        filename:     String,
        url:          String,
        size:         Number,
      },
    ],
    grade:    { type: String, default: null },
    feedback: { type: String, default: "" },
    gradedAt: { type: Date,   default: null },
    gradedBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "User",
      default: null,
    },
    status: {
      type:    String,
      enum:    ["draft", "submitted", "graded"],
      default: "draft",
    },
  },
  { timestamps: true }
);

submissionSchema.index({ studentId: 1, createdAt: -1 });
submissionSchema.index({ assignmentId: 1 });
submissionSchema.index({ status: 1 });

export default mongoose.model("Submission", submissionSchema);