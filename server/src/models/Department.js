import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: true,
      trim:     true,
      unique:   true,
    },
    code: {
      type:      String,
      required:  true,
      trim:      true,
      uppercase: true,
      unique:    true,
    },
    description: {
      type:    String,
      default: "",
      trim:    true,
    },
    // Restored: departmentController.js populates this field
    hodId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "User",
      default: null,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);