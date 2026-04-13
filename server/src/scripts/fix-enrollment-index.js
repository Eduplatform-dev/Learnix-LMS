/**
 * fix-enrollment-index.js
 *
 * ONE-TIME migration script to fix the broken enrollmentNumber index.
 *
 * Run this ONCE before restarting your server:
 *   node server/src/scripts/fix-enrollment-index.js
 *
 * What it does:
 *  1. Drops the old broken sparse unique index on enrollmentNumber
 *  2. Creates the correct partial index (only indexes non-null strings)
 *  3. Verifies the fix
 */

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";

async function fixIndex() {
  console.log("\n🔧  Starting enrollmentNumber index fix...\n");

  // Connect without running the auto-fix (to avoid recursion)
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/learnix", {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("  ✅  Connected to MongoDB");
  } catch (err) {
    console.error("  ❌  Could not connect:", err.message);
    console.error("     Make sure MONGO_URI is set or MongoDB is running locally.");
    process.exit(1);
  }

  const db         = mongoose.connection.db;
  const collection = db.collection("studentprofiles");

  // ── Step 1: List existing indexes ──────────────────────────
  console.log("\n📋  Current indexes on studentprofiles:");
  const indexes = await collection.indexes();
  for (const idx of indexes) {
    console.log(`     ${idx.name}:`, JSON.stringify({ key: idx.key, unique: idx.unique, sparse: idx.sparse, partial: idx.partialFilterExpression }));
  }

  // ── Step 2: Drop ALL enrollment-related indexes ───────────
  let dropped = 0;
  for (const idx of indexes) {
    if (idx.key?.enrollmentNumber !== undefined && idx.name !== "_id_") {
      try {
        await collection.dropIndex(idx.name);
        console.log(`\n  ✅  Dropped index: ${idx.name}`);
        dropped++;
      } catch (e) {
        console.warn(`  ⚠️   Could not drop ${idx.name}:`, e.message);
      }
    }
  }

  if (dropped === 0) {
    console.log("\n  ℹ️   No enrollmentNumber index found to drop.");
  }

  // ── Step 3: Create the correct index ──────────────────────
  console.log("\n🔨  Creating correct partialFilterExpression index...");
  try {
    await collection.createIndex(
      { enrollmentNumber: 1 },
      {
        unique:                  true,
        partialFilterExpression: { enrollmentNumber: { $type: "string" } },
        name:                    "enrollmentNumber_partial_unique",
        background:              true,
      }
    );
    console.log("  ✅  Created index: enrollmentNumber_partial_unique");
  } catch (err) {
    if (err.code === 85 || err.code === 86) {
      // Index already exists with same definition
      console.log("  ℹ️   Correct index already exists.");
    } else {
      console.error("  ❌  Failed to create index:", err.message);
      // Check if there are actual duplicate non-null enrollment numbers
      if (err.code === 11000) {
        console.error("\n  ⚠️   There are DUPLICATE non-null enrollment numbers in the database!");
        console.error("     Run this query in MongoDB to find them:");
        console.error(`     db.studentprofiles.aggregate([
       { $match: { enrollmentNumber: { $ne: null, $type: "string" } } },
       { $group: { _id: "$enrollmentNumber", count: { $sum: 1 }, ids: { $push: "$_id" } } },
       { $match: { count: { $gt: 1 } } }
     ])`);
      }
      await mongoose.connection.close();
      process.exit(1);
    }
  }

  // ── Step 4: Verify ─────────────────────────────────────────
  console.log("\n📋  Indexes after fix:");
  const newIndexes = await collection.indexes();
  for (const idx of newIndexes) {
    console.log(`     ${idx.name}:`, JSON.stringify({ key: idx.key, unique: idx.unique, sparse: idx.sparse, partial: idx.partialFilterExpression }));
  }

  // ── Step 5: Test with null values ─────────────────────────
  console.log("\n🧪  Testing: counting documents with null enrollmentNumber...");
  const nullCount = await collection.countDocuments({ enrollmentNumber: null });
  console.log(`     Documents with null enrollmentNumber: ${nullCount}`);
  if (nullCount > 1) {
    console.log("  ✅  Multiple nulls are allowed — index is working correctly!");
  } else {
    console.log("  ✅  Index setup complete.");
  }

  await mongoose.connection.close();
  console.log("\n🎉  Done! You can now restart your server.\n");
}

fixIndex().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
