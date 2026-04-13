import mongoose from "mongoose";
import { env } from "./env.js";

const CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          45000,
  maxPoolSize:              10,
  retryWrites:              true,
};

/**
 * Drop the old broken sparse index on enrollmentNumber (if it exists)
 * and let Mongoose recreate it correctly with partialFilterExpression.
 *
 * The old index { enrollmentNumber: 1 } with sparse:true can cause:
 *   E11000 duplicate key error ... enrollmentNumber: null
 * because some MongoDB versions still index null under a sparse unique index.
 *
 * We drop it here at startup so the correct index (defined in the model with
 * partialFilterExpression) gets created instead.
 */
async function fixEnrollmentNumberIndex() {
  try {
    const db         = mongoose.connection.db;
    const collection = db.collection("studentprofiles");
    const indexes    = await collection.indexes();

    for (const idx of indexes) {
      const isBrokenSparse =
        idx.key?.enrollmentNumber === 1 &&
        idx.unique === true &&
        idx.sparse === true &&
        !idx.partialFilterExpression;

      if (isBrokenSparse) {
        await collection.dropIndex(idx.name);
        console.log("  ✅  Dropped old sparse enrollmentNumber index — will be recreated correctly.");
      }
    }
  } catch (err) {
    // Non-fatal: index may not exist yet or collection may be empty
    if (!err.message?.includes("index not found")) {
      console.warn("  ⚠️   Could not check/drop enrollmentNumber index:", err.message);
    }
  }
}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, CONNECT_OPTIONS);
    console.log(`  MongoDB connected: ${conn.connection.host}`);

    // Fix the broken sparse unique index before Mongoose syncs indexes
    await fixEnrollmentNumberIndex();

    // Sync indexes (creates the new partialFilterExpression index if needed)
    try {
      const StudentProfile = (await import("../models/StudentProfile.js")).default;
      await StudentProfile.syncIndexes();
      console.log("  ✅  StudentProfile indexes synced.");
    } catch (syncErr) {
      console.warn("  ⚠️   StudentProfile.syncIndexes failed:", syncErr.message);
    }

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