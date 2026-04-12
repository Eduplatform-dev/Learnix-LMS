import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema({
  number:    { type: Number, required: true, min: 1, max: 8 },
  label:     { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  isActive:  { type: Boolean, default: false },
});

const academicYearSchema = new mongoose.Schema(
  {
    label: {
      type:     String,
      required: true,
      trim:     true,
      unique:   true,
    },
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    semesters: [semesterSchema],
  },
  { timestamps: true }
);

// Ensure only one academic year can be "current" at a time
academicYearSchema.pre("save", async function (next) {
  if (this.isCurrent && this.isModified("isCurrent")) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isCurrent: false } }
    );
  }
  next();
});

academicYearSchema.index({ isCurrent: 1 });

export default mongoose.model("AcademicYear", academicYearSchema);