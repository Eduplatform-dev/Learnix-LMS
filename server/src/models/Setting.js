import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    general: {
      platformName: { type: String, default: "Learnix" },
      supportEmail: { type: String, default: "" },
      logoUrl:      { type: String, default: "" },
    },
    notifications: {
      emailUpdates:   { type: Boolean, default: true },
      productUpdates: { type: Boolean, default: false },
      billingAlerts:  { type: Boolean, default: true },
    },
    security: {
      enforceTwoFactor: { type: Boolean, default: false },
      allowGoogleLogin: { type: Boolean, default: true },
      sessionTimeout:   { type: String,  default: "30" },
    },
    localization: {
      language:   { type: String, default: "en" },
      timezone:   { type: String, default: "UTC" },
      dateFormat: { type: String, default: "MM/DD/YYYY" },
    },
    emailConfig: {
      smtpHost:  { type: String, default: "" },
      smtpPort:  { type: String, default: "587" },
      smtpUser:  { type: String, default: "" },
      fromName:  { type: String, default: "" },
      fromEmail: { type: String, default: "" },
      footer:    { type: String, default: "" },
    },
    backup: {
      autoBackup:     { type: Boolean, default: true },
      retentionDays:  { type: String,  default: "30" },
      backupWindow:   { type: String,  default: "02:00-04:00" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema);