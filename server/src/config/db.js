import mongoose from "mongoose";
import { env } from "./env.js";

const CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          45000,
  maxPoolSize:              10,
  retryWrites:              true,
};

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, CONNECT_OPTIONS);
    console.log(`  MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected — reconnecting...");
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error("  Check MONGO_URI in server/.env");
    process.exit(1);
  }
};