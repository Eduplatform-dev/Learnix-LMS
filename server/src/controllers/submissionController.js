import mongoose from "mongoose";
import Submission from "../models/Submission.js";

/* ================= GET SUBMISSIONS ================= */

export const getSubmissions = async (req, res) => {
  try {
    const query =
      req.user.role === "admin" || req.user.role === "instructor"
        ? {}
        : { studentId: req.user._id };

    const submissions = await Submission
      .find(query)
      .populate("assignmentId", "title")
      .populate("studentId", "username email")
      .sort({ createdAt: -1 });

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= CREATE SUBMISSION ================= */

export const createSubmission = async (req, res) => {
  try {
    // NOTE: fileUrl is optional — file uploads are handled via multer in submissionRoutes.js
    // This controller is kept for backward compatibility only.
    // Prefer using submissionRoutes.js directly for new functionality.
    const { assignmentId, title, description, fileUrl } = req.body;

    if (!assignmentId || !title) {
      return res.status(400).json({
        error: "Assignment and title are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    const submission = await Submission.create({
      assignmentId,
      studentId: req.user._id,
      title: title.trim(),
      description: description?.trim() || "",
      // fileUrl is optional — only set if provided (legacy support)
      ...(fileUrl ? { files: [{ url: fileUrl, originalName: "attachment", filename: fileUrl, size: 0 }] } : {}),
    });

    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= GRADE SUBMISSION ================= */

export const gradeSubmission = async (req, res) => {
  try {
    const { grade, feedback } = req.body;

    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    submission.grade = grade;
    submission.feedback = feedback?.trim() || "";
    submission.status = "graded";

    await submission.save();

    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= DELETE SUBMISSION ================= */

export const deleteSubmission = async (req, res) => {
  try {
    const deleted = await Submission.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Submission not found" });
    }

    res.json({ message: "Submission deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};